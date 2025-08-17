import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useUnits } from '@/context/UnitContext';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { BorderRadius, Spacing } from '@/constants/Spacing';
import { Dumbbell, Target, TrendingUp } from 'lucide-react-native';

export const UnitSystemDemo: React.FC = () => {
  const { units, updateUnits, formatWeight, convertWeight } = useUnits();
  const { theme } = useTheme();
  const colors = Colors[theme];

  // Sample workout data
  const sampleWorkout = {
    exercises: [
      { name: 'Bench Press', sets: [{ reps: 8, weight: 100 }, { reps: 8, weight: 100 }, { reps: 6, weight: 100 }] },
      { name: 'Squats', sets: [{ reps: 10, weight: 80 }, { reps: 10, weight: 80 }, { reps: 8, weight: 80 }] },
      { name: 'Deadlifts', sets: [{ reps: 5, weight: 120 }, { reps: 5, weight: 120 }, { reps: 5, weight: 120 }] },
    ],
    totalVolume: 2500, // in kg
    duration: 45,
    calories: 320,
  };

  const calculateTotalVolume = () => {
    let total = 0;
    sampleWorkout.exercises.forEach(exercise => {
      exercise.sets.forEach(set => {
        total += set.reps * set.weight;
      });
    });
    return total;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Unit System Demo</Text>
      
      {/* Unit Toggle */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Current Unit: {units.weight_unit.toUpperCase()}</Text>
        <View style={styles.unitToggle}>
          <TouchableOpacity
            style={[
              styles.unitButton,
              units.weight_unit === 'kg' && styles.unitButtonActive,
              { borderColor: colors.border }
            ]}
            onPress={() => updateUnits({ weight_unit: 'kg' })}
          >
            <Text style={[
              styles.unitButtonText,
              { color: units.weight_unit === 'kg' ? colors.tint : colors.textSecondary }
            ]}>
              Kilograms (KG)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.unitButton,
              units.weight_unit === 'lbs' && styles.unitButtonActive,
              { borderColor: colors.border }
            ]}
            onPress={() => updateUnits({ weight_unit: 'lbs' })}
          >
            <Text style={[
              styles.unitButtonText,
              { color: units.weight_unit === 'lbs' ? colors.tint : colors.textSecondary }
            ]}>
              Pounds (LBS)
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sample Workout Display */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Sample Workout</Text>
        
        {sampleWorkout.exercises.map((exercise, index) => (
          <View key={index} style={styles.exerciseItem}>
            <Text style={[styles.exerciseName, { color: colors.text }]}>{exercise.name}</Text>
            <View style={styles.setsContainer}>
              {exercise.sets.map((set, setIndex) => (
                <Text key={setIndex} style={[styles.setText, { color: colors.textSecondary }]}>
                  Set {setIndex + 1}: {set.reps} reps × {formatWeight(set.weight, 'kg')}
                </Text>
              ))}
            </View>
          </View>
        ))}
      </View>

      {/* Workout Stats */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Workout Statistics</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Target size={24} color={colors.tint} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {formatWeight(calculateTotalVolume(), 'kg')}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Volume</Text>
          </View>
          
          <View style={styles.statItem}>
            <Dumbbell size={24} color="#4CAF50" />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {sampleWorkout.exercises.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Exercises</Text>
          </View>
          
          <View style={styles.statItem}>
            <TrendingUp size={24} color="#FF9800" />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {sampleWorkout.exercises.reduce((total, ex) => total + ex.sets.length, 0)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Sets</Text>
          </View>
        </View>
      </View>

      {/* Conversion Examples */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Conversion Examples</Text>
        
        <View style={styles.conversionExamples}>
          <Text style={[styles.conversionText, { color: colors.textSecondary }]}>
            100 kg = {formatWeight(100, 'kg')} = {formatWeight(100, 'lbs')}
          </Text>
          <Text style={[styles.conversionText, { color: colors.textSecondary }]}>
            225 lbs = {formatWeight(225, 'lbs')} = {formatWeight(225, 'kg')}
          </Text>
          <Text style={[styles.conversionText, { color: colors.textSecondary }]}>
            Current setting: {weightUnit === 'kg' ? 'Kilograms' : 'Pounds'}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  section: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: Spacing.md,
  },
  unitToggle: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  unitButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  unitButtonActive: {
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
  },
  unitButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  exerciseItem: {
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  setsContainer: {
    marginLeft: Spacing.md,
  },
  setText: {
    fontSize: 14,
    marginBottom: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  conversionExamples: {
    gap: Spacing.sm,
  },
  conversionText: {
    fontSize: 14,
    lineHeight: 20,
  },
}); 