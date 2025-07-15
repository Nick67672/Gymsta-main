import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
  Platform,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedInput } from '@/components/ThemedInput';
import WorkoutCalendar from '@/components/WorkoutCalendar';
import WorkoutSession from '@/components/WorkoutSession';
import ProgressCharts from '@/components/ProgressCharts';
import { 
  Plus, 
  Play, 
  Calendar,
  TrendingUp,
  Dumbbell,
  Target,
  Clock,
  ChevronDown,
  ChevronLeft,
  Edit3,
  Trash2,
  CheckCircle,
  X,
  Minus,
  Search,
} from 'lucide-react-native';
import { LineChart } from 'react-native-chart-kit';
import { EXERCISE_OPTIONS } from '@/constants/ExerciseOptions';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width: screenWidth } = Dimensions.get('window');

// Types
interface WorkoutSet {
  id: string;
  reps: number;
  weight: number;
  completed: boolean;
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

interface ProgressData {
  volume: { date: string; value: number }[];
  weight: { date: string; exercise: string; value: number }[];
  streak: number;
  oneRM: { exercise: string; value: number }[];
}

type TimeScale = '7d' | '30d' | '3m' | '1y';

export default function WorkoutTrackerScreen() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { user } = useAuth();

  // Main state
  const [currentView, setCurrentView] = useState<'main' | 'create' | 'calendar' | 'session'>('main');
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [currentWorkout, setCurrentWorkout] = useState<Workout | null>(null);
  const [progressData, setProgressData] = useState<ProgressData>({
    volume: [],
    weight: [],
    streak: 0,
    oneRM: []
  });
  const [timeScale, setTimeScale] = useState<TimeScale>('30d');
  const [loading, setLoading] = useState(false);
  const [selectedWorkoutFilter, setSelectedWorkoutFilter] = useState<string | null>(null);

