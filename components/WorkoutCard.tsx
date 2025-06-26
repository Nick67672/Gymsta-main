import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Dumbbell, Clock, TrendingUp } from 'lucide-react-native';
import Colors from '@/constants/Colors';

interface WorkoutCardProps {
  workout: {
    id: string;
    user_id: string;
    exercises: any[];
    created_at: string;
    progress_image_url: string | null;
    profiles: {
      username: string;
      avatar_url: string | null;
      gym?: string | null;
    };
  };
  theme: 'light' | 'dark';
  onPress: (workoutId: string) => void;
}

const WorkoutCard: React.FC<WorkoutCardProps> = ({ workout, theme, onPress }) => {
  const colors = Colors[theme];
  
  // Calculate workout stats for better display
  const totalSets = workout.exercises.reduce((total, exercise) => {
    return total + (exercise.sets?.length || 0);
  }, 0);
  
  const totalVolume = workout.exercises.reduce((total, exercise) => {
    const exerciseVolume = exercise.sets?.reduce((setTotal: number, set: any) => {
      return setTotal + (set.reps * set.weight);
    }, 0) || 0;
    return total + exerciseVolume;
  }, 0);
  
  const hasPRs = workout.exercises.some((exercise) => exercise.isPR);
  
  // Format volume for display
  const formatVolume = (volume: number) => {
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}k kg`;
    }
    return `${volume} kg`;
  };
  
  // Estimate workout duration (rough calculation)
  const estimatedDuration = Math.max(20, totalSets * 2 + workout.exercises.length * 3);
  
  return (
    <TouchableOpacity
      style={[styles.workoutCard, { 
        backgroundColor: colors.card,
        shadowColor: theme === 'dark' ? '#000' : '#000',
      }]}
      onPress={() => onPress(workout.id)}
      activeOpacity={0.9}
    >
      {/* Header with user info */}
      <View style={styles.workoutHeader}>
        <Image
          source={{
            uri: workout.profiles.avatar_url ||
              `https://source.unsplash.com/random/100x100/?portrait&${workout.user_id}`,
          }}
          style={styles.workoutAvatar}
        />
        <View style={styles.userInfo}>
          <Text style={[styles.workoutUsername, { color: colors.text }]}>
            {workout.profiles.username}
          </Text>
          <View style={styles.workoutMeta}>
            <Text style={[styles.workoutDate, { color: colors.textSecondary }]}>
              {new Date(workout.created_at).toLocaleDateString()}
            </Text>
            {workout.profiles.gym && (
              <>
                <Text style={[styles.workoutSeparator, { color: colors.textSecondary }]}> • </Text>
                <Text style={[styles.workoutGym, { color: colors.textSecondary }]}>
                  📍 {workout.profiles.gym}
                </Text>
              </>
            )}
          </View>
        </View>
        {hasPRs && (
          <LinearGradient
            colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.prBadge}
          >
            <Text style={styles.prText}>PR</Text>
          </LinearGradient>
        )}
      </View>

      {/* Progress image if available */}
      {workout.progress_image_url && (
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: workout.progress_image_url }} 
            style={styles.workoutImage} 
          />
          <View style={styles.imageOverlay}>
            <View style={[styles.exerciseCount, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
              <Dumbbell size={16} color="#fff" />
              <Text style={styles.exerciseCountText}>
                {workout.exercises.length}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Workout stats */}
      <View style={styles.workoutStats}>
        <View style={styles.statItem}>
          <LinearGradient
            colors={[colors.primaryGradientStart + '20', colors.primaryGradientEnd + '20']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.statIcon}
          >
            <Dumbbell size={16} color={colors.primaryGradientStart} />
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
            colors={[colors.primaryGradientStart + '20', colors.primaryGradientEnd + '20']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.statIcon}
          >
            <Clock size={16} color={colors.primaryGradientStart} />
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
              colors={[colors.primaryGradientStart + '20', colors.primaryGradientEnd + '20']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.statIcon}
            >
              <TrendingUp size={16} color={colors.primaryGradientStart} />
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

      {/* Exercise preview */}
      {!workout.progress_image_url && workout.exercises.length > 0 && (
        <View style={[styles.exercisePreview, { backgroundColor: colors.backgroundSecondary }]}>
          <Text style={[styles.exercisePreviewText, { color: colors.text }]} numberOfLines={2}>
            {workout.exercises.slice(0, 3).map(ex => ex.name).join(' • ')}
            {workout.exercises.length > 3 && ` +${workout.exercises.length - 3} more`}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  workoutCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  workoutAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  workoutUsername: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  workoutDate: {
    fontSize: 14,
  },
  workoutMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  workoutSeparator: {
    fontSize: 14,
  },
  workoutGym: {
    fontSize: 14,
    maxWidth: 120,
  },
  prBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  prText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  workoutImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  imageOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  exerciseCount: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  exerciseCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  workoutStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
  },
  statLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  exercisePreview: {
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  exercisePreviewText: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default WorkoutCard; 