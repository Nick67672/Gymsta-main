import React from 'react';
import { Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../constants/Colors';

interface ThemedButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: any;
  textStyle?: any;
}

export function ThemedButton({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
}: ThemedButtonProps) {
  const { theme } = useTheme();
  const colors = Colors[theme];

  const buttonContent = (
    <>
      {loading && <ActivityIndicator size="small" color={variant === 'primary' ? '#fff' : colors.text} style={styles.loader} />}
      <Text
        style={[
          styles.text,
          styles[`text${size.charAt(0).toUpperCase() + size.slice(1)}` as keyof typeof styles],
          variant === 'secondary' && { color: colors.text },
          variant === 'ghost' && { color: colors.text },
          disabled && styles.textDisabled,
          textStyle,
        ]}
        numberOfLines={1}
      >
        {title}
      </Text>
    </>
  );

  if (variant === 'primary') {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        style={[
          styles.button,
          styles[size],
          disabled && styles.disabled,
          style,
        ]}
      >
        <LinearGradient
          colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, styles[size]]}
        >
          {buttonContent}
        </LinearGradient>
      </Pressable>
    );
  }

  // For secondary and ghost variants, use regular Pressable with gradient border effect
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        styles[size],
        variant === 'secondary' && [styles.secondary, { backgroundColor: colors.background }],
        variant === 'ghost' && styles.ghost,
        disabled && styles.disabled,
        style,
      ]}
    >
      {variant === 'secondary' && (
        <LinearGradient
          colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      {variant === 'secondary' && (
        <LinearGradient
          colors={[colors.background, colors.background]}
          style={[StyleSheet.absoluteFill, { margin: 1 }]}
        />
      )}
      {buttonContent}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  gradient: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  secondary: {
    borderRadius: 8,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  small: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 32,
  },
  medium: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 40,
  },
  large: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    minHeight: 48,
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
    color: '#fff',
  },
  textSmall: {
    fontSize: 14,
  },
  textMedium: {
    fontSize: 16,
  },
  textLarge: {
    fontSize: 18,
  },
  textDisabled: {
    opacity: 0.5,
  },
  disabled: {
    opacity: 0.5,
  },
  loader: {
    marginRight: 8,
  },
}); 