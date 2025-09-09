import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { BorderRadius, Shadows, Spacing } from '@/constants/Spacing';
import { useAuth } from '@/context/AuthContext';
import { useUnits } from '@/context/UnitContext';
import { supabase } from '@/lib/supabase';

type WorkoutRow = {
  id: string;
  user_id: string;
  name: string | null;
  date: string;
  exercises: any[];
  is_completed: boolean;
  total_volume: number | null;
  duration_minutes: number | null;
  updated_at?: string | null;
};

export default function SimpleWorkoutHub() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { user } = useAuth();
  const { formatWeight } = useUnits();

  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<Pick<WorkoutRow, 'id' | 'name' | 'date'> | null>(null);
  const [recent, setRecent] = useState<WorkoutRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tiles, setTiles] = useState<string[]>([]);
  const [analytics, setAnalytics] = useState<{ key: string; value: string }[]>([]);

  const todayISO = useMemo(() => new Date().toISOString().split('T')[0], []);

  useEffect(() => {
    if (!user) return;
    loadData();
    loadPrefs();
  }, [user?.id]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [draftRes, recentRes] = await Promise.all([
        supabase
          .from('workouts')
          .select('id,name,date')
          .eq('user_id', user.id)
          .eq('is_completed', false)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('workouts')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(3),
      ]);

      if (draftRes.error && draftRes.error.code !== 'PGRST116') throw draftRes.error; // ignore no rows error
      if (recentRes.error) throw recentRes.error;

      setDraft(draftRes.data ?? null);
      setRecent(recentRes.data ?? []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load workouts');
    } finally {
      setLoading(false);
    }
  };

  const loadPrefs = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('user_progress_preferences')
        .select('metrics')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      const list: string[] = Array.isArray(data?.metrics) ? data!.metrics : [];
      setTiles(list.slice(0, 3));
      await loadAnalytics(list.slice(0, 3));
    } catch {
      // ignore
    }
  };

  const loadAnalytics = async (keys: string[]) => {
    if (!user) return;
    const results: { key: string; value: string }[] = [];
    try {
      if (keys.includes('weekly_sessions')) {
        const start = new Date();
        start.setDate(start.getDate() - 6);
        const { data, error } = await supabase
          .from('workouts')
          .select('date')
          .eq('user_id', user.id)
          .eq('is_completed', true)
          .gte('date', start.toISOString().split('T')[0]);
        if (!error) results.push({ key: 'weekly_sessions', value: String((data || []).length) });
      }
      if (keys.includes('total_volume_7d')) {
        const start = new Date();
        start.setDate(start.getDate() - 6);
        const { data, error } = await supabase
          .from('workouts')
          .select('total_volume')
          .eq('user_id', user.id)
          .eq('is_completed', true)
          .gte('date', start.toISOString().split('T')[0]);
        if (!error) {
          const sum = (data || []).reduce((a: number, r: any) => a + (Number(r.total_volume) || 0), 0);
          results.push({ key: 'total_volume_7d', value: formatWeight(Math.round(sum), 'kg') });
        }
      }
      if (keys.includes('body_weight_avg_7d')) {
        const start = new Date();
        start.setDate(start.getDate() - 6);
        const { data, error } = await supabase
          .from('user_weight_entries')
          .select('weight_kg')
          .eq('user_id', user.id)
          .gte('recorded_on', start.toISOString().split('T')[0]);
        if (!error) {
          const vals = (data || []).map((r: any) => Number(r.weight_kg) || 0);
          const avg = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : 0;
          results.push({ key: 'body_weight_avg_7d', value: formatWeight(avg, 'kg') });
        }
      }
      // streak and 1RM are optional Phase 3; omit heavy logic
    } finally {
      setAnalytics(results);
    }
  };

  const handleQuickStart = async () => {
    if (!user) return;
    // No DB insert; route to tracker for ephemeral session
    router.push({ pathname: '/fitness/workout-tracker', params: { action: 'quickStart' } });
  };

  const handleResume = () => {
    if (!draft) return;
    router.push({ pathname: '/fitness/workout-tracker', params: { action: 'resumeDraft', workoutId: draft.id } });
  };

  const renderRecentItem = ({ item }: { item: WorkoutRow }) => {
    const completed = !!item.is_completed;
    return (
      <TouchableOpacity
        style={[styles.recentCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
        activeOpacity={0.85}
        onPress={() => router.push({ pathname: '/fitness/workout-session', params: { workoutId: item.id, readOnly: completed ? '1' : '0' } })}
      >
        <View style={styles.recentRowTop}>
          <Text style={[styles.recentName, { color: colors.text }]} numberOfLines={1}>
            {item.name || 'Workout'}
          </Text>
          <View style={[styles.badge, { backgroundColor: completed ? colors.tint + '20' : colors.border + '40' }]}>
            <Text style={[styles.badgeText, { color: completed ? colors.tint : colors.textSecondary }]}>
              {completed ? 'Completed' : 'Draft'}
            </Text>
          </View>
        </View>
        <View style={styles.recentRowBottom}>
          <Text style={[styles.recentDate, { color: colors.textSecondary }]}>{new Date(item.date).toLocaleDateString()}</Text>
          {typeof item.total_volume === 'number' && (
            <Text style={[styles.recentStat, { color: colors.textSecondary }]}>Vol: {formatWeight(Math.round(item.total_volume), 'kg')}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderTile = (key: string) => {
    const val = analytics.find((a) => a.key === key)?.value ?? '-';
    const labelMap: Record<string, string> = {
      weekly_sessions: 'Weekly Sessions',
      total_volume_7d: 'Volume (7d)',
      body_weight_avg_7d: 'Weight (7d avg)'
    };
    return (
      <View key={key} style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}> 
        <Text style={[styles.tileLabel, { color: colors.textSecondary }]}>{labelMap[key] || key}</Text>
        <Text style={[styles.tileValue, { color: colors.text }]}>{val}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Workouts</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Fast logging • Minimal steps</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.tint }]}
          onPress={handleQuickStart}
          activeOpacity={0.9}
          disabled={loading}
        >
          <Text style={styles.primaryButtonText}>{loading ? 'Starting...' : 'Quick Start'}</Text>
        </TouchableOpacity>

        {draft && (
          <TouchableOpacity
            style={[styles.secondaryButton, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
            onPress={handleResume}
            activeOpacity={0.9}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Resume Draft</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.secondaryButton, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
          onPress={() => router.push('/fitness/workout-plans')}
          activeOpacity={0.9}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.text }]}>From Plan</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tilesHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Progress</Text>
        <TouchableOpacity onPress={() => router.push('/fitness/workout-preferences')}>
          <Text style={[styles.link, { color: colors.tint }]}>Preferences</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tilesWrap}>
        {tiles.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Pick up to 3 tiles in Preferences</Text>
        ) : (
          tiles.map(renderTile)
        )}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent</Text>
        <TouchableOpacity onPress={() => router.push('/fitness/workout-history')}>
          <Text style={[styles.link, { color: colors.tint }]}>History</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
      )}

      {loading && !recent.length ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={colors.tint} />
        </View>
      ) : (
        <FlatList
          data={recent}
          keyExtractor={(w) => w.id}
          renderItem={renderRecentItem}
          contentContainerStyle={styles.recentList}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No workouts yet. Start your first one!</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
    opacity: 0.8,
  },
  actions: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  primaryButton: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    ...Shadows.light,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionHeader: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tilesHeader: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tilesWrap: {
    flexDirection: 'row',
    gap: Spacing.md,
    flexWrap: 'wrap',
  },
  tile: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    width: '48%',
    ...Shadows.light,
    marginBottom: Spacing.md,
  },
  tileLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  tileValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  link: {
    fontSize: 14,
    fontWeight: '700',
  },
  loadingWrap: {
    paddingVertical: Spacing.lg,
  },
  errorText: {
    marginBottom: Spacing.sm,
  },
  recentList: {
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  recentCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    ...Shadows.light,
    marginBottom: Spacing.md,
  },
  recentRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  recentRowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recentName: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  recentDate: {
    fontSize: 13,
    fontWeight: '500',
  },
  recentStat: {
    fontSize: 13,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
});


