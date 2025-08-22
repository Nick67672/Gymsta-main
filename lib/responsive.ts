// Utility helpers for responsive, proportionate sizing across any phone.
// Optimized for all iOS devices including iPhone SE, standard, Plus, and Pro Max.
import { Dimensions, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const guidelineBaseWidth = 375;  // iPhone X width
const guidelineBaseHeight = 812; // iPhone X height

export const scale = (size: number) => (width / guidelineBaseWidth) * size;
export const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;
// Moderates the resize factor so small changes on bigger devices don’t blow up fonts/elements
export const moderateScale = (size: number, factor = 0.5) =>
  size + (scale(size) - size) * factor;

export const responsiveSpacing = {
  xs: scale(4),
  sm: scale(8),
  md: scale(12),
  lg: scale(16),
  xl: scale(24),
}; 

// iOS Device Detection
export const iOSDeviceTypes = {
  // iPhone SE (1st, 2nd, 3rd gen) - 320x568, 375x667
  isIPhoneSE: width <= 375 && height <= 667,
  
  // iPhone 12 mini, 13 mini - 375x812
  isIPhoneMini: width === 375 && height === 812,
  
  // iPhone 12, 12 Pro, 13, 13 Pro, 14, 14 Pro - 390x844
  isIPhoneStandard: width >= 390 && width <= 393 && height >= 844 && height <= 852,
  
  // iPhone 12 Pro Max, 13 Pro Max, 14 Plus - 414x896
  isIPhonePlus: width >= 414 && width <= 428 && height >= 896 && height <= 926,
  
  // iPhone 14 Pro Max, 15 Pro Max - 430x932
  isIPhoneProMax: width >= 430 && height >= 932,
  
  // Any iPhone with notch/Dynamic Island
  hasNotch: Platform.OS === 'ios' && height >= 812,
  
  // Legacy iPhones without notch (iPhone 8 and earlier)
  isLegacyIPhone: Platform.OS === 'ios' && height < 812,
};

// Device/category helpers with iOS-specific optimizations
const isSmallDevice = width < 375; // iPhone SE and smaller
const isMediumDevice = width >= 375 && width < 414; // Standard iPhones
const isLargeDevice = width >= 414; // Plus and Pro Max models

// iOS-specific safe area calculations
export const iOSSafeAreas = {
  // Status bar heights for different iOS devices
  statusBarHeight: Platform.OS === 'ios' ? (
    iOSDeviceTypes.hasNotch ? 44 : 20
  ) : StatusBar.currentHeight || 24,
  
  // Home indicator height for devices with Face ID
  homeIndicatorHeight: Platform.OS === 'ios' ? (
    iOSDeviceTypes.hasNotch ? 34 : 0
  ) : 0,
  
  // Dynamic Island/Notch considerations
  topInsetAdjustment: Platform.OS === 'ios' ? (
    iOSDeviceTypes.isIPhoneProMax ? 4 : 
    iOSDeviceTypes.hasNotch ? 2 : 0
  ) : 0,
};

// Device-specific utilities used by containers and layout
export const deviceSpecific = {
  getScreenPadding(): { horizontal: number; vertical: number } {
    // Base paddings scaled by device size with iOS optimizations
    const baseHorizontal = responsiveSpacing.lg;
    const baseVertical = responsiveSpacing.md;

    if (Platform.OS === 'ios') {
      // iOS-specific adjustments
      if (iOSDeviceTypes.isIPhoneSE) {
        return {
          horizontal: Math.max(responsiveSpacing.md, baseHorizontal * 0.85),
          vertical: Math.max(responsiveSpacing.sm, baseVertical * 0.9),
        };
      }
      
      if (iOSDeviceTypes.isIPhoneProMax) {
        return {
          horizontal: baseHorizontal * 1.2,
          vertical: baseVertical * 1.15,
        };
      }
      
      if (iOSDeviceTypes.isIPhonePlus) {
        return {
          horizontal: baseHorizontal * 1.1,
          vertical: baseVertical * 1.1,
        };
      }
    }

    // Fallback for other devices
    if (isSmallDevice) {
      return {
        horizontal: Math.max(responsiveSpacing.md, baseHorizontal * 0.9),
        vertical: Math.max(responsiveSpacing.sm, baseVertical * 0.9),
      };
    }

    if (isLargeDevice) {
      return {
        horizontal: baseHorizontal * 1.1,
        vertical: baseVertical * 1.1,
      };
    }

    return { horizontal: baseHorizontal, vertical: baseVertical };
  },

  // iOS-specific touch target sizing
  getTouchTargetSize(): { minHeight: number; minWidth: number } {
    if (Platform.OS === 'ios') {
      // Apple HIG recommends minimum 44pt touch targets
      return {
        minHeight: Math.max(44, scale(44)),
        minWidth: Math.max(44, scale(44)),
      };
    }
    
    // Material Design recommends 48dp
    return {
      minHeight: Math.max(48, scale(48)),
      minWidth: Math.max(48, scale(48)),
    };
  },

  // iOS-specific font scaling
  getFontScale(): number {
    if (Platform.OS === 'ios') {
      if (iOSDeviceTypes.isIPhoneSE) return 0.9;
      if (iOSDeviceTypes.isIPhoneProMax) return 1.1;
      if (iOSDeviceTypes.isIPhonePlus) return 1.05;
    }
    return 1.0;
  },
};