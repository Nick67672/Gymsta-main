import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { formatISO, subDays } from 'date-fns';

interface WorkoutStats {
  weeklyWorkouts: number;
  totalVolume: number;
  averageDuration: number; // minutes
  personalRecords: number;
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

        // 1. Get all completed workouts for total volume and average duration
        const { data: workouts, error: workoutsErr } = await supabase
          .from('workouts')
          .select('total_volume, duration_minutes')
          .eq('user_id', user.id)
          .eq('is_completed', true);

        if (workoutsErr) throw workoutsErr;

        // Calculate total volume and average duration
        let totalVolume = 0;
        let totalDuration = 0;
        let validDurations = 0;

        workouts?.forEach(workout => {
          if (workout.total_volume) {
            totalVolume += workout.total_volume;
          }
          if (workout.duration_minutes) {
            totalDuration += workout.duration_minutes;
            validDurations++;
          }
        });

        const averageDuration = validDurations > 0 ? Math.round(totalDuration / validDurations) : 0;

        // 2. Weekly workouts count (last 7 days, completed only)
        const sevenDaysAgo = formatISO(subDays(new Date(), 6), { representation: 'date' });
        const { count: weeklyCount, error: weeklyErr } = await supabase
          .from('workouts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_completed', true)
          .gte('date', sevenDaysAgo);

        if (weeklyErr) throw weeklyErr;

        // 3. Personal Records – distinct exercises where this user has at least one completed workout
        let prCount = 0;
        try {
          const { data: prData, error: prErr } = await supabase
            .from('workout_exercises')
            .select('name, weight, workout_id, workouts!inner(user_id, is_completed)')
            .eq('workouts.user_id', user.id)
            .eq('workouts.is_completed', true);
          if (prErr) throw prErr;
          if (prData) {
            const uniqueExercises = new Set<string>();
            prData.forEach((row: any) => {
              if (row.name) uniqueExercises.add(row.name);
            });
            prCount = uniqueExercises.size;
          }
        } catch (e) {
          console.warn('PR query failed', e);
        }

        setStats({
          weeklyWorkouts: weeklyCount || 0,
          totalVolume: totalVolume,
          averageDuration: averageDuration,
          personalRecords: prCount,
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