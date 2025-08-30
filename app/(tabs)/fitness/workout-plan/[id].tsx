import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import Colors from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, Play, Save, Edit3, Trash2 } from 'lucide-react-native';
import { LineChart } from 'react-native-chart-kit';

export default function PlanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { user } = useAuth();

  const [plan, setPlan] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    setLoading(true);
    (async () => {
      try {
        const [{ data: p }, { data: h }] = await Promise.all([
          supabase.from('planned_workouts').select('*').eq('user_id', user.id).eq('id', id).single(),
          supabase
            .from('workouts')
            .select('id,date,total_volume,exercises,name')
            .eq('user_id', user.id)
            .eq('planned_workout_id', id)
            .order('date', { ascending: true }),
        ]);
        setPlan(p || null);
        setHistory(h || []);
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id, id]);

  const startFromHere = () => {
    if (!plan) return;
    router.push({ pathname: '/fitness/workout-tracker', params: { action: 'fromPlan', planId: plan.id } });
  };

  const totalVolumeSeries = useMemo(() => {
    return history.map((w) => ({ date: w.date, value: w.total_volume || 0 }));
  }, [history]);

  const chartData = useMemo(() => {
    const last = totalVolumeSeries.slice(-8);
    const labels = last.map((p) => {
      try {
        const d = new Date(p.date);
        return `${d.getMonth() + 1}/${d.getDate()}`;
      } catch {
        return p.date;
      }
    });
    const data = last.map((p) => Math.round(p.value || 0));
    return { labels, datasets: [{ data }] };
  }, [totalVolumeSeries]);

  const chartWidth = useMemo(() => Dimensions.get('window').width - 32, []);

  const confirmDelete = () => {
    if (!id || !user) return;
    Alert.alert(
      'Delete workout',
      'Are you sure you want to delete this saved workout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('planned_workouts')
              .delete()
              .eq('id', id as string)
              .eq('user_id', user.id);
            if (!error) {
              router.back();
            } else {
              Alert.alert('Error', 'Failed to delete workout.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {plan?.name || 'Workout Plan'}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Plan Details</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            {Array.isArray(plan?.exercises) ? plan.exercises.length : 0} exercises
          </Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.tint }]} onPress={startFromHere}>
              <Play size={16} color={'#fff'} />
              <Text style={styles.primaryText}>Begin</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: colors.border }]}
              onPress={() => router.push({ pathname: '/fitness/workout-tracker', params: { action: 'editPlan', planId: id as string } })}
            >
              <Edit3 size={16} color={colors.text} />
              <Text style={[styles.secondaryText, { color: colors.text }]}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: colors.border }]}
              onPress={confirmDelete}
            >
              <Trash2 size={16} color={colors.text} />
              <Text style={[styles.secondaryText, { color: colors.text }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Progress</Text>
          {history.length === 0 ? (
            <Text style={{ color: colors.textSecondary }}>No completed sessions from this plan yet.</Text>
          ) : (
            <>
              <LineChart
                data={chartData}
                width={chartWidth}
                height={180}
                yAxisSuffix=""
                chartConfig={{
                  backgroundGradientFrom: colors.card,
                  backgroundGradientTo: colors.card,
                  color: (opacity = 1) => colors.tint + Math.floor(opacity * 255).toString(16),
                  labelColor: () => colors.textSecondary,
                  decimalPlaces: 0,
                  propsForDots: { r: '3', strokeWidth: '0' },
                }}
                bezier
                style={{ borderRadius: 8, alignSelf: 'center' }}
              />
              <View style={{ gap: 8, marginTop: 12 }}>
                {totalVolumeSeries.slice(-8).map((p) => (
                  <View key={`${p.date}`} style={styles.progressRow}>
                    <Text style={[styles.progressDate, { color: colors.textSecondary }]}>{p.date}</Text>
                    <Text style={[styles.progressValue, { color: colors.text }]}>{Math.round(p.value)}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>
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
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  title: { fontSize: 20, fontWeight: '700', flex: 1, textAlign: 'center' },
  content: { flex: 1, paddingHorizontal: 16 },
  card: { borderRadius: 12, padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  cardSubtitle: { fontSize: 12, marginBottom: 12 },
  actionsRow: { flexDirection: 'row', gap: 10 },
  primaryBtn: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  primaryText: { color: '#fff', fontWeight: '700' },
  secondaryBtn: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  secondaryText: { fontWeight: '700' },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  progressDate: { fontSize: 12 },
  progressValue: { fontSize: 14, fontWeight: '700' },
});


