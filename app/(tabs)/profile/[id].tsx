import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Alert, Modal, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MoreVertical } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useBlocking } from '@/context/BlockingContext';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import FeedPost from '@/components/Post';
import { Post } from '@/types/social';
import * as Haptics from 'expo-haptics';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { isAuthenticated, showAuthModal } = useAuth();
  const { blockUser } = useBlocking();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const videoRefs = useRef<{ [key: string]: any }>({});
  const [flaggedPosts, setFlaggedPosts] = useState<{ [postId: string]: boolean }>({});
  const [flagging, setFlagging] = useState<{ [postId: string]: boolean }>({});
  const [showMenu, setShowMenu] = useState(false);
  const [blocking, setBlocking] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
      }
    });

    loadPost();
  }, [id]);

  // Set up real-time subscription for likes changes on this specific post
  useEffect(() => {
    if (!post?.id) return;

    const likesChannel = supabase.channel('post-detail-likes-channel-' + Date.now())
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'likes',
          filter: `post_id=eq.${post.id}`
        },
        (payload) => {
          // Update this post's likes in real-time
          if (payload.eventType === 'INSERT') {
            setPost(currentPost => {
              if (currentPost && currentPost.id === payload.new.post_id) {
                return {
                  ...currentPost,
                  likes: [...currentPost.likes, { id: payload.new.id, user_id: payload.new.user_id }]
                };
              }
              return currentPost;
            });
          } else if (payload.eventType === 'DELETE') {
            setPost(currentPost => {
              if (currentPost && currentPost.id === payload.old.post_id) {
                return {
                  ...currentPost,
                  likes: currentPost.likes.filter(like => like.id !== payload.old.id)
                };
              }
              return currentPost;
            });
          }
        }
      )
      .subscribe();

    return () => {
      likesChannel.unsubscribe();
    };
  }, [post?.id]);

  const loadPost = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          user_id,
          caption,
          image_url,
          media_type,
          created_at,
          product_id,
          profiles (
            id,
            username,
            avatar_url,
            is_verified
          ),
          likes (
            id,
            user_id
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      
      setPost({
        ...data,
        media_type: data.media_type || 'image',
        profiles: Array.isArray(data.profiles) ? data.profiles[0] : data.profiles
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!isAuthenticated) {
      showAuthModal();
      return;
    }
    if (!post) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const tempLike = { id: String(Date.now()), user_id: user.id };
      const currentPost = post; // non-null after guard

      setPost({ ...currentPost, likes: [...currentPost.likes, tempLike] });

      const { data: insertedRows, error } = await supabase
        .from('likes')
        .insert({ post_id: postId, user_id: user.id })
        .select('id, user_id');

      if (error) {
        console.error('Error liking post:', error);
        setPost(currentPost); // rollback
      } else {
        const newLike = insertedRows?.[0] || tempLike;
        setPost({ ...currentPost, likes: currentPost.likes.filter(l => l.user_id !== user.id).concat(newLike) });
      }
    } catch (err) {
      console.error('Error in handleLike function:', err);
    }
  };

  const handleUnlike = async (postId: string) => {
    if (!isAuthenticated) {
      showAuthModal();
      return;
    }
    if (!post) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const currentPost = post; // non-null
      const originalLikes = [...currentPost.likes];

      setPost({ ...currentPost, likes: currentPost.likes.filter(l => l.user_id !== user.id) });

      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error unliking post:', error);
        setPost({ ...currentPost, likes: originalLikes });
      }
    } catch (err) {
      console.error('Error in handleUnlike function:', err);
    }
  };

  const toggleVideoPlayback = (postId: string) => {
    const videoRef = videoRefs.current[postId];
    if (videoRef) {
      if (playingVideo === postId) {
        videoRef.pause();
        setPlayingVideo(null);
      } else {
        videoRef.play();
        setPlayingVideo(postId);
      }
    }
  };

  const navigateToProfile = (userId: string, username: string) => {
    router.push(`/${username}`);
  };

  const handleDeletePost = async (postId: string) => {
    console.log('🗑️ [PostDetail] Attempting to delete post:', postId);
    
    try {
      // Get current user to verify they can delete this post
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('❌ [PostDetail] Error getting current user:', userError);
        Alert.alert('Error', 'Authentication error. Please try again.');
        return;
      }
      
      if (!user) {
        console.error('❌ [PostDetail] No authenticated user found');
        Alert.alert('Error', 'You must be logged in to delete posts.');
        return;
      }
      
      console.log('👤 [PostDetail] Current user ID:', user.id);
      
      if (post) {
        console.log('📝 [PostDetail] Post owner ID:', post.user_id);
        console.log('🔐 [PostDetail] User can delete:', post.user_id === user.id);
      }
      
      console.log('🔄 [PostDetail] Sending delete request to Supabase...');
      const { error } = await supabase.from('posts').delete().eq('id', postId);

      if (error) {
        console.error('❌ [PostDetail] Supabase delete error:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        
        Alert.alert('Error', `Failed to delete post: ${error.message}`);
        return;
      }
      
      console.log('✅ [PostDetail] Post deleted successfully');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/profile');
      }
    } catch (err) {
      console.error('❌ [PostDetail] Unexpected error in handleDeletePost:', err);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  };

  const handleBack = () => {
    if (post && currentUserId) {
      if (post.profiles.id === currentUserId) {
        router.push('/profile');
      } else {
        router.push(`/${post.profiles.username}`);
      }
    } else {
      router.back();
    }
  };

  const handleBlockUser = async () => {
    if (!post || blocking) return;
    
    setBlocking(true);
    try {
      await blockUser(post.profiles.id);
      setShowMenu(false);
      router.back();
    } catch (err) {
      Alert.alert('Error', 'Failed to block user. Please try again.');
    } finally {
      setBlocking(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (error || !post) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.error, { color: colors.error }]}>{error || 'Post not found'}</Text>
      </View>
    );
  }

  const isOwnPost = currentUserId === post.profiles.id;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBack}>
          <Text style={[styles.backButtonText, { color: colors.text }]}>←</Text>
        </TouchableOpacity>
        {!isOwnPost && (
          <TouchableOpacity
            style={styles.moreButton}
            onPress={() => setShowMenu(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MoreVertical size={22} color={colors.text} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.postContainer}>
          <FeedPost
            post={post}
            colors={colors}
            playingVideo={playingVideo}
            currentUserId={currentUserId}
            flaggedPosts={flaggedPosts}
            flagging={flagging}
            setFlagging={setFlagging}
            setFlaggedPosts={setFlaggedPosts}
            isAuthenticated={isAuthenticated}
            showAuthModal={showAuthModal}
            toggleVideoPlayback={toggleVideoPlayback}
            navigateToProfile={navigateToProfile}
            handleLike={handleLike}
            handleUnlike={handleUnlike}
            videoRefs={videoRefs}
            handleDeletePost={handleDeletePost}
          />
        </View>
      </ScrollView>

      {/* Block User Modal */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <View style={styles.menuPopup}>
            <TouchableOpacity 
              style={[styles.blockButton, blocking && { opacity: 0.7 }]} 
              onPress={handleBlockUser}
              disabled={blocking}
            >
              {blocking ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.blockButtonText}>Block User</Text>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  error: {
    textAlign: 'center',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 40,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 10,
    marginLeft: 10,
  },
  backButtonText: {
    fontSize: 24,
  },
  moreButton: {
    padding: 10,
    marginRight: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 20,
  },
  postContainer: {
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuPopup: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    minWidth: 200,
  },
  blockButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  blockButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});