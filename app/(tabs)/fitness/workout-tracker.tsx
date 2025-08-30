import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import Colors from '@/constants/Colors';
import { BorderRadius, Shadows, Spacing } from '@/constants/Spacing';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, Plus, Zap, Play } from 'lucide-react-native';
import WorkoutSession from '@/components/WorkoutSession';

type Workout = {
  id: string;
  name: string;
  date: string;
  exercises: any[];
  notes?: string;
};

export default function WorkoutTrackerScreen() {
  const { action, planId } = useLocalSearchParams<{ action?: string; planId?: string }>();
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [showWorkoutSession, setShowWorkoutSession] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    if (action === 'fromPlan' && planId) {
      loadPlanAsWorkout();
    } else if (action === 'create') {
      createNewWorkout();
    } else if (action === 'quickStart') {
      createQuickStartWorkout();
    } else if (action === 'editPlan' && planId) {
      loadPlanForEditing();
    } else {
      // Default: redirect to hub
      router.replace('/fitness/workout-hub');
    }
  }, [user?.id, action, planId]);

  const loadPlanAsWorkout = async () => {
    if (!user || !planId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('planned_workouts')
        .select('*')
        .eq('id', planId)
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      
      const workoutData: Workout = {
        id: `temp-${Date.now()}`,
        name: data.name || 'Workout',
        date: new Date().toISOString().split('T')[0],
        exercises: data.exercises || [],
        notes: data.notes || '',
      };
      
      setWorkout(workoutData);
      setShowWorkoutSession(true);
    } catch (e) {
      Alert.alert('Error', 'Failed to load workout plan');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const createNewWorkout = async () => {
    if (!user) return;
    
    try {
      // Create a new planned workout in the database
      const { data: newPlan, error } = await supabase
        .from('planned_workouts')
        .insert({
          user_id: user.id,
          name: 'New Workout',
          date: new Date().toISOString().split('T')[0],
          exercises: [],
          notes: '',
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Navigate directly to the workout creation/editing interface
      router.push({ pathname: '/fitness/workout-tracker', params: { action: 'editPlan', planId: newPlan.id } });
    } catch (e) {
      Alert.alert('Error', 'Failed to create new workout plan');
      router.back();
    }
  };

  const createQuickStartWorkout = () => {
    const workoutData: Workout = {
      id: `temp-${Date.now()}`,
      name: 'Quick Workout',
      date: new Date().toISOString().split('T')[0],
      exercises: [],
      notes: '',
    };
    setWorkout(workoutData);
    setShowWorkoutSession(true);
  };

  const loadPlanForEditing = async () => {
    if (!user || !planId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('planned_workouts')
        .select('*')
        .eq('id', planId)
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      
      const workoutData: Workout = {
        id: data.id, // Use the actual plan ID
        name: data.name || 'Workout',
        date: new Date().toISOString().split('T')[0],
        exercises: data.exercises || [],
        notes: data.notes || '',
      };
      
      setWorkout(workoutData);
      setShowWorkoutSession(true);
    } catch (e) {
      Alert.alert('Error', 'Failed to load workout plan for editing');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleWorkoutComplete = async (completedWorkout: Workout) => {
    // Navigate to summary
    router.push('/fitness/workout-summary');
  };

  const handleClose = () => {
    setShowWorkoutSession(false);
    router.back();
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading workout...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (showWorkoutSession && workout) {
    return (
      <WorkoutSession
        workout={workout}
        onWorkoutComplete={handleWorkoutComplete}
        onClose={handleClose}
        plannedWorkoutId={action === 'fromPlan' ? planId : null}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.card }]}
          onPress={() => router.back()}
        >
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Workout Tracker</Text>
        <View style={{ width: 44 }} />
      </View>
      
      <View style={styles.content}>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Preparing your workout...
        </Text>
      </View>
    </SafeAreaView>
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.light,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 16,
  },
});
