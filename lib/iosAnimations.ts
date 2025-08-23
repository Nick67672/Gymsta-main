// iOS-specific animation configurations and utilities
import { Platform, Animated, Easing } from 'react-native';

/**
 * iOS-specific animation durations based on Apple's Human Interface Guidelines
 */
export const IOSAnimationDurations = {
  // Quick interactions (button taps, toggles)
  quick: Platform.OS === 'ios' ? 200 : 150,
  
  // Standard interactions (sheet presentations, transitions)
  standard: Platform.OS === 'ios' ? 300 : 250,
  
  // Slow interactions (major state changes, complex animations)
  slow: Platform.OS === 'ios' ? 500 : 400,
  
  // Spring animations (bouncy, natural feeling)
  spring: Platform.OS === 'ios' ? 400 : 300,
};

/**
 * iOS-specific easing curves that match system animations
 */
export const IOSEasing = {
  // Standard ease-in-out (most common)
  standard: Platform.OS === 'ios' 
    ? Easing.bezier(0.25, 0.1, 0.25, 1) 
    : Easing.inOut(Easing.ease),
  
  // Ease-out (entering animations)
  easeOut: Platform.OS === 'ios'
    ? Easing.bezier(0.0, 0.0, 0.2, 1)
    : Easing.out(Easing.ease),
  
  // Ease-in (exiting animations)
  easeIn: Platform.OS === 'ios'
    ? Easing.bezier(0.4, 0.0, 1.0, 1.0)
    : Easing.in(Easing.ease),
  
  // Sharp (quick, decisive movements)
  sharp: Platform.OS === 'ios'
    ? Easing.bezier(0.4, 0.0, 0.6, 1)
    : Easing.inOut(Easing.quad),
};

/**
 * iOS-specific spring configurations
 */
export const IOSSpringConfig = {
  // Gentle spring (subtle bounces)
  gentle: Platform.OS === 'ios' ? {
    tension: 300,
    friction: 20,
    useNativeDriver: true,
  } : {
    tension: 250,
    friction: 18,
    useNativeDriver: true,
  },
  
  // Bouncy spring (more pronounced bounces)
  bouncy: Platform.OS === 'ios' ? {
    tension: 400,
    friction: 15,
    useNativeDriver: true,
  } : {
    tension: 350,
    friction: 12,
    useNativeDriver: true,
  },
  
  // Stiff spring (quick, minimal bounce)
  stiff: Platform.OS === 'ios' ? {
    tension: 500,
    friction: 25,
    useNativeDriver: true,
  } : {
    tension: 400,
    friction: 20,
    useNativeDriver: true,
  },
};

/**
 * Pre-configured iOS-style animations
 */
export const IOSAnimations = {
  // Fade in animation
  fadeIn: (animatedValue: Animated.Value, duration?: number) => {
    return Animated.timing(animatedValue, {
      toValue: 1,
      duration: duration || IOSAnimationDurations.standard,
      easing: IOSEasing.easeOut,
      useNativeDriver: true,
    });
  },

  // Fade out animation
  fadeOut: (animatedValue: Animated.Value, duration?: number) => {
    return Animated.timing(animatedValue, {
      toValue: 0,
      duration: duration || IOSAnimationDurations.standard,
      easing: IOSEasing.easeIn,
      useNativeDriver: true,
    });
  },

  // Scale in animation (like iOS button press)
  scaleIn: (animatedValue: Animated.Value, fromValue: number = 0.8) => {
    animatedValue.setValue(fromValue);
    return Animated.spring(animatedValue, {
      toValue: 1,
      ...IOSSpringConfig.gentle,
    });
  },

  // Scale out animation
  scaleOut: (animatedValue: Animated.Value, toValue: number = 0.8) => {
    return Animated.spring(animatedValue, {
      toValue,
      ...IOSSpringConfig.stiff,
    });
  },

  // Slide in from bottom (like iOS sheet presentation)
  slideInFromBottom: (animatedValue: Animated.Value, screenHeight: number) => {
    animatedValue.setValue(screenHeight);
    return Animated.spring(animatedValue, {
      toValue: 0,
      ...IOSSpringConfig.gentle,
    });
  },

  // Slide out to bottom
  slideOutToBottom: (animatedValue: Animated.Value, screenHeight: number) => {
    return Animated.spring(animatedValue, {
      toValue: screenHeight,
      ...IOSSpringConfig.stiff,
    });
  },

  // Button press animation (scale down then up)
  buttonPress: (animatedValue: Animated.Value) => {
    return Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 0.95,
        duration: IOSAnimationDurations.quick / 2,
        easing: IOSEasing.easeOut,
        useNativeDriver: true,
      }),
      Animated.spring(animatedValue, {
        toValue: 1,
        ...IOSSpringConfig.bouncy,
      }),
    ]);
  },

  // Heart like animation (iOS-style)
  heartLike: (animatedValue: Animated.Value) => {
    return Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 1.3,
        duration: IOSAnimationDurations.quick,
        easing: IOSEasing.easeOut,
        useNativeDriver: true,
      }),
      Animated.spring(animatedValue, {
        toValue: 1,
        ...IOSSpringConfig.bouncy,
      }),
    ]);
  },

  // Tab change animation
  tabChange: (animatedValue: Animated.Value) => {
    return Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 0.9,
        duration: IOSAnimationDurations.quick / 2,
        easing: IOSEasing.easeIn,
        useNativeDriver: true,
      }),
      Animated.spring(animatedValue, {
        toValue: 1,
        ...IOSSpringConfig.gentle,
      }),
    ]);
  },

  // Pull to refresh animation
  pullToRefresh: (animatedValue: Animated.Value) => {
    return Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 1.1,
        duration: IOSAnimationDurations.quick,
        easing: IOSEasing.easeOut,
        useNativeDriver: true,
      }),
      Animated.spring(animatedValue, {
        toValue: 1,
        ...IOSSpringConfig.gentle,
      }),
    ]);
  },
};

/**
 * iOS-specific layout animation configurations
 */
export const IOSLayoutAnimations = {
  // Smooth layout changes
  smooth: Platform.OS === 'ios' ? {
    duration: IOSAnimationDurations.standard,
    create: {
      type: 'easeInEaseOut' as const,
      property: 'opacity' as const,
    },
    update: {
      type: 'easeInEaseOut' as const,
    },
    delete: {
      type: 'easeInEaseOut' as const,
      property: 'opacity' as const,
    },
  } : undefined,
};

/**
 * Utility function to create iOS-style staggered animations
 */
export const createStaggeredAnimation = (
  animations: Animated.CompositeAnimation[],
  stagger: number = 50
): Animated.CompositeAnimation => {
  return Animated.stagger(stagger, animations);
};

/**
 * Utility function to create iOS-style parallel animations
 */
export const createParallelAnimation = (
  animations: Animated.CompositeAnimation[]
): Animated.CompositeAnimation => {
  return Animated.parallel(animations);
};

export default {
  IOSAnimationDurations,
  IOSEasing,
  IOSSpringConfig,
  IOSAnimations,
  IOSLayoutAnimations,
  createStaggeredAnimation,
  createParallelAnimation,
};

