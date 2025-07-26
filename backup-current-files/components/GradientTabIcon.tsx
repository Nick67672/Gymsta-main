import React from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GradientTabIconProps {
  children: React.ReactElement;
  focused: boolean;
  size?: number;
  inactiveColor?: string;
}

export default function GradientTabIcon({ 
  children, 
  focused, 
  size = 40, 
  inactiveColor = '#A0A0A0' 
}: GradientTabIconProps) {
  if (!focused) {
    return (
      <View style={{
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
      }}>
        {React.cloneElement(children, { color: inactiveColor } as any)}
      </View>
    );
  }

  // For focused state, create a gradient background with white icon
  return (
    <LinearGradient
      colors={['#00D4FF', '#A855F7']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: size / 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
      }}
    >
      {React.cloneElement(children, { 
        color: '#FFFFFF',
        size: 20
      } as any)}
    </LinearGradient>
  );
}

// For the upload button, we'll create a special gradient version
export function GradientUploadButton({ children, size = 56 }: { children: React.ReactElement; size?: number }) {
  return (
    <LinearGradient
      colors={['#00D4FF', '#A855F7']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: size / 2,
        marginTop: -8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
      }}
    >
      {children}
    </LinearGradient>
  );
} 