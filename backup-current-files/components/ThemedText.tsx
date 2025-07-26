import { Text, TextProps } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { Typography } from '@/constants/Typography';

export function ThemedText(props: TextProps) {
  const { style, ...otherProps } = props;
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  return (
    <Text
      {...otherProps}
      style={[
        { color: colors.text },
        style,
      ]}
    />
  );
}

export function ThemedSecondaryText(props: TextProps) {
  const { style, ...otherProps } = props;
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  return (
    <Text
      {...otherProps}
      style={[
        { color: colors.textSecondary },
        style,
      ]}
    />
  );
}

export function ThemedTertiaryText(props: TextProps) {
  const { style, ...otherProps } = props;
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  return (
    <Text
      {...otherProps}
      style={[
        { color: colors.textTertiary },
        style,
      ]}
    />
  );
}

// Typography-based components
export function ThemedH1(props: TextProps) {
  const { style, ...otherProps } = props;
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  return (
    <Text
      {...otherProps}
      style={[
        { color: colors.text },
        Typography.h1,
        style,
      ]}
    />
  );
}

export function ThemedH2(props: TextProps) {
  const { style, ...otherProps } = props;
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  return (
    <Text
      {...otherProps}
      style={[
        { color: colors.text },
        Typography.h2,
        style,
      ]}
    />
  );
}

export function ThemedH3(props: TextProps) {
  const { style, ...otherProps } = props;
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  return (
    <Text
      {...otherProps}
      style={[
        { color: colors.text },
        Typography.h3,
        style,
      ]}
    />
  );
}

export function ThemedBodyText(props: TextProps & { size?: 'large' | 'medium' | 'small' }) {
  const { style, size = 'medium', ...otherProps } = props;
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  const typography = size === 'large' ? Typography.bodyLarge 
    : size === 'small' ? Typography.bodySmall 
    : Typography.bodyMedium;
  
  return (
    <Text
      {...otherProps}
      style={[
        { color: colors.text },
        typography,
        style,
      ]}
    />
  );
}

export function ThemedCaptionText(props: TextProps) {
  const { style, ...otherProps } = props;
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  return (
    <Text
      {...otherProps}
      style={[
        { color: colors.textSecondary },
        Typography.caption,
        style,
      ]}
    />
  );
}