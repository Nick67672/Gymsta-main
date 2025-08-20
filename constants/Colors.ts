// Define theme colors for the app
const tintColorLight = '#00D4FF'; // Cyan from logo
const tintColorDark = '#3B82F6'; // Blue for dark mode accents

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
    // Gradient colors matching the logo and bottom tab
    primaryGradientStart: '#00D4FF', // Bright cyan (same as tab)
    primaryGradientEnd: '#A855F7',   // Purple (same as tab)
    secondaryGradientStart: '#00D4FF', // Same as primary for consistency
    secondaryGradientEnd: '#A855F7',   // Same as primary for consistency
    primary: '#007bff',
    
    // 🎨 NEW: Glassmorphism & Modern Design Elements
    glass: 'rgba(255, 255, 255, 0.25)',
    glassBorder: 'rgba(255, 255, 255, 0.18)',
    glassBackground: 'rgba(255, 255, 255, 0.1)',
    
    // Neon accent colors for highlights
    neonCyan: '#00FFFF',
    neonPurple: '#B347FF',
    neonGreen: '#39FF14',
    neonPink: '#FF10F0',
    
    // Workout intensity colors
    intensityLow: '#4FFFB0',
    intensityMedium: '#FFD700',
    intensityHigh: '#FF6B6B',
    intensityExtreme: '#FF1744',
    
    // Activity ring colors (Apple Watch style)
    ringMove: '#FF3B30',
    ringExercise: '#30D158',
    ringStand: '#00C7BE',
    
    // Muscle group colors
    chest: '#FF6B6B',
    back: '#4ECDC4',
    shoulders: '#45B7D1',
    arms: '#96CEB4',
    legs: '#FFEAA7',
    core: '#DDA0DD',
    cardio: '#FF7675',
    
    // Glassmorphism blur backgrounds
    blurLight: 'rgba(255, 255, 255, 0.15)',
    blurMedium: 'rgba(255, 255, 255, 0.25)',
    blurHeavy: 'rgba(255, 255, 255, 0.35)',
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
    // Gradient colors matching the logo and bottom tab (blue replaces purple in dark mode)
    primaryGradientStart: '#00D4FF', // Same cyan as tab for consistency
    primaryGradientEnd: '#3B82F6',   // Blue replaces purple in dark mode
    secondaryGradientStart: '#00D4FF', // Same as primary for consistency
    secondaryGradientEnd: '#3B82F6',   // Blue replaces purple in dark mode
    primary: '#007bff',
    
    // 🎨 NEW: Dark Mode Glassmorphism & Neon Elements
    glass: 'rgba(255, 255, 255, 0.1)',
    glassBorder: 'rgba(255, 255, 255, 0.05)',
    glassBackground: 'rgba(0, 0, 0, 0.3)',
    
    // Enhanced neon colors for dark mode
    neonCyan: '#00FFFF',
    neonPurple: '#60A5FA',
    neonGreen: '#39FF14',
    neonPink: '#FF10F0',
    
    // Workout intensity colors (more vibrant for dark mode)
    intensityLow: '#00FF88',
    intensityMedium: '#FFD700',
    intensityHigh: '#FF4757',
    intensityExtreme: '#FF3838',
    
    // Activity ring colors (Apple Watch style)
    ringMove: '#FF453A',
    ringExercise: '#30D158',
    ringStand: '#00C7BE',
    
    // Muscle group colors (darker mode optimized)
    chest: '#FF6B6B',
    back: '#4ECDC4',
    shoulders: '#45B7D1',
    arms: '#96CEB4',
    legs: '#FFEAA7',
    core: '#DDA0DD',
    cardio: '#FF7675',
    
    // Glassmorphism blur backgrounds for dark mode
    blurLight: 'rgba(255, 255, 255, 0.05)',
    blurMedium: 'rgba(255, 255, 255, 0.1)',
    blurHeavy: 'rgba(255, 255, 255, 0.15)',
  },
};