import React, { useCallback, useState, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, Animated, Platform, Modal } from 'react-native';
import { Pause, Play, Heart, MoreHorizontal, CircleCheck as CheckCircle2 } from 'lucide-react-native';
import { VideoView } from 'expo-video';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { Post } from '../types/social';
import { BorderRadius, Spacing } from '@/constants/Spacing';

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
  const [doubleTapAnimation] = useState(new Animated.Value(0));
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [lastTap, setLastTap] = useState<number>(0);
  const [showMenu, setShowMenu] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [isProcessingLike, setIsProcessingLike] = useState(false);
  const likeActionRef = useRef(false);
  const lastLikeActionRef = useRef(0);

  // Enhanced date formatting function
  const formatDate = (dateString: string) => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - postDate.getTime()) / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);
    const diffInWeeks = Math.floor(diffInDays / 7);

    if (diffInHours < 1) return 'now';
    if (diffInHours < 24) return `${diffInHours}h`;
    if (diffInDays < 7) return `${diffInDays}d`;
    if (diffInWeeks < 4) return `${diffInWeeks}w`;
    return postDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Centralized like handler to prevent double-firing
  const performLikeAction = useCallback(() => {
    if (!isAuthenticated) {
      showAuthModal();
      return;
    }

    const now = Date.now();
    
    // Debounce: prevent actions within 2 seconds of each other
    if (now - lastLikeActionRef.current < 2000) {
      console.log('Like action blocked - too soon after last action');
      return;
    }

    // Prevent double-tapping using both state and ref
    if (isProcessingLike || likeActionRef.current) {
      console.log('Like action blocked - already processing');
      return;
    }

    console.log('Performing like action for post:', post.id, 'isLiked:', isLiked);

    // Update last action time
    lastLikeActionRef.current = now;

    // Set both flags to prevent any race conditions
    setIsProcessingLike(true);
    likeActionRef.current = true;

    // Use a unique timestamp to track this specific action
    const actionId = now;
    console.log('Like action started with ID:', actionId);

    // Perform the actual like/unlike action
    try {
      if (isLiked) {
        console.log('Calling handleUnlike for action:', actionId);
        handleUnlike(post.id);
      } else {
        console.log('Calling handleLike for action:', actionId);
        handleLike(post.id);
      }
    } catch (error) {
      console.error('Error in like action:', error);
    }

    // Reset processing flags after a delay
    setTimeout(() => {
      console.log('Resetting like processing flags for action:', actionId);
      setIsProcessingLike(false);
      likeActionRef.current = false;
    }, 1500); // Increased delay to prevent rapid firing
  }, [isAuthenticated, isLiked, post.id, isProcessingLike, handleLike, handleUnlike, showAuthModal]);

  // Like button press handler
  const handleLikePress = useCallback(() => {
    if (isProcessingLike) return;

    // iOS Haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Enhanced heart animation
    Animated.sequence([
      Animated.timing(likeAnimation, {
        toValue: 1.2,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.spring(likeAnimation, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();

    performLikeAction();
  }, [isProcessingLike, performLikeAction, likeAnimation]);

  // Handle post tap for fullscreen or double tap to like
  const handlePostTap = useCallback(() => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;

    if (lastTap && (now - lastTap) < DOUBLE_PRESS_DELAY) {
      // Double tap to like
      if (!isLiked && isAuthenticated && !isProcessingLike) {
        // iOS Haptic feedback for double tap
        if (Platform.OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }

        // Double tap heart animation
        Animated.sequence([
          Animated.timing(doubleTapAnimation, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.parallel([
            Animated.timing(doubleTapAnimation, {
              toValue: 0,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.timing(likeAnimation, {
                toValue: 1.6,
                duration: 150,
                useNativeDriver: true,
              }),
              Animated.spring(likeAnimation, {
                toValue: 1,
                friction: 3,
                useNativeDriver: true,
              }),
            ]),
          ]),
        ]).start();

        // Use centralized like handler
        performLikeAction();
      }
    } else {
      // Single tap - show fullscreen
      setLastTap(now);
      setTimeout(() => {
        if (Date.now() - now >= DOUBLE_PRESS_DELAY) {
          setShowFullscreen(true);
        }
      }, DOUBLE_PRESS_DELAY);
    }
  }, [lastTap, isLiked, isAuthenticated, isProcessingLike, performLikeAction, doubleTapAnimation, likeAnimation]);

  const onReportPress = useCallback(async () => {
    if (flaggedPosts[post.id] || flagging[post.id]) return;
    
    // iOS Haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }

    setShowMenu(false);
    setFlagging(prev => ({ ...prev, [post.id]: true }));
    try {
      const { error } = await supabase
        .from('posts')
        .update({ is_flagged: true })
        .eq('id', post.id);
      if (!error) {
        setFlaggedPosts(prev => ({ ...prev, [post.id]: true }));
        Alert.alert('Post Reported', 'Thank you for reporting this post. We will review it shortly.');
      } else {
        Alert.alert('Error', 'Failed to report post.');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to report post.');
    } finally {
      setFlagging(prev => ({ ...prev, [post.id]: false }));
    }
  }, [flaggedPosts, flagging, post.id]);

  // Get dynamic aspect ratio based on content
  const getImageAspectRatio = () => {
    return 1; // 1:1 square aspect ratio - most accommodating for various image sizes
  };

  // Truncate caption logic
  const shouldTruncateCaption = post.caption && post.caption.length > 150;
  const displayCaption = shouldTruncateCaption && !showFullCaption 
    ? post.caption!.substring(0, 150) + '...' 
    : post.caption;

  // Format likes count
  const formatLikesCount = (count: number) => {
    if (count === 0) return '';
    if (count === 1) return '1 like';
    if (count < 1000) return `${count} likes`;
    if (count < 1000000) return `${(count / 1000).toFixed(1)}k likes`;
    return `${(count / 1000000).toFixed(1)}M likes`;
  };

  return (
    <View style={styles.postContainer}>
      {/* Floating Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={styles.profileSection}
          onPress={() => navigateToProfile(post.profiles.id ?? '', post.profiles.username)}
          activeOpacity={0.8}
        >
          <View style={styles.avatarWrapper}>
            <Image
              source={{
                uri:
                  post.profiles.avatar_url ||
                  `https://source.unsplash.com/random/50x50/?portrait&${post.profiles.id}`,
              }}
              style={styles.profileAvatar}
            />
            {post.profiles.is_verified && (
              <View style={styles.verifiedBadge}>
                <CheckCircle2 size={12} color="#fff" fill="#3B82F6" />
              </View>
            )}
          </View>
          <View style={styles.userDetails}>
            <Text style={[styles.displayName, { color: colors.text }]}>
              {post.profiles.username}
            </Text>
            <Text style={[styles.postTime, { color: colors.textSecondary }]}>
              {formatDate(post.created_at)}
            </Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => setShowMenu(true)}
          style={[styles.menuButton, { backgroundColor: colors.backgroundSecondary }]}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          activeOpacity={0.8}
        >
          <MoreHorizontal size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Full-width Media */}
      <View style={styles.mediaWrapper}>
        {post.media_type === 'video' ? (
          <TouchableOpacity
            style={[styles.videoContainer, { aspectRatio: getImageAspectRatio() }]}
            activeOpacity={0.95}
            onPress={() => toggleVideoPlayback(post.id)}
          >
            <Video
              ref={(ref: any) => {
                videoRefs.current[post.id] = ref;
              }}
              source={{ uri: post.image_url }}
              style={styles.videoPlayer}
              useNativeControls={false}
              isLooping
              shouldPlay={false}
            />
            <View style={styles.videoControls}>
              <View style={styles.playButtonContainer}>
                {playingVideo === post.id ? 
                  <Pause size={28} color="#fff" /> : 
                  <Play size={28} color="#fff" />
                }
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            activeOpacity={1}
            onPress={handlePostTap}
            style={styles.imageWrapper}
            disabled={isProcessingLike}
          >
            <Image 
              source={{ uri: post.image_url }} 
              style={[
                styles.postMedia, 
                { 
                  aspectRatio: getImageAspectRatio(),
                  opacity: imageLoaded ? 1 : 0 
                }
              ]}
              resizeMode="cover"
              onLoad={() => setImageLoaded(true)}
            />
            {!imageLoaded && (
              <View style={[styles.mediaPlaceholder, { 
                aspectRatio: getImageAspectRatio(),
                backgroundColor: colors.backgroundSecondary 
              }]} />
            )}
            
            {/* Double tap heart animation */}
            <Animated.View 
              style={[
                styles.doubleTapEffect,
                {
                  opacity: doubleTapAnimation,
                  transform: [
                    {
                      scale: doubleTapAnimation.interpolate({
                        inputRange: [0, 0.1, 1],
                        outputRange: [0, 1.3, 0],
                      }),
                    },
                  ],
                }
              ]}
              pointerEvents="none"
            >
              <Heart size={90} color="#fff" fill="#FF3B30" />
            </Animated.View>
          </TouchableOpacity>
        )}
      </View>

      {/* Interaction Section */}
      <View style={styles.interactionSection}>
        <Animated.View style={{ transform: [{ scale: likeAnimation }] }}>
          <TouchableOpacity 
            onPress={handleLikePress} 
            style={[styles.likeButton, isProcessingLike && { opacity: 0.6 }]}
            activeOpacity={0.7}
            disabled={isProcessingLike}
          >
            <Heart 
              size={28} 
              color={isLiked ? '#FF3B30' : colors.textSecondary} 
              fill={isLiked ? '#FF3B30' : 'none'} 
              strokeWidth={1.5}
            />
          </TouchableOpacity>
        </Animated.View>
        
        {/* Likes count with elegant styling */}
        {post.likes.length > 0 && (
          <Text style={[styles.likesCount, { color: colors.text }]}>
            {formatLikesCount(post.likes.length)}
          </Text>
        )}
      </View>

      {/* Content Section */}
      {post.caption && (
        <View style={styles.contentSection}>
          <Text style={[styles.captionText, { color: colors.text }]}>
            <Text style={[styles.captionAuthor, { color: colors.text }]}>
              {post.profiles.username}
            </Text>
            {' '}
            {displayCaption}
            {shouldTruncateCaption && (
              <Text 
                style={[styles.expandText, { color: colors.textSecondary }]}
                onPress={() => setShowFullCaption(!showFullCaption)}
              >
                {showFullCaption ? ' less' : ' more'}
              </Text>
            )}
          </Text>
        </View>
      )}

      {/* Product CTA */}
      {post.product_id && (
        <View style={styles.productCTA}>
          <TouchableOpacity
            style={[styles.ctaButton, { 
              backgroundColor: colors.tint,
            }]}
            onPress={() => {
              if (!isAuthenticated) {
                showAuthModal();
                return;
              }
              router.push(`/marketplace/${post.product_id}`);
            }}
            activeOpacity={0.9}
          >
            <Text style={styles.ctaText}>
              View Product
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Fullscreen Modal */}
      <Modal
        visible={showFullscreen}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFullscreen(false)}
      >
        <View style={styles.fullscreenContainer}>
          <TouchableOpacity 
            style={styles.fullscreenOverlay}
            activeOpacity={1}
            onPress={() => setShowFullscreen(false)}
          >
            {post.media_type === 'video' ? (
              <Video
                source={{ uri: post.image_url }}
                style={styles.fullscreenMedia}
                useNativeControls={false}
                isLooping
                shouldPlay={true}
              />
            ) : (
              <Image 
                source={{ uri: post.image_url }} 
                style={styles.fullscreenMedia}
                resizeMode="contain"
              />
            )}
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Report Menu Modal */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity 
          style={styles.menuOverlay} 
          activeOpacity={1} 
          onPress={() => setShowMenu(false)}
        >
          <View style={[styles.menuContainer, { backgroundColor: colors.card }]}>
            <TouchableOpacity 
              style={[styles.menuItem, flaggedPosts[post.id] && { opacity: 0.5 }]}
              onPress={onReportPress}
              disabled={flaggedPosts[post.id] || flagging[post.id]}
              activeOpacity={0.7}
            >
              <Text style={[styles.menuItemText, { color: '#FF3B30' }]}>
                {flaggedPosts[post.id] ? 'Post Reported' : flagging[post.id] ? 'Reporting...' : 'Report Post'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => setShowMenu(false)}
              activeOpacity={0.7}
            >
              <Text style={[styles.menuItemText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default PostComponent;

const styles = StyleSheet.create({
  // Main Container
  postContainer: {
    marginBottom: Spacing.xl * 1.5,
  },
  
  // Floating Header
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    zIndex: 1,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: Spacing.md,
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userDetails: {
    flex: 1,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  postTime: {
    fontSize: 13,
    fontWeight: '500',
  },
  menuButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Media Section
  mediaWrapper: {
    position: 'relative',
  },
  imageWrapper: {
    position: 'relative',
  },
  postMedia: {
    width: '100%',
  },
  mediaPlaceholder: {
    width: '100%',
    position: 'absolute',
    top: 0,
  },
  videoContainer: {
    width: '100%',
    backgroundColor: '#000',
    position: 'relative',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  videoControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonContainer: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 30,
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(10px)',
  },
  doubleTapEffect: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -45 }, { translateY: -45 }],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
    }),
  },
  
  // Interaction Section
  interactionSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  likeButton: {
    padding: Spacing.xs,
  },
  likesCount: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  
  // Content Section
  contentSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  captionText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400',
  },
  captionAuthor: {
    fontWeight: '600',
  },
  expandText: {
    fontWeight: '500',
  },
  
  // Product CTA
  productCTA: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  ctaButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    }),
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Modals
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenOverlay: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenMedia: {
    width: '100%',
    height: '100%',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    borderRadius: BorderRadius.lg,
    minWidth: 200,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
    }),
  },
  menuItem: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
}); 