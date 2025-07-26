import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import {
  Play,
  Pause,
  RotateCcw,
  Clock,
  Zap,
} from 'lucide-react-native';

interface LiveWorkoutTimerProps {
  initialTime?: number; // seconds
  onTimerComplete?: () => void;
  onTimerStart?: () => void;
  onTimerStop?: () => void;
  restSuggestion?: number; // suggested rest time in seconds
  showRestSuggestion?: boolean;
}

export const LiveWorkoutTimer: React.FC<LiveWorkoutTimerProps> = ({
  initialTime = 90,
  onTimerComplete,
  onTimerStart,
  onTimerStop,
  restSuggestion = 90,
  showRestSuggestion = true,
}) => {
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  const [time, setTime] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const progressAnimation = useRef(new Animated.Value(1)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(Math.abs(seconds) / 60);
    const secs = Math.abs(seconds) % 60;
    const sign = seconds < 0 ? '-' : '';
    return `${sign}${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress (0 to 1)
  const progress = Math.max(0, Math.min(1, time / initialTime));

  // Start timer
  const startTimer = () => {
    setIsRunning(true);
    setIsCompleted(false);
    onTimerStart?.();
    
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Stop timer
  const stopTimer = () => {
    setIsRunning(false);
    onTimerStop?.();
    
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  // Reset timer
  const resetTimer = () => {
    setIsRunning(false);
    setTime(initialTime);
    setIsCompleted(false);
    progressAnimation.setValue(1);
    
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  };

  // Timer effect
  useEffect(() => {
    if (isRunning && time > 0) {
      intervalRef.current = setInterval(() => {
        setTime(prevTime => {
          const newTime = prevTime - 1;
          
          // Update progress animation
          Animated.timing(progressAnimation, {
            toValue: Math.max(0, newTime / initialTime),
            duration: 1000,
            useNativeDriver: false,
          }).start();
          
          // Haptic feedback for last 10 seconds
          if (newTime <= 10 && newTime > 0 && Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          
          // Timer completed
          if (newTime <= 0) {
            setIsRunning(false);
            setIsCompleted(true);
            onTimerComplete?.();
            
            if (Platform.OS === 'ios') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          }
          
          return newTime;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, time, initialTime, onTimerComplete]);

  // Pulse animation when timer is running
  useEffect(() => {
    if (isRunning) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false,
          }),
        ])
      );
      pulse.start();
      
      return () => pulse.stop();
    } else {
      pulseAnimation.setValue(1);
    }
  }, [isRunning]);

  // Completion celebration
  useEffect(() => {
    if (isCompleted) {
      Animated.sequence([
        Animated.timing(scaleAnimation, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.spring(scaleAnimation, {
          toValue: 1,
          friction: 4,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [isCompleted]);

  const getTimerColor = () => {
    if (isCompleted) return colors.success;
    if (time <= 10 && time > 0) return colors.error;
    if (time <= 30) return colors.warning;
    return colors.tint;
  };

  return (
    <View style={styles.container}>
      <BlurView intensity={20} tint={theme} style={styles.timerCard}>
        <LinearGradient
          colors={[
            `${getTimerColor()}15`,
            `${getTimerColor()}05`,
          ]}
          style={styles.gradientOverlay}
        >
          {/* Rest Suggestion */}
          {showRestSuggestion && !isRunning && time === initialTime && (
            <View style={styles.suggestionSection}>
              <Zap size={16} color={colors.textSecondary} />
              <Text style={[styles.suggestionText, { color: colors.textSecondary }]}>
                Suggested rest: {Math.floor(restSuggestion / 60)}:{(restSuggestion % 60).toString().padStart(2, '0')}
              </Text>
            </View>
          )}

          {/* Timer Display */}
          <Animated.View
            style={[
              styles.timerDisplay,
              {
                transform: [{ scale: pulseAnimation }, { scale: scaleAnimation }],
              },
            ]}
          >
            {/* Progress Ring */}
            <View style={styles.progressRing}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: getTimerColor(),
                    transform: [{
                      rotate: progressAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      })
                    }],
                  },
                ]}
              />
            </View>

            {/* Time Text */}
            <View style={styles.timeContainer}>
              <Text style={[styles.timeText, { color: getTimerColor() }]}>
                {formatTime(time)}
              </Text>
              {time < 0 && (
                <Text style={[styles.overtimeText, { color: colors.error }]}>
                  Overtime
                </Text>
              )}
              {isCompleted && (
                <Text style={[styles.completedText, { color: colors.success }]}>
                  ✓ Done!
                </Text>
              )}
            </View>
          </Animated.View>

          {/* Controls */}
          <View style={styles.controls}>
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: colors.backgroundSecondary }]}
              onPress={resetTimer}
            >
              <RotateCcw size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.playButton,
                { backgroundColor: isRunning ? colors.error : colors.success }
              ]}
              onPress={isRunning ? stopTimer : startTimer}
            >
              {isRunning ? (
                <Pause size={24} color="#fff" />
              ) : (
                <Play size={24} color="#fff" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: colors.backgroundSecondary }]}
              onPress={() => setTime(time + 30)}
            >
              <Clock size={20} color={colors.textSecondary} />
              <Text style={[styles.addTimeText, { color: colors.textSecondary }]}>
                +30s
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 16,
  },
  timerCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    minWidth: 280,
  },
  gradientOverlay: {
    padding: 24,
    alignItems: 'center',
  },
  suggestionSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  timerDisplay: {
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  progressRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'absolute',
  },
  progressFill: {
    width: 112,
    height: 112,
    borderRadius: 56,
    position: 'absolute',
    top: -2,
    left: -2,
  },
  timeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
    height: 120,
  },
  timeText: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  overtimeText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  completedText: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addTimeText: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
}); 