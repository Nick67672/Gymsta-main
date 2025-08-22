import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { BorderRadius, Spacing, Shadows } from '@/constants/Spacing';
import { Typography } from '@/constants/Typography';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useUnits } from '@/context/UnitContext';

interface Entry {
  recorded_on: string;
  weight_kg: number;
}

export const WeightTracker: React.FC = () => {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { user } = useAuth();
  const { units, convertWeight } = useUnits();

  const [valueInput, setValueInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    loadEntries();
  }, [user?.id]);

  const loadEntries = async () => {
    try {
      if (!user) return;
      const start = new Date();
      start.setDate(start.getDate() - 42); // last 6 weeks for simple trend
      const { data, error } = await supabase
        .from('user_weight_entries')
        .select('recorded_on, weight_kg')
        .eq('user_id', user.id)
        .gte('recorded_on', start.toISOString().split('T')[0])
        .order('recorded_on', { ascending: false });
      if (error) throw error;
      setEntries((data || []) as Entry[]);
    } catch (e) {
      // non-fatal
    }
  };

  const weeklyAverage = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() - 6);
    const recent = entries.filter(e => e.recorded_on >= start.toISOString().split('T')[0]);
    if (recent.length === 0) return null;
    const sum = recent.reduce((a, b) => a + b.weight_kg, 0);
    return sum / recent.length;
  }, [entries]);

  const lastSeven = useMemo(() => entries.slice(0, 7), [entries]);

  const saveToday = async () => {
    try {
      if (!user) return;
      const raw = parseFloat(valueInput);
      if (Number.isNaN(raw) || raw <= 0) return;
      setSaving(true);
      const asKg = units.weight_unit === 'lbs' ? convertWeight(raw, 'lbs', 'kg') : raw;
      const today = new Date().toISOString().split('T')[0];
      const { error } = await supabase
        .from('user_weight_entries')
        .upsert({ user_id: user.id, recorded_on: today, weight_kg: asKg, source: 'profile' }, { onConflict: 'user_id,recorded_on' });
      if (error) throw error;
      setValueInput('');
      await loadEntries();
    } catch (e) {
      // non-fatal
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>Weight tracker (private)</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Saved privately. Weekly average shown for the last 7 days.</Text>

      <View style={styles.row}> 
        <TextInput
          style={[styles.input, { borderColor: colors.border, backgroundColor: colors.inputBackground, color: colors.text }]}
          placeholder={`Today's weight (${units.weight_unit})`}
          placeholderTextColor={colors.textSecondary}
          keyboardType="numeric"
          value={valueInput}
          onChangeText={setValueInput}
        />
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.tint }]} onPress={saveToday} disabled={saving}>
          <Text style={styles.saveTxt}>{saving ? 'Saving...' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.metaRow}>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>Weekly avg: {weeklyAverage !== null ? `${(units.weight_unit === 'lbs' ? convertWeight(weeklyAverage, 'kg', 'lbs') : weeklyAverage).toFixed(1)} ${units.weight_unit}` : '—'}</Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>{entries.length} entries</Text>
      </View>

      {lastSeven.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm }}>
          {lastSeven.map((e) => {
            const display = units.weight_unit === 'lbs' ? convertWeight(e.weight_kg, 'kg', 'lbs') : e.weight_kg;
            return (
              <View key={e.recorded_on} style={[styles.pill, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                <Text style={[styles.pillTop, { color: colors.text }]}>{display.toFixed(1)} {units.weight_unit}</Text>
                <Text style={[styles.pillSub, { color: colors.textSecondary }]}>{new Date(e.recorded_on).toLocaleDateString()}</Text>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.light,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 12,
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
  saveBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 10,
  },
  saveTxt: {
    color: '#fff',
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  meta: {
    fontSize: 12,
  },
  pill: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    minWidth: 120,
  },
  pillTop: {
    fontSize: 14,
    fontWeight: '700',
  },
  pillSub: {
    fontSize: 11,
    marginTop: 2,
  },
});

export default WeightTracker;


