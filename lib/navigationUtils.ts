// iOS-optimized navigation utilities
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { haptics } from './haptics';

export interface IOSNavigationOptions {
  withHaptic?: boolean;
  hapticType?: 'light' | 'medium' | 'heavy';
  replace?: boolean;
  resetStack?: boolean;
}

/**
 * iOS-optimized navigation with haptic feedback and gesture support
 */
export const navigateWithIOSOptimizations = (
  path: string,
  options: IOSNavigationOptions = {}
) => {
  const {
    withHaptic = Platform.OS === 'ios',
    hapticType = 'light',
    replace = false,
    resetStack = false,
  } = options;

  // Provide haptic feedback for navigation actions
  if (withHaptic) {
    switch (hapticType) {
      case 'light':
        haptics.tap();
        break;
      case 'medium':
        haptics.buttonPress();
        break;
      case 'heavy':
        haptics.longPress();
        break;
    }
  }

  // Navigate using the appropriate method
  try {
    if (resetStack) {
      router.replace(path as any);
    } else if (replace) {
      router.replace(path as any);
    } else {
      router.push(path as any);
    }
  } catch (error) {
    console.warn('Navigation failed:', error);
  }
};

/**
 * iOS-optimized back navigation with proper gesture support
 */
export const goBackWithIOSOptimizations = (fallbackPath?: string) => {
  if (Platform.OS === 'ios') {
    haptics.swipe();
  }

  try {
    if (router.canGoBack()) {
      router.back();
    } else if (fallbackPath) {
      router.replace(fallbackPath as any);
    } else {
      // Default fallback to home
      router.replace('/(tabs)/' as any);
    }
  } catch (error) {
    console.warn('Back navigation failed:', error);
    // Ultimate fallback
    if (fallbackPath) {
      router.replace(fallbackPath as any);
    }
  }
};

/**
 * iOS-specific swipe gesture detection thresholds
 */
export const IOSSwipeThresholds = {
  // Minimum distance for swipe recognition
  minDistance: Platform.OS === 'ios' ? 50 : 75,
  
  // Minimum velocity for swipe recognition
  minVelocity: Platform.OS === 'ios' ? 300 : 500,
  
  // Maximum time for swipe gesture
  maxTime: Platform.OS === 'ios' ? 300 : 250,
  
  // Directional tolerance (degrees)
  directionalTolerance: Platform.OS === 'ios' ? 30 : 45,
};

/**
 * iOS-optimized tab navigation with proper state management
 */
export const navigateToTab = (
  tabName: string,
  options: { resetStack?: boolean; withHaptic?: boolean } = {}
) => {
  const { resetStack = true, withHaptic = Platform.OS === 'ios' } = options;

  if (withHaptic) {
    haptics.tabChange();
  }

  const tabPath = `/(tabs)/${tabName}`;
  
  try {
    if (resetStack) {
      router.replace(tabPath as any);
    } else {
      router.push(tabPath as any);
    }
  } catch (error) {
    console.warn('Tab navigation failed:', error);
  }
};

/**
 * iOS-specific modal presentation with proper animations
 */
export const presentModal = (
  modalPath: string,
  options: { withHaptic?: boolean; hapticType?: 'light' | 'medium' | 'heavy' } = {}
) => {
  const { withHaptic = Platform.OS === 'ios', hapticType = 'medium' } = options;

  if (withHaptic) {
    switch (hapticType) {
      case 'light':
        haptics.tap();
        break;
      case 'medium':
        haptics.buttonPress();
        break;
      case 'heavy':
        haptics.longPress();
        break;
    }
  }

  try {
    router.push(modalPath as any);
  } catch (error) {
    console.warn('Modal presentation failed:', error);
  }
};

/**
 * iOS-specific gesture-based navigation helpers
 */
export const IOSGestureNavigation = {
  // Handle swipe back gesture
  handleSwipeBack: (onSwipeBack?: () => void) => {
    if (Platform.OS === 'ios') {
      haptics.swipe();
    }
    
    if (onSwipeBack) {
      onSwipeBack();
    } else {
      goBackWithIOSOptimizations();
    }
  },

  // Handle edge swipe gesture
  handleEdgeSwipe: (direction: 'left' | 'right', onSwipe?: () => void) => {
    if (Platform.OS === 'ios') {
      haptics.swipe();
    }
    
    if (onSwipe) {
      onSwipe();
    }
  },

  // Handle long press gesture
  handleLongPress: (onLongPress?: () => void) => {
    if (Platform.OS === 'ios') {
      haptics.longPress();
    }
    
    if (onLongPress) {
      onLongPress();
    }
  },
};

export default {
  navigateWithIOSOptimizations,
  goBackWithIOSOptimizations,
  navigateToTab,
  presentModal,
  IOSSwipeThresholds,
  IOSGestureNavigation,
};

