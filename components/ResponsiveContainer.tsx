import React from 'react';
import { View, ViewStyle, ScrollView, ScrollViewProps } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { safeAreaPadding, componentPadding } from '@/constants/Layout';
import { deviceSpecific } from '@/lib/responsive';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  backgroundColor?: string;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  padding?: {
    top?: number;
    bottom?: number;
    horizontal?: number;
    vertical?: number;
  };
  scrollable?: boolean;
  scrollProps?: ScrollViewProps;
  safeArea?: boolean;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  style,
  backgroundColor,
  edges = ['top', 'bottom', 'left', 'right'],
  padding,
  scrollable = false,
  scrollProps = {},
  safeArea = true,
}) => {
  const insets = useSafeAreaInsets();

  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor,
    paddingTop: edges.includes('top') && safeArea ? (padding?.top ?? safeAreaPadding.top) : padding?.top ?? 0,
    paddingBottom: edges.includes('bottom') && safeArea ? (padding?.bottom ?? safeAreaPadding.bottom) : padding?.bottom ?? 0,
    paddingHorizontal: edges.includes('left') && edges.includes('right') ? (padding?.horizontal ?? safeAreaPadding.horizontal) : 0,
    paddingVertical: padding?.vertical,
    ...style,
  };

  const content = scrollable ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
      {...scrollProps}
    >
      {children}
    </ScrollView>
  ) : (
    children
  );

  if (safeArea) {
    return (
      <SafeAreaView style={containerStyle} edges={edges}>
        {content}
      </SafeAreaView>
    );
  }

  return <View style={containerStyle}>{content}</View>;
};

// Screen-specific container with optimized padding
export const ScreenContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  style,
  backgroundColor,
  padding,
  scrollable = false,
  scrollProps = {},
}) => {
  const screenPadding = deviceSpecific.getScreenPadding();
  
  return (
    <ResponsiveContainer
      style={style}
      backgroundColor={backgroundColor}
      padding={{
        horizontal: padding?.horizontal ?? screenPadding.horizontal,
        vertical: padding?.vertical ?? screenPadding.vertical,
        top: padding?.top,
        bottom: padding?.bottom,
      }}
      scrollable={scrollable}
      scrollProps={scrollProps}
    >
      {children}
    </ResponsiveContainer>
  );
};

// Content container with consistent spacing
export const ContentContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  style,
  padding,
  scrollable = false,
  scrollProps = {},
}) => {
  return (
    <ResponsiveContainer
      style={style}
      padding={{
        horizontal: padding?.horizontal ?? componentPadding.large,
        vertical: padding?.vertical ?? componentPadding.medium,
        top: padding?.top,
        bottom: padding?.bottom,
      }}
      scrollable={scrollable}
      scrollProps={scrollProps}
      safeArea={false}
    >
      {children}
    </ResponsiveContainer>
  );
};

export default ResponsiveContainer; 