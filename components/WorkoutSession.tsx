import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { useUnits } from '@/context/UnitContext';
import Colors from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { 
  X, 
  Play, 
  Pause, 
  CheckCircle, 
  Clock, 
  Plus,
  Minus,
  RotateCcw,
  Trash2,
  ChevronDown
} from 'lucide-react-native';
import { LineChart } from 'react-native-chart-kit';
import { router } from 'expo-router';
import { LiveWorkoutTimer } from './LiveWorkoutTimer';
import { SmartRestTimer } from './SmartRestTimer';
import { WorkoutContext } from '@/hooks/useSmartRestTimer';
import { ExercisePicker } from './ExercisePicker';
import { Spacing } from '@/constants/Spacing';

const { width: screenWidth } = Dimensions.get('window');
const SWIPE_THRESHOLD = screenWidth * 0.2;

// SwipeableSetRow component for swipe-to-complete functionality
interface SwipeableSetRowProps {
  set: WorkoutSet;
  setIndex: number;
  exerciseIndex: number;
  colors: any;
  onCompleteSet: (exerciseIndex: number, setIndex: number) => void;
  onDeleteSet: (exerciseIndex: number, setIndex: number) => void;
  onUpdateSetValue: (exerciseIndex: number, setIndex: number, field: 'reps' | 'weight', value: number) => void;
  formatWeight: (weight: number, fromUnit?: 'lbs' | 'kg', toUnit?: 'lbs' | 'kg') => string;
  isEditingPlan: boolean;
  getWeightIncrement: (size: 'small' | 'medium' | 'large') => number;
}

