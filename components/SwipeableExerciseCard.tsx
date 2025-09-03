import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import {
  CheckCircle,
  X,
  Plus,
  Minus,
  Clock,
  Dumbbell,
  Target,
  TrendingUp,
} from 'lucide-react-native';
import { useUnits } from '@/context/UnitContext';

const { width: screenWidth } = Dimensions.get('window');
const SWIPE_THRESHOLD = screenWidth * 0.2;

interface WorkoutSet {
  id: string;
  reps: number;
  weight: number;
  completed: boolean;
  restTime?: number;
}

interface Exercise {
  id: string;
  name: string;
  sets: WorkoutSet[];
  targetSets: number;
  targetReps: number;
  targetWeight: number;
  notes?: string;
  muscleGroup?: string;
}

interface SwipeableExerciseCardProps {
  exercise: Exercise;
  setIndex: number;
  set: WorkoutSet;
  onSetComplete: (setId: string) => void;
  onSetSkip: (setId: string) => void;
  onWeightChange: (setId: string, weight: number) => void;
  onRepsChange: (setId: string, reps: number) => void;
  isCurrentSet: boolean;
  previousSetData?: { weight: number; reps: number };
}

export const SwipeableExerciseCard: React.FC<SwipeableExerciseCardProps> = ({
  exercise,
  setIndex,
  set,
  onSetComplete,
  onSetSkip,
  onWeightChange,
  onRepsChange,
  isCurrentSet,
  previousSetData,
}) => {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { getWeightIncrement } = useUnits();
  
  const translateX = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const [gestureState, setGestureState] = useState<'idle' | 'swiping' | 'completed' | 'skipped'>('idle');
  
  // Glassmorphism style
  const glassStyle = {
    backgroundColor: colors.glass,
    borderColor: colors.glassBorder,
    borderWidth: 1,
  };

  // Get muscle group color
  const getMuscleGroupColor = (muscleGroup?: string) => {
    switch (muscleGroup?.toLowerCase()) {
      case 'chest': return colors.chest;
      case 'back': return colors.back;
      case 'shoulders': return colors.shoulders;
      case 'arms': return colors.arms;
      case 'legs': return colors.legs;
      case 'core': return colors.core;
      case 'cardio': return colors.cardio;
      default: return colors.tint;
    }
  };

  // Detect PR (Personal Record)
  const isPR = previousSetData ? 
    (set.weight > previousSetData.weight || 
     (set.weight === previousSetData.weight && set.reps > previousSetData.reps)) : false;

  const handlePanGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: false }
  );

  const handlePanStateChange = (event: any) => {
    const { state, translationX } = event.nativeEvent;

    if (state === State.END) {
      if (translationX > SWIPE_THRESHOLD) {
        // Swipe right - complete set
        completeSet();
      } else if (translationX < -SWIPE_THRESHOLD) {
        // Swipe left - skip set
        skipSet();
      } else {
        // Return to center
        resetPosition();
      }
    }
  };

  const completeSet = () => {
    setGestureState('completed');
    
    // Haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    // Animate completion
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: screenWidth,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.spring(scale, {
        toValue: 0.8,
        friction: 6,
        useNativeDriver: false,
      }),
    ]).start(() => {
      onSetComplete(set.id);
      
      // Show PR celebration if applicable
      if (isPR) {
        showPRCelebration();
      }
      
      resetPosition();
      setGestureState('idle');
    });
  };

  const skipSet = () => {
    setGestureState('skipped');
    
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    Animated.parallel([
      Animated.timing(translateX, {
        toValue: -screenWidth,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.spring(scale, {
        toValue: 0.8,
        friction: 6,
        useNativeDriver: false,
      }),
    ]).start(() => {
      onSetSkip(set.id);
      resetPosition();
      setGestureState('idle');
    });
  };

  const resetPosition = () => {
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        friction: 6,
        useNativeDriver: false,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const showPRCelebration = () => {
    Alert.alert('🎉 NEW PR!', `Amazing work! You just hit a new personal record!`, [
      { text: 'Keep Going! 💪', style: 'default' }
    ]);
  };

  // Pulse animation for current set
  useEffect(() => {
    if (isCurrentSet && gestureState === 'idle') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.02,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false,
          }),
        ])
      );
      pulse.start();
      
      return () => pulse.stop();
    }
  }, [isCurrentSet, gestureState]);

  const swipeOpacity = translateX.interpolate({
    inputRange: [-screenWidth, -SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD, screenWidth],
    outputRange: [1, 0.7, 1, 0.7, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      {/* Swipe Action Backgrounds */}
      <View style={styles.actionContainer}>
        <View style={[styles.actionLeft, { backgroundColor: colors.error }]}>
          <X size={32} color="#fff" />
          <Text style={styles.actionText}>Skip</Text>
        </View>
        <View style={[styles.actionRight, { backgroundColor: colors.success }]}>
          <CheckCircle size={32} color="#fff" />
          <Text style={styles.actionText}>Complete</Text>
        </View>
      </View>

      <PanGestureHandler
        onGestureEvent={handlePanGestureEvent}
        onHandlerStateChange={handlePanStateChange}
        enabled={isCurrentSet && !set.completed}
      >
        <Animated.View
          style={[
            styles.card,
            glassStyle,
            {
              transform: [{ translateX }, { scale }],
              opacity: swipeOpacity,
              borderLeftColor: getMuscleGroupColor(exercise.muscleGroup),
              borderLeftWidth: 4,
            },
          ]}
        >
          <BlurView intensity={20} tint={theme} style={styles.blurContainer}>
            <LinearGradient
              colors={[
                `${getMuscleGroupColor(exercise.muscleGroup)}10`,
                `${getMuscleGroupColor(exercise.muscleGroup)}05`,
              ]}
              style={styles.gradientOverlay}
            >
              {/* Set Header */}
              <View style={styles.setHeader}>
                <Text style={[styles.setNumber, { color: colors.text }]}>
                  Set {setIndex + 1}
                </Text>
                {isPR && (
                  <View style={[styles.prBadge, { backgroundColor: colors.neonGreen }]}>
                    <TrendingUp size={12} color="#000" />
                    <Text style={styles.prText}>PR!</Text>
                  </View>
                )}
                {set.completed && (
                  <CheckCircle size={20} color={colors.success} />
                )}
              </View>

              {/* Set Data */}
              <View style={styles.setData}>
                <View style={styles.dataGroup}>
                  <View style={styles.dataItem}>
                    <Dumbbell size={16} color={colors.textSecondary} />
                    <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>
                      Weight
                    </Text>
                  </View>
                  <View style={styles.dataControls}>
                    <TouchableOpacity
                      style={[styles.controlButton, { backgroundColor: colors.backgroundSecondary }]}
                      onPress={() => onWeightChange(set.id, Math.max(0, set.weight - getWeightIncrement('small')))}
                    >
                      <Minus size={16} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.dataValue, { color: colors.text }]}>
                      {set.weight}kg
                    </Text>
                    <TouchableOpacity
                      style={[styles.controlButton, { backgroundColor: colors.backgroundSecondary }]}
                      onPress={() => onWeightChange(set.id, set.weight + getWeightIncrement('small'))}
                    >
                      <Plus size={16} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.dataGroup}>
                  <View style={styles.dataItem}>
                    <Target size={16} color={colors.textSecondary} />
                    <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>
                      Reps
                    </Text>
                  </View>
                  <View style={styles.dataControls}>
                    <TouchableOpacity
                      style={[styles.controlButton, { backgroundColor: colors.backgroundSecondary }]}
                      onPress={() => onRepsChange(set.id, Math.max(1, set.reps - 1))}
                    >
                      <Minus size={16} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.dataValue, { color: colors.text }]}>
                      {set.reps}
                    </Text>
                    <TouchableOpacity
                      style={[styles.controlButton, { backgroundColor: colors.backgroundSecondary }]}
                      onPress={() => onRepsChange(set.id, set.reps + 1)}
                    >
                      <Plus size={16} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Previous Set Comparison */}
              {previousSetData && (
                <View style={styles.comparison}>
                  <Text style={[styles.comparisonText, { color: colors.textSecondary }]}>
                    Last: {previousSetData.weight}kg × {previousSetData.reps}
                  </Text>
                  {isPR && (
                    <Text style={[styles.improvementText, { color: colors.neonGreen }]}>
                      🔥 Improvement!
                    </Text>
                  )}
                </View>
              )}

              {/* Swipe Instructions */}
              {isCurrentSet && !set.completed && (
                <View style={styles.swipeInstructions}>
                  <Text style={[styles.instructionText, { color: colors.textTertiary }]}>
                    ← Swipe to skip • Swipe to complete →
                  </Text>
                </View>
              )}
            </LinearGradient>
          </BlurView>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    position: 'relative',
  },
  actionContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    zIndex: 0,
  },
  actionLeft: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 30,
    borderRadius: 16,
    marginRight: 8,
  },
  actionRight: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 30,
    borderRadius: 16,
    marginLeft: 8,
  },
  actionText: {
    color: '#fff',
    fontWeight: '600',
    marginTop: 4,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    zIndex: 1,
  },
  blurContainer: {
    overflow: 'hidden',
    borderRadius: 16,
  },
  gradientOverlay: {
    padding: 16,
  },
  setHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  setNumber: {
    fontSize: 18,
    fontWeight: '700',
  },
  prBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  prText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000',
  },
  setData: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dataGroup: {
    flex: 1,
    alignItems: 'center',
  },
  dataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  dataLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  dataControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  controlButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dataValue: {
    fontSize: 18,
    fontWeight: '700',
    minWidth: 60,
    textAlign: 'center',
  },
  comparison: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  comparisonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  improvementText: {
    fontSize: 12,
    fontWeight: '700',
  },
  swipeInstructions: {
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 12,
    fontWeight: '500',
  },
}); 