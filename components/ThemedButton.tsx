import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { BorderRadius, Shadows, Spacing } from '@/constants/Spacing';
import { Typography } from '@/constants/Typography';

interface ThemedButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  gradient?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export function ThemedButton({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  gradient = false,
  style,
  textStyle,
  icon,
  fullWidth = false,
}: ThemedButtonProps) {
  const { theme } = useTheme();
  const colors = Colors[theme];

  const getButtonStyle = () => {
    const baseStyle = [
      styles.button,
      styles[size],
      fullWidth && styles.fullWidth,
      disabled && styles.disabled,
    ];

    switch (variant) {
      case 'primary':
        return [
          ...baseStyle,
          { backgroundColor: colors.tint },
          !gradient && Shadows.medium,
          style,
        ];
      case 'secondary':
        return [
          ...baseStyle,
          { backgroundColor: colors.card },
          Shadows.light,
          style,
        ];
      case 'outline':
        return [
          ...baseStyle,
          {
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderColor: colors.tint,
          },
          style,
        ];
      case 'ghost':
        return [
          ...baseStyle,
          { backgroundColor: 'transparent' },
          style,
        ];
      default:
        return [...baseStyle, style];
    }
  };

  const getTextStyle = () => {
    const baseTextStyle = [
      styles.text,
      styles[`${size}Text` as keyof typeof styles],
    ];

    switch (variant) {
      case 'primary':
        return [
          ...baseTextStyle,
          { color: '#fff' },
          textStyle,
        ];
      case 'secondary':
        return [
          ...baseTextStyle,
          { color: colors.text },
          textStyle,
        ];
      case 'outline':
        return [
          ...baseTextStyle,
          { color: colors.tint },
          textStyle,
        ];
      case 'ghost':
        return [
          ...baseTextStyle,
          { color: colors.tint },
          textStyle,
        ];
      default:
        return [...baseTextStyle, textStyle];
    }
  };

  const buttonContent = (
    <>
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={variant === 'primary' ? '#fff' : colors.tint} 
        />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text style={getTextStyle()}>{title}</Text>
        </>
      )}
    </>
  );

  if (gradient && variant === 'primary' && !disabled) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.8}
        style={[styles.button, styles[size], fullWidth && styles.fullWidth]}
      >
        <LinearGradient
          colors={[colors.primaryGradientStart, colors.primaryGradientEnd] as const}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.gradientButton,
            styles[size],
            Shadows.medium,
            style,
          ]}
        >
          {buttonContent}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={getButtonStyle()}
      activeOpacity={0.8}
    >
      {buttonContent}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  gradientButton: {
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.6,
  },
  // Size variants
  small: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 36,
  },
  medium: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 44,
  },
  large: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    minHeight: 52,
  },
  // Text styles
  text: {
    textAlign: 'center',
    marginLeft: Spacing.xs,
  },
  smallText: {
    ...Typography.buttonSmall,
  },
  mediumText: {
    ...Typography.button,
  },
  largeText: {
    ...Typography.button,
    fontSize: 18,
  },
}); 