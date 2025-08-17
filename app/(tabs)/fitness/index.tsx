import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Dimensions, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Zap, Apple, TrendingUp, Calendar, Target, ChefHat, ChevronRight, Sparkles, Heart } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { BorderRadius, Shadows, Spacing } from '@/constants/Spacing';
import { Typography } from '@/constants/Typography';

const { width: screenWidth } = Dimensions.get('window');

// Motivational quotes array - simplified without authors
const motivationalQuotes = [
  "Your body can do it. It's your mind you need to convince.",
  "The only bad workout is the one that didn't happen.",
  "Strength does not come from the physical capacity. It comes from an indomitable will.",
  "The difference between the impossible and the possible lies in determination.",
  "Don't wish for it. Work for it.",
  "Every expert was once a beginner.",
  "The only person you are destined to become is the person you decide to be.",
  "Success isn't always about greatness. It's about consistency."
];

export default function FitnessHubScreen() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  // Animation values
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [scaleAnim] = useState(new Animated.Value(0.9));
  
  // Quote banner animation
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const quoteSlideAnim = useRef(new Animated.Value(0)).current;
  const quoteOpacityAnim = useRef(new Animated.Value(1)).current;

  // Collapsing header animation
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerHeight = 120; // Reduced height since we removed the title
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, headerHeight],
    outputRange: [0, -headerHeight],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Start quote rotation
    const cleanupQuotes = startQuoteRotation();
    return cleanupQuotes;
  }, []);

  const startQuoteRotation = () => {
    let isCancelled = false;
    const interval = setInterval(() => {
      // Fade out current quote
      Animated.sequence([
        Animated.parallel([
          Animated.timing(quoteSlideAnim, {
            toValue: -50,
            duration: 420,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(quoteOpacityAnim, {
            toValue: 0,
            duration: 420,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        if (isCancelled) return;
        // Switch to next quote BEFORE fading in
        setCurrentQuoteIndex((prevIndex) => (prevIndex + 1) % motivationalQuotes.length);
        // Reset position to right
        quoteSlideAnim.setValue(50);
        // Fade in next quote
        Animated.parallel([
          Animated.timing(quoteSlideAnim, {
            toValue: 0,
            duration: 420,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(quoteOpacityAnim, {
            toValue: 1,
            duration: 420,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, 7000);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  };

  const navigateToWorkoutHub = () => {
    router.push('/fitness/workout-hub');
  };

  const navigateToNutritionHub = () => {
    router.push('/fitness/nutrition-hub');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Collapsing Header */}
      <Animated.View 
        style={[
          styles.collapsingHeader,
          {
            transform: [{ translateY: headerTranslateY }]
          }
        ]}
      >
        {/* Enhanced Quote Banner */}
        <LinearGradient
          colors={theme === 'dark' 
            ? ['rgba(99, 102, 241, 0.25)', 'rgba(168, 85, 247, 0.2)', 'rgba(236, 72, 153, 0.15)']
            : ['rgba(99, 102, 241, 0.2)', 'rgba(168, 85, 247, 0.15)', 'rgba(236, 72, 153, 0.1)']
          }
          style={styles.quoteBanner}
        >
          <View style={styles.quoteContainer}>
            <Animated.View 
              style={[
                styles.quoteContent,
                {
                  opacity: quoteOpacityAnim,
                  transform: [{ translateX: quoteSlideAnim }]
                }
              ]}
            >
              <View style={styles.quoteIconContainer}>
                <Heart size={28} color={colors.tint} />
              </View>
              <View style={styles.quoteTextContainer}>
                <Text style={[styles.quoteText, { color: colors.text }]}>
                  {motivationalQuotes[currentQuoteIndex]}
                </Text>
              </View>
            </Animated.View>
          </View>
        </LinearGradient>
      </Animated.View>

      <Animated.ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: headerHeight + Spacing.xl * 2 }}
      >


        {/* Main Hub Options */}
        <Animated.View 
          style={[
            styles.hubSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }]
            }
          ]}
        >
          
          {/* Workout Hub */}
          <TouchableOpacity
            style={styles.hubCardContainer}
            onPress={navigateToWorkoutHub}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#667eea', '#764ba2', '#f093fb']}
              style={styles.hubCardGradient}
            >
              <View style={styles.hubCardContent}>
                <View style={styles.hubCardHeader}>
                  <View style={styles.hubIconContainer}>
                    <Zap size={36} color="#fff" />
                  </View>
                </View>
                
                <View style={styles.hubCardBody}>
                  <Text style={styles.hubTitle}>Workout Hub</Text>
                  <Text style={styles.hubDescription}>
                    Track workouts, log exercises, and monitor your fitness progress
                  </Text>
                  
                  <View style={styles.hubFeatures}>
                    <View style={styles.featureItem}>
                      <TrendingUp size={16} color="rgba(255,255,255,0.9)" />
                      <Text style={styles.featureText}>Progress Tracking</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Calendar size={16} color="rgba(255,255,255,0.9)" />
                      <Text style={styles.featureText}>Workout Plans</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Target size={16} color="rgba(255,255,255,0.9)" />
                      <Text style={styles.featureText}>Personal Records</Text>
                    </View>
                  </View>
                </View>

                {/* Removed goal/progress footer */}
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Nutrition Hub */}
          <TouchableOpacity
            style={styles.hubCardContainer}
            onPress={navigateToNutritionHub}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#11998e', '#38ef7d', '#56ab2f']}
              style={styles.hubCardGradient}
            >
              <View style={styles.hubCardContent}>
                <View style={styles.hubCardHeader}>
                  <View style={styles.hubIconContainer}>
                    <Apple size={36} color="#fff" />
                  </View>
                </View>
                
                <View style={styles.hubCardBody}>
                  <Text style={styles.hubTitle}>Nutrition Hub</Text>
                  <Text style={styles.hubDescription}>
                    Plan meals, track calories, and maintain a healthy diet
                  </Text>
                  
                  <View style={styles.hubFeatures}>
                    <View style={styles.featureItem}>
                      <ChefHat size={16} color="rgba(255,255,255,0.9)" />
                      <Text style={styles.featureText}>Meal Planning</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <TrendingUp size={16} color="rgba(255,255,255,0.9)" />
                      <Text style={styles.featureText}>Calorie Tracking</Text>
                    </View>
                    {/* Removed Nutrition Goals feature since goals aren't supported */}
                  </View>
                </View>

                {/* Removed goal/progress footer */}
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  collapsingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  quoteBanner: {
    paddingTop: 60,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  quoteContainer: {
    alignItems: 'center',
  },
  quoteContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    maxWidth: screenWidth - Spacing.lg * 2,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  quoteIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  quoteTextContainer: {
    flex: 1,
  },
  quoteText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 26,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: Spacing.lg,
    letterSpacing: -0.3,
  },
  hubSection: {
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  hubCardContainer: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.heavy,
  },
  hubCardGradient: {
    minHeight: 220,
  },
  hubCardContent: {
    padding: Spacing.xl,
    flex: 1,
  },
  hubCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  hubIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubStats: {
    alignItems: 'center',
  },
  hubStatNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  hubStatLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  hubCardBody: {
    flex: 1,
  },
  hubTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: Spacing.sm,
  },
  hubDescription: {
    fontSize: 16,
    lineHeight: 24,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: Spacing.lg,
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
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  hubCardFooter: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.25)',
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 3,
    marginBottom: Spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
});