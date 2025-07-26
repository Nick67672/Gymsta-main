import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Zap, Apple, TrendingUp, Calendar, Target, ChefHat, ChevronRight, Sparkles } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { BorderRadius, Shadows, Spacing } from '@/constants/Spacing';
import { Typography } from '@/constants/Typography';

export default function FitnessHubScreen() {
  const { theme } = useTheme();
  const colors = Colors[theme];

  const navigateToWorkoutHub = () => {
    router.push('/fitness/workout-hub');
  };

  const navigateToNutritionHub = () => {
    router.push('/fitness/nutrition-hub');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Fitness Hub</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Choose your fitness journey
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Main Hub Options */}
        <View style={styles.hubSection}>
          {/* Workout Hub */}
          <TouchableOpacity
            style={[styles.hubCard, { backgroundColor: colors.card }]}
            onPress={navigateToWorkoutHub}
            activeOpacity={0.7}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.hubIconContainer, { backgroundColor: colors.tint + '15' }]}>
                <Zap size={36} color={colors.tint} />
              </View>
              <ChevronRight size={24} color={colors.textSecondary} style={styles.navArrow} />
            </View>
            
            <View style={styles.hubContent}>
              <Text style={[styles.hubTitle, { color: colors.text }]}>Workout Hub</Text>
              <Text style={[styles.hubDescription, { color: colors.textSecondary }]}>
                Track workouts, log exercises, and monitor your fitness progress
              </Text>
              
              <View style={styles.hubFeatures}>
                <View style={styles.featureItem}>
                  <TrendingUp size={16} color={colors.tint} />
                  <Text style={[styles.featureText, { color: colors.textSecondary }]}>Progress Tracking</Text>
                </View>
                <View style={styles.featureItem}>
                  <Calendar size={16} color={colors.tint} />
                  <Text style={[styles.featureText, { color: colors.textSecondary }]}>Workout Plans</Text>
                </View>
                <View style={styles.featureItem}>
                  <Target size={16} color={colors.tint} />
                  <Text style={[styles.featureText, { color: colors.textSecondary }]}>Personal Records</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>

          {/* Nutrition Hub */}
          <TouchableOpacity
            style={[styles.hubCard, { backgroundColor: colors.card }]}
            onPress={navigateToNutritionHub}
            activeOpacity={0.7}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.hubIconContainer, { backgroundColor: '#4CAF50' + '15' }]}>
                <Apple size={36} color="#4CAF50" />
              </View>
              <ChevronRight size={24} color={colors.textSecondary} style={styles.navArrow} />
            </View>
            
            <View style={styles.hubContent}>
              <Text style={[styles.hubTitle, { color: colors.text }]}>Nutrition Hub</Text>
              <Text style={[styles.hubDescription, { color: colors.textSecondary }]}>
                Plan meals, track calories, and maintain a healthy diet
              </Text>
              
              <View style={styles.hubFeatures}>
                <View style={styles.featureItem}>
                  <ChefHat size={16} color="#4CAF50" />
                  <Text style={[styles.featureText, { color: colors.textSecondary }]}>Meal Planning</Text>
                </View>
                <View style={styles.featureItem}>
                  <TrendingUp size={16} color="#4CAF50" />
                  <Text style={[styles.featureText, { color: colors.textSecondary }]}>Calorie Tracking</Text>
                </View>
                <View style={styles.featureItem}>
                  <Target size={16} color="#4CAF50" />
                  <Text style={[styles.featureText, { color: colors.textSecondary }]}>Nutrition Goals</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Motivational Quote Section */}
        <View style={styles.motivationSection}>
          <View style={[styles.motivationCard, { backgroundColor: colors.backgroundSecondary }]}>
            <View style={styles.motivationHeader}>
              <Sparkles size={20} color={colors.tint} />
              <Text style={[styles.motivationTitle, { color: colors.text }]}>Daily Motivation</Text>
            </View>
            <Text style={[styles.motivationText, { color: colors.textSecondary }]}>
              "Your body can do it. It's your mind you need to convince."
            </Text>
          </View>
        </View>
      </ScrollView>
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
    paddingBottom: Spacing.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  hubSection: {
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  hubCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    ...Shadows.heavy,
    minHeight: 180,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  hubIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrow: {
    opacity: 0.6,
  },
  hubContent: {
    flex: 1,
  },
  hubTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: Spacing.sm,
  },
  hubDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: Spacing.lg,
    fontWeight: '400',
  },
  hubFeatures: {
    gap: Spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  featureText: {
    fontSize: 15,
    fontWeight: '500',
  },
  motivationSection: {
    marginBottom: Spacing.xl,
  },
  motivationCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  motivationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  motivationTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  motivationText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    fontStyle: 'italic',
    fontWeight: '500',
  },
}); 