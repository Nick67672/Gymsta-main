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
import { Dumbbell, Clock, Target, TrendingUp, Award, User } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { getAvatarUrl } from '@/lib/avatarUtils';
import { useUnits } from '@/context/UnitContext';

const { width: screenWidth } = Dimensions.get('window');

interface WorkoutData {
  id: string;
  date: string;
  name: string | null;
  exercises: any[];
  total_volume: number | null;
  duration_minutes: number | null;
  start_time: string | null;
  end_time: string | null;
  actual_duration_minutes: number | null;
  is_completed: boolean;
  notes: string | null;
  created_at: string;
  user_id: string;
  profiles?: {
    id: string;
    username: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
}

interface SharedWorkoutProps {
  workoutId: string;
  message?: string;
  colors: any;
}

export const SharedWorkout: React.FC<SharedWorkoutProps> = ({ workoutId, message, colors }) => {
  const [workout, setWorkout] = useState<WorkoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { formatWeight } = useUnits();

  useEffect(() => {
    loadWorkout();
  }, [workoutId]);

  const loadWorkout = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('workouts')
        .select(`
          *,
          profiles (
            id,
            username,
            avatar_url,
            is_verified
          )
        `)
        .eq('id', workoutId)
        .single();

      if (fetchError) {
        console.error('Error loading shared workout:', fetchError);
        setError('Failed to load workout');
        return;
      }

      setWorkout(data);
    } catch (err) {
      console.error('Error in loadWorkout:', err);
      setError('Failed to load workout');
    } finally {
      setLoading(false);
    }
  };

  const handleWorkoutPress = () => {
    if (workout) {
      // Navigate to the user's profile where they can see the workout
      router.push(`/${workout.profiles?.username || 'unknown'}`);
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

  const calculateWorkoutStats = (exercises: any[]) => {
    let totalSets = 0;
    let totalReps = 0;
    let totalVolume = 0;
    let exerciseCount = 0;

    if (exercises && Array.isArray(exercises)) {
      exerciseCount = exercises.length;
      exercises.forEach((exercise) => {
        if (exercise && exercise.sets && Array.isArray(exercise.sets)) {
          exercise.sets.forEach((set) => {
            if (set) {
              totalSets++;
              totalReps += Number(set.reps) || 0;
              totalVolume += (Number(set.reps) || 0) * (Number(set.weight) || 0);
            }
          });
        }
      });
    }

    return { totalSets, totalReps, totalVolume, exerciseCount };
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.card }]}>
        <ActivityIndicator size="small" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading workout...
        </Text>
      </View>
    );
  }

  if (error || !workout) {
    return (
      <View style={[styles.container, { backgroundColor: colors.card }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>
          {error || 'Workout not found'}
        </Text>
      </View>
    );
  }

  const stats = calculateWorkoutStats(workout.exercises || []);
  const isCompleted = workout.is_completed;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.card }]}
      onPress={handleWorkoutPress}
      activeOpacity={0.8}
    >
      {/* Message text if provided */}
      {message && message.trim() && (
        <Text style={[styles.messageText, { color: colors.text }]}>
          {message}
        </Text>
      )}

      {/* Workout content */}
      <View style={styles.workoutContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Image
              source={{
                uri: getAvatarUrl(workout.profiles?.avatar_url, workout.profiles?.username || 'default')
              }}
              style={styles.avatar}
            />
            {workout.profiles?.is_verified && (
              <View style={[styles.verifiedBadge, { backgroundColor: colors.tint }]}>
                <Text style={styles.verifiedText}>✓</Text>
              </View>
            )}
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.username, { color: colors.text }]}>
              {workout.profiles?.username || 'Unknown User'}
            </Text>
            <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
              {formatDate(workout.created_at)}
            </Text>
          </View>
          <View style={[
            styles.statusBadge, 
            { backgroundColor: isCompleted ? colors.tint + '20' : colors.border + '50' }
          ]}>
            {isCompleted ? (
              <Award size={12} color={colors.tint} />
            ) : (
              <Clock size={12} color={colors.textSecondary} />
            )}
            <Text style={[
              styles.statusText, 
              { color: isCompleted ? colors.tint : colors.textSecondary }
            ]}>
              {isCompleted ? 'Completed' : 'Planned'}
            </Text>
          </View>
        </View>

        {/* Workout Title */}
        <Text style={[styles.workoutTitle, { color: colors.text }]}>
          {workout.name || 'Untitled Workout'}
        </Text>

        {/* Workout Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Dumbbell size={14} color={colors.tint} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {stats.exerciseCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Exercises
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Target size={14} color="#4CAF50" />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {stats.totalSets}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Sets
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <TrendingUp size={14} color="#FF9800" />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {formatWeight(stats.totalVolume, 'kg')}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Volume
            </Text>
          </View>
          
          {(workout.actual_duration_minutes || workout.duration_minutes) && (
            <View style={styles.statItem}>
              <Clock size={14} color="#9C27B0" />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {workout.actual_duration_minutes || workout.duration_minutes}m
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Duration
              </Text>
            </View>
          )}
        </View>

        {/* Exercise Preview */}
        {workout.exercises && Array.isArray(workout.exercises) && workout.exercises.length > 0 && (
          <View style={styles.exercisePreview}>
            <Text style={[styles.exercisePreviewTitle, { color: colors.text }]}>
              Exercises
            </Text>
            <View style={styles.exerciseList}>
              {workout.exercises.slice(0, 3).map((exercise, idx) => (
                <View key={idx} style={styles.exerciseItem}>
                  <View style={[styles.exerciseDot, { backgroundColor: colors.tint }]} />
                  <Text style={[styles.exerciseName, { color: colors.textSecondary }]} numberOfLines={1}>
                    {exercise?.name || 'Unknown Exercise'}
                  </Text>
                </View>
              ))}
              {workout.exercises.length > 3 && (
                <Text style={[styles.moreExercises, { color: colors.textSecondary }]}>
                  +{workout.exercises.length - 3} more
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Notes Preview */}
        {workout.notes && (
          <View style={styles.notesPreview}>
            <Text style={[styles.notesText, { color: colors.textSecondary }]} numberOfLines={2}>
              "{workout.notes}"
            </Text>
          </View>
        )}

        {/* Shared indicator */}
        <View style={styles.sharedIndicator}>
          <Text style={[styles.sharedText, { color: colors.textSecondary }]}>
            💪 Shared workout
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
  workoutContent: {
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  workoutTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
  },
  statItem: {
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  exercisePreview: {
    marginBottom: 6,
  },
  exercisePreviewTitle: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 3,
  },
  exerciseList: {
    gap: 1,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  exerciseDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  exerciseName: {
    fontSize: 10,
    flex: 1,
  },
  moreExercises: {
    fontSize: 10,
    fontStyle: 'italic',
    marginLeft: 10,
  },
  notesPreview: {
    marginBottom: 8,
  },
  notesText: {
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 16,
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