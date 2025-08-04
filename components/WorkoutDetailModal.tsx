import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { ArrowLeft, CircleCheck as CheckCircle, X, TrendingUp, Dumbbell, Clock } from 'lucide-react-native';
import { getExerciseIcon } from '@/lib/exerciseIcons';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';

interface Workout {
  id: string;
  date: string;
  exercises: {
    name: string;
    sets: {
      reps: number;
      weight: number;
    }[];
    isPR?: boolean;
  }[];
  profiles: {
    username: string;
    avatar_url: string | null;
  };
  workout_sharing_information?: {
    title?: string | null;
    caption?: string | null;
    photo_url?: string | null;
    is_my_gym?: boolean;
  }[] | null;
}

interface WorkoutDetailModalProps {
  workoutId: string | null;
  visible: boolean;
  onClose: () => void;
}

export default function WorkoutDetailModal({ workoutId, visible, onClose }: WorkoutDetailModalProps) {
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (workoutId && visible) {
      loadWorkout();
    }
  }, [workoutId, visible]);

  const loadWorkout = async () => {
    if (!workoutId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('workouts')
        .select(`
          id,
          date,
          exercises,
          profiles (
            username,
            avatar_url
          ),
          workout_sharing_information (
            title,
            caption,
            photo_url,
            is_my_gym
          )
        `)
        .eq('id', workoutId)
        .single();

      if (error) throw error;
      setWorkout(data as unknown as Workout);
    } catch (err) {
      console.error('Error loading workout:', err);
      setError('Failed to load workout details');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.modalBackground }]}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>Workout Details</Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.tint} />
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
            </View>
          ) : workout ? (
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              <View style={styles.userInfo}>
                <Image
                  source={{
                    uri: workout.profiles.avatar_url ||
                      `https://source.unsplash.com/random/100x100/?portrait`
                  }}
                  style={styles.avatar}
                />
                <Text style={[styles.username, { color: colors.text }]}>
                  {workout.profiles.username}
                </Text>
              </View>

              <Text style={[styles.date, { color: colors.textSecondary }]}>
                {new Date(workout.date).toLocaleDateString()}
              </Text>

              {/* Compact Workout Summary */}
              <View style={styles.workoutSummary}>
                {(() => {
                  const totalVolume = workout.exercises.reduce((total, ex) => 
                    total + (ex.sets?.reduce((sum, set) => sum + (set.reps * set.weight), 0) || 0), 0);
                  const maxWeight = workout.exercises.reduce((max, ex) => 
                    Math.max(max, ex.sets?.reduce((setMax, set) => Math.max(setMax, set.weight), 0) || 0), 0);
                  // Estimate workout duration based on sets
                  const totalSets = workout.exercises.reduce((total, ex) => total + (ex.sets?.length || 0), 0);
                  const estimatedMinutes = Math.round(totalSets * 2.5);
                  
                  return (
                    <>
                      <View style={styles.summaryItem}>
                        <Text style={[styles.summaryValue, { color: colors.text }]}>
                          {totalVolume.toFixed(0)}kg
                        </Text>
                        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                          Volume
                        </Text>
                      </View>
                      <View style={styles.summaryItem}>
                        <Text style={[styles.summaryValue, { color: colors.text }]}>
                          {maxWeight}kg
                        </Text>
                        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                          Max Weight
                        </Text>
                      </View>
                      <View style={styles.summaryItem}>
                        <Text style={[styles.summaryValue, { color: colors.text }]}>
                          {workout.duration_minutes || estimatedMinutes}min
                        </Text>
                        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                          Duration
                        </Text>
                      </View>
                    </>
                  );
                })()}
              </View>


              <View style={styles.exercises}>
                {workout.exercises.map((exercise, index) => {
                  const totalVolume = exercise.sets?.reduce((sum, set) => 
                    sum + (set.reps * set.weight), 0) || 0;
                  const maxWeight = exercise.sets?.reduce((max, set) => 
                    Math.max(max, set.weight), 0) || 0;
                  
                  return (
                    <View 
                      key={index} 
                      style={[styles.exerciseCard, { backgroundColor: colors.card }]}>
                      <View style={styles.exerciseHeader}>
                        <View style={styles.exerciseNameWithIcon}>
                          {(() => {
                            const iconData = getExerciseIcon(exercise.name);
                            const IconComponent = iconData.icon;
                            return (
                              <View style={[styles.exerciseIconContainer, { backgroundColor: iconData.color + '15' }]}>
                                <IconComponent size={16} color={iconData.color} />
                              </View>
                            );
                          })()}
                          <View style={styles.exerciseInfo}>
                            <Text style={[styles.exerciseName, { color: colors.text }]}>
                              {exercise.name}
                            </Text>
                            <Text style={[styles.volumeText, { color: colors.textSecondary }]}>
                              {exercise.sets?.length || 0} sets • {totalVolume.toFixed(0)}kg volume
                            </Text>
                          </View>
                        </View>
                        {exercise.isPR && (
                          <View style={[styles.prBadge, { backgroundColor: colors.tint + '20' }]}>
                            <CheckCircle size={16} color={colors.tint} fill={colors.tint} />
                            <Text style={[styles.prText, { color: colors.tint }]}>PR</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.setsTable}>
                        <View style={styles.setsHeader}>
                          <Text style={[styles.setLabel, { color: colors.textSecondary }]}>Set</Text>
                          <Text style={[styles.setLabel, { color: colors.textSecondary }]}>Reps</Text>
                          <Text style={[styles.setLabel, { color: colors.textSecondary }]}>Weight</Text>
                          <Text style={[styles.setLabel, { color: colors.textSecondary }]}>Volume</Text>
                        </View>

                        {exercise.sets.map((set, setIndex) => (
                          <View key={setIndex} style={[styles.setRow,
                            set.weight === maxWeight && maxWeight > 0 ? 
                              { backgroundColor: colors.tint + '10' } : {}
                          ]}>
                            <Text style={[styles.setText, { color: colors.text }]}>{setIndex + 1}</Text>
                            <Text style={[styles.setText, { color: colors.text }]}>{set.reps}</Text>
                            <Text style={[styles.setText, { color: colors.text }]}>{set.weight}kg</Text>
                            <Text style={[styles.setText, { color: colors.textSecondary }]}>
                              {(set.reps * set.weight).toFixed(0)}kg
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          ) : (
            <View style={styles.errorContainer}>
              <Text style={[styles.error, { color: colors.error }]}>Workout not found</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '90%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    position: 'relative',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    position: 'absolute',
    left: 15,
    padding: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  error: {
    textAlign: 'center',
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
  },
  date: {
    fontSize: 14,
    marginBottom: 15,
  },
  workoutSummary: {
    flexDirection: 'row',
    marginBottom: 20,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 8,
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },


  exercises: {
    gap: 15,
    marginBottom: 20,
  },
  exerciseCard: {
    borderRadius: 12,
    padding: 15,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  exerciseNameWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginLeft: 12,
  },
  prText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  volumeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  setsTable: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  setsHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  setLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  setRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  setText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },

});