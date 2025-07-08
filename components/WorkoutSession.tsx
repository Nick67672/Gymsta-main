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
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
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
  RotateCcw
} from 'lucide-react-native';

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
  onClose: () => void;
}

export default function WorkoutSession({ workout, onWorkoutComplete, onClose }: WorkoutSessionProps) {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { user } = useAuth();

  const [currentWorkout, setCurrentWorkout] = useState<Workout>(workout);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [restTimer, setRestTimer] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [workoutStartTime] = useState(new Date());
  const [workoutElapsedTime, setWorkoutElapsedTime] = useState(0);
  const [isWorkoutActive, setIsWorkoutActive] = useState(true);
  const [showRestModal, setShowRestModal] = useState(false);
  const [customRestTime, setCustomRestTime] = useState('90');

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

  // Rest timer effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isResting && restTimer > 0) {
      interval = setInterval(() => {
        setRestTimer(prev => {
          if (prev <= 1) {
            setIsResting(false);
            Alert.alert('Rest Complete!', 'Time to start your next set.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isResting, restTimer]);

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

    // Start rest timer
    const restTime = parseInt(customRestTime) || 90;
    setRestTimer(restTime);
    setIsResting(true);
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

  const skipRest = () => {
    setIsResting(false);
    setRestTimer(0);
  };

  const finishWorkout = async () => {
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
          duration_minutes: durationMinutes
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
    } catch (error) {
      console.error('Error completing workout:', error);
      Alert.alert('Error', `Failed to save workout: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const currentExercise = currentWorkout.exercises[currentExerciseIndex];
  const completedSets = currentExercise?.sets.filter(set => set.completed).length || 0;
  const totalSets = currentExercise?.sets.length || 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          setIsWorkoutActive(false);
          onClose();
        }}>
          <X size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.workoutName, { color: colors.text }]}>
            {currentWorkout.name}
          </Text>
          <Text style={[styles.elapsedTime, { color: colors.tint }]}>
            {getElapsedTime()}
          </Text>
        </View>
        <TouchableOpacity onPress={finishWorkout}>
          <Text style={[styles.finishButton, { color: colors.tint }]}>
            Finish
          </Text>
        </TouchableOpacity>
      </View>

      {/* Rest Timer */}
      {isResting && (
        <View style={[styles.restTimer, { backgroundColor: colors.card }]}>
          <View style={styles.restTimerContent}>
            <Clock size={24} color={colors.tint} />
            <Text style={[styles.restTimeText, { color: colors.text }]}>
              Rest: {formatTime(restTimer)}
            </Text>
            <TouchableOpacity
              style={[styles.skipButton, { backgroundColor: colors.tint }]}
              onPress={skipRest}
            >
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Exercise Navigation */}
      <View style={styles.exerciseNav}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {currentWorkout.exercises.map((exercise, index) => (
            <TouchableOpacity
              key={exercise.id}
              style={[
                styles.exerciseTab,
                { backgroundColor: index === currentExerciseIndex ? colors.tint : colors.card }
              ]}
              onPress={() => setCurrentExerciseIndex(index)}
            >
              <Text style={[
                styles.exerciseTabText,
                { color: index === currentExerciseIndex ? 'white' : colors.text }
              ]}>
                {exercise.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Current Exercise */}
      <ScrollView style={styles.content}>
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

            <View style={styles.setsContainer}>
              {currentExercise.sets.map((set, setIndex) => (
                <View key={set.id} style={[styles.setRow, { backgroundColor: colors.background }]}>
                  <Text style={[styles.setNumber, { color: colors.text }]}>
                    {setIndex + 1}
                  </Text>
                  
                  <View style={styles.setInputs}>
                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, { color: colors.text }]}>Reps</Text>
                      <View style={styles.inputWithButtons}>
                        <TouchableOpacity
                          style={[styles.inputButton, { backgroundColor: colors.tint }]}
                          onPress={() => updateSetValue(currentExerciseIndex, setIndex, 'reps', Math.max(1, set.reps - 1))}
                        >
                          <Minus size={16} color="white" />
                        </TouchableOpacity>
                        <Text style={[styles.inputValue, { color: colors.text }]}>
                          {set.reps}
                        </Text>
                        <TouchableOpacity
                          style={[styles.inputButton, { backgroundColor: colors.tint }]}
                          onPress={() => updateSetValue(currentExerciseIndex, setIndex, 'reps', set.reps + 1)}
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
                          onPress={() => updateSetValue(currentExerciseIndex, setIndex, 'weight', Math.max(0, set.weight - 5))}
                        >
                          <Minus size={16} color="white" />
                        </TouchableOpacity>
                        <Text style={[styles.inputValue, { color: colors.text }]}>
                          {set.weight}
                        </Text>
                        <TouchableOpacity
                          style={[styles.inputButton, { backgroundColor: colors.tint }]}
                          onPress={() => updateSetValue(currentExerciseIndex, setIndex, 'weight', set.weight + 5)}
                        >
                          <Plus size={16} color="white" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.completeButton,
                      { backgroundColor: set.completed ? '#4CAF50' : colors.tint }
                    ]}
                    onPress={() => completeSet(currentExerciseIndex, setIndex)}
                    disabled={set.completed}
                  >
                    <CheckCircle size={20} color="white" />
                  </TouchableOpacity>
                </View>
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
              
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.background }]}
                onPress={() => setShowRestModal(true)}
              >
                <Clock size={16} color={colors.text} />
                <Text style={[styles.actionButtonText, { color: colors.text }]}>
                  Rest Timer
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Rest Timer Modal */}
      <Modal visible={showRestModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Rest Timer
            </Text>
            
            <View style={styles.restPresets}>
              {[30, 60, 90, 120, 180].map(seconds => (
                <TouchableOpacity
                  key={seconds}
                  style={[styles.presetButton, { backgroundColor: colors.background }]}
                  onPress={() => {
                    setRestTimer(seconds);
                    setIsResting(true);
                    setShowRestModal(false);
                  }}
                >
                  <Text style={[styles.presetButtonText, { color: colors.text }]}>
                    {formatTime(seconds)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.customRestInput}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                Custom (seconds)
              </Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.background, color: colors.text }]}
                value={customRestTime}
                onChangeText={setCustomRestTime}
                keyboardType="numeric"
                placeholder="90"
                placeholderTextColor={colors.text + '80'}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.background }]}
                onPress={() => setShowRestModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.tint }]}
                onPress={() => {
                  const time = parseInt(customRestTime) || 90;
                  setRestTimer(time);
                  setIsResting(true);
                  setShowRestModal(false);
                }}
              >
                <Text style={[styles.modalButtonText, { color: 'white' }]}>
                  Start
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
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
    paddingVertical: 12,
    paddingHorizontal: 16,
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
  content: {
    flex: 1,
    padding: 20,
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
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  setNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    width: 30,
  },
  setInputs: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 16,
  },
  inputGroup: {
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  inputWithButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 12,
    minWidth: 30,
    textAlign: 'center',
  },
  completeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
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
}); 