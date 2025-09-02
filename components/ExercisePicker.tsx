import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { EXERCISE_OPTIONS } from '@/constants/ExerciseOptions';

const { width: screenWidth } = Dimensions.get('window');

interface ExercisePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectExercise: (exercise: string) => void;
}

interface ExerciseCategory {
  name: string;
  exercises: string[];
  icon: string;
  color: string;
}

export const ExercisePicker: React.FC<ExercisePickerProps> = ({
  visible,
  onClose,
  onSelectExercise,
}) => {
  const { theme } = useTheme();
  const colors = useMemo(() => Colors[theme], [theme]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCategories, setFilteredCategories] = useState<
    ExerciseCategory[]
  >([]);

  // Parse exercises into categories
  const parseExerciseCategories = (): ExerciseCategory[] => {
    const categories: ExerciseCategory[] = [
      {
        name: 'CHEST',
        exercises: EXERCISE_OPTIONS.slice(0, 24),
        icon: '',
        color: '#FF6B6B',
      },
      {
        name: 'BACK',
        exercises: EXERCISE_OPTIONS.slice(24, 45),
        icon: '',
        color: '#4ECDC4',
      },
      {
        name: 'SHOULDERS',
        exercises: EXERCISE_OPTIONS.slice(45, 65),
        icon: '',
        color: '#45B7D1',
      },
      {
        name: 'ARMS',
        exercises: EXERCISE_OPTIONS.slice(65, 85),
        icon: '',
        color: '#96CEB4',
      },
      {
        name: 'LEGS',
        exercises: EXERCISE_OPTIONS.slice(85, 105),
        icon: '',
        color: '#FFEAA7',
      },
      {
        name: 'CORE',
        exercises: EXERCISE_OPTIONS.slice(105, 125),
        icon: '',
        color: '#DDA0DD',
      },
      {
        name: 'CARDIO',
        exercises: EXERCISE_OPTIONS.slice(125, 145),
        icon: '',
        color: '#FF8A80',
      },
      {
        name: 'FUNCTIONAL',
        exercises: EXERCISE_OPTIONS.slice(145, 165),
        icon: '',
        color: '#FFD93D',
      },
      {
        name: 'SPECIALTY',
        exercises: EXERCISE_OPTIONS.slice(165, 196),
        icon: '',
        color: '#3B82F6',
      },
    ];

    return categories.filter((cat) => cat.exercises.length > 0);
  };

  // Use useMemo to memoize the categories so they don't change on every render
  const allCategories = useMemo(() => parseExerciseCategories(), []);

  // Filter categories and exercises based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCategories(allCategories);
      return;
    }

    const filtered = allCategories
      .map((category) => ({
        ...category,
        exercises: category.exercises.filter((exercise) =>
          exercise.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      }))
      .filter((category) => category.exercises.length > 0);

    setFilteredCategories(filtered);
  }, [searchQuery, allCategories]);

  const handleExerciseSelect = useCallback(
    (exercise: string) => {
      onSelectExercise(exercise);
      setSearchQuery('');
      setFilteredCategories(allCategories);
      onClose();
    },
    [onSelectExercise, onClose, allCategories]
  );

  const handleClose = useCallback(() => {
    setSearchQuery('');
    setFilteredCategories(allCategories);
    onClose();
  }, [onClose, allCategories]);

  const renderCategory = useCallback(
    ({ item }: { item: ExerciseCategory }) => {
      return (
        <View style={styles.categoryContainer}>
          <View
            style={[styles.categoryHeader, { backgroundColor: colors.card }]}
          >
            <View style={styles.categoryHeaderLeft}>
              <Text style={[styles.categoryTitle, { color: colors.text }]}>
                {item.name}
              </Text>
            </View>
            <Text
              style={[styles.categoryCount, { color: colors.textSecondary }]}
            >
              {item.exercises.length} exercises
            </Text>
          </View>

          <View style={styles.categoryListContainer}>
            {item.exercises.map((exercise, index) => (
              <TouchableOpacity
                key={`${item.name}-${index}`}
                style={[
                  styles.listExerciseItem,
                  { backgroundColor: colors.background },
                ]}
                onPress={() => handleExerciseSelect(exercise)}
                activeOpacity={0.7}
              >
                <Text style={[styles.listExerciseText, { color: colors.text }]}>
                  {exercise}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    },
    [colors, handleExerciseSelect]
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <StatusBar
          barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor={colors.background}
        />

        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Select Exercise
          </Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={[styles.closeButtonText, { color: colors.text }]}>
              ✕
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <View
            style={[
              styles.searchInputContainer,
              { backgroundColor: colors.card },
            ]}
          >
            <Text style={[styles.searchIcon, { color: colors.textSecondary }]}>
              🔍
            </Text>
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search exercises..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={true}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}
              >
                <Text
                  style={[
                    styles.clearButtonText,
                    { color: colors.textSecondary },
                  ]}
                >
                  ✕
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Exercise List */}
        <KeyboardAvoidingView
          style={styles.listContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {filteredCategories.length === 0 ? (
            <View style={styles.emptyState}>
              <Text
                style={[styles.emptyStateText, { color: colors.textSecondary }]}
              >
                No exercises found
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredCategories}
              keyExtractor={(item) => item.name}
              renderItem={renderCategory}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },

  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: '500',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
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
    minHeight: 20,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  categoryContainer: {
    marginBottom: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  categoryCount: {
    fontSize: 14,
  },
  categoryListContainer: {
    gap: 4,
    paddingHorizontal: 4,
  },
  listExerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },

  listExerciseText: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
