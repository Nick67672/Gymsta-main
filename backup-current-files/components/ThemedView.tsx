import { View, ViewProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { BorderRadius, Shadows } from '@/constants/Spacing';

export function ThemedView(props: ViewProps) {
  const { style, ...otherProps } = props;
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  return (
    <View
      {...otherProps}
      style={[
        { backgroundColor: colors.background },
        style,
      ]}
    />
  );
}

export function ThemedCardView(props: ViewProps & { shadow?: 'light' | 'medium' | 'heavy' }) {
  const { style, shadow = 'light', ...otherProps } = props;
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  return (
    <View
      {...otherProps}
      style={[
        { 
          backgroundColor: colors.card,
          borderRadius: BorderRadius.lg,
          ...(theme === 'light' ? Shadows[shadow] : {}),
        },
        style,
      ]}
    />
  );
}

export function ThemedSurfaceView(props: ViewProps & { shadow?: 'light' | 'medium' | 'heavy' }) {
  const { style, shadow = 'medium', ...otherProps } = props;
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  return (
    <View
      {...otherProps}
      style={[
        { 
          backgroundColor: colors.surfaceElevated,
          borderRadius: BorderRadius.lg,
          ...(theme === 'light' ? Shadows[shadow] : {}),
        },
        style,
      ]}
    />
  );
}

interface ThemedGradientViewProps extends ViewProps {
  gradient?: 'primary' | 'secondary';
  children: React.ReactNode;
}

export function ThemedGradientView({ gradient = 'primary', style, children, ...otherProps }: ThemedGradientViewProps) {
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  const gradientColors = gradient === 'primary' 
    ? [colors.primaryGradientStart, colors.primaryGradientEnd] as const
    : [colors.secondaryGradientStart, colors.secondaryGradientEnd] as const;
  
  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        { borderRadius: BorderRadius.lg },
        style,
      ]}
      {...otherProps}
    >
      {children}
    </LinearGradient>
  );
}