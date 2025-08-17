import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, Animated, PanGestureHandler, State } from 'react-native';
import { ChevronLeft, ChevronRight, X, Dumbbell, Clock, TrendingUp, Target, Award, BarChart3 } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { BorderRadius, Shadows, Spacing } from '@/constants/Spacing';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface WorkoutSwipeDisplayProps {
  workout: {
    id: string;
    exercises: any[];
    total_volume?: number;
    duration_minutes?: number;
    actual_duration_minutes?: number;
    is_completed: boolean;
    notes?: string;
    created_at: string;
  };
  photoUrl?: string | null;
  onClose: () => void;
}

export default function WorkoutSwipeDisplay({ workout, photoUrl, onClose }: WorkoutSwipeDisplayProps) {
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  const [currentView, setCurrentView] = useState<'image' | 'stats'>('image');
  const translateX = useRef(new Animated.Value(0)).current;
  const [imageLoaded, setImageLoaded] = useState(false);

  // Calculate workout stats
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

  const stats = calculateWorkoutStats();

  const handleSwipe = (direction: 'left' | 'right') => {
    if (direction === 'left' && currentView === 'image') {
      // Swipe left from image to stats
      setCurrentView('stats');
      Animated.spring(translateX, {
        toValue: -screenWidth,
        useNativeDriver: true,
      }).start();
    } else if (direction === 'right' && currentView === 'stats') {
      // Swipe right from stats to image
      setCurrentView('image');
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    }
  };

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX, velocityX } = event.nativeEvent;
      
      if (Math.abs(translationX) > screenWidth * 0.3 || Math.abs(velocityX) > 500) {
        if (translationX < 0 && currentView === 'image') {
          // Swipe left to show stats
          handleSwipe('left');
        } else if (translationX > 0 && currentView === 'stats') {
          // Swipe right to show image
          handleSwipe('right');
        } else {
          // Reset position
          Animated.spring(translateX, {
            toValue: currentView === 'image' ? 0 : -screenWidth,
            useNativeDriver: true,
          }).start();
        }
      } else {
        // Reset position
        Animated.spring(translateX, {
          toValue: currentView === 'image' ? 0 : -screenWidth,
          useNativeDriver: true,
        }).start();
      }
    }
  };

  const renderImageView = () => (
    <View style={styles.viewContainer}>
      {photoUrl ? (
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: photoUrl }} 
            style={styles.workoutImage}
            resizeMode="cover"
            onLoad={() => setImageLoaded(true)}
          />
          {!imageLoaded && (
            <View style={[styles.imagePlaceholder, { backgroundColor: colors.backgroundSecondary }]} />
          )}
        </View>
      ) : (
        <View style={[styles.noImageContainer, { backgroundColor: colors.backgroundSecondary }]}>
          <Dumbbell size={64} color={colors.textSecondary} />
          <Text style={[styles.noImageText, { color: colors.textSecondary }]}>
            No workout photo
          </Text>
        </View>
      )}
      
      {/* Swipe hint */}
      <View style={styles.swipeHint}>
        <Text style={[styles.swipeHintText, { color: colors.textSecondary }]}>
          Swipe left to see workout stats →
        </Text>
      </View>
    </View>
  );

  const renderStatsView = () => (
    <View style={styles.viewContainer}>
      <View style={styles.statsContainer}>
        {/* Header */}
        <View style={styles.statsHeader}>
          <Text style={[styles.statsTitle, { color: colors.text }]}>
            Workout Complete! 💪
          </Text>
          <Text style={[styles.statsSubtitle, { color: colors.textSecondary }]}>
            Great job today!
          </Text>
        </View>

        {/* Main Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <BarChart3 size={32} color={colors.tint} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {stats.totalVolume.toFixed(0)}kg
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Volume</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Target size={32} color="#4CAF50" />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {stats.totalSets}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Sets</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <TrendingUp size={32} color="#FF9800" />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {stats.totalReps}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Reps</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Dumbbell size={32} color="#9C27B0" />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {stats.exerciseCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Exercises</Text>
          </View>
        </View>

        {/* Duration */}
        {(workout.actual_duration_minutes || workout.duration_minutes) && (
          <View style={[styles.durationCard, { backgroundColor: colors.card }]}>
            <Clock size={24} color={colors.tint} />
            <Text style={[styles.durationText, { color: colors.text }]}>
              Duration: {workout.actual_duration_minutes || workout.duration_minutes} minutes
            </Text>
          </View>
        )}

        {/* Exercise Summary */}
        <View style={styles.exerciseSummary}>
          <Text style={[styles.summaryTitle, { color: colors.text }]}>
            Exercises Completed
          </Text>
          <View style={styles.exerciseList}>
            {workout.exercises?.slice(0, 5).map((exercise: any, index: number) => (
              <View key={index} style={styles.exerciseItem}>
                <View style={[styles.exerciseDot, { backgroundColor: colors.tint }]} />
                <Text style={[styles.exerciseName, { color: colors.text }]} numberOfLines={1}>
                  {exercise?.name || 'Unknown Exercise'}
                </Text>
                <Text style={[styles.exerciseSets, { color: colors.textSecondary }]}>
                  {exercise?.sets?.length || 0} sets
                </Text>
              </View>
            ))}
            {workout.exercises?.length > 5 && (
              <Text style={[styles.moreExercises, { color: colors.textSecondary }]}>
                +{workout.exercises.length - 5} more exercises
              </Text>
            )}
          </View>
        </View>

        {/* Notes */}
        {workout.notes && (
          <View style={[styles.notesCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.notesTitle, { color: colors.text }]}>Notes</Text>
            <Text style={[styles.notesText, { color: colors.textSecondary }]}>
              {workout.notes}
            </Text>
          </View>
        )}
      </View>

      {/* Swipe hint */}
      <View style={styles.swipeHint}>
        <Text style={[styles.swipeHintText, { color: colors.textSecondary }]}>
          ← Swipe right to see photo
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.closeButton, { backgroundColor: colors.card }]}
          onPress={onClose}
        >
          <X size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {currentView === 'image' ? 'Workout Photo' : 'Workout Stats'}
          </Text>
        </View>
        
        <View style={styles.headerRight} />
      </View>

      {/* Content */}
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
      >
        <Animated.View 
          style={[
            styles.contentContainer,
            {
              transform: [{ translateX }],
            }
          ]}
        >
          <View style={styles.viewsContainer}>
            {renderImageView()}
            {renderStatsView()}
          </View>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.light,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerRight: {
    width: 44,
  },
  contentContainer: {
    flex: 1,
  },
  viewsContainer: {
    flexDirection: 'row',
    width: screenWidth * 2,
  },
  viewContainer: {
    width: screenWidth,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  imageContainer: {
    width: '100%',
    height: screenHeight * 0.6,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.light,
  },
  workoutImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageContainer: {
    width: '100%',
    height: screenHeight * 0.6,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.light,
  },
  noImageText: {
    fontSize: 16,
    marginTop: Spacing.md,
  },
  statsContainer: {
    width: '100%',
    maxHeight: screenHeight * 0.8,
  },
  statsHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  statsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: Spacing.xs,
  },
  statsSubtitle: {
    fontSize: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.xs,
    ...Shadows.light,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  durationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
    ...Shadows.light,
  },
  durationText: {
    fontSize: 16,
    fontWeight: '600',
  },
  exerciseSummary: {
    marginBottom: Spacing.lg,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: Spacing.md,
  },
  exerciseList: {
    gap: Spacing.sm,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  exerciseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  exerciseName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  exerciseSets: {
    fontSize: 14,
    fontWeight: '500',
  },
  moreExercises: {
    fontSize: 14,
    fontStyle: 'italic',
    marginLeft: 16,
  },
  notesCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    ...Shadows.light,
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: Spacing.sm,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  swipeHint: {
    position: 'absolute',
    bottom: Spacing.xl,
    alignItems: 'center',
  },
  swipeHintText: {
    fontSize: 14,
    fontStyle: 'italic',
    opacity: 0.7,
  },
}); 