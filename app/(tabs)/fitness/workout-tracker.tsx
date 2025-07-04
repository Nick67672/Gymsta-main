import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Image,
  Platform,
  Linking,
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
  ChevronDown,
  CalendarRange,
  FilePlus,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { BorderRadius, Shadows, Spacing } from '@/constants/Spacing';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedInput } from '@/components/ThemedInput';
import * as ImagePicker from 'expo-image-picker';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { format } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  // Add new state for exercise modal and post-workout modal
  const [selectedExerciseBox, setSelectedExerciseBox] = useState<SimpleExercise | null>(null);
  const [showExerciseBoxModal, setShowExerciseBoxModal] = useState(false);
  const [showPostWorkoutModal, setShowPostWorkoutModal] = useState(false);
  const [exerciseSetCompletion, setExerciseSetCompletion] = useState<{ [exerciseId: string]: boolean[] }>({});

  // Add new state for post-workout modal fields
  const [postImage, setPostImage] = useState<string | null>(null);
  const [postCaption, setPostCaption] = useState('');
  const [postAction, setPostAction] = useState<'feed' | 'account' | 'archive' | null>(null);

  // Add new state for custom timescale selection
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState<'start' | 'end' | null>(null);

  // Add metric selection state
  const metricOptions = ['Total Volume','Weight','Estimated 1RM','Weekly frequency'];
  const [selectedMetric, setSelectedMetric] = useState<string>('Total Volume');

  // Add metric dropdown state
  const [showMetricDropdown, setShowMetricDropdown] = useState(false);

  // Add new state for custom timescale modal
  const [showCustomModal, setShowCustomModal] = useState(false);

  const [tempStartDate, setTempStartDate] = useState<Date | null>(null);
  const [tempEndDate, setTempEndDate] = useState<Date | null>(null);

  // Add new state for template modal
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templates, setTemplates] = useState<{ id:number; name:string }[]>([]);

  // Add new state for planning workouts
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planName, setPlanName] = useState('');
  const [planNotes, setPlanNotes] = useState('');

  // Add new state for per-set editing
  const [perSetData, setPerSetData] = useState<{ [exerciseId: string]: { reps: number[]; weight: number[] } }>({});

  // Add new state for setup modal
  const [showSetupModal, setShowSetupModal] = useState(false);

  // ---------- Session persistence ----------
  const sessionKey = useMemo(()=>`workoutSession_${user?.id || 'guest'}_${selectedDate}`,[user, selectedDate]);

  useEffect(()=>{
    const loadSession = async () => {
      try {
        const json = await AsyncStorage.getItem(sessionKey);
        if (json) {
          const parsed = JSON.parse(json);
          if (parsed.perSetData) setPerSetData(parsed.perSetData);
          if (parsed.exerciseSetCompletion) setExerciseSetCompletion(parsed.exerciseSetCompletion);
        }
      } catch (e) { console.warn('load session err', e); }
    };
    loadSession();
  }, [sessionKey]);

  const persistSession = useCallback(async (newPerSet: any, newCompletion: any) => {
    try {
      await AsyncStorage.setItem(sessionKey, JSON.stringify({ perSetData: newPerSet, exerciseSetCompletion: newCompletion }));
    } catch (e) { console.warn('save session err', e); }
  }, [sessionKey]);

  useEffect(() => { persistSession(perSetData, exerciseSetCompletion); }, [perSetData, exerciseSetCompletion, persistSession]);
  // -----------------------------------------

  // Helper to edit per-set reps or weight
  const handleSetEdit = (exerciseId: string, setIdx: number, field: 'reps' | 'weight', value: number) => {
    setPerSetData((prev) => {
      const prevData = prev[exerciseId] || { reps: [], weight: [] };
      const newData = { ...prevData } as any;
      newData[field] = [...(prevData[field] || [])];
      newData[field][setIdx] = value;
      return { ...prev, [exerciseId]: newData };
    });
  };

  // Compute chart data based on selectedMetric
  const metricChartData = useMemo(() => {
    if (selectedMetric === 'Weekly frequency') {
      // aggregate workouts per week
      const freqMap: { [week: string]: number } = {};
      volumeData.forEach(d => {
        const weekLabel = format(new Date(d.workout_date), 'yyyy-ww');
        freqMap[weekLabel] = (freqMap[weekLabel] || 0) + 1;
      });
      const labels = Object.keys(freqMap).sort();
      const data = labels.map(l => freqMap[l]);
      return { labels, datasets:[{ data, strokeWidth:2, color:(o=1)=>colors.tint }]};
    }
    // for per exercise metrics require selectedExercise
    if (!selectedExercise) return null;
    const labels:string[] = [];
    const data:number[] = [];
    volumeData.filter(d=>d.exercise_name === selectedExercise).forEach(d=>{
      labels.push(format(new Date(d.workout_date),'MM/dd'));
      if(selectedMetric==='Total Volume') data.push(Number(d.total_volume));
      else if(selectedMetric==='Weight') data.push(Number(d.max_weight));
      else if(selectedMetric==='Estimated 1RM') {
        // simple Epley estimate based on max_weight. You can enhance by reps if available
        data.push(Number(d.max_weight));
      }
    });
    return { labels, datasets:[{ data, strokeWidth:2, color:(o=1)=>colors.tint }] };
  },[selectedMetric, selectedExercise, volumeData, colors.tint]);

  // Image picker handler
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPostImage(result.assets[0].uri);
    }
  };

  // Save as template handler
  const saveAsTemplate = async () => {
    if (!currentWorkout || !templateName.trim() || !user) return;
    try {
      const { error } = await supabase.from('workout_templates').insert({
        user_id: user.id,
        name: templateName.trim(),
        data: currentWorkout.exercises, // json column
      });
      if (error) throw error;
      setShowTemplateModal(false);
      setTemplateName('');
      Alert.alert('Saved', 'Template saved successfully');
      loadTemplates();
    } catch (error) {
      console.error('Save template error', error);
      Alert.alert('Error', 'Failed to save template');
    }
  };

  const loadTemplates = useCallback(async () => {
    if(!user) return;
    try {
      const { data, error } = await supabase.from('workout_templates').select('id,name').eq('user_id', user.id).order('created_at',{ascending:false});
      if(error){ console.error('load templates error', error); return;}
      setTemplates(data||[]);
    } catch(err){ console.error(err); }
  },[user]);

  useEffect(()=>{ loadTemplates(); }, [loadTemplates]);

  // Quick Add handler (scaffold)
  const quickAddWorkout = () => {
    startNewWorkout();
    setActiveTab('today');
  };

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
          setShowSetupModal(true);
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

      // If marking completed compute volume & PBs
      if(isCompleted && currentWorkout){
        for(const ex of currentWorkout.exercises){
          const perSet = perSetData[ex.id];
          const repsArr = perSet?.reps && perSet.reps.length? perSet.reps : Array(ex.sets).fill(ex.reps);
          const wtArr = perSet?.weight && perSet.weight.length? perSet.weight : Array(ex.sets).fill(ex.weight);
          const setsCompleted = repsArr.length;
          const totalReps = repsArr.reduce((a,b)=>a+(Number(b)||0),0);
          const maxWeight = Math.max(...wtArr.map(w=>Number(w)||0));
          const totalVolume = repsArr.reduce((sum, r,i)=> sum + (Number(r)||0)*(Number(wtArr[i])||0),0);
          await supabase.from('workout_exercises').update({
            sets: setsCompleted,
            reps: totalReps/setsCompleted,
            weight: maxWeight,
            volume: totalVolume,
          }).eq('id', ex.id);
        }
      }

      await loadWorkouts();

      // Clear stored session on completion
      if(isCompleted){ await AsyncStorage.removeItem(sessionKey); }

      Alert.alert('Success', isCompleted ? 'Workout completed!' : 'Workout saved!');

      // ---- Post to feed ----
      if(isCompleted && postAction){
        let mediaUrl: string | null = null;
        if(postImage){
          try{
            if(postImage.startsWith('file://')){
              const fileExt = postImage.split('.').pop() || 'jpg';
              const fileName = `${Date.now()}.${fileExt}`;
              const response = await fetch(postImage);
              const blob = await response.blob();
              const { error: uploadErr } = await supabase.storage
                .from('post-images')
                .upload(fileName, blob, { contentType: blob.type, upsert:false });
              if(uploadErr){ console.error('upload error', uploadErr); }
              else {
                const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(fileName);
                mediaUrl = urlData.publicUrl;
              }
            } else {
              mediaUrl = postImage; // already remote URL
            }
          } catch(e){ console.warn('image upload failed', e); }
        }

        const visibility = postAction==='feed' ? 'public' : postAction==='account' ? 'followers' : 'private';

        const { error: postErr } = await supabase.from('posts').insert({
          user_id: user.id,
          caption: postCaption.trim() || null,
          media_url: mediaUrl,
          media_type: mediaUrl ? 'image' : null,
          workout_id: workoutId,
          visibility
        });
        if(postErr) console.error('create post error', postErr);
      }

      // reset post states
      setPostImage(null); setPostCaption(''); setPostAction(null);

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

  // Helper to open exercise modal
  const openExerciseBox = (exercise: SimpleExercise) => {
    setSelectedExerciseBox(exercise);
    setShowExerciseBoxModal(true);
  };

  // Helper to toggle set completion
  const toggleSetCompletion = (exerciseId: string, setIdx: number) => {
    setExerciseSetCompletion((prev) => {
      const prevArr = prev[exerciseId] || [];
      const newArr = [...prevArr];
      newArr[setIdx] = !newArr[setIdx];
      return { ...prev, [exerciseId]: newArr };
    });
  };

  // Plan workout handler
  const planWorkout = async () => {
    if (!user) return;
    try {
      const { error } = await supabase.from('workouts').insert({
        user_id: user.id,
        date: selectedDate,
        is_completed: false,
        name: planName.trim() || null,
        notes: planNotes.trim() || null,
      });
      if (error) throw error;
      // refresh calendar data
      await loadWorkouts();
      setShowPlanModal(false);
      setPlanName('');
      setPlanNotes('');
      Alert.alert('Planned', 'Workout planned successfully');
    } catch (err) {
      console.error('Plan workout error', err);
      Alert.alert('Error', 'Failed to plan workout');
    }
  };

  // Render functions
  const renderTodayTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={[styles.section, { backgroundColor: colors.card }]}> 
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Today's Workout - {selectedDate}</Text>
        {currentWorkout ? (
          <View>
            <View style={styles.workoutHeader}>
              <Text style={[styles.workoutTitle, { color: colors.text }]}>{currentWorkout.name || 'Untitled Workout'}</Text>
              {currentWorkout.is_completed && (
                <View style={styles.completedBadge}>
                  <CheckCircle size={16} color="#4CAF50" />
                  <Text style={styles.completedText}>Completed</Text>
                </View>
              )}
            </View>

            {/* Exercise Boxes */}
            <View style={styles.exerciseBoxGrid}>
              {currentWorkout.exercises.map((exercise) => (
                <TouchableOpacity
                  key={exercise.id}
                  style={[styles.exerciseBox, { backgroundColor: colors.background }]}
                  onPress={() => openExerciseBox(exercise)}
                  activeOpacity={0.85}
                >
                  {/* Placeholder for exercise image */}
                  <View style={styles.exerciseBoxImage}>
                    <Dumbbell size={32} color={colors.tint} />
                  </View>
                  <Text style={[styles.exerciseBoxName, { color: colors.text }]} numberOfLines={1}>{exercise.name}</Text>
                  <Text style={[styles.exerciseBoxDetails, { color: colors.textSecondary }]}>Sets: {exercise.sets}</Text>
                </TouchableOpacity>
              ))}
            </View>

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
                title="End Workout"
                onPress={() => setShowPostWorkoutModal(true)}
                variant="primary"
                style={styles.actionButton}
              />
              <ThemedButton
                title="Save as Template"
                onPress={() => setShowTemplateModal(true)}
                variant="secondary"
                style={styles.actionButton}
              />
            </View>
          </View>
        ) : (
          <View style={styles.noWorkout}>
            <Dumbbell size={48} color={colors.textSecondary} />
            <Text style={[styles.noWorkoutText, { color: colors.textSecondary }]}>No workout planned for today</Text>
            <ThemedButton
              title="Start New Workout"
              onPress={startNewWorkout}
              variant="primary"
              style={styles.startButton}
            />
          </View>
        )}
      </View>

      {/* Exercise Box Modal */}
      <Modal
        visible={showExerciseBoxModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowExerciseBoxModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}> 
            <Text style={[styles.modalTitle, { color: colors.text }]}>Exercise Details</Text>
            {selectedExerciseBox && (
              <>
                <Text style={[styles.exerciseName, { color: colors.text, fontSize: 20 }]}>{selectedExerciseBox.name}</Text>
                <View style={styles.setsList}>
                  {[...Array(selectedExerciseBox.sets)].map((_, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.setRow, { backgroundColor: (exerciseSetCompletion[selectedExerciseBox.id]?.[idx]) ? colors.tint + '22' : colors.background }]}
                      onPress={() => toggleSetCompletion(selectedExerciseBox.id, idx)}
                    >
                      <Text style={[styles.setLabel, { color: colors.text }]}>Set {idx + 1}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <Text style={[styles.setDetail, { color: colors.textSecondary }]}>Reps:</Text>
                        <ThemedInput
                          value={String(perSetData[selectedExerciseBox.id]?.reps?.[idx] ?? selectedExerciseBox.reps)}
                          onChangeText={v => handleSetEdit(selectedExerciseBox.id, idx, 'reps', Number(v))}
                          keyboardType="numeric"
                          style={[styles.input, { width: 40, marginHorizontal: 4 }]}
                        />
                        <Text style={[styles.setDetail, { color: colors.textSecondary }]}>Weight:</Text>
                        <ThemedInput
                          value={String(perSetData[selectedExerciseBox.id]?.weight?.[idx] ?? selectedExerciseBox.weight)}
                          onChangeText={v => handleSetEdit(selectedExerciseBox.id, idx, 'weight', Number(v))}
                          keyboardType="numeric"
                          style={[styles.input, { width: 50, marginHorizontal: 4 }]}
                        />
                        <View style={[styles.setTick, { backgroundColor: (exerciseSetCompletion[selectedExerciseBox.id]?.[idx]) ? colors.tint : colors.background, borderColor: colors.border }]}/>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
                <ThemedButton
                  title="Close"
                  onPress={() => setShowExerciseBoxModal(false)}
                  variant="secondary"
                  style={{ marginTop: 16 }}
                />
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Post-Workout Modal (scaffold) */}
      <Modal
        visible={showPostWorkoutModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPostWorkoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}> 
            <Text style={[styles.modalTitle, { color: colors.text }]}>Post Workout</Text>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              {postImage ? (
                <TouchableOpacity onPress={pickImage}>
                  <Image source={{ uri: postImage }} style={{ width: 120, height: 120, borderRadius: 12, marginBottom: 8 }} />
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Change Photo</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={pickImage} style={{ padding: 12, borderRadius: 8, backgroundColor: colors.background, marginBottom: 8 }}>
                  <Text style={{ color: colors.textSecondary }}>Add Photo</Text>
                </TouchableOpacity>
              )}
            </View>
            <ThemedInput
              placeholder="Add a caption..."
              value={postCaption}
              onChangeText={setPostCaption}
              style={{ marginBottom: 12 }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <ThemedButton
                title="Post to Feed"
                onPress={() => { setPostAction('feed'); setShowPostWorkoutModal(false); saveWorkout(true); }}
                variant="primary"
                style={{ flex: 1, marginRight: 4 }}
              />
              <ThemedButton
                title="Save to Account"
                onPress={() => { setPostAction('account'); setShowPostWorkoutModal(false); saveWorkout(true); }}
                variant="secondary"
                style={{ flex: 1, marginHorizontal: 4 }}
              />
              <ThemedButton
                title="Archive"
                onPress={() => { setPostAction('archive'); setShowPostWorkoutModal(false); saveWorkout(true); }}
                variant="secondary"
                style={{ flex: 1, marginLeft: 4 }}
              />
            </View>
            <ThemedButton
              title="Close"
              onPress={() => setShowPostWorkoutModal(false)}
              variant="secondary"
              style={{ marginTop: 8 }}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );

  const renderCalendarTab = () => {
    const hasWorkoutForSelected = !!workoutDates[selectedDate];
    return (
    <ScrollView style={styles.tabContent}>
      <View style={[styles.section, { backgroundColor: colors.card, alignItems: 'center', paddingHorizontal: 0, paddingTop: 40, paddingBottom: 32 }]}> 
        <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 22, marginBottom: 16 }]}>Workout Calendar</Text>
        <View style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: colors.background, padding: 8, marginBottom: 24 }}>
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
            style={{ borderRadius: 16, width: 340, alignSelf: 'center' }}
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
              textDayFontSize: 18,
              textMonthFontSize: 20,
              textDayHeaderFontSize: 14,
            }}
          />
        </View>
        <View style={[styles.legend, { flexDirection: 'row', justifyContent: 'center', gap: 24, marginBottom: 0 }]}> 
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={[styles.legendText, { color: colors.text }]}>Completed</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
            <Text style={[styles.legendText, { color: colors.text }]}>Planned</Text>
          </View>
        </View>
        {!hasWorkoutForSelected && (
          <ThemedButton title="Plan Workout" onPress={() => setShowPlanModal(true)} style={{ marginTop: 24 }} />
        )}
      </View>
    </ScrollView>
  );
};

