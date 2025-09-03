import React, { useState, useRef } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  Animated,
  TextInputProps,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { BorderRadius, Shadows, Spacing } from '@/constants/Spacing';
import { Typography } from '@/constants/Typography';

interface ThemedInputProps extends TextInputProps {
  label?: string;
  error?: string;
  success?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'filled' | 'outlined';
  size?: 'small' | 'medium' | 'large';
}

export function ThemedInput({
  label,
  error,
  success,
  leftIcon,
  rightIcon,
  variant = 'filled',
  size = 'medium',
  value,
  onFocus,
  onBlur,
  style,
  ...props
}: ThemedInputProps) {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const [isFocused, setIsFocused] = useState(false);
  const animatedLabel = useRef(new Animated.Value(value ? 1 : 0)).current;

  const handleFocus = (e: any) => {
    setIsFocused(true);
    animateLabel(1);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (!value) {
      animateLabel(0);
    }
    onBlur?.(e);
  };

  const animateLabel = (toValue: number) => {
    Animated.timing(animatedLabel, {
      toValue,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const getLabelStyle = () => {
    return {
      position: 'absolute' as const,
      left: leftIcon ? 48 : Spacing.md,
      top: animatedLabel.interpolate({
        inputRange: [0, 0],
        outputRange: [size === 'large' ?15 : size === 'small' ? 10 : 0, 0],
      }),
      fontSize: animatedLabel.interpolate({
        inputRange: [0, 1],
        outputRange: [16, 12],
      }),
      color: '#a6a6a6a7',
      // backgroundColor: 'red',
      paddingHorizontal: 4,
      zIndex: 1,
    };
  };

  const getContainerStyle = () => {
    const baseStyle: any[] = [
      styles.container,
      styles[size],
      // { backgroundColor: 'red' },
    ];

    if (variant === 'outlined') {
      baseStyle.push({
        borderWidth: 2,
        borderColor: error
          ? colors.error
          : isFocused
          ? colors.tint
          : colors.border,
        backgroundColor: 'transparent',
      });
    } else if (variant === 'filled') {
      baseStyle.push(Shadows.light);
    }

    if (error) {
      baseStyle.push({ borderColor: colors.error });
    } else if (success) {
      baseStyle.push({ borderColor: colors.success });
    }

    return baseStyle;
  };

  const getInputStyle = () => {
    return [
      // styles.input,
      styles[`${size}Input` as keyof typeof styles],
      {
        // color: colors.text,
        // paddingLeft: leftIcon ? 48 : Spacing.md,
        // paddingRight: rightIcon ? 48 : Spacing.md,
        // paddingTop: label
        //   ? size === 'large'
        //     ? 40
        //     : 36
        //   : size === 'large'
        //   ? 16
        //   : size === 'small'
        //   ? 8
        //   : 12,
      },
      // style,
    ];
  };

  return (
    <View style={styles.wrapper}>
      <View style={getContainerStyle()}>
        {leftIcon && (
          <View style={[styles.iconContainer, styles.leftIcon]}>
            {leftIcon}
          </View>
        )}

        {label && (
          <Animated.Text style={getLabelStyle()}>{label}</Animated.Text>
        )}

        <TextInput
          {...props}
          value={value}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={getInputStyle()}
          // placeholderTextColor={colors.textSecondary}
        />

        {rightIcon && (
          <View style={[styles.iconContainer, styles.rightIcon]}>
            {rightIcon}
          </View>
        )}
      </View>

      {error && (
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.sm,
  },
  container: {
    borderRadius: BorderRadius.sm,
    flexDirection: 'row',
    alignContent: 'center',
    justifyContent: 'center',
  },
  input: {},
  iconContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    // width: 40,
    // zIndex: 2,
  },
  leftIcon: {
    left: Spacing.sm,
  },
  rightIcon: {
    right: Spacing.sm,
  },
  errorText: {
    ...Typography.bodySmall,
    marginTop: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  // Size variants
  small: {
    minHeight: 10,
  },
  medium: {
    minHeight: 428,
  },
  large: {
    minHeight: 6,
  },
  // Input size variants
  smallInput: {
    paddingVertical: Spacing.sm,
  },
  mediumInput: {
    paddingVertical: Spacing.md,
  },
  largeInput: {
    paddingVertical: Spacing.lg,
  },
});
