import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, TextInput } from 'react-native';
import { ArrowLeft, Plus, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { BorderRadius, Shadows, Spacing } from '@/constants/Spacing';
import { goBack } from '@/lib/goBack';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalInput, setGoalInput] = useState('2000');
  const [savingGoal, setSavingGoal] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickCalories, setQuickCalories] = useState('');
  const [quickMeal, setQuickMeal] = useState<MealType>('breakfast');
  const [savingQuick, setSavingQuick] = useState(false);

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

  const caloriesGoal = goals?.daily_calories ?? null;
  const caloriesLeft = caloriesGoal != null ? Math.max(0, caloriesGoal - totals.calories) : null;

  const loadGoals = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('nutrition_goals')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!error && data) {
        setGoals(data as unknown as NutritionGoals);
        await AsyncStorage.setItem('nutrition_daily_calories', String((data as any).daily_calories ?? ''));
      } else if (!data) {
        // Fallback to local cache
        const cached = await AsyncStorage.getItem('nutrition_daily_calories');
        if (cached) {
          setGoals({
            id: 'local',
            user_id: user.id,
            daily_calories: parseInt(cached, 10),
            protein_g: null,
            carbs_g: null,
            fat_g: null,
            fiber_g: null,
            sodium_mg: null,
          } as unknown as NutritionGoals);
        } else {
          setGoals(null);
        }
      }
    } catch (e) {
      // In case the table doesn't exist yet, use local cache
      const cached = await AsyncStorage.getItem('nutrition_daily_calories');
      if (cached) {
        setGoals({
          id: 'local',
          user_id: user.id,
          daily_calories: parseInt(cached, 10),
          protein_g: null,
          carbs_g: null,
          fat_g: null,
          fiber_g: null,
          sodium_mg: null,
        } as unknown as NutritionGoals);
      }
    }
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
      loadGoals();
    }, [loadEntries, loadGoals])
  );

  const openGoalModal = () => {
    const current = goals?.daily_calories ? String(goals.daily_calories) : '2000';
    setGoalInput(current);
    setShowGoalModal(true);
  };

  const saveCalorieGoal = async () => {
    try {
      setSavingGoal(true);
      if (!user) return;
      const parsed = parseInt(goalInput.trim(), 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        Alert.alert('Invalid value', 'Please enter a positive number.');
        return; 
      }
      const { error } = await supabase
        .from('nutrition_goals')
        .upsert({ user_id: user.id, daily_calories: parsed }, { onConflict: 'user_id' });
      if (error) throw error;
      // Immediate UI update; also refresh from server
      setGoals(prev => ({
        id: (prev && prev.id) ? prev.id : 'local',
        user_id: user.id,
        daily_calories: parsed,
        protein_g: prev?.protein_g ?? null,
        carbs_g: prev?.carbs_g ?? null,
        fat_g: prev?.fat_g ?? null,
        fiber_g: prev?.fiber_g ?? null,
        sodium_mg: prev?.sodium_mg ?? null,
      } as unknown as NutritionGoals));
      await AsyncStorage.setItem('nutrition_daily_calories', String(parsed));
      await loadGoals();
      setShowGoalModal(false);
      Alert.alert('Saved', 'Daily goal updated.');
    } catch (e) {
      Alert.alert('Error', 'Could not save goal.');
    } finally {
      setSavingGoal(false);
    }
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

  const saveQuickAdd = async () => {
    try {
      if (!user) return;
      const kcal = parseInt(quickCalories.trim(), 10);
      if (!Number.isFinite(kcal) || kcal <= 0) {
        Alert.alert('Invalid value', 'Enter calories greater than 0');
        return;
      }
      setSavingQuick(true);
      const { error } = await supabase.from('nutrition_entries').insert({
        user_id: user.id,
        entry_date: entryDate,
        meal: quickMeal,
        source: 'quick_add',
        food_name: 'Quick Add',
        serving_grams: 1,
        servings: 1,
        calories: kcal,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
        fiber_g: 0,
        sugar_g: 0,
        sodium_mg: 0,
      });
      if (error) throw error;
      setShowQuickAdd(false);
      setQuickCalories('');
      await loadEntries();
    } catch (e) {
      Alert.alert('Error', 'Could not add quick calories');
    } finally {
      setSavingQuick(false);
    }
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
        <TouchableOpacity
          style={styles.headerAddBtn}
          onPress={() => { setQuickMeal('breakfast'); setQuickCalories(''); setShowQuickAdd(true); }}
          activeOpacity={0.8}
        >
          <Plus size={22} color={colors.text} />
        </TouchableOpacity>
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
        <TouchableOpacity onPress={openGoalModal} style={[styles.goalChip, { borderColor: colors.border, backgroundColor: colors.card }]}> 
          <Text style={[styles.goalChipText, { color: colors.textSecondary }]}>Goal {caloriesGoal ?? '—'} kcal</Text>
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={[styles.summaryCard, { backgroundColor: colors.card }]}> 
        <View style={styles.summaryRow}>
          <View style={styles.summaryCol}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Goal</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{caloriesGoal ?? '—'}</Text>
          </View>
          <View style={styles.summaryCol}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Food</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{Math.round(totals.calories)}</Text>
          </View>
          <View style={styles.summaryCol}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Remaining</Text>
            <Text style={[styles.summaryValue, { color: colors.tint }]}>{caloriesLeft != null ? Math.round(caloriesLeft) : '—'}</Text>
          </View>
        </View>
        <View style={styles.macrosRow}>
          <Text style={[styles.macroItem, { color: colors.textSecondary }]}>P {Math.round(totals.protein_g)}g</Text>
          <Text style={[styles.macroItem, { color: colors.textSecondary }]}>C {Math.round(totals.carbs_g)}g</Text>
          <Text style={[styles.macroItem, { color: colors.textSecondary }]}>F {Math.round(totals.fat_g)}g</Text>
        </View>
        {!goals ? (
          <TouchableOpacity onPress={openGoalModal} style={[styles.setGoalBtn, { backgroundColor: colors.tint }]}> 
            <Text style={styles.setGoalTxt}>Set daily goal</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={openGoalModal} style={[styles.setGoalBtn, { backgroundColor: colors.tint }]}> 
            <Text style={styles.setGoalTxt}>Edit daily goal</Text>
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

      {/* Goal modal */}
      <Modal visible={showGoalModal} transparent animationType="fade" onRequestClose={() => setShowGoalModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}> 
            <Text style={[styles.modalTitle, { color: colors.text }]}>Daily calorie goal</Text>
            <TextInput
              value={goalInput}
              onChangeText={setGoalInput}
              keyboardType="number-pad"
              placeholder="e.g. 2000"
              placeholderTextColor={colors.textSecondary}
              style={[styles.modalInput, { borderColor: colors.border, backgroundColor: colors.inputBackground, color: colors.text }]}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowGoalModal(false)} style={[styles.modalBtn, { borderColor: colors.border }]}> 
                <Text style={{ color: colors.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={savingGoal} onPress={saveCalorieGoal} style={[styles.modalBtnPrimary, { backgroundColor: colors.tint, opacity: savingGoal ? 0.7 : 1 }]}> 
                <Text style={{ color: '#fff', fontWeight: '700' }}>{savingGoal ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Quick Add modal */}
      <Modal visible={showQuickAdd} transparent animationType="fade" onRequestClose={() => setShowQuickAdd(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}> 
            <Text style={[styles.modalTitle, { color: colors.text }]}>Quick add calories</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: Spacing.md }}>
              {(['breakfast','lunch','dinner','snack'] as MealType[]).map(m => (
                <TouchableOpacity key={m} onPress={() => setQuickMeal(m)} style={[styles.mealChip, { borderColor: colors.border, backgroundColor: quickMeal === m ? colors.tint : 'transparent' }]}> 
                  <Text style={{ color: quickMeal === m ? '#fff' : colors.textSecondary, fontWeight: '600', fontSize: 12 }}>{m[0].toUpperCase() + m.slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              value={quickCalories}
              onChangeText={setQuickCalories}
              keyboardType="number-pad"
              placeholder="Calories (kcal)"
              placeholderTextColor={colors.textSecondary}
              style={[styles.modalInput, { borderColor: colors.border, backgroundColor: colors.inputBackground, color: colors.text }]}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowQuickAdd(false)} style={[styles.modalBtn, { borderColor: colors.border }]}> 
                <Text style={{ color: colors.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={savingQuick} onPress={saveQuickAdd} style={[styles.modalBtnPrimary, { backgroundColor: colors.tint, opacity: savingQuick ? 0.7 : 1 }]}> 
                <Text style={{ color: '#fff', fontWeight: '700' }}>{savingQuick ? 'Saving...' : 'Add'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerAddBtn: { padding: Spacing.xs, width: 32, alignItems: 'flex-end' },
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
  goalChip: { marginLeft: 8, paddingHorizontal: Spacing.sm, paddingVertical: 6, borderWidth: 1, borderRadius: BorderRadius.md },
  goalChipText: { fontSize: 12, fontWeight: '600' },

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
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  modalCard: { width: '100%', maxWidth: 360, borderRadius: BorderRadius.lg, padding: Spacing.lg },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: Spacing.md },
  modalInput: { borderWidth: 1, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 10 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: Spacing.md },
  modalBtn: { paddingHorizontal: Spacing.lg, paddingVertical: 10, borderWidth: 1, borderRadius: BorderRadius.md },
  modalBtnPrimary: { paddingHorizontal: Spacing.lg, paddingVertical: 10, borderRadius: BorderRadius.md },
  mealChip: { paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderRadius: 999 },
});
