import React, { useCallback, useState, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, Animated, Platform, Modal, ActivityIndicator, Pressable } from 'react-native';
import { Pause, Play, Heart, MoreHorizontal, CircleCheck as CheckCircle2, Trash2, X } from 'lucide-react-native';
import { VideoView } from 'expo-video';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { Post } from '../types/social';
import { BorderRadius, Spacing } from '@/constants/Spacing';
import { ConfirmModal } from './ConfirmModal';
import { ThemedButton } from './ThemedButton';

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
  handleDeletePost: (postId: string) => void;
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
  handleDeletePost,
}) => {
  const isLiked = currentUserId ? post.likes.some(like => like.user_id === currentUserId) : false;
  const [likeAnimation] = useState(new Animated.Value(1));
  const [doubleTapAnimation] = useState(new Animated.Value(0));
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [lastTap, setLastTap] = useState<number>(0);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [isProcessingLike, setIsProcessingLike] = useState(false);
  const likeActionRef = useRef(false);
  const lastLikeActionRef = useRef(0);
  const singleTapTimeout = useRef<number | null>(null);

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
  const performLikeAction = useCallback(async () => {
    if (!isAuthenticated) {
      showAuthModal();
      return;
    }

    if (isProcessingLike) return;
    setIsProcessingLike(true);

    try {
      if (isLiked) {
        await handleUnlike(post.id);
      } else {
        await handleLike(post.id);
      }
    } catch (error) {
      console.error('Error in like action:', error);
    } finally {
      setIsProcessingLike(false);
    }
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

  const handlePostTap = useCallback(() => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;

    // If there's a pending single tap, clear it.
    if (singleTapTimeout.current) {
      clearTimeout(singleTapTimeout.current);
      singleTapTimeout.current = null;
    }

    if (lastTap && (now - lastTap) < DOUBLE_PRESS_DELAY) {
      // --- This is a DOUBLE TAP ---
      // Reset the tap timer to prevent a triple-tap from acting like a double-tap.
      setLastTap(0); 
      
      // Like the post (if not already liked)
      if (!isLiked) {
        handleLike(post.id);
      }
      
      // Trigger the heart animation
      doubleTapAnimation.setValue(1);
      Animated.sequence([
        Animated.spring(doubleTapAnimation, { toValue: 2, friction: 3, useNativeDriver: true }),
        Animated.timing(doubleTapAnimation, { toValue: 0, duration: 200, useNativeDriver: true, delay: 200 }),
      ]).start();
      
    } else {
      // --- This is a SINGLE TAP ---
      // Record the time of this tap.
      setLastTap(now);
      
      // Schedule the enlarge action to run after a delay.
      singleTapTimeout.current = setTimeout(() => {
        setShowFullscreen(true);
      }, DOUBLE_PRESS_DELAY);
    }
  }, [lastTap, isLiked, post.id, handleLike, doubleTapAnimation]);

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

  const showDeleteConfirmation = () => {
    setShowMenu(false);
    setShowDeleteConfirm(true);
  };

  const onConfirmDelete = () => {
    setShowDeleteConfirm(false);
    handleDeletePost(post.id);
  };

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
          onPress={() => {
            console.log('🔘 Menu button clicked for post:', post.id);
            console.log('🔘 Post user_id:', post.user_id, 'Current user_id:', currentUserId);
            console.log('🔘 Should show delete:', post.user_id === currentUserId);
            setShowMenu(true);
          }}
          style={[styles.menuButton, { backgroundColor: colors.backgroundSecondary }]}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          activeOpacity={0.8}
        >
          <MoreHorizontal size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Full-width Media */}
      <Pressable onPress={handlePostTap}>
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
            <>
              <Image 
                source={{ uri: post.image_url }} 
                style={[styles.postMedia, { aspectRatio: 1, opacity: imageLoaded ? 1 : 0 }]}
                resizeMode="cover"
                onLoad={() => setImageLoaded(true)}
              />
              {!imageLoaded && <View style={[styles.mediaPlaceholder, { backgroundColor: colors.backgroundSecondary }]} />}
              <Animated.View 
                style={[
                  styles.doubleTapEffect,
                  {
                    opacity: doubleTapAnimation.interpolate({
                      inputRange: [0, 1, 2],
                      outputRange: [0, 1, 0],
                    }),
                    transform: [{
                      scale: doubleTapAnimation.interpolate({
                        inputRange: [0, 1, 2],
                        outputRange: [0.5, 1.2, 0.9],
                      }),
                    }],
                  }
                ]}
                pointerEvents="none"
              >
                <Heart size={90} color="rgba(255, 255, 255, 0.9)" fill="rgba(255, 255, 255, 0.9)" />
              </Animated.View>
            </>
          )}
        </View>
      </Pressable>

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
        transparent={false}
        onRequestClose={() => setShowFullscreen(false)}
        animationType="fade"
      >
        <View style={styles.fullscreenContainer}>
          <Image
            source={{ uri: post.image_url }}
            style={styles.fullscreenImage}
            resizeMode="contain"
          />
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setShowFullscreen(false)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Report Menu Modal */}
      <Modal
        transparent={true}
        visible={showMenu}
        onRequestClose={() => setShowMenu(false)}
        animationType="slide"
      >
        <Pressable style={styles.bottomSheetOverlay} onPress={() => setShowMenu(false)}>
          <View style={[styles.bottomSheetContainer, { backgroundColor: colors.card }]}>
            <View style={styles.handle} />
            {currentUserId === post.user_id ? (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={showDeleteConfirmation}
              >
                <Trash2 size={22} color={colors.error} />
                <Text style={[styles.menuItemText, { color: colors.error }]}>Delete Post</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.menuItem} onPress={onReportPress}>
                <CheckCircle2 size={22} color={colors.error} />
                <Text style={[styles.menuItemText, { color: colors.error }]}>Report Post</Text>
              </TouchableOpacity>
            )}
             <ThemedButton
                title="Cancel"
                onPress={() => setShowMenu(false)}
                variant="secondary"
                style={{marginTop: Spacing.md}}
              />
          </View>
        </Pressable>
      </Modal>

      <ConfirmModal
        visible={showDeleteConfirm}
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone."
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={onConfirmDelete}
        confirmButtonTitle="Delete"
        isDestructive={true}
      />
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
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
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
  fullscreenImage: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  bottomSheetContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ccc',
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  menuItemText: {
    marginLeft: Spacing.md,
    fontSize: 18,
  },
}); 