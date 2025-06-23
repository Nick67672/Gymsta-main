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
    if (!isAuthenticated) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !post) return;

      // Optimistically update the UI immediately
      const newLike = { id: `temp-${Date.now()}`, user_id: user.id };
      setPost(currentPost => {
        if (!currentPost) return currentPost;
        return {
          ...currentPost,
          likes: [...currentPost.likes, newLike]
        };
      });

      const { error } = await supabase
        .from('likes')
        .insert({
          post_id: postId,
          user_id: user.id,
        });

      if (error) {
        // Revert optimistic update on error
        setPost(currentPost => {
          if (!currentPost) return currentPost;
          return {
            ...currentPost,
            likes: currentPost.likes.filter(like => !like.id.toString().startsWith('temp-'))
          };
        });
        throw error;
      }

      // Refresh the post data to get the real like ID from database
      const { data: updatedPost } = await supabase
        .from('posts')
        .select(`
          id,
          likes (
            id,
            user_id
          )
        `)
        .eq('id', postId)
        .single();

      if (updatedPost) {
        setPost(currentPost => {
          if (!currentPost) return currentPost;
          return {
            ...currentPost,
            likes: updatedPost.likes
          };
        });
      }

    } catch (err) {
      console.error('Error liking post:', err);
    }
  };

  const handleUnlike = async (postId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !post) return;

      // Find the like to remove for optimistic update
      const likeToRemove = post.likes.find(like => like.user_id === user.id);
      
      // Optimistically update the UI immediately
      setPost(currentPost => {
        if (!currentPost) return currentPost;
        return {
          ...currentPost,
          likes: currentPost.likes.filter(like => like.user_id !== user.id)
        };
      });

      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);

      if (error) {
        // Revert optimistic update on error
        if (likeToRemove) {
          setPost(currentPost => {
            if (!currentPost) return currentPost;
            return {
              ...currentPost,
              likes: [...currentPost.likes, likeToRemove]
            };
          });
        }
        throw error;
      }

    } catch (err) {
      console.error('Error unliking post:', err);
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
    if (userId === currentUserId) {
      router.push('/profile');
    } else {
      router.push(`/${username}`);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              const { error } = await supabase
                .from('posts')
                .delete()
                .eq('id', post?.id);

              if (error) throw error;
              router.replace('/profile');
            } catch (err) {
              console.error('Error deleting post:', err);
              Alert.alert('Error', 'Failed to delete post. Please try again.');
              setDeleting(false);
            }
          },
        },
      ]
    );
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

  const handleMenu = () => {
    Alert.alert(
      'Post Options',
      undefined,
      [
        {
          text: 'Delete Post',
          style: 'destructive',
          onPress: handleDelete,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
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
        {isOwnPost && (
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={handleMenu}
            disabled={deleting}>
            <Text style={[styles.menuButtonText, { color: colors.text }]}>⋮</Text>
          </TouchableOpacity>
        )}
      </View>

              <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: 20 }}>
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
        />
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
  menuButton: {
    padding: 10,
    marginRight: 10,
  },
  menuButtonText: {
    fontSize: 24,
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