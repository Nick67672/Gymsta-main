import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, PanResponder, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Dumbbell, Clock, TrendingUp, ChevronLeft } from 'lucide-react-native';
import Colors from '@/constants/Colors';

interface WorkoutCardProps {
  workout: {
    id: string;
    user_id: string;
    exercises: any[];
    created_at: string;
    profiles: {
      username: string;
      avatar_url: string | null;
      gym?: string | null;
    };
    workout_sharing_information?: {
      title?: string | null;
      caption?: string | null;
      photo_url?: string | null;
      is_my_gym?: boolean;
    }[] | null;
  };
  theme: 'light' | 'dark';
  onPress: (workoutId: string) => void;
}

const WorkoutCard: React.FC<WorkoutCardProps> = ({
  workout,
  theme,
  onPress,
}) => {
  const colors = Colors[theme];
  const [imageError, setImageError] = useState(false);
  const [showWorkoutDetails, setShowWorkoutDetails] = useState(false);
  
  // Animation values
  const translateX = useRef(new Animated.Value(0)).current;
  const { width: screenWidth } = Dimensions.get('window');

  // Extract sharing information
  const sharingInfo = workout.workout_sharing_information?.[0];
  const hasPhoto = !!sharingInfo?.photo_url && !imageError;
  const title = sharingInfo?.title;
  const caption = sharingInfo?.caption;
  const photoUrl = sharingInfo?.photo_url || null;



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

  // Pan responder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to horizontal swipes on photo view
        return hasPhoto && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (evt, gestureState) => {
        // Only allow left swipe (negative dx)
        if (gestureState.dx < 0) {
          translateX.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        const threshold = -screenWidth * 0.3; // 30% of screen width
        
        if (gestureState.dx < threshold) {
          // Swipe left enough - show workout details
          Animated.timing(translateX, {
            toValue: -screenWidth,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            setShowWorkoutDetails(true);
            translateX.setValue(0);
          });
        } else {
          // Not enough swipe - bounce back
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // Function to go back to photo view
  const goBackToPhoto = () => {
    setShowWorkoutDetails(false);
  };

  return (
    <TouchableOpacity
      style={[styles.workoutCard, { backgroundColor: colors.background }]}
      onPress={() => onPress(workout.id)}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Image
            source={{
              uri: workout.profiles.avatar_url ||
                `https://source.unsplash.com/random/100x100/?portrait`
            }}
            style={styles.avatar}
          />
          <View>
            <Text style={[styles.username, { color: colors.text }]}>
              {workout.profiles.username}
            </Text>
            <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
              {new Date(workout.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
        <View style={styles.gymInfo}>
          <Text style={[styles.gymName, { color: colors.textSecondary }]}>
            📍 {workout.profiles.gym || 'Arete'}
          </Text>
        </View>
      </View>



      {/* Content */}
      {hasPhoto && photoUrl && !showWorkoutDetails ? (
        <Animated.View 
          style={[styles.photoContainer, { transform: [{ translateX }] }]}
          {...panResponder.panHandlers}
        >
          {title && (
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          )}
          <Image 
            source={{ uri: photoUrl }} 
            style={styles.workoutImage}
            onError={(error) => {
              setImageError(true); // Hide photo and show workout stats instead
            }}
          />
          {caption && (
            <Text style={[styles.caption, { color: colors.text }]}>{caption}</Text>
          )}
          <View style={styles.photoOverlay}>
            <View style={styles.exerciseCount}>
              <Dumbbell size={16} color="#fff" />
              <Text style={styles.exerciseCountText}>{workout.exercises.length}</Text>
            </View>
          </View>
        </Animated.View>
      ) : (
        <View>
          {/* Back button when viewing workout details from photo */}
          {hasPhoto && showWorkoutDetails && (
            <TouchableOpacity style={styles.backButton} onPress={goBackToPhoto}>
              <ChevronLeft size={20} color={colors.primaryGradientStart} />
              <Text style={[styles.backText, { color: colors.primaryGradientStart }]}>
                Back to photo
              </Text>
            </TouchableOpacity>
          )}
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
        </View>
      )}

      {/* Exercise preview */}
      {workout.exercises.length > 0 && (
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
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
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 14,
    lineHeight: 18,
  },
  gymInfo: {
    alignItems: 'flex-end',
  },
  gymName: {
    fontSize: 14,
    lineHeight: 18,
  },
  photoContainer: {
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  workoutImage: {
    width: '100%',
    height: 240,
    borderRadius: 12,
    marginBottom: 8,
  },
  caption: {
    fontSize: 14,
    lineHeight: 20,
  },
  photoOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  exerciseCount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  exerciseCountText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 4,
  },
  backText: {
    fontSize: 14,
    fontWeight: '500',
  },
  workoutStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  statItem: {
    flex: 1,
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
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  exercisePreviewText: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default WorkoutCard; 