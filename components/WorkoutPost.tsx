import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Clock, Dumbbell, Target, TrendingUp, BarChart3, Calendar } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { Workout } from '@/types/workout';

interface WorkoutPostProps {
  workout: Workout;
  title?: string;
  caption?: string;
  photoUrl?: string;
  authorUsername?: string;
  authorAvatar?: string;
  postedAt?: string;
  onPress?: () => void;
  showFullDetails?: boolean;
}

export default function WorkoutPost({
  workout,
  title,
  caption,
  photoUrl,
  authorUsername,
  authorAvatar,
  postedAt,
  onPress,
  showFullDetails = false
}: WorkoutPostProps) {
  const { theme } = useTheme();
  const colors = Colors[theme];

  const calculateWorkoutStats = () => {
    let totalSets = 0;
    let totalReps = 0;
    let totalVolume = 0;
    let exerciseCount = 0;

    if (workout.exercises && Array.isArray(workout.exercises)) {
      exerciseCount = workout.exercises.length;
      workout.exercises.forEach((exercise) => {
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

  const formatTime = (timeString?: string) => {
    if (!timeString) return null;
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric'
    });
  };

  const stats = calculateWorkoutStats();
  const startTime = workout.start_time ? formatTime(workout.start_time) : null;
  const endTime = workout.end_time ? formatTime(workout.end_time) : null;
  const duration = formatDuration(workout.actual_duration_minutes || workout.duration_minutes);
  const workoutDate = formatDate(workout.date);

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: colors.card }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.authorInfo}>
          {authorAvatar && (
            <Image source={{ uri: authorAvatar }} style={styles.avatar} />
          )}
          <View style={styles.authorText}>
            <Text style={[styles.authorName, { color: colors.text }]}>
              {authorUsername || 'Anonymous'}
            </Text>
            <Text style={[styles.postedAt, { color: colors.textSecondary }]}>
              {postedAt || workoutDate}
            </Text>
          </View>
        </View>
        <View style={[styles.workoutBadge, { backgroundColor: colors.tint + '15' }]}>
          <Dumbbell size={16} color={colors.tint} />
          <Text style={[styles.workoutBadgeText, { color: colors.tint }]}>
            Workout
          </Text>
        </View>
      </View>

      {/* Photo */}
      {photoUrl && (
        <Image source={{ uri: photoUrl }} style={styles.photo} />
      )}

      {/* Title and Caption */}
      {title && (
        <Text style={[styles.title, { color: colors.text }]}>
          {title}
        </Text>
      )}
      
      {caption && (
        <Text style={[styles.caption, { color: colors.textSecondary }]}>
          {caption}
        </Text>
      )}

      {/* Workout Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statRow}>
          <View style={styles.statItem}>
            <BarChart3 size={20} color={colors.tint} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {stats.totalVolume.toFixed(0)}kg
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Volume</Text>
          </View>
          
          <View style={styles.statItem}>
            <Target size={20} color="#4CAF50" />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {stats.totalSets}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Sets</Text>
          </View>
          
          <View style={styles.statItem}>
            <TrendingUp size={20} color="#FF9800" />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {stats.exerciseCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Exercises</Text>
          </View>
        </View>

        {/* Time Information */}
        <View style={styles.timeContainer}>
          <View style={styles.timeRow}>
            <Calendar size={16} color={colors.textSecondary} />
            <Text style={[styles.timeText, { color: colors.textSecondary }]}>
              {workoutDate}
            </Text>
          </View>
          
          {startTime && endTime && (
            <View style={styles.timeRow}>
              <Clock size={16} color={colors.textSecondary} />
              <Text style={[styles.timeText, { color: colors.textSecondary }]}>
                {startTime} - {endTime}
              </Text>
            </View>
          )}
          
          {duration && (
            <View style={styles.timeRow}>
              <Clock size={16} color={colors.tint} />
              <Text style={[styles.timeText, { color: colors.tint, fontWeight: '600' }]}>
                {duration}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Exercise Preview */}
      {workout.exercises && workout.exercises.length > 0 && (
        <View style={styles.exercisesContainer}>
          <Text style={[styles.exercisesTitle, { color: colors.text }]}>
            Exercises ({stats.exerciseCount})
          </Text>
          <View style={styles.exercisesList}>
            {workout.exercises.slice(0, showFullDetails ? undefined : 3).map((exercise, index) => (
              <View key={index} style={styles.exerciseItem}>
                <View style={[styles.exerciseDot, { backgroundColor: colors.tint }]} />
                <Text style={[styles.exerciseName, { color: colors.textSecondary }]} numberOfLines={1}>
                  {exercise.name || 'Unknown Exercise'}
                </Text>
                                 <Text style={[styles.exerciseSets, { color: colors.textSecondary }]}>
                   {Array.isArray(exercise.sets) ? exercise.sets.length : 0} sets
                 </Text>
              </View>
            ))}
            {!showFullDetails && workout.exercises.length > 3 && (
              <Text style={[styles.moreExercises, { color: colors.textSecondary }]}>
                +{workout.exercises.length - 3} more
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Notes */}
      {workout.notes && (
        <View style={styles.notesContainer}>
          <Text style={[styles.notesText, { color: colors.textSecondary }]}>
            "{workout.notes}"
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  authorText: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  postedAt: {
    fontSize: 14,
  },
  workoutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  workoutBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  caption: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 16,
  },
  statsContainer: {
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  timeContainer: {
    gap: 6,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    fontSize: 14,
  },
  exercisesContainer: {
    marginBottom: 12,
  },
  exercisesTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  exercisesList: {
    gap: 6,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exerciseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  exerciseName: {
    fontSize: 14,
    flex: 1,
  },
  exerciseSets: {
    fontSize: 12,
    fontWeight: '500',
  },
  moreExercises: {
    fontSize: 12,
    fontStyle: 'italic',
    marginLeft: 14,
  },
  notesContainer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  notesText: {
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
  },
}); 