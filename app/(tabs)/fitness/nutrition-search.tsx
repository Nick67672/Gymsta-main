import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { BorderRadius, Spacing } from '@/constants/Spacing';
import { STARTER_FOODS } from '@/constants/FoodDatabase';
import { FoodDefinition, MealType } from '@/types/nutrition';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function NutritionSearchScreen() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { user } = useAuth();
  const params = useLocalSearchParams<{ date: string | string[]; meal: string | string[] }>();

  const [query, setQuery] = useState('');
  const [selectedServing, setSelectedServing] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return STARTER_FOODS;
    return STARTER_FOODS.filter(f => f.name.toLowerCase().includes(q));
  }, [query]);

  const addFood = async (food: FoodDefinition) => {
    try {
      if (!user) return;
      const mealParam = Array.isArray(params.meal) ? params.meal[0] : params.meal;
      const dateParam = Array.isArray(params.date) ? params.date[0] : params.date;
      const resolvedMeal = (mealParam as MealType) || 'breakfast';
      const resolvedDate = (dateParam as string) || new Date().toISOString().slice(0, 10);
      const grams = selectedServing ?? food.default_serving_grams;
      // Compute totals based on per-100g
      const factor = grams / 100;
      const calories = food.calories * factor;
      const protein_g = food.protein_g * factor;
      const carbs_g = food.carbs_g * factor;
      const fat_g = food.fat_g * factor;
      const fiber_g = (food.fiber_g || 0) * factor;
      const sugar_g = (food.sugar_g || 0) * factor;
      const sodium_mg = (food.sodium_mg || 0) * factor;

      const { error } = await supabase.from('nutrition_entries').insert({
        user_id: user.id,
        entry_date: resolvedDate,
        meal: resolvedMeal,
        food_id: null,
        user_food_id: null,
        source: 'starter',
        food_name: food.name,
        serving_grams: grams,
        servings: 1,
        calories,
        protein_g,
        carbs_g,
        fat_g,
        fiber_g,
        sugar_g,
        sodium_mg
      });
      if (error) throw error;
      router.back();
    } catch (e) {
      Alert.alert('Error', 'Could not add entry.');
    }
  };

  const renderItem = ({ item }: { item: FoodDefinition }) => (
    <View style={[styles.row, { borderColor: colors.border }]}> 
      <View style={{ flex: 1 }}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{`${Math.round(item.calories)} kcal / 100g • P${item.protein_g} C${item.carbs_g} F${item.fat_g}`}</Text>
        <View style={styles.servingsWrap}>
          {item.common_servings.slice(0, 3).map(s => (
            <TouchableOpacity key={s.label} onPress={() => setSelectedServing(s.grams)} style={[styles.servingChip, { borderColor: colors.border, backgroundColor: selectedServing === s.grams ? colors.tint : 'transparent' }]}> 
              <Text style={{ color: selectedServing === s.grams ? '#fff' : colors.textSecondary, fontSize: 12 }}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.tint }]} onPress={() => addFood(item)}>
        <Text style={styles.addTxt}>Add</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <View style={styles.header}> 
        <TouchableOpacity onPress={() => router.back()} style={{ padding: Spacing.xs }}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Add Food</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search foods"
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.inputBackground }]}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={f => f.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 40 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        style={{ paddingHorizontal: Spacing.md }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingTop: 60, paddingBottom: Spacing.sm },
  title: { fontSize: 18, fontWeight: '700' },
  searchWrap: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
  input: { borderWidth: 1, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 10 },
  row: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderWidth: 1, borderRadius: BorderRadius.lg },
  name: { fontWeight: '600', marginBottom: 4 },
  servingsWrap: { flexDirection: 'row', gap: 8, marginTop: 8 },
  servingChip: { paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderRadius: 999 },
  addBtn: { marginLeft: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: BorderRadius.md },
  addTxt: { color: '#fff', fontWeight: '700' }
});


