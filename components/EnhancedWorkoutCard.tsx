import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import {
  Clock,
  Dumbbell,
  TrendingUp,
  Target,
  Zap,
  Award,
  Users,
  Download,
  Flame,
} from 'lucide-react-native';
import { ActivityRings } from './ActivityRings';

const { width: screenWidth } = Dimensions.get('window');

interface WorkoutStats {
  duration: number; // minutes
  totalVolume: number; // kg
  totalSets: number;
  caloriesBurned?: number;
  muscleGroups: string[];
  intensity: 'low' | 'medium' | 'high' | 'extreme';
  prsAchieved: number;
}

interface EnhancedWorkoutCardProps {
  workout: {
    id: string;
    name: string;
    date: string;
    exercises: any[];
    user: {
      id: string;
      username: string;
      avatar_url?: string;
    };
    stats: WorkoutStats;
    isLiked?: boolean;
    likesCount?: number;
    sharingInfo?: {
      title?: string;
      caption?: string;
      photo_url?: string;
    };
  };
  onLike?: () => void;
  onTryWorkout?: () => void;
  onUserPress?: () => void;
  previousWorkoutStats?: WorkoutStats;
}

export const EnhancedWorkoutCard: React.FC<EnhancedWorkoutCardProps> = ({
  workout,
  onLike,
  onTryWorkout,
  onUserPress,
  previousWorkoutStats,
}) => {
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  const [showMuscleGroups, setShowMuscleGroups] = useState(false);
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const confettiAnimation = useRef(new Animated.Value(0)).current;

  // Calculate improvement vs previous workout
  const improvement = previousWorkoutStats ? {
    volume: ((workout.stats.totalVolume - previousWorkoutStats.totalVolume) / previousWorkoutStats.totalVolume) * 100,
    duration: workout.stats.duration - previousWorkoutStats.duration,
  } : null;

  // Get intensity color
  const getIntensityColor = (intensity: string) => {
    switch (intensity) {
      case 'low': return colors.intensityLow;
      case 'medium': return colors.intensityMedium;
      case 'high': return colors.intensityHigh;
      case 'extreme': return colors.intensityExtreme;
      default: return colors.tint;
    }
  };

  // Get muscle group color
  const getMuscleGroupColor = (muscleGroup: string) => {
    switch (muscleGroup.toLowerCase()) {
      case 'chest': return colors.chest;
      case 'back': return colors.back;
      case 'shoulders': return colors.shoulders;
      case 'arms': return colors.arms;
      case 'legs': return colors.legs;
      case 'core': return colors.core;
      case 'cardio': return colors.cardio;
      default: return colors.tint;
    }
  };

  // Format volume
  const formatVolume = (volume: number) => {
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}k kg`;
    }
    return `${volume} kg`;
  };

  // Calculate activity ring progress
  const activityProgress = {
    move: Math.min(workout.stats.totalVolume / 5000, 1), // 5000kg goal
    exercise: Math.min(workout.stats.duration / 60, 1), // 60min goal
    stand: Math.min(workout.stats.totalSets / 20, 1), // 20 sets goal
  };

  // PR celebration effect
  useEffect(() => {
    if (workout.stats.prsAchieved > 0) {
      Animated.sequence([
        Animated.timing(confettiAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(confettiAnimation, {
          toValue: 0,
          duration: 500,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [workout.stats.prsAchieved]);

  // Pulse animation for high intensity workouts
  useEffect(() => {
    if (workout.stats.intensity === 'extreme') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.02,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false,
          }),
        ])
      );
      pulse.start();
      
      return () => pulse.stop();
    }
  }, [workout.stats.intensity]);

  const handlePress = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    Animated.sequence([
      Animated.timing(scaleAnimation, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: false,
      }),
      Animated.spring(scaleAnimation, {
        toValue: 1,
        friction: 6,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handleTryWorkout = () => {
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    onTryWorkout?.();
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale: scaleAnimation }, { scale: pulseAnimation }],
        },
      ]}
    >
      <TouchableOpacity activeOpacity={0.9} onPress={handlePress}>
        <BlurView intensity={20} tint={theme} style={styles.card}>
          <LinearGradient
            colors={[
              `${getIntensityColor(workout.stats.intensity)}15`,
              `${getIntensityColor(workout.stats.intensity)}05`,
            ]}
            style={styles.gradientOverlay}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onUserPress} style={styles.userInfo}>
                <View style={styles.avatar}>
                  <Text style={[styles.avatarText, { color: colors.text }]}>
                    {workout.user.username.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={[styles.username, { color: colors.text }]}>
                    {workout.user.username}
                  </Text>
                  <Text style={[styles.date, { color: colors.textSecondary }]}>
                    {new Date(workout.date).toLocaleDateString()}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Intensity Indicator */}
              <View style={[
                styles.intensityBadge,
                { backgroundColor: getIntensityColor(workout.stats.intensity) }
              ]}>
                <Flame size={12} color="#fff" />
                <Text style={styles.intensityText}>
                  {workout.stats.intensity.toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Workout Title */}
            <Text style={[styles.workoutTitle, { color: colors.text }]}>
              {workout.sharingInfo?.title || workout.name}
            </Text>

            {/* Activity Rings */}
            <View style={styles.activitySection}>
              <ActivityRings
                moveProgress={activityProgress.move}
                exerciseProgress={activityProgress.exercise}
                standProgress={activityProgress.stand}
                animated={true}
              />
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Clock size={16} color={colors.textSecondary} />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {workout.stats.duration}m
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Duration
                </Text>
                {improvement?.duration && (
                  <Text style={[
                    styles.improvement,
                    { color: improvement.duration > 0 ? colors.error : colors.success }
                  ]}>
                    {improvement.duration > 0 ? '+' : ''}{improvement.duration}m
                  </Text>
                )}
              </View>

              <View style={styles.statItem}>
                <Dumbbell size={16} color={colors.textSecondary} />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {formatVolume(workout.stats.totalVolume)}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Volume
                </Text>
                {improvement?.volume && (
                  <Text style={[
                    styles.improvement,
                    { color: improvement.volume > 0 ? colors.success : colors.error }
                  ]}>
                    {improvement.volume > 0 ? '+' : ''}{improvement.volume.toFixed(1)}%
                  </Text>
                )}
              </View>

              <View style={styles.statItem}>
                <Target size={16} color={colors.textSecondary} />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {workout.stats.totalSets}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Sets
                </Text>
              </View>

              {workout.stats.caloriesBurned && (
                <View style={styles.statItem}>
                  <Zap size={16} color={colors.textSecondary} />
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {workout.stats.caloriesBurned}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    Calories
                  </Text>
                </View>
              )}
            </View>

            {/* PR Achievement */}
            {workout.stats.prsAchieved > 0 && (
              <Animated.View style={[
                styles.prSection,
                {
                  opacity: confettiAnimation,
                  transform: [{
                    scale: confettiAnimation.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.8, 1.1, 1],
                    })
                  }]
                }
              ]}>
                <Award size={20} color={colors.neonGreen} />
                <Text style={[styles.prText, { color: colors.neonGreen }]}>
                  🎉 {workout.stats.prsAchieved} New PR{workout.stats.prsAchieved > 1 ? 's' : ''}!
                </Text>
              </Animated.View>
            )}

            {/* Muscle Groups */}
            <TouchableOpacity
              style={styles.muscleSection}
              onPress={() => setShowMuscleGroups(!showMuscleGroups)}
            >
              <Text style={[styles.muscleSectionTitle, { color: colors.text }]}>
                Muscle Groups ({workout.stats.muscleGroups.length})
              </Text>
              <View style={styles.muscleGroups}>
                {workout.stats.muscleGroups.slice(0, showMuscleGroups ? undefined : 3).map((muscle, index) => (
                  <View
                    key={muscle}
                    style={[
                      styles.muscleTag,
                      { backgroundColor: getMuscleGroupColor(muscle) }
                    ]}
                  >
                    <Text style={styles.muscleTagText}>{muscle}</Text>
                  </View>
                ))}
                {!showMuscleGroups && workout.stats.muscleGroups.length > 3 && (
                  <Text style={[styles.moreText, { color: colors.textSecondary }]}>
                    +{workout.stats.muscleGroups.length - 3} more
                  </Text>
                )}
              </View>
            </TouchableOpacity>

            {/* Action Buttons */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.backgroundSecondary }]}
                onPress={onLike}
              >
                <TrendingUp size={16} color={workout.isLiked ? colors.error : colors.textSecondary} />
                <Text style={[
                  styles.actionText,
                  { color: workout.isLiked ? colors.error : colors.textSecondary }
                ]}>
                  {workout.likesCount || 0}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tryButton, { backgroundColor: colors.tint }]}
                onPress={handleTryWorkout}
              >
                <Download size={16} color="#fff" />
                <Text style={styles.tryButtonText}>Try This Workout</Text>
              </TouchableOpacity>
            </View>

            {/* Caption */}
            {workout.sharingInfo?.caption && (
              <Text style={[styles.caption, { color: colors.textSecondary }]}>
                {workout.sharingInfo.caption}
              </Text>
            )}
          </LinearGradient>
        </BlurView>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  gradientOverlay: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
  },
  date: {
    fontSize: 12,
    fontWeight: '500',
  },
  intensityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  intensityText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
  },
  workoutTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  activitySection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  improvement: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  prSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(57, 255, 20, 0.1)',
    borderRadius: 12,
  },
  prText: {
    fontSize: 14,
    fontWeight: '700',
  },
  muscleSection: {
    marginBottom: 16,
  },
  muscleSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  muscleGroups: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  muscleTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  muscleTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  moreText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  tryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  caption: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
}); 