const SwipeableSetRow: React.FC<SwipeableSetRowProps> = ({
  set,
  setIndex,
  exerciseIndex,
  colors,
  onCompleteSet,
  onDeleteSet,
  onUpdateSetValue,
  formatWeight,
  isEditingPlan,
  getWeightIncrement,
}) => {
  const [isEditingWeight, setIsEditingWeight] = useState(false);
  const [weightInput, setWeightInput] = useState(set.weight.toString());

  // Update weight input when set.weight changes
  useEffect(() => {
    setWeightInput(set.weight.toString());
  }, [set.weight]);

  const handleWeightSubmit = () => {
    const newWeight = parseFloat(weightInput);
    if (!isNaN(newWeight) && newWeight >= 0) {
      onUpdateSetValue(exerciseIndex, setIndex, 'weight', newWeight);
    } else {
      setWeightInput(set.weight.toString()); // Reset to original value
    }
    setIsEditingWeight(false);
  };
  const translateX = React.useRef(new Animated.Value(0)).current;
  const [gestureState, setGestureState] = React.useState<'idle' | 'swiping' | 'completed'>('idle');

  const handlePanGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: false }
  );

  const handlePanStateChange = (event: any) => {
    const { state, translationX: translation } = event.nativeEvent;

    if (state === State.END) {
      if (translation > SWIPE_THRESHOLD && !set.completed) {
        // Swipe right - complete set
        completeSet();
      } else if (translation < -SWIPE_THRESHOLD) {
        // Swipe left - delete set
        deleteSet();
      } else {
        // Return to center
        resetPosition();
      }
    }
  };

  const completeSet = () => {
    setGestureState('completed');
    
    // Haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    // Animate completion
    Animated.timing(translateX, {
      toValue: screenWidth,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      onCompleteSet(exerciseIndex, setIndex);
      resetPosition();
      setGestureState('idle');
    });
  };

  const deleteSet = () => {
    // Haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }

    // Animate deletion
    Animated.timing(translateX, {
      toValue: -screenWidth,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      onDeleteSet(exerciseIndex, setIndex);
      resetPosition();
      setGestureState('idle');
    });
  };

  const resetPosition = () => {
    Animated.spring(translateX, {
      toValue: 0,
      friction: 6,
      useNativeDriver: false,
    }).start();
  };

  const getCompleteIndicatorOpacity = () => {
    return translateX.interpolate({
      inputRange: [0, SWIPE_THRESHOLD],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });
  };

  const getDeleteIndicatorOpacity = () => {
    return translateX.interpolate({
      inputRange: [-SWIPE_THRESHOLD, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });
  };

  const getBackgroundColor = () => {
    return translateX.interpolate({
      inputRange: [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD],
      outputRange: ['#EF4444', colors.background, '#4CAF50'],
      extrapolate: 'clamp',
    });
  };

  return (
    <View style={styles.swipeableContainer}>
      {/* Delete indicator (left side) */}
      <Animated.View
        style={[
          styles.swipeIndicator,
          styles.deleteIndicator,
          {
            backgroundColor: '#EF4444',
            opacity: getDeleteIndicatorOpacity(),
          },
        ]}
      >
        <Trash2 size={24} color="white" />
        <Text style={styles.swipeIndicatorText}>Delete Set</Text>
      </Animated.View>

      {/* Complete indicator (right side) */}
      <Animated.View
        style={[
          styles.swipeIndicator,
          styles.completeIndicator,
          {
            backgroundColor: '#4CAF50',
            opacity: getCompleteIndicatorOpacity(),
          },
        ]}
      >
        <CheckCircle size={24} color="white" />
        <Text style={styles.swipeIndicatorText}>Complete Set</Text>
      </Animated.View>

      {/* Main set row */}
             <PanGestureHandler
         onGestureEvent={handlePanGestureEvent}
         onHandlerStateChange={handlePanStateChange}
         enabled={!set.completed && !isEditingPlan}
       >
        <Animated.View
          style={[
            styles.setRow,
            {
              backgroundColor: getBackgroundColor(),
              transform: [{ translateX }],
            },
          ]}
        >
          <Text style={[styles.setNumber, { color: colors.text }]}>
            {setIndex + 1}
          </Text>
          
          <View style={styles.setInputs}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Reps</Text>
              <View style={styles.inputWithButtons}>
                <TouchableOpacity
                  style={[styles.inputButton, { backgroundColor: colors.tint }]}
                  onPress={() => onUpdateSetValue(exerciseIndex, setIndex, 'reps', Math.max(1, set.reps - 1))}
                >
                  <Minus size={16} color="white" />
                </TouchableOpacity>
                <Text style={[styles.inputValue, { color: colors.text }]}>
                  {set.reps}
                </Text>
                <TouchableOpacity
                  style={[styles.inputButton, { backgroundColor: colors.tint }]}
                  onPress={() => onUpdateSetValue(exerciseIndex, setIndex, 'reps', set.reps + 1)}
                >
                  <Plus size={16} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Weight</Text>
              <View style={styles.inputWithButtons}>
                <TouchableOpacity
                  style={[styles.inputButton, { backgroundColor: colors.tint }]}
                  onPress={() => onUpdateSetValue(exerciseIndex, setIndex, 'weight', Math.max(0, set.weight - getWeightIncrement('large')))}
                >
                  <Minus size={16} color="white" />
                </TouchableOpacity>
                {isEditingWeight ? (
                  <TextInput
                    style={[styles.inputValue, styles.weightInput, { 
                      color: colors.text,
                      backgroundColor: colors.inputBackground,
                      borderColor: colors.tint,
                    }]}
                    value={weightInput}
                    onChangeText={(text) => {
                      // Allow numbers and decimal point
                      const numericText = text.replace(/[^0-9.]/g, '');
                      setWeightInput(numericText);
                    }}
                    onSubmitEditing={handleWeightSubmit}
                    onBlur={handleWeightSubmit}
                    keyboardType="numeric"
                    selectTextOnFocus
                    autoFocus
                    maxLength={6}
                  />
                ) : (
                  <TouchableOpacity 
                    style={[styles.inputValue, styles.weightTouchable]}
                    onPress={() => setIsEditingWeight(true)}
                  >
                    <Text style={[styles.inputValueText, { color: colors.text }]}>
                      {formatWeight(set.weight, 'kg')}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.inputButton, { backgroundColor: colors.tint }]}
                  onPress={() => onUpdateSetValue(exerciseIndex, setIndex, 'weight', set.weight + getWeightIncrement('large'))}
                >
                  <Plus size={16} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Completion status indicator - outline instead of dot */}
          {set.completed && (
            <View style={[styles.completedOutline, { borderColor: '#4CAF50' }]} />
          )}
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

interface WorkoutSet {
  id: string;
  reps: number;
  weight: number;
  completed: boolean;
  restTime?: number;
}

interface Exercise {
  id: string;
  name: string;
  sets: WorkoutSet[];
  targetSets: number;
  targetReps: number;
  targetWeight: number;
  notes?: string;
}

interface Workout {
  id: string;
  name: string;
  date: string;
  exercises: Exercise[];
  status: 'planned' | 'in_progress' | 'completed';
  startTime?: Date;
  endTime?: Date;
  notes?: string;
}

interface WorkoutSessionProps {
  workout: Workout;
  onWorkoutComplete: (completedWorkout: Workout) => void;
  defaultRestTime?: number; // in seconds
  onClose: () => void;
  plannedWorkoutId?: string | null;
}

export default function WorkoutSession({ workout, onWorkoutComplete, onClose, defaultRestTime = 90, plannedWorkoutId = null }: WorkoutSessionProps) {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { user } = useAuth();
  const { units, formatWeight, getWeightIncrement } = useUnits();

  const [currentWorkout, setCurrentWorkout] = useState<Workout>(workout);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [workoutStartTime] = useState(new Date());
  const [workoutElapsedTime, setWorkoutElapsedTime] = useState(0);
  const [isWorkoutActive, setIsWorkoutActive] = useState(true);
  const [selectedRestTime, setSelectedRestTime] = useState(90); // Default rest time in seconds
  const [showRestTimeSelector, setShowRestTimeSelector] = useState(false);
  const [customRestTime, setCustomRestTime] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [timerResetKey, setTimerResetKey] = useState(0); // Key to force timer reset
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [showExerciseDropdown, setShowExerciseDropdown] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [workoutNameInput, setWorkoutNameInput] = useState(currentWorkout.name);
  
  // Smart timer context
  const [workoutContext, setWorkoutContext] = useState<WorkoutContext>({
    exerciseName: '',
    exerciseType: 'strength',
    setNumber: 1,
    totalSets: 1,
    workoutProgress: 0,
    isCompoundMovement: false,
    exerciseIntensity: 5,
    timeOfDay: new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening',
    userTendsToSkip: false
  });

  // Initialize sets for exercises
  useEffect(() => {
    const updatedWorkout = {
      ...currentWorkout,
      exercises: currentWorkout.exercises.map(exercise => ({
        ...exercise,
        sets: exercise.sets.length > 0 ? exercise.sets : Array.from({ length: exercise.targetSets }, (_, index) => ({
          id: `${exercise.id}-set-${index}`,
          reps: exercise.targetReps,
          weight: exercise.targetWeight,
          completed: false
        }))
      }))
    };
    setCurrentWorkout(updatedWorkout);
  }, []);

  // Update workout context when exercise changes
  useEffect(() => {
    const currentExercise = currentWorkout.exercises[currentExerciseIndex];
    if (currentExercise) {
      const completedSets = currentExercise.sets.filter(set => set.completed).length;
      const totalExercises = currentWorkout.exercises.length;
      const completedExercises = currentExerciseIndex;
      const workoutProgress = (completedExercises + (completedSets / currentExercise.sets.length)) / totalExercises;
      
      // Determine if compound movement
      const compoundExercises = ['squat', 'deadlift', 'bench', 'press', 'row', 'pull'];
      const isCompound = compoundExercises.some(compound => 
        currentExercise.name.toLowerCase().includes(compound)
      );
      
      setWorkoutContext({
        exerciseName: currentExercise.name,
        exerciseType: 'strength', // Could be enhanced with exercise type detection
        setNumber: completedSets + 1,
        totalSets: currentExercise.sets.length,
        workoutProgress,
        isCompoundMovement: isCompound,
        exerciseIntensity: 5, // Could be enhanced with user input
        timeOfDay: new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening',
        userTendsToSkip: false // Could be learned from analytics
      });
    }
  }, [currentExerciseIndex, currentWorkout]);

  // Workout timer effect - continuous timer that updates every second
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    if (isWorkoutActive) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - workoutStartTime.getTime()) / 1000);
        setWorkoutElapsedTime(elapsed);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [workoutStartTime, isWorkoutActive]);

  // Old rest timer logic removed - now using SmartRestTimer

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getElapsedTime = () => {
    return formatTime(workoutElapsedTime);
  };

  const completeSet = (exerciseIndex: number, setIndex: number) => {
    setCurrentWorkout(prev => ({
      ...prev,
      exercises: prev.exercises.map((exercise, eIndex) => {
        if (eIndex === exerciseIndex) {
          return {
            ...exercise,
            sets: exercise.sets.map((set, sIndex) => {
              if (sIndex === setIndex) {
                return { ...set, completed: true };
              }
              return set;
            })
          };
        }
        return exercise;
      })
    }));

    // Update workout context for the timer
    const exercise = currentWorkout.exercises[exerciseIndex];
    const completedSetsCount = exercise.sets.filter(s => s.completed).length + 1; // +1 for the set we just completed
    const currentHour = new Date().getHours();
    
    setWorkoutContext({
      exerciseName: exercise.name,
      exerciseType: 'strength', // You might want to make this dynamic based on exercise
      setNumber: completedSetsCount,
      totalSets: exercise.sets.length,
      workoutProgress: (currentExerciseIndex + 1) / currentWorkout.exercises.length,
      isCompoundMovement: ['squat', 'deadlift', 'bench', 'press'].some(compound => 
        exercise.name.toLowerCase().includes(compound)
      ),
      exerciseIntensity: Math.min(10, Math.max(1, Math.round((exercise.sets[setIndex]?.weight || 0) / 10))),
      timeOfDay: currentHour < 12 ? 'morning' : currentHour < 17 ? 'afternoon' : 'evening',
      userTendsToSkip: false // Could be based on user history
    });

    // Reset and start rest timer with selected time
    setTimerResetKey(prev => prev + 1); // Force timer reset
    setIsResting(true);
  };

  const deleteSet = (exerciseIndex: number, setIndex: number) => {
    setCurrentWorkout(prev => ({
      ...prev,
      exercises: prev.exercises.map((exercise, eIndex) => {
        if (eIndex === exerciseIndex) {
          return {
            ...exercise,
            sets: exercise.sets.filter((_, sIndex) => sIndex !== setIndex)
          };
        }
        return exercise;
      })
    }));
  };

  const updateSetValue = (exerciseIndex: number, setIndex: number, field: 'reps' | 'weight', value: number) => {
    setCurrentWorkout(prev => ({
      ...prev,
      exercises: prev.exercises.map((exercise, eIndex) => {
        if (eIndex === exerciseIndex) {
          return {
            ...exercise,
            sets: exercise.sets.map((set, sIndex) => {
              if (sIndex === setIndex) {
                return { ...set, [field]: value };
              }
              return set;
            })
          };
        }
        return exercise;
      })
    }));
  };

  const addSet = (exerciseIndex: number) => {
    setCurrentWorkout(prev => ({
      ...prev,
      exercises: prev.exercises.map((exercise, eIndex) => {
        if (eIndex === exerciseIndex) {
          const newSet: WorkoutSet = {
            id: `${exercise.id}-set-${exercise.sets.length}`,
            reps: exercise.targetReps,
            weight: exercise.targetWeight,
            completed: false
          };
          return {
            ...exercise,
            sets: [...exercise.sets, newSet]
          };
        }
        return exercise;
      })
    }));
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    setCurrentWorkout(prev => ({
      ...prev,
      exercises: prev.exercises.map((exercise, eIndex) => {
        if (eIndex === exerciseIndex) {
          return {
            ...exercise,
            sets: exercise.sets.filter((_, sIndex) => sIndex !== setIndex)
          };
        }
        return exercise;
      })
    }));
  };

  const deleteExercise = (exerciseIndex: number) => {
    Alert.alert(
      'Delete Exercise',
      `Are you sure you want to delete "${currentWorkout.exercises[exerciseIndex].name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setCurrentWorkout(prev => ({
              ...prev,
              exercises: prev.exercises.filter((_, index) => index !== exerciseIndex)
            }));
            
            // Adjust current exercise index if needed
            if (exerciseIndex <= currentExerciseIndex && currentExerciseIndex > 0) {
              setCurrentExerciseIndex(prev => Math.max(0, prev - 1));
            }
            

          }
        }
      ]
    );
  };

  const addNewExercise = (exerciseName: string) => {
    const newExercise: Exercise = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: exerciseName,
      sets: [{
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        reps: 10,
        weight: 0,
        completed: false,
      }],
      targetSets: 1,
      targetReps: 10,
      targetWeight: 0,
    };
    
    setCurrentWorkout(prev => ({
      ...prev,
      exercises: [...prev.exercises, newExercise]
    }));
    
    // Switch to the new exercise
    setCurrentExerciseIndex(currentWorkout.exercises.length);
    setShowExercisePicker(false);
  };

  const skipRest = () => {
    setIsResting(false);
  };

  const handleNameSubmit = () => {
    const trimmedName = workoutNameInput.trim();
    if (trimmedName) {
      setCurrentWorkout(prev => ({
        ...prev,
        name: trimmedName
      }));
    } else {
      setWorkoutNameInput(currentWorkout.name); // Reset to original if empty
    }
    setIsEditingName(false);
  };

  const handleNameCancel = () => {
    setWorkoutNameInput(currentWorkout.name);
    setIsEditingName(false);
  };

  const finishWorkout = async () => {
    // Check if we're editing a planned workout (not starting from a plan)
    const isEditingPlan = plannedWorkoutId === null && currentWorkout.id && !currentWorkout.id.startsWith('temp-');
    
    if (isEditingPlan) {
      // We're editing a workout plan - save to planned_workouts table
      try {
        // Format exercises for planned workout storage
        const formattedExercises = currentWorkout.exercises.map(exercise => ({
          id: exercise.id,
          name: exercise.name,
          sets: exercise.sets.map(set => ({
            id: set.id,
            reps: set.reps,
            weight: set.weight,
            completed: false // Reset completed status for planned workout
          })),
          targetSets: exercise.targetSets,
          targetReps: exercise.targetReps,
          targetWeight: exercise.targetWeight,
          notes: exercise.notes || null
        }));

        // Update the planned workout
        const { error: updateError } = await supabase
          .from('planned_workouts')
          .update({
            name: currentWorkout.name,
            exercises: formattedExercises,
            notes: currentWorkout.notes,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentWorkout.id)
          .eq('user_id', user?.id);

        if (updateError) {
          throw new Error(`Failed to update workout plan: ${updateError.message}`);
        }

        Alert.alert(
          'Plan Updated!', 
          'Your workout plan has been saved successfully.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } catch (error) {
        console.error('Error updating workout plan:', error);
        Alert.alert('Error', `Failed to update workout plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      return;
    }

    // Original logic for completing a workout
    // Stop the workout timer
    setIsWorkoutActive(false);
    
    // Calculate workout duration in minutes
    const endTime = new Date();
    const durationMinutes = Math.round((endTime.getTime() - workoutStartTime.getTime()) / (1000 * 60));
    
    const completedWorkout: Workout = {
      ...currentWorkout,
      status: 'completed',
      endTime: endTime
    };

    console.log('Finishing workout - creating new database entry');
    console.log('User ID:', user?.id);

    if (!user) {
      Alert.alert('Error', 'Please sign in to save your workout.');
      return;
    }

    try {
      // Format exercises for JSONB storage with completed sets
      const formattedExercises = completedWorkout.exercises.map(exercise => ({
        id: exercise.id,
        name: exercise.name,
        sets: exercise.sets.map(set => ({
          id: set.id,
          reps: set.reps,
          weight: set.weight,
          completed: set.completed
        })),
        targetSets: exercise.targetSets,
        targetReps: exercise.targetReps,
        targetWeight: exercise.targetWeight,
        notes: exercise.notes || null
      }));

      // Calculate total volume for the workout
      let totalVolume = 0;
      completedWorkout.exercises.forEach(exercise => {
        exercise.sets.forEach(set => {
          if (set.completed) {
            totalVolume += set.reps * set.weight;
          }
        });
      });

      console.log('Creating new completed workout with:', {
        user_id: user.id,
        name: completedWorkout.name || 'Untitled Workout',
        date: completedWorkout.date,
        is_completed: true,
        duration_minutes: durationMinutes,
        total_volume: totalVolume,
        exerciseCount: formattedExercises.length
      });

      // Create a new workout entry in the database (not update existing)
      const { data: newWorkout, error: workoutError } = await supabase
        .from('workouts')
        .insert({
          user_id: user.id,
          name: completedWorkout.name || 'Untitled Workout',
          date: completedWorkout.date,
          exercises: formattedExercises,
          total_volume: totalVolume,
          notes: completedWorkout.notes,
          is_completed: true,
          duration_minutes: durationMinutes,
          planned_workout_id: plannedWorkoutId
        })
        .select()
        .single();

      console.log('New workout creation result:', { newWorkout, workoutError });

      if (workoutError) {
        console.error('Failed to create completed workout:', workoutError);
        throw new Error(`Failed to save workout: ${workoutError.message}`);
      }

      console.log('Workout successfully saved as new entry with ID:', newWorkout.id);

      onWorkoutComplete(completedWorkout);
      Alert.alert(
        'Workout Complete!', 
        `Great job! You worked out for ${durationMinutes} minutes and lifted ${totalVolume}kg total volume.`,
        [{ text: 'OK' }]
      );

      // Navigate to post-workout summary screen
      try {
        router.push(`/fitness/workout-summary?workoutId=${newWorkout.id}`);
      } catch (navErr) {
        console.error('Navigation error:', navErr);
      }
    } catch (error) {
      console.error('Error completing workout:', error);
      Alert.alert('Error', `Failed to save workout: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const currentExercise = currentWorkout.exercises[currentExerciseIndex];
  const completedSets = currentExercise?.sets.filter(set => set.completed).length || 0;
  const totalSets = currentExercise?.sets.length || 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }] }>
        <TouchableOpacity onPress={() => {
          setIsWorkoutActive(false);
          onClose();
        }}>
          <X size={24} color={colors.text} />
        </TouchableOpacity>
                 <View style={styles.headerInfo}>
           {isEditingName ? (
             <View style={styles.nameEditContainer}>
               <TextInput
                 style={[styles.nameInput, { 
                   color: colors.text,
                   backgroundColor: colors.inputBackground || colors.card,
                   borderColor: colors.tint,
                 }]}
                 value={workoutNameInput}
                 onChangeText={setWorkoutNameInput}
                 onSubmitEditing={handleNameSubmit}
                 onBlur={handleNameSubmit}
                 autoFocus
                 selectTextOnFocus
                 maxLength={50}
                 placeholder="Workout name"
                 placeholderTextColor={colors.textSecondary}
               />
               <View style={styles.nameEditActions}>
                 <TouchableOpacity onPress={handleNameCancel}>
                   <Text style={[styles.nameEditButton, { color: colors.textSecondary }]}>Cancel</Text>
                 </TouchableOpacity>
                 <TouchableOpacity onPress={handleNameSubmit}>
                   <Text style={[styles.nameEditButton, { color: colors.tint }]}>Save</Text>
                 </TouchableOpacity>
               </View>
             </View>
           ) : (
             <TouchableOpacity onPress={() => setIsEditingName(true)}>
               <Text style={[styles.workoutName, { color: colors.text }]}>
                 {currentWorkout.name}
               </Text>
             </TouchableOpacity>
           )}
           <Text style={[styles.elapsedTime, { color: colors.tint }]}>
             {plannedWorkoutId === null && currentWorkout.id && !currentWorkout.id.startsWith('temp-') ? 'Editing Plan' : getElapsedTime()}
           </Text>
         </View>
        <View style={styles.headerActions}>
          {!(plannedWorkoutId === null && currentWorkout.id && !currentWorkout.id.startsWith('temp-')) && (
            <TouchableOpacity 
              style={[styles.restTimeButton, { 
                backgroundColor: colors.tint + '20',
                borderColor: colors.tint + '40',
                borderWidth: 1,
              }]}
              onPress={() => setShowRestTimeSelector(true)}
            >
              <View style={[styles.restTimeIcon, { backgroundColor: colors.tint }]}>
                <Clock size={14} color="white" />
              </View>
              <Text style={[styles.restTimeButtonText, { color: colors.tint }]}>
                {selectedRestTime < 60 ? `${selectedRestTime}s` : 
                 `${Math.floor(selectedRestTime / 60)}:${(selectedRestTime % 60).toString().padStart(2, '0')}`}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={finishWorkout}>
            <Text style={[styles.finishButton, { color: colors.tint }]}>
              {plannedWorkoutId === null && currentWorkout.id && !currentWorkout.id.startsWith('temp-') ? 'Save Plan' : 'Finish'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>



      {/* Exercise Navigation */}
      <View style={styles.exerciseNav}>
        {/* Exercise Dropdown */}
        <View style={styles.exerciseDropdownContainer}>
          <TouchableOpacity
            style={[styles.exerciseDropdown, { backgroundColor: colors.card }]}
            onPress={() => setShowExerciseDropdown(!showExerciseDropdown)}
          >
            <View style={styles.exerciseDropdownContent}>
              <Text style={[styles.exerciseDropdownText, { color: colors.text }]}>
                {currentExercise?.name || 'Select Exercise'}
              </Text>
              <Text style={[styles.exerciseDropdownProgress, { color: colors.textSecondary }]}>
                {currentExerciseIndex + 1} of {currentWorkout.exercises.length}
              </Text>
            </View>
            <ChevronDown 
              size={20} 
              color={colors.textSecondary} 
              style={[
                styles.dropdownIcon,
                { transform: [{ rotate: showExerciseDropdown ? '180deg' : '0deg' }] }
              ]}
            />
          </TouchableOpacity>
          
          {showExerciseDropdown && (
            <View style={[styles.exerciseDropdownMenu, { backgroundColor: colors.card }]}>
              <ScrollView style={styles.dropdownScrollView} showsVerticalScrollIndicator={false}>
                {currentWorkout.exercises.map((exercise, index) => (
                  <View key={exercise.id} style={styles.dropdownExerciseItemContainer}>
                    <TouchableOpacity
                      style={[
                        styles.dropdownExerciseItem,
                        index === currentExerciseIndex && { backgroundColor: colors.tint + '20' }
                      ]}
                      onPress={() => {
                        setCurrentExerciseIndex(index);
                        setShowExerciseDropdown(false);
                      }}
                    >
                      <View style={styles.dropdownExerciseContent}>
                        <Text style={[
                          styles.dropdownExerciseName,
                          { color: index === currentExerciseIndex ? colors.tint : colors.text }
                        ]}>
                          {exercise.name}
                        </Text>
                        <Text style={[styles.dropdownExerciseSets, { color: colors.textSecondary }]}>
                          {exercise.sets.filter(set => set.completed).length}/{exercise.sets.length} sets
                        </Text>
                      </View>
                      {index === currentExerciseIndex && (
                        <CheckCircle size={16} color={colors.tint} />
                      )}
                    </TouchableOpacity>
                    
                    {/* Delete Button */}
                    <TouchableOpacity
                      style={styles.dropdownDeleteButton}
                      onPress={() => {
                        setShowExerciseDropdown(false);
                        deleteExercise(index);
                      }}
                    >
                      <Trash2 size={14} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
                
                {/* Add Exercise Option */}
                <TouchableOpacity
                  style={[styles.dropdownAddExercise, { borderColor: colors.tint }]}
                  onPress={() => {
                    setShowExerciseDropdown(false);
                    setShowExercisePicker(true);
                  }}
                >
                  <Plus size={16} color={colors.tint} />
                  <Text style={[styles.dropdownAddExerciseText, { color: colors.tint }]}>
                    Add New Exercise
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}
        </View>
        

      </View>

      {/* Current Exercise */}
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        onTouchStart={() => {
          setShowExerciseDropdown(false);
        }}
      >
        {currentExercise && (
          <View style={[styles.exerciseContainer, { backgroundColor: colors.card }]}>
            <View style={styles.exerciseHeader}>
              <Text style={[styles.exerciseTitle, { color: colors.text }]}>
                {currentExercise.name}
              </Text>
              <Text style={[styles.exerciseProgress, { color: colors.tint }]}>
                {completedSets}/{totalSets} sets
              </Text>
            </View>

            {/* 🎨 Enhanced Smart Rest Timer - Only show when not editing a plan */}
            {isResting && !(plannedWorkoutId === null && currentWorkout.id && !currentWorkout.id.startsWith('temp-')) && (
              <SmartRestTimer
                key={`timer-${timerResetKey}-${selectedRestTime}`} // Force reset when key changes
                context={workoutContext}
                workoutId={currentWorkout.id}
                onTimerComplete={() => setIsResting(false)}
                onTimerStart={() => console.log('Timer started')}
                onTimerStop={() => console.log('Timer stopped')}
                showInlineControls={true}
                compactMode={false}
                initialTime={selectedRestTime}
                autoStart={true}
              />
            )}
            


            <View style={styles.setsContainer}>
              {currentExercise.sets.map((set, setIndex) => (
                                 <SwipeableSetRow
                   key={set.id}
                   set={set}
                   setIndex={setIndex}
                   exerciseIndex={currentExerciseIndex}
                   colors={colors}
                   onCompleteSet={completeSet}
                   onDeleteSet={deleteSet}
                   onUpdateSetValue={updateSetValue}
                   formatWeight={formatWeight}
                   isEditingPlan={plannedWorkoutId === null && Boolean(currentWorkout.id) && !currentWorkout.id.startsWith('temp-')}
                   getWeightIncrement={getWeightIncrement}
                 />
              ))}
            </View>

            <View style={styles.setActions}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.tint }]}
                onPress={() => addSet(currentExerciseIndex)}
              >
                <Plus size={16} color="white" />
                <Text style={styles.actionButtonText}>Add Set</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Rest Time Selector Modal */}
      <Modal visible={showRestTimeSelector} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.restTimeSelectorCard, { backgroundColor: colors.card }]}>
            <View style={styles.modalHandle} />
            
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconContainer, { backgroundColor: colors.tint + '20' }]}>
                <Clock size={24} color={colors.tint} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Rest Timer Default
              </Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                Choose your default rest time between sets
              </Text>
            </View>
            
            <View style={styles.restPresetsGrid}>
              {[
                { seconds: 30, label: '30s', desc: 'Quick' },
                { seconds: 60, label: '1:00', desc: 'Light' },
                { seconds: 90, label: '1:30', desc: 'Standard' },
                { seconds: 120, label: '2:00', desc: 'Moderate' },
                { seconds: 180, label: '3:00', desc: 'Heavy' },
                { seconds: 240, label: '4:00', desc: 'Strength' },
                { seconds: 300, label: '5:00', desc: 'Max Effort' },
              ].map(({ seconds, label, desc }) => (
                <TouchableOpacity
                  key={seconds}
                  style={[
                    styles.presetCard,
                    { 
                      backgroundColor: selectedRestTime === seconds && !showCustomInput ? colors.tint : colors.background,
                      borderColor: selectedRestTime === seconds && !showCustomInput ? colors.tint : colors.border || 'rgba(255,255,255,0.1)',
                      borderWidth: selectedRestTime === seconds && !showCustomInput ? 2 : 1,
                      transform: [{ scale: selectedRestTime === seconds && !showCustomInput ? 1.02 : 1 }],
                    }
                  ]}
                  onPress={() => {
                    setSelectedRestTime(seconds);
                    setShowCustomInput(false);
                    setCustomRestTime('');
                  }}
                  activeOpacity={0.8}
                >
                  {selectedRestTime === seconds && !showCustomInput && (
                    <View style={styles.selectedBadge}>
                      <Text style={styles.selectedBadgeText}>✓</Text>
                    </View>
                  )}
                  <Text style={[
                    styles.presetCardTime, 
                    { color: selectedRestTime === seconds && !showCustomInput ? 'white' : colors.text }
                  ]}>
                    {label}
                  </Text>
                  <Text style={[
                    styles.presetCardDesc, 
                    { color: selectedRestTime === seconds && !showCustomInput ? 'rgba(255,255,255,0.9)' : colors.textSecondary }
                  ]}>
                    {desc}
                  </Text>
                </TouchableOpacity>
              ))}
              
              {/* Custom Time Card */}
              <TouchableOpacity
                style={[
                  styles.presetCard,
                  styles.customCard,
                  { 
                    backgroundColor: showCustomInput ? colors.tint : colors.background,
                    borderColor: showCustomInput ? colors.tint : colors.border || 'rgba(255,255,255,0.1)',
                    borderWidth: showCustomInput ? 2 : 1,
                    borderStyle: 'dashed',
                    transform: [{ scale: showCustomInput ? 1.02 : 1 }],
                  }
                ]}
                onPress={() => setShowCustomInput(true)}
                activeOpacity={0.8}
              >
                {showCustomInput && (
                  <View style={styles.selectedBadge}>
                    <Text style={styles.selectedBadgeText}>✓</Text>
                  </View>
                )}
                <Text style={[
                  styles.presetCardTime, 
                  { color: showCustomInput ? 'white' : colors.text }
                ]}>
                  {showCustomInput && customRestTime ? `${customRestTime}s` : '+'}
                </Text>
                <Text style={[
                  styles.presetCardDesc, 
                  { color: showCustomInput ? 'rgba(255,255,255,0.9)' : colors.textSecondary }
                ]}>
                  Custom
                </Text>
              </TouchableOpacity>
            </View>

            {/* Custom Time Input */}
            {showCustomInput && (
              <View style={[styles.customInputContainer, { borderColor: colors.border || 'rgba(255,255,255,0.1)' }]}>
                <Text style={[styles.customInputLabel, { color: colors.text }]}>
                  Enter custom time (seconds):
                </Text>
                <View style={styles.customInputRow}>
                  <TextInput
                    style={[
                      styles.customInput,
                      { 
                        backgroundColor: colors.background,
                        color: colors.text,
                        borderColor: colors.border || 'rgba(255,255,255,0.2)',
                      }
                    ]}
                    value={customRestTime}
                    onChangeText={(text) => {
                      // Only allow numbers
                      const numericText = text.replace(/[^0-9]/g, '');
                      setCustomRestTime(numericText);
                      if (numericText) {
                        const seconds = parseInt(numericText);
                        if (seconds > 0 && seconds <= 1800) { // Max 30 minutes
                          setSelectedRestTime(seconds);
                        }
                      }
                    }}
                    placeholder="90"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                    maxLength={4}
                    autoFocus
                  />
                  <Text style={[styles.customInputUnit, { color: colors.textSecondary }]}>
                    seconds
                  </Text>
                </View>
                <Text style={[styles.customInputHint, { color: colors.textSecondary }]}>
                  Range: 1-1800 seconds (30 minutes max)
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.doneButton, { backgroundColor: colors.tint }]}
              onPress={() => setShowRestTimeSelector(false)}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Exercise Picker Modal */}
      <ExercisePicker
        visible={showExercisePicker}
        onClose={() => setShowExercisePicker(false)}
        onSelectExercise={addNewExercise}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    paddingTop: Spacing.xl,
    borderBottomWidth: 1,
    // themed border color applied inline
  },
  headerInfo: {
    alignItems: 'center',
  },
  workoutName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  elapsedTime: {
    fontSize: 14,
    marginTop: 2,
  },
  finishButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  restTimer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  restTimerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  restTimeText: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  skipButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  exerciseNav: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  exerciseTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  exerciseTabText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Exercise Dropdown Styles
  exerciseDropdownContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  exerciseDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  exerciseDropdownContent: {
    flex: 1,
  },
  exerciseDropdownText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  exerciseDropdownProgress: {
    fontSize: 12,
    fontWeight: '500',
  },
  dropdownIcon: {
    marginLeft: 8,
  },
  exerciseDropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderRadius: 12,
    marginTop: 4,
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  dropdownScrollView: {
    maxHeight: 300,
  },
  dropdownExerciseItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  dropdownExerciseItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownDeleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownExerciseContent: {
    flex: 1,
  },
  dropdownExerciseName: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  dropdownExerciseSets: {
    fontSize: 12,
    fontWeight: '400',
  },
  dropdownAddExercise: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    gap: 8,
  },
  dropdownAddExerciseText: {
    fontSize: 15,
    fontWeight: '500',
  },

  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  exerciseContainer: {
    borderRadius: 16,
    padding: 20,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  exerciseTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  exerciseProgress: {
    fontSize: 16,
    fontWeight: '500',
  },
  setsContainer: {
    marginBottom: 20,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 16,
    borderRadius: 12,
    marginBottom: 8,
    minHeight: 80,
  },
  setNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    width: 24,
    textAlign: 'center',
    marginRight: 8,
    marginTop: 24,
  },
  setInputs: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginLeft: 8,
    marginRight: 16,
    gap: 12,
    justifyContent: 'flex-start',
    marginTop: 4,
  },
  inputGroup: {
    alignItems: 'center',
    flex: 0,
    minWidth: 100,
    maxWidth: 120,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  inputWithButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minWidth: 90,
  },
  inputButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputValue: {
    fontSize: 16,
    fontWeight: 'bold',
    minWidth: 40,
    textAlign: 'center',
    paddingHorizontal: 4,
    flexShrink: 0,
    lineHeight: 20,
  },
  inputValueText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  weightInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    minHeight: 28,
  },
  weightTouchable: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 28,
    paddingVertical: 4,
  },
  completeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  setActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'white',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  restPresets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  presetButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  presetButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  customRestInput: {
    marginBottom: 20,
  },
  textInput: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginTop: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  restTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  restTimeIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restTimeButtonText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modalSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  presetButtonSubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  // Enhanced Rest Time Selector Styles
  restTimeSelectorCard: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingHorizontal: 20,
    paddingBottom: 32,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  restPresetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
    justifyContent: 'center',
  },
  presetCard: {
    width: 90,
    height: 80,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  selectedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
  },
  presetCardTime: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  presetCardDesc: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  doneButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.5,
  },
  // Custom Time Input Styles
  customCard: {
    borderStyle: 'dashed',
  },
  customInputContainer: {
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
  },
  customInputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 8,
  },
  customInput: {
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    minWidth: 80,
    maxWidth: 120,
  },
  customInputUnit: {
    fontSize: 16,
    fontWeight: '500',
  },
  customInputHint: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Swipeable set row styles
  swipeableContainer: {
    position: 'relative',
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  swipeIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 0,
  },
  swipeIndicatorText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  completedOutline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    borderWidth: 2,
    pointerEvents: 'none',
  },
  deleteIndicator: {
    justifyContent: 'flex-start',
    paddingLeft: 20,
  },
     completeIndicator: {
     justifyContent: 'flex-end',
     paddingRight: 20,
   },
   // Name editing styles
   nameEditContainer: {
     alignItems: 'center',
     marginBottom: 4,
   },
   nameInput: {
     fontSize: 18,
     fontWeight: 'bold',
     textAlign: 'center',
     borderWidth: 1,
     borderRadius: 8,
     paddingHorizontal: 12,
     paddingVertical: 6,
     marginBottom: 8,
     minWidth: 150,
   },
   nameEditActions: {
     flexDirection: 'row',
     gap: 16,
   },
   nameEditButton: {
     fontSize: 14,
     fontWeight: '600',
     paddingHorizontal: 8,
     paddingVertical: 4,
   },
 }); 