const renderProgressTab = () => {
  return (
    <ScrollView style={styles.tabContent}>
      <View style={[styles.bannerContainer, { backgroundColor: colors.tint }]}> 
        <Text style={[styles.bannerTitle, { color: '#fff' }]}>Progress</Text>
        <Text style={[styles.bannerSubtitle, { color: '#fff' }]}>{daysPeriod}‐day range</Text>
      </View>
      <View style={[styles.section, { backgroundColor: colors.backgroundSecondary }]}> 
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Progress Tracking</Text>
        {/* Metric Selector via dropdown */}
        <View style={{ marginBottom:12, alignItems:'flex-start' }}>
          <TouchableOpacity
            style={[styles.dropdownButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setShowMetricDropdown(true)}
          >
            <Text style={[styles.dropdownText, { color: colors.text }]}>{selectedMetric}</Text>
            <ChevronDown size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        {/* Exercise Selection */}
        <View style={styles.filterContainer}>
          <View style={styles.pickerContainer}>
            {availableExercises.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {availableExercises.map((exercise) => (
                  <TouchableOpacity
                    key={exercise}
                    style={[styles.exerciseChip, { backgroundColor: selectedExercise === exercise ? colors.tint : colors.background, borderColor: colors.border }]}
                    onPress={() => setSelectedExercise(exercise)}
                  >
                    <Text style={[styles.exerciseChipText, { color: selectedExercise === exercise ? '#fff' : colors.text }]}>{exercise}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <Text style={[styles.noDataText, { color: colors.textSecondary }]}>Complete some workouts to see exercise options</Text>
            )}
          </View>
        </View>
        {/* Custom Timescale Selection */}
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
        {(selectedMetric === 'Weekly frequency' ? volumeData.length > 0 : selectedExercise && volumeData.length > 0) ? (
          <View style={[styles.chartCard, { backgroundColor: colors.background }]}> 
            <Text style={[styles.chartTitle, { color: colors.text, marginBottom: 8 }]}>{selectedMetric}</Text>
            {(() => {
              if (metricChartData && metricChartData.labels.length > 0) {
                return (
                  <LineChart
                    data={metricChartData}
                    width={screenWidth - 60}
                    height={220}
                    chartConfig={{
                      backgroundColor: colors.background,
                      backgroundGradientFrom: colors.background,
                      backgroundGradientTo: colors.background,
                      decimalPlaces: 0,
                      color: (opacity = 1) => colors.tint,
                      labelColor: (opacity = 1) => colors.text,
                      style: { borderRadius: 16 },
                      propsForDots: { r: '4', strokeWidth: '2', stroke: colors.tint },
                    }}
                    bezier
                    style={{ borderRadius: 16 }}
                  />
                );
              } else {
                return (
                  <View style={styles.noDataContainer}> 
                    <BarChart3 size={48} color={colors.textSecondary} />
                    <Text style={[styles.noDataText, { color: colors.textSecondary }]}>Chart temporarily unavailable</Text>
                    <Text style={[styles.noDataText, { color: colors.textSecondary, fontSize: 12 }]}>Data: {volumeData.length} workouts tracked</Text>
                  </View>
                );
              }
            })()}
            {/* Summary Row */}
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: colors.tint }]}>{volumeData.reduce((sum, d) => sum + parseFloat(d.total_volume.toString()), 0).toFixed(0)}kg</Text>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Volume</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: colors.tint }]}>{volumeData.length}</Text>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Workouts</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: colors.tint }]}>{Math.max(...volumeData.map(d => parseFloat(d.max_weight.toString())))}kg</Text>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Max Weight</Text>
              </View>
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

    {/* Metric Dropdown Modal */}
    <Modal
      visible={showMetricDropdown}
      transparent
      animationType="fade"
      onRequestClose={() => setShowMetricDropdown(false)}
    >
      <TouchableOpacity style={styles.dropdownOverlay} activeOpacity={1} onPress={() => setShowMetricDropdown(false)}>
        <View style={[styles.dropdownModal, { backgroundColor: colors.card }]}> 
          {metricOptions.map((opt, index) => (
            <TouchableOpacity
              key={opt}
              style={[styles.dropdownOption, index === metricOptions.length -1 && styles.lastDropdownOption, { borderBottomColor: colors.border }]}
              onPress={() => { setSelectedMetric(opt); setShowMetricDropdown(false); }}
            >
              <Text style={[styles.dropdownOptionText, { color: selectedMetric === opt ? colors.tint : colors.text }]}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>

    {/* Global Date Picker */}
    <DateTimePickerModal
      isVisible={isDatePickerVisible}
      mode="date"
      date={pickerMode === 'start' ? (tempStartDate || new Date()) : (tempEndDate || new Date())}
      onConfirm={(date) => {
        if (pickerMode === 'start') setTempStartDate(date); else if (pickerMode==='end') setTempEndDate(date);
        setDatePickerVisible(false);
      }}
      onCancel={() => setDatePickerVisible(false)}
      themeVariant={theme === 'dark' ? 'dark' : 'light'}
    />

    {/* Save Template Modal */}
    <Modal visible={showTemplateModal} transparent animationType="slide" onRequestClose={()=>setShowTemplateModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent,{backgroundColor:colors.card}]}> 
          <Text style={[styles.modalTitle,{color:colors.text}]}>Save Workout as Template</Text>
          <ThemedInput placeholder="Template name" value={templateName} onChangeText={setTemplateName} style={styles.input}/>
          <View style={styles.modalButtons}> 
            <ThemedButton title="Cancel" variant="secondary" onPress={()=>setShowTemplateModal(false)} style={styles.modalButton}/>
            <ThemedButton title="Save" onPress={saveAsTemplate} disabled={!templateName.trim()} style={styles.modalButton}/>
          </View>
        </View>
      </View>
    </Modal>

    {/* Plan Workout Modal */}
    <Modal visible={showPlanModal} transparent animationType="slide" onRequestClose={() => setShowPlanModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}> 
          <Text style={[styles.modalTitle, { color: colors.text }]}>Plan Workout</Text>
          <ThemedInput placeholder="Workout name (optional)" value={planName} onChangeText={setPlanName} style={styles.input} />
          <ThemedInput placeholder="Notes (optional)" value={planNotes} onChangeText={setPlanNotes} style={[styles.input, styles.notesInput]} multiline />
          <View style={styles.modalButtons}>
            <ThemedButton title="Cancel" variant="secondary" onPress={() => setShowPlanModal(false)} style={styles.modalButton} />
            <ThemedButton title="Plan" onPress={planWorkout} style={styles.modalButton} />
          </View>
        </View>
      </View>
    </Modal>

    {/* Setup Guide Modal */}
    <Modal
      visible={showSetupModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowSetupModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}> 
          <Text style={[styles.modalTitle, { color: colors.text }]}>Workout Tracker Setup Required</Text>
          <Text style={[styles.modalText, { color: colors.textSecondary }]}>It looks like the workout tables haven't been created in your Supabase project yet.</Text>
          <Text style={[styles.modalText, { color: colors.textSecondary, marginTop:8 }]}>Follow the quick guide in <Text style={{fontWeight:'600'}}>WORKOUT_TRACKER_SETUP_GUIDE.md</Text> or run the SQL migration file <Text style={{fontWeight:'600'}}>supabase/migrations/20250101000003_create_workout_tracker_tables_safe.sql</Text>.</Text>
          <View style={{ flexDirection:'row', gap:12, marginTop:24 }}>
            <ThemedButton title="Open Guide" style={{ flex:1 }} onPress={() => {
              Linking.openURL('https://github.com/your-org/Gymsta/blob/main/WORKOUT_TRACKER_SETUP_GUIDE.md');
            }} />
            <ThemedButton variant="secondary" title="Close" style={{ flex:1 }} onPress={() => setShowSetupModal(false)} />
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
    borderRadius: 16,
    marginBottom: 16,
    padding: 20,
    paddingTop: 40,
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
    marginTop: 12,
    marginBottom: 8,
  },
  workoutDetails: {
    fontSize: 14,
    textAlign: 'left',
    marginTop: 2,
    marginBottom: 2,
    opacity: 0.8,
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 72,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  chartCard: {
    borderRadius: 20,
    padding: 20,
    width: '100%',
    alignItems: 'center',
    ...Shadows.light,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
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
  exerciseBoxGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  exerciseBox: {
    width: '50%',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  exerciseBoxImage: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseBoxName: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  exerciseBoxDetails: {
    fontSize: 14,
    color: 'rgba(0,0,0,0.8)',
  },
  setsList: {
    marginTop: 8,
    marginBottom: 16,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 8,
  },
  setLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  setDetail: {
    flex: 1,
    fontSize: 14,
  },
  setTick: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 12,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 12,
  },
  rangeDisplay: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  rangeChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  rangeChipText: {
    fontSize: 12,
  },
  bannerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  bannerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 14,
    opacity: 0.9,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 6,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownModal: {
    width: '80%',
    maxWidth: 320,
    borderRadius: 12,
    overflow: 'hidden',
  },
  dropdownOption: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  lastDropdownOption: {
    borderBottomWidth: 0,
  },
  dropdownOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  customModal: {
    width: '85%',
    maxWidth: 350,
    borderRadius: 12,
    padding: 20,
  },
  modalText: {
    textAlign: 'center',
  },
}); 