import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import { touchTargets } from '@/constants/Layout';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView } from 'expo-video';
import { router } from 'expo-router';
import { haptics } from '@/lib/haptics';
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
  Users,
  TrendingDown,
  Award,
  Crown,
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

// Temporary alias for expo-video
const Video: any = VideoView;

interface PostProps {
  post: Post & { comments_count?: number };
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
  onCommentCountChange?: (postId: string, count: number) => void;
  isMyGymTab?: boolean;
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
  onCommentCountChange,
  isMyGymTab = false,
}) => {
  console.log('🔍 [DEBUG] Post component rendered:', {
    postId: post.id,
    isMyGymTab,
    hasImage: !!post.image_url,
  });

  // State management
  const [showMenu, setShowMenu] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [localCommentsCount, setLocalCommentsCount] = useState(post.comments_count || 0);
  const [isProcessingLike, setIsProcessingLike] = useState(false);
  const [showEngagementPulse, setShowEngagementPulse] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showImageZoom, setShowImageZoom] = useState(false);

  // Unit system
  const { formatWeight } = useUnits();

  // Animation refs
  const likeAnimation = useRef(new Animated.Value(1)).current;
  const doubleTapAnimation = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.95)).current;
  const cardElevation = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  const engagementPulse = useRef(new Animated.Value(0)).current;
  const socialProofOpacity = useRef(new Animated.Value(0)).current;
  const lastTap = useRef(0);
  const saveAnimation = useRef(new Animated.Value(1)).current;

  // Check if post is saved function
  const checkIfSaved = async () => {
    if (!currentUserId) {
      console.log('🔍 [DEBUG] checkIfSaved: No currentUserId');
      return;
    }
    
    console.log('🔍 [DEBUG] checkIfSaved: Checking for user:', currentUserId, 'post:', post.id);
    
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

  // Enhanced like handler with achievement system
  const performLikeAction = useCallback(async () => {
    if (!isAuthenticated) {
      showAuthModal();
      return;
    }

    if (isProcessingLike) return;
    setIsProcessingLike(true);

    const currentIsLiked = currentUserId ? post.likes.some(like => like.user_id === currentUserId) : false;

    try {
      if (currentIsLiked) {
        await handleUnlike(post.id);
      } else {
        await handleLike(post.id);
        
        // Show engagement pulse
        setShowEngagementPulse(true);
        Animated.sequence([
          Animated.timing(engagementPulse, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(engagementPulse, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => setShowEngagementPulse(false));
      }
    } catch (error) {
      console.error('Error in like action:', error);
    } finally {
      setIsProcessingLike(false);
    }
  }, [isAuthenticated, currentUserId, post.likes, post.id, isProcessingLike, handleLike, handleUnlike, showAuthModal]);

  // Enhanced double tap handler
  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (lastTap.current && (now - lastTap.current) < DOUBLE_TAP_DELAY) {
      // Double tap detected
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

      haptics.doubleTap();

      performLikeAction();
    }
    lastTap.current = now;
  }, [doubleTapAnimation, performLikeAction]);

  // Single tap handler for opening image zoom
  const handleImageTap = useCallback(() => {
    if (post.image_url && post.media_type !== 'video') {
      setShowImageZoom(true);
    }
  }, [post.image_url, post.media_type]);

  // Enhanced like button press handler
  const handleLikePress = useCallback(() => {
    if (isProcessingLike) return;

    // Haptic feedback
    haptics.like();

    // Enhanced heart animation
    Animated.sequence([
      Animated.timing(likeAnimation, {
        toValue: 1.3,
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

  // Format date with enhanced styling
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  // Format likes count
  const formatLikesCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  // Handle comment count update
  const handleCommentCountUpdate = useCallback((count: number) => {
    setLocalCommentsCount(count);
    onCommentCountChange?.(post.id, count);
  }, [post.id, onCommentCountChange]);

  // Report post handler
  const onReportPress = useCallback(async () => {
    haptics.warning();

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

  const handleSavePost = async () => {
    console.log('🔍 [DEBUG] handleSavePost called, isAuthenticated:', isAuthenticated, 'currentUserId:', currentUserId);
    
    if (!isAuthenticated) {
      console.log('🔍 [DEBUG] Not authenticated, showing auth modal');
      showAuthModal();
      return;
    }

    if (!currentUserId) {
      console.log('🔍 [DEBUG] No currentUserId');
      return;
    }

    // Haptic feedback + bounce animation for responsiveness
    if (isSaved) {
      haptics.toggle();
    } else {
      haptics.save();
    }
    Animated.sequence([
      Animated.timing(saveAnimation, {
        toValue: 1.2,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.spring(saveAnimation, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    setSaving(true);
    console.log('🔍 [DEBUG] Starting save/unsave operation, current isSaved:', isSaved);
    
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
        const { error } = await supabase
          .from('saved_posts')
          .upsert({
            user_id: currentUserId,
            post_id: post.id,
          }, { onConflict: 'user_id,post_id' });

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

  const isLiked = currentUserId ? post.likes.some(like => like.user_id === currentUserId) : false;
  const shouldTruncateCaption = post.caption && post.caption.length > 100;
  const displayCaption = shouldTruncateCaption && !showFullCaption 
    ? post.caption!.substring(0, 100) + '...' 
    : post.caption;

  // Enhanced workout data detection
  const hasWorkoutData = post.caption?.includes('#workout') || post.caption?.includes('#fitness');
  const workoutStats = hasWorkoutData ? {
    difficulty: 'Intermediate',
    duration: 45,
    calories: 320,
    totalVolume: 2500, // Simulated total volume in kg
  } : null;

  // Engagement metrics for social proof
  const isTrending = (post.likes.length + localCommentsCount) > 5;
  const isViral = (post.likes.length + localCommentsCount) > 15;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { scale: cardScale },
          ],
          elevation: cardElevation.interpolate({
            inputRange: [0, 1],
            outputRange: [8, 16],
          }),
          shadowOpacity: cardElevation.interpolate({
            inputRange: [0, 1],
            outputRange: [0.1, 0.25],
          }),
        },
      ]}
    >
      {/* Enhanced Floating Card */}
      <Animated.View style={[styles.floatingCard, { backgroundColor: colors.card }]}>
        {/* Enhanced Background Gradient */}
        <LinearGradient
          colors={hasWorkoutData 
            ? ['rgba(16, 185, 129, 0.08)', 'rgba(59, 130, 246, 0.08)', 'rgba(168, 85, 247, 0.04)'] 
            : ['rgba(99, 102, 241, 0.08)', 'rgba(168, 85, 247, 0.08)', 'rgba(236, 72, 153, 0.04)']
          }
          style={styles.backgroundGradient}
        />

        {/* Social Proof Banner */}
        <Animated.View 
          style={[
            styles.socialProofBanner,
            { opacity: socialProofOpacity }
          ]}
        >
          {isViral && (
            <View style={styles.trendingBadge}>
              <Crown size={12} color="#FFD700" />
              <Text style={styles.trendingText}>VIRAL</Text>
            </View>
          )}
          {isTrending && !isViral && (
            <View style={styles.trendingBadge}>
              <TrendingUp size={12} color="#FF6B35" />
              <Text style={styles.trendingText}>TRENDING</Text>
            </View>
          )}

        </Animated.View>

        {/* Enhanced Floating Header */}
        <Animated.View 
          style={[
            styles.floatingHeader,
            { opacity: contentOpacity }
          ]}
        >
          <TouchableOpacity
            style={styles.profileSection}
            onPress={() => navigateToProfile(post.profiles.id ?? '', post.profiles.username)}
            activeOpacity={0.8}
          >
            <View style={styles.avatarContainer}>
              <Image
                source={{
                  uri: getAvatarUrl(post.profiles.avatar_url, post.profiles.username),
                }}
                style={styles.avatar}
              />
              {post.profiles.is_verified && (
                <View style={styles.verifiedBadge}>
                  <CheckCircle2 size={14} color="#fff" fill="#3B82F6" />
                </View>
              )}
              {hasWorkoutData && (
                <View style={styles.workoutBadge}>
                  <Dumbbell size={12} color="#fff" />
                </View>
              )}
            </View>
            <View style={styles.userInfo}>
              <Text style={[styles.username, { color: colors.text }]}>
                {post.profiles.username}
              </Text>
              <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
                {formatDate(post.created_at)}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowMenu(true)}
            style={[styles.menuButton, { backgroundColor: colors.backgroundSecondary }]}
            activeOpacity={0.8}
          >
            <MoreHorizontal size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </Animated.View>

        {/* Enhanced Interactive Media Section */}
        <TouchableOpacity
          style={styles.mediaContainer}
          onPress={handleDoubleTap}
          activeOpacity={0.95}
        >
          {post.media_type === 'video' ? (
            <View style={styles.videoContainer}>
              <Video
                ref={(ref: any) => {
                  videoRefs.current[post.id] = ref;
                }}
                source={{ uri: post.image_url }}
                style={styles.video}
                useNativeControls={false}
                isLooping
                shouldPlay={playingVideo === post.id}
                onPlaybackStatusUpdate={(status: any) => {
                  if (status.isLoaded && !status.isPlaying && playingVideo === post.id) {
                    toggleVideoPlayback(post.id);
                  }
                }}
              />
              {playingVideo !== post.id && (
                <View style={styles.videoOverlay}>
                  <TouchableOpacity
                    style={styles.playButton}
                    onPress={() => toggleVideoPlayback(post.id)}
                  >
                    <Play size={24} color="#fff" fill="#fff" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.imageContainer}>
              <TouchableOpacity
                onPress={handleImageTap}
                activeOpacity={0.95}
                style={styles.imageTouchable}
              >
                <Image
                  source={{ uri: post.image_url }}
                  style={styles.image}
                  resizeMode="cover"
                />
                {!post.image_url && (
                  <View style={[styles.imagePlaceholder, { backgroundColor: colors.backgroundSecondary }]}>
                    <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
                      No image available
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Enhanced Achievement Overlay for Workout Posts */}
          {hasWorkoutData && (
            <View style={styles.achievementOverlay}>
              <LinearGradient
                colors={['rgba(16, 185, 129, 0.9)', 'rgba(59, 130, 246, 0.9)']}
                style={styles.achievementGradient}
              >
                <View style={styles.achievementContent}>
                  <Trophy size={24} color="#fff" />
                  <Text style={styles.achievementText}>Workout Complete!</Text>
                  <View style={styles.achievementStats}>
                    {workoutStats && workoutStats.duration > 0 && (
                      <View style={styles.achievementStat}>
                        <Clock size={12} color="#fff" />
                        <Text style={styles.achievementStatText}>{workoutStats.duration}m</Text>
                      </View>
                    )}
                    {workoutStats && workoutStats.calories > 0 && (
                      <View style={styles.achievementStat}>
                        <Flame size={12} color="#fff" />
                        <Text style={styles.achievementStatText}>{workoutStats.calories} cal</Text>
                      </View>
                    )}
                    {workoutStats && workoutStats.totalVolume > 0 && (
                      <View style={styles.achievementStat}>
                        <Target size={12} color="#fff" />
                        <Text style={styles.achievementStatText}>{formatWeight(workoutStats.totalVolume, 'kg')}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </LinearGradient>
            </View>
          )}

          {/* Enhanced Double Tap Heart Animation */}
          <Animated.View
            style={[
              styles.doubleTapHeart,
              {
                opacity: doubleTapAnimation,
                transform: [
                  {
                    scale: doubleTapAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 1.2],
                    }),
                  },
                ],
              },
            ]}
          >
            <Heart size={80} color="#FF3B30" fill="#FF3B30" />
          </Animated.View>



          {/* Engagement Pulse Animation */}
          {showEngagementPulse && (
            <Animated.View
              style={[
                styles.engagementPulse,
                {
                  opacity: engagementPulse,
                  transform: [{ scale: engagementPulse }],
                },
              ]}
            >
              <View style={styles.pulseRing} />
            </Animated.View>
          )}
        </TouchableOpacity>

        {/* Enhanced Content Section */}
        <Animated.View 
          style={[
            styles.contentSection,
            { opacity: contentOpacity }
          ]}
        >
          {/* Enhanced Quick Stats Row */}
          <View style={styles.quickStatsRow}>
            {hasWorkoutData && workoutStats && (
              <View style={styles.statItem}>
                <Sparkles size={14} color="#10B981" />
                <Text style={[styles.statText, { color: '#10B981' }]}>
                  {workoutStats.difficulty}
                </Text>
              </View>
            )}
          </View>

          {/* Enhanced Caption with Progressive Disclosure */}
          {post.caption && (
            <TouchableOpacity
              style={styles.captionContainer}
              onPress={() => setIsExpanded(!isExpanded)}
              activeOpacity={0.8}
            >
              <Text style={[styles.captionText, { color: colors.text }]}>
                <Text style={[styles.captionAuthor, { color: colors.text }]}>
                  {post.profiles.username}
                </Text>
                {' '}
                {isExpanded ? post.caption : displayCaption}
                {shouldTruncateCaption && !isExpanded && (
                  <Text style={[styles.expandText, { color: colors.textSecondary }]}>
                    {' '}more
                  </Text>
                )}
              </Text>
              {shouldTruncateCaption && (
                <Animated.View style={[
                  styles.expandIcon,
                  { transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }
                ]}>
                  <ArrowDown size={16} color={colors.textSecondary} />
                </Animated.View>
              )}
            </TouchableOpacity>
          )}

          {/* Enhanced Product CTA */}
          {post.product_id && (
            <TouchableOpacity
              style={styles.productCTA}
              onPress={() => {
                if (!isAuthenticated) {
                  showAuthModal();
                  return;
                }
                router.push(`/marketplace/${post.product_id}`);
              }}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['rgba(99, 102, 241, 0.1)', 'rgba(168, 85, 247, 0.1)']}
                style={styles.productGradient}
              >
                <View style={styles.productContent}>
                  <TrendingUp size={20} color={colors.tint} />
                  <Text style={[styles.productText, { color: colors.tint }]}>
                    View Product
                  </Text>
                  <ArrowUp size={16} color={colors.tint} />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Enhanced Floating Action Buttons */}
        <Animated.View 
          style={[
            styles.floatingActions,
            { opacity: contentOpacity }
          ]}
        >
          <View style={styles.likeContainer}>
            <Animated.View style={{ transform: [{ scale: likeAnimation }] }}>
              <TouchableOpacity
                onPress={handleLikePress}
                style={[styles.actionButton, isLiked && styles.likedButton]}
                activeOpacity={0.7}
                disabled={isProcessingLike}
              >
                <Heart
                  size={28}
                  color={isLiked ? '#FF3B30' : colors.textSecondary}
                  fill={isLiked ? '#FF3B30' : 'none'}
                  strokeWidth={2}
                />
              </TouchableOpacity>
            </Animated.View>
            {post.likes.length > 0 && (
              <Text style={[styles.likeCount, { color: colors.text }]}>
                {post.likes.length}
              </Text>
            )}
          </View>

          <View style={styles.commentContainer}>
            <TouchableOpacity
              onPress={() => {
                if (!isAuthenticated) {
                  showAuthModal();
                  return;
                }
                haptics.tap();
                setShowComments(true);
              }}
              style={styles.actionButton}
              activeOpacity={0.7}
            >
              <MessageCircle size={28} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
            {localCommentsCount > 0 && (
              <Text style={[styles.commentCount, { color: colors.text }]}>
                {localCommentsCount}
              </Text>
            )}
          </View>

          <TouchableOpacity 
            style={styles.actionButton} 
            activeOpacity={0.7}
            onPress={() => setShowShareModal(true)}
          >
            <Share2 size={28} color={colors.textSecondary} strokeWidth={2} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton} 
            activeOpacity={0.7}
            onPress={handleSavePost}
            disabled={saving}
          >
            <Animated.View style={{ transform: [{ scale: saveAnimation }] }}>
              <Bookmark 
                size={28} 
                color={isSaved ? colors.tint : colors.textSecondary} 
                strokeWidth={2}
                fill={isSaved ? colors.tint : 'none'}
              />
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

      {/* Modals */}
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
              <TouchableOpacity style={styles.menuItem} onPress={() => {
                setShowMenu(false);
                setShowDeleteConfirm(true);
              }}>
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
        postTitle={post.caption || `Post by ${post.profiles?.username || 'Gymsta user'}`}
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
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 0,
    marginVertical: Spacing.md,
  },
  floatingCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    backgroundColor: '#fff',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  socialProofBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    zIndex: 3,
  },
  trendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  trendingText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  engagementStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  engagementText: {
    fontSize: 11,
    fontWeight: '500',
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
    width: Math.max(32, touchTargets.minWidth * 0.7),
    height: Math.max(32, touchTargets.minHeight * 0.7),
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    fontWeight: '500',
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
  achievementAnimation: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    zIndex: 15,
  },
  achievementAnimationGradient: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  achievementAnimationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  engagementPulse: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    zIndex: 12,
  },
  pulseRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: 'rgba(255, 59, 48, 0.3)',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  contentSection: {
    padding: Spacing.lg,
    zIndex: 2,
  },
  quickStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.md,
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
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
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
    marginTop: Spacing.sm,
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
    paddingBottom: Spacing.lg,
    zIndex: 2,
    gap: Spacing.lg,
  },
  actionGroup: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(0,0,0,0.05)',
    minHeight: touchTargets.minHeight,
    minWidth: touchTargets.minWidth,
    alignItems: 'center',
    justifyContent: 'center',
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
});

export default PostComponent; 