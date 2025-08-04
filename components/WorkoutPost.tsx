import React, { useCallback, useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, Animated, Platform, Modal, ActivityIndicator, Pressable, Dimensions, ScrollView } from 'react-native';
import { Heart, MessageCircle, MoreHorizontal, CircleCheck as CheckCircle2, Trash2, X, Dumbbell, Clock, TrendingUp, ChevronLeft } from 'lucide-react-native';
import { getExerciseIcon } from '@/lib/exerciseIcons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { BorderRadius, Spacing } from '@/constants/Spacing';
import { ConfirmModal } from './ConfirmModal';
import { ThemedButton } from './ThemedButton';
import { CommentSystem } from './CommentSystem';
import { LinearGradient } from 'expo-linear-gradient';
import GestureRecognizer from 'react-native-swipe-gestures';

// Define swipe directions manually since TypeScript definitions don't include them
const swipeDirections = {
  SWIPE_UP: "SWIPE_UP",
  SWIPE_DOWN: "SWIPE_DOWN",
  SWIPE_LEFT: "SWIPE_LEFT",
  SWIPE_RIGHT: "SWIPE_RIGHT"
};

interface WorkoutPostProps {
  workout: {
    id: string;
    user_id: string;
    exercises: any[];
    created_at: string;
    profiles: {
      id: string;
      username: string;
      avatar_url: string | null;
      is_verified?: boolean;
      gym?: string | null;
    };
    workout_sharing_information?: {
      title?: string | null;
      caption?: string | null;
      photo_url?: string | null;
      is_my_gym?: boolean;
    }[] | null;
    likes?: {
      id: string;
      user_id: string;
    }[];
    comments_count?: number;
  };
  colors: any;
  currentUserId: string | null;
  isAuthenticated: boolean;
  showAuthModal: () => void;
  navigateToProfile: (userId: string, username: string) => void;
  handleLike: (postId: string) => void;
  handleUnlike: (postId: string) => void;
  handleDeletePost: (postId: string) => void;
  onCommentCountChange?: (postId: string, count: number) => void;
}

