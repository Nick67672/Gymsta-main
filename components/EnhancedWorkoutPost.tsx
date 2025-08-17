import React, { useCallback, useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, Animated, Platform, Modal, ActivityIndicator, Pressable, Dimensions, ScrollView } from 'react-native';
import { Heart, MessageCircle, MoreHorizontal, CircleCheck as CheckCircle2, Trash2, X, Dumbbell, Clock, TrendingUp, ChevronLeft, Zap, Target, Trophy, Flame, Star } from 'lucide-react-native';
import { getExerciseIcon } from '@/lib/exerciseIcons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { BorderRadius, Spacing } from '@/constants/Spacing';
import { ConfirmModal } from './ConfirmModal';
import { ThemedButton } from './ThemedButton';
import { CommentSystem } from './CommentSystem';
import { getAvatarUrl } from '@/lib/avatarUtils';
import ImageZoomViewer from './ImageZoomViewer';
import { LinearGradient } from 'expo-linear-gradient';
import GestureRecognizer from 'react-native-swipe-gestures';

// Muscle group mapping for radar chart
const MUSCLE_GROUPS = {
  'chest': ['bench press', 'push up', 'chest press', 'dips', 'flyes'],
  'back': ['pull up', 'row', 'lat pulldown', 'deadlift', 'chin up'],
  'shoulders': ['shoulder press', 'lateral raise', 'front raise', 'shrugs'],
  'arms': ['bicep curl', 'tricep', 'hammer curl', 'dips'],
  'legs': ['squat', 'lunge', 'leg press', 'calf raise', 'leg curl'],
  'core': ['plank', 'crunch', 'russian twist', 'mountain climber', 'sit up']
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

const EnhancedWorkoutPost: React.FC<WorkoutPostProps> = ({
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
  const [activeVisualization, setActiveVisualization] = useState<'heatmap' | 'timeline' | 'radar' | 'achievements'>('heatmap');
  const [showImageZoom, setShowImageZoom] = useState(false);
  
  // Animation and gesture handling
  const { width: screenWidth } = Dimensions.get('window');
  const singleTapTimeout = useRef<number | null>(null);

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

  const estimatedDuration = Math.max(20, totalSets * 2 + workout.exercises.length * 3);
  
  // Calculate workout intensity (0-100)
  const workoutIntensity = Math.min(100, (totalVolume / workout.exercises.length) / 10);
  
  // Calculate muscle group distribution
  const getMuscleGroupDistribution = () => {
    const distribution: { [key: string]: number } = {};
    
    workout.exercises.forEach(exercise => {
      const exerciseName = exercise.name.toLowerCase();
      Object.entries(MUSCLE_GROUPS).forEach(([muscle, keywords]) => {
        if (keywords.some(keyword => exerciseName.includes(keyword))) {
          distribution[muscle] = (distribution[muscle] || 0) + (exercise.sets?.length || 1);
        }
      });
    });
    
    return distribution;
  };

  // Calculate achievements
  const getAchievements = () => {
    const achievements = [];
    
    if (workout.exercises.length >= 8) achievements.push({ icon: Trophy, text: 'Beast Mode', color: '#FFD700' });
    if (totalVolume > 5000) achievements.push({ icon: Flame, text: 'Heavy Lifter', color: '#FF4500' });
    if (estimatedDuration > 90) achievements.push({ icon: Clock, text: 'Endurance', color: '#32CD32' });
    if (workout.exercises.some((ex: any) => ex.isPR)) achievements.push({ icon: Star, text: 'New PR!', color: '#FF69B4' });
    
    return achievements;
  };

  const muscleDistribution = getMuscleGroupDistribution();
  const achievements = getAchievements();

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

  // Render Workout Intensity Heatmap
  const renderHeatmap = () => (
    <View style={styles.heatmapContainer}>
      <Text style={[styles.visualizationTitle, { color: colors.text }]}>Workout Intensity</Text>
      <View style={styles.heatmapGrid}>
        {workout.exercises.map((exercise, index) => {
          const exerciseVolume = exercise.sets?.reduce((sum: number, set: any) => sum + (set.reps * set.weight), 0) || 0;
          const intensity = Math.min(100, (exerciseVolume / 500) * 100);
          const heatColor = intensity > 70 ? '#FF4500' : intensity > 40 ? '#FFA500' : '#32CD32';
          
          return (
            <View key={index} style={[styles.heatmapCell, { backgroundColor: heatColor + '40' }]}>
              <Text style={[styles.heatmapText, { color: heatColor }]} numberOfLines={1}>
                {exercise.name.split(' ')[0]}
              </Text>
              <Text style={[styles.heatmapIntensity, { color: heatColor }]}>
                {Math.round(intensity)}%
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );

  // Render Exercise Timeline
  const renderTimeline = () => (
    <View style={styles.timelineContainer}>
      <Text style={[styles.visualizationTitle, { color: colors.text }]}>Exercise Journey</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timelineScroll}>
        <View style={styles.timelinePath}>
          {workout.exercises.map((exercise, index) => {
            const iconData = getExerciseIcon(exercise.name);
            const IconComponent = iconData.icon;
            const isLast = index === workout.exercises.length - 1;
            
            return (
              <View key={index} style={styles.timelineStep}>
                <View style={[styles.timelineNode, { backgroundColor: iconData.color }]}>
                  <IconComponent size={16} color="white" />
                </View>
                <Text style={[styles.timelineLabel, { color: colors.text }]} numberOfLines={1}>
                  {exercise.name}
                </Text>
                <Text style={[styles.timelineSets, { color: colors.textSecondary }]}>
                  {exercise.sets?.length || 0} sets
                </Text>
                {!isLast && <View style={[styles.timelineConnector, { backgroundColor: colors.border }]} />}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );

  // Render Muscle Group Radar
  const renderRadar = () => {
    const maxValue = Math.max(...Object.values(muscleDistribution), 1);
    
    return (
      <View style={styles.radarContainer}>
        <Text style={[styles.visualizationTitle, { color: colors.text }]}>Muscle Groups</Text>
        <View style={styles.radarChart}>
          {Object.entries(muscleDistribution).map(([muscle, value], index) => {
            const percentage = (value / maxValue) * 100;
            const barHeight = Math.max(20, (percentage / 100) * 80);
            
            return (
              <View key={muscle} style={styles.radarBar}>
                <View style={[styles.radarBarFill, { 
                  height: barHeight, 
                  backgroundColor: colors.tint + '80' 
                }]} />
                <Text style={[styles.radarLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                  {muscle}
                </Text>
                <Text style={[styles.radarValue, { color: colors.text }]}>
                  {value}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  // Render Achievements
  const renderAchievements = () => (
    <View style={styles.achievementsContainer}>
      <Text style={[styles.visualizationTitle, { color: colors.text }]}>Achievements</Text>
      <View style={styles.achievementsList}>
        {achievements.length > 0 ? achievements.map((achievement, index) => {
          const IconComponent = achievement.icon;
          return (
            <View key={index} style={[styles.achievementBadge, { backgroundColor: achievement.color + '20' }]}>
              <IconComponent size={20} color={achievement.color} />
              <Text style={[styles.achievementText, { color: achievement.color }]}>
                {achievement.text}
              </Text>
            </View>
          );
        }) : (
          <Text style={[styles.noAchievements, { color: colors.textSecondary }]}>
            Keep pushing for achievements! 💪
          </Text>
        )}
      </View>
      
      {/* Workout Stats Summary */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Zap size={16} color={colors.tint} />
          <Text style={[styles.statValue, { color: colors.text }]}>{Math.round(workoutIntensity)}%</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Intensity</Text>
        </View>
        <View style={styles.statCard}>
          <Target size={16} color={colors.tint} />
          <Text style={[styles.statValue, { color: colors.text }]}>{totalSets}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Sets</Text>
        </View>
        <View style={styles.statCard}>
          <TrendingUp size={16} color={colors.tint} />
          <Text style={[styles.statValue, { color: colors.text }]}>{Math.round(totalVolume/1000)}k</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Volume kg</Text>
        </View>
      </View>
    </View>
  );

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

  // Menu handlers
  const onReportPress = useCallback(async () => {
    setShowMenu(false);
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

  // Image tap handler for zoom
  const handleImageTap = () => {
    if (hasPhoto && photoUrl) {
      setShowImageZoom(true);
    }
  };

  return (
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
                uri: getAvatarUrl(workout.profiles.avatar_url, workout.profiles.username),
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
        {hasPhoto && photoUrl ? (
          <View style={styles.imageWrapper}>
            <TouchableOpacity
              onPress={handleImageTap}
              activeOpacity={0.95}
              style={styles.imageTouchable}
            >
              <Image 
                source={{ uri: photoUrl }} 
                style={[styles.postMedia, { aspectRatio: 1, opacity: imageLoaded ? 1 : 0 }]}
                resizeMode="cover"
                onLoad={() => setImageLoaded(true)}
              />
              {!imageLoaded && <View style={[styles.mediaPlaceholder, { backgroundColor: colors.backgroundSecondary }]} />}
            </TouchableOpacity>
            
            {/* Workout badge */}
            <View style={styles.workoutBadge}>
              <Dumbbell size={16} color="white" />
              <Text style={styles.workoutBadgeText}>{workout.exercises.length} exercises</Text>
            </View>
          </View>
        ) : (
          // Creative workout visualization when no photo
          <View style={[styles.visualizationContainer, { backgroundColor: colors.backgroundSecondary }]}>
            {/* Visualization Tabs */}
            <View style={styles.visualizationTabs}>
              {[
                { key: 'heatmap', icon: Flame, label: 'Heat' },
                { key: 'timeline', icon: Clock, label: 'Journey' },
                { key: 'radar', icon: Target, label: 'Muscles' },
                { key: 'achievements', icon: Trophy, label: 'Stats' }
              ].map(({ key, icon: Icon, label }) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.visualizationTab,
                    activeVisualization === key && { backgroundColor: colors.tint + '20' }
                  ]}
                  onPress={() => setActiveVisualization(key as any)}
                >
                  <Icon size={16} color={activeVisualization === key ? colors.tint : colors.textSecondary} />
                  <Text style={[
                    styles.visualizationTabText,
                    { color: activeVisualization === key ? colors.tint : colors.textSecondary }
                  ]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Visualization Content */}
            <View style={styles.visualizationContent}>
              {activeVisualization === 'heatmap' && renderHeatmap()}
              {activeVisualization === 'timeline' && renderTimeline()}
              {activeVisualization === 'radar' && renderRadar()}
              {activeVisualization === 'achievements' && renderAchievements()}
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
                size={24}
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
  
        {/* Comment Button */}
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
              size={24}
              color={colors.textSecondary}
              strokeWidth={1.5}
            />
          </TouchableOpacity>
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
      </View>

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

      {/* Image Zoom Viewer */}
      <ImageZoomViewer
        visible={showImageZoom}
        imageUri={photoUrl || ''}
        onClose={() => setShowImageZoom(false)}
        colors={colors}
      />
    </View>
  );
};

export default EnhancedWorkoutPost;

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
  imageTouchable: {
    width: '100%',
    height: '100%',
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

  // Creative Visualization Container
  visualizationContainer: {
    aspectRatio: 1,
    padding: Spacing.md,
  },
  visualizationTabs: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 12,
    padding: 4,
  },
  visualizationTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    gap: 4,
  },
  visualizationTabText: {
    fontSize: 11,
    fontWeight: '600',
  },
  visualizationContent: {
    flex: 1,
  },
  visualizationTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: Spacing.md,
    textAlign: 'center',
  },

  // Heatmap Styles
  heatmapContainer: {
    flex: 1,
  },
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  heatmapCell: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heatmapText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  heatmapIntensity: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },

  // Timeline Styles
  timelineContainer: {
    flex: 1,
  },
  timelineScroll: {
    flex: 1,
  },
  timelinePath: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  timelineStep: {
    alignItems: 'center',
    marginRight: Spacing.lg,
    position: 'relative',
  },
  timelineNode: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  timelineLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 60,
  },
  timelineSets: {
    fontSize: 10,
    marginTop: 2,
  },
  timelineConnector: {
    position: 'absolute',
    top: 16,
    left: 32,
    width: 20,
    height: 2,
  },

  // Radar Chart Styles
  radarContainer: {
    flex: 1,
  },
  radarChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 120,
    paddingHorizontal: Spacing.sm,
  },
  radarBar: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 2,
  },
  radarBarFill: {
    width: '80%',
    borderRadius: 4,
    marginBottom: 8,
  },
  radarLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  radarValue: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Achievements Styles
  achievementsContainer: {
    flex: 1,
  },
  achievementsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  achievementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  achievementText: {
    fontSize: 12,
    fontWeight: '600',
  },
  noAchievements: {
    textAlign: 'center',
    fontSize: 14,
    fontStyle: 'italic',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statCard: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  
  // Interaction Section
  interactionSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingLeft: Spacing.sm,
    paddingRight: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.xs,
  },
  interactionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
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
  
  // Modals
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