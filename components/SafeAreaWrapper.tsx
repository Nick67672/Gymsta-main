import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { safeAreaPadding } from '@/constants/Layout';

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

  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor,
    paddingTop: edges.includes('top') ? (padding?.top ?? safeAreaPadding.top) : 0,
    paddingBottom: edges.includes('bottom') ? (padding?.bottom ?? safeAreaPadding.bottom) : 0,
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