const WorkoutPost: React.FC<WorkoutPostProps> = ({
  workout,
  colors,
  currentUserId,
  isAuthenticated,
  showAuthModal,
  navigateToProfile,
  handleLike,
  handleUnlike,
  handleDeletePost,
  onCommentCountChange,
}) => {
  // Extract sharing information
  const sharingInfo = workout.workout_sharing_information?.[0];
  const hasPhoto = !!sharingInfo?.photo_url;
  const title = sharingInfo?.title;
  const caption = sharingInfo?.caption;
  const photoUrl = sharingInfo?.photo_url;
  
  // State management
  const [showWorkoutView, setShowWorkoutView] = useState(false);
  const [likeAnimation] = useState(new Animated.Value(1));
  const [doubleTapAnimation] = useState(new Animated.Value(0));
  const [imageLoaded, setImageLoaded] = useState(false);
  const [lastTap, setLastTap] = useState<number>(0);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [isProcessingLike, setIsProcessingLike] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [localCommentsCount, setLocalCommentsCount] = useState(workout.comments_count || 0);
  
  // Animation and gesture handling
  const { width: screenWidth } = Dimensions.get('window');
  const singleTapTimeout = useRef<number | null>(null);

  // Swipe gesture configuration
  const swipeConfig = {
    velocityThreshold: 0.3,        // Lower threshold for more sensitivity
    directionalOffsetThreshold: 100, // Higher threshold to allow more vertical movement
    gestureIsClickThreshold: 15     // Lower threshold for easier swipe detection
  };

  // Swipe gesture handlers
  const onSwipeLeft = useCallback((gestureState: any) => {
    console.log('🔍 [DEBUG] onSwipeLeft called with gestureState:', gestureState);
    if (hasPhoto && !showWorkoutView) {
      console.log('🔍 [DEBUG] Swipe left detected for workout:', workout.id);
      setShowWorkoutView(true);
      
      // Optional: Add haptic feedback
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }
  }, [hasPhoto, showWorkoutView, workout.id]);

  const onSwipeRight = useCallback((gestureState: any) => {
    console.log('🔍 [DEBUG] onSwipeRight called with gestureState:', gestureState);
    if (showWorkoutView) {
      console.log('🔍 [DEBUG] Swipe right detected for workout:', workout.id);
      setShowWorkoutView(false);
      
      // Optional: Add haptic feedback
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }
  }, [showWorkoutView, workout.id]);

  const onSwipe = useCallback((gestureName: string, gestureState: any) => {
    console.log('🔍 [DEBUG] onSwipe called with gestureName:', gestureName, 'gestureState:', gestureState);
    const { SWIPE_LEFT, SWIPE_RIGHT, SWIPE_UP, SWIPE_DOWN } = swipeDirections;
    
    if (gestureName === SWIPE_LEFT) {
      onSwipeLeft(gestureState);
    } else if (gestureName === SWIPE_RIGHT) {
      onSwipeRight(gestureState);
    } else {
      console.log('🔍 [DEBUG] Other swipe detected:', gestureName);
    }
  }, [onSwipeLeft, onSwipeRight]);

  // Calculate workout stats
  const totalSets = workout.exercises.reduce((total, exercise) => {
    return total + (exercise.sets?.length || 0);
  }, 0);
  
  const totalVolume = workout.exercises.reduce((total, exercise) => {
    const exerciseVolume = exercise.sets?.reduce((setTotal: number, set: any) => {
      return setTotal + (set.reps * set.weight);
    }, 0) || 0;
    return total + exerciseVolume;
  }, 0);

  const formatVolume = (volume: number) => {
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}k kg`;
    }
    return `${volume} kg`;
  };

  const estimatedDuration = Math.max(20, totalSets * 2 + workout.exercises.length * 3);

  // Like functionality
  const isLiked = currentUserId ? workout.likes?.some(like => like.user_id === currentUserId) : false;

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

  // Handle comment count updates
  const handleCommentCountUpdate = useCallback((count: number) => {
    setLocalCommentsCount(count);
    if (onCommentCountChange) {
      onCommentCountChange(workout.id, count);
    }
  }, [workout.id, onCommentCountChange]);

  // Update local comment count when workout.comments_count changes
  useEffect(() => {
    setLocalCommentsCount(workout.comments_count || 0);
  }, [workout.comments_count]);

  // Centralized like handler
  const performLikeAction = useCallback(async () => {
    if (!isAuthenticated) {
      showAuthModal();
      return;
    }

    if (isProcessingLike) return;
    setIsProcessingLike(true);

    try {
      if (isLiked) {
        await handleUnlike(workout.id);
      } else {
        await handleLike(workout.id);
      }
    } catch (error) {
      console.error('Error in like action:', error);
    } finally {
      setIsProcessingLike(false);
    }
  }, [isAuthenticated, isLiked, workout.id, isProcessingLike, handleLike, handleUnlike, showAuthModal]);

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

  // Handle post tap for fullscreen/double tap like
  const handlePostTap = useCallback(() => {
    if (showWorkoutView) return; // Don't handle taps in workout view
    
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;

    if (singleTapTimeout.current) {
      clearTimeout(singleTapTimeout.current);
      singleTapTimeout.current = null;
    }

    if (lastTap && (now - lastTap) < DOUBLE_PRESS_DELAY) {
      setLastTap(0);
      
      // Like the post (if not already liked)
      if (!isLiked) {
        handleLike(workout.id);
      }
      
      // Trigger the heart animation
      doubleTapAnimation.setValue(1);
      Animated.sequence([
        Animated.spring(doubleTapAnimation, { toValue: 2, friction: 3, useNativeDriver: true }),
        Animated.timing(doubleTapAnimation, { toValue: 0, duration: 200, useNativeDriver: true, delay: 200 }),
      ]).start();
      
    } else {
      setLastTap(now);
      
      singleTapTimeout.current = setTimeout(() => {
        setShowFullscreen(true);
      }, DOUBLE_PRESS_DELAY);
    }
  }, [lastTap, isLiked, workout.id, handleLike, doubleTapAnimation, showWorkoutView]);

  // Menu handlers
  const onReportPress = useCallback(async () => {
    setShowMenu(false);
    // Report functionality would go here
    Alert.alert('Report Workout', 'Thank you for reporting this workout. We will review it shortly.');
  }, []);

  const showDeleteConfirmation = () => {
    setShowMenu(false);
    setShowDeleteConfirm(true);
  };

  const onConfirmDelete = () => {
    setShowDeleteConfirm(false);
    handleDeletePost(workout.id);
  };

  // Format likes count
  const formatLikesCount = (count: number) => {
    if (count === 0) return '';
    if (count < 1000) return `${count}`;
    if (count < 1000000) return `${(count / 1000).toFixed(1)}k`;
    return `${(count / 1000000).toFixed(1)}M`;
  };

  return (
    <GestureRecognizer
      onSwipe={onSwipe}
      onSwipeLeft={onSwipeLeft}
      onSwipeRight={onSwipeRight}
      config={swipeConfig}
      style={styles.mediaWrapper}
    >
      <View style={styles.postContainer}>
        {/* Floating Header */}
        <View style={styles.headerContainer}>
          <TouchableOpacity
            style={styles.profileSection}
            onPress={() => navigateToProfile(workout.profiles.id ?? '', workout.profiles.username)}
            activeOpacity={0.8}
          >
            <View style={styles.avatarWrapper}>
              <Image
                source={{
                  uri:
                    workout.profiles.avatar_url ||
                    `https://source.unsplash.com/random/50x50/?portrait&${workout.profiles.id}`,
                }}
                style={styles.profileAvatar}
              />
              {workout.profiles.is_verified && (
                <View style={styles.verifiedBadge}>
                  <CheckCircle2 size={12} color="#fff" fill="#3B82F6" />
                </View>
              )}
            </View>
            <View style={styles.userDetails}>
              <Text style={[styles.displayName, { color: colors.text }]}>
                {workout.profiles.username}
              </Text>
              <Text style={[styles.postTime, { color: colors.textSecondary }]}>
                {formatDate(workout.created_at)}
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

        {/* Media Section */}
        <View style={styles.mediaWrapper}>
          {!showWorkoutView ? (
            // Progress Photo View
            hasPhoto && photoUrl ? (
              <View style={styles.imageWrapper}>
                <Image 
                  source={{ uri: photoUrl }} 
                  style={[styles.postMedia, { aspectRatio: 1, opacity: imageLoaded ? 1 : 0 }]}
                  resizeMode="cover"
                  onLoad={() => setImageLoaded(true)}
                />
                {!imageLoaded && <View style={[styles.mediaPlaceholder, { backgroundColor: colors.backgroundSecondary }]} />}
                

                
                {/* Workout badge */}
                <TouchableOpacity 
                  style={styles.workoutBadge}
                  onPress={() => {
                    console.log('🔍 [DEBUG] Workout badge pressed for workout:', workout.id);
                    setShowWorkoutView(true);
                  }}
                  activeOpacity={0.5}
                  hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                >
                  <Dumbbell size={16} color="white" />
                  <Text style={styles.workoutBadgeText}>{workout.exercises.length} exercises</Text>
                </TouchableOpacity>
                
                {/* Double tap heart effect */}
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

                {/* Carousel dots */}
                <View style={styles.carouselDots}>
                  <View style={[
                    styles.carouselDot, 
                    { backgroundColor: showWorkoutView ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.8)' }
                  ]} />
                  <View style={[
                    styles.carouselDot, 
                    { backgroundColor: showWorkoutView ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.3)' }
                  ]} />
                </View>
              </View>
            ) : (
              // Fallback to workout stats if no photo
              <View style={[styles.workoutStatsContainer, { backgroundColor: colors.backgroundSecondary }]}>
                <View style={styles.workoutStats}>
                  <View style={styles.statItem}>
                    <LinearGradient
                      colors={[colors.tint + '20', colors.tint + '30']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.statIcon}
                    >
                      <Dumbbell size={16} color={colors.tint} />
                    </LinearGradient>
                    <View>
                      <Text style={[styles.statValue, { color: colors.text }]}>
                        {workout.exercises.length}
                      </Text>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                        exercises
                      </Text>
                    </View>
                  </View>

                  <View style={styles.statItem}>
                    <LinearGradient
                      colors={[colors.tint + '20', colors.tint + '30']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.statIcon}
                    >
                      <Clock size={16} color={colors.tint} />
                    </LinearGradient>
                    <View>
                      <Text style={[styles.statValue, { color: colors.text }]}>
                        {estimatedDuration}m
                      </Text>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                        duration
                      </Text>
                    </View>
                  </View>

                  {totalVolume > 0 && (
                    <View style={styles.statItem}>
                      <LinearGradient
                        colors={[colors.tint + '20', colors.tint + '30']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.statIcon}
                      >
                        <TrendingUp size={16} color={colors.tint} />
                      </LinearGradient>
                      <View>
                        <Text style={[styles.statValue, { color: colors.text }]}>
                          {formatVolume(totalVolume)}
                        </Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                          volume
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            )
          ) : (
            // Enhanced Workout Details View
            <View style={styles.workoutDetailsContainer}>
              <View style={[styles.workoutHeader, { backgroundColor: colors.card }]}>
                <View style={styles.workoutHeaderContent}>
                  <Text style={[styles.workoutHeaderTitle, { color: colors.text }]}>
                    Workout Details
                  </Text>
                  <Text style={[styles.workoutHeaderSubtitle, { color: colors.textSecondary }]}>
                    {workout.exercises.length} exercise{workout.exercises.length !== 1 ? 's' : ''} • 
                    {workout.exercises.reduce((total, ex) => total + (ex.sets?.length || 0), 0)} sets
                  </Text>
                </View>
                
                {/* Compact Workout Summary */}
                <View style={styles.compactSummary}>
                  {(() => {
                    const totalVolume = workout.exercises.reduce((total, ex) => 
                      total + (ex.sets?.reduce((sum: number, set: any) => sum + (set.reps * set.weight), 0) || 0), 0);
                    const maxWeight = workout.exercises.reduce((max, ex) => 
                      Math.max(max, ex.sets?.reduce((setMax: number, set: any) => Math.max(setMax, set.weight), 0) || 0), 0);
                    // Estimate workout duration based on sets (assuming 2-3 minutes per set)
                    const totalSets = workout.exercises.reduce((total, ex) => total + (ex.sets?.length || 0), 0);
                    const estimatedMinutes = Math.round(totalSets * 2.5);
                    
                    return (
                      <>
                        <View style={styles.compactSummaryItem}>
                          <Text style={[styles.compactSummaryValue, { color: colors.text }]}>
                            {totalVolume.toFixed(0)}kg
                          </Text>
                          <Text style={[styles.compactSummaryLabel, { color: colors.textSecondary }]}>
                            Volume
                          </Text>
                        </View>
                        <View style={styles.compactSummaryItem}>
                          <Text style={[styles.compactSummaryValue, { color: colors.text }]}>
                            {maxWeight}kg
                          </Text>
                          <Text style={[styles.compactSummaryLabel, { color: colors.textSecondary }]}>
                            Max
                          </Text>
                        </View>
                        <View style={styles.compactSummaryItem}>
                          <Text style={[styles.compactSummaryValue, { color: colors.text }]}>
                            {workout.duration_minutes || estimatedMinutes}min
                          </Text>
                          <Text style={[styles.compactSummaryLabel, { color: colors.textSecondary }]}>
                            Duration
                          </Text>
                        </View>
                      </>
                    );
                  })()}
                </View>
              </View>
              
              <ScrollView style={styles.exercisesList} showsVerticalScrollIndicator={false}>
                {workout.exercises.map((exercise, index) => {
                  const totalVolume = exercise.sets?.reduce((sum: number, set: any) => 
                    sum + (set.reps * set.weight), 0) || 0;
                  const maxWeight = exercise.sets?.reduce((max: number, set: any) => 
                    Math.max(max, set.weight), 0) || 0;
                  const iconData = getExerciseIcon(exercise.name);
                  const IconComponent = iconData.icon;
                  
                  return (
                    <View key={index} style={[styles.exerciseCard, { backgroundColor: colors.card }]}>
                      <View style={styles.exerciseCardHeader}>
                        <View style={styles.exerciseNameWithIcon}>
                          <View style={[styles.exerciseIconContainer, { backgroundColor: iconData.color + '15' }]}>
                            <IconComponent size={16} color={iconData.color} />
                          </View>
                          <View style={styles.exerciseInfo}>
                            <Text style={[styles.exerciseName, { color: colors.text }]}>
                              {exercise.name}
                            </Text>
                            <Text style={[styles.exerciseStatText, { color: colors.textSecondary }]}>
                              {exercise.sets?.length || 0} sets • {totalVolume.toFixed(0)}kg volume
                            </Text>
                          </View>
                        </View>
                        {exercise.isPR && (
                          <View style={[styles.prBadge, { backgroundColor: colors.tint + '20' }]}>
                            <Text style={[styles.prText, { color: colors.tint }]}>PR</Text>
                          </View>
                        )}
                      </View>

                      {exercise.sets && exercise.sets.length > 0 && (
                        <View style={styles.setsTable}>
                          <View style={styles.setsTableHeader}>
                            <Text style={[styles.setsTableHeaderText, { color: colors.textSecondary }]}>Set</Text>
                            <Text style={[styles.setsTableHeaderText, { color: colors.textSecondary }]}>Reps</Text>
                            <Text style={[styles.setsTableHeaderText, { color: colors.textSecondary }]}>Weight</Text>
                            <Text style={[styles.setsTableHeaderText, { color: colors.textSecondary }]}>Volume</Text>
                          </View>
                          {exercise.sets.map((set: any, setIndex: number) => (
                            <View key={setIndex} style={[styles.setsTableRow, 
                              set.weight === maxWeight && maxWeight > 0 ? 
                                { backgroundColor: colors.tint + '10' } : {}
                            ]}>
                              <Text style={[styles.setsTableText, { color: colors.text }]}>
                                {setIndex + 1}
                              </Text>
                              <Text style={[styles.setsTableText, { color: colors.text }]}>
                                {set.reps}
                              </Text>
                              <Text style={[styles.setsTableText, { color: colors.text }]}>
                                {set.weight}kg
                              </Text>
                              <Text style={[styles.setsTableText, { color: colors.textSecondary }]}>
                                {(set.reps * set.weight).toFixed(0)}kg
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </ScrollView>

              {/* Carousel dots for workout view */}
              <View style={styles.carouselDots}>
                <View style={[
                  styles.carouselDot, 
                  { backgroundColor: showWorkoutView ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.8)' }
                ]} />
                <View style={[
                  styles.carouselDot, 
                  { backgroundColor: showWorkoutView ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.3)' }
                ]} />
              </View>
            </View>
          )}
        </View>

        {/* Interaction Section */}
        <View style={styles.interactionSection}>
          {/* Like Button & Count */}
          <View style={styles.interactionGroup}>
            <Animated.View style={{ transform: [{ scale: likeAnimation }] }}>
              <TouchableOpacity
                onPress={handleLikePress}
                style={styles.interactionButton}
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
            {workout.likes && workout.likes.length > 0 && (
              <Text style={[styles.countText, { color: colors.text }]}>
                {formatLikesCount(workout.likes.length)}
              </Text>
            )}
          </View>
    
          {/* Comment Button & Count */}
          <View style={styles.interactionGroup}>
            <TouchableOpacity
              onPress={() => {
                if (!isAuthenticated) {
                  showAuthModal();
                  return;
                }
                setShowComments(true);
              }}
              style={styles.interactionButton}
              activeOpacity={0.7}
            >
              <MessageCircle
                size={28}
                color={colors.textSecondary}
                strokeWidth={1.5}
              />
            </TouchableOpacity>
            {localCommentsCount > 0 && (
              <Text style={[styles.countText, { color: colors.text }]}>
                {localCommentsCount}
              </Text>
            )}
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.contentSection}>
          {title && (
            <Text style={[styles.workoutTitle, { color: colors.text }]}>
              <Text style={[styles.captionAuthor, { color: colors.text }]}>
                {workout.profiles.username}
              </Text>
              {' '}
              {title}
            </Text>
          )}
          {caption && (
            <Text style={[styles.captionText, { color: colors.text }]}>
              {caption}
            </Text>
          )}
          
          {/* Enhanced Exercise preview */}
          {workout.exercises.length > 0 && (
            <View style={styles.exercisePreviewContainer}>
              <View style={styles.exercisePreviewHeader}>
                <Dumbbell size={16} color={colors.tint} />
                <Text style={[styles.exercisePreviewTitle, { color: colors.tint }]}>
                  {workout.exercises.length} Exercise{workout.exercises.length !== 1 ? 's' : ''}
                </Text>
              </View>
              <View style={styles.exerciseChips}>
                {workout.exercises.slice(0, 3).map((exercise, index) => {
                  const iconData = getExerciseIcon(exercise.name);
                  const IconComponent = iconData.icon;
                  
                  return (
                    <View key={index} style={[styles.exerciseChip, { backgroundColor: iconData.color + '15' }]}>
                      <IconComponent size={14} color={iconData.color} />
                      <Text style={[styles.exerciseChipText, { color: iconData.color }]} numberOfLines={1}>
                        {exercise.name}
                      </Text>
                      {exercise.sets && exercise.sets.length > 0 && (
                        <Text style={[styles.exerciseChipSets, { color: colors.textSecondary }]}>
                          {exercise.sets.length} sets
                        </Text>
                      )}
                    </View>
                  );
                })}
                {workout.exercises.length > 3 && (
                  <View style={[styles.exerciseChip, styles.moreExercisesChip, { backgroundColor: colors.backgroundSecondary }]}>
                    <Text style={[styles.moreExercisesText, { color: colors.textSecondary }]}>
                      +{workout.exercises.length - 3} more
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Fullscreen Modal */}
        <Modal
          visible={showFullscreen}
          transparent={false}
          onRequestClose={() => setShowFullscreen(false)}
          animationType="fade"
        >
          <View style={styles.fullscreenContainer}>
            {hasPhoto && photoUrl && (
              <Image
                source={{ uri: photoUrl }}
                style={styles.fullscreenImage}
                resizeMode="contain"
              />
            )}
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowFullscreen(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </Modal>

        {/* Menu Modal */}
        <Modal
          transparent={true}
          visible={showMenu}
          onRequestClose={() => setShowMenu(false)}
          animationType="slide"
        >
          <Pressable style={styles.bottomSheetOverlay} onPress={() => setShowMenu(false)}>
            <View style={[styles.bottomSheetContainer, { backgroundColor: colors.card }]}>
              <View style={styles.handle} />
              {currentUserId === workout.user_id ? (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={showDeleteConfirmation}
                >
                  <Trash2 size={22} color={colors.error} />
                  <Text style={[styles.menuItemText, { color: colors.error }]}>Delete Workout</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.menuItem} onPress={onReportPress}>
                  <CheckCircle2 size={22} color={colors.error} />
                  <Text style={[styles.menuItemText, { color: colors.error }]}>Report Workout</Text>
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
          title="Delete Workout"
          message="Are you sure you want to delete this workout? This action cannot be undone."
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={onConfirmDelete}
          confirmButtonTitle="Delete"
          isDestructive={true}
        />
        
        {/* Comments Modal */}
        <CommentSystem 
          postId={workout.id}
          visible={showComments}
          onClose={() => setShowComments(false)}
          postOwnerId={workout.user_id}
          onCommentCountChange={handleCommentCountUpdate}
        />
      </View>
    </GestureRecognizer>
  );
};

export default WorkoutPost;

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
    aspectRatio: 1,
  },

  workoutBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  workoutBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
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
  
  // Workout Stats Container (fallback when no photo)
  workoutStatsContainer: {
    padding: Spacing.lg,
    aspectRatio: 1,
    justifyContent: 'center',
  },
  workoutStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    gap: 8,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  
  // Workout Details View
  workoutDetailsContainer: {
    aspectRatio: 1,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  // Enhanced Workout Details Styles
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  workoutHeaderContent: {
    flex: 1,
  },
  workoutHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  workoutHeaderSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  compactSummary: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  compactSummaryItem: {
    alignItems: 'center',
    minWidth: 50,
  },
  compactSummaryValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  compactSummaryLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  exercisesList: {
    flex: 1,
    padding: Spacing.lg,
  },
  exerciseCard: {
    borderRadius: 12,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  exerciseCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  exerciseNameWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.sm,
  },
  exerciseIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  prBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: Spacing.sm,
  },
  prText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  exerciseStatText: {
    fontSize: 12,
    fontWeight: '500',
  },
  setsTable: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  setsTableHeader: {
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  setsTableHeaderText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  setsTableRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  setsTableText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  
  // Interaction Section
  interactionSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.lg,
  },
  interactionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  interactionButton: {
    padding: Spacing.sm,
  },
  countText: {
    fontSize: 15,
    fontWeight: '600',
  },
  
  // Content Section
  contentSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  workoutTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  captionText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400',
    marginBottom: 6,
  },
  captionAuthor: {
    fontWeight: '600',
  },
  // Enhanced Exercise Preview Styles
  exercisePreviewContainer: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  exercisePreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  exercisePreviewTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  exerciseChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  exerciseChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    maxWidth: '48%', // Ensure chips don't get too wide
  },
  exerciseChipText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  exerciseChipSets: {
    fontSize: 11,
    fontWeight: '400',
  },
  moreExercisesChip: {
    justifyContent: 'center',
  },
  moreExercisesText: {
    fontSize: 12,
    fontWeight: '500',
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
  carouselDots: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  carouselDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
}); 