import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, Alert, Animated } from 'react-native';
import { Pause, Play, Heart, Flag, CircleCheck as CheckCircle2 } from 'lucide-react-native';
import { VideoView } from 'expo-video';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Post } from '../types/social';

// Temporary alias to bypass missing TS prop typings for expo-video
const Video: any = VideoView;

interface PostProps {
  post: Post;
  colors: any;
  playingVideo: string | null;
  currentUserId: string | null;
  flaggedPosts: { [postId: string]: boolean };
  flagging: { [postId: string]: boolean };
  setFlagging: React.Dispatch<React.SetStateAction<{ [postId: string]: boolean }>>;
  setFlaggedPosts: React.Dispatch<React.SetStateAction<{ [postId: string]: boolean }>>;
  isAuthenticated: boolean;
  showAuthModal: () => void;
  toggleVideoPlayback: (postId: string) => void;
  navigateToProfile: (userId: string, username: string) => void;
  handleLike: (postId: string) => void;
  handleUnlike: (postId: string) => void;
  videoRefs: React.MutableRefObject<{ [key: string]: any }>;
}

const PostComponent: React.FC<PostProps> = ({
  post,
  colors,
  playingVideo,
  currentUserId,
  flaggedPosts,
  flagging,
  setFlagging,
  setFlaggedPosts,
  isAuthenticated,
  showAuthModal,
  toggleVideoPlayback,
  navigateToProfile,
  handleLike,
  handleUnlike,
  videoRefs,
}) => {
  const isLiked = currentUserId ? post.likes.some(like => like.user_id === currentUserId) : false;
  const [likeAnimation] = useState(new Animated.Value(1));

  // Enhanced date formatting function
  const formatDate = (dateString: string) => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - postDate.getTime()) / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);
    const diffInWeeks = Math.floor(diffInDays / 7);

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h`;
    if (diffInDays < 7) return `${diffInDays}d`;
    if (diffInWeeks < 4) return `${diffInWeeks}w`;
    return postDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Enhanced like handler with animation
  const handleLikePress = () => {
    if (!isAuthenticated) {
      showAuthModal();
      return;
    }

    // Animate heart
    Animated.sequence([
      Animated.timing(likeAnimation, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(likeAnimation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    if (isLiked) {
      handleUnlike(post.id);
    } else {
      handleLike(post.id);
    }
  };

  const onFlagPress = useCallback(async () => {
    if (flaggedPosts[post.id] || flagging[post.id]) return;
    setFlagging(prev => ({ ...prev, [post.id]: true }));
    try {
      const { error } = await supabase
        .from('posts')
        .update({ is_flagged: true })
        .eq('id', post.id);
      if (!error) {
        setFlaggedPosts(prev => ({ ...prev, [post.id]: true }));
      } else {
        Alert.alert('Error', 'Failed to flag post.');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to flag post.');
    } finally {
      setFlagging(prev => ({ ...prev, [post.id]: false }));
    }
  }, [flaggedPosts, flagging, post.id]);

  return (
    <View style={[styles.post, { backgroundColor: colors.card }]}>      
      {/* Header */}
      <View style={styles.postHeader}>
        <TouchableOpacity
          style={styles.headerLeft}
          onPress={() => navigateToProfile(post.profiles.id ?? '', post.profiles.username)}
        >
          <Image
            source={{
              uri:
                post.profiles.avatar_url ||
                `https://source.unsplash.com/random/40x40/?portrait&${post.profiles.id}`,
            }}
            style={styles.profilePic}
          />
          <View style={styles.userInfo}>
            <View style={styles.usernameContainer}>
              <Text style={[styles.username, { color: colors.text }]}>{post.profiles.username}</Text>
              {post.profiles.is_verified && (
                <CheckCircle2 size={16} color="#fff" fill="#3B82F6" />
              )}
            </View>
            <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
              {formatDate(post.created_at)}
            </Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={onFlagPress}
          style={styles.headerRight}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          disabled={flaggedPosts[post.id] || flagging[post.id]}
        >
          <Flag size={20} color={flaggedPosts[post.id] ? '#FFA500' : colors.textSecondary} 
                fill={flaggedPosts[post.id] ? '#FFA500' : 'none'} />
        </TouchableOpacity>
      </View>

      {/* Media Content */}
      {post.media_type === 'video' ? (
        <View style={styles.videoWrapper}>
          <View style={styles.videoBackdrop} />
          <TouchableOpacity
            style={styles.videoContainer}
            activeOpacity={0.9}
            onPress={() => toggleVideoPlayback(post.id)}
          >
            <Video
              ref={(ref: any) => {
                videoRefs.current[post.id] = ref;
              }}
              source={{ uri: post.image_url }}
              style={styles.videoContent}
              useNativeControls={false}
              isLooping
              shouldPlay={false}
            />
            <View style={styles.videoPlayButton}>
              {playingVideo === post.id ? <Pause size={40} color="#fff" /> : <Play size={40} color="#fff" />}
            </View>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.imageContainer}>
          <Image source={{ uri: post.image_url }} style={styles.postImage} />
        </View>
      )}

      {/* Post Content */}
      <View style={styles.postContent}>
        {/* Like Section */}
        <View style={styles.likeSection}>
          <Animated.View style={{ transform: [{ scale: likeAnimation }] }}>
            <TouchableOpacity onPress={handleLikePress} style={styles.likeButton}>
              <Heart 
                size={22} 
                color={isLiked ? '#E91E63' : colors.text} 
                fill={isLiked ? '#E91E63' : 'none'} 
              />
            </TouchableOpacity>
          </Animated.View>
          {post.likes.length > 0 && (
            <Text style={[styles.likesCount, { color: colors.text }]}>
              {post.likes.length.toLocaleString()}
            </Text>
          )}
        </View>

        {/* Caption */}
        {post.caption && (
          <View style={styles.captionContainer}>
            <Text style={[styles.captionText, { color: colors.text }]}>
              <Text 
                style={[styles.captionUsername, { color: colors.text }]}
                onPress={() => navigateToProfile(post.profiles.id ?? '', post.profiles.username)}
              >
                {post.profiles.username}
              </Text>
              <Text style={styles.captionBody}> {post.caption}</Text>
            </Text>
          </View>
        )}
      </View>

      {/* Product Button */}
      {post.product_id && (
        <TouchableOpacity
          style={styles.seeProductButton}
          onPress={() => {
            if (!isAuthenticated) {
              showAuthModal();
              return;
            }
            router.push(`/marketplace/${post.product_id}`);
          }}
        >
          <Text style={styles.seeProductText}>See Product</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default PostComponent;

const styles = StyleSheet.create({
  post: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerRight: {
    padding: 8,
  },
  profilePic: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 14,
  },
  userInfo: {
    flex: 1,
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  username: {
    fontWeight: '700',
    fontSize: 16,
    fontFamily: 'System',
  },
  timestamp: {
    fontSize: 14,
    marginTop: 3,
    fontWeight: '400',
  },
  imageContainer: {
    width: '100%',
  },
  postImage: {
    width: '100%',
    height: 400,
    backgroundColor: '#f5f5f5',
  },
  videoWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    maxHeight: 400,
    backgroundColor: '#000',
    position: 'relative',
  },
  videoBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoContent: {
    width: '100%',
    height: '100%',
  },
  videoPlayButton: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 30,
    padding: 10,
  },
  postContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  likeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  likeButton: {
    padding: 6,
    marginRight: 10,
  },
  likesCount: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
  },
  captionContainer: {
    marginTop: 4,
  },
  captionText: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'System',
  },
  captionUsername: {
    fontWeight: '700',
  },
  captionBody: {
    fontWeight: '400',
  },
  seeProductButton: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#3B82F6',
  },
  seeProductText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
}); 