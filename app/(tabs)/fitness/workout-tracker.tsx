import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { LineChart } from 'react-native-chart-kit';
import { useFocusEffect } from '@react-navigation/native';
import {
  Plus,
  Calendar as CalendarIcon,
  TrendingUp,
  Dumbbell,
  Trash2,
  Play,
  CheckCircle,
  BarChart3,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedInput } from '@/components/ThemedInput';

const screenWidth = Dimensions.get('window').width;

interface SimpleWorkout {
  id: string;
  date: string;
  is_completed: boolean;
  name?: string;
  notes?: string;
  exercises: SimpleExercise[];
}

interface SimpleExercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
  volume: number;
  notes?: string;
}

interface VolumeData {
  workout_date: string;
  exercise_name: string;
  total_volume: number;
  total_sets: number;
  total_reps: number;
  max_weight: number;
}

export default function WorkoutTrackerScreen() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { user, isAuthenticated } = useAuth();

  // State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentWorkout, setCurrentWorkout] = useState<SimpleWorkout | null>(null);
  const [workoutDates, setWorkoutDates] = useState<{ [key: string]: any }>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'today' | 'calendar' | 'progress'>('today');
  
  // Exercise form state
  const [exerciseName, setExerciseName] = useState('');
  const [exerciseSets, setExerciseSets] = useState('3');
  const [exerciseReps, setExerciseReps] = useState('10');
  const [exerciseWeight, setExerciseWeight] = useState('0');
  const [exerciseNotes, setExerciseNotes] = useState('');
  const [exerciseSuggestions, setExerciseSuggestions] = useState<string[]>([]);
  const [showExerciseForm, setShowExerciseForm] = useState(false);
  
  // Progress tracking state
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [daysPeriod, setDaysPeriod] = useState(30);
  const [volumeData, setVolumeData] = useState<VolumeData[]>([]);
  const [availableExercises, setAvailableExercises] = useState<string[]>([]);

  // Database test function
  const testDatabaseConnection = useCallback(async () => {
    if (!user) return;

    try {
      console.log('Testing basic Supabase connection...');
      
      // Test basic connection with profiles table (which should exist)
      const { data: profileTest, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Profile test failed:', profileError);
        Alert.alert('Database Connection Error', 'Unable to connect to database. Please check your internet connection.');
        return false;
      }

      console.log('Basic database connection working');

      // Test if workout tables exist
      const { data: workoutTest, error: workoutError } = await supabase
        .from('workouts')
        .select('id')
        .limit(1);

      if (workoutError) {
        if (workoutError.code === '42P01') {
          console.log('Workout tables do not exist');
          Alert.alert(
            'Setup Required',
            'Workout tracker tables need to be created. Please run the SQL migration in your Supabase dashboard:\n\n1. Go to your Supabase project\n2. Open SQL Editor\n3. Copy and paste the migration SQL\n4. Run the query',
            [{ text: 'OK' }]
          );
          return false;
        }
        console.error('Workout table test failed:', workoutError);
        return false;
      }

      console.log('Workout tables exist and accessible');
      return true;
    } catch (error) {
      console.error('Database test failed:', error);
      Alert.alert('Error', 'Database connection test failed');
      return false;
    }
  }, [user]);

  // Load workout data
  const loadWorkouts = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Test database connection first
      console.log('Testing database connection...');
      
      // Load workouts for calendar
      const { data: workouts, error } = await supabase
        .from('workouts')
        .select(`
          id,
          date,
          is_completed,
          name,
          notes,
          workout_exercises (
            id,
            name,
            sets,
            reps,
            weight,
            volume,
            notes,
            order_index
          )
        `)
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) {
        console.error('Database error details:', error);
        if (error.code === '42P01') {
          Alert.alert(
            'Database Setup Required', 
            'The workout tracker tables need to be created. Please run the SQL migration in your Supabase dashboard.',
            [
              {
                text: 'OK',
                onPress: () => console.log('User acknowledged database setup needed')
              }
            ]
          );
          return;
        }
        throw error;
      }

      console.log('Workouts loaded successfully:', workouts?.length || 0);

      // Format for calendar
      const dates: { [key: string]: any } = {};
      workouts?.forEach((workout) => {
        const dateKey = workout.date;
        dates[dateKey] = {
          marked: true,
          dotColor: workout.is_completed ? '#4CAF50' : '#FF9800',
          selectedColor: workout.is_completed ? '#4CAF50' : '#FF9800',
        };
      });
      setWorkoutDates(dates);

      // Find today's workout
      const todayWorkout = workouts?.find(w => w.date === selectedDate);
      if (todayWorkout) {
        setCurrentWorkout({
          id: todayWorkout.id,
          date: todayWorkout.date,
          is_completed: todayWorkout.is_completed,
          name: todayWorkout.name || undefined,
          notes: todayWorkout.notes || undefined,
          exercises: (todayWorkout.workout_exercises || []).map(ex => ({
            id: ex.id,
            name: ex.name,
            sets: ex.sets,
            reps: ex.reps,
            weight: ex.weight,
            volume: ex.volume,
            notes: ex.notes || undefined,
          })).sort((a, b) => (a as any).order_index - (b as any).order_index)
        });
      } else {
        setCurrentWorkout(null);
      }

    } catch (error) {
      console.error('Error loading workouts:', error);
      Alert.alert('Error', `Failed to load workouts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [user, selectedDate]);

  // Load exercise suggestions
  const loadExerciseSuggestions = useCallback(async (query: string) => {
    if (!user || query.length < 2) {
      setExerciseSuggestions([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('exercise_history')
        .select('exercise_name')
        .eq('user_id', user.id)
        .ilike('exercise_name', `%${query}%`)
        .order('use_count', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Exercise history error:', error);
        if (error.code === '42P01') {
          // Table doesn't exist, use empty suggestions
          setExerciseSuggestions([]);
          return;
        }
        throw error;
      }
      setExerciseSuggestions(data?.map(d => d.exercise_name) || []);
    } catch (error) {
      console.error('Error loading exercise suggestions:', error);
      setExerciseSuggestions([]);
    }
  }, [user]);

  // Load progress data
  const loadProgressData = useCallback(async () => {
    if (!user || !selectedExercise) return;

    try {
      // First try the RPC function
      const { data, error } = await supabase.rpc('get_workout_volume_data', {
        p_user_id: user.id,
        p_exercise_name: selectedExercise,
        p_days_back: daysPeriod
      });

      if (error) {
        console.error('RPC function error:', error);
        if (error.code === '42883') {
          // Function doesn't exist, show helpful message
          Alert.alert(
            'Database Function Missing', 
            'The workout analytics function needs to be created. Please run the complete SQL migration.',
            [{ text: 'OK' }]
          );
          return;
        }
        throw error;
      }
      setVolumeData(data || []);
    } catch (error) {
      console.error('Error loading progress data:', error);
      // Don't show alert for progress data errors, just log them
    }
  }, [user, selectedExercise, daysPeriod]);

  // Load available exercises for progress dropdown
  const loadAvailableExercises = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('exercise_history')
        .select('exercise_name')
        .eq('user_id', user.id)
        .order('use_count', { ascending: false });

      if (error) {
        console.error('Available exercises error:', error);
        if (error.code === '42P01') {
          // Table doesn't exist, use empty list
          setAvailableExercises([]);
          return;
        }
        throw error;
      }
      setAvailableExercises(data?.map(d => d.exercise_name) || []);
    } catch (error) {
      console.error('Error loading available exercises:', error);
      setAvailableExercises([]);
    }
  }, [user]);

  // Effects
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        testDatabaseConnection().then((success) => {
          if (success) {
            loadWorkouts();
            loadAvailableExercises();
          } else {
            setLoading(false);
          }
        });
      }
    }, [isAuthenticated, testDatabaseConnection, loadWorkouts, loadAvailableExercises])
  );

  useEffect(() => {
    if (selectedExercise) {
      loadProgressData();
    }
  }, [selectedExercise, daysPeriod, loadProgressData]);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      loadExerciseSuggestions(exerciseName);
    }, 300);
    return () => clearTimeout(delayedSearch);
  }, [exerciseName, loadExerciseSuggestions]);

  // Create or update workout
  const saveWorkout = async (isCompleted = false) => {
    if (!user) return;

    try {
      let workoutId = currentWorkout?.id;

      if (!workoutId) {
        // Create new workout
        const { data: newWorkout, error: workoutError } = await supabase
          .from('workouts')
          .insert({
            user_id: user.id,
            date: selectedDate,
            is_completed: isCompleted,
            name: `Workout ${selectedDate}`,
          })
          .select()
          .single();

        if (workoutError) throw workoutError;
        workoutId = newWorkout.id;
      } else if (currentWorkout && isCompleted !== currentWorkout.is_completed) {
        // Update completion status
        const { error: updateError } = await supabase
          .from('workouts')
          .update({ is_completed: isCompleted })
          .eq('id', workoutId);

        if (updateError) throw updateError;
      }

      await loadWorkouts();
      Alert.alert('Success', isCompleted ? 'Workout completed!' : 'Workout saved!');
    } catch (error) {
      console.error('Error saving workout:', error);
      Alert.alert('Error', 'Failed to save workout');
    }
  };

  // Add exercise to workout
  const addExercise = async () => {
    if (!exerciseName.trim() || !currentWorkout) return;

    try {
      const { error } = await supabase
        .from('workout_exercises')
        .insert({
          workout_id: currentWorkout.id,
          name: exerciseName.trim(),
          sets: parseInt(exerciseSets) || 1,
          reps: parseInt(exerciseReps) || 1,
          weight: parseFloat(exerciseWeight) || 0,
          notes: exerciseNotes.trim() || null,
          order_index: currentWorkout.exercises.length,
        });

      if (error) throw error;

      // Reset form
      setExerciseName('');
      setExerciseSets('3');
      setExerciseReps('10');
      setExerciseWeight('0');
      setExerciseNotes('');
      setShowExerciseForm(false);

      await loadWorkouts();
    } catch (error) {
      console.error('Error adding exercise:', error);
      Alert.alert('Error', 'Failed to add exercise');
    }
  };

  // Start new workout
  const startNewWorkout = async () => {
    if (!user) return;

    try {
      const { data: newWorkout, error } = await supabase
        .from('workouts')
        .insert({
          user_id: user.id,
          date: selectedDate,
          is_completed: false,
          name: `Workout ${selectedDate}`,
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentWorkout({
        id: newWorkout.id,
        date: newWorkout.date,
        is_completed: false,
        name: newWorkout.name || undefined,
        exercises: []
      });
    } catch (error) {
      console.error('Error creating workout:', error);
      Alert.alert('Error', 'Failed to create workout');
    }
  };

  // Delete exercise
  const deleteExercise = async (exerciseId: string) => {
    try {
      const { error } = await supabase
        .from('workout_exercises')
        .delete()
        .eq('id', exerciseId);

      if (error) throw error;
      await loadWorkouts();
    } catch (error) {
      console.error('Error deleting exercise:', error);
      Alert.alert('Error', 'Failed to delete exercise');
    }
  };

  // Render functions
  const renderTodayTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Today's Workout - {selectedDate}
        </Text>
        
        {currentWorkout ? (
          <View>
            <View style={styles.workoutHeader}>
              <Text style={[styles.workoutTitle, { color: colors.text }]}>
                {currentWorkout.name || 'Untitled Workout'}
              </Text>
              {currentWorkout.is_completed && (
                <View style={styles.completedBadge}>
                  <CheckCircle size={16} color="#4CAF50" />
                  <Text style={styles.completedText}>Completed</Text>
                </View>
              )}
            </View>

            {/* Exercises List */}
            {currentWorkout.exercises.map((exercise) => (
              <View key={exercise.id} style={[styles.exerciseItem, { backgroundColor: colors.background }]}>
                <View style={styles.exerciseHeader}>
                  <Text style={[styles.exerciseName, { color: colors.text }]}>{exercise.name}</Text>
                  <TouchableOpacity onPress={() => deleteExercise(exercise.id)}>
                    <Trash2 size={16} color={colors.error} />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.exerciseDetails, { color: colors.textSecondary }]}>
                  {exercise.sets} sets × {exercise.reps} reps @ {exercise.weight}kg
                </Text>
                <Text style={[styles.exerciseVolume, { color: colors.tint }]}>
                  Volume: {exercise.volume}kg
                </Text>
                {exercise.notes && (
                  <Text style={[styles.exerciseNotes, { color: colors.textSecondary }]}>
                    Notes: {exercise.notes}
                  </Text>
                )}
              </View>
            ))}

            {/* Add Exercise Button */}
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.tint }]}
              onPress={() => setShowExerciseForm(true)}
            >
              <Plus size={20} color="#fff" />
              <Text style={styles.addButtonText}>Add Exercise</Text>
            </TouchableOpacity>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <ThemedButton
                title="Save Workout"
                onPress={() => saveWorkout(false)}
                variant="secondary"
                style={styles.actionButton}
              />
              <ThemedButton
                title="Complete Workout"
                onPress={() => saveWorkout(true)}
                variant="primary"
                style={styles.actionButton}
              />
            </View>
          </View>
        ) : (
          <View style={styles.noWorkout}>
            <Dumbbell size={48} color={colors.textSecondary} />
            <Text style={[styles.noWorkoutText, { color: colors.textSecondary }]}>
              No workout planned for today
            </Text>
            <ThemedButton
              title="Start New Workout"
              onPress={startNewWorkout}
              variant="primary"
              style={styles.startButton}
            />
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderCalendarTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Workout Calendar</Text>
        <Calendar
          current={selectedDate}
          onDayPress={(day) => setSelectedDate(day.dateString)}
          markedDates={{
            ...workoutDates,
            [selectedDate]: {
              ...workoutDates[selectedDate],
              selected: true,
              selectedColor: colors.tint,
            },
          }}
          theme={{
            backgroundColor: colors.background,
            calendarBackground: colors.background,
            textSectionTitleColor: colors.text,
            selectedDayBackgroundColor: colors.tint,
            selectedDayTextColor: '#ffffff',
            todayTextColor: colors.tint,
            dayTextColor: colors.text,
            textDisabledColor: colors.textSecondary,
            dotColor: colors.tint,
            selectedDotColor: '#ffffff',
            arrowColor: colors.tint,
            monthTextColor: colors.text,
            indicatorColor: colors.tint,
          }}
        />
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={[styles.legendText, { color: colors.text }]}>Completed</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
            <Text style={[styles.legendText, { color: colors.text }]}>Planned</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderProgressTab = () => {
    const chartData = {
      labels: volumeData.map(d => new Date(d.workout_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      datasets: [{
        data: volumeData.map(d => parseFloat(d.total_volume.toString())),
        strokeWidth: 2,
        color: (opacity = 1) => colors.tint,
      }],
    };

    return (
      <ScrollView style={styles.tabContent}>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Progress Tracking</Text>
          
          {/* Exercise Selection */}
          <View style={styles.filterContainer}>
            <Text style={[styles.filterLabel, { color: colors.text }]}>Exercise:</Text>
            <View style={styles.pickerContainer}>
              {availableExercises.length > 0 ? (
                availableExercises.map((exercise) => (
                  <TouchableOpacity
                    key={exercise}
                    style={[
                      styles.exerciseChip,
                      { 
                        backgroundColor: selectedExercise === exercise ? colors.tint : colors.background,
                        borderColor: colors.border 
                      }
                    ]}
                    onPress={() => setSelectedExercise(exercise)}
                  >
                    <Text style={[
                      styles.exerciseChipText,
                      { color: selectedExercise === exercise ? '#fff' : colors.text }
                    ]}>
                      {exercise}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={[styles.noDataText, { color: colors.textSecondary }]}>
                  Complete some workouts to see exercise options
                </Text>
              )}
            </View>
          </View>

          {/* Time Period Selection */}
          <View style={styles.filterContainer}>
            <Text style={[styles.filterLabel, { color: colors.text }]}>Time Period:</Text>
            <View style={styles.periodButtons}>
              {[7, 30, 90].map((days) => (
                <TouchableOpacity
                  key={days}
                  style={[
                    styles.periodButton,
                    {
                      backgroundColor: daysPeriod === days ? colors.tint : colors.background,
                      borderColor: colors.border,
                    }
                  ]}
                  onPress={() => setDaysPeriod(days)}
                >
                  <Text style={[
                    styles.periodButtonText,
                    { color: daysPeriod === days ? '#fff' : colors.text }
                  ]}>
                    {days}d
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Chart or No Data */}
          {selectedExercise && volumeData.length > 0 ? (
            <View style={styles.chartContainer}>
              <Text style={[styles.chartTitle, { color: colors.text }]}>
                Volume Progress - {selectedExercise}
              </Text>
              
              {/* Chart Component with Error Boundary */}
              {(() => {
                try {
                  return (
                    <LineChart
                      data={chartData}
                      width={screenWidth - 60}
                      height={220}
                      chartConfig={{
                        backgroundColor: colors.background,
                        backgroundGradientFrom: colors.background,
                        backgroundGradientTo: colors.background,
                        decimalPlaces: 0,
                        color: (opacity = 1) => colors.tint,
                        labelColor: (opacity = 1) => colors.text,
                        style: {
                          borderRadius: 16,
                        },
                        propsForDots: {
                          r: '4',
                          strokeWidth: '2',
                          stroke: colors.tint,
                        },
                      }}
                      bezier
                      style={styles.chart}
                    />
                  );
                } catch (error) {
                  console.error('Chart rendering error:', error);
                  return (
                    <View style={styles.noDataContainer}>
                      <BarChart3 size={48} color={colors.textSecondary} />
                      <Text style={[styles.noDataText, { color: colors.textSecondary }]}>
                        Chart temporarily unavailable
                      </Text>
                      <Text style={[styles.noDataText, { color: colors.textSecondary, fontSize: 12 }]}>
                        Data: {volumeData.length} workouts tracked
                      </Text>
                    </View>
                  );
                }
              })()}
              
              {/* Data Summary */}
              <View style={{ marginTop: 16, padding: 12, backgroundColor: colors.background, borderRadius: 8 }}>
                <Text style={[styles.filterLabel, { color: colors.text, marginBottom: 8 }]}>Summary:</Text>
                <Text style={[styles.noDataText, { color: colors.textSecondary, fontSize: 14 }]}>
                  Total Volume: {volumeData.reduce((sum, d) => sum + parseFloat(d.total_volume.toString()), 0).toFixed(0)}kg
                </Text>
                <Text style={[styles.noDataText, { color: colors.textSecondary, fontSize: 14 }]}>
                  Workouts: {volumeData.length}
                </Text>
                <Text style={[styles.noDataText, { color: colors.textSecondary, fontSize: 14 }]}>
                  Max Weight: {Math.max(...volumeData.map(d => parseFloat(d.max_weight.toString())))}kg
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.noDataContainer}>
              <BarChart3 size={48} color={colors.textSecondary} />
              <Text style={[styles.noDataText, { color: colors.textSecondary }]}>
                {selectedExercise ? 'No data available for selected period' : 'Select an exercise to view progress'}
              </Text>
              {!selectedExercise && availableExercises.length === 0 && (
                <Text style={[styles.noDataText, { color: colors.textSecondary, fontSize: 12, marginTop: 8 }]}>
                  Complete some workouts first to see progress charts
                </Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Tab Navigation */}
      <View style={[styles.tabBar, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'today' && { backgroundColor: colors.tint }]}
          onPress={() => setActiveTab('today')}
        >
          <Play size={20} color={activeTab === 'today' ? '#fff' : colors.text} />
          <Text style={[styles.tabText, { color: activeTab === 'today' ? '#fff' : colors.text }]}>
            Today
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'calendar' && { backgroundColor: colors.tint }]}
          onPress={() => setActiveTab('calendar')}
        >
          <CalendarIcon size={20} color={activeTab === 'calendar' ? '#fff' : colors.text} />
          <Text style={[styles.tabText, { color: activeTab === 'calendar' ? '#fff' : colors.text }]}>
            Calendar
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'progress' && { backgroundColor: colors.tint }]}
          onPress={() => setActiveTab('progress')}
        >
          <TrendingUp size={20} color={activeTab === 'progress' ? '#fff' : colors.text} />
          <Text style={[styles.tabText, { color: activeTab === 'progress' ? '#fff' : colors.text }]}>
            Progress
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'today' && renderTodayTab()}
      {activeTab === 'calendar' && renderCalendarTab()}
      {activeTab === 'progress' && renderProgressTab()}

      {/* Add Exercise Modal */}
      <Modal
        visible={showExerciseForm}
        transparent
        animationType="slide"
        onRequestClose={() => setShowExerciseForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Exercise</Text>
            
            <ThemedInput
              placeholder="Exercise name"
              value={exerciseName}
              onChangeText={setExerciseName}
              style={styles.input}
            />
            
            {exerciseSuggestions.length > 0 && (
              <View style={styles.suggestions}>
                {exerciseSuggestions.map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.suggestionItem, { backgroundColor: colors.background }]}
                    onPress={() => {
                      setExerciseName(suggestion);
                      setExerciseSuggestions([]);
                    }}
                  >
                    <Text style={[styles.suggestionText, { color: colors.text }]}>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            
            <View style={styles.row}>
              <ThemedInput
                placeholder="Sets"
                value={exerciseSets}
                onChangeText={setExerciseSets}
                keyboardType="numeric"
                style={[styles.input, styles.smallInput]}
              />
              <ThemedInput
                placeholder="Reps"
                value={exerciseReps}
                onChangeText={setExerciseReps}
                keyboardType="numeric"
                style={[styles.input, styles.smallInput]}
              />
              <ThemedInput
                placeholder="Weight (kg)"
                value={exerciseWeight}
                onChangeText={setExerciseWeight}
                keyboardType="numeric"
                style={[styles.input, styles.smallInput]}
              />
            </View>
            
            <ThemedInput
              placeholder="Notes (optional)"
              value={exerciseNotes}
              onChangeText={setExerciseNotes}
              multiline
              style={[styles.input, styles.notesInput]}
            />
            
            <View style={styles.modalButtons}>
              <ThemedButton
                title="Cancel"
                onPress={() => setShowExerciseForm(false)}
                variant="secondary"
                style={styles.modalButton}
              />
              <ThemedButton
                title="Add Exercise"
                onPress={addExercise}
                variant="primary"
                style={styles.modalButton}
              />
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  tabText: {
    marginLeft: 8,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  workoutTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completedText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  exerciseItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
  },
  exerciseDetails: {
    fontSize: 14,
    marginBottom: 4,
  },
  exerciseVolume: {
    fontSize: 14,
    fontWeight: '600',
  },
  exerciseNotes: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  noWorkout: {
    alignItems: 'center',
    padding: 32,
  },
  noWorkoutText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 16,
  },
  startButton: {
    marginTop: 8,
    minWidth: 200,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  exerciseChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  exerciseChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  periodButtons: {
    flexDirection: 'row',
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  chartContainer: {
    marginTop: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  chart: {
    borderRadius: 16,
  },
  noDataContainer: {
    alignItems: 'center',
    padding: 32,
  },
  noDataText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    marginBottom: 12,
  },
  suggestions: {
    maxHeight: 120,
    marginBottom: 12,
  },
  suggestionItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  suggestionText: {
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  smallInput: {
    flex: 1,
    marginHorizontal: 4,
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 4,
  },
}); 