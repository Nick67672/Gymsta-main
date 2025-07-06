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
} from 'react-native';
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
  Edit3,
  Trash2,
  CheckCircle,
  X,
  Minus
} from 'lucide-react-native';
import { LineChart } from 'react-native-chart-kit';
import { AutocompleteDropdown, AutocompleteDropdownContextProvider } from 'react-native-autocomplete-dropdown';
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
  weight: { date: string; value: number }[];
  volume: { date: string; value: number }[];
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
  const [todaysWorkout, setTodaysWorkout] = useState<Workout | null>(null);
  const [currentWorkout, setCurrentWorkout] = useState<Workout | null>(null);
  const [progressData, setProgressData] = useState<ProgressData>({
    weight: [],
    volume: [],
    streak: 0,
    oneRM: []
  });
  const [timeScale, setTimeScale] = useState<TimeScale>('30d');
  const [loading, setLoading] = useState(false);

  // Modals
  const [showTimeScaleModal, setShowTimeScaleModal] = useState(false);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

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
  }, [user, timeScale]);

  // Load workouts
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
          sets: [],
          targetSets: e.sets || 3,
          targetReps: e.reps || 10,
          targetWeight: e.weight || 0,
          notes: e.notes
        })) || [],
        status: (w.is_completed ? 'completed' : 'planned') as 'planned' | 'in_progress' | 'completed',
        notes: w.notes
      })) || [];
      
      setWorkouts(transformedWorkouts);
      
      // Find today's workout
      const today = new Date().toISOString().split('T')[0];
      const todayWorkout = transformedWorkouts.find(w => w.date === today);
      setTodaysWorkout(todayWorkout || null);
      
    } catch (error) {
      console.error('Error loading workouts:', error);
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
      
      // Load workout data for progress
      const { data, error } = await supabase
        .from('workouts')
        .select(`
          date,
          workout_exercises (name, weight, reps, sets, volume)
        `)
        .eq('user_id', user.id)
        .eq('is_completed', true)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });
      
      if (error) throw error;
      
      // Process data for charts
      const volumeData: { date: string; value: number }[] = [];
      const weightData: { date: string; value: number }[] = [];
      const oneRMData: { exercise: string; value: number }[] = [];
      
      data?.forEach(workout => {
        const totalVolume = workout.workout_exercises?.reduce((sum: number, ex: any) => 
          sum + (ex.volume || 0), 0) || 0;
        const maxWeight = workout.workout_exercises?.reduce((max: number, ex: any) => 
          Math.max(max, ex.weight || 0), 0) || 0;
        
        volumeData.push({ date: workout.date, value: totalVolume });
        if (maxWeight > 0) {
          weightData.push({ date: workout.date, value: maxWeight });
        }
        
        // Calculate 1RM for each exercise
        workout.workout_exercises?.forEach((ex: any) => {
          if (ex.weight && ex.reps) {
            const oneRM = calculateOneRM(ex.weight, ex.reps);
            const existing = oneRMData.find(item => item.exercise === ex.name);
            if (!existing || oneRM > existing.value) {
              if (existing) {
                existing.value = oneRM;
              } else {
                oneRMData.push({ exercise: ex.name, value: oneRM });
              }
            }
          }
        });
      });
      
      // Calculate streak
      const streak = calculateWorkoutStreak(data || []);
      
      setProgressData({
        weight: weightData,
        volume: volumeData,
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
      const { data: workoutData, error: workoutError } = await supabase
        .from('workouts')
        .insert({
          user_id: user.id,
          name: currentWorkout.name,
          date: currentWorkout.date,
          notes: currentWorkout.notes,
          is_completed: false
        })
        .select()
        .single();
      
      if (workoutError) throw workoutError;
      
      // Save exercises
      for (const exercise of currentWorkout.exercises) {
        const { error: exerciseError } = await supabase
          .from('workout_exercises')
          .insert({
            workout_id: workoutData.id,
            name: exercise.name,
            sets: exercise.targetSets,
            reps: exercise.targetReps,
            weight: exercise.targetWeight,
            volume: exercise.targetSets * exercise.targetReps * exercise.targetWeight,
            notes: exercise.notes,
            order_index: currentWorkout.exercises.indexOf(exercise)
          });
        
        if (exerciseError) throw exerciseError;
      }
      
      setCurrentWorkout(null);
      setCurrentView('main');
      loadWorkouts();
      Alert.alert('Success', 'Workout saved successfully!');
      
    } catch (error) {
      console.error('Error saving workout:', error);
      Alert.alert('Error', 'Failed to save workout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Start workout session
  const startWorkoutSession = (workout: Workout) => {
    setCurrentWorkout({
      ...workout,
      status: 'in_progress',
      startTime: new Date()
    });
    setCurrentView('session');
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

  // Render main tracker screen
  const renderMainScreen = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Workout Tracker</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.card }]}
            onPress={() => setShowCalendar(true)}
          >
            <Calendar size={24} color={colors.tint} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.tint }]}
            onPress={startNewWorkoutCreation}
          >
            <Plus size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Today's Workout Card */}
        <View style={[styles.mainCard, { backgroundColor: colors.card }]}>
          {todaysWorkout ? (
            <>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                Today's Workout: {todaysWorkout.name}
              </Text>
              <Text style={[styles.cardSubtitle, { color: colors.text }]}>
                {todaysWorkout.exercises.length} exercises planned
              </Text>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.tint }]}
                onPress={() => startWorkoutSession(todaysWorkout)}
              >
                <Play size={20} color="white" />
                <Text style={styles.primaryButtonText}>Begin Workout</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                No workout planned today
              </Text>
              <Text style={[styles.cardSubtitle, { color: colors.text }]}>
                Ready to get started?
              </Text>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.tint }]}
                onPress={startNewWorkoutCreation}
              >
                <Plus size={20} color="white" />
                <Text style={styles.primaryButtonText}>Start New Workout</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Progress Section */}
        <ProgressCharts
          data={progressData}
          timeScale={timeScale}
          onTimeScalePress={() => setShowTimeScaleModal(true)}
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
          <TouchableOpacity onPress={()=> setShowDatePicker(true)} style={[styles.datePickerField,{backgroundColor:colors.background}]}>
            <Text style={{color:colors.text}}>{new Date(workoutDate).toLocaleDateString()}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={new Date(workoutDate)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
              onChange={(event,date)=>{
                if (Platform.OS !== 'ios') setShowDatePicker(false);
                if (date){
                  const iso = date.toISOString().split('T')[0];
                  setWorkoutDate(iso);
                  setCurrentWorkout(prev=> prev?{...prev, date:iso}:prev);
                }
              }}
            />
          )}

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
      {/* Exercise Creation Modal */}
      <Modal visible={showExerciseModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Exercise</Text>
            
            {/* DEBUG INFO - REMOVE IN PRODUCTION */}
            <View style={{ marginVertical: 8, padding: 8, backgroundColor: '#222', borderRadius: 6 }}>
              <Text style={{ color: 'orange', fontSize: 12 }}>DEBUG:</Text>
              <Text style={{ color: 'white', fontSize: 12 }}>exerciseName: {exerciseName || '[empty]'}</Text>
              <Text style={{ color: 'white', fontSize: 12 }}>currentWorkout: {currentWorkout ? 'SET' : 'NULL'}</Text>
            </View>

            <AutocompleteDropdownContextProvider>
              <AutocompleteDropdown
                clearOnFocus={false}
                closeOnBlur={true}
                closeOnSubmit={false}
                showClear={false}
                direction="up"
                suggestionsListMaxHeight={180}
                dataSet={EXERCISE_OPTIONS.map((label) => ({ id: label, title: label }))}
                onSelectItem={(item) => setExerciseName(item?.title ?? '')}
                textInputProps={{
                  placeholder: 'Exercise name',
                  placeholderTextColor: colors.text + '80',
                  autoCorrect: false,
                  autoCapitalize: 'none',
                  style: { color: colors.text, padding: 8 },
                  value: exerciseName,
                  onChangeText: (text) => setExerciseName(text),
                }}
                inputContainerStyle={{ backgroundColor: colors.background, borderRadius: 8, marginBottom: 16, zIndex: 50 }}
                suggestionsListContainerStyle={{ backgroundColor: colors.card, zIndex: 50 }}
              />
            </AutocompleteDropdownContextProvider>

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
                onPress={() => setShowExerciseModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.tint }]}
                onPress={() => {
                  console.log('Add Exercise button pressed');
                  console.log('Current exerciseName:', exerciseName);
                  console.log('Current currentWorkout:', currentWorkout);
                  addExerciseToWorkout();
                }}
              >
                <Text style={[styles.modalButtonText, { color: 'white' }]}>Add Exercise</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
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
});