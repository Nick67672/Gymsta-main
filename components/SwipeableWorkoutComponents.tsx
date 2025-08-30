import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Animated, Dimensions, Platform } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { Trash2 } from 'lucide-react-native';
import { Spacing } from '@/constants/Spacing';

const { width: screenWidth } = Dimensions.get('window');
const SWIPE_THRESHOLD = screenWidth * 0.2;

type WorkoutSet = { reps: number; weight: number; completed?: boolean };
type Exercise = { id: string; name: string; sets: WorkoutSet[] };

// SwipeableSetRow component for workout creation
interface SwipeableSetRowProps {
  set: WorkoutSet;
  setIndex: number;
  exerciseId: string;
  colors: any;
  isReadOnly: boolean;
  onDeleteSet: (exerciseId: string, setIndex: number) => void;
  onUpdateSet: (exerciseId: string, setIndex: number, field: 'reps' | 'weight' | 'completed', value: number | boolean) => void;
}

export const SwipeableSetRow: React.FC<SwipeableSetRowProps> = ({
  set,
  setIndex,
  exerciseId,
  colors,
  isReadOnly,
  onDeleteSet,
  onUpdateSet,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const [gestureState, setGestureState] = useState<'idle' | 'swiping' | 'deleted'>('idle');

  const handlePanGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: false }
  );

  const handlePanStateChange = (event: any) => {
    const { state, translationX } = event.nativeEvent;

    if (state === State.END) {
      if (translationX < -SWIPE_THRESHOLD) {
        // Swipe left - delete set
        deleteSet();
      } else {
        // Return to center
        resetPosition();
      }
    }
  };

  const deleteSet = () => {
    setGestureState('deleted');
    
    // Haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }

    // Animate deletion
    Animated.timing(translateX, {
      toValue: -screenWidth,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      onDeleteSet(exerciseId, setIndex);
      resetPosition();
      setGestureState('idle');
    });
  };

  const resetPosition = () => {
    Animated.spring(translateX, {
      toValue: 0,
      friction: 6,
      useNativeDriver: false,
    }).start();
  };

  const getDeleteIndicatorOpacity = () => {
    return translateX.interpolate({
      inputRange: [-SWIPE_THRESHOLD, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });
  };

  const getBackgroundColor = () => {
    return translateX.interpolate({
      inputRange: [-SWIPE_THRESHOLD, 0],
      outputRange: ['#EF4444', colors.background],
      extrapolate: 'clamp',
    });
  };

  return (
    <View style={styles.swipeContainer}>
      {/* Delete background */}
      <Animated.View 
        style={[
          styles.deleteBackground,
          { 
            opacity: getDeleteIndicatorOpacity(),
            backgroundColor: '#EF4444'
          }
        ]}
      >
        <Trash2 size={20} color="white" />
        <Text style={styles.deleteText}>Delete</Text>
      </Animated.View>

      {/* Main content */}
      <PanGestureHandler
        onGestureEvent={handlePanGestureEvent}
        onHandlerStateChange={handlePanStateChange}
        enabled={!isReadOnly}
      >
        <Animated.View
          style={[
            styles.setRow,
            {
              backgroundColor: getBackgroundColor(),
              transform: [{ translateX }],
            },
          ]}
        >
          <Text style={[styles.setIndex, { color: colors.textSecondary }]}>Set {setIndex + 1}</Text>
          <TextInput
            style={[styles.setInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }]}
            keyboardType="number-pad"
            value={String(set.reps)}
            editable={!isReadOnly}
            onChangeText={(t) => onUpdateSet(exerciseId, setIndex, 'reps', Number(t || 0))}
            placeholder="Reps"
            placeholderTextColor={colors.textSecondary}
          />
          <TextInput
            style={[styles.setInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }]}
            keyboardType="decimal-pad"
            value={String(set.weight)}
            editable={!isReadOnly}
            onChangeText={(t) => onUpdateSet(exerciseId, setIndex, 'weight', Number(t || 0))}
            placeholder="Weight"
            placeholderTextColor={colors.textSecondary}
          />
          <TouchableOpacity
            disabled={isReadOnly}
            style={[styles.completeBtn, { backgroundColor: set.completed ? colors.tint : colors.border }]}
            onPress={() => onUpdateSet(exerciseId, setIndex, 'completed', !set.completed)}
          >
            <Text style={[styles.completeText, { color: set.completed ? '#fff' : colors.textSecondary }]}>
              {set.completed ? '✓' : '•'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

// SwipeableExerciseCard component for workout creation
interface SwipeableExerciseCardProps {
  exercise: Exercise;
  exerciseIndex: number;
  colors: any;
  isReadOnly: boolean;
  onDeleteExercise: (exerciseIndex: number) => void;
  onUpdateExerciseName: (exerciseId: string, value: string) => void;
  onAddSet: (exerciseId: string) => void;
  onDeleteSet: (exerciseId: string, setIndex: number) => void;
  onUpdateSet: (exerciseId: string, setIndex: number, field: 'reps' | 'weight' | 'completed', value: number | boolean) => void;
}

export const SwipeableExerciseCard: React.FC<SwipeableExerciseCardProps> = ({
  exercise,
  exerciseIndex,
  colors,
  isReadOnly,
  onDeleteExercise,
  onUpdateExerciseName,
  onAddSet,
  onDeleteSet,
  onUpdateSet,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const [gestureState, setGestureState] = useState<'idle' | 'swiping' | 'deleted'>('idle');

  const handlePanGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: false }
  );

  const handlePanStateChange = (event: any) => {
    const { state, translationX } = event.nativeEvent;

    if (state === State.END) {
      if (translationX < -SWIPE_THRESHOLD) {
        // Swipe left - delete exercise
        deleteExercise();
      } else {
        // Return to center
        resetPosition();
      }
    }
  };

  const deleteExercise = () => {
    setGestureState('deleted');
    
    // Haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }

    // Animate deletion
    Animated.timing(translateX, {
      toValue: -screenWidth,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      onDeleteExercise(exerciseIndex);
      resetPosition();
      setGestureState('idle');
    });
  };

  const resetPosition = () => {
    Animated.spring(translateX, {
      toValue: 0,
      friction: 6,
      useNativeDriver: false,
    }).start();
  };

  const getDeleteIndicatorOpacity = () => {
    return translateX.interpolate({
      inputRange: [-SWIPE_THRESHOLD, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });
  };

  const getBackgroundColor = () => {
    return translateX.interpolate({
      inputRange: [-SWIPE_THRESHOLD, 0],
      outputRange: ['#EF4444', colors.card],
      extrapolate: 'clamp',
    });
  };

  return (
    <View style={styles.swipeContainer}>
      {/* Delete background */}
      <Animated.View 
        style={[
          styles.deleteBackground,
          { 
            opacity: getDeleteIndicatorOpacity(),
            backgroundColor: '#EF4444'
          }
        ]}
      >
        <Trash2 size={24} color="white" />
        <Text style={styles.deleteText}>Delete Exercise</Text>
      </Animated.View>

      {/* Main content */}
      <PanGestureHandler
        onGestureEvent={handlePanGestureEvent}
        onHandlerStateChange={handlePanStateChange}
        enabled={!isReadOnly}
      >
        <Animated.View
          style={[
            styles.exerciseCard,
            {
              backgroundColor: getBackgroundColor(),
              borderColor: colors.border,
              borderWidth: 1,
              transform: [{ translateX }],
            },
          ]}
        >
          <TextInput
            style={[styles.exerciseName, { color: colors.text }]}
            value={exercise.name}
            onChangeText={(t) => onUpdateExerciseName(exercise.id, t)}
            editable={!isReadOnly}
            placeholder="Exercise name"
            placeholderTextColor={colors.textSecondary}
          />
          {exercise.sets.map((s, i) => (
            <SwipeableSetRow
              key={i}
              set={s}
              setIndex={i}
              exerciseId={exercise.id}
              colors={colors}
              isReadOnly={isReadOnly}
              onDeleteSet={onDeleteSet}
              onUpdateSet={onUpdateSet}
            />
          ))}
          {!isReadOnly && (
            <TouchableOpacity style={[styles.addSetBtn, { borderColor: colors.border }]} onPress={() => onAddSet(exercise.id)}>
              <Text style={[styles.addSetText, { color: colors.text }]}>+ Add set</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

const styles = StyleSheet.create({
  swipeContainer: {
    overflow: 'hidden',
  },
  deleteBackground: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  deleteText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginTop: Spacing.xs,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  setIndex: {
    width: 52,
    textAlign: 'right',
    fontWeight: '600',
  },
  setInput: {
    flex: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  completeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeText: {
    fontSize: 16,
    fontWeight: '800',
  },
  exerciseCard: {
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  addSetBtn: {
    borderWidth: 1,
    borderRadius: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    marginTop: Spacing.xs,
  },
  addSetText: {
    fontWeight: '700',
  },
});
