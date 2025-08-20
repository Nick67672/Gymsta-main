import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { ViewStyle, ColorValue } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';

interface GradientBackgroundProps {
  children?: React.ReactNode;
  style?: ViewStyle;
  colors?: readonly [ColorValue, ColorValue, ...ColorValue[]];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
}

export default function GradientBackground({ 
  children, 
  style, 
  colors: customColors,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 }
}: GradientBackgroundProps) {
  const { theme } = useTheme();
  const themeColors = Colors[theme];
  
  const defaultColors: readonly [ColorValue, ColorValue, ...ColorValue[]] = customColors || [
    themeColors.primaryGradientStart,
    themeColors.primaryGradientEnd
  ] as const;

  return (
    <LinearGradient
      colors={defaultColors}
      start={start}
      end={end}
      style={style}
    >
      {children}
    </LinearGradient>
  );
}

// Preset gradient configurations
export const GradientPresets = {
  primary: (theme: 'light' | 'dark'): readonly [ColorValue, ColorValue] => [
    Colors[theme].primaryGradientStart,
    Colors[theme].primaryGradientEnd
  ] as const,
  secondary: (theme: 'light' | 'dark'): readonly [ColorValue, ColorValue] => [
    Colors[theme].secondaryGradientStart,
    Colors[theme].secondaryGradientEnd
  ] as const,
  // Logo-inspired gradient
  logo: ['#00D4FF', '#3B82F6'] as const,
  // Reversed gradient
  logoReversed: ['#3B82F6', '#00D4FF'] as const,
}; 