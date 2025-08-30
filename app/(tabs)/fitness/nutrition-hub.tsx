import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { ArrowLeft, Plus, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { BorderRadius, Shadows, Spacing } from '@/constants/Spacing';
import { goBack } from '@/lib/goBack';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { MealType, NutritionEntry, NutritionGoals } from '@/types/nutrition';

const MEALS: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

function formatDateHuman(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function addDays(iso: string, delta: number) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

export default function NutritionHubScreen() {
  const { theme } = useTheme();
  const colors = Colors[theme];

  // Temporary lock: show Coming Soon screen and block access
  const SHOW_COMING_SOON = true;
  if (SHOW_COMING_SOON) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity style={styles.backButton} onPress={goBack} activeOpacity={0.7}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Nutrition Hub</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Coming soon content */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg }}>
          <Text style={[styles.comingSoonTitle, { color: colors.text }]}>Coming soon</Text>
          <Text style={[styles.comingSoonDescription, { color: colors.textSecondary }]}>We’re building this feature. Check back soon.</Text>
        </View>
      </View>
    );
  }
  const { user } = useAuth();

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [entryDate, setEntryDate] = useState<string>(today);
  const [goals, setGoals] = useState<NutritionGoals | null>(null);
  const [entries, setEntries] = useState<NutritionEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const totals = useMemo(() => {
    const base = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
    for (const e of entries) {
      base.calories += Number(e.calories || 0);
      base.protein_g += Number(e.protein_g || 0);
      base.carbs_g += Number(e.carbs_g || 0);
      base.fat_g += Number(e.fat_g || 0);
    }
    return base;
  }, [entries]);

  const caloriesGoal = goals?.daily_calories ?? 0;
  const caloriesLeft = Math.max(0, (caloriesGoal || 0) - totals.calories);

  const loadGoals = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('nutrition_goals')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!error && data) setGoals(data as unknown as NutritionGoals);
    if (!data) setGoals(null);
  }, [user]);

  const loadEntries = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('nutrition_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('entry_date', entryDate)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setEntries((data || []) as unknown as NutritionEntry[]);
    } catch (e) {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, [user, entryDate]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  useFocusEffect(
    useCallback(() => {
      loadEntries();
    }, [loadEntries])
  );

  const setCalorieGoal = async () => {
    if (!user) return;
    // Simple prompt replacement for RN: quick presets
    const presets = [1800, 2000, 2200, 2500];
    const chosen = presets[1];
    const { error } = await supabase
      .from('nutrition_goals')
      .upsert({ user_id: user.id, daily_calories: chosen }, { onConflict: 'user_id' });
    if (!error) await loadGoals();
  };

  const onDeleteEntry = async (id: string) => {
    try {
      const { error } = await supabase.from('nutrition_entries').delete().eq('id', id);
      if (error) throw error;
      await loadEntries();
    } catch (e) {
      Alert.alert('Error', 'Could not delete entry');
    }
  };

  const navigateToSearch = (meal: MealType) => {
    router.push({ pathname: '/(tabs)/fitness/nutrition-search', params: { date: entryDate, meal } });
  };

  const byMeal = useMemo(() => {
    const map: Record<MealType, NutritionEntry[]> = { breakfast: [], lunch: [], dinner: [], snack: [] };
    for (const e of entries) map[e.meal].push(e);
    return map;
  }, [entries]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}> 
        <TouchableOpacity style={styles.backButton} onPress={goBack} activeOpacity={0.7}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Nutrition</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Date Selector */}
      <View style={[styles.dateBar, { borderBottomColor: colors.border }]}> 
        <TouchableOpacity onPress={() => setEntryDate(d => addDays(d, -1))} style={styles.iconBtn}> 
          <ChevronLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.dateText, { color: colors.text }]}>{formatDateHuman(entryDate)}</Text>
        <TouchableOpacity onPress={() => setEntryDate(d => addDays(d, 1))} style={styles.iconBtn}> 
          <ChevronRight size={20} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setEntryDate(today)} style={[styles.todayBtn, { borderColor: colors.border }]}>
          <Text style={{ color: colors.textSecondary }}>Today</Text>
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={[styles.summaryCard, { backgroundColor: colors.card }]}> 
        <View style={styles.summaryRow}>
          <View style={styles.summaryCol}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Goal</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{caloriesGoal || '—'}</Text>
          </View>
          <View style={styles.summaryCol}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Food</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{Math.round(totals.calories)}</Text>
          </View>
          <View style={styles.summaryCol}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Remaining</Text>
            <Text style={[styles.summaryValue, { color: colors.tint }]}>{Math.round(caloriesLeft)}</Text>
          </View>
        </View>
        <View style={styles.macrosRow}>
          <Text style={[styles.macroItem, { color: colors.textSecondary }]}>P {Math.round(totals.protein_g)}g</Text>
          <Text style={[styles.macroItem, { color: colors.textSecondary }]}>C {Math.round(totals.carbs_g)}g</Text>
          <Text style={[styles.macroItem, { color: colors.textSecondary }]}>F {Math.round(totals.fat_g)}g</Text>
        </View>
        {!goals && (
          <TouchableOpacity onPress={setCalorieGoal} style={[styles.setGoalBtn, { backgroundColor: colors.tint }]}> 
            <Text style={styles.setGoalTxt}>Set daily goal</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {MEALS.map(meal => (
          <View key={meal} style={[styles.mealCard, { backgroundColor: colors.card }]}> 
            <View style={styles.mealHeader}>
              <Text style={[styles.mealTitle, { color: colors.text }]}>{meal.charAt(0).toUpperCase() + meal.slice(1)}</Text>
              <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.tint }]} onPress={() => navigateToSearch(meal)}>
                <Plus size={16} color={'#fff'} />
                <Text style={styles.addBtnTxt}>Add Food</Text>
              </TouchableOpacity>
            </View>

            {byMeal[meal].length === 0 ? (
              <Text style={[styles.emptyMeal, { color: colors.textSecondary }]}>No items</Text>
            ) : (
              <View>
                {byMeal[meal].map(item => (
                  <View key={item.id} style={[styles.entryRow, { borderBottomColor: colors.border }]}> 
                    <View style={styles.entryInfo}>
                      <Text style={[styles.entryName, { color: colors.text }]} numberOfLines={1}>{item.food_name || 'Food'}</Text>
                      <Text style={[styles.entrySub, { color: colors.textSecondary }]}>{`${Math.round(item.calories)} kcal • P${Math.round(item.protein_g)} C${Math.round(item.carbs_g)} F${Math.round(item.fat_g)}`}</Text>
                    </View>
                    <TouchableOpacity onPress={() => onDeleteEntry(item.id)} style={styles.trashBtn}>
                      <Trash2 size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
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
    paddingHorizontal: Spacing.md,
    paddingTop: 60,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 32,
  },
  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  iconBtn: { padding: Spacing.xs },
  dateText: { flex: 1, textAlign: 'center', fontWeight: '600' },
  todayBtn: { paddingHorizontal: Spacing.sm, paddingVertical: 6, borderWidth: 1, borderRadius: BorderRadius.md },

  summaryCard: {
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    ...Shadows.small,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  summaryCol: { alignItems: 'center', flex: 1 },
  summaryLabel: { fontSize: 12 },
  summaryValue: { fontSize: 18, fontWeight: '700' },
  macrosRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: Spacing.xs },
  macroItem: { fontSize: 12 },
  setGoalBtn: { alignSelf: 'center', marginTop: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: 10, borderRadius: BorderRadius.md },
  setGoalTxt: { color: '#fff', fontWeight: '600' },

  mealCard: { marginHorizontal: Spacing.md, marginBottom: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.lg, ...Shadows.small },
  mealHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  mealTitle: { fontSize: 16, fontWeight: '700' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: BorderRadius.md },
  addBtnTxt: { color: '#fff', fontWeight: '600' },
  emptyMeal: { fontSize: 12 },
  entryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1 },
  entryInfo: { flex: 1, paddingRight: Spacing.md },
  entryName: { fontSize: 14, fontWeight: '600' },
  entrySub: { fontSize: 12 },
  trashBtn: { padding: Spacing.xs },
  comingSoonTitle: { fontSize: 22, fontWeight: '800', marginBottom: Spacing.xs },
  comingSoonDescription: { fontSize: 14, textAlign: 'center' },
});
