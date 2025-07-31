import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  Platform,
  StatusBar,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { EXERCISE_OPTIONS } from '@/constants/ExerciseOptions';

interface ExercisePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectExercise: (exercise: string) => void;
}

// Exercise type classification
enum ExerciseType {
  STRENGTH = 'strength',
  CARDIO_TIME = 'cardio_time',
  CARDIO_REPS = 'cardio_reps',
  BODYWEIGHT = 'bodyweight',
  TIME_BASED = 'time_based',
  DISTANCE = 'distance',
}

const EXERCISE_TYPES: { [key: string]: ExerciseType } = {
  // CARDIO - TIME BASED
  'Treadmill Running': ExerciseType.CARDIO_TIME,
  'Running': ExerciseType.CARDIO_TIME,
  'Jogging': ExerciseType.CARDIO_TIME,
  'Walking': ExerciseType.CARDIO_TIME,
  'Cycling': ExerciseType.CARDIO_TIME,
  'Stationary Bike': ExerciseType.CARDIO_TIME,
  'Elliptical': ExerciseType.CARDIO_TIME,
  'Rowing Machine': ExerciseType.CARDIO_TIME,
  'Swimming': ExerciseType.CARDIO_TIME,

  // CARDIO - REPS BASED
  'Burpees': ExerciseType.CARDIO_REPS,
  'Mountain Climbers': ExerciseType.CARDIO_REPS,
  'Jumping Jacks': ExerciseType.CARDIO_REPS,
  'High Knees': ExerciseType.CARDIO_REPS,
  'Jump Squats': ExerciseType.CARDIO_REPS,
  'Box Jumps': ExerciseType.CARDIO_REPS,

  // BODYWEIGHT
  'Push-Ups': ExerciseType.BODYWEIGHT,
  'Pull-Ups': ExerciseType.BODYWEIGHT,
  'Chin-Ups': ExerciseType.BODYWEIGHT,
  'Dips': ExerciseType.BODYWEIGHT,
  'Air Squats': ExerciseType.BODYWEIGHT,
  'Lunges': ExerciseType.BODYWEIGHT,

  // TIME-BASED
  'Plank': ExerciseType.TIME_BASED,
  'Side Planks': ExerciseType.TIME_BASED,
  'Wall Sits': ExerciseType.TIME_BASED,
  'Dead Hangs': ExerciseType.TIME_BASED,

  // DISTANCE
  'Farmers Walk': ExerciseType.DISTANCE,
  'Sled Push': ExerciseType.DISTANCE,
  'Sled Pull': ExerciseType.DISTANCE,
  'Yoke Walk': ExerciseType.DISTANCE,
};

const getExerciseType = (exerciseName: string): ExerciseType => {
  if (EXERCISE_TYPES[exerciseName]) {
    return EXERCISE_TYPES[exerciseName];
  }

  const name = exerciseName.toLowerCase();
  
  if (name.includes('plank') || name.includes('hold')) {
    return ExerciseType.TIME_BASED;
  }
  
  if (name.includes('walk') || name.includes('carry') || name.includes('sled')) {
    return ExerciseType.DISTANCE;
  }
  
  if (name.includes('running') || name.includes('cycling') || name.includes('rowing') || 
      name.includes('treadmill') || name.includes('elliptical') || name.includes('bike') ||
      name.includes('swimming') || name.includes('stair')) {
    return ExerciseType.CARDIO_TIME;
  }
  
  if (name.includes('burpee') || name.includes('jumping') || name.includes('jump') || 
      name.includes('mountain climber') || name.includes('high knee')) {
    return ExerciseType.CARDIO_REPS;
  }
  
  if (name.includes('push-up') || name.includes('pushup') || name.includes('pull-up') || 
      name.includes('pullup') || name.includes('chin-up') || name.includes('dip') ||
      (name.includes('squat') && !name.includes('barbell') && !name.includes('dumbbell') && !name.includes('goblet'))) {
    return ExerciseType.BODYWEIGHT;
  }

  return ExerciseType.STRENGTH;
};

