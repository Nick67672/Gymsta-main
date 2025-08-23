import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { safeAreaPadding } from '@/constants/Layout';
import { iOSDeviceTypes } from '@/lib/responsive';

interface SafeAreaWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
  backgroundColor?: string;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  padding?: {
    top?: number;
    bottom?: number;
    horizontal?: number;
  };
}

export const SafeAreaWrapper: React.FC<SafeAreaWrapperProps> = ({
  children,
  style,
  backgroundColor,
  edges = ['top', 'bottom', 'left', 'right'],
  padding,
}) => {
  const insets = useSafeAreaInsets();

  // iOS-specific safe area adjustments
  const getAdjustedInsets = () => {
    if (Platform.OS !== 'ios') {
      return insets;
    }

    return {
      ...insets,
      // Additional padding for Dynamic Island on Pro Max models
      top: iOSDeviceTypes.isIPhoneProMax ? insets.top + 4 : insets.top,
      // Ensure minimum bottom padding for home indicator
      bottom: Math.max(insets.bottom, iOSDeviceTypes.hasNotch ? 34 : 0),
    };
  };

  const adjustedInsets = getAdjustedInsets();

  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor,
    paddingTop: edges.includes('top') ? (padding?.top ?? adjustedInsets.top) : 0,
    paddingBottom: edges.includes('bottom') ? (padding?.bottom ?? adjustedInsets.bottom) : 0,
    paddingHorizontal: edges.includes('left') && edges.includes('right') ? (padding?.horizontal ?? safeAreaPadding.horizontal) : 0,
    ...style,
  };

  return (
    <SafeAreaView style={containerStyle} edges={edges}>
      {children}
    </SafeAreaView>
  );
};

// Alternative component for screens that need custom safe area handling
export const SafeAreaContainer: React.FC<SafeAreaWrapperProps> = ({
  children,
  style,
  backgroundColor,
  padding,
}) => {
  const insets = useSafeAreaInsets();

  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor,
    paddingTop: padding?.top ?? insets.top,
    paddingBottom: padding?.bottom ?? insets.bottom,
    paddingHorizontal: padding?.horizontal ?? safeAreaPadding.horizontal,
    ...style,
  };

  return (
    <View style={containerStyle}>
      {children}
    </View>
  );
};

export default SafeAreaWrapper; 