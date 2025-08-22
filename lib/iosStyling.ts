// iOS-specific styling utilities and constants
import { Platform, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { iOSDeviceTypes } from './responsive';

/**
 * iOS-specific color system based on Apple's Human Interface Guidelines
 */
export const IOSColors = {
  // System colors that adapt to light/dark mode
  systemBlue: Platform.OS === 'ios' ? '#007AFF' : '#2196F3',
  systemGreen: Platform.OS === 'ios' ? '#34C759' : '#4CAF50',
  systemRed: Platform.OS === 'ios' ? '#FF3B30' : '#F44336',
  systemOrange: Platform.OS === 'ios' ? '#FF9500' : '#FF9800',
  systemYellow: Platform.OS === 'ios' ? '#FFCC00' : '#FFC107',
  systemPurple: Platform.OS === 'ios' ? '#AF52DE' : '#9C27B0',
  systemPink: Platform.OS === 'ios' ? '#FF2D92' : '#E91E63',
  systemTeal: Platform.OS === 'ios' ? '#5AC8FA' : '#009688',
  systemIndigo: Platform.OS === 'ios' ? '#5856D6' : '#3F51B5',

  // Gray colors
  systemGray: Platform.OS === 'ios' ? '#8E8E93' : '#9E9E9E',
  systemGray2: Platform.OS === 'ios' ? '#AEAEB2' : '#BDBDBD',
  systemGray3: Platform.OS === 'ios' ? '#C7C7CC' : '#E0E0E0',
  systemGray4: Platform.OS === 'ios' ? '#D1D1D6' : '#EEEEEE',
  systemGray5: Platform.OS === 'ios' ? '#E5E5EA' : '#F5F5F5',
  systemGray6: Platform.OS === 'ios' ? '#F2F2F7' : '#FAFAFA',

  // Background colors
  systemBackground: Platform.OS === 'ios' ? '#FFFFFF' : '#FFFFFF',
  secondarySystemBackground: Platform.OS === 'ios' ? '#F2F2F7' : '#FAFAFA',
  tertiarySystemBackground: Platform.OS === 'ios' ? '#FFFFFF' : '#FFFFFF',

  // Label colors
  label: Platform.OS === 'ios' ? '#000000' : '#212121',
  secondaryLabel: Platform.OS === 'ios' ? '#3C3C43' : '#757575',
  tertiaryLabel: Platform.OS === 'ios' ? '#3C3C43' : '#9E9E9E',
  quaternaryLabel: Platform.OS === 'ios' ? '#3C3C43' : '#BDBDBD',

  // Fill colors
  systemFill: Platform.OS === 'ios' ? 'rgba(120, 120, 128, 0.2)' : 'rgba(0, 0, 0, 0.12)',
  secondarySystemFill: Platform.OS === 'ios' ? 'rgba(120, 120, 128, 0.16)' : 'rgba(0, 0, 0, 0.08)',
  tertiarySystemFill: Platform.OS === 'ios' ? 'rgba(118, 118, 128, 0.12)' : 'rgba(0, 0, 0, 0.04)',
  quaternarySystemFill: Platform.OS === 'ios' ? 'rgba(116, 116, 128, 0.08)' : 'rgba(0, 0, 0, 0.02)',
};

/**
 * iOS-specific typography system
 */
export const IOSTypography = {
  // Large titles (iOS 11+)
  largeTitle: Platform.OS === 'ios' ? {
    fontSize: iOSDeviceTypes.isIPhoneSE ? 32 : 34,
    fontWeight: '700' as const,
    lineHeight: iOSDeviceTypes.isIPhoneSE ? 38 : 41,
    letterSpacing: 0.37,
  } : {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
  },

  // Title 1
  title1: Platform.OS === 'ios' ? {
    fontSize: iOSDeviceTypes.isIPhoneSE ? 26 : 28,
    fontWeight: '700' as const,
    lineHeight: iOSDeviceTypes.isIPhoneSE ? 32 : 34,
    letterSpacing: 0.36,
  } : {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 30,
  },

  // Title 2
  title2: Platform.OS === 'ios' ? {
    fontSize: iOSDeviceTypes.isIPhoneSE ? 20 : 22,
    fontWeight: '700' as const,
    lineHeight: iOSDeviceTypes.isIPhoneSE ? 25 : 28,
    letterSpacing: 0.35,
  } : {
    fontSize: 20,
    fontWeight: '700' as const,
    lineHeight: 26,
  },

  // Title 3
  title3: Platform.OS === 'ios' ? {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 25,
    letterSpacing: 0.38,
  } : {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },

  // Headline
  headline: Platform.OS === 'ios' ? {
    fontSize: 17,
    fontWeight: '600' as const,
    lineHeight: 22,
    letterSpacing: -0.41,
  } : {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 22,
  },

  // Body
  body: Platform.OS === 'ios' ? {
    fontSize: 17,
    fontWeight: '400' as const,
    lineHeight: 22,
    letterSpacing: -0.41,
  } : {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 22,
  },

  // Callout
  callout: Platform.OS === 'ios' ? {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 21,
    letterSpacing: -0.32,
  } : {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 21,
  },

  // Subhead
  subhead: Platform.OS === 'ios' ? {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 20,
    letterSpacing: -0.24,
  } : {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },

  // Footnote
  footnote: Platform.OS === 'ios' ? {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
    letterSpacing: -0.08,
  } : {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 18,
  },

  // Caption 1
  caption1: Platform.OS === 'ios' ? {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
    letterSpacing: 0,
  } : {
    fontSize: 11,
    fontWeight: '400' as const,
    lineHeight: 16,
  },

  // Caption 2
  caption2: Platform.OS === 'ios' ? {
    fontSize: 11,
    fontWeight: '400' as const,
    lineHeight: 13,
    letterSpacing: 0.07,
  } : {
    fontSize: 10,
    fontWeight: '400' as const,
    lineHeight: 13,
  },
};

/**
 * iOS-specific shadow configurations
 */
export const IOSShadows = {
  // Small shadow (buttons, cards)
  small: Platform.OS === 'ios' ? {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  } : {
    elevation: 2,
  },

  // Medium shadow (modals, floating elements)
  medium: Platform.OS === 'ios' ? {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  } : {
    elevation: 5,
  },

  // Large shadow (sheets, important elements)
  large: Platform.OS === 'ios' ? {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  } : {
    elevation: 8,
  },

  // Extra large shadow (main modals)
  extraLarge: Platform.OS === 'ios' ? {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.44,
    shadowRadius: 10.32,
    elevation: 16,
  } : {
    elevation: 16,
  },
};

/**
 * iOS-specific border radius values
 */
export const IOSBorderRadius = {
  small: Platform.OS === 'ios' ? 6 : 4,
  medium: Platform.OS === 'ios' ? 8 : 6,
  large: Platform.OS === 'ios' ? 12 : 8,
  extraLarge: Platform.OS === 'ios' ? 16 : 12,
  card: Platform.OS === 'ios' ? 12 : 8,
  button: Platform.OS === 'ios' ? 8 : 6,
  input: Platform.OS === 'ios' ? 8 : 4,
};

/**
 * iOS-specific button styles
 */
export const IOSButtonStyles = {
  // Primary button
  primary: {
    backgroundColor: IOSColors.systemBlue,
    borderRadius: IOSBorderRadius.button,
    paddingVertical: 12,
    paddingHorizontal: 20,
    ...IOSShadows.small,
  },

  // Secondary button
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: IOSColors.systemBlue,
    borderRadius: IOSBorderRadius.button,
    paddingVertical: 11, // 1px less to account for border
    paddingHorizontal: 19,
  },

  // Tertiary button
  tertiary: {
    backgroundColor: IOSColors.systemFill,
    borderRadius: IOSBorderRadius.button,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },

  // Destructive button
  destructive: {
    backgroundColor: IOSColors.systemRed,
    borderRadius: IOSBorderRadius.button,
    paddingVertical: 12,
    paddingHorizontal: 20,
    ...IOSShadows.small,
  },
};

