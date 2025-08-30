import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { BorderRadius, Shadows, Spacing } from '@/constants/Spacing';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

type Plan = {
  id: string;
  name: string | null;
  date: string;
  exercises: any[];
  notes?: string | null;
};

export default function WorkoutPlansScreen() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { user } = useAuth();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [planName, setPlanName] = useState('New Plan');

  const todayISO = useMemo(() => new Date().toISOString().split('T')[0], []);

  useEffect(() => {
    if (!user) return;
    loadPlans();
  }, [user?.id]);

  const loadPlans = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('planned_workouts')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setPlans(data || []);
    } catch (e) {
      // non-fatal
    } finally {
      setLoading(false);
    }
  };

  const createPlan = async () => {
    if (!user) return;
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('planned_workouts')
        .insert({
          user_id: user.id,
          name: planName || 'Planned Workout',
          date: todayISO,
          exercises: [],
        })
        .select('*')
        .single();
      if (error) throw error;
      setPlanName('New Plan');
      setPlans((prev) => [data as any, ...prev]);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create plan');
    } finally {
      setCreating(false);
    }
  };

  const deletePlan = async (id: string) => {
    if (!user) return;
    try {
      await supabase.from('planned_workouts').delete().eq('id', id).eq('user_id', user.id);
      setPlans((prev) => prev.filter((p) => p.id !== id));
    } catch {
      // ignore
    }
  };

  const startFromPlan = async (plan: Plan) => {
    if (!user) return;
    // No DB insert; route to tracker to start from plan locally
    router.push({ pathname: '/fitness/workout-tracker', params: { action: 'fromPlan', planId: plan.id } });
  };

  const renderPlan = ({ item }: { item: Plan }) => {
    const exerciseCount = Array.isArray(item.exercises) ? item.exercises.length : 0;
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}> 
        <View style={styles.cardTop}>
          <Text style={[styles.planName, { color: colors.text }]} numberOfLines={1}>
            {item.name || 'Planned Workout'}
          </Text>
          <Text style={[styles.planDate, { color: colors.textSecondary }]}>
            {new Date(item.date).toLocaleDateString()}
          </Text>
        </View>
        <Text style={[styles.planMeta, { color: colors.textSecondary }]}>{exerciseCount} exercises</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.tint }]}
            onPress={() => startFromPlan(item)}
          >
            <Text style={styles.primaryText}>Start</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryBtn, { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }]}
            onPress={() => deletePlan(item.id)}
          >
            <Text style={[styles.secondaryText, { color: colors.text }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Workout Plans</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Create simple re-usable plans</Text>
      </View>

      <View style={styles.createRow}>
        <TextInput
          style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
          value={planName}
          onChangeText={setPlanName}
          placeholder="Plan name"
          placeholderTextColor={colors.textSecondary}
        />
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.tint }]}
          onPress={createPlan}
          disabled={creating}
        >
          <Text style={styles.addText}>{creating ? '...' : 'Add'}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.tint} />
        </View>
      ) : (
        <FlatList
          data={plans}
          keyExtractor={(p) => p.id}
          renderItem={renderPlan}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={{ color: colors.textSecondary, textAlign: 'center', paddingVertical: Spacing.lg }}>No plans yet</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 4,
  },
  createRow: {
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  input: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  addBtn: {
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  addText: {
    color: '#fff',
    fontWeight: '800',
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.light,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  planName: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  planDate: {
    fontSize: 13,
    fontWeight: '600',
  },
  planMeta: {
    fontSize: 13,
    marginBottom: Spacing.sm,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  primaryBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  primaryText: {
    color: '#fff',
    fontWeight: '800',
  },
  secondaryBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  secondaryText: {
    fontWeight: '800',
  },
  loadingWrap: {
    paddingVertical: Spacing.lg,
  },
});


