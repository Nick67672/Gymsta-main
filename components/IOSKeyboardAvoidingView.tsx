import React from 'react';
import { KeyboardAvoidingView, Platform, ViewStyle, KeyboardAvoidingViewProps } from 'react-native';
import { useKeyboard, getKeyboardAvoidanceOffset } from '@/lib/keyboardUtils';
import { iOSDeviceTypes } from '@/lib/responsive';

interface IOSKeyboardAvoidingViewProps extends Omit<KeyboardAvoidingViewProps, 'behavior' | 'keyboardVerticalOffset'> {
  children: React.ReactNode;
  style?: ViewStyle;
  enableOnAndroid?: boolean;
  customOffset?: number;
}

export const IOSKeyboardAvoidingView: React.FC<IOSKeyboardAvoidingViewProps> = ({
  children,
  style,
  enableOnAndroid = false,
  customOffset = 0,
  ...props
}) => {
  const keyboard = useKeyboard();

  // Only enable on iOS by default, or on Android if explicitly enabled
  const shouldAvoidKeyboard = Platform.OS === 'ios' || enableOnAndroid;

  if (!shouldAvoidKeyboard) {
    return <>{children}</>;
  }

  // iOS-specific behavior and offset calculations
  const getBehavior = (): 'padding' | 'height' | 'position' => {
    if (Platform.OS === 'ios') {
      return 'padding'; // Generally works best on iOS
    }
    return 'height'; // Fallback for Android
  };

  const getKeyboardVerticalOffset = (): number => {
    if (Platform.OS !== 'ios') {
      return customOffset;
    }

    let baseOffset = customOffset;

    // Device-specific adjustments
    if (iOSDeviceTypes.hasNotch) {
      // Modern iPhones with notch/Dynamic Island
      baseOffset += iOSDeviceTypes.isIPhoneProMax ? 10 : 8;
    } else {
      // Legacy iPhones
      baseOffset += 4;
    }

    // Additional offset based on keyboard height
    if (keyboard.isVisible) {
      baseOffset += getKeyboardAvoidanceOffset(keyboard.height) * 0.1;
    }

    return baseOffset;
  };

  return (
    <KeyboardAvoidingView
      behavior={getBehavior()}
      keyboardVerticalOffset={getKeyboardVerticalOffset()}
      style={style}
      {...props}
    >
      {children}
    </KeyboardAvoidingView>
  );
};

export default IOSKeyboardAvoidingView;