/**
 * iOS-specific card styles
 */
export const IOSCardStyles = {
  // Standard card
  standard: {
    backgroundColor: IOSColors.systemBackground,
    borderRadius: IOSBorderRadius.card,
    padding: 16,
    ...IOSShadows.medium,
  },

  // Compact card
  compact: {
    backgroundColor: IOSColors.systemBackground,
    borderRadius: IOSBorderRadius.medium,
    padding: 12,
    ...IOSShadows.small,
  },

  // Elevated card
  elevated: {
    backgroundColor: IOSColors.systemBackground,
    borderRadius: IOSBorderRadius.large,
    padding: 20,
    ...IOSShadows.large,
  },
};

/**
 * iOS-specific input styles
 */
export const IOSInputStyles = {
  // Standard input
  standard: {
    backgroundColor: IOSColors.systemBackground,
    borderWidth: 1,
    borderColor: IOSColors.systemGray4,
    borderRadius: IOSBorderRadius.input,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 17,
    color: IOSColors.label,
  },

  // Search input
  search: {
    backgroundColor: IOSColors.secondarySystemBackground,
    borderRadius: IOSBorderRadius.medium,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 17,
    color: IOSColors.label,
  },
};

/**
 * Utility function to create iOS-style sheets/modals
 */
export const createIOSModalStyle = (screenHeight: number): ViewStyle => ({
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.4)',
  justifyContent: 'flex-end',
});

export const createIOSSheetStyle = (): ViewStyle => ({
  backgroundColor: IOSColors.systemBackground,
  borderTopLeftRadius: IOSBorderRadius.large,
  borderTopRightRadius: IOSBorderRadius.large,
  paddingTop: 8,
  paddingBottom: iOSDeviceTypes.hasNotch ? 34 : 20,
  paddingHorizontal: 16,
  ...IOSShadows.extraLarge,
});

export default {
  IOSColors,
  IOSTypography,
  IOSShadows,
  IOSBorderRadius,
  IOSButtonStyles,
  IOSCardStyles,
  IOSInputStyles,
  createIOSModalStyle,
  createIOSSheetStyle,
};

