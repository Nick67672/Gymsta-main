import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Trophy,
  Flame,
  Clock,
  Target,
  Zap,
  Star,
  TrendingUp,
  Dumbbell,
} from 'lucide-react-native';
import { BorderRadius, Spacing } from '@/constants/Spacing';

const { width: screenWidth } = Dimensions.get('window');

interface PostDesignShowcaseProps {
  colors: any;
}

const PostDesignShowcase: React.FC<PostDesignShowcaseProps> = ({ colors }) => {
  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          🚀 Gymsta Flow - Unique Post Design
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Experience posts like never before with our innovative floating card system
        </Text>
      </View>

      {/* Feature Highlights */}
      <View style={styles.featuresSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          ✨ Key Features
        </Text>
        
        <View style={styles.featureGrid}>
          <View style={[styles.featureCard, { backgroundColor: colors.card }]}>
            <View style={styles.featureIcon}>
              <Trophy size={24} color="#10B981" />
            </View>
            <Text style={[styles.featureTitle, { color: colors.text }]}>
              Floating Cards
            </Text>
            <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
              Posts appear as elevated floating cards with dynamic shadows and gradients
            </Text>
          </View>

          <View style={[styles.featureCard, { backgroundColor: colors.card }]}>
            <View style={styles.featureIcon}>
              <Heart size={24} color="#FF3B30" />
            </View>
            <Text style={[styles.featureTitle, { color: colors.text }]}>
              Swipe Gestures
            </Text>
            <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
              Swipe right to like, swipe left to comment - intuitive gesture controls
            </Text>
          </View>

          <View style={[styles.featureCard, { backgroundColor: colors.card }]}>
            <View style={styles.featureIcon}>
              <Sparkles size={24} color="#8B5CF6" />
            </View>
            <Text style={[styles.featureTitle, { color: colors.text }]}>
              Progressive Disclosure
            </Text>
            <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
              Content reveals progressively as users interact with the post
            </Text>
          </View>

          <View style={[styles.featureCard, { backgroundColor: colors.card }]}>
            <View style={styles.featureIcon}>
              <Dumbbell size={24} color="#3B82F6" />
            </View>
            <Text style={[styles.featureTitle, { color: colors.text }]}>
              Workout Focused
            </Text>
            <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
              Special emphasis on workout achievements and fitness data
            </Text>
          </View>
        </View>
      </View>

      {/* Design Comparison */}
      <View style={styles.comparisonSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          🔄 How It's Different
        </Text>
        
        <View style={styles.comparisonContainer}>
          <View style={[styles.comparisonCard, { backgroundColor: colors.error + '10' }]}>
            <Text style={[styles.comparisonTitle, { color: colors.error }]}>
              Instagram Style
            </Text>
            <View style={styles.comparisonList}>
              <Text style={[styles.comparisonItem, { color: colors.textSecondary }]}>
                • Flat, static cards
              </Text>
              <Text style={[styles.comparisonItem, { color: colors.textSecondary }]}>
                • Basic tap interactions
              </Text>
              <Text style={[styles.comparisonItem, { color: colors.textSecondary }]}>
                • Standard layout
              </Text>
              <Text style={[styles.comparisonItem, { color: colors.textSecondary }]}>
                • Generic design
              </Text>
            </View>
          </View>

          <View style={[styles.comparisonCard, { backgroundColor: colors.tint + '10' }]}>
            <Text style={[styles.comparisonTitle, { color: colors.tint }]}>
              Gymsta Flow
            </Text>
            <View style={styles.comparisonList}>
              <Text style={[styles.comparisonItem, { color: colors.textSecondary }]}>
                • Floating, dynamic cards
              </Text>
              <Text style={[styles.comparisonItem, { color: colors.textSecondary }]}>
                • Swipe & gesture controls
              </Text>
              <Text style={[styles.comparisonItem, { color: colors.textSecondary }]}>
                • Progressive content reveal
              </Text>
              <Text style={[styles.comparisonItem, { color: colors.textSecondary }]}>
                • Fitness-focused design
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Interactive Demo */}
      <View style={styles.demoSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          🎯 Interactive Elements
        </Text>
        
        <View style={[styles.demoCard, { backgroundColor: colors.card }]}>
          <LinearGradient
            colors={['rgba(16, 185, 129, 0.1)', 'rgba(59, 130, 246, 0.1)', 'rgba(168, 85, 247, 0.05)']}
            style={styles.demoGradient}
          >
            {/* Floating Header */}
            <View style={styles.demoHeader}>
              <View style={styles.demoProfile}>
                <View style={styles.demoAvatar} />
                <View style={styles.demoUserInfo}>
                  <Text style={[styles.demoUsername, { color: colors.text }]}>
                    fitness_user
                  </Text>
                  <Text style={[styles.demoTimestamp, { color: colors.textSecondary }]}>
                    Just now
                  </Text>
                </View>
              </View>
              <View style={styles.demoWorkoutBadge}>
                <Dumbbell size={12} color="#fff" />
              </View>
            </View>

            {/* Achievement Overlay */}
            <View style={styles.demoAchievement}>
              <LinearGradient
                colors={['rgba(16, 185, 129, 0.9)', 'rgba(59, 130, 246, 0.9)']}
                style={styles.achievementGradient}
              >
                <View style={styles.achievementContent}>
                  <Trophy size={20} color="#fff" />
                  <Text style={styles.achievementText}>Workout Complete!</Text>
                  <View style={styles.achievementStats}>
                    <View style={styles.achievementStat}>
                      <Clock size={14} color="#fff" />
                      <Text style={styles.achievementStatText}>45 min</Text>
                    </View>
                    <View style={styles.achievementStat}>
                      <Flame size={14} color="#fff" />
                      <Text style={styles.achievementStatText}>320 cal</Text>
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </View>

            {/* Swipe Indicators */}
            <View style={styles.demoSwipeIndicators}>
              <View style={[styles.demoSwipeIndicator, styles.demoSwipeRight]}>
                <Heart size={16} color="#10B981" />
                <Text style={styles.demoSwipeText}>Like</Text>
              </View>
              <View style={[styles.demoSwipeIndicator, styles.demoSwipeLeft]}>
                <MessageCircle size={16} color="#3B82F6" />
                <Text style={styles.demoSwipeText}>Comment</Text>
              </View>
            </View>

            {/* Quick Stats */}
            <View style={styles.demoStats}>
              <View style={styles.demoStatItem}>
                <Heart size={14} color={colors.textSecondary} />
                <Text style={[styles.demoStatText, { color: colors.textSecondary }]}>
                  1.2K
                </Text>
              </View>
              <View style={styles.demoStatItem}>
                <MessageCircle size={14} color={colors.textSecondary} />
                <Text style={[styles.demoStatText, { color: colors.textSecondary }]}>
                  24
                </Text>
              </View>
              <View style={styles.demoStatItem}>
                <Sparkles size={14} color="#10B981" />
                <Text style={[styles.demoStatText, { color: '#10B981' }]}>
                  Intermediate
                </Text>
              </View>
            </View>

            {/* Floating Actions */}
            <View style={styles.demoActions}>
              <TouchableOpacity style={styles.demoActionButton}>
                <Heart size={24} color="#FF3B30" fill="#FF3B30" strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.demoActionButton}>
                <MessageCircle size={24} color={colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.demoActionButton}>
                <Share2 size={24} color={colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.demoActionButton}>
                <Bookmark size={24} color={colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </View>

      {/* Benefits */}
      <View style={styles.benefitsSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          🎉 Benefits
        </Text>
        
        <View style={styles.benefitsList}>
          <View style={styles.benefitItem}>
            <View style={[styles.benefitIcon, { backgroundColor: colors.tint + '20' }]}>
              <Star size={20} color={colors.tint} />
            </View>
            <View style={styles.benefitContent}>
              <Text style={[styles.benefitTitle, { color: colors.text }]}>
                Unique User Experience
              </Text>
              <Text style={[styles.benefitDescription, { color: colors.textSecondary }]}>
                Stand out from other social media apps with innovative interactions
              </Text>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <View style={[styles.benefitIcon, { backgroundColor: '#10B981' + '20' }]}>
              <Zap size={20} color="#10B981" />
            </View>
            <View style={styles.benefitContent}>
              <Text style={[styles.benefitTitle, { color: colors.text }]}>
                Enhanced Engagement
              </Text>
              <Text style={[styles.benefitDescription, { color: colors.textSecondary }]}>
                Multiple interaction methods increase user engagement and retention
              </Text>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <View style={[styles.benefitIcon, { backgroundColor: '#8B5CF6' + '20' }]}>
              <Target size={20} color="#8B5CF6" />
            </View>
            <View style={styles.benefitContent}>
              <Text style={[styles.benefitTitle, { color: colors.text }]}>
                Fitness-Focused Design
              </Text>
              <Text style={[styles.benefitDescription, { color: colors.textSecondary }]}>
                Tailored specifically for fitness content and workout achievements
              </Text>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <View style={[styles.benefitIcon, { backgroundColor: '#3B82F6' + '20' }]}>
              <TrendingUp size={20} color="#3B82F6" />
            </View>
            <View style={styles.benefitContent}>
              <Text style={[styles.benefitTitle, { color: colors.text }]}>
                iOS Native Feel
              </Text>
              <Text style={[styles.benefitDescription, { color: colors.textSecondary }]}>
                Smooth animations and haptic feedback for premium mobile experience
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  featuresSection: {
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: Spacing.lg,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  featureCard: {
    width: (screenWidth - Spacing.lg * 3) / 2,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  comparisonSection: {
    padding: Spacing.lg,
  },
  comparisonContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  comparisonCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  comparisonTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  comparisonList: {
    gap: Spacing.sm,
  },
  comparisonItem: {
    fontSize: 14,
    lineHeight: 20,
  },
  demoSection: {
    padding: Spacing.lg,
  },
  demoCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    aspectRatio: 1,
  },
  demoGradient: {
    flex: 1,
    padding: Spacing.lg,
  },
  demoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  demoProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  demoAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginRight: Spacing.md,
  },
  demoUserInfo: {
    flex: 1,
  },
  demoUsername: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  demoTimestamp: {
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.7,
  },
  demoWorkoutBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoAchievement: {
    position: 'absolute',
    bottom: 120,
    left: Spacing.lg,
    right: Spacing.lg,
    height: 80,
  },
  achievementGradient: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementContent: {
    alignItems: 'center',
    gap: 4,
  },
  achievementText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  achievementStats: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  achievementStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  achievementStatText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  demoSwipeIndicators: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  demoSwipeIndicator: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  demoSwipeRight: {
    right: Spacing.lg,
  },
  demoSwipeLeft: {
    left: Spacing.lg,
  },
  demoSwipeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  demoStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  demoStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  demoStatText: {
    fontSize: 13,
    fontWeight: '600',
  },
  demoActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  demoActionButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  benefitsSection: {
    padding: Spacing.lg,
  },
  benefitsList: {
    gap: Spacing.lg,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  benefitDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default PostDesignShowcase; 