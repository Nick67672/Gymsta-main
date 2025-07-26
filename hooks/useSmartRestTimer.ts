import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export interface RestSuggestion {
  time: number;
  reason: string;
  icon: string;
  color: string;
  confidence: number; // 0-1 scale
}

export interface WorkoutContext {
  exerciseName: string;
  exerciseType: string;
  setNumber: number;
  totalSets: number;
  workoutProgress: number; // 0-1 scale
  isCompoundMovement: boolean;
  exerciseIntensity: number; // 1-10 scale
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  userTendsToSkip: boolean;
}

export interface SmartRestTimerState {
  currentTime: number;
  isRunning: boolean;
  isCompleted: boolean;
  suggestedTime: number;
  actualStartTime: number;
  mode: 'auto' | 'manual' | 'adaptive';
}

export interface UserRestPreferences {
  defaultRestTime: number;
  adaptiveEnabled: boolean;
  autoStart: boolean;
  gestureControlsEnabled: boolean;
  restNotificationsEnabled: boolean;
  fatigueAdjustmentEnabled: boolean;
}

export const useSmartRestTimer = (context: WorkoutContext, workoutId?: string, initialTime?: number) => {
  const { user } = useAuth();
  const [timerState, setTimerState] = useState<SmartRestTimerState>({
    currentTime: initialTime || 90,
    isRunning: false,
    isCompleted: false,
    suggestedTime: initialTime || 90,
    actualStartTime: initialTime || 90,
    mode: 'adaptive'
  });
  
  const [userPreferences, setUserPreferences] = useState<UserRestPreferences>({
    defaultRestTime: 90,
    adaptiveEnabled: true,
    autoStart: true,
    gestureControlsEnabled: true,
    restNotificationsEnabled: true,
    fatigueAdjustmentEnabled: true
  });

  const [restSuggestions, setRestSuggestions] = useState<RestSuggestion[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Load user preferences on mount
  useEffect(() => {
    if (user) {
      loadUserPreferences();
    }
  }, [user]);

  // Calculate smart rest time when context changes (but not when initialTime is provided)
  useEffect(() => {
    if (user && context.exerciseName && !initialTime) {
      calculateSmartRestTime();
    }
  }, [context, user, initialTime]);

  // Update timer when initialTime changes
  useEffect(() => {
    if (initialTime) {
      setTimerState(prev => ({
        ...prev,
        currentTime: initialTime,
        suggestedTime: initialTime,
        actualStartTime: initialTime,
        isRunning: false,
        isCompleted: false
      }));
    }
  }, [initialTime]);

  const loadUserPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_workout_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading user preferences:', error);
        return;
      }

      if (data) {
        setUserPreferences({
          defaultRestTime: data.default_rest_time || 90,
          adaptiveEnabled: data.adaptive_rest_enabled ?? true,
          autoStart: data.auto_start_rest ?? true,
          gestureControlsEnabled: data.gesture_controls_enabled ?? true,
          restNotificationsEnabled: data.rest_notifications_enabled ?? true,
          fatigueAdjustmentEnabled: data.fatigue_adjustment_enabled ?? true
        });
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  };

  const calculateSmartRestTime = async () => {
    if (!user || !context.exerciseName) return;

    try {
      // Use the database function to get optimal rest time
      const { data, error } = await supabase.rpc('get_optimal_rest_time', {
        p_user_id: user.id,
        p_exercise_name: context.exerciseName,
        p_set_number: context.setNumber,
        p_workout_progress: context.workoutProgress
      });

      if (error) {
        console.error('Error calculating smart rest time:', error);
        return;
      }

      const optimalTime = data || userPreferences.defaultRestTime;
      
      // Only update if no initialTime is provided (respect user's manual selection)
      if (!initialTime) {
        setTimerState(prev => ({
          ...prev,
          suggestedTime: optimalTime,
          currentTime: optimalTime
        }));
      } else {
        // If initialTime is provided, only update suggestedTime, keep currentTime as user selected
        setTimerState(prev => ({
          ...prev,
          suggestedTime: optimalTime,
          // Keep currentTime as the user's selected time
        }));
      }

      // Generate contextual suggestions
      generateRestSuggestions(optimalTime);
    } catch (error) {
      console.error('Error calculating smart rest time:', error);
    }
  };

  const generateRestSuggestions = (baseTime: number) => {
    const suggestions: RestSuggestion[] = [];

    // Quick option (75% of suggested)
    suggestions.push({
      time: Math.round(baseTime * 0.75),
      reason: 'Quick recovery',
      icon: 'zap',
      color: '#10B981',
      confidence: context.exerciseIntensity < 7 ? 0.8 : 0.4
    });

    // Suggested time
    suggestions.push({
      time: baseTime,
      reason: 'Recommended',
      icon: 'target',
      color: '#3B82F6',
      confidence: 0.9
    });

    // Extended option (125% of suggested)
    suggestions.push({
      time: Math.round(baseTime * 1.25),
      reason: 'Full recovery',
      icon: 'clock',
      color: '#8B5CF6',
      confidence: context.exerciseIntensity > 7 ? 0.9 : 0.6
    });

    // Context-specific suggestions
    if (context.isCompoundMovement) {
      suggestions.push({
        time: Math.max(120, baseTime + 30),
        reason: 'Compound movement',
        icon: 'dumbbell',
        color: '#F59E0B',
        confidence: 0.85
      });
    }

    if (context.setNumber === context.totalSets) {
      suggestions.push({
        time: Math.round(baseTime * 1.5),
        reason: 'Final set - take your time',
        icon: 'award',
        color: '#EF4444',
        confidence: 0.7
      });
    }

    // Sort by confidence and take top 4
    const topSuggestions = suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 4);

    setRestSuggestions(topSuggestions);
  };

  const startTimer = useCallback((customTime?: number) => {
    const timeToUse = customTime || timerState.currentTime;
    startTimeRef.current = Date.now();
    
    setTimerState(prev => ({
      ...prev,
      currentTime: timeToUse,
      isRunning: true,
      isCompleted: false,
      actualStartTime: timeToUse
    }));

    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Start countdown - ensure exactly 1 second intervals
    intervalRef.current = setInterval(() => {
      setTimerState(prev => {
        if (!prev.isRunning) return prev; // Don't count if not running
        
        const newTime = prev.currentTime - 1;
        
        if (newTime <= 0) {
          completeTimer();
          return { ...prev, currentTime: 0, isRunning: false, isCompleted: true };
        }
        
        // Haptic feedback for last 10 seconds
        if (newTime <= 10 && newTime > 0 && Platform.OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        
        return { ...prev, currentTime: newTime };
      });
    }, 1000);
  }, [timerState.currentTime]);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    setTimerState(prev => ({ ...prev, isRunning: false }));
    
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, []);

  const completeTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const actualRestTime = Math.round((Date.now() - startTimeRef.current) / 1000);
    
    // Record analytics
    recordRestAnalytics(actualRestTime, false, false);
    
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, []);

  const skipTimer = useCallback(() => {
    const actualRestTime = Math.round((Date.now() - startTimeRef.current) / 1000);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    setTimerState(prev => ({
      ...prev,
      isRunning: false,
      isCompleted: true,
      currentTime: 0
    }));

    // Record as skipped
    recordRestAnalytics(actualRestTime, true, false);
    
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  }, []);

  const adjustTimer = useCallback((adjustment: number) => {
    setTimerState(prev => ({
      ...prev,
      currentTime: Math.max(15, prev.currentTime + adjustment)
    }));
    
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const resetTimer = useCallback((newTime?: number) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    const timeToUse = newTime || timerState.suggestedTime;
    
    setTimerState(prev => ({
      ...prev,
      currentTime: timeToUse,
      isRunning: false,
      isCompleted: false
    }));
    
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [timerState.suggestedTime]);

  const recordRestAnalytics = async (
    actualTime: number,
    wasSkipped: boolean,
    wasExtended: boolean,
    performanceRating?: number
  ) => {
    if (!user || !workoutId) return;

    try {
      await supabase.rpc('record_rest_analytics', {
        p_user_id: user.id,
        p_workout_id: workoutId,
        p_exercise_name: context.exerciseName,
        p_exercise_type: context.exerciseType,
        p_set_number: context.setNumber,
        p_suggested_time: timerState.suggestedTime,
        p_actual_time: actualTime,
        p_was_skipped: wasSkipped,
        p_was_extended: wasExtended,
        p_performance_rating: performanceRating,
        p_workout_progress: context.workoutProgress
      });
    } catch (error) {
      console.error('Error recording rest analytics:', error);
    }
  };

  const updateUserPreferences = async (newPreferences: Partial<UserRestPreferences>) => {
    if (!user) return;

    const updatedPreferences = { ...userPreferences, ...newPreferences };
    setUserPreferences(updatedPreferences);

    try {
      await supabase
        .from('user_workout_preferences')
        .upsert({
          user_id: user.id,
          default_rest_time: updatedPreferences.defaultRestTime,
          adaptive_rest_enabled: updatedPreferences.adaptiveEnabled,
          auto_start_rest: updatedPreferences.autoStart,
          rest_notifications_enabled: updatedPreferences.restNotificationsEnabled,
          fatigue_adjustment_enabled: updatedPreferences.fatigueAdjustmentEnabled,
          gesture_controls_enabled: updatedPreferences.gestureControlsEnabled,
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error updating user preferences:', error);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    // Timer state
    timerState,
    userPreferences,
    restSuggestions,
    
    // Timer controls
    startTimer,
    stopTimer,
    completeTimer,
    skipTimer,
    adjustTimer,
    resetTimer,
    
    // Configuration
    updateUserPreferences,
    calculateSmartRestTime,
    
    // Analytics
    recordRestAnalytics
  };
}; 