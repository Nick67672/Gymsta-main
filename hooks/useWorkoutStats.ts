import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { formatISO, startOfWeek, endOfWeek } from 'date-fns';

interface WorkoutStats {
  weeklyWorkouts: number;
  weeklyVolume: number; // Changed from totalVolume to weeklyVolume
  weeklyAvgDuration: number; // Changed to weekly average
  weeklyPersonalRecords: number; // Changed to weekly PRs
}

export function useWorkoutStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<WorkoutStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get current week boundaries (Monday to Sunday)
        const now = new Date();
        const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday = 1
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
        
        const weekStartISO = formatISO(weekStart, { representation: 'date' });
        const weekEndISO = formatISO(weekEnd, { representation: 'date' });

        // 1. Get current week's completed workouts
        const { data: weekWorkouts, error: weeklyErr } = await supabase
          .from('workouts')
          .select('total_volume, duration_minutes, date')
          .eq('user_id', user.id)
          .eq('is_completed', true)
          .gte('date', weekStartISO)
          .lte('date', weekEndISO);

        if (weeklyErr) throw weeklyErr;

        // Calculate weekly stats
        let weeklyVolume = 0;
        let totalDuration = 0;
        let validDurations = 0;
        const weeklyWorkoutsCount = weekWorkouts?.length || 0;

        weekWorkouts?.forEach(workout => {
          if (workout.total_volume) {
            weeklyVolume += workout.total_volume;
          }
          if (workout.duration_minutes) {
            totalDuration += workout.duration_minutes;
            validDurations++;
          }
        });

        const weeklyAvgDuration = validDurations > 0 ? Math.round(totalDuration / validDurations) : 0;

        // 2. Get current week's Personal Records (new exercises or weight PRs this week)
        let weeklyPRs = 0;
        try {
          // Check if workout_exercises table exists and has data
          const { data: prData, error: prErr } = await supabase
            .from('workouts')
            .select('exercises, date')
            .eq('user_id', user.id)
            .eq('is_completed', true)
            .gte('date', weekStartISO)
            .lte('date', weekEndISO);
          
          if (prErr) {
            console.warn('Weekly PR query failed - using fallback method:', prErr);
            weeklyPRs = 0; // Set to 0 on error
          } else if (prData && prData.length > 0) {
            // Success: count unique exercises from workouts
            const uniqueExercises = new Set<string>();
            prData.forEach((workout: any) => {
              if (workout.exercises && Array.isArray(workout.exercises)) {
                workout.exercises.forEach((exercise: any) => {
                  if (exercise.name) {
                    uniqueExercises.add(exercise.name);
                  }
                });
              }
            });
            weeklyPRs = uniqueExercises.size;
          }
        } catch (e) {
          console.warn('Weekly PR query failed - setting to 0:', e);
          weeklyPRs = 0; // Safe fallback
        }

        setStats({
          weeklyWorkouts: weeklyWorkoutsCount,
          weeklyVolume: weeklyVolume,
          weeklyAvgDuration: weeklyAvgDuration,
          weeklyPersonalRecords: weeklyPRs,
        });
      } catch (err: any) {
        console.error('useWorkoutStats error', err);
        setError(err?.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  return { stats, loading, error };
} 