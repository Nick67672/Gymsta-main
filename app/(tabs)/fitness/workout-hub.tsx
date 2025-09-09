import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput, Modal, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, ChevronLeft, Play, Zap, Plus, Trash2, Edit3, TrendingUp, Flame, Dumbbell } from 'lucide-react-native';
import { router } from 'expo-router';
import { goBack } from '@/lib/goBack';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import Colors from '@/constants/Colors';
import { BorderRadius, Shadows, Spacing } from '@/constants/Spacing';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LineChart } from 'react-native-chart-kit';

export default function WorkoutHubScreen() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [recent, setRecent] = useState<any[]>([]);
  const [progress, setProgress] = useState<{ workoutsThisWeek: number; avgWorkoutTime: number; totalSteps: number }>({ workoutsThisWeek: 0, avgWorkoutTime: 0, totalSteps: 0 });
  const [lastCompletedMap, setLastCompletedMap] = useState<Record<string, string>>({});
  const [sortMode, setSortMode] = useState<'updated' | 'name' | 'exercises'>('updated');
  // Tags removed per request
  const [snackbar, setSnackbar] = useState<{ visible: boolean; text: string; plan?: any } | null>(null);
  const snackTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Exercise 1RM progress tracker state
  const [exerciseIndex, setExerciseIndex] = useState<Record<string, { date: string; oneRM: number }[]>>({});
  const [exerciseList, setExerciseList] = useState<string[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [exerciseFilterQuery, setExerciseFilterQuery] = useState('');
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [loadingExercises, setLoadingExercises] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const savedSort = await AsyncStorage.getItem('hub:sort');
        if (savedSort === 'updated' || savedSort === 'name' || savedSort === 'exercises') setSortMode(savedSort);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('hub:sort', sortMode).catch(() => {});
  }, [sortMode]);

  const PAGE_SIZE = 20;
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPlans = async (reset: boolean) => {
    if (!user) return;
    if (reset) {
      setLoading(true);
      setHasMore(true);
      setPage(0);
      setPlans([]);
    } else {
      setLoadingMore(true);
    }
    try {
      const currentPage = reset ? 0 : page + 1;
      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data: plansData } = await supabase
        .from('planned_workouts')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .range(from, to);
      const chunk = plansData || [];
      setPlans((prev) => reset ? chunk : [...prev, ...chunk]);
      setPage(currentPage);
      setHasMore(chunk.length === PAGE_SIZE);

      // Tags removed

      // Last completed for this chunk
      const planIds = chunk.map((p: any) => p.id);
      if (planIds.length) {
        const { data: byPlan } = await supabase
          .from('workouts')
          .select('planned_workout_id,date')
          .eq('user_id', user.id)
          .eq('is_completed', true)
          .in('planned_workout_id', planIds)
          .order('date', { ascending: false });
        setLastCompletedMap((prev) => {
          const next = { ...prev } as Record<string, string>;
          (byPlan || []).forEach((w: any) => {
            if (!next[w.planned_workout_id]) next[w.planned_workout_id] = w.date;
          });
          return next;
        });
      }

      // Initial load also refresh recent/progress
      if (reset) {
        const since30 = new Date();
        since30.setDate(since30.getDate() - 30);
        const { data: completed } = await supabase
          .from('workouts')
          .select('id,name,date,exercises,total_volume,is_completed')
          .eq('user_id', user.id)
          .eq('is_completed', true)
          .gte('date', since30.toISOString().split('T')[0])
          .order('date', { ascending: false })
          .limit(5);
        setRecent(completed || []);

        const nowISO = new Date().toISOString().split('T')[0];
        const last30 = (completed || []).filter((w: any) => w.date >= since30.toISOString().split('T')[0] && w.date <= nowISO);
        let streak = 0;
        const day = new Date();
        for (let i = 0; i < 365; i++) {
          const iso = day.toISOString().split('T')[0];
          const has = last30.some((w: any) => w.date === iso);
          if (has) streak++; else if (streak > 0) break;
          day.setDate(day.getDate() - 1);
        }
        const d7 = new Date();
        let active7 = 0;
        for (let i = 0; i < 7; i++) {
          const iso = d7.toISOString().split('T')[0];
          if ((completed || []).some((w: any) => w.date === iso)) active7++;
          d7.setDate(d7.getDate() - 1);
        }
        // Calculate workouts this week
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);
        const workoutsThisWeek = (completed || []).filter((w: any) => w.date >= weekStart.toISOString().split('T')[0]).length;
        
        // Calculate average workout time
        const totalTime = (completed || []).reduce((sum: number, w: any) => sum + (w.duration_minutes || 0), 0);
        const avgWorkoutTime = completed && completed.length > 0 ? Math.round(totalTime / completed.length) : 0;
        
        // For now, set total steps to 0 (would need step tracking integration)
        const totalSteps = 0;
        
        setProgress({ workoutsThisWeek, avgWorkoutTime, totalSteps });
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchPlans(true);
  }, [user?.id]);

  // --- Progress Tracker: per-exercise 1RM history ---
  const calculateOneRM = (weight: number, reps: number) => {
    if (!weight || !reps) return 0;
    return reps === 1 ? weight : weight * (1 + reps / 30);
  };

  const loadExerciseHistory = async () => {
    if (!user) return;
    setLoadingExercises(true);
    try {
      const { data, error } = await supabase
        .from('workouts')
        .select('date,exercises')
        .eq('user_id', user.id)
        .eq('is_completed', true)
        .order('date', { ascending: true });
      if (error) throw error;

      const index: Record<string, { date: string; oneRM: number }[]> = {};
      (data || []).forEach((w: any) => {
        const date = w.date;
        const exercises = Array.isArray(w.exercises) ? w.exercises : [];
        exercises.forEach((ex: any) => {
          const name = String(ex?.name || '').trim();
          if (!name) return;
          let best = 0;
          const sets = Array.isArray(ex.sets) ? ex.sets : [];
          sets.forEach((s: any) => {
            if (s?.completed && (s.weight ?? null) !== null && (s.reps ?? null) !== null) {
              const est = calculateOneRM(Number(s.weight) || 0, Number(s.reps) || 0);
              if (est > best) best = est;
            }
          });
          if (!index[name]) index[name] = [];
          if (best > 0) index[name].push({ date, oneRM: best });
        });
      });

      Object.keys(index).forEach((k) => {
        index[k] = index[k].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      });

      const names = Object.keys(index).sort((a, b) => a.localeCompare(b));
      setExerciseIndex(index);
      setExerciseList(names);
      if (!selectedExercise && names.length) setSelectedExercise(names[0]);
    } catch (e) {
      // non-fatal
    } finally {
      setLoadingExercises(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadExerciseHistory();
    }
  }, [user?.id]);

  const startFromPlan = (plan: any) => {
    router.push({ pathname: '/fitness/workout-tracker', params: { action: 'fromPlan', planId: plan.id } });
  };

  const deletePlan = async (plan: any) => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      const { error } = await supabase
        .from('planned_workouts')
        .delete()
        .eq('id', plan.id)
        .eq('user_id', user?.id || '');
      if (error) throw error;
      setPlans((prev) => prev.filter((p) => p.id !== plan.id));
      // Show snackbar with Undo
      if (snackTimeoutRef.current) clearTimeout(snackTimeoutRef.current);
      setSnackbar({ visible: true, text: `Deleted "${plan?.name || 'Workout'}"`, plan });
      snackTimeoutRef.current = setTimeout(() => {
        setSnackbar(null);
        snackTimeoutRef.current = null;
      }, 5000);
    } catch (e) {
      Alert.alert('Error', 'Failed to delete workout. Please try again.');
    }
  };

  const confirmDelete = (plan: any) => {
    Alert.alert(
      'Delete workout',
      `Delete "${plan?.name || 'Workout'}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deletePlan(plan) },
      ]
    );
  };

  const duplicatePlan = async (plan: any) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const { data, error } = await supabase
        .from('planned_workouts')
        .insert({
          user_id: user?.id,
          name: `${plan.name || 'Planned Workout'} (Copy)`,
          date: plan.date || new Date().toISOString().split('T')[0],
          exercises: plan.exercises || [],
          notes: plan.notes || null,
        })
        .select()
        .single();
      if (error) throw error;
      setPlans((prev) => [data, ...prev]);
    } catch (e) {
      Alert.alert('Error', 'Failed to duplicate workout. Please try again.');
    }
  };

  const repeatFromHistory = async (workout: any) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const mappedExercises = (Array.isArray(workout.exercises) ? workout.exercises : []).map((e: any) => ({
        id: e.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: e.name,
        sets: (e.sets || []).map((s: any) => ({ id: s.id || `${Date.now()}`, reps: s.reps || 10, weight: s.weight || 0, completed: false })),
        targetSets: e.targetSets || (e.sets?.length || 1),
        targetReps: e.targetReps || 10,
        targetWeight: e.targetWeight || 0,
        notes: e.notes,
      }));
      const { data, error } = await supabase
        .from('planned_workouts')
        .insert({
          user_id: user?.id,
          name: workout.name || 'Workout',
          date: new Date().toISOString().split('T')[0],
          exercises: mappedExercises,
        })
        .select()
        .single();
      if (error) throw error;
      router.push({ pathname: '/fitness/workout-tracker', params: { action: 'fromPlan', planId: data.id } });
    } catch (e) {
      Alert.alert('Error', 'Could not repeat workout.');
    }
  };

  const handleBeginFromPlan = async (plan: any) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    startFromPlan(plan);
  };

  const openPlanDetail = (plan: any) => {
    router.push({ pathname: '/fitness/workout-plan/[id]', params: { id: plan.id } });
  };

  // insights now navigates to a dedicated page

  const filteredPlans = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let base = !q ? plans : plans.filter((p) => (p.name || 'Planned Workout').toLowerCase().includes(q));
    const sorted = [...base];
    if (sortMode === 'name') {
      sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortMode === 'exercises') {
      sorted.sort((a, b) => (Array.isArray(b.exercises) ? b.exercises.length : 0) - (Array.isArray(a.exercises) ? a.exercises.length : 0));
    } else {
      // updated
      sorted.sort((a, b) => new Date(b.updated_at || b.date || 0).getTime() - new Date(a.updated_at || a.date || 0).getTime());
    }
    return sorted;
  }, [plans, searchQuery, sortMode]);

  // Tag editing removed

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={[styles.backButton, { backgroundColor: colors.card }]}
              onPress={goBack}
            >
              <ChevronLeft size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.headerCenter}>
            <Text style={[styles.title, { color: colors.text }]}>Workout Hub</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Quick start your session</Text>
          </View>
          <View style={styles.headerRight} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: Spacing.xl }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          scrollEventThrottle={16}
          {...(Platform.OS === 'ios' ? { delaysContentTouches: false } : {})}
        >
          {/* Progress Snapshot */}
          <View style={styles.snapshotRow}>
            <LinearGradient
              colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.snapshotTile}
            >
              <Text style={styles.snapshotLabel}>This week</Text>
              <Text style={styles.snapshotValue}>{progress.workoutsThisWeek}</Text>
            </LinearGradient>
            <LinearGradient
              colors={[colors.primaryGradientEnd, colors.primaryGradientStart]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.snapshotTile}
            >
              <Text style={styles.snapshotLabel}>Avg time</Text>
              <Text style={styles.snapshotValue}>{progress.avgWorkoutTime}m</Text>
            </LinearGradient>
            <LinearGradient
              colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.snapshotTile}
            >
              <Text style={styles.snapshotLabel}>Total steps</Text>
              <Text style={styles.snapshotValue}>{progress.totalSteps.toLocaleString()}</Text>
            </LinearGradient>
          </View>

          {/* Quick Start card (below quick stats, above Saved Workouts) */}
          <TouchableOpacity activeOpacity={0.9} delayPressIn={0} onPress={() => router.push('/fitness/workout-tracker?action=quickStart')}>
            <LinearGradient
              colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.quickStartGradient}
            >
              <View style={styles.quickStartContent}>
                <View style={styles.quickStartIconCircle}>
                  <Zap size={18} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.quickStartTitleAlt}>Quick start</Text>
                  <Text style={styles.quickStartSubtitleAlt}>No plan needed — add exercises on the fly.</Text>
                </View>
                <View style={styles.quickStartPill}>
                  <Play size={14} color="#fff" />
                  <Text style={styles.quickStartPillText}>Start</Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Saved Workouts - prioritized */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Saved Workouts</Text>
            <TouchableOpacity
              style={[styles.addPlanButton, { backgroundColor: colors.tint }]}
              delayPressIn={0}
              onPress={() => router.push({ pathname: '/fitness/workout-tracker', params: { action: 'create' } })}
            >
              <Plus size={16} color={'#fff'} />
              <Text style={styles.addPlanText}>Add New</Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
          <TextInput
            placeholder="Search workouts..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          />

          {/* Quick Templates */}
          <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md }}>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }} delayPressIn={0} onPress={() => router.push({ pathname: '/fitness/workout-tracker', params: { action: 'quickStart' } })}>
              <Dumbbell size={14} color={colors.text} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>Quick Start</Text>
            </TouchableOpacity>
            {['Push', 'Pull', 'Legs'].map((tpl) => (
              <TouchableOpacity key={tpl} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }} delayPressIn={0} onPress={() => router.push({ pathname: '/fitness/workout-tracker', params: { action: 'quickStart' } })}>
                <Flame size={14} color={colors.text} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>{tpl}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {/* Tags removed */}

          {loading ? (
            <View style={{ paddingVertical: Spacing.lg }}>
              <ActivityIndicator color={colors.tint} />
            </View>
          ) : filteredPlans.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>{searchQuery ? 'No matches found' : 'No saved workouts yet'}</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>{searchQuery ? 'Try a different search term' : 'Create a plan to get started'}</Text>
            </View>
          ) : (
            <>
              <FlashList
                scrollEnabled={false}
                data={filteredPlans}
                keyExtractor={(item) => item.id}
                estimatedItemSize={140}
                numColumns={1}
                renderItem={({ item: p }) => (
                  <View style={[styles.planCardListRow, { backgroundColor: colors.card }]}
                  >
                    <View style={styles.planCardHeader}>
                      <TouchableOpacity style={styles.deleteIconButton} onPress={() => confirmDelete(p)}>
                        <Trash2 size={16} color={colors.text} />
                      </TouchableOpacity>
                    </View>
                    <Text style={[styles.planName, { color: colors.text }]} numberOfLines={1}>{p.name || 'Planned Workout'}</Text>
                    {/* Tags removed */}
                    <Text style={[styles.planMeta, { color: colors.textSecondary }]}>{Array.isArray(p.exercises) ? p.exercises.length : 0} exercises</Text>
                    {lastCompletedMap[p.id] && (
                      <Text style={[styles.planLastDone, { color: colors.textSecondary }]}>Last done {lastCompletedMap[p.id]}</Text>
                    )}
                    <View style={styles.cardActionsRow}>
                      <TouchableOpacity style={[styles.smallBtn, { borderColor: colors.border }]} delayPressIn={0} onPress={() => router.push({ pathname: '/fitness/workout-tracker', params: { action: 'editPlan', planId: p.id } })}>
                        <Edit3 size={14} color={colors.text} />
                        <Text style={[styles.smallBtnText, { color: colors.text }]}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.smallBtn, { borderColor: colors.border }]} delayPressIn={0} onPress={() => router.push({ pathname: '/fitness/workout-insights/[id]', params: { id: p.id } })}>
                        <TrendingUp size={14} color={colors.text} />
                        <Text style={[styles.smallBtnText, { color: colors.text }]}>Insights</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.beginBtn, { backgroundColor: colors.tint }]} delayPressIn={0} onPress={() => handleBeginFromPlan(p)}>
                        <Play size={14} color={'#fff'} />
                        <Text style={styles.beginBtnText}>Begin</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
              {hasMore && (
                <TouchableOpacity disabled={loadingMore} style={[styles.loadMoreBtn, { borderColor: colors.border }]} delayPressIn={0} onPress={() => fetchPlans(false)}>
                  <Text style={[styles.smallBtnText, { color: colors.text }]}>{loadingMore ? 'Loading…' : 'Load more'}</Text>
                </TouchableOpacity>
              )}

              {/* Quick Start card moved above, removed duplicate */}
            </>
          )}

          {/* Stats Tracker */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Stats Tracker</Text>
          </View>

          <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Coming Soon</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Exercise progress tracking and 1RM charts</Text>
          </View>

          {/* Workout History */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>History & Analytics</Text>
          </View>

          <TouchableOpacity
            style={[styles.historyButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.8}
            delayPressIn={0}
            onPress={() => router.push('/fitness/workout-history')}
          >
            <View style={styles.historyButtonContent}>
              <View style={[styles.historyIconContainer, { backgroundColor: colors.tint + '15' }]}>
                <TrendingUp size={24} color={colors.tint} />
              </View>
              <View style={styles.historyTextContainer}>
                <Text style={[styles.historyButtonTitle, { color: colors.text }]}>Workout History</Text>
                <Text style={[styles.historyButtonSubtitle, { color: colors.textSecondary }]}>
                  View your complete workout timeline and progress
                </Text>
              </View>
              <ChevronRight size={20} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

          {/* CTA and Recent Activity removed; quick start moved to header */}

          
        </ScrollView>

        {/* Undo Snackbar */}
        {snackbar?.visible && (
          <View style={[styles.snackbar, { backgroundColor: colors.card, borderColor: colors.border }] }>
            <Text style={[styles.snackbarText, { color: colors.text }]} numberOfLines={1}>{snackbar.text}</Text>
            <TouchableOpacity onPress={async () => {
              if (!snackbar?.plan) return;
              const plan = snackbar.plan;
              try {
                const { data, error } = await supabase
                  .from('planned_workouts')
                  .insert({
                    user_id: user?.id,
                    name: plan.name,
                    date: plan.date || new Date().toISOString().split('T')[0],
                    exercises: plan.exercises || [],
                    notes: plan.notes || null,
                  })
                  .select()
                  .single();
                if (!error && data) {
                  setPlans((prev) => [data, ...prev]);
                  setSnackbar(null);
                  if (snackTimeoutRef.current) { clearTimeout(snackTimeoutRef.current); snackTimeoutRef.current = null; }
                }
              } catch {}
            }}>
              <Text style={[styles.snackbarAction, { color: colors.tint }]}>Undo</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Insights modal removed; insights now navigates to dedicated page */}

        {/* Tag modal removed */}
      </SafeAreaView>
    </KeyboardAvoidingView>
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
    paddingTop: Spacing.xl,
  },
  headerLeft: {
    width: 60,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    width: 60,
    alignItems: 'flex-end',
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
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  snapshotRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  snapshotTile: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  snapshotLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '600',
  },
  snapshotValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  sectionHeader: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  addPlanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addPlanText: {
    color: '#fff',
    fontWeight: '600',
  },
  searchInput: {
    marginBottom: Spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  mainCTA: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.light,
  },
  mainCTAGradient: {
    padding: Spacing.lg,
    minHeight: 120,
  },
  mainCTAContent: {
    flex: 1,
  },
  mainCTAHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  mainCTAIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainCTATitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: Spacing.xs,
  },
  mainCTADescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  mainCTAButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  mainCTAButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  
  emptyCard: {
    borderRadius: 12,
    padding: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  progressCard: {
    borderRadius: 12,
    padding: Spacing.lg,
    ...Shadows.light,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  chart: {
    borderRadius: 8,
    alignSelf: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  list: {
    gap: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  planCard: {
    width: '48%',
    borderRadius: 12,
    padding: Spacing.lg,
    ...Shadows.light,
  },
  planCardList: {
    width: '100%',
  },
  planCardListRow: {
    width: '100%',
    borderRadius: 12,
    padding: Spacing.lg,
    ...Shadows.light,
    marginBottom: Spacing.md,
  },
  planCardHeader: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  deleteIconButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  planName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  planMeta: {
    fontSize: 13,
    marginBottom: Spacing.md,
  },
  planLastDone: {
    fontSize: 12,
    marginBottom: Spacing.sm,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  smallBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  beginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  beginBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  recentMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
    marginTop: Spacing.md,
  },
  sortBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sortText: {
    fontSize: 12,
    fontWeight: '700',
  },
  quickStartCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  quickStartGradient: {
    borderRadius: 12,
    padding: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  quickStartContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  quickStartIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickStartTitleAlt: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  quickStartSubtitleAlt: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    marginTop: 2,
  },
  quickStartPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  quickStartPillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  quickStartTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  quickStartSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  loadMoreBtn: {
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  cardTagsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.sm,
    flexWrap: 'wrap',
  },
  snackbar: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    bottom: Spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.light,
  },
  snackbarText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    marginRight: Spacing.md,
  },
  snackbarAction: {
    fontSize: 13,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSheet: {
    width: '90%',
    borderRadius: 16,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: Spacing.sm,
  },
  modalButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '700',
  },
  historyButton: {
    borderRadius: 12,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  historyButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  historyIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyTextContainer: {
    flex: 1,
  },
  historyButtonTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  historyButtonSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
});




