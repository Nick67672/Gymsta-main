import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Heart, MessageCircle, User } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Post } from '@/types/social';
import { router } from 'expo-router';
import { getAvatarUrl } from '@/lib/avatarUtils';

const { width: screenWidth } = Dimensions.get('window');

interface SharedPostProps {
  postId: string;
  message?: string;
  colors: any;
}

export const SharedPost: React.FC<SharedPostProps> = ({ postId, message, colors }) => {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPost();
  }, [postId]);

  const loadPost = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('posts')
        .select(`
          *,
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
        .eq('id', postId)
        .single();

      if (fetchError) {
        console.error('Error loading shared post:', fetchError);
        setError('Failed to load post');
        return;
      }

      setPost(data);
    } catch (err) {
      console.error('Error in loadPost:', err);
      setError('Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  const handlePostPress = () => {
    if (post) {
      router.push(`/(tabs)/post/${post.id}`);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.card }]}>
        <ActivityIndicator size="small" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading post...
        </Text>
      </View>
    );
  }

  if (error || !post) {
    return (
      <View style={[styles.container, { backgroundColor: colors.card }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>
          {error || 'Post not found'}
        </Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.card }]}
      onPress={handlePostPress}
      activeOpacity={0.8}
    >
      {/* Message text if provided */}
      {message && message.trim() && (
        <Text style={[styles.messageText, { color: colors.text }]}>
          {message}
        </Text>
      )}

      {/* Post content */}
      <View style={styles.postContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Image
              source={{
                uri: getAvatarUrl(post.profiles?.avatar_url, post.profiles?.username || 'default')
              }}
              style={styles.avatar}
            />
            {post.profiles?.is_verified && (
              <View style={[styles.verifiedBadge, { backgroundColor: colors.tint }]}>
                <Text style={styles.verifiedText}>✓</Text>
              </View>
            )}
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.username, { color: colors.text }]}>
              {post.profiles?.username || 'Unknown User'}
            </Text>
            <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
              {formatDate(post.created_at)}
            </Text>
          </View>
        </View>

        {/* Caption */}
        {post.caption && (
          <Text style={[styles.caption, { color: colors.text }]} numberOfLines={3}>
            {post.caption}
          </Text>
        )}

        {/* Image */}
        {post.image_url && (
          <Image
            source={{ uri: post.image_url }}
            style={styles.postImage}
            resizeMode="cover"
          />
        )}

        {/* Engagement stats */}
        <View style={styles.engagement}>
          <View style={styles.stat}>
            <Heart size={14} color={colors.textSecondary} />
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              {post.likes?.length || 0}
            </Text>
          </View>
          <View style={styles.stat}>
            <MessageCircle size={14} color={colors.textSecondary} />
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              0
            </Text>
          </View>
        </View>

        {/* Shared indicator */}
        <View style={styles.sharedIndicator}>
          <Text style={[styles.sharedText, { color: colors.textSecondary }]}>
            📤 Shared post
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 4,
    maxWidth: screenWidth * 0.75,
  },
  messageText: {
    fontSize: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  postContent: {
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  headerInfo: {
    flex: 1,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
    marginTop: 1,
  },
  caption: {
    fontSize: 13,
    marginBottom: 6,
    lineHeight: 16,
  },
  postImage: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    marginBottom: 8,
  },
  engagement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 8,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    justifyContent: 'center',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontWeight: '500',
  },
  sharedIndicator: {
    alignItems: 'center',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  sharedText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  loadingText: {
    fontSize: 14,
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
}); 