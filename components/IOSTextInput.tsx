import React, { forwardRef } from 'react';
import { TextInput, TextInputProps, Platform, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { getIOSTextInputProps, getIOSKeyboardType, getIOSReturnKeyType } from '@/lib/keyboardUtils';
import { touchTargets } from '@/constants/Layout';
import { moderateScale } from '@/lib/responsive';

interface IOSTextInputProps extends Omit<TextInputProps, 'keyboardType' | 'returnKeyType'> {
  inputType?: 'default' | 'email' | 'numeric' | 'phone' | 'url' | 'search';
  returnKeyType?: 'done' | 'next' | 'search' | 'send' | 'go';
  colors?: {
    background?: string;
    text?: string;
    placeholder?: string;
    border?: string;
    focusedBorder?: string;
  };
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'rounded' | 'underlined';
}

export const IOSTextInput = forwardRef<TextInput, IOSTextInputProps>(({
  inputType = 'default',
  returnKeyType = 'done',
  colors = {},
  size = 'medium',
  variant = 'default',
  style,
  ...props
}, ref) => {
  // Get iOS-specific optimizations
  const iosProps = getIOSTextInputProps();
  const keyboardType = getIOSKeyboardType(inputType);
  const iosReturnKeyType = getIOSReturnKeyType(returnKeyType);

  // Size configurations
  const sizeConfig = {
    small: {
      height: Math.max(36, touchTargets.minHeight * 0.8),
      fontSize: moderateScale(14),
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    medium: {
      height: Math.max(44, touchTargets.minHeight),
      fontSize: moderateScale(16),
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    large: {
      height: Math.max(52, touchTargets.minHeight * 1.2),
      fontSize: moderateScale(18),
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
  };

  const currentSize = sizeConfig[size];

  // Variant styles
  const getVariantStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      height: currentSize.height,
      paddingHorizontal: currentSize.paddingHorizontal,
      paddingVertical: currentSize.paddingVertical,
      backgroundColor: colors.background || (Platform.OS === 'ios' ? '#FFFFFF' : '#F5F5F5'),
      borderColor: colors.border || (Platform.OS === 'ios' ? '#E1E1E1' : '#CCCCCC'),
    };

    switch (variant) {
      case 'rounded':
        return {
          ...baseStyle,
          borderRadius: currentSize.height / 2,
          borderWidth: 1,
        };
      case 'underlined':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          borderBottomWidth: 1,
          borderTopWidth: 0,
          borderLeftWidth: 0,
          borderRightWidth: 0,
          borderRadius: 0,
          paddingHorizontal: 0,
        };
      default:
        return {
          ...baseStyle,
          borderRadius: Platform.OS === 'ios' ? 8 : 4,
          borderWidth: 1,
        };
    }
  };

  const textStyle: TextStyle = {
    fontSize: currentSize.fontSize,
    color: colors.text || (Platform.OS === 'ios' ? '#000000' : '#333333'),
    // iOS-specific text optimizations
    ...(Platform.OS === 'ios' && {
      fontFamily: 'System',
      fontWeight: '400',
    }),
  };

  const combinedStyle = [
    getVariantStyle(),
    textStyle,
    style,
  ];

  return (
    <TextInput
      ref={ref}
      style={combinedStyle}
      keyboardType={keyboardType}
      returnKeyType={iosReturnKeyType}
      placeholderTextColor={colors.placeholder || (Platform.OS === 'ios' ? '#999999' : '#666666')}
      selectionColor={colors.focusedBorder || (Platform.OS === 'ios' ? '#007AFF' : '#2196F3')}
      {...iosProps}
      {...props}
    />
  );
});

IOSTextInput.displayName = 'IOSTextInput';

export default IOSTextInput;

