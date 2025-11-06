import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Dimensions, Easing, TextInput, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Zap, Apple, TrendingUp, Calendar, Target, ChefHat, ChevronRight, Sparkles } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { BorderRadius, Shadows, Spacing } from '@/constants/Spacing';
import { Typography } from '@/constants/Typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';

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
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
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
  const headerHeight = 150; // Increased to accommodate header title and quote
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

  const navigateToAiHub = () => {
    router.push('/fitness/ai-hub');
  };

  // Weight tracker removed for now

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
        {/* Header + Quote Banner */}
        <LinearGradient
          colors={theme === 'dark' 
            ? ['rgba(0, 212, 255, 0.25)', 'rgba(168, 85, 247, 0.25)']
            : ['rgba(0, 212, 255, 0.20)', 'rgba(168, 85, 247, 0.20)']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.quoteBanner}
        >
          <View style={styles.headerTopRow}>
            <View />
            <Sparkles size={20} color={theme === 'dark' ? 'rgba(168,85,247,0.9)' : 'rgba(124,58,237,0.9)'} />
          </View>
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
              {/* Removed heart icon from quote carousel */}
              <View style={styles.quoteTextContainer}>
                <Text
                  style={[styles.quoteText, { color: colors.text }]}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                  maxFontSizeMultiplier={1.1}
                  ellipsizeMode="tail"
                >
                  {motivationalQuotes[currentQuoteIndex]}
                </Text>
              </View>
            </Animated.View>
            {/* Dots removed for cleaner, stable layout */}
          </View>
        </LinearGradient>
      </Animated.View>

      <Animated.ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: headerHeight + Spacing.xl, paddingHorizontal: Spacing.lg, paddingBottom: Math.max(Spacing.lg, insets.bottom + Spacing.md) }}
      >
        {/* Removed Explore heading per request */}
        {/* Weight tracker moved to Profile -> Lifts tab */}
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
              colors={['#00D4FF', '#A855F7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hubCardGradient}
            >
              <View style={styles.hubCardContent}>
                <View style={styles.hubCardHeader}>
                  <View style={styles.hubIconContainer}>
                    <Zap size={36} color="#fff" />
                  </View>
                  <ChevronRight size={22} color="rgba(255,255,255,0.9)" />
                </View>
                
                <View style={styles.hubCardBody}>
                  <Text
                    style={styles.hubTitle}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                    ellipsizeMode="tail"
                  >
                    Workout Hub
                  </Text>

                  {/* Subtle icon-only feature row for visual interest */}
                  <View style={styles.hubIconRow}>
                    <View style={styles.hubIconCircleSm}>
                      <TrendingUp size={14} color="rgba(255,255,255,0.9)" />
                    </View>
                    <View style={styles.hubIconCircleSm}>
                      <Calendar size={14} color="rgba(255,255,255,0.9)" />
                    </View>
                    <View style={styles.hubIconCircleSm}>
                      <Target size={14} color="rgba(255,255,255,0.9)" />
                    </View>
                  </View>
                </View>

                {/* Large translucent watermark icon */}
                <View pointerEvents="none" style={styles.hubWatermarkIcon}>
                  <Zap size={120} color="rgba(255,255,255,0.12)" />
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
                  <ChevronRight size={22} color="rgba(255,255,255,0.9)" />
                </View>
                
                <View style={styles.hubCardBody}>
                  <Text
                    style={styles.hubTitle}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                    ellipsizeMode="tail"
                  >
                    Nutrition Hub
                  </Text>

                  {/* Icon-only feature row */}
                  <View style={styles.hubIconRow}>
                    <View style={styles.hubIconCircleSm}>
                      <ChefHat size={14} color="rgba(255,255,255,0.9)" />
                    </View>
                    <View style={styles.hubIconCircleSm}>
                      <TrendingUp size={14} color="rgba(255,255,255,0.9)" />
                    </View>
                  </View>
                </View>

                {/* Large translucent watermark icon */}
                <View pointerEvents="none" style={styles.hubWatermarkIcon}>
                  <Apple size={120} color="rgba(255,255,255,0.12)" />
                </View>

                {/* Removed goal/progress footer */}
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* AI Hub */}
          <TouchableOpacity
            style={styles.hubCardContainer}
            onPress={navigateToAiHub}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#7C3AED', '#A855F7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hubCardGradient}
            >
              <View style={styles.hubCardContent}>
                <View style={styles.hubCardHeader}>
                  <View style={styles.hubIconContainer}>
                    <Sparkles size={36} color="#fff" />
                  </View>
                  <ChevronRight size={22} color="rgba(255,255,255,0.9)" />
                </View>

                <View style={styles.hubCardBody}>
                  <Text
                    style={styles.hubTitle}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                    ellipsizeMode="tail"
                  >
                    AI Hub
                  </Text>

                  {/* Icon-only row */}
                  <View style={styles.hubIconRow}>
                    <View style={styles.hubIconCircleSm}>
                      <Sparkles size={14} color="rgba(255,255,255,0.9)" />
                    </View>
                    <View style={styles.hubIconCircleSm}>
                      <Target size={14} color="rgba(255,255,255,0.9)" />
                    </View>
                  </View>
                </View>

                {/* Large translucent watermark icon */}
                <View pointerEvents="none" style={styles.hubWatermarkIcon}>
                  <Sparkles size={120} color="rgba(255,255,255,0.12)" />
                </View>
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
    paddingTop: 48,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 14,
    marginBottom: Spacing.md,
  },
  quoteContainer: {
    alignItems: 'center',
  },
  quoteContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    maxWidth: screenWidth - Spacing.lg * 2,
    minHeight: 72,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  quoteTextContainer: {
    flex: 1,
  },
  quoteText: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    fontStyle: 'normal',
    letterSpacing: -0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif-medium',
  },
  // Removed dots styles
  content: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: Spacing.md,
    letterSpacing: -0.3,
  },
  hubSection: {
    gap: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  hubCardContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    ...Shadows.heavy,
  },
  hubCardGradient: {
    height: 200,
    borderRadius: 16,
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
  hubIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  hubIconCircleSm: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubWatermarkIcon: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg,
    transform: [{ rotate: '-8deg' }],
  },
  hubTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: Spacing.xs,
  },
  hubDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: Spacing.md,
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
    fontSize: 14,
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