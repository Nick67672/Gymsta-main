import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { EXERCISE_OPTIONS } from '@/constants/ExerciseOptions';

interface ExercisePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectExercise: (exercise: string) => void;
}

interface ExerciseCategory {
  name: string;
  exercises: string[];
}

export const ExercisePicker: React.FC<ExercisePickerProps> = ({
  visible,
  onClose,
  onSelectExercise,
}) => {
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCategories, setFilteredCategories] = useState<ExerciseCategory[]>([]);


  // Parse exercises into categories based on the structure
  const parseExerciseCategories = (): ExerciseCategory[] => {
    const categories: ExerciseCategory[] = [];
    
    // Define the category structure based on the actual exercise counts
    // These are approximate ranges based on the ExerciseOptions.ts structure
    const categoryRanges = [
      { name: 'CHEST', start: 0, count: 24 },
      { name: 'BACK', start: 24, count: 21 },
      { name: 'SHOULDERS', start: 45, count: 20 },
      { name: 'ARMS', start: 65, count: 20 },
      { name: 'LEGS', start: 85, count: 20 },
      { name: 'CORE', start: 105, count: 20 },
      { name: 'CARDIO', start: 125, count: 20 },
      { name: 'FUNCTIONAL', start: 145, count: 20 },
      { name: 'SPECIALTY', start: 165, count: 31 }
    ];

    categoryRanges.forEach(category => {
      const exercises = EXERCISE_OPTIONS.slice(category.start, category.start + category.count);
      if (exercises.length > 0) {
        categories.push({
          name: category.name,
          exercises: exercises
        });
      }
    });

    return categories;
  };

  const allCategories = parseExerciseCategories();

  // Filter categories and exercises based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCategories(allCategories);
      return;
    }

    const filtered = allCategories.map(category => ({
      name: category.name,
      exercises: category.exercises.filter(exercise =>
        exercise.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })).filter(category => category.exercises.length > 0);

    setFilteredCategories(filtered);
  }, [searchQuery, allCategories]);

  const handleExerciseSelect = (exercise: string) => {
    onSelectExercise(exercise);
    setSearchQuery('');
    setFilteredCategories(allCategories);
    onClose();
  };

  const handleClose = () => {
    setSearchQuery('');
    setFilteredCategories(allCategories);
    onClose();
  };

  const renderExerciseItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[styles.exerciseItem, { backgroundColor: colors.card }]}
      onPress={() => handleExerciseSelect(item)}
      activeOpacity={0.7}
    >
      <Text style={[styles.exerciseText, { color: colors.text }]}>{item}</Text>
    </TouchableOpacity>
  );

  const renderCategory = ({ item }: { item: ExerciseCategory }) => {
    return (
      <View style={styles.categoryContainer}>
        <View style={[styles.categoryHeader, { backgroundColor: colors.card }]}>
          <Text style={[styles.categoryTitle, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.categoryCount, { color: colors.textSecondary }]}>
            {item.exercises.length} exercises
          </Text>
        </View>
        
        <View style={styles.exercisesContainer}>
          {item.exercises.map((exercise, index) => (
            <TouchableOpacity
              key={`${item.name}-${index}`}
              style={[styles.exerciseItem, { backgroundColor: colors.background }]}
              onPress={() => handleExerciseSelect(exercise)}
              activeOpacity={0.7}
            >
              <Text style={[styles.exerciseText, { color: colors.text }]}>{exercise}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar 
          barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor={colors.background}
        />
        
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Select Exercise</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={[styles.closeButtonText, { color: colors.text }]}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchInputContainer, { backgroundColor: colors.card }]}>
            <Text style={[styles.searchIcon, { color: colors.textSecondary }]}>🔍</Text>
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
                <Text style={[styles.clearButtonText, { color: colors.textSecondary }]}>✕</Text>
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
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
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
    marginBottom: 8,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
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
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  categoryCount: {
    fontSize: 14,
    marginRight: 8,
  },

  exercisesContainer: {
    marginTop: 4,
    marginLeft: 16,
  },
  exerciseItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  exerciseText: {
    fontSize: 15,
    fontWeight: '500',
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