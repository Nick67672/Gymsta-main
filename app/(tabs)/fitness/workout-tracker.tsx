import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Plus, Minus, Save, ArrowLeft, Calendar, CheckCircle } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { BorderRadius, Shadows, Spacing } from '@/constants/Spacing';

interface Set {
  reps: string;
  weight: string;
}

interface Exercise {
  id: string;
  name: string;
  sets: Set[];
  isPR: boolean;
}

export default function WorkoutTrackerScreen() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  const [exercises, setExercises] = useState<Exercise[]>([
    { id: '1', name: '', sets: [{ reps: '', weight: '' }], isPR: false }
  ]);
  const [workoutDate, setWorkoutDate] = useState(new Date());
  const [workoutName, setWorkoutName] = useState('');
  const [saving, setSaving] = useState(false);
  
  const formattedDate = workoutDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const addExercise = () => {
    const newId = Date.now().toString();
    setExercises([...exercises, { id: newId, name: '', sets: [{ reps: '', weight: '' }], isPR: false }]);
  };

  const removeExercise = (exerciseId: string) => {
    if (exercises.length > 1) {
      setExercises(exercises.filter(exercise => exercise.id !== exerciseId));
    }
  };

  const addSet = (exerciseId: string) => {
    setExercises(exercises.map(exercise => {
      if (exercise.id === exerciseId) {
        return {
          ...exercise,
          sets: [...exercise.sets, { reps: '', weight: '' }]
        };
      }
      return exercise;
    }));
  };

  const removeSet = (exerciseId: string, setIndex: number) => {
    setExercises(exercises.map(exercise => {
      if (exercise.id === exerciseId && exercise.sets.length > 1) {
        return {
          ...exercise,
          sets: exercise.sets.filter((_, index) => index !== setIndex)
        };
      }
      return exercise;
    }));
  };

  const handleExerciseNameChange = (id: string, text: string) => {
    setExercises(exercises.map(exercise => {
      if (exercise.id === id) {
        return { ...exercise, name: text };
      }
      return exercise;
    }));
  };

  const handleSetChange = (exerciseId: string, setIndex: number, field: keyof Set, value: string) => {
    setExercises(exercises.map(exercise => {
      if (exercise.id === exerciseId) {
        const newSets = [...exercise.sets];
        newSets[setIndex] = {
          ...newSets[setIndex],
          [field]: value
        };
        return { ...exercise, sets: newSets };
      }
      return exercise;
    }));
  };

  const togglePR = (exerciseId: string) => {
    setExercises(exercises.map(exercise => {
      if (exercise.id === exerciseId) {
        return { ...exercise, isPR: !exercise.isPR };
      }
      return exercise;
    }));
  };

  const handleSaveWorkout = () => {
    const validExercises = exercises.filter(ex => {
      return ex.name.trim() && ex.sets.some(set => set.reps.trim() && set.weight.trim());
    });
    
    if (validExercises.length === 0) {
      Alert.alert('Error', 'Please add at least one exercise with complete set information');
      return;
    }

    if (!workoutName.trim()) {
      Alert.alert('Error', 'Please enter a workout name');
      return;
    }

    setSaving(true);
    
    setTimeout(() => {
      setSaving(false);
      Alert.alert(
        'Workout Saved!',
        `"${workoutName}" has been saved for ${formattedDate}`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }, 1000);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Workout Tracker</Text>
        <TouchableOpacity style={[styles.dateButton, { backgroundColor: colors.backgroundSecondary }]}>
          <Calendar size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={[styles.workoutInfo, { backgroundColor: colors.card }]}>
          <Text style={[styles.dateText, { color: colors.textSecondary }]}>{formattedDate}</Text>
          <TextInput
            style={[styles.workoutNameInput, { 
              backgroundColor: colors.backgroundSecondary,
              color: colors.text,
              borderColor: colors.border
            }]}
            placeholder="Workout Name (e.g., Push Day)"
            placeholderTextColor={colors.textSecondary}
            value={workoutName}
            onChangeText={setWorkoutName}
          />
        </View>

        {exercises.map((exercise, exerciseIndex) => (
          <View key={exercise.id} style={[styles.exerciseCard, { backgroundColor: colors.card }]}>
            <View style={styles.exerciseHeader}>
              <Text style={[styles.exerciseNumber, { color: colors.text }]}>
                Exercise {exerciseIndex + 1}
              </Text>
              {exercises.length > 1 && (
                <TouchableOpacity
                  style={styles.removeExerciseButton}
                  onPress={() => removeExercise(exercise.id)}
                >
                  <Minus size={16} color="#FF3B30" />
                </TouchableOpacity>
              )}
            </View>

            <TextInput
              style={[styles.exerciseNameInput, { 
                backgroundColor: colors.backgroundSecondary,
                color: colors.text,
                borderColor: colors.border
              }]}
              placeholder="Exercise name"
              placeholderTextColor={colors.textSecondary}
              value={exercise.name}
              onChangeText={(text) => handleExerciseNameChange(exercise.id, text)}
            />

            <View style={styles.setsHeader}>
              <Text style={[styles.setsTitle, { color: colors.text }]}>Sets</Text>
              <TouchableOpacity
                style={[styles.prButton, exercise.isPR && { backgroundColor: colors.tint + '20' }]}
                onPress={() => togglePR(exercise.id)}
              >
                <CheckCircle size={16} color={exercise.isPR ? colors.tint : colors.textSecondary} />
                <Text style={[styles.prText, { color: exercise.isPR ? colors.tint : colors.textSecondary }]}>
                  PR
                </Text>
              </TouchableOpacity>
            </View>

            {exercise.sets.map((set, setIndex) => (
              <View key={setIndex} style={styles.setRow}>
                <Text style={[styles.setNumber, { color: colors.text }]}>{setIndex + 1}</Text>
                <TextInput
                  style={[styles.setInput, { 
                    backgroundColor: colors.backgroundSecondary,
                    color: colors.text,
                    borderColor: colors.border
                  }]}
                  placeholder="Reps"
                  placeholderTextColor={colors.textSecondary}
                  value={set.reps}
                  onChangeText={(text) => handleSetChange(exercise.id, setIndex, 'reps', text)}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.setInput, { 
                    backgroundColor: colors.backgroundSecondary,
                    color: colors.text,
                    borderColor: colors.border
                  }]}
                  placeholder="Weight"
                  placeholderTextColor={colors.textSecondary}
                  value={set.weight}
                  onChangeText={(text) => handleSetChange(exercise.id, setIndex, 'weight', text)}
                  keyboardType="numeric"
                />
                {exercise.sets.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeSetButton}
                    onPress={() => removeSet(exercise.id, setIndex)}
                  >
                    <Minus size={14} color="#FF3B30" />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            <TouchableOpacity
              style={[styles.addSetButton, { backgroundColor: colors.backgroundSecondary }]}
              onPress={() => addSet(exercise.id)}
            >
              <Plus size={16} color={colors.text} />
              <Text style={[styles.addSetText, { color: colors.text }]}>Add Set</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity
          style={[styles.addExerciseButton, { backgroundColor: colors.backgroundSecondary }]}
          onPress={addExercise}
        >
          <Plus size={20} color={colors.text} />
          <Text style={[styles.addExerciseText, { color: colors.text }]}>Add Exercise</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.tint }]}
          onPress={handleSaveWorkout}
          disabled={saving}
        >
          <Save size={20} color="#fff" />
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Save Workout'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: { padding: Spacing.xs },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  dateButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1, padding: Spacing.lg },
  workoutInfo: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.medium,
  },
  dateText: { fontSize: 16, fontWeight: '600', marginBottom: Spacing.md, textAlign: 'center' },
  workoutNameInput: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    fontSize: 16,
    fontWeight: '600',
  },
  exerciseCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.medium,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  exerciseNumber: { fontSize: 18, fontWeight: 'bold' },
  removeExerciseButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30' + '20',
  },
  exerciseNameInput: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    fontSize: 16,
    marginBottom: Spacing.md,
  },
  setsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  setsTitle: { fontSize: 16, fontWeight: '600' },
  prButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  prText: { fontSize: 12, fontWeight: '600' },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  setNumber: { width: 30, textAlign: 'center', fontSize: 14, fontWeight: '600' },
  setInput: {
    flex: 1,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: Spacing.sm,
    textAlign: 'center',
    fontSize: 14,
  },
  removeSetButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30' + '20',
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  addSetText: { fontSize: 14, fontWeight: '600' },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  addExerciseText: { fontSize: 16, fontWeight: '600' },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
}); 