export const ExercisePicker: React.FC<ExercisePickerProps> = ({
  visible,
  onClose,
  onSelectExercise,
}) => {
  console.log('ExercisePicker rendered with visible:', visible);
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  const [searchQuery, setSearchQuery] = useState('');
  const [exercises, setExercises] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const searchExercises = async (query: string) => {
    if (!query.trim()) {
      setExercises([]);
      return;
    }

    setLoading(true);

    try {
      // Filter exercises based on search query
      const filteredExercises = EXERCISE_OPTIONS.filter(exercise => 
        exercise.toLowerCase().includes(query.toLowerCase())
      );
      
      setExercises(filteredExercises);
    } catch (err) {
      console.error('Error searching exercises:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExercisePress = (exercise: string) => {
    console.log('Exercise selected:', exercise);
    onSelectExercise(exercise);
    onClose();
  };

  const renderExercise = ({ item }: { item: string }) => {
    const exerciseType = getExerciseType(item);
    
    return (
      <TouchableOpacity 
        style={[styles.exerciseItem, { backgroundColor: colors.card }]}
        onPress={() => handleExercisePress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.exerciseContent}>
          <View style={[styles.exerciseIcon, { backgroundColor: colors.tint + '20' }]}>
            <Text style={{ color: colors.tint, fontSize: 20 }}>🏋️</Text>
          </View>
          <View style={styles.exerciseInfo}>
            <Text style={[styles.exerciseName, { color: colors.text }]} numberOfLines={1}>
              {item}
            </Text>
            <Text style={[styles.exerciseType, { color: colors.textSecondary }]} numberOfLines={1}>
              {exerciseType.replace('_', ' ').toLowerCase()}
            </Text>
          </View>
          <View style={[styles.selectButton, { backgroundColor: colors.tint }]}>
            <Text style={styles.selectButtonText}>→</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Handle keyboard avoiding behavior for iOS
  const keyboardVerticalOffset = Platform.OS === 'ios' ? 0 : 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen" // Changed from transparent
      onRequestClose={onClose}
      statusBarTranslucent={false}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar 
          barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} 
          backgroundColor={colors.background}
        />
        
        {/* Debug indicator - remove this once working */}
        <View style={styles.debugIndicator}>
          <Text style={styles.debugText}>EXERCISE PICKER IS VISIBLE!</Text>
        </View>

        <View style={[styles.header, {
          borderBottomColor: colors.border,
          backgroundColor: colors.background
        }]}>
          <View style={styles.headerContent}>
            <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
              <Text style={[styles.searchIcon, { color: colors.textSecondary }]}>🔍</Text>
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search exercises..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  searchExercises(text);
                }}
                autoFocus={false} // Changed to prevent immediate keyboard popup
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing" // iOS native clear button
              />
              {Platform.OS === 'android' && searchQuery.length > 0 && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => {
                    setSearchQuery('');
                    setExercises([]);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={[styles.clearButtonText, { color: colors.textSecondary }]}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity 
              style={[styles.closeButton, { backgroundColor: colors.card }]}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <Text style={[styles.closeButtonText, { color: colors.text }]}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.tint} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Searching exercises...
              </Text>
            </View>
          ) : searchQuery.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconContainer, { backgroundColor: colors.card }]}>
                <Text style={styles.emptyIcon}>🏋️</Text>
              </View>
              <Text style={[styles.emptyText, { color: colors.text }]}>Find exercises to add</Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                Search by exercise name to add to your workout
              </Text>
            </View>
          ) : exercises.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconContainer, { backgroundColor: colors.card }]}>
                <Text style={styles.emptyIcon}>🔍</Text>
              </View>
              <Text style={[styles.emptyText, { color: colors.text }]}>No exercises found</Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                Try searching with a different term
              </Text>
            </View>
          ) : (
            <FlatList
              data={exercises}
              keyExtractor={(item) => item}
              renderItem={renderExercise}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              keyboardShouldPersistTaps="handled" // Important for iOS
              removeClippedSubviews={true} // Performance optimization
              maxToRenderPerBatch={10}
              windowSize={10}
            />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  debugIndicator: {
    padding: 20,
    backgroundColor: 'red',
    alignItems: 'center',
  },
  debugText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  searchIcon: {
    marginRight: 12,
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    minHeight: Platform.OS === 'ios' ? 20 : undefined,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  listContainer: {
    paddingTop: 20,
    paddingBottom: 40, // Extra padding for iOS safe area
  },
  exerciseItem: {
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  exerciseContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  exerciseIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  exerciseInfo: {
    flex: 1,
    marginRight: 12,
  },
  exerciseName: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  exerciseType: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '400',
  },
  selectButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  separator: {
    height: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyIcon: {
    fontSize: 48,
    color: '#999',
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
});