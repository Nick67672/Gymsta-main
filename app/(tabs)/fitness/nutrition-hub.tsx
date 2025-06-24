import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowLeft, Clock } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { BorderRadius, Shadows, Spacing } from '@/constants/Spacing';

export default function NutritionHubScreen() {
  const { theme } = useTheme();
  const colors = Colors[theme];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Nutrition Hub</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Coming Soon Content */}
      <View style={styles.content}>
        <View style={[styles.comingSoonCard, { backgroundColor: colors.card }]}>
          <View style={[styles.iconContainer, { backgroundColor: colors.tint + '20' }]}>
            <Clock size={48} color={colors.tint} />
          </View>
          <Text style={[styles.comingSoonTitle, { color: colors.text }]}>
            Coming Soon!
          </Text>
          <Text style={[styles.comingSoonDescription, { color: colors.textSecondary }]}>
            We're working hard to bring you an amazing nutrition tracking experience. 
            Stay tuned for meal logging, macro tracking, and personalized nutrition insights.
          </Text>
        </View>
      </View>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  comingSoonCard: {
    width: '100%',
    maxWidth: 320,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    ...Shadows.medium,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  comingSoonTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  comingSoonDescription: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
});