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

export const ExercisePicker: React.FC<ExercisePickerProps> = ({
  visible,
  onClose,
  onSelectExercise,
}) => {
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredExercises, setFilteredExercises] = useState<string[]>([]);

  // Filter exercises based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredExercises([]);
      return;
    }

    const filtered = EXERCISE_OPTIONS.filter(exercise =>
      exercise.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredExercises(filtered);
  }, [searchQuery]);

  const handleExerciseSelect = (exercise: string) => {
    onSelectExercise(exercise);
    setSearchQuery('');
    setFilteredExercises([]);
    onClose();
  };

  const handleClose = () => {
    setSearchQuery('');
    setFilteredExercises([]);
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
          {searchQuery.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                Start typing to search for exercises
              </Text>
            </View>
          ) : filteredExercises.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                No exercises found
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredExercises}
              keyExtractor={(item) => item}
              renderItem={renderExerciseItem}
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
  exerciseItem: {
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
  exerciseText: {
    fontSize: 16,
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