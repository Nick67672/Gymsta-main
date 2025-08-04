import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { 
  X, 
  Edit3, 
  Trash2, 
  Dumbbell,
  Clock,
  Target
} from 'lucide-react-native';

interface WorkoutDay {
  id: string;
  name: string;
  date: string;
  exercises: Exercise[];
  is_completed: boolean;
  notes?: string;
}

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
  volume: number;
  notes?: string;
}

interface WorkoutCalendarProps {
  visible: boolean;
  onClose: () => void;
  onWorkoutSelect?: (workout: WorkoutDay) => void;
}

export default function WorkoutCalendar({ visible, onClose, onWorkoutSelect }: WorkoutCalendarProps) {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { user } = useAuth();

  const [workouts, setWorkouts] = useState<WorkoutDay[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutDay | null>(null);
  const [showWorkoutDetail, setShowWorkoutDetail] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && user) {
      loadWorkouts();
    }
  }, [visible, user]);

  const loadWorkouts = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('workouts')
        .select(`
          *,
          workout_exercises (*)
        `)
        .eq('user_id', user.id)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      const transformedWorkouts = data?.map(w => ({
        id: w.id,
        name: w.name || 'Untitled Workout',
        date: w.date,
        exercises: w.workout_exercises?.map((e: any) => ({
          id: e.id,
          name: e.name,
          sets: e.sets || 0,
          reps: e.reps || 0,
          weight: e.weight || 0,
          volume: e.volume || 0,
          notes: e.notes
        })) || [],
        is_completed: w.is_completed || false,
        notes: w.notes
      })) || [];
      
      setWorkouts(transformedWorkouts);
    } catch (error) {
      console.error('Error loading workouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteWorkout = async (workoutId: string) => {
    Alert.alert(
      'Delete Workout',
      'Are you sure you want to delete this workout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Use the secure database function for complete workout deletion
              const { error } = await supabase.rpc('delete_my_workout', { 
                workout_id: workoutId 
              });
              
              if (error) throw error;
              
              // Update the UI
              setWorkouts(prev => prev.filter(w => w.id !== workoutId));
              setShowWorkoutDetail(false);
              setSelectedWorkout(null);
            } catch (error) {
              console.error('Error deleting workout:', error);
              Alert.alert('Error', 'Failed to delete workout. Please try again.');
            }
          }
        }
      ]
    );
  };

  const getMarkedDates = () => {
    const marked: { [key: string]: any } = {};
    
    workouts.forEach(workout => {
      marked[workout.date] = {
        marked: true,
        dotColor: workout.is_completed ? '#4CAF50' : '#FF9800',
        selectedColor: workout.is_completed ? '#4CAF50' : '#FF9800',
      };
    });
    
    if (selectedDate) {
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: colors.tint,
      };
    }
    
    return marked;
  };

  const onDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
    const workout = workouts.find(w => w.date === day.dateString);
    if (workout) {
      setSelectedWorkout(workout);
      setShowWorkoutDetail(true);
    }
  };

  const renderWorkoutDetail = () => {
    if (!selectedWorkout) return null;

    const totalVolume = selectedWorkout.exercises.reduce((sum, ex) => sum + ex.volume, 0);
    const totalSets = selectedWorkout.exercises.reduce((sum, ex) => sum + ex.sets, 0);

    return (
      <Modal visible={showWorkoutDetail} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {selectedWorkout.name}
              </Text>
              <TouchableOpacity onPress={() => setShowWorkoutDetail(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.workoutInfo}>
              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <Clock size={16} color={colors.tint} />
                  <Text style={[styles.infoText, { color: colors.text }]}>
                    {new Date(selectedWorkout.date).toLocaleDateString()}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { 
                  backgroundColor: selectedWorkout.is_completed ? '#4CAF50' : '#FF9800' 
                }]}>
                  <Text style={styles.statusText}>
                    {selectedWorkout.is_completed ? 'Completed' : 'Planned'}
                  </Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Dumbbell size={16} color={colors.tint} />
                  <Text style={[styles.statNumber, { color: colors.text }]}>
                    {selectedWorkout.exercises.length}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.text }]}>
                    Exercises
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Target size={16} color={colors.tint} />
                  <Text style={[styles.statNumber, { color: colors.text }]}>
                    {totalSets}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.text }]}>
                    Sets
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: colors.text }]}>
                    {totalVolume.toFixed(0)}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.text }]}>
                    Volume (lbs)
                  </Text>
                </View>
              </View>
            </View>

            <ScrollView style={styles.exercisesList} showsVerticalScrollIndicator={false}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Exercises
              </Text>
              {selectedWorkout.exercises.map((exercise, index) => (
                <View key={exercise.id} style={[styles.exerciseItem, { backgroundColor: colors.background }]}>
                  <Text style={[styles.exerciseName, { color: colors.text }]}>
                    {exercise.name}
                  </Text>
                  <Text style={[styles.exerciseDetails, { color: colors.text }]}>
                    {exercise.sets} sets × {exercise.reps} reps @ {exercise.weight} lbs
                  </Text>
                  <Text style={[styles.exerciseVolume, { color: colors.tint }]}>
                    Volume: {exercise.volume.toFixed(0)} lbs
                  </Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.background }]}
                onPress={() => {
                  if (onWorkoutSelect) {
                    onWorkoutSelect(selectedWorkout);
                  }
                  setShowWorkoutDetail(false);
                }}
              >
                <Edit3 size={16} color={colors.text} />
                <Text style={[styles.actionButtonText, { color: colors.text }]}>
                  Edit
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#FF3B30' }]}
                onPress={() => deleteWorkout(selectedWorkout.id)}
              >
                <Trash2 size={16} color="white" />
                <Text style={[styles.actionButtonText, { color: 'white' }]}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.calendarContainer, { backgroundColor: colors.background }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              Workout Calendar
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <Calendar
            onDayPress={onDayPress}
            markedDates={getMarkedDates()}
            theme={{
              backgroundColor: colors.background,
              calendarBackground: colors.background,
              textSectionTitleColor: colors.text,
              selectedDayBackgroundColor: colors.tint,
              selectedDayTextColor: '#ffffff',
              todayTextColor: colors.tint,
              dayTextColor: colors.text,
              textDisabledColor: colors.text + '40',
              dotColor: colors.tint,
              selectedDotColor: '#ffffff',
              arrowColor: colors.tint,
              monthTextColor: colors.text,
              indicatorColor: colors.tint,
              textDayFontWeight: '500',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '600',
              textDayFontSize: 16,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 14,
            }}
          />

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
              <Text style={[styles.legendText, { color: colors.text }]}>
                Completed
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
              <Text style={[styles.legendText, { color: colors.text }]}>
                Planned
              </Text>
            </View>
          </View>
        </View>
      </View>
      
      {renderWorkoutDetail()}
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarContainer: {
    width: '95%',
    maxHeight: '80%',
    borderRadius: 16,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 14,
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  workoutInfo: {
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  exercisesList: {
    maxHeight: 200,
    marginBottom: 20,
  },
  exerciseItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  exerciseDetails: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 2,
  },
  exerciseVolume: {
    fontSize: 12,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
}); 