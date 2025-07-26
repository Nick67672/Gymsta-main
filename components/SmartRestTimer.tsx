import React, { useState, useRef, useEffect } from 'react';
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
  Target,
  Dumbbell,
  Award,

  SkipForward,
} from 'lucide-react-native';
import { useSmartRestTimer, WorkoutContext, RestSuggestion } from '@/hooks/useSmartRestTimer';

interface SmartRestTimerProps {
  context: WorkoutContext;
  workoutId?: string;
  onTimerComplete?: () => void;
  onTimerStart?: () => void;
  onTimerStop?: () => void;
  showInlineControls?: boolean;
  compactMode?: boolean;
  initialTime?: number;
}

const getIconComponent = (iconName: string, size: number = 16, color: string = '#fff') => {
  switch (iconName) {
    case 'zap': return <Zap size={size} color={color} />;
    case 'target': return <Target size={size} color={color} />;
    case 'clock': return <Clock size={size} color={color} />;
    case 'dumbbell': return <Dumbbell size={size} color={color} />;
    case 'award': return <Award size={size} color={color} />;
    default: return <Clock size={size} color={color} />;
  }
};

export const SmartRestTimer: React.FC<SmartRestTimerProps> = ({
  context,
  workoutId,
  onTimerComplete,
  onTimerStart,
  onTimerStop,
  showInlineControls = true,
  compactMode = false,
  initialTime = 90,
}) => {

  const { theme } = useTheme();
  const colors = Colors[theme];
  
  const {
    timerState,
    userPreferences,
    restSuggestions,
    startTimer,
    stopTimer,
    completeTimer,
    skipTimer,
    adjustTimer,
    resetTimer,
  } = useSmartRestTimer(context, workoutId, initialTime);



  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const progressAnimation = useRef(new Animated.Value(1)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const suggestionAnimation = useRef(new Animated.Value(1)).current;

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(Math.abs(seconds) / 60);
    const secs = Math.abs(seconds) % 60;
    const sign = seconds < 0 ? '-' : '';
    return `${sign}${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress (0 to 1) - inverted so it decreases as time runs out
  const progress = Math.max(0, Math.min(1, timerState.currentTime / timerState.actualStartTime));

  // Timer color based on remaining time - modern, clean colors
  const getTimerColor = () => {
    if (timerState.isCompleted) return '#10B981'; // Modern green
    if (timerState.currentTime <= 10 && timerState.currentTime > 0) return '#F87171'; // Soft red
    if (timerState.currentTime <= 30) return '#FBBF24'; // Warm orange
    return '#3B82F6'; // Modern blue
  };

  // Pulse animation when timer is running
  useEffect(() => {
    if (timerState.isRunning) {
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
  }, [timerState.isRunning]);

  // Progress animation
  useEffect(() => {
    Animated.timing(progressAnimation, {
      toValue: progress,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  // Timer is ready but doesn't auto-start - user must press play

  // Completion celebration
  useEffect(() => {
    if (timerState.isCompleted) {
      Animated.sequence([
        Animated.timing(scaleAnimation, {
          toValue: 1.1,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.spring(scaleAnimation, {
          toValue: 1,
          friction: 4,
          useNativeDriver: false,
        }),
      ]).start();
      
      onTimerComplete?.();
    }
  }, [timerState.isCompleted]);

  // Removed gesture controls

  const handleSuggestionSelect = (suggestion: RestSuggestion) => {
    resetTimer(suggestion.time);
    
    // Animate suggestion selection
    Animated.sequence([
      Animated.timing(suggestionAnimation, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: false,
      }),
      Animated.spring(suggestionAnimation, {
        toValue: 1,
        friction: 6,
        useNativeDriver: false,
      }),
    ]).start();
    
    if (userPreferences.autoStart) {
      setTimeout(() => startTimer(suggestion.time), 300);
    }
  };

  const handlePlayPause = () => {
    if (timerState.isRunning) {
      stopTimer();
      onTimerStop?.();
    } else {
      startTimer();
      onTimerStart?.();
    }
  };

  if (compactMode) {
    return (
      <View style={[styles.compactContainer, { backgroundColor: colors.card }]}>
        <View style={styles.compactTimer}>
          <Text style={[styles.compactTimeText, { color: getTimerColor() }]}>
            {formatTime(timerState.currentTime)}
          </Text>
          {timerState.isRunning && (
            <View style={[styles.compactProgress, { backgroundColor: colors.backgroundSecondary }]}>
              <Animated.View
                style={[
                  styles.compactProgressFill,
                  {
                    backgroundColor: getTimerColor(),
                    width: progressAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
          )}
        </View>
        
        <View style={styles.compactControls}>
          <TouchableOpacity
            style={[styles.compactButton, { backgroundColor: colors.backgroundSecondary }]}
            onPress={() => adjustTimer(-15)}
          >
            <Text style={[styles.compactButtonText, { color: colors.text }]}>-15s</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.compactButton, { backgroundColor: getTimerColor() }]}
            onPress={handlePlayPause}
          >
            {timerState.isRunning ? (
              <Pause size={16} color="#fff" />
            ) : (
              <Play size={16} color="#fff" />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.compactButton, { backgroundColor: colors.backgroundSecondary }]}
            onPress={() => adjustTimer(15)}
          >
            <Text style={[styles.compactButtonText, { color: colors.text }]}>+15s</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.compactButton, { backgroundColor: colors.error }]}
            onPress={skipTimer}
          >
            <SkipForward size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
      <View style={styles.container}>
        <BlurView intensity={30} tint={theme} style={styles.timerCard}>
          <LinearGradient
            colors={[
              theme === 'dark' ? 'rgba(17, 24, 39, 0.8)' : 'rgba(255, 255, 255, 0.8)',
              theme === 'dark' ? 'rgba(31, 41, 55, 0.6)' : 'rgba(248, 250, 252, 0.6)',
            ]}
            style={styles.gradientOverlay}
          >


            {/* Main Timer Display */}
            <Animated.View
              style={[
                styles.timerDisplay,
                {
                  transform: [
                    { scale: pulseAnimation },
                    { scale: scaleAnimation }
                  ],
                },
              ]}
            >
              {/* Progress Ring */}
              <View style={[styles.progressRing, { 
                borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
                backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
              }]}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: getTimerColor(),
                      opacity: 0.2,
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
                  {formatTime(timerState.currentTime)}
                </Text>
                {timerState.currentTime < 0 && (
                  <Text style={[styles.overtimeText, { color: colors.error }]}>
                    Overtime
                  </Text>
                )}
                {timerState.isCompleted && (
                  <Text style={[styles.completedText, { color: colors.success }]}>
                    ✓ Rest Complete!
                  </Text>
                )}
                
                {/* Status indicator */}
                <Text style={[styles.suggestedIndicator, { 
                  color: theme === 'dark' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)' 
                }]}>
                  {timerState.isRunning ? 'Resting...' : 'Paused'}
                </Text>
              </View>


            </Animated.View>

            {/* Controls */}
            {showInlineControls && (
              <View style={styles.controls}>
                <TouchableOpacity
                  style={[styles.controlButton, { backgroundColor: colors.backgroundSecondary }]}
                  onPress={() => resetTimer()}
                >
                  <RotateCcw size={20} color={colors.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.controlButton, { backgroundColor: colors.backgroundSecondary }]}
                  onPress={() => adjustTimer(-15)}
                >
                  <Text style={[styles.adjustButtonText, { color: colors.text }]}>-15s</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.playButton,
                    { backgroundColor: timerState.isRunning ? colors.error : colors.success }
                  ]}
                  onPress={handlePlayPause}
                >
                  {timerState.isRunning ? (
                    <Pause size={24} color="#fff" />
                  ) : (
                    <Play size={24} color="#fff" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.controlButton, { backgroundColor: colors.backgroundSecondary }]}
                  onPress={() => adjustTimer(15)}
                >
                  <Text style={[styles.adjustButtonText, { color: colors.text }]}>+15s</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.controlButton, { backgroundColor: colors.warning }]}
                  onPress={skipTimer}
                >
                  <SkipForward size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}

            {/* Context Info */}
            <View style={styles.contextInfo}>
              <Text style={[styles.contextText, { 
                color: theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)' 
              }]}>
                {context.exerciseName} • Set {context.setNumber}/{context.totalSets}
              </Text>
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
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    minWidth: 320,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  gradientOverlay: {
    padding: 24,
    alignItems: 'center',
  },
  
  // Suggestions
  suggestionsContainer: {
    marginBottom: 20,
    width: '100%',
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  suggestionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  suggestionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    minHeight: 80,
  },
  suggestionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  suggestionTime: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  suggestionReason: {
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 6,
  },
  confidenceBar: {
    width: '100%',
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 1,
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 1,
  },

  // Timer Display
  timerDisplay: {
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  progressRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    position: 'absolute',
  },
  progressFill: {
    width: 132,
    height: 132,
    borderRadius: 66,
    position: 'absolute',
    top: -2,
    left: -2,
  },
  timeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 140,
    height: 140,
  },
  timeText: {
    fontSize: 36,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif',
    letterSpacing: 1,
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
  suggestedIndicator: {
    fontSize: 10,
    marginTop: 4,
  },


  // Controls
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
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
  adjustButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Context Info
  contextInfo: {
    alignItems: 'center',
    gap: 4,
  },
  contextText: {
    fontSize: 12,
    fontWeight: '500',
  },
  modeIndicator: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Compact Mode
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginVertical: 8,
    gap: 12,
  },
  compactTimer: {
    flex: 1,
  },
  compactTimeText: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  compactProgress: {
    width: '100%',
    height: 3,
    borderRadius: 1.5,
    marginTop: 4,
  },
  compactProgressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  compactControls: {
    flexDirection: 'row',
    gap: 8,
  },
  compactButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactButtonText: {
    fontSize: 10,
    fontWeight: '600',
  },
}); 