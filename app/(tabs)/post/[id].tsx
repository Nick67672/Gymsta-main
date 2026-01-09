import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Post as PostType } from '@/types/social';
import FeedPost from '@/components/Post';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import Colors from '@/constants/Colors';
import { ArrowLeft } from 'lucide-react-native';
import { goBack } from '@/lib/goBack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams();
  const [post, setPost] = useState<PostType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { isAuthenticated, showAuthModal, currentUserId } = useAuth();
  const insets = useSafeAreaInsets();

  /* Local UI state to mimic feed behaviour */
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [flagging, setFlagging] = useState<{ [key: string]: boolean }>({});
  const [flaggedPosts, setFlaggedPosts] = useState<{ [key: string]: boolean }>({});
  const videoRefs = useRef<{ [key: string]: any }>({});

  /* Helpers duplicated from feed */
  const toggleVideoPlayback = (postId: string) => {
    if (playingVideo === postId) {
      if (videoRefs.current[postId]) {
        videoRefs.current[postId].pauseAsync();
      }
      setPlayingVideo(null);
    } else {
      if (playingVideo && videoRefs.current[playingVideo]) {
        videoRefs.current[playingVideo].pauseAsync();
      }
      if (videoRefs.current[postId]) {
        videoRefs.current[postId].playAsync();
      }
      setPlayingVideo(postId);
    }
  };

  const navigateToProfile = (userId: string, username: string) => {
    router.push(`/${username}`);
  };

  /* Like helpers (simplified – no optimistic UI) */
  const handleLike = async (postId: string) => {
    if (!isAuthenticated || !currentUserId) {
      showAuthModal();
      return;
    }
    try {
      const tempLike = { id: String(Date.now()), user_id: currentUserId };
      // Optimistically add like locally
      setPost(prev => prev ? { ...prev, likes: [...prev.likes, tempLike] } : prev);

      const { data: insertedRows, error } = await supabase
        .from('likes')
        .insert({ post_id: postId, user_id: currentUserId })
        .select('id, user_id');

      if (error) {
        console.error('Error liking post:', error);
        // Rollback on failure
        setPost(prev => prev ? { ...prev, likes: prev.likes.filter(l => l.id !== tempLike.id) } : prev);
      } else {
        const newLike = insertedRows?.[0] || tempLike;
        // Replace the temp like with the real one returned from DB
        setPost(prev => prev ? { ...prev, likes: prev.likes.map(l => l.id === tempLike.id ? newLike : l) } : prev);
      }
    } catch (err) {
      console.error('Error in handleLike function:', err);
    }
  };

  const handleUnlike = async (postId: string) => {
    if (!isAuthenticated || !currentUserId) {
      showAuthModal();
      return;
    }
    try {
      const originalLikesRef = post?.likes || [];
      // Optimistically remove like locally
      setPost(prev => prev ? { ...prev, likes: prev.likes.filter(l => l.user_id !== currentUserId) } : prev);

      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', currentUserId);

      if (error) {
        console.error('Error unliking post:', error);
        // Rollback on failure
        setPost(prev => prev ? { ...prev, likes: originalLikesRef } : prev);
      }
    } catch (err) {
      console.error('Error in handleUnlike function:', err);
    }
  };

  const handleDeletePost = async (postId: string) => {
    // The confirmation is handled by the PostComponent's modal
    try {
      const { error } = await supabase.from('posts').delete().eq('id', postId);

      if (error) {
        throw error;
      }
      
      Alert.alert('Deleted', 'Post has been successfully deleted.');
      // Always return to the profile tab after deleting
      router.replace('/(tabs)/profile');
    } catch (err) {
      console.error('Error deleting post from detail screen:', err);
      Alert.alert('Error', 'Failed to delete post. Please try again.');
    }
  };

  useEffect(() => {
    if (!id) return;

    const fetchPost = async () => {
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
            workout_id,
            post_type,
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
        setPost(data as PostType);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.error }}>{error}</Text>
      </View>
    );
  }

  if (!post) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Post not found.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Floating back button */}
      <TouchableOpacity
        onPress={goBack}
        style={[styles.backButton, { top: insets.top + 12 }]}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <ArrowLeft size={22} color="#fff" />
      </TouchableOpacity>
      
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  postContainer: {
    flex: 1,
    paddingTop: 100, // Space for back button
  },
  backButton: {
    position: 'absolute',
    left: 16,
    zIndex: 50,
    padding: 12,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
}); 