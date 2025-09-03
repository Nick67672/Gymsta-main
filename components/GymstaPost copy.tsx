import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  Fragment,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  Dimensions,
  Modal,
  Pressable,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Heart,
  MessageCircle,
  MoreHorizontal,
  CircleCheck as CheckCircle2,
  Trash2,
  X,
  ChevronLeft,
  Dumbbell,
  TrendingUp,
  Clock,
  Target,
  Zap,
  Star,
  Share2,
  Bookmark,
  Play,
  Pause,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Trophy,
  Flame,
  Eye,
  Users,
  TrendingDown,
  Award,
  Crown,
  Target as TargetIcon,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useUnits } from '@/context/UnitContext';
import { Post } from '../types/social';
import { BorderRadius, Spacing } from '@/constants/Spacing';
import { ConfirmModal } from './ConfirmModal';
import { ThemedButton } from './ThemedButton';
import { CommentSystem } from './CommentSystem';
import { ShareModal } from './ShareModal';
import { getAvatarUrl } from '@/lib/avatarUtils';
import ImageZoomViewer from './ImageZoomViewer';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface GymstaPostProps {
  post: Post & { comments_count?: number };
  colors: any;
  playingVideo: string | null;
  currentUserId: string | null;
  flaggedPosts: { [postId: string]: boolean };
  flagging: { [postId: string]: boolean };
  setFlagging: React.Dispatch<
    React.SetStateAction<{ [postId: string]: boolean }>
  >;
  setFlaggedPosts: React.Dispatch<
    React.SetStateAction<{ [postId: string]: boolean }>
  >;
  isAuthenticated: boolean;
  showAuthModal: () => void;
  toggleVideoPlayback: (postId: string) => void;
  navigateToProfile: (userId: string, username: string) => void;
  handleLike: (postId: string) => void;
  handleUnlike: (postId: string) => void;
  videoRefs: React.MutableRefObject<{ [key: string]: any }>;
  handleDeletePost: (postId: string) => void;
  onCommentCountChange?: (postId: string, count: number) => void;
  isMyGymTab?: boolean;
}

