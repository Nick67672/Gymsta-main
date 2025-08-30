import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { BorderRadius, Shadows, Spacing } from '@/constants/Spacing';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';

type MetricKey = 'weekly_sessions' | 'total_volume_7d' | 'body_weight_avg_7d' | 'streak' | 'one_rm';

const ALL_METRICS: { key: MetricKey; label: string; description: string }[] = [
  { key: 'weekly_sessions', label: 'Weekly Sessions', description: 'Workouts done this week' },
  { key: 'total_volume_7d', label: 'Volume (7d)', description: 'Total weight × reps over 7 days' },
  { key: 'body_weight_avg_7d', label: 'Body Weight (7d avg)', description: 'Average weight this week' },
  { key: 'streak', label: 'Streak', description: 'Consecutive active days' },
  { key: 'one_rm', label: '1RM', description: 'Best estimated 1RM for chosen lifts' },
];

export default function WorkoutPreferences() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { user } = useAuth();

  const [selected, setSelected] = useState<MetricKey[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadPrefs();
  }, [user?.id]);

  const loadPrefs = async () => {
    try {
      const { data, error } = await supabase
        .from('user_progress_preferences')
        .select('metrics')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      const m = (data?.metrics as any[]) || [];
      const keys = m.filter(Boolean) as MetricKey[];
      setSelected(keys.slice(0, 3));
    } catch {
      // ignore
    }
  };

  const toggleMetric = (key: MetricKey) => {
    setSelected((prev) => {
      const exists = prev.includes(key);
      if (exists) return prev.filter((k) => k !== key);
      if (prev.length >= 3) return prev; // max 3
      return [...prev, key];
    });
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc('upsert_user_progress_preferences', {
        p_user_id: user.id,
        p_metrics: selected,
        p_exercises: [],
      });
      if (error) throw error;
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item }: { item: typeof ALL_METRICS[number] }) => {
    const active = selected.includes(item.key);
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: active ? colors.tint : colors.border, borderWidth: 1 }]}
        onPress={() => toggleMetric(item.key)}
        activeOpacity={0.9}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{item.label}</Text>
          <View style={[styles.badge, { backgroundColor: active ? colors.tint : colors.border }]}>
            <Text style={[styles.badgeText, { color: active ? '#fff' : colors.textSecondary }]}>
              {active ? 'Selected' : 'Tap to select'}
            </Text>
          </View>
        </View>
        <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>{item.description}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Workout Preferences</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Pick up to 3 tiles</Text>
      </View>
      <FlatList
        data={ALL_METRICS}
        keyExtractor={(i) => i.key}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.tint }]}
          onPress={save}
          disabled={saving}
        >
          <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save'}</Text>
        </TouchableOpacity>
      </View>
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardDesc: {
    fontSize: 14,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  saveBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  saveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});


