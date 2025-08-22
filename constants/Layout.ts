// Centralised spacing & padding values that automatically scale to the device width.
// Optimized for iOS devices with proper safe area handling.

import { responsiveSpacing as RS, scale, deviceSpecific, iOSSafeAreas, iOSDeviceTypes } from '@/lib/responsive';
import { Platform } from 'react-native';

// Dynamic screen padding based on device type
const screenPadding = deviceSpecific.getScreenPadding();

// Base horizontal/vertical paddings for screens
export const horizontalPadding = screenPadding.horizontal;
export const verticalPadding = screenPadding.vertical;
export const gap = RS.md; // Consistent inter-item gap

// iOS-optimized safe area padding
export const safeAreaPadding = {
  top: Platform.OS === 'ios' ? (
    iOSSafeAreas.statusBarHeight + iOSSafeAreas.topInsetAdjustment
  ) : RS.md,
  bottom: Platform.OS === 'ios' ? (
    iOSSafeAreas.homeIndicatorHeight + RS.sm
  ) : RS.md,
  horizontal: screenPadding.horizontal,
};

// Component-level paddings for consistent inner spacing with iOS optimizations
export const componentPadding = {
  small: RS.sm,
  medium: RS.md,
  large: RS.lg,
  xlarge: RS.xl,
};

// iOS-specific touch targets
export const touchTargets = deviceSpecific.getTouchTargetSize();

// iOS-specific header heights
export const headerHeights = {
  standard: Platform.OS === 'ios' ? (
    iOSDeviceTypes.hasNotch ? 88 : 64
  ) : 56,
  compact: Platform.OS === 'ios' ? (
    iOSDeviceTypes.hasNotch ? 64 : 44
  ) : 48,
};

// iOS-specific tab bar heights
export const tabBarHeight = Platform.OS === 'ios' ? (
  iOSDeviceTypes.hasNotch ? 83 : 49
) : 56;

export default {
  horizontalPadding,
  verticalPadding,
  gap,
  safeAreaPadding,
  componentPadding,
  touchTargets,
  headerHeights,
  tabBarHeight,
  scale,              // re-export so other modules can `import { scale } from '@/constants/Layout'`
};