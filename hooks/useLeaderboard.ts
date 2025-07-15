import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  value: string;
  avatarUrl?: string;
}

type LeaderboardScope = 'global' | 'friends' | 'my-gym';
type LeaderboardType = 'Weekly Volume' | 'Bench Press' | 'Squat' | 'Deadlift' | 'Highest Streak';

export function useLeaderboard(scope: LeaderboardScope, type: LeaderboardType) {
  const { user } = useAuth();
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        setError(null);

        let leaderboardData: LeaderboardEntry[] = [];

        if (type === 'Weekly Volume') {
          leaderboardData = await fetchWeeklyVolumeLeaderboard(scope);
        } else if (type === 'Highest Streak') {
          leaderboardData = await fetchStreakLeaderboard(scope);
        } else {
          // Specific exercise leaderboards (Bench Press, Squat, Deadlift)
          leaderboardData = await fetchExerciseLeaderboard(scope, type);
        }

        setData(leaderboardData);
      } catch (err: any) {
        // TODO: Implement leaderboards later - silently handle error for now
        setError(err?.message || 'Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [user, scope, type]);

  const fetchWeeklyVolumeLeaderboard = async (scope: LeaderboardScope): Promise<LeaderboardEntry[]> => {
    let query = supabase
      .from('workout_exercises')
      .select(`
        workout_id,
        volume,
        workouts!inner(user_id, is_completed),
        workouts(profiles!inner(id, username, avatar_url))
      `)
      .eq('workouts.is_completed', true);

    // Filter to last 7 days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 6);
    const startDateStr = startDate.toISOString().split('T')[0];
    query = query.gte('workouts.date', startDateStr);

    // Apply scope filtering
    if (scope === 'friends') {
      // Get user's friends first
      const { data: friendsData } = await supabase
        .from('followers')
        .select('following_id')
        .eq('follower_id', user!.id);
      
      const friendIds = friendsData?.map(f => f.following_id) || [];
      if (friendIds.length === 0) return []; // No friends
      
      query = query.in('workouts.user_id', friendIds);
    } else if (scope === 'my-gym') {
      // Get users from same gym
      const { data: profileData } = await supabase
        .from('profiles')
        .select('gym')
        .eq('id', user!.id)
        .single();
      
      if (!profileData?.gym) return []; // No gym set
      
      const { data: gymUsers } = await supabase
        .from('profiles')
        .select('id')
        .eq('gym', profileData.gym);
      
      const gymUserIds = gymUsers?.map(u => u.id) || [];
      if (gymUserIds.length === 0) return [];
      
      query = query.in('workouts.user_id', gymUserIds);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Aggregate volume by user
    const userVolumes: { [userId: string]: { total: number; name: string; avatar?: string } } = {};
    
    data?.forEach((row: any) => {
      const userId = row.workouts.user_id;
      const volume = Number(row.volume || 0);
      const profile = row.workouts.profiles;
      
      if (!userVolumes[userId]) {
        userVolumes[userId] = {
          total: 0,
          name: profile?.username || 'Unknown',
          avatar: profile?.avatar_url
        };
      }
      userVolumes[userId].total += volume;
    });

    // Convert to leaderboard entries and sort
    const entries = Object.entries(userVolumes)
      .map(([userId, data]) => ({
        rank: 0, // Will be set below
        userId,
        name: data.name,
        value: `${data.total.toFixed(0)}kg`,
        avatarUrl: data.avatar
      }))
      .sort((a, b) => parseFloat(b.value) - parseFloat(a.value))
      .slice(0, 50); // Top 50

    // Set ranks
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return entries;
  };

  const fetchExerciseLeaderboard = async (scope: LeaderboardScope, exercise: string): Promise<LeaderboardEntry[]> => {
    const exerciseName = exercise.replace(' Press', '').toLowerCase(); // "Bench Press" -> "bench"
    
    let query = supabase
      .from('workout_exercises')
      .select(`
        weight,
        workouts!inner(user_id, is_completed),
        workouts(profiles!inner(id, username, avatar_url))
      `)
      .eq('workouts.is_completed', true)
      .ilike('name', `%${exerciseName}%`);

    // Apply scope filtering (similar to volume leaderboard)
    if (scope === 'friends') {
      const { data: friendsData } = await supabase
        .from('followers')
        .select('following_id')
        .eq('follower_id', user!.id);
      
      const friendIds = friendsData?.map(f => f.following_id) || [];
      if (friendIds.length === 0) return [];
      
      query = query.in('workouts.user_id', friendIds);
    } else if (scope === 'my-gym') {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('gym')
        .eq('id', user!.id)
        .single();
      
      if (!profileData?.gym) return [];
      
      const { data: gymUsers } = await supabase
        .from('profiles')
        .select('id')
        .eq('gym', profileData.gym);
      
      const gymUserIds = gymUsers?.map(u => u.id) || [];
      if (gymUserIds.length === 0) return [];
      
      query = query.in('workouts.user_id', gymUserIds);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Find max weight per user
    const userMaxWeights: { [userId: string]: { max: number; name: string; avatar?: string } } = {};
    
    data?.forEach((row: any) => {
      const userId = row.workouts.user_id;
      const weight = Number(row.weight || 0);
      const profile = row.workouts.profiles;
      
      if (!userMaxWeights[userId]) {
        userMaxWeights[userId] = {
          max: weight,
          name: profile?.username || 'Unknown',
          avatar: profile?.avatar_url
        };
      } else if (weight > userMaxWeights[userId].max) {
        userMaxWeights[userId].max = weight;
      }
    });

    // Convert to leaderboard entries
    const entries = Object.entries(userMaxWeights)
      .map(([userId, data]) => ({
        rank: 0,
        userId,
        name: data.name,
        value: `${data.max}kg`,
        avatarUrl: data.avatar
      }))
      .sort((a, b) => parseFloat(b.value) - parseFloat(a.value))
      .slice(0, 50);

    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return entries;
  };

  const fetchStreakLeaderboard = async (scope: LeaderboardScope): Promise<LeaderboardEntry[]> => {
    // For now, return mock data as streak calculation is complex
    // TODO: Implement proper streak calculation based on consecutive workout days
    return [
      { rank: 1, userId: 'mock1', name: 'John Doe', value: '15 days', avatarUrl: undefined },
      { rank: 2, userId: 'mock2', name: 'Jane Smith', value: '12 days', avatarUrl: undefined },
      { rank: 3, userId: 'mock3', name: 'Mike Johnson', value: '8 days', avatarUrl: undefined },
    ];
  };

  return { data, loading, error };
} 