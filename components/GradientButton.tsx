import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator, ColorValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';

interface GradientButtonProps {
  title: string;
  onPress: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'logo';
  size?: 'small' | 'medium' | 'large';
}

export default function GradientButton({
  title,
  onPress,
  style,
  textStyle,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'medium'
}: GradientButtonProps) {
  const { theme } = useTheme();
  const colors = Colors[theme];

  const getGradientColors = (): readonly [ColorValue, ColorValue] => {
    switch (variant) {
      case 'primary':
        return [colors.primaryGradientStart, colors.primaryGradientEnd] as const;
      case 'secondary':
        return [colors.secondaryGradientStart, colors.secondaryGradientEnd] as const;
      case 'logo':
        return ['#00D4FF', '#A855F7'] as const;
      default:
        return [colors.primaryGradientStart, colors.primaryGradientEnd] as const;
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { paddingHorizontal: 16, paddingVertical: 8, fontSize: 14 };
      case 'medium':
        return { paddingHorizontal: 24, paddingVertical: 12, fontSize: 16 };
      case 'large':
        return { paddingHorizontal: 32, paddingVertical: 16, fontSize: 18 };
      default:
        return { paddingHorizontal: 24, paddingVertical: 12, fontSize: 16 };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.container,
        { opacity: disabled ? 0.6 : 1 },
        style
      ]}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={getGradientColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.gradient,
          {
            paddingHorizontal: sizeStyles.paddingHorizontal,
            paddingVertical: sizeStyles.paddingVertical,
          }
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text
            style={[
              styles.text,
              { fontSize: sizeStyles.fontSize },
              textStyle
            ]}
          >
            {title}
          </Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  gradient: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },
}); 