const GymstaPost: React.FC<GymstaPostProps> = ({
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
  onCommentCountChange,
  isMyGymTab = false,
}) => {
  // Animation values for the new design
  const [cardScale] = useState(new Animated.Value(1));
  const [cardRotation] = useState(new Animated.Value(0));
  const [cardElevation] = useState(new Animated.Value(0));
  const [contentOpacity] = useState(new Animated.Value(0));
  const [likeAnimation] = useState(new Animated.Value(1));
  const [doubleTapAnimation] = useState(new Animated.Value(0));
  const [achievementScale] = useState(new Animated.Value(0));
  const [engagementPulse] = useState(new Animated.Value(0));
  const [socialProofOpacity] = useState(new Animated.Value(0));
  console.log('post', post);
  const [revealAnimation] = useState(new Animated.Value(0));

  // State management
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [localCommentsCount, setLocalCommentsCount] = useState(
    post.comments_count || 0
  );
  const [isProcessingLike, setIsProcessingLike] = useState(false);
  const [showAchievement, setShowAchievement] = useState(false);
  const [showEngagementPulse, setShowEngagementPulse] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showWorkoutStats, setShowWorkoutStats] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showImageZoom, setShowImageZoom] = useState(false);
  const [showFullScreenLike, setShowFullScreenLike] = useState(false);
  const [fullScreenLikeAnimation] = useState(new Animated.Value(0));
  const [showFullPostModal, setShowFullPostModal] = useState(false);

  // Unit system
  const { formatWeight } = useUnits();

  // Gesture handling

  const lastTap = useRef(0);
  const likeActionRef = useRef(false);
  const lastLikeActionRef = useRef(0);
  const singleTapTimeout = useRef<number | null>(null);

  // Check if post has workout data
  const hasWorkoutData =
    (post as any).workout_id ||
    post.caption?.includes('#workout') ||
    post.caption?.includes('#fitness');

  // Simulated workout stats for demonstration
  const workoutStats = {
    duration: '45 min',
    calories: '320 cal',
    exercises: 8,
    difficulty: 'Intermediate',
    type: 'Strength',
  };

  // Format date helper
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  // Check if post is saved function
  const checkIfSaved = async () => {
    if (!currentUserId) {
      console.log('🔍 [DEBUG] checkIfSaved: No currentUserId');
      return;
    }

    console.log(
      '🔍 [DEBUG] checkIfSaved: Checking for user:',
      currentUserId,
      'post:',
      post.id
    );

    try {
      const { data, error } = await supabase
        .from('saved_posts')
        .select('id')
        .eq('user_id', currentUserId)
        .eq('post_id', post.id)
        .maybeSingle();

      console.log('🔍 [DEBUG] checkIfSaved result:', { data, error });

      if (!error && data) {
        setIsSaved(true);
        console.log('🔍 [DEBUG] Post is saved');
      } else {
        setIsSaved(false);
        console.log('🔍 [DEBUG] Post is not saved');
      }
    } catch (error) {
      // Post is not saved
      setIsSaved(false);
      console.log('🔍 [DEBUG] checkIfSaved error:', error);
    }
  };

  // Enhanced entrance animation with progressive reveal
  useEffect(() => {
    // Check if post is saved
    checkIfSaved();

    // Start entrance animation
    Animated.parallel([
      Animated.spring(cardScale, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(cardElevation, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Progressive social proof reveal
    setTimeout(() => {
      Animated.timing(socialProofOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }, 1200);
  }, [currentUserId, post.id]);

  const handleSavePost = async () => {
    console.log(
      '🔍 [DEBUG] handleSavePost called, isAuthenticated:',
      isAuthenticated,
      'currentUserId:',
      currentUserId
    );

    if (!isAuthenticated) {
      console.log('🔍 [DEBUG] Not authenticated, showing auth modal');
      showAuthModal();
      return;
    }

    if (!currentUserId) {
      console.log('🔍 [DEBUG] No currentUserId');
      return;
    }

    setSaving(true);
    console.log(
      '🔍 [DEBUG] Starting save/unsave operation, current isSaved:',
      isSaved
    );

    try {
      if (isSaved) {
        // Unsave post
        console.log('🔍 [DEBUG] Unsaving post');
        const { error } = await supabase
          .from('saved_posts')
          .delete()
          .eq('user_id', currentUserId)
          .eq('post_id', post.id);

        console.log('🔍 [DEBUG] Unsave result:', { error });

        if (error) throw error;

        setIsSaved(false);
        console.log('🔍 [DEBUG] Post unsaved successfully');
      } else {
        // Save post
        console.log('🔍 [DEBUG] Saving post');
        const { error } = await supabase.from('saved_posts').upsert(
          {
            user_id: currentUserId,
            post_id: post.id,
          },
          { onConflict: 'user_id,post_id' }
        );

        console.log('🔍 [DEBUG] Save result:', { error });

        if (error) throw error;

        setIsSaved(true);
        console.log('🔍 [DEBUG] Post saved successfully');
      }
    } catch (error) {
      console.error('Error saving/unsaving post:', error);
      Alert.alert('Error', 'Failed to save post');
    } finally {
      setSaving(false);
    }
  };

  // Handle card press with haptic feedback
  const handleCardPress = useCallback(() => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    Animated.sequence([
      Animated.timing(cardScale, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(cardScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [cardScale]);

  // Handle like action with enhanced animation
  const performLikeAction = useCallback(async () => {
    if (!isAuthenticated) {
      showAuthModal();
      return;
    }

    if (isProcessingLike) return;
    setIsProcessingLike(true);

    const now = Date.now();
    if (now - lastLikeActionRef.current < 500) return;
    lastLikeActionRef.current = now;

    const isLiked = currentUserId
      ? post.likes.some((like) => like.user_id === currentUserId)
      : false;

    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Enhanced like animation
    Animated.sequence([
      Animated.timing(likeAnimation, {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(likeAnimation, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    if (isLiked) {
      handleUnlike(post.id);
    } else {
      handleLike(post.id);
    }

    setTimeout(() => setIsProcessingLike(false), 500);
  }, [
    isAuthenticated,
    showAuthModal,
    isProcessingLike,
    currentUserId,
    post.likes,
    post.id,
    handleLike,
    handleUnlike,
    likeAnimation,
  ]);

  // Handle tap gestures - single tap for full post, double tap for like
  const handleMediaTap = useCallback(() => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (lastTap.current && now - lastTap.current < DOUBLE_TAP_DELAY) {
      // Clear any pending single tap
      if (singleTapTimeout.current) {
        clearTimeout(singleTapTimeout.current);
        singleTapTimeout.current = null;
      }

      // Double tap detected - show full screen like modal
      setShowFullScreenLike(true);

      // Animate the full screen like
      Animated.sequence([
        Animated.timing(fullScreenLikeAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(800),
        Animated.timing(fullScreenLikeAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowFullScreenLike(false);
      });

      // Also animate the small heart for immediate feedback
      Animated.sequence([
        Animated.timing(doubleTapAnimation, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(doubleTapAnimation, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      performLikeAction();
    } else {
      // Single tap - set timeout to show full post modal
      singleTapTimeout.current = setTimeout(() => {
        setShowFullPostModal(true);
        if (Platform.OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }, DOUBLE_TAP_DELAY);
    }
    lastTap.current = now;
  }, [doubleTapAnimation, fullScreenLikeAnimation, performLikeAction]);

  // Format likes count
  const formatLikesCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  // Handle comment count update
  const handleCommentCountUpdate = useCallback(
    (count: number) => {
      setLocalCommentsCount(count);
      onCommentCountChange?.(post.id, count);
    },
    [post.id, onCommentCountChange]
  );

  // Report post handler
  const onReportPress = useCallback(async () => {
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }

    setShowMenu(false);
    setFlagging((prev) => ({ ...prev, [post.id]: true }));
    try {
      const { error } = await supabase
        .from('posts')
        .update({ is_flagged: true })
        .eq('id', post.id);
      if (!error) {
        setFlaggedPosts((prev) => ({ ...prev, [post.id]: true }));
        Alert.alert(
          'Post Reported',
          'Thank you for reporting this post. We will review it shortly.'
        );
      } else {
        Alert.alert('Error', 'Failed to report post.');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to report post.');
    } finally {
      setFlagging((prev) => ({ ...prev, [post.id]: false }));
    }
  }, [flaggedPosts, flagging, post.id]);

  const isLiked = currentUserId
    ? post.likes.some((like) => like.user_id === currentUserId)
    : false;
  const shouldTruncateCaption = post.caption && post.caption.length > 100;
  const displayCaption =
    shouldTruncateCaption && !showFullCaption
      ? post.caption!.substring(0, 100) + '...'
      : post.caption;

  return (
    <React.Fragment>
      <View style={[styles.Container, { backgroundColor: colors.background }]}>
        {/* -style Header */}
        <View style={[styles.Header, { backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={styles.ProfileSection}
            onPress={() =>
              navigateToProfile(post.profiles.id ?? '', post.profiles.username)
            }
            activeOpacity={0.8}
          >
            <View style={styles.AvatarContainer}>
              <Image
                source={{
                  uri: getAvatarUrl(
                    post.profiles.avatar_url,
                    post.profiles.username
                  ),
                }}
                style={styles.Avatar}
              />
              {post.profiles.is_verified && (
                <View style={styles.VerifiedBadge}>
                  <CheckCircle2 size={12} color="#fff" fill="#3B82F6" />
                </View>
              )}
            </View>
            <View style={styles.UserInfo}>
              <Text style={[styles.Username, { color: colors.text }]}>
                {post.profiles.username}
              </Text>
              {(post as any).location_name && (
                <Text
                  style={[styles.Location, { color: colors.textSecondary }]}
                >
                  {(post as any).location_name}
                </Text>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowMenu(true)}
            style={styles.MenuButton}
            activeOpacity={0.8}
          >
            <MoreHorizontal size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* -style Media Container */}
        <TouchableOpacity
          style={styles.MediaContainer}
          onPress={handleMediaTap}
          activeOpacity={1}
        >
          {post.media_type === 'video' ? (
            <View style={styles.VideoContainer}>
              <Video
                ref={(ref: any) => {
                  videoRefs.current[post.id] = ref;
                }}
                source={{ uri: post.image_url }}
                style={styles.Media}
                useNativeControls={false}
                isLooping
                shouldPlay={playingVideo === post.id}
                isMuted={true}
                resizeMode={ResizeMode.COVER}
                onError={(error) => {
                  console.error('Video playback error:', error);
                }}
              />
              <TouchableOpacity
                style={styles.PlayButton}
                onPress={() => toggleVideoPlayback(post.id)}
                activeOpacity={0.8}
              >
                {playingVideo === post.id ? (
                  <Pause size={27} strokeWidth={1} color="#b3b2b2ef" />
                ) : (
                  <Play size={27} strokeWidth={1} color="#b3b2b2ef" />
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <Image
              source={{ uri: post.image_url }}
              style={styles.Media}
              onLoad={() => setImageLoaded(true)}
              resizeMode="cover"
              onError={(error) => {
                console.error('Image load error:', error);
              }}
            />
          )}

          {/* -style Double Tap Heart */}
          <Animated.View
            style={[
              styles.DoubleTapHeart,
              {
                opacity: doubleTapAnimation,
                transform: [
                  {
                    scale: doubleTapAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 1.2],
                    }),
                  },
                ],
              },
            ]}
          >
            <Heart
              size={80}
              color="rgba(255, 255, 255, 0.9)"
              fill="rgba(255, 255, 255, 0.9)"
            />
          </Animated.View>
        </TouchableOpacity>

        {/* -style Action Bar */}
        <View style={styles.ActionBar}>
          <View style={styles.LeftActions}>
            <View style={styles.ActionGroup}>
              <Animated.View style={{ transform: [{ scale: likeAnimation }] }}>
                <TouchableOpacity
                  onPress={performLikeAction}
                  style={styles.ActionButton}
                  activeOpacity={0.6}
                  disabled={isProcessingLike}
                >
                  {isProcessingLike ? (
                    <ActivityIndicator size="small" color={colors.tint} />
                  ) : (
                    <Heart
                      size={24}
                      color={isLiked ? '#FF3B30' : colors.text}
                      fill={isLiked ? '#FF3B30' : 'transparent'}
                      strokeWidth={2}
                    />
                  )}
                </TouchableOpacity>
              </Animated.View>
              {post.likes?.length > 0 && (
                <Text style={[styles.ActionCount, { color: colors.text }]}>
                  {post.likes.length.toLocaleString()}
                </Text>
              )}
            </View>

            <View style={styles.ActionGroup}>
              <TouchableOpacity
                onPress={() => {
                  if (!isAuthenticated) {
                    showAuthModal();
                    return;
                  }
                  setShowComments(true);
                }}
                style={styles.ActionButton}
                activeOpacity={0.6}
              >
                <MessageCircle size={24} color={colors.text} strokeWidth={2} />
              </TouchableOpacity>
              {localCommentsCount > 0 && (
                <Text style={[styles.ActionCount, { color: colors.text }]}>
                  {localCommentsCount.toLocaleString()}
                </Text>
              )}
            </View>

            <TouchableOpacity
              onPress={() => setShowShareModal(true)}
              style={styles.ActionButton}
              activeOpacity={0.6}
            >
              <Share2 size={24} color={colors.text} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={handleSavePost}
            style={styles.ActionButton}
            activeOpacity={0.6}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.tint} />
            ) : (
              <Bookmark
                size={24}
                color={isSaved ? colors.text : colors.text}
                fill={isSaved ? colors.text : 'transparent'}
                strokeWidth={2}
              />
            )}
          </TouchableOpacity>
        </View>

        {/* -style Caption */}
        {post.caption && (
          <View style={styles.CaptionSection}>
            <TouchableOpacity
              onPress={() => setIsExpanded(!isExpanded)}
              activeOpacity={1}
            >
              <Text style={[styles.CaptionText, { color: colors.text }]}>
                <Text style={[styles.CaptionUsername, { color: colors.text }]}>
                  {post.profiles.username}
                </Text>{' '}
                {isExpanded ? post.caption : displayCaption}
                {shouldTruncateCaption && !isExpanded && (
                  <Text
                    style={[styles.MoreText, { color: colors.textSecondary }]}
                  >
                    {' '}
                    more
                  </Text>
                )}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* -style Comments Preview */}
        {localCommentsCount > 0 && (
          <TouchableOpacity
            onPress={() => {
              if (!isAuthenticated) {
                showAuthModal();
                return;
              }
              setShowComments(true);
            }}
            style={styles.CommentsSection}
            activeOpacity={0.8}
          >
            <Text
              style={[styles.CommentsText, { color: colors.textSecondary }]}
            >
              View all {localCommentsCount}{' '}
              {localCommentsCount === 1 ? 'comment' : 'comments'}
            </Text>
          </TouchableOpacity>
        )}

        {/* -style Timestamp */}
        <View style={styles.TimestampSection}>
          <Text style={[styles.Timestamp, { color: colors.textSecondary }]}>
            {formatDate(post.created_at)}
          </Text>
        </View>
      </View>
      {/* The rest of your component (modals, overlays, etc.) should be outside the main container */}
      <Modal
        transparent={true}
        visible={showMenu}
        onRequestClose={() => setShowMenu(false)}
        animationType="slide"
      >
        <Pressable
          style={styles.bottomSheetOverlay}
          onPress={() => setShowMenu(false)}
        >
          <View
            style={[
              styles.bottomSheetContainer,
              { backgroundColor: colors.card },
            ]}
          >
            <View style={styles.handle} />
            {currentUserId === post.user_id ? (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowMenu(false);
                  setShowDeleteConfirm(true);
                }}
              >
                <Trash2 size={22} color={colors.error} />
                <Text style={[styles.menuItemText, { color: colors.error }]}>
                  Delete Post
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.menuItem} onPress={onReportPress}>
                <CheckCircle2 size={22} color={colors.error} />
                <Text style={[styles.menuItemText, { color: colors.error }]}>
                  Report Post
                </Text>
              </TouchableOpacity>
            )}
            <ThemedButton
              title="Cancel"
              onPress={() => setShowMenu(false)}
              variant="secondary"
              style={{ marginTop: Spacing.md }}
            />
          </View>
        </Pressable>
      </Modal>

      <ConfirmModal
        visible={showDeleteConfirm}
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone."
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          setShowDeleteConfirm(false);
          handleDeletePost(post.id);
        }}
        confirmButtonTitle="Delete"
        isDestructive={true}
      />

      <CommentSystem
        postId={post.id}
        visible={showComments}
        onClose={() => setShowComments(false)}
        postOwnerId={post.user_id}
        onCommentCountChange={handleCommentCountUpdate}
      />

      <ShareModal
        postId={post.id}
        postUrl={`https://gymsta.app/post/${post.id}`}
        postTitle={
          post.caption || `Post by ${post.profiles?.username || 'Gymsta user'}`
        }
        postImageUrl={post.image_url}
        authorUsername={post.profiles?.username}
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        colors={colors}
      />

      {/* Image Zoom Viewer */}
      <ImageZoomViewer
        visible={showImageZoom}
        imageUri={post.image_url}
        onClose={() => setShowImageZoom(false)}
        colors={colors}
      />

      {/* Full Screen Like Modal */}
      <Modal
        visible={showFullScreenLike}
        transparent={true}
        animationType="none"
        statusBarTranslucent={true}
      >
        <View style={styles.fullScreenLikeContainer}>
          <Animated.View
            style={[
              styles.fullScreenLikeContent,
              {
                opacity: fullScreenLikeAnimation,
                transform: [
                  {
                    scale: fullScreenLikeAnimation.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.3, 1.1, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Heart size={120} color="#FF3B30" fill="#FF3B30" />
            <Text style={styles.fullScreenLikeText}>Liked!</Text>
          </Animated.View>
        </View>
      </Modal>

      {/* Full Post Modal */}
      <Modal
        visible={showFullPostModal}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View
          style={[
            styles.fullPostContainer,
            { backgroundColor: colors.background },
          ]}
        >
          {/* Header */}
          <View
            style={[
              styles.fullPostHeader,
              { backgroundColor: colors.background },
            ]}
          >
            <TouchableOpacity
              onPress={() => setShowFullPostModal(false)}
              style={styles.closeButton}
              activeOpacity={0.8}
            >
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.fullPostTitle, { color: colors.text }]}>
              Post
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Main Content */}
          <View style={styles.fullPostContent}>
            {/* Author Section */}
            <View
              style={[
                styles.fullPostAuthor,
                { borderBottomColor: colors.border },
              ]}
            >
              <TouchableOpacity
                style={styles.fullPostProfileSection}
                onPress={() => {
                  setShowFullPostModal(false);
                  navigateToProfile(
                    post.profiles.id ?? '',
                    post.profiles.username
                  );
                }}
                activeOpacity={0.8}
              >
                <View style={styles.fullPostAvatarContainer}>
                  <Image
                    source={{
                      uri: getAvatarUrl(
                        post.profiles.avatar_url,
                        post.profiles.username
                      ),
                    }}
                    style={styles.fullPostAvatar}
                  />
                  {post.profiles.is_verified && (
                    <View style={styles.fullPostVerifiedBadge}>
                      <CheckCircle2 size={16} color="#fff" fill="#3B82F6" />
                    </View>
                  )}
                </View>
                <View style={styles.fullPostUserInfo}>
                  <Text
                    style={[styles.fullPostUsername, { color: colors.text }]}
                  >
                    {post.profiles.username}
                  </Text>
                  <Text
                    style={[
                      styles.fullPostTimestamp,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {formatDate(post.created_at)}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Media Section */}
            <View style={styles.fullPostMediaSection}>
              {post.media_type === 'video' ? (
                <View style={styles.fullPostVideoContainer}>
                  <Video
                    source={{ uri: post.image_url }}
                    style={styles.fullPostMedia}
                    useNativeControls={true}
                    isLooping
                    shouldPlay={true}
                    resizeMode={ResizeMode.COVER}
                  />
                </View>
              ) : (
                <Image
                  source={{ uri: post.image_url }}
                  style={styles.fullPostMedia}
                  resizeMode="cover"
                />
              )}
            </View>

            {/* Caption Section */}
            {post.caption && (
              <View style={styles.fullPostCaptionSection}>
                <Text
                  style={[styles.fullPostCaptionText, { color: colors.text }]}
                >
                  <Text
                    style={[
                      styles.fullPostCaptionUsername,
                      { color: colors.text },
                    ]}
                  >
                    {post.profiles.username}
                  </Text>{' '}
                  {post.caption}
                </Text>
              </View>
            )}

            {/* Action Bar */}
            <View
              style={[
                styles.fullPostActionBar,
                { borderTopColor: colors.border },
              ]}
            >
              <View style={styles.fullPostLeftActions}>
                <View style={styles.fullPostActionGroup}>
                  <Animated.View
                    style={{ transform: [{ scale: likeAnimation }] }}
                  >
                    <TouchableOpacity
                      onPress={performLikeAction}
                      style={styles.fullPostActionButton}
                      activeOpacity={0.6}
                      disabled={isProcessingLike}
                    >
                      {isProcessingLike ? (
                        <ActivityIndicator size="small" color={colors.tint} />
                      ) : (
                        <Heart
                          size={28}
                          color={isLiked ? '#FF3B30' : colors.text}
                          fill={isLiked ? '#FF3B30' : 'transparent'}
                          strokeWidth={2}
                        />
                      )}
                    </TouchableOpacity>
                  </Animated.View>
                  {post.likes?.length > 0 && (
                    <Text
                      style={[
                        styles.fullPostActionCount,
                        { color: colors.text },
                      ]}
                    >
                      {post.likes.length.toLocaleString()}
                    </Text>
                  )}
                </View>

                <View style={styles.fullPostActionGroup}>
                  <TouchableOpacity
                    onPress={() => {
                      if (!isAuthenticated) {
                        showAuthModal();
                        return;
                      }
                      setShowComments(true);
                    }}
                    style={styles.fullPostActionButton}
                    activeOpacity={0.6}
                  >
                    <MessageCircle
                      size={28}
                      color={colors.text}
                      strokeWidth={2}
                    />
                  </TouchableOpacity>
                  {localCommentsCount > 0 && (
                    <Text
                      style={[
                        styles.fullPostActionCount,
                        { color: colors.text },
                      ]}
                    >
                      {localCommentsCount.toLocaleString()}
                    </Text>
                  )}
                </View>

                <TouchableOpacity
                  onPress={() => setShowShareModal(true)}
                  style={styles.fullPostActionButton}
                  activeOpacity={0.6}
                >
                  <Share2 size={28} color={colors.text} strokeWidth={2} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={handleSavePost}
                style={styles.fullPostActionButton}
                activeOpacity={0.6}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.tint} />
                ) : (
                  <Bookmark
                    size={28}
                    color={isSaved ? colors.text : colors.text}
                    fill={isSaved ? colors.text : 'transparent'}
                    strokeWidth={2}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </React.Fragment>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 0,
    marginBottom: Spacing.md,
  },
  floatingCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
      default: {},
    }),
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  floatingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    zIndex: 2,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
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
  workoutBadge: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.7,
  },
  menuButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaContainer: {
    position: 'relative',
    zIndex: 2,
  },
  imageContainer: {
    position: 'relative',
    aspectRatio: 1,
  },
  imageTouchable: {
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  videoContainer: {
    aspectRatio: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 30,
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(10px)',
  },
  achievementOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  achievementGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  achievementContent: {
    alignItems: 'center',
    gap: 4,
  },
  achievementText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  achievementStats: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  achievementStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  achievementStatText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  doubleTapHeart: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  swipeIndicators: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  swipeIndicator: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  swipeRight: {
    right: Spacing.lg,
  },
  swipeLeft: {
    left: Spacing.lg,
  },
  swipeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  contentSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 0,
    zIndex: 2,
  },
  quickStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    fontWeight: '600',
  },
  captionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  captionText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400',
    flex: 1,
  },
  captionAuthor: {
    fontWeight: '700',
  },
  expandText: {
    fontWeight: '600',
  },
  expandIcon: {
    marginLeft: Spacing.sm,
  },
  productCTA: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginTop: Spacing.xs,
  },
  productGradient: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  productContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  productText: {
    fontSize: 16,
    fontWeight: '700',
  },
  floatingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingTop: 0,
    paddingBottom: 0,
    marginTop: -6,
    zIndex: 2,
    gap: Spacing.lg,
  },
  actionGroup: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionButton: {
    padding: Spacing.xs,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  likeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  commentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  likedButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  likeCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  commentCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  countsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  countText: {
    fontSize: 14,
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

  // Modern UI Styles
  modernFloatingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    zIndex: 2,
  },
  modernProfileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modernAvatarContainer: {
    position: 'relative',
    marginRight: Spacing.md,
  },
  modernAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
  },
  modernVerifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  modernWorkoutBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  modernUserInfo: {
    flex: 1,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  modernUsername: {
    fontSize: 16,
    fontWeight: '700',
    marginRight: Spacing.sm,
  },
  workoutTypeChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  workoutTypeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modernTimestamp: {
    fontSize: 12,
    fontWeight: '500',
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#ccc',
    marginHorizontal: 6,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '500',
  },
  modernMenuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  // Modern Action Buttons
  modernFloatingActions: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    zIndex: 2,
  },
  modernActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  modernLikeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.lg,
  },
  modernCommentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.lg,
  },
  modernActionButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modernLikedButton: {
    shadowColor: '#FF3B30',
    shadowOpacity: 0.3,
  },
  modernActionCount: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  modernSpacer: {
    flex: 1,
  },
  modernEngagementStats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.xs,
  },
  modernStatsText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statsDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 6,
  },

  // -style UI
  Container: {
    marginBottom: 24,
    borderColor: '#cfcfcf36',
    borderWidth: 1,
    borderRadius: 10,
  },
  Header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  ProfileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  AvatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  Avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderColor: '#cfcfcf36',
    borderWidth: 1,
  },
  VerifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  UserInfo: {
    flex: 1,
  },
  Username: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  Location: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  MenuButton: {
    padding: 8,
  },
  MediaContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1,
  },
  VideoContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  Media: {
    width: '100%',
    height: '100%',
  },
  PlayButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -20 }],
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 247, 247, 0)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  DoubleTapHeart: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -40 }, { translateY: -40 }],
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  ActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  LeftActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  ActionButton: {
    padding: 2,
  },
  ActionCount: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
    lineHeight: 18,
  },
  LikesSection: {
    paddingHorizontal: 16,
    paddingVertical: 2,
  },
  LikesText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  CaptionSection: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  CaptionText: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
  },
  CaptionUsername: {
    fontWeight: '600',
  },
  MoreText: {
    fontWeight: '400',
  },
  CommentsSection: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  CommentsText: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
  },
  TimestampSection: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    paddingBottom: 12,
  },
  Timestamp: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 12,
    letterSpacing: 0.2,
  },
  fullScreenLikeContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  fullScreenLikeContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  fullScreenLikeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  // Full Post Modal Styles
  fullPostContainer: {
    flex: 1,
    ...Platform.select({
      ios: {
        paddingTop: 50, // Status bar height
      },
      android: {
        paddingTop: 25,
      },
    }),
  },
  fullPostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  fullPostTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  fullPostContent: {
    flex: 1,
  },
  fullPostAuthor: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  fullPostProfileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fullPostAvatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  fullPostAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'white',
  },
  fullPostVerifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  fullPostUserInfo: {
    flex: 1,
  },
  fullPostUsername: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
  },
  fullPostTimestamp: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
    marginTop: 2,
  },
  fullPostMediaSection: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullPostVideoContainer: {
    width: '100%',
    height: '100%',
  },
  fullPostMedia: {
    width: '100%',
    height: '100%',
  },
  fullPostCaptionSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  fullPostCaptionText: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
  },
  fullPostCaptionUsername: {
    fontWeight: '600',
  },
  fullPostActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  fullPostLeftActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fullPostActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  fullPostActionButton: {
    padding: 4,
  },
  fullPostActionCount: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    lineHeight: 20,
  },
});

export default GymstaPost;
