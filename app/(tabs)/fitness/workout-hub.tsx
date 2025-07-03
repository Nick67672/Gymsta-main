import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { 
  Calendar, 
  TrendingUp, 
  Target, 
  Dumbbell, 
  ChevronRight, 
  Play,
  BarChart3, 
  Clock,
  Award
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { BorderRadius, Shadows, Spacing } from '@/constants/Spacing';

export default function WorkoutHubScreen() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  const navigateToWorkoutTracker = () => {
    router.push('/fitness/workout-tracker');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Workout Hub</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Track your fitness journey
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Main Feature - Workout Tracker */}
        <View style={styles.mainSection}>
          <TouchableOpacity
            style={[styles.mainCard, { backgroundColor: colors.tint }]}
            onPress={navigateToWorkoutTracker}
            activeOpacity={0.9}
          >
            <View style={styles.mainCardContent}>
              <View style={styles.mainCardHeader}>
                <View style={styles.mainIconContainer}>
                  <Dumbbell size={32} color="#fff" />
                </View>
                <ChevronRight size={24} color="#fff" style={styles.mainNavArrow} />
              </View>
              
              <Text style={styles.mainCardTitle}>Workout Tracker</Text>
              <Text style={styles.mainCardDescription}>
                Plan, track, and analyze your workouts with our comprehensive fitness tracker
              </Text>
            
              <View style={styles.mainFeatures}>
                <View style={styles.mainFeatureItem}>
                  <Calendar size={16} color="#fff" />
                  <Text style={styles.mainFeatureText}>Calendar Planning</Text>
                </View>
                <View style={styles.mainFeatureItem}>
                  <TrendingUp size={16} color="#fff" />
                  <Text style={styles.mainFeatureText}>Progress Analytics</Text>
                </View>
                <View style={styles.mainFeatureItem}>
                  <Target size={16} color="#fff" />
                  <Text style={styles.mainFeatureText}>Volume Tracking</Text>
                </View>
              </View>
            </View>
            </TouchableOpacity>
        </View>

        {/* Quick Stats Section */}
        <View style={styles.statsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Stats</Text>
          
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <View style={[styles.statIconContainer, { backgroundColor: colors.tint + '15' }]}>
                <Play size={20} color={colors.tint} />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>0</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Workouts This Week</Text>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <View style={[styles.statIconContainer, { backgroundColor: '#4CAF50' + '15' }]}>
                <BarChart3 size={20} color="#4CAF50" />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>0kg</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Volume</Text>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <View style={[styles.statIconContainer, { backgroundColor: '#FF9800' + '15' }]}>
                <Clock size={20} color="#FF9800" />
          </View>
              <Text style={[styles.statValue, { color: colors.text }]}>0min</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avg Duration</Text>
        </View>

            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <View style={[styles.statIconContainer, { backgroundColor: '#9C27B0' + '15' }]}>
                <Award size={20} color="#9C27B0" />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>0</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Personal Records</Text>
            </View>
          </View>
        </View>

        {/* Features Overview */}
        <View style={styles.featuresSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Features</Text>
          
          <View style={styles.featuresList}>
            <View style={[styles.featureCard, { backgroundColor: colors.card }]}>
              <Calendar size={24} color={colors.tint} />
              <View style={styles.featureContent}>
                <Text style={[styles.featureTitle, { color: colors.text }]}>Calendar View</Text>
                <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
                  Plan and visualize your workouts on an interactive calendar
            </Text>
              </View>
                </View>
            
            <View style={[styles.featureCard, { backgroundColor: colors.card }]}>
              <TrendingUp size={24} color={colors.tint} />
              <View style={styles.featureContent}>
                <Text style={[styles.featureTitle, { color: colors.text }]}>Progress Tracking</Text>
                <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
                  Monitor your strength gains with detailed analytics and charts
                </Text>
              </View>
            </View>
            
            <View style={[styles.featureCard, { backgroundColor: colors.card }]}>
              <Target size={24} color={colors.tint} />
              <View style={styles.featureContent}>
                <Text style={[styles.featureTitle, { color: colors.text }]}>Exercise Library</Text>
                <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
                  Access a comprehensive database of exercises with auto-suggestions
                </Text>
              </View>
            </View>
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
  mainSection: {
    marginBottom: Spacing.xl,
  },
  mainCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    ...Shadows.heavy,
    minHeight: 200,
  },
  mainCardContent: {
    flex: 1,
  },
  mainCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  mainIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainNavArrow: {
    opacity: 0.8,
  },
  mainCardTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: Spacing.sm,
  },
  mainCardDescription: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 24,
    marginBottom: Spacing.lg,
  },
  mainFeatures: {
    gap: Spacing.md,
  },
  mainFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  mainFeatureText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
  },
  statsSection: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: Spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    ...Shadows.light,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  featuresSection: {
    marginBottom: Spacing.xl,
  },
  featuresList: {
    gap: Spacing.md,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.light,
  },
  featureContent: {
    flex: 1,
    marginLeft: Spacing.lg,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
});