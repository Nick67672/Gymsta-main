// iOS-optimized haptic feedback utilities
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export enum HapticType {
  // Light interactions (button taps, toggles)
  Light = 'light',
  // Medium interactions (important actions, confirmations)
  Medium = 'medium',
  // Heavy interactions (critical actions, errors)
  Heavy = 'heavy',
  // Success feedback
  Success = 'success',
  // Warning feedback
  Warning = 'warning',
  // Error feedback
  Error = 'error',
  // Selection feedback (picker, tab changes)
  Selection = 'selection',
}

/**
 * Triggers haptic feedback optimized for iOS devices
 * Automatically handles platform detection and graceful degradation
 */
export const triggerHaptic = (type: HapticType) => {
  if (Platform.OS !== 'ios') {
    return; // Only provide haptics on iOS
  }

  try {
    switch (type) {
      case HapticType.Light:
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case HapticType.Medium:
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case HapticType.Heavy:
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case HapticType.Success:
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case HapticType.Warning:
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case HapticType.Error:
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      case HapticType.Selection:
        Haptics.selectionAsync();
        break;
      default:
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } catch (error) {
    // Silently fail if haptics are not available
    console.warn('Haptic feedback failed:', error);
  }
};

/**
 * Convenience functions for common haptic patterns
 */
export const haptics = {
  // UI interactions
  tap: () => triggerHaptic(HapticType.Light),
  buttonPress: () => triggerHaptic(HapticType.Medium),
  toggle: () => triggerHaptic(HapticType.Selection),
  
  // Navigation
  tabChange: () => triggerHaptic(HapticType.Selection),
  swipe: () => triggerHaptic(HapticType.Light),
  
  // Actions
  like: () => triggerHaptic(HapticType.Medium),
  unlike: () => triggerHaptic(HapticType.Light),
  share: () => triggerHaptic(HapticType.Medium),
  save: () => triggerHaptic(HapticType.Medium),
  delete: () => triggerHaptic(HapticType.Heavy),
  
  // Feedback
  success: () => triggerHaptic(HapticType.Success),
  warning: () => triggerHaptic(HapticType.Warning),
  error: () => triggerHaptic(HapticType.Error),
  
  // Special interactions
  doubleTap: () => triggerHaptic(HapticType.Medium),
  longPress: () => triggerHaptic(HapticType.Heavy),
  pullToRefresh: () => triggerHaptic(HapticType.Light),
  
  // Camera/Upload
  cameraCapture: () => triggerHaptic(HapticType.Heavy),
  uploadComplete: () => triggerHaptic(HapticType.Success),
  uploadFailed: () => triggerHaptic(HapticType.Error),
};

export default haptics;
