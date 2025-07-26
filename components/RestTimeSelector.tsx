import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { ThemedInput } from '@/components/ThemedInput';
import {
  Clock,
  Zap,
  Target,
  Dumbbell,
  X,
  Check,
} from 'lucide-react-native';

interface RestTimeOption {
  label: string;
  seconds: number;
  description: string;
  icon: React.ReactNode;
  color: string;
}

interface RestTimeSelectorProps {
  selectedRestTime: number; // in seconds
  onRestTimeChange: (seconds: number) => void;
  exerciseType?: 'strength' | 'cardio' | 'endurance' | 'power';
  showModal?: boolean;
  onClose?: () => void;
}

export const RestTimeSelector: React.FC<RestTimeSelectorProps> = ({
  selectedRestTime,
  onRestTimeChange,
  exerciseType = 'strength',
  showModal = false,
  onClose,
}) => {
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');
  const [customSeconds, setCustomSeconds] = useState('');
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const customInputAnimation = useRef(new Animated.Value(0)).current;

  // Preset rest time options based on exercise type
  const getRestTimeOptions = (): RestTimeOption[] => {
    const baseOptions = [
      {
        label: 'Quick',
        seconds: 30,
        description: 'Light exercises, supersets',
        icon: <Zap size={20} color="#fff" />,
        color: colors.neonGreen,
      },
      {
        label: 'Standard',
        seconds: 60,
        description: 'Moderate intensity',
        icon: <Clock size={20} color="#fff" />,
        color: colors.tint,
      },
      {
        label: 'Moderate',
        seconds: 90,
        description: 'Most exercises',
        icon: <Target size={20} color="#fff" />,
        color: colors.intensityMedium,
      },
      {
        label: 'Long',
        seconds: 120,
        description: 'Heavy compound movements',
        icon: <Dumbbell size={20} color="#fff" />,
        color: colors.intensityHigh,
      },
      {
        label: 'Extended',
        seconds: 180,
        description: 'Max effort, powerlifting',
        icon: <Target size={20} color="#fff" />,
        color: colors.intensityExtreme,
      },
    ];

    // Adjust recommendations based on exercise type
    switch (exerciseType) {
      case 'cardio':
        return baseOptions.map(option => ({
          ...option,
          seconds: Math.max(15, option.seconds - 30),
        }));
      case 'power':
        return baseOptions.map(option => ({
          ...option,
          seconds: option.seconds + 60,
        }));
      case 'endurance':
        return baseOptions.map(option => ({
          ...option,
          seconds: Math.max(15, option.seconds - 15),
        }));
      default:
        return baseOptions;
    }
  };

  const restTimeOptions = getRestTimeOptions();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    if (secs === 0) return `${mins}m`;
    return `${mins}m ${secs}s`;
  };

  const handleOptionSelect = (seconds: number) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Scale animation
    Animated.sequence([
      Animated.timing(scaleAnimation, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: false,
      }),
      Animated.spring(scaleAnimation, {
        toValue: 1,
        friction: 6,
        useNativeDriver: false,
      }),
    ]).start();

    onRestTimeChange(seconds);
  };

  const handleClose = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onClose?.();
  };

  const handleCustomTime = () => {
    const minutes = parseInt(customMinutes) || 0;
    const seconds = parseInt(customSeconds) || 0;
    const totalSeconds = minutes * 60 + seconds;
    
    if (totalSeconds > 0 && totalSeconds <= 600) { // Max 10 minutes
      onRestTimeChange(totalSeconds);
      setShowCustomInput(false);
      setCustomMinutes('');
      setCustomSeconds('');
      
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  };

  const renderSelector = () => (
    <View style={styles.container}>
      <BlurView intensity={20} tint={theme} style={styles.selectorCard}>
        <LinearGradient
          colors={[
            `${colors.tint}10`,
            `${colors.tint}05`,
          ]}
          style={styles.gradientOverlay}
        >
          <Text style={[styles.title, { color: colors.text }]}>
            Rest Time
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Choose your rest period between sets
          </Text>

          {/* Preset Options */}
          <View style={styles.optionsGrid}>
            {restTimeOptions.map((option) => (
              <TouchableOpacity
                key={option.label}
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: selectedRestTime === option.seconds 
                      ? option.color 
                      : colors.backgroundSecondary,
                    borderColor: selectedRestTime === option.seconds 
                      ? option.color 
                      : colors.border,
                  },
                ]}
                onPress={() => handleOptionSelect(option.seconds)}
                activeOpacity={0.8}
              >
                <View style={[
                  styles.optionIcon,
                  { 
                    backgroundColor: selectedRestTime === option.seconds 
                      ? 'rgba(255, 255, 255, 0.2)' 
                      : option.color,
                  }
                ]}>
                  {option.icon}
                </View>
                <Text style={[
                  styles.optionLabel,
                  { 
                    color: selectedRestTime === option.seconds 
                      ? '#fff' 
                      : colors.text,
                  }
                ]}>
                  {option.label}
                </Text>
                <Text style={[
                  styles.optionTime,
                  { 
                    color: selectedRestTime === option.seconds 
                      ? '#fff' 
                      : colors.text,
                  }
                ]}>
                  {formatTime(option.seconds)}
                </Text>
                <Text style={[
                  styles.optionDescription,
                  { 
                    color: selectedRestTime === option.seconds 
                      ? 'rgba(255, 255, 255, 0.8)' 
                      : colors.textSecondary,
                  }
                ]}>
                  {option.description}
                </Text>
                {selectedRestTime === option.seconds && (
                  <View style={styles.selectedIndicator}>
                    <Check size={16} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom Time Option */}
          <TouchableOpacity
            style={[
              styles.customOption,
              { 
                backgroundColor: showCustomInput ? colors.tint + '20' : colors.backgroundSecondary,
                borderColor: showCustomInput ? colors.tint : colors.border,
                borderWidth: showCustomInput ? 2 : 1,
              }
            ]}
            onPress={() => {
              const newValue = !showCustomInput;
              setShowCustomInput(newValue);
              
              // Animate the custom input section
              Animated.spring(customInputAnimation, {
                toValue: newValue ? 1 : 0,
                friction: 8,
                tension: 100,
                useNativeDriver: false,
              }).start();
              
              // Haptic feedback
              if (Platform.OS === 'ios') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            }}
            activeOpacity={0.8}
          >
            <Clock size={20} color={colors.textSecondary} />
            <Text style={[styles.customOptionText, { color: colors.text }]}>
              Custom Time
            </Text>
            {!restTimeOptions.some(opt => opt.seconds === selectedRestTime) && (
              <Text style={[styles.customTimeDisplay, { color: colors.tint }]}>
                {formatTime(selectedRestTime)}
              </Text>
            )}
          </TouchableOpacity>

          {/* Custom Input */}
          <Animated.View 
            style={[
              styles.customInputContainer,
              {
                opacity: customInputAnimation,
                transform: [{
                  translateY: customInputAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  })
                }, {
                  scaleY: customInputAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  })
                }],
                zIndex: showCustomInput ? 1000 : -1,
                elevation: showCustomInput ? 10 : 0,
              }
            ]}
            pointerEvents={showCustomInput ? 'auto' : 'none'}
          >
            <View style={[styles.customInputCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.customInputTitle, { color: colors.text }]}>
                Set Custom Rest Time
              </Text>
              
              <View style={styles.customInputRow}>
                <ThemedInput
                  label="Minutes"
                  value={customMinutes}
                  onChangeText={setCustomMinutes}
                  keyboardType="numeric"
                  placeholder="0"
                  style={styles.customInput}
                />
                <ThemedInput
                  label="Seconds"
                  value={customSeconds}
                  onChangeText={setCustomSeconds}
                  keyboardType="numeric"
                  placeholder="0"
                  style={styles.customInput}
                />
              </View>
              
              <View style={styles.customInputActions}>
                <TouchableOpacity
                  style={[styles.customCancelButton, { backgroundColor: colors.backgroundSecondary }]}
                  onPress={() => {
                    setShowCustomInput(false);
                    setCustomMinutes('');
                    setCustomSeconds('');
                    Animated.spring(customInputAnimation, {
                      toValue: 0,
                      friction: 8,
                      tension: 100,
                      useNativeDriver: false,
                    }).start();
                  }}
                  activeOpacity={0.8}
                >
                  <X size={16} color={colors.textSecondary} />
                  <Text style={[styles.customCancelText, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.customSubmitButton, { backgroundColor: colors.tint }]}
                  onPress={handleCustomTime}
                  activeOpacity={0.8}
                >
                  <Check size={16} color="#fff" />
                  <Text style={styles.customSubmitText}>Set Time</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>

          {/* Current Selection Display */}
          <View style={[styles.currentSelection, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.currentSelectionLabel, { color: colors.textSecondary }]}>
              Selected Rest Time:
            </Text>
            <Text style={[styles.currentSelectionTime, { color: colors.tint }]}>
              {formatTime(selectedRestTime)}
            </Text>
          </View>
        </LinearGradient>
      </BlurView>
    </View>
  );

  if (showModal) {
    return (
            <Modal 
        visible={showModal} 
        transparent 
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={handleClose}
          />
          <View style={styles.modalContainer}>
            <BlurView intensity={20} tint={theme} style={styles.modalCard}>
              <LinearGradient
                colors={[
                  `${colors.tint}05`,
                  `${colors.card}95`,
                  `${colors.card}98`
                ]}
                style={styles.modalGradient}
              >
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleContainer}>
                    <Clock size={28} color={colors.tint} />
                    <Text style={[styles.modalTitle, { color: colors.text }]}>
                      Rest Time Settings
                    </Text>
                  </View>
                  <TouchableOpacity 
                    onPress={handleClose} 
                    style={[styles.closeButton, { backgroundColor: colors.backgroundSecondary }]}
                  >
                    <X size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.modalContent}>
                  {renderSelector()}
                </View>
                
                {/* Modal Done Button */}
                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={[styles.doneButton, { backgroundColor: colors.tint }]}
                    onPress={handleClose}
                    activeOpacity={0.8}
                  >
                    <Check size={20} color="#fff" />
                    <Text style={styles.doneButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </BlurView>
          </View>
        </View>
      </Modal>
    );
  }

  // Return null when modal should not be shown
  return null;
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  selectorCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  gradientOverlay: {
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 20,
    textAlign: 'center',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  optionCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    position: 'relative',
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  optionTime: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 16,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  customOptionText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  customTimeDisplay: {
    fontSize: 16,
    fontWeight: '700',
  },
  customInputContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  customInputCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  customInputTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  customInputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  customInput: {
    flex: 1,
  },
  customInputActions: {
    flexDirection: 'row',
    gap: 12,
  },
  customCancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 6,
  },
  customCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  customSubmitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 6,
  },
  customSubmitText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  currentSelection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
  },
  currentSelectionLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  currentSelectionTime: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  modalGradient: {
    padding: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  modalContent: {
    paddingHorizontal: 24,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalFooter: {
    padding: 24,
    paddingTop: 16,
  },
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
}); 