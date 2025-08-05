import React from 'react';
import { Text, Pressable, StyleSheet, ActivityIndicator, View, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../constants/Colors';

interface ThemedButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: any;
  textStyle?: any;
  icon?: React.ReactNode;
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
  icon,
}: ThemedButtonProps) {
  const { theme } = useTheme();
  const colors = Colors[theme];

  const handlePress = () => {
    if (disabled || loading) return;
    
    // Add haptic feedback based on button variant
    if (Platform.OS === 'ios') {
      switch (variant) {
        case 'primary':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'destructive':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'secondary':
        case 'ghost':
        default:
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
      }
    }
    
    onPress();
  };

  const buttonContent = (
    <>
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'primary' ? '#fff' : colors.text} style={styles.loader} />
      ) : (
        icon && <View style={styles.iconContainer}>{icon}</View>
      )}
      <Text
        style={[
          styles.text,
          styles[`text${size.charAt(0).toUpperCase() + size.slice(1)}` as keyof typeof styles],
          (variant === 'secondary' || variant === 'ghost') && { color: colors.text },
          variant === 'destructive' && { color: '#fff' },
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
        onPress={handlePress}
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

  if (variant === 'destructive') {
    return (
      <Pressable
        onPress={handlePress}
        disabled={disabled || loading}
        style={[
          styles.button,
          styles[size],
          { backgroundColor: colors.error },
          disabled && styles.disabled,
          style,
        ]}
      >
        {buttonContent}
      </Pressable>
    );
  }

  // For secondary and ghost variants, use regular Pressable
  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={[
        styles.button,
        styles[size],
        variant === 'secondary' && [styles.secondary, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }],
        variant === 'ghost' && styles.ghost,
        disabled && styles.disabled,
        style,
      ]}
    >
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
  iconContainer: {
    marginRight: 8,
  },
}); 