import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { BorderRadius, Shadows, Spacing } from '@/constants/Spacing';
import { useAuth } from '@/context/AuthContext';
import { useUnits } from '@/context/UnitContext';
import { supabase } from '@/lib/supabase';

type WorkoutSet = { reps: number; weight: number; completed?: boolean };
type Exercise = { id: string; name: string; sets: WorkoutSet[] };

export default function WorkoutSessionScreen() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { user } = useAuth();
  const { formatWeight } = useUnits();
  const { workoutId, readOnly } = useLocalSearchParams<{ workoutId: string; readOnly?: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState<string>('Workout');
  const [date, setDate] = useState<string>('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [durationMin, setDurationMin] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [isReadOnly, setIsReadOnly] = useState<boolean>(readOnly === '1');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const startTimeRef = useRef<number | null>(null);
  const autosaveTimer = useRef<NodeJS.Timeout | null>(null);

  const todayISO = useMemo(() => new Date().toISOString().split('T')[0], []);

  useEffect(() => {
    if (!user || !workoutId) return;
    loadWorkout();
    loadSuggestions();
  }, [user?.id, workoutId]);

  const loadWorkout = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('id', workoutId)
        .eq('user_id', user!.id)
        .single();
      if (error) throw error;
      setName(data.name || 'Workout');
      setDate(data.date || todayISO);
      setExercises(Array.isArray(data.exercises) ? data.exercises : []);
      setIsCompleted(!!data.is_completed);
      setDurationMin(data.duration_minutes || 0);
      setNotes(data.notes || '');
      if (!isReadOnly && !data.is_completed) {
        startTimeRef.current = Date.now();
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to load workout');
    } finally {
      setLoading(false);
    }
  };

  const loadSuggestions = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('workouts')
        .select('exercises')
        .eq('user_id', user.id)
        .eq('is_completed', true)
        .order('date', { ascending: false })
        .limit(20);
      if (error) throw error;
      const names = new Set<string>();
      (data || []).forEach((w: any) => {
        (w.exercises || []).forEach((ex: any) => {
          if (ex?.name) names.add(String(ex.name));
        });
      });
      setSuggestions(Array.from(names).slice(0, 8));
    } catch {
      // ignore
    }
  };

  const scheduleAutosave = useCallback(() => {
    if (isReadOnly) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      void autosave();
    }, 600) as unknown as NodeJS.Timeout;
  }, [isReadOnly, name, date, exercises, notes]);

  const autosave = async () => {
    if (!user || !workoutId || isReadOnly) return;
    try {
      const elapsedMin = computeElapsed();
      await supabase
        .from('workouts')
        .update({
          name,
          date,
          exercises,
          duration_minutes: elapsedMin,
          notes,
        })
        .eq('id', workoutId)
        .eq('user_id', user.id);
    } catch (e) {
      // non-fatal
    }
  };

  useEffect(() => {
    scheduleAutosave();
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [name, date, exercises, notes, scheduleAutosave]);

  const computeElapsed = () => {
    if (!startTimeRef.current) return durationMin;
    const diffMs = Date.now() - startTimeRef.current;
    const mins = Math.floor(diffMs / 1000 / 60);
    return Math.max(durationMin, mins);
  };

  const addExercise = () => {
    if (isReadOnly) return;
    const newExercise: Exercise = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: '',
      sets: [{ reps: 8, weight: 0, completed: false }],
    };
    setExercises((prev) => [...prev, newExercise]);
  };

  const quickAddExercise = (nameToAdd: string) => {
    if (isReadOnly) return;
    const newExercise: Exercise = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: nameToAdd,
      sets: [{ reps: 8, weight: 0, completed: false }],
    };
    setExercises((prev) => [...prev, newExercise]);
  };

  const updateExerciseName = (exerciseId: string, value: string) => {
    if (isReadOnly) return;
    setExercises((prev) => prev.map((ex) => (ex.id === exerciseId ? { ...ex, name: value } : ex)));
  };

  const addSet = (exerciseId: string) => {
    if (isReadOnly) return;
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        const last = ex.sets[ex.sets.length - 1] || { reps: 8, weight: 0, completed: false };
        return { ...ex, sets: [...ex.sets, { ...last, completed: false }] };
      })
    );
  };

  const updateSet = (
    exerciseId: string,
    setIndex: number,
    field: 'reps' | 'weight' | 'completed',
    value: number | boolean
  ) => {
    if (isReadOnly) return;
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s, i) => (i === setIndex ? { ...s, [field]: value } as WorkoutSet : s)),
        };
      })
    );
  };

  const deleteExercise = (exerciseIndex: number) => {
    if (isReadOnly) return;
    Alert.alert('Delete Exercise?', 'This will delete the entire exercise and all its sets.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setExercises((prev) => prev.filter((_, i) => i !== exerciseIndex));
        },
      },
    ]);
  };

  const deleteSet = (exerciseId: string, setIndex: number) => {
    if (isReadOnly) return;
    Alert.alert('Delete Set?', 'This will delete this specific set.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setExercises((prev) =>
            prev.map((ex) => {
              if (ex.id !== exerciseId) return ex;
              return {
                ...ex,
                sets: ex.sets.filter((_, i) => i !== setIndex),
              };
            })
          );
        },
      },
    ]);
  };

  const finishWorkout = async () => {
    if (!user || !workoutId) return;
    setSaving(true);
    try {
      const elapsedMin = computeElapsed();
      // Simple PR detection (best single-set weight per exercise name)
      const bestNow: Record<string, number> = {};
      exercises.forEach((ex) => {
        const maxSet = Math.max(...ex.sets.map((s) => Number(s.weight) || 0), 0);
        if (!Number.isFinite(maxSet)) return;
        bestNow[ex.name || ''] = Math.max(bestNow[ex.name || ''] || 0, maxSet);
      });

      const { error } = await supabase
        .from('workouts')
        .update({ is_completed: true, duration_minutes: elapsedMin, exercises, name, notes })
        .eq('id', workoutId)
        .eq('user_id', user.id);
      if (error) throw error;
      try {
        // Fetch last 10 completed workouts to compare PRs lightly
        const { data } = await supabase
          .from('workouts')
          .select('exercises')
          .eq('user_id', user.id)
          .eq('is_completed', true)
          .order('date', { ascending: false })
          .limit(10);
        const historicalBest: Record<string, number> = {};
        (data || []).forEach((w: any) => {
          (w.exercises || []).forEach((ex: any) => {
            const maxSet = Math.max(...(ex?.sets || []).map((s: any) => Number(s.weight) || 0), 0);
            if (!Number.isFinite(maxSet)) return;
            const key = String(ex?.name || '');
            historicalBest[key] = Math.max(historicalBest[key] || 0, maxSet);
          });
        });
        const prs = Object.entries(bestNow)
          .filter(([k, v]) => k && v > (historicalBest[k] || 0))
          .map(([k]) => k)
          .slice(0, 3);
        if (prs.length) {
          Alert.alert('Nice!', `New PR: ${prs.join(', ')}`);
        }
      } catch {
        // ignore PR failures
      }
      setIsCompleted(true);
      router.push({ pathname: '/fitness/workout-summary', params: { workoutId } });
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to finish workout');
    } finally {
      setSaving(false);
    }
  };

  const discardWorkout = async () => {
    if (!user || !workoutId) return;
    Alert.alert('Discard workout?', 'This will delete the draft workout.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await supabase.from('workouts').delete().eq('id', workoutId).eq('user_id', user.id);
            router.push('/fitness/simple-workout-hub');
          } catch {
            // non-fatal
          }
        },
      },
    ]);
  };

  const totalSets = useMemo(() => exercises.reduce((acc, ex) => acc + ex.sets.length, 0), [exercises]);
  const totalVolume = useMemo(() => {
    let vol = 0;
    exercises.forEach((ex) => {
      ex.sets.forEach((s) => {
        vol += (Number(s.reps) || 0) * (Number(s.weight) || 0);
      });
    });
    return vol;
  }, [exercises]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TextInput
          style={[styles.nameInput, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
          value={name}
          onChangeText={setName}
          editable={!isReadOnly}
          placeholder="Workout name"
          placeholderTextColor={colors.textSecondary}
        />
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryChip, { color: colors.textSecondary }]}>{totalSets} sets</Text>
          <Text style={[styles.summaryChip, { color: colors.textSecondary }]}>{formatWeight(totalVolume, 'kg')}</Text>
          <Text style={[styles.summaryChip, { color: colors.textSecondary }]}>{computeElapsed()} min</Text>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: Spacing.xl }}>
        {exercises.map((ex, exerciseIndex) => (
          <View key={ex.id} style={[styles.exerciseCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
            <View style={styles.exerciseHeader}>
              <TextInput
                style={[styles.exerciseName, { color: colors.text }]}
                value={ex.name}
                onChangeText={(t) => updateExerciseName(ex.id, t)}
                editable={!isReadOnly}
                placeholder="Exercise name"
                placeholderTextColor={colors.textSecondary}
              />
              {!isReadOnly && (
                <TouchableOpacity
                  style={[styles.deleteExerciseBtn, { backgroundColor: '#EF4444' }]}
                  onPress={() => deleteExercise(exerciseIndex)}
                >
                  <Text style={[styles.deleteExerciseText, { color: 'white' }]}>×</Text>
                </TouchableOpacity>
              )}
            </View>
            {ex.sets.map((s, i) => (
              <View key={i} style={styles.setRow}>
                <Text style={[styles.setIndex, { color: colors.textSecondary }]}>Set {i + 1}</Text>
                <TextInput
                  style={[styles.setInput, styles.setInputFixed, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }]}
                  keyboardType="number-pad"
                  value={String(s.reps)}
                  editable={!isReadOnly}
                  onChangeText={(t) => updateSet(ex.id, i, 'reps', Number(t || 0))}
                  placeholder="Reps"
                  placeholderTextColor={colors.textSecondary}
                />
                <TextInput
                  style={[styles.setInput, styles.setInputFixed, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }]}
                  keyboardType="decimal-pad"
                  value={String(s.weight)}
                  editable={!isReadOnly}
                  onChangeText={(t) => updateSet(ex.id, i, 'weight', Number(t || 0))}
                  placeholder="Weight"
                  placeholderTextColor={colors.textSecondary}
                />
                <TouchableOpacity
                  disabled={isReadOnly}
                  style={[styles.completeBtn, { backgroundColor: s.completed ? colors.tint : colors.border }]}
                  onPress={() => updateSet(ex.id, i, 'completed', !s.completed)}
                >
                  <Text style={[styles.completeText, { color: s.completed ? '#fff' : colors.textSecondary }]}>
                    {s.completed ? '✓' : '•'}
                  </Text>
                </TouchableOpacity>
                {!isReadOnly && (
                  <TouchableOpacity
                    style={[styles.deleteSetBtn, { backgroundColor: '#EF4444' }]}
                    onPress={() => deleteSet(ex.id, i)}
                  >
                    <Text style={[styles.deleteSetText, { color: 'white' }]}>×</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {!isReadOnly && (
              <TouchableOpacity style={[styles.addSetBtn, { borderColor: colors.border }]} onPress={() => addSet(ex.id)}>
                <Text style={[styles.addSetText, { color: colors.text }]}>+ Add set</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        {!isReadOnly && (
          <TouchableOpacity style={[styles.addExerciseBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]} onPress={addExercise}>
            <Text style={[styles.addExerciseText, { color: colors.text }]}>Add exercise</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {!isReadOnly && (
          <>
            <TouchableOpacity
              style={[styles.finishBtn, { backgroundColor: colors.tint }]}
              disabled={saving}
              onPress={finishWorkout}
            >
              <Text style={styles.finishText}>{saving ? 'Saving…' : 'Finish Workout'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.discardBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
              onPress={discardWorkout}
            >
              <Text style={[styles.discardText, { color: colors.text }]}>Discard</Text>
            </TouchableOpacity>
          </>
        )}
        {isReadOnly && (
          <TouchableOpacity
            style={[styles.finishBtn, { backgroundColor: colors.tint }]}
            onPress={() => router.push('/fitness/simple-workout-hub')}
          >
            <Text style={styles.finishText}>Back to Hub</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.sm,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  nameInput: {
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 18,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  summaryChip: {
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  exerciseCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.light,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  deleteSetBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteSetText: {
    fontSize: 16,
    fontWeight: '800',
  },
  deleteExerciseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteExerciseText: {
    fontSize: 16,
    fontWeight: '800',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  setIndex: {
    width: 52,
    textAlign: 'right',
    fontWeight: '600',
  },
  setInput: {
    flexGrow: 0,
    flexShrink: 0,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  setInputFixed: {
    width: 90,
    textAlign: 'center',
  },
  completeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeText: {
    fontSize: 16,
    fontWeight: '800',
  },
  addSetBtn: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    marginTop: Spacing.xs,
  },
  addSetText: {
    fontWeight: '700',
  },
  addExerciseBtn: {
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    ...Shadows.light,
  },
  addExerciseText: {
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  finishBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  finishText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  discardBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  discardText: {
    fontSize: 16,
    fontWeight: '700',
  },
});


