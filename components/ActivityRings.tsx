import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';

const { width } = Dimensions.get('window');
const size = Math.min(width * 0.6, 200);
const center = size / 2;
const strokeWidth = 12;
const radius1 = center - strokeWidth * 2;
const radius2 = center - strokeWidth * 4;
const radius3 = center - strokeWidth * 6;

interface ActivityRingsProps {
  moveProgress: number; // 0-1
  exerciseProgress: number; // 0-1
  standProgress: number; // 0-1
  animated?: boolean;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const ActivityRings: React.FC<ActivityRingsProps> = ({
  moveProgress,
  exerciseProgress,
  standProgress,
  animated = true,
}) => {
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  const moveAnimation = useRef(new Animated.Value(0)).current;
  const exerciseAnimation = useRef(new Animated.Value(0)).current;
  const standAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      Animated.stagger(200, [
        Animated.timing(moveAnimation, {
          toValue: moveProgress,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(exerciseAnimation, {
          toValue: exerciseProgress,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(standAnimation, {
          toValue: standProgress,
          duration: 1500,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      moveAnimation.setValue(moveProgress);
      exerciseAnimation.setValue(exerciseProgress);
      standAnimation.setValue(standProgress);
    }
  }, [moveProgress, exerciseProgress, standProgress, animated]);

  const circumference1 = 2 * Math.PI * radius1;
  const circumference2 = 2 * Math.PI * radius2;
  const circumference3 = 2 * Math.PI * radius3;

  return (
    <View style={styles.container}>
      <Svg width={size} height={size} style={styles.svg}>
        <G rotation="-90" origin={`${center}, ${center}`}>
          {/* Background rings */}
          <Circle
            cx={center}
            cy={center}
            r={radius1}
            stroke={colors.ringMove + '20'}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={center}
            cy={center}
            r={radius2}
            stroke={colors.ringExercise + '20'}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={center}
            cy={center}
            r={radius3}
            stroke={colors.ringStand + '20'}
            strokeWidth={strokeWidth}
            fill="none"
          />
          
          {/* Progress rings */}
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius1}
            stroke={colors.ringMove}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference1}
            strokeDashoffset={moveAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [circumference1, 0],
            })}
            strokeLinecap="round"
            fill="none"
          />
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius2}
            stroke={colors.ringExercise}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference2}
            strokeDashoffset={exerciseAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [circumference2, 0],
            })}
            strokeLinecap="round"
            fill="none"
          />
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius3}
            stroke={colors.ringStand}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference3}
            strokeDashoffset={standAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [circumference3, 0],
            })}
            strokeLinecap="round"
            fill="none"
          />
        </G>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    transform: [{ rotate: '0deg' }],
  },
}); 