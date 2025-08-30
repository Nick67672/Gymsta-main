import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { ChevronLeft } from 'lucide-react-native';

export default function WorkoutInsightsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const colors = Colors[theme];
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<any | null>(null);
  const [workouts, setWorkouts] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [{ data: p }, { data: w }] = await Promise.all([
          supabase.from('planned_workouts').select('*').eq('id', id).maybeSingle(),
          supabase
            .from('workouts')
            .select('date,total_volume,exercises')
            .eq('planned_workout_id', id)
            .order('date', { ascending: true }),
        ]);
        setPlan(p || null);
        setWorkouts(w || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const stats = useMemo(() => {
    const sessions = workouts.length;
    const lastDate = workouts.length ? workouts[workouts.length - 1].date : undefined;
    const totalVolume = workouts.reduce((a, b) => a + (b.total_volume || 0), 0);
    const avgVolume = sessions ? Math.round(totalVolume / sessions) : 0;
    const avgExercises = sessions
      ? Math.round(
          (workouts.reduce((a, w) => a + (Array.isArray(w.exercises) ? w.exercises.length : 0), 0) / sessions) * 10
        ) / 10
      : 0;
    return { sessions, lastDate, avgVolume, totalVolume, avgExercises };
  }, [workouts]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {plan?.name || 'Workout Insights'}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      {loading ? (
        <View style={styles.center}> 
          <ActivityIndicator color={colors.tint} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Overview</Text>
            <Text style={{ color: colors.textSecondary }}>Sessions: {stats.sessions}</Text>
            {!!stats.lastDate && <Text style={{ color: colors.textSecondary }}>Last: {stats.lastDate}</Text>}
            <Text style={{ color: colors.textSecondary }}>Avg volume: {stats.avgVolume}</Text>
            <Text style={{ color: colors.textSecondary }}>Avg exercises: {stats.avgExercises}</Text>
            <Text style={{ color: colors.textSecondary }}>Total volume: {stats.totalVolume}</Text>
          </View>

          {/* Placeholder for charts - integrate chart kit if desired */}
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Volume trend</Text>
            <Text style={{ color: colors.textSecondary }}>Charts to be added here.</Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  title: { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: 12, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
});