  // Modals
  const [showTimeScaleModal, setShowTimeScaleModal] = useState(false);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [showExercisePickerModal, setShowExercisePickerModal] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showEditWorkoutModal, setShowEditWorkoutModal] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [showInlineExerciseForm, setShowInlineExerciseForm] = useState(false);
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState('');

  // Form states
  const [workoutName, setWorkoutName] = useState('');
  const [workoutDate, setWorkoutDate] = useState(new Date().toISOString().split('T')[0]);
  const [exerciseName, setExerciseName] = useState('');
  const [setsList, setSetsList] = useState<{ reps: string; weight: string }[]>([{ reps: '0', weight: '0' }]);

  // Load data on mount
  useEffect(() => {
    if (user) {
      loadWorkouts();
      loadProgressData();
    }
  }, [user, timeScale, selectedWorkoutFilter]);

  // Load workouts
  const loadWorkouts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Load planned workouts for main screen display
      const { data: plannedData, error: plannedError } = await supabase
        .from('planned_workouts')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true });
      
      if (plannedError) throw plannedError;
      
      const transformedPlannedWorkouts = plannedData?.map(w => ({
        id: w.id,
        name: w.name || 'Planned Workout',
        date: w.date,
        exercises: (w.exercises || []).map((e: any) => ({
          id: e.id || Date.now().toString(),
          name: e.name,
          sets: (e.sets || []).map((s: any) => ({
            id: s.id || Date.now().toString(),
            reps: s.reps || 0,
            weight: s.weight || 0,
            completed: s.completed || false
          })),
          targetSets: e.targetSets || e.sets?.length || 3,
          targetReps: e.targetReps || 10,
          targetWeight: e.targetWeight || 0,
          notes: e.notes
        })),
        status: 'planned' as 'planned' | 'in_progress' | 'completed',
        notes: w.notes
      })) || [];
      
      setWorkouts(transformedPlannedWorkouts);
      
      console.log('Loaded planned workouts:', transformedPlannedWorkouts.length);
      
    } catch (error) {
      console.error('Error loading planned workouts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load progress data
  const loadProgressData = async () => {
    if (!user) return;
    
    try {
      const days = timeScale === '7d' ? 7 : timeScale === '30d' ? 30 : timeScale === '3m' ? 90 : 365;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      // Load COMPLETED workout data for progress using the workouts table
      const { data, error } = await supabase
        .from('workouts')
        .select('date, exercises, total_volume, duration_minutes, name')
        .eq('user_id', user.id)
        .eq('is_completed', true)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });
      
      if (error) throw error;
      
      // Filter by selected workout if a filter is applied
      let filteredData = data || [];
      if (selectedWorkoutFilter) {
        const selectedWorkout = workouts.find(w => w.id === selectedWorkoutFilter);
        if (selectedWorkout) {
          filteredData = filteredData.filter(workout => 
            workout.name === selectedWorkout.name
          );
        }
      }
      
      console.log('Loaded completed workouts for progress:', filteredData.length);
      
      // Process data for charts
      const volumeData: { date: string; value: number }[] = [];
      const weightData: { date: string; exercise: string; value: number }[] = [];
      const oneRMData: { exercise: string; value: number }[] = [];
      
      filteredData.forEach(workout => {
        // Calculate total volume from exercises JSONB
        let totalVolume = 0;
        
        if (workout.exercises && Array.isArray(workout.exercises)) {
          workout.exercises.forEach((exercise: any) => {
            if (exercise.sets && Array.isArray(exercise.sets)) {
              exercise.sets.forEach((set: any) => {
                if (set.completed) { // Only count completed sets
                  const volume = (set.reps || 0) * (set.weight || 0);
                  totalVolume += volume;
                }
              });
            }
          });
        }
        
        // Use calculated volume or stored total_volume
        const volume = workout.total_volume || totalVolume;
        
        volumeData.push({
          date: workout.date,
          value: volume
        });
      });
      
      // Calculate workout streak
      const streak = calculateWorkoutStreak(filteredData || []);
      
      setProgressData({
        volume: volumeData,
        weight: weightData,
        streak,
        oneRM: oneRMData
      });
      
    } catch (error) {
      console.error('Error loading progress data:', error);
    }
  };

  // Calculate 1RM using Epley formula
  const calculateOneRM = (weight: number, reps: number): number => {
    if (reps === 1) return weight;
    return weight * (1 + reps / 30);
  };

  // Calculate workout streak
  const calculateWorkoutStreak = (workouts: any[]): number => {
    if (!workouts.length) return 0;
    
    let streak = 0;
    const today = new Date();
    let currentDate = new Date(today);
    
    for (let i = 0; i < 365; i++) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const hasWorkout = workouts.some(w => w.date === dateStr);
      
      if (hasWorkout) {
        streak++;
      } else if (streak > 0) {
        break;
      }
      
      currentDate.setDate(currentDate.getDate() - 1);
    }
    
    return streak;
  };

  // Create new workout
  const createNewWorkout = () => {
    const newWorkout: Workout = {
      id: Date.now().toString(),
      name: workoutName || `Workout ${new Date(workoutDate).toLocaleDateString()}`,
      date: workoutDate,
      exercises: [],
      status: 'planned'
    };
    
    setCurrentWorkout(newWorkout);
    setWorkoutName('');
    setCurrentView('create');
    setShowDatePicker(false);
  };

  // Add exercise to current workout
  const addExerciseToWorkout = () => {
    console.log('addExerciseToWorkout called');
    console.log('currentWorkout:', currentWorkout);
    console.log('exerciseName:', exerciseName);
    console.log('setsList:', setsList);
    
    if (!currentWorkout) {
      console.log('currentWorkout is null, cannot add exercise');
      Alert.alert('Error', 'No workout selected. Please create a workout first.');
      return;
    }
    
    if (!exerciseName.trim()) {
      console.log('exerciseName is empty, cannot add exercise');
      Alert.alert('Error', 'Please enter an exercise name.');
      return;
    }
    
    const setsArr = setsList.map((s, idx) => ({
      id: `${Date.now()}-${idx}`,
      reps: parseInt(s.reps) || 0,
      weight: parseFloat(s.weight) || 0,
      completed: false,
    }));

    const newExercise: Exercise = {
      id: Date.now().toString(),
      name: exerciseName.trim(),
      sets: setsArr,
      targetSets: setsArr.length,
      targetReps: setsArr[0]?.reps || 0,
      targetWeight: setsArr[0]?.weight || 0,
    };
    
    console.log('Adding new exercise:', newExercise);
    
    setCurrentWorkout(prev => prev ? {
      ...prev,
      exercises: [...prev.exercises, newExercise]
    } : null);
    
    // Reset form
    setExerciseName('');
    setSetsList([{ reps: '0', weight: '0' }]);
    setShowExerciseModal(false);
  };

  // Add another identical set to a planned exercise (clone last set)
  const addSetToExercise = (exerciseId: string) => {
    setCurrentWorkout(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map(ex => {
          if (ex.id !== exerciseId) return ex;
          const last = ex.sets[ex.sets.length - 1];
          const newSet = {
            id: `${Date.now()}`,
            reps: last?.reps || 0,
            weight: last?.weight || 0,
            completed: false,
          };
          return { ...ex, sets: [...ex.sets, newSet], targetSets: ex.sets.length + 1 };
        })
      };
    });
  };

  // Save workout to database
  const saveWorkout = async () => {
    if (!currentWorkout || !user) return;
    
    setLoading(true);
    try {
      // Format exercises for JSONB storage
      const formattedExercises = currentWorkout.exercises.map(exercise => ({
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

      console.log('Saving planned workout with data:', {
        user_id: user.id,
        name: currentWorkout.name || 'Planned Workout',
        date: currentWorkout.date,
        exerciseCount: formattedExercises.length
      });

      // Save workout to the planned_workouts table
      const { data: workoutData, error: workoutError } = await supabase
        .from('planned_workouts')
        .insert({
          user_id: user.id,
          name: currentWorkout.name || 'Planned Workout',
          date: currentWorkout.date,
          exercises: formattedExercises,
          notes: currentWorkout.notes || null
        })
        .select()
        .single();
      
      console.log('Planned workout save result:', { workoutData, workoutError });
      
      if (workoutError) throw workoutError;
      
      setCurrentWorkout(null);
      setCurrentView('main');
      loadWorkouts();
      Alert.alert('Success', 'Planned workout saved successfully!');
      
    } catch (error) {
      console.error('Error saving planned workout:', error);
      Alert.alert('Error', 'Failed to save planned workout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Start workout session
  const startWorkoutSession = async (workout: Workout) => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to start a workout.');
      return;
    }

    console.log('Starting workout session for workout:', workout.id);
    console.log('User ID:', user.id);

    try {
      setLoading(true);
      
      // Don't save to database yet - just start the session
      // The workout will be saved when they press "Finish"
      console.log('Starting workout session locally (not saving to DB yet)...');
      
      // Generate a new unique ID for this workout session
      const sessionId = `workout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Start the workout session with a new ID
      setCurrentWorkout({
        ...workout,
        id: sessionId, // Use new unique ID for this session
        status: 'in_progress',
        startTime: new Date()
      });
      setCurrentView('session');
      
    } catch (error) {
      console.error('Error starting workout session:', error);
      Alert.alert('Error', `Failed to start workout: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // update a planned set value
  const updatePlannedSet = (
    exerciseId: string,
    setIndex: number,
    field: 'reps' | 'weight',
    value: number
  ) => {
    setCurrentWorkout(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map(ex => {
          if (ex.id !== exerciseId) return ex;
          return {
            ...ex,
            sets: ex.sets.map((s, idx) => idx === setIndex ? { ...s, [field]: value } : s)
          };
        })
      };
    });
  };

  const removePlannedSet = (exerciseId: string, setIndex: number) => {
    setCurrentWorkout(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map(ex => {
          if (ex.id !== exerciseId) return ex;
          const newSets = ex.sets.filter((_, idx) => idx !== setIndex);
          return { ...ex, sets: newSets, targetSets: newSets.length };
        })
      };
    });
  };

  // plus: define startNewWorkoutCreation before renderMainScreen
  const startNewWorkoutCreation = () => {
    console.log('startNewWorkoutCreation called');
    const todayIso = new Date().toISOString().split('T')[0];
    setWorkoutName('');
    setWorkoutDate(todayIso);
    const newWorkout: Workout = {
      id: Date.now().toString(),
      name: '',
      date: todayIso,
      exercises: [],
      status: 'planned'
    };
    console.log('Creating new workout:', newWorkout);
    setCurrentWorkout(newWorkout);
    setCurrentView('create');
  };

  // Edit workout functions
  const addExerciseToEditingWorkout = () => {
    console.log('addExerciseToEditingWorkout called');
    
    if (!editingWorkout) {
      Alert.alert('Error', 'No workout selected for editing.');
      return;
    }
    
    if (!exerciseName.trim()) {
      Alert.alert('Error', 'Please enter an exercise name.');
      return;
    }
    
    const setsArr = setsList.map((s, idx) => ({
      id: `${Date.now()}-${idx}`,
      reps: parseInt(s.reps) || 0,
      weight: parseFloat(s.weight) || 0,
      completed: false,
    }));

    const newExercise: Exercise = {
      id: Date.now().toString(),
      name: exerciseName.trim(),
      sets: setsArr,
      targetSets: setsArr.length,
      targetReps: setsArr[0]?.reps || 0,
      targetWeight: setsArr[0]?.weight || 0,
    };
    
    console.log('Adding exercise to editingWorkout:', newExercise.name);
    
    setEditingWorkout(prev => prev ? {
      ...prev,
      exercises: [...prev.exercises, newExercise]
    } : null);
    
    // Reset form and hide inline form
    setExerciseName('');
    setSetsList([{ reps: '0', weight: '0' }]);
    setShowInlineExerciseForm(false);
  };

  const removeExerciseFromEditingWorkout = (exerciseId: string) => {
    setEditingWorkout(prev => prev ? {
      ...prev,
      exercises: prev.exercises.filter(e => e.id !== exerciseId)
    } : null);
  };

  const saveEditedWorkout = async () => {
    if (!editingWorkout || !user) return;
    
    setLoading(true);
    try {
      // Format exercises for JSONB storage
      const formattedExercises = editingWorkout.exercises.map(exercise => ({
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

      console.log('Updating planned workout with data:', {
        id: editingWorkout.id,
        name: editingWorkout.name,
        exerciseCount: formattedExercises.length
      });

      // Update workout in the planned_workouts table
      const { error: workoutError } = await supabase
        .from('planned_workouts')
        .update({
          name: editingWorkout.name,
          exercises: formattedExercises,
          notes: editingWorkout.notes || null
        })
        .eq('id', editingWorkout.id);
      
      if (workoutError) throw workoutError;
      
      setEditingWorkout(null);
      setShowEditWorkoutModal(false);
      setShowInlineExerciseForm(false);
      loadWorkouts();
      Alert.alert('Success', 'Workout updated successfully!');
      
    } catch (error) {
      console.error('Error updating planned workout:', error);
      Alert.alert('Error', 'Failed to update workout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Render main tracker screen
  const renderMainScreen = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push('/fitness')}
          >
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.headerCenter}>
          <Text style={[styles.title, { color: colors.text }]}>Workout Tracker</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.card }]}
            onPress={() => setShowCalendar(true)}
          >
            <Calendar size={24} color={colors.tint} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.planWorkoutButton, { backgroundColor: colors.tint }]}
            onPress={startNewWorkoutCreation}
          >
            <Text style={styles.planWorkoutButtonText}>Plan workout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Planned Workouts Cards */}
        {workouts.length > 0 ? (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Planned Workouts
            </Text>
            <View style={styles.workoutGrid}>
              {workouts.map((workout) => (
                <View key={workout.id} style={[styles.workoutGridCard, { backgroundColor: colors.card }]}>
                  <View style={styles.workoutCardHeader}>
                    <TouchableOpacity
                      style={styles.editIconButton}
                      onPress={() => {
                        setEditingWorkout(workout);
                        setShowEditWorkoutModal(true);
                      }}
                    >
                      <Edit3 size={16} color={colors.text + '60'} />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.workoutGridTitle, { color: colors.text }]}>
                    {workout.name}
                  </Text>
                  <TouchableOpacity
                    style={[styles.beginWorkoutButton, { backgroundColor: colors.tint }]}
                    onPress={() => startWorkoutSession(workout)}
                  >
                    <Play size={16} color="white" />
                    <Text style={styles.beginWorkoutButtonText}>Begin Workout</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </>
        ) : (
          <View style={[styles.emptyStateCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              No workouts planned
            </Text>
            <Text style={[styles.cardSubtitle, { color: colors.text }]}>
              Ready to get started?
            </Text>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.tint }]}
              onPress={startNewWorkoutCreation}
            >
              <Plus size={20} color="white" />
              <Text style={styles.primaryButtonText}>Plan Your First Workout</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Progress Section */}
        <ProgressCharts
          data={progressData}
          timeScale={timeScale}
          onTimeScalePress={() => setShowTimeScaleModal(true)}
          plannedWorkouts={workouts.map(w => ({ id: w.id, name: w.name }))}
          selectedWorkoutFilter={selectedWorkoutFilter}
          onWorkoutFilterChange={setSelectedWorkoutFilter}
        />
      </ScrollView>
    </View>
  );

  // Render workout creation screen
  const renderCreateScreen = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setCurrentView('main')}>
          <X size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Create Workout</Text>
        <View style={{width:24}} />
      </View>

      <ScrollView style={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text, marginBottom:8 }]}>Workout Details</Text>
          <ThemedInput
            placeholder="Workout name"
            value={workoutName}
            onChangeText={(text)=>{
              setWorkoutName(text);
              setCurrentWorkout(prev=> prev?{...prev, name:text}:prev);
            }}
            style={styles.modalInput}
          />

          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.tint, marginTop:16 }]}
            onPress={() => {
              if (!currentWorkout) {
                Alert.alert('No workout in progress', 'Please start a new workout before adding exercises.');
                return;
              }
              setExerciseName('');
              setSetsList([{ reps: '0', weight: '0' }]);
              setShowExerciseModal(true);
            }}
          >
            <Plus size={20} color="white" />
            <Text style={styles.addButtonText}>Add Exercise</Text>
          </TouchableOpacity>
        </View>

        {/* Exercises List */}
        {currentWorkout?.exercises.map((exercise) => (
          <View key={exercise.id} style={[styles.exerciseCard, { backgroundColor: colors.card }]}>
            {/* Header with delete */}
            <View style={styles.exerciseHeader}>
              <Text style={[styles.exerciseName, { color: colors.text }]}>{exercise.name}</Text>
              <TouchableOpacity onPress={() => {
                setCurrentWorkout(prev => prev ? { ...prev, exercises: prev.exercises.filter(e => e.id !== exercise.id) } : null);
              }}>
                <Trash2 size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Sets table */}
            <View style={styles.setTableHeader}>
              <Text style={[styles.setColHeader, { color: colors.text }]}>Set</Text>
              <Text style={[styles.setColHeader, { color: colors.text }]}>Reps</Text>
              <Text style={[styles.setColHeader, { color: colors.text }]}>Weight</Text>
            </View>
            {exercise.sets.map((s, idx) => (
              <View key={s.id} style={styles.setRowPlan}>
                <Text style={[styles.setCellIndex, { color: colors.text }]}>{idx + 1}</Text>
                <TextInput
                  keyboardType="numeric"
                  value={String(s.reps)}
                  onChangeText={v => updatePlannedSet(exercise.id, idx, 'reps', Number(v))}
                  style={[styles.setInputBox, { backgroundColor: colors.background, color: colors.text }]}
                />
                <TextInput
                  keyboardType="numeric"
                  value={String(s.weight)}
                  onChangeText={v => updatePlannedSet(exercise.id, idx, 'weight', Number(v))}
                  style={[styles.setInputBox, { backgroundColor: colors.background, color: colors.text }]}
                />
                {exercise.sets.length > 1 && (
                  <TouchableOpacity onPress={() => removePlannedSet(exercise.id, idx)}>
                    <Minus size={14} color={colors.tint} />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {/* Add set link */}
            <TouchableOpacity style={styles.addSetInline} onPress={() => addSetToExercise(exercise.id)}>
              <Plus size={16} color={colors.tint} />
              <Text style={styles.addSetInlineText}>Add Set</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.tint, marginVertical:24, alignSelf:'center', width:'90%' }]}
          onPress={saveWorkout}
          disabled={!currentWorkout?.exercises.length}
        >
          <CheckCircle size={20} color="white" />
          <Text style={styles.primaryButtonText}>Save Workout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  // Render modals
  const renderModals = () => (
    <>
      {/* Time Scale Modal */}
      <Modal visible={showTimeScaleModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Time Range</Text>
            
            {(['7d', '30d', '3m', '1y'] as TimeScale[]).map(scale => (
              <TouchableOpacity
                key={scale}
                style={[styles.timeScaleOption, timeScale === scale && { backgroundColor: colors.tint }]}
                onPress={() => {
                  setTimeScale(scale);
                  setShowTimeScaleModal(false);
                }}
              >
                <Text style={[styles.timeScaleOptionText, { 
                  color: timeScale === scale ? 'white' : colors.text 
                }]}>
                  {scale === '7d' ? '7 Days' : scale === '30d' ? '30 Days' : scale === '3m' ? '3 Months' : '1 Year'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Edit Workout Modal */}
      <Modal 
        visible={showEditWorkoutModal} 
        animationType="slide" 
        transparent
        key={`edit-${editingWorkout?.id || 'none'}`}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => {
                setShowEditWorkoutModal(false);
                setShowInlineExerciseForm(false);
              }}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Edit: {editingWorkout?.name}
              </Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.modalScrollContent}>
              {!showInlineExerciseForm ? (
                // Exercise List View
                <>
                  {/* Exercises List */}
                  {editingWorkout?.exercises.map((exercise) => (
                    <View key={exercise.id} style={[styles.editExerciseCard, { backgroundColor: colors.background }]}>
                      <View style={styles.exerciseHeader}>
                        <Text style={[styles.exerciseName, { color: colors.text }]}>
                          {exercise.name}
                        </Text>
                        <TouchableOpacity onPress={() => removeExerciseFromEditingWorkout(exercise.id)}>
                          <Trash2 size={18} color={colors.text} />
                        </TouchableOpacity>
                      </View>
                      <Text style={[styles.exerciseDetails, { color: colors.text }]}>
                        {exercise.sets.length} sets • {exercise.targetReps} reps • {exercise.targetWeight}kg
                      </Text>
                    </View>
                  ))}

                  {/* Add Exercise Button */}
                  <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: colors.tint, marginTop: 16 }]}
                    onPress={() => {
                      // Reset exercise form and show inline form
                      setExerciseName('');
                      setSetsList([{ reps: '0', weight: '0' }]);
                      setShowInlineExerciseForm(true);
                    }}
                  >
                    <Plus size={20} color="white" />
                    <Text style={styles.addButtonText}>Add Exercise</Text>
                  </TouchableOpacity>

                  {/* Modal Actions for Exercise List View */}
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.modalButton, { backgroundColor: colors.background }]}
                      onPress={() => {
                        setShowEditWorkoutModal(false);
                        setShowInlineExerciseForm(false);
                      }}
                    >
                      <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.modalButton, { backgroundColor: colors.tint }]}
                      onPress={() => {
                        saveEditedWorkout();
                      }}
                    >
                      <Text style={[styles.modalButtonText, { color: 'white' }]}>Save Changes</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                // Inline Exercise Form View
                <>
                  <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={() => setShowInlineExerciseForm(false)}>
                      <X size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>Add Exercise</Text>
                    <View style={{ width: 24 }} />
                  </View>

                  {/* Exercise Name Input */}
                  <TouchableOpacity
                    style={[styles.exerciseInput, { backgroundColor: colors.background }]}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    onPress={() => {
                      console.log('Inline exercise input pressed!'); // Debug log
                      setExerciseSearchQuery('');
                      setShowExercisePickerModal(true);
                    }}
                  >
                    <Text style={[styles.exerciseInputText, { color: exerciseName ? colors.text : colors.text + '80' }]}>
                      {exerciseName || 'Select exercise...'}
                    </Text>
                    <ChevronDown size={20} color={colors.text + '80'} />
                  </TouchableOpacity>

                  {/* Table Header */}
                  <View style={styles.modalLabelRow}>
                    <Text style={[styles.modalLabel, { color: colors.text }]}>Sets</Text>
                    <Text style={[styles.modalLabel, { color: colors.text }]}>Reps</Text>
                    <Text style={[styles.modalLabel, { color: colors.text }]}>Weight (kg)</Text>
                  </View>

                  {setsList.map((s, idx) => (
                    <View key={idx.toString()} style={styles.modalSetRow}>
                      <Text style={[styles.setCellIndex, { color: colors.text }]}>{idx + 1}</Text>
                      <TextInput
                        style={[styles.setInputBox, { backgroundColor: colors.background, color: colors.text }]}
                        keyboardType="numeric"
                        value={s.reps}
                        onChangeText={v => setSetsList(prev => prev.map((row,i)=> i===idx?{...row,reps:v}:row))}
                      />
                      <TextInput
                        style={[styles.setInputBox, { backgroundColor: colors.background, color: colors.text }]}
                        keyboardType="numeric"
                        value={s.weight}
                        onChangeText={v => setSetsList(prev => prev.map((row,i)=> i===idx?{...row,weight:v}:row))}
                      />
                      {setsList.length>1 && (
                        <TouchableOpacity onPress={()=> setSetsList(prev=> prev.filter((_,i)=> i!==idx))}>
                          <Minus size={14} color={colors.tint} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}

                  <TouchableOpacity style={styles.addSetInline} onPress={()=> {
                    const last=setsList[setsList.length-1];
                    setSetsList(prev=>[...prev,{ reps:last.reps, weight:last.weight }]);
                  }}>
                    <Plus size={16} color={colors.tint}/>
                    <Text style={[styles.addSetInlineText,{color:colors.tint}]}> Add Set</Text>
                  </TouchableOpacity>

                  {/* Action buttons */}
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.modalButton, { backgroundColor: colors.background }]}
                      onPress={() => {
                        setShowInlineExerciseForm(false);
                      }}
                    >
                      <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.modalButton, { backgroundColor: colors.tint }]}
                      onPress={() => {
                        addExerciseToEditingWorkout();
                        setShowInlineExerciseForm(false);
                      }}
                    >
                      <Text style={[styles.modalButtonText, { color: 'white' }]}>Add Exercise</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>

          </View>
        </View>
      </Modal>
      
            {/* Exercise Creation Modal - For creating new workouts */}
      <Modal 
        visible={showExerciseModal}
        animationType="slide" 
        transparent
        onRequestClose={() => setShowExerciseModal(false)}
        supportedOrientations={['portrait']}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => setShowExerciseModal(false)}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={(e) => e.stopPropagation()}
            style={[styles.modalContent, { backgroundColor: colors.card }]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Exercise</Text>
            
            {/* Exercise Name Input */}
            <TouchableOpacity
              style={[styles.exerciseInput, { backgroundColor: colors.background }]}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={() => {
                console.log('Exercise input pressed!'); // Debug log
                setExerciseSearchQuery('');
                setShowExercisePickerModal(true);
              }}
            >
              <Text style={[styles.exerciseInputText, { color: exerciseName ? colors.text : colors.text + '80' }]}>
                {exerciseName || 'Select exercise...'}
              </Text>
              <ChevronDown size={20} color={colors.text + '80'} />
            </TouchableOpacity>

            {/* Table Header */}
            <View style={styles.modalLabelRow}>
              <Text style={[styles.modalLabel, { color: colors.text }]}>Sets</Text>
              <Text style={[styles.modalLabel, { color: colors.text }]}>Reps</Text>
              <Text style={[styles.modalLabel, { color: colors.text }]}>Weight (kg)</Text>
            </View>

            {setsList.map((s, idx) => (
              <View key={idx.toString()} style={styles.modalSetRow}>
                <Text style={[styles.setCellIndex, { color: colors.text }]}>{idx + 1}</Text>
                <TextInput
                  style={[styles.setInputBox, { backgroundColor: colors.background, color: colors.text }]}
                  keyboardType="numeric"
                  value={s.reps}
                  onChangeText={v => setSetsList(prev => prev.map((row,i)=> i===idx?{...row,reps:v}:row))}
                />
                <TextInput
                  style={[styles.setInputBox, { backgroundColor: colors.background, color: colors.text }]}
                  keyboardType="numeric"
                  value={s.weight}
                  onChangeText={v => setSetsList(prev => prev.map((row,i)=> i===idx?{...row,weight:v}:row))}
                />
                {setsList.length>1 && (
                  <TouchableOpacity onPress={()=> setSetsList(prev=> prev.filter((_,i)=> i!==idx))}>
                    <Minus size={14} color={colors.tint} />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            <TouchableOpacity style={styles.addSetInline} onPress={()=> {
              const last=setsList[setsList.length-1];
              setSetsList(prev=>[...prev,{ reps:last.reps, weight:last.weight }]);
            }}>
              <Plus size={16} color={colors.tint}/>
              <Text style={[styles.addSetInlineText,{color:colors.tint}]}> Add Set</Text>
            </TouchableOpacity>

            {/* Action buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.background }]}
                onPress={() => {
                  setShowExerciseModal(false);
                }}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.tint }]}
                onPress={() => {
                  addExerciseToWorkout();
                }}
              >
                <Text style={[styles.modalButtonText, { color: 'white' }]}>Add Exercise</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Exercise Picker Modal - iOS Compatible */}
      <Modal
        visible={showExercisePickerModal}
        animationType="slide"
        transparent={false}
        presentationStyle="formSheet"
        onRequestClose={() => setShowExercisePickerModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={[{ flex: 1, backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                onPress={() => setShowExercisePickerModal(false)}
                activeOpacity={0.7}
                style={{ padding: 8 }}
              >
                <X size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Exercise</Text>
              <View style={{ width: 24 }} />
            </View>

            <View style={[styles.exercisePickerHeader, { backgroundColor: colors.card, marginHorizontal: 16, marginBottom: 8 }]}>
              <Search size={20} color={colors.text + '80'} />
              <TextInput
                placeholder="Search exercises..."
                placeholderTextColor={colors.text + '80'}
                style={[styles.exercisePickerSearchInput, { color: colors.text }]}
                value={exerciseSearchQuery}
                onChangeText={setExerciseSearchQuery}
                autoFocus={false}
              />
            </View>

            <FlatList
              data={EXERCISE_OPTIONS.filter(exercise => 
                exercise.toLowerCase().includes(exerciseSearchQuery.toLowerCase())
              )}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.exercisePickerItem, { 
                    backgroundColor: colors.card, 
                    marginHorizontal: 16, 
                    marginBottom: 1,
                    borderRadius: 8 
                  }]}
                  activeOpacity={0.7}
                  onPress={() => {
                    setExerciseName(item);
                    setShowExercisePickerModal(false);
                  }}
                >
                  <Text style={[styles.exercisePickerItemText, { color: colors.text }]}>{item}</Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item}
              ListEmptyComponent={() => (
                <View style={[styles.exercisePickerEmpty, { backgroundColor: colors.card, marginHorizontal: 16 }]}>
                  <Text style={[styles.exercisePickerEmptyText, { color: colors.text }]}>
                    No exercises found for "{exerciseSearchQuery}"
                  </Text>
                </View>
              )}
              showsVerticalScrollIndicator={true}
              bounces={true}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );

  // Main render
  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {currentView === 'main' && renderMainScreen()}
      {currentView === 'create' && renderCreateScreen()}
      {currentView === 'session' && currentWorkout && (
        <WorkoutSession
          workout={currentWorkout}
          onWorkoutComplete={(completedWorkout) => {
            setWorkouts(prev => prev.map(w => w.id === completedWorkout.id ? completedWorkout : w));
            setCurrentWorkout(null);
            setCurrentView('main');
            loadWorkouts();
          }}
          onClose={() => {
            setCurrentWorkout(null);
            setCurrentView('main');
          }}
        />
      )}
      
      <WorkoutCalendar
        visible={showCalendar}
        onClose={() => setShowCalendar(false)}
        onWorkoutSelect={(workout) => {
          const transformedWorkout: Workout = {
            id: workout.id,
            name: workout.name,
            date: workout.date,
            exercises: workout.exercises.map(e => ({
              id: e.id,
              name: e.name,
              sets: [],
              targetSets: e.sets || 3,
              targetReps: e.reps || 10,
              targetWeight: e.weight || 0,
              notes: e.notes
            })),
            status: workout.is_completed ? 'completed' : 'planned',
            notes: workout.notes
          };
          setCurrentWorkout(transformedWorkout);
          setCurrentView('create');
          setShowCalendar(false);
        }}
      />
      
      {renderModals()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
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
  headerLeft: {
    width: 44, // Fixed width for back button
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1, // Center the title
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  mainCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 20,
    textAlign: 'center',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeScaleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeScaleText: {
    fontSize: 14,
    fontWeight: '500',
  },
  chartsContainer: {
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  exerciseCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
  },
  exerciseDetails: {
    fontSize: 14,
    opacity: 0.7,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: screenWidth * 0.9,
    borderRadius: 16,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
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
  timeScaleOption: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 8,
  },
  timeScaleOptionText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  modalInputSmall: {
    flexGrow: 1,
    minWidth: '30%',
  },
  addSetInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    alignSelf: 'stretch',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
  },
  addSetInlineText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  modalLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  modalLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  /* --- Plan view table styles --- */
  setTableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  setColHeader: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  setRowPlan: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    alignItems: 'center',
  },
  setCellIndex: {
    width: 28,
    textAlign: 'center',
    fontSize: 13,
  },
  setInputBox: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 6,
    textAlign: 'center',
    marginHorizontal: 4,
  },
  modalSetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  datePickerField: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  planWorkoutButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planWorkoutButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  workoutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  workoutGridCard: {
    width: '48%',
    minWidth: 150,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    alignItems: 'center',
  },
  workoutGridTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  beginWorkoutButton: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  beginWorkoutButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyStateCard: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
  },
  workoutCardHeader: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  editIconButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  modalScrollContent: {
    flex: 1,
  },
  editExerciseCard: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exercisePickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  exercisePickerItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  exercisePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    marginBottom: 12,
  },
  exercisePickerSearchInput: {
    flex: 1,
    paddingVertical: 0,
    paddingHorizontal: 8,
    fontSize: 14,
  },
  exercisePickerEmpty: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  exercisePickerEmptyText: {
    fontSize: 14,
    opacity: 0.7,
  },
  exerciseInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 16,
    minHeight: 50,
  },
  exerciseInputText: {
    fontSize: 16,
    flex: 1,
  },
});