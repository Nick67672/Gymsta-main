// Define theme colors for the app
const tintColorLight = '#00D4FF'; // Cyan from logo
const tintColorDark = '#A855F7'; // Purple from logo

export default {
  light: {
    text: '#333333',
    textSecondary: '#666666',
    textTertiary: '#999999',
    background: '#FAFBFC', // Softer than pure white
    backgroundSecondary: '#F8F9FA',
    surfaceElevated: '#FFFFFF',
    tint: tintColorLight,
    tabIconDefault: '#A0A0A0',
    tabIconSelected: tintColorLight,
    card: '#FFFFFF',
    border: '#E5E5E5',
    notification: '#FF3B30',
    error: '#D32F2F',
    success: '#00B894',
    warning: '#FDCB6E',
    info: '#74B9FF',
    button: tintColorLight,
    buttonText: '#FFFFFF',
    inputBackground: '#F5F5F5',
    modalBackground: 'rgba(0, 0, 0, 0.5)',
    shadow: '#000000',
    // Enhanced shadows
    shadowLight: 'rgba(0, 0, 0, 0.04)',
    shadowMedium: 'rgba(0, 0, 0, 0.08)',
    shadowHeavy: 'rgba(0, 0, 0, 0.12)',
    // Gradient colors matching the logo
    primaryGradientStart: '#00D4FF', // Bright cyan
    primaryGradientEnd: '#A855F7',   // Purple
    secondaryGradientStart: '#06B6D4', // Slightly darker cyan
    secondaryGradientEnd: '#8B5CF6',   // Slightly lighter purple
  },
  dark: {
    text: '#FFFFFF', // Better contrast
    textSecondary: '#B0B0B0',
    textTertiary: '#808080',
    background: '#000000', // OLED-friendly pure black
    backgroundSecondary: '#0A0A0A',
    surfaceElevated: '#1A1A1A',
    tint: tintColorDark,
    tabIconDefault: '#787878',
    tabIconSelected: tintColorDark,
    card: '#1A1A1A', // Subtle variation from pure black
    border: '#333333',
    notification: '#FF453A',
    error: '#CF6679',
    success: '#81C784',
    warning: '#FFD54F',
    info: '#81D4FA',
    button: tintColorDark,
    buttonText: '#FFFFFF',
    inputBackground: '#333333',
    modalBackground: 'rgba(0, 0, 0, 0.7)',
    shadow: '#000000',
    // Enhanced shadows for dark mode
    shadowLight: 'rgba(255, 255, 255, 0.02)',
    shadowMedium: 'rgba(255, 255, 255, 0.04)',
    shadowHeavy: 'rgba(255, 255, 255, 0.06)',
    // Gradient colors matching the logo (adjusted for dark mode)
    primaryGradientStart: '#06B6D4', // Darker cyan for dark mode
    primaryGradientEnd: '#A855F7',   // Purple
    secondaryGradientStart: '#0891B2', // Even darker cyan
    secondaryGradientEnd: '#7C3AED',   // Darker purple
  },
};