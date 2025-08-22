// iOS-optimized keyboard handling utilities
import { Platform, Keyboard, Dimensions } from 'react-native';
import { useEffect, useState } from 'react';

export interface KeyboardInfo {
  isVisible: boolean;
  height: number;
  animationDuration: number;
}

/**
 * Hook to track keyboard visibility and height with iOS-specific optimizations
 */
export const useKeyboard = (): KeyboardInfo => {
  const [keyboardInfo, setKeyboardInfo] = useState<KeyboardInfo>({
    isVisible: false,
    height: 0,
    animationDuration: 250,
  });

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onKeyboardShow = (event: any) => {
      setKeyboardInfo({
        isVisible: true,
        height: event.endCoordinates.height,
        animationDuration: event.duration || 250,
      });
    };

    const onKeyboardHide = (event: any) => {
      setKeyboardInfo({
        isVisible: false,
        height: 0,
        animationDuration: event.duration || 250,
      });
    };

    const showSubscription = Keyboard.addListener(showEvent, onKeyboardShow);
    const hideSubscription = Keyboard.addListener(hideEvent, onKeyboardHide);

    return () => {
      showSubscription?.remove();
      hideSubscription?.remove();
    };
  }, []);

  return keyboardInfo;
};

/**
 * iOS-specific keyboard avoidance calculations
 */
export const getKeyboardAvoidanceOffset = (keyboardHeight: number): number => {
  if (Platform.OS !== 'ios' || keyboardHeight === 0) {
    return 0;
  }

  const { height: screenHeight } = Dimensions.get('window');
  
  // iOS-specific adjustments based on device type
  if (screenHeight >= 932) {
    // Pro Max models - account for larger screen
    return Math.max(keyboardHeight - 40, 0);
  } else if (screenHeight >= 812) {
    // Modern iPhones with notch
    return Math.max(keyboardHeight - 34, 0);
  } else {
    // Legacy iPhones
    return keyboardHeight;
  }
};

/**
 * Optimized keyboard dismiss function for iOS
 */
export const dismissKeyboard = () => {
  Keyboard.dismiss();
};

/**
 * iOS-specific text input configuration
 */
export const getIOSTextInputProps = () => {
  if (Platform.OS !== 'ios') {
    return {};
  }

  return {
    // iOS-specific optimizations
    clearButtonMode: 'while-editing' as const,
    keyboardAppearance: 'default' as const,
    autoCapitalize: 'none' as const,
    autoCorrect: true,
    spellCheck: true,
    // Enable smart features on iOS
    textContentType: 'none' as const,
    // Optimize for better performance
    enablesReturnKeyAutomatically: true,
    blurOnSubmit: true,
  };
};

/**
 * Get iOS-optimized keyboard type for different input types
 */
export const getIOSKeyboardType = (inputType: 'default' | 'email' | 'numeric' | 'phone' | 'url' | 'search') => {
  if (Platform.OS !== 'ios') {
    return inputType;
  }

  // iOS-specific keyboard optimizations
  switch (inputType) {
    case 'email':
      return 'email-address' as const;
    case 'numeric':
      return 'number-pad' as const;
    case 'phone':
      return 'phone-pad' as const;
    case 'url':
      return 'url' as const;
    case 'search':
      return 'web-search' as const;
    default:
      return 'default' as const;
  }
};

/**
 * iOS-specific return key type optimization
 */
export const getIOSReturnKeyType = (context: 'done' | 'next' | 'search' | 'send' | 'go') => {
  if (Platform.OS !== 'ios') {
    return context;
  }

  return context as 'done' | 'next' | 'search' | 'send' | 'go';
};

export default {
  useKeyboard,
  getKeyboardAvoidanceOffset,
  dismissKeyboard,
  getIOSTextInputProps,
  getIOSKeyboardType,
  getIOSReturnKeyType,
};

