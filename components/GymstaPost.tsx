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

import { LinearGradient } from 'expo-linear-gradient';
import { VideoView } from 'expo-video';
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
import ZoomableMedia from './ZoomableMedia';
import WorkoutSwipeDisplay from './WorkoutSwipeDisplay';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Temporary alias for expo-video
const Video: any = VideoView;

interface GymstaPostProps {
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
  // Early return if post data is invalid or is a video (extra safety check)
  if (!post || !post.id || !post.image_url || !post.profiles || post.media_type === 'video') {
    console.log('🚫 [DEBUG] GymstaPost: Invalid post data or video post, skipping render:', { 
      hasPost: !!post, 
      hasId: !!post?.id, 
      hasImageUrl: !!post?.image_url, 
      hasProfiles: !!post?.profiles,
      mediaType: post?.media_type 
    });
    return null;
  }
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
  const [saveAnimation] = useState(new Animated.Value(1));

  const [revealAnimation] = useState(new Animated.Value(0));
  
  // State management
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [localCommentsCount, setLocalCommentsCount] = useState(post.comments_count || 0);
  const [isProcessingLike, setIsProcessingLike] = useState(false);
  const [zoomActive, setZoomActive] = useState(false);
  const [showAchievement, setShowAchievement] = useState(false);
  const [showEngagementPulse, setShowEngagementPulse] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showWorkoutStats, setShowWorkoutStats] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showImageZoom, setShowImageZoom] = useState(false);

  // Unit system
  const { formatWeight } = useUnits();
  
  // Gesture handling

  const lastTap = useRef(0);
  const likeActionRef = useRef(false);
  const lastLikeActionRef = useRef(0);
  const singleTapTimeout = useRef<number | null>(null);

  // Check if post has workout data
  const hasWorkoutData = (post as any).workout_id || (post as any).post_type === 'workout';

  // Load attached workout for real stats when available
  const [attachedWorkout, setAttachedWorkout] = useState<any | null>(null);
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const workoutId = (post as any).workout_id;
        if (!workoutId) return;
        const { data, error } = await supabase
          .from('workouts')
          .select('id,name,exercises,duration_minutes,total_volume,created_at')
          .eq('id', workoutId)
          .maybeSingle();
        if (!isMounted) return;
        if (!error && data) setAttachedWorkout(data);
      } catch {}
    })();
    return () => { isMounted = false; };
  }, [post?.id, (post as any).workout_id]);
  
  // Workout stats based on attached workout (fallback to heuristics)
  const workoutExercises: any[] = (attachedWorkout?.exercises as any[]) || [];
  const totalSets = workoutExercises.reduce((total: number, exercise: any) => total + ((exercise.sets || []).length || 0), 0);
  const totalReps = workoutExercises.reduce((total: number, exercise: any) => {
    const reps = (exercise.sets || []).reduce((s: number, st: any) => s + (Number(st.reps) || 0), 0);
    return total + reps;
  }, 0);
  const totalVolume = typeof attachedWorkout?.total_volume === 'number' && attachedWorkout.total_volume > 0
    ? attachedWorkout.total_volume
    : workoutExercises.reduce((sum: number, ex: any) => {
        const sets = Array.isArray(ex.sets) ? ex.sets : [];
        const exVol = sets.reduce((s: number, st: any) => s + ((Number(st.reps) || 0) * (Number(st.weight) || 0)), 0);
        return sum + exVol;
      }, 0);
  const estimatedDuration = attachedWorkout?.duration_minutes || Math.max(20, totalSets * 2 + workoutExercises.length * 3);
  const workoutStats = {
    duration: `${estimatedDuration} min`,
    calories: `${Math.max(200, Math.round(estimatedDuration * 5))} cal`,
    exercises: workoutExercises.length,
    difficulty: totalSets > 18 ? 'Hard' : totalSets > 10 ? 'Intermediate' : 'Light',
    type: 'Strength',
  };

  // Format date helper
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
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
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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

    const isLiked = currentUserId ? post.likes.some(like => like.user_id === currentUserId) : false;

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
  }, [isAuthenticated, showAuthModal, isProcessingLike, currentUserId, post.likes, post.id, handleLike, handleUnlike, likeAnimation]);

  // Handle double tap for like
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

      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

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

  const isLiked = currentUserId ? post.likes.some(like => like.user_id === currentUserId) : false;
  const shouldTruncateCaption = post.caption && post.caption.length > 100;
  const displayCaption = shouldTruncateCaption && !showFullCaption 
    ? post.caption!.substring(0, 100) + '...' 
    : post.caption;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { scale: cardScale },
            { rotate: cardRotation.interpolate({
              inputRange: [-1, 0, 1],
              outputRange: ['-1deg', '0deg', '1deg'],
            })},

          ],
          elevation: cardElevation,
          shadowOpacity: cardElevation.interpolate({
            inputRange: [0, 1],
            outputRange: [0.1, 0.3],
          }),
        },
      ]}
    >
      {/* Main Floating Card */}
      <Animated.View style={[styles.floatingCard, { backgroundColor: colors.card }]}>
          {/* Dynamic Background Gradient */}
          <LinearGradient
            colors={hasWorkoutData 
              ? ['rgba(16, 185, 129, 0.1)', 'rgba(59, 130, 246, 0.1)', 'rgba(168, 85, 247, 0.05)'] 
              : ['rgba(99, 102, 241, 0.1)', 'rgba(168, 85, 247, 0.1)', 'rgba(236, 72, 153, 0.05)']
            }
            style={styles.backgroundGradient}
          />

          {/* Floating Header */}
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

          {/* Interactive Media Section */}
          <TouchableOpacity
            style={styles.mediaContainer}
            onPress={handleDoubleTap}
            activeOpacity={0.95}
            disabled={zoomActive}
            delayPressIn={0}
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
                  shouldPlay={false}
                />
                <View style={styles.videoOverlay}>
                  <TouchableOpacity
                    style={styles.playButton}
                    onPress={() => toggleVideoPlayback(post.id)}
                  >
                    {playingVideo === post.id ? 
                      <Pause size={28} color="#fff" /> : 
                      <Play size={28} color="#fff" />
                    }
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.imageContainer}>
                <ZoomableMedia resetOnEnd onZoomActiveChange={setZoomActive}>
                  <TouchableOpacity
                    onPress={handleImageTap}
                    activeOpacity={0.95}
                    style={styles.imageTouchable}
                    delayPressIn={0}
                  >
                    <Image
                      source={{ uri: post.image_url }}
                      style={[styles.image, { opacity: imageLoaded ? 1 : 0 }]}
                      resizeMode="cover"
                      onLoad={() => setImageLoaded(true)}
                    />
                    {!imageLoaded && (
                      <View style={[styles.imagePlaceholder, { backgroundColor: colors.backgroundSecondary }]} />
                    )}
                  </TouchableOpacity>
                </ZoomableMedia>
                
                {/* Workout Achievement Overlay */}
                {hasWorkoutData && (
                  <TouchableOpacity
                    style={styles.achievementOverlay}
                    onPress={() => {
                      if (attachedWorkout) {
                        setShowWorkoutStats(true);
                      }
                    }}
                    activeOpacity={0.9}
                  >
                    <LinearGradient
                      colors={['rgba(16, 185, 129, 0.9)', 'rgba(59, 130, 246, 0.9)']}
                      style={styles.achievementGradient}
                    >
                      <View style={styles.achievementContent}>
                        <Trophy size={20} color="#fff" />
                        <Text style={styles.achievementText}>Workout Complete!</Text>
                        <View style={styles.achievementStats}>
                          <View style={styles.achievementStat}>
                            <Clock size={14} color="#fff" />
                            <Text style={styles.achievementStatText}>{workoutStats.duration}</Text>
                          </View>
                          <View style={styles.achievementStat}>
                            <Flame size={14} color="#fff" />
                            <Text style={styles.achievementStatText}>{workoutStats.calories}</Text>
                          </View>
                          <View style={styles.achievementStat}>
                            <Dumbbell size={14} color="#fff" />
                            <Text style={styles.achievementStatText}>{workoutStats.exercises} exercises</Text>
                          </View>
                        </View>
                        <Text style={[styles.achievementStatText, { marginTop: 4, opacity: 0.9 }]}>
                          Tap to view details →
                        </Text>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Double Tap Heart Animation */}
            <Animated.View
              style={[
                styles.doubleTapHeart,
                {
                  opacity: doubleTapAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1],
                  }),
                  transform: [{
                    scale: doubleTapAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 1.2],
                    }),
                  }],
                },
              ]}
              pointerEvents="none"
            >
              <Heart size={80} color="rgba(255, 255, 255, 0.9)" fill="rgba(255, 255, 255, 0.9)" />
            </Animated.View>

            {/* Swipe indicators removed per request */}
          </TouchableOpacity>

          {/* Progressive Content Reveal */}
          <Animated.View 
            style={[
              styles.contentSection,
              { opacity: contentOpacity }
            ]}
          >
                      {/* Quick Stats Row */}
          <View style={styles.quickStatsRow}>
            {hasWorkoutData && (
              <View style={styles.statItem}>
                <Sparkles size={14} color="#10B981" />
                <Text style={[styles.statText, { color: '#10B981' }]}>
                  {workoutStats.difficulty}
                </Text>
              </View>
            )}
          </View>

            {/* Caption with Progressive Disclosure */}
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

            {/* Product CTA with Enhanced Design */}
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

          {/* Floating Action Buttons */}
          <Animated.View 
            style={[
              styles.floatingActions,
              { opacity: contentOpacity },
              { marginTop: post.caption ? Spacing.xs : Spacing.sm },
              { marginBottom: post.caption ? Spacing.xs : Spacing.sm }
            ]}
          >
            <View style={styles.likeContainer}>
              <Animated.View style={{ transform: [{ scale: likeAnimation }] }}>
                <TouchableOpacity
                  onPress={performLikeAction}
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
                if (Platform.OS === 'ios') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
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
            <Bookmark 
              size={28} 
              color={isSaved ? colors.tint : colors.textSecondary} 
              strokeWidth={2}
              fill={isSaved ? colors.tint : 'none'}
            />
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

      {/* Workout Stats Modal - Swipeable Workout Details */}
      {hasWorkoutData && attachedWorkout && (
        <Modal
          visible={showWorkoutStats}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setShowWorkoutStats(false)}
        >
          <WorkoutSwipeDisplay
            workout={attachedWorkout}
            photoUrl={post.image_url}
            onClose={() => setShowWorkoutStats(false)}
          />
        </Modal>
      )}
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
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xs,
    marginTop: Spacing.xs,
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
});

export default GymstaPost; 