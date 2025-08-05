import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, TextInput } from 'react-native';
import { Edit3, Trash2, Plus, X, Save, Play } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/Colors';
import { WorkoutTemplate, TemplateExercise } from '@/types/workout';
import { ThemedInput } from './ThemedInput';
import { ThemedButton } from './ThemedButton';

interface WorkoutTemplateManagerProps {
  visible: boolean;
  onClose: () => void;
  onSelectTemplate: (template: WorkoutTemplate) => void;
  currentWorkout?: any; // For saving current workout as template
}

export default function WorkoutTemplateManager({
  visible,
  onClose,
  onSelectTemplate,
  currentWorkout
}: WorkoutTemplateManagerProps) {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { user } = useAuth();

  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateTags, setTemplateTags] = useState('');

  useEffect(() => {
    if (visible) {
      loadTemplates();
    }
  }, [visible]);

  const loadTemplates = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('workout_templates')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      Alert.alert('Error', 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const saveAsTemplate = async () => {
    if (!currentWorkout || !templateName.trim() || !user) return;

    setLoading(true);
    try {
      // Convert current workout exercises to template format
      const templateExercises: TemplateExercise[] = currentWorkout.exercises.map((exercise: any) => ({
        name: exercise.name,
        sets: exercise.targetSets || exercise.sets.length,
        reps: exercise.targetReps || 0,
        weight: exercise.targetWeight || 0,
        notes: exercise.notes || ''
      }));

      const tags = templateTags.trim() ? templateTags.split(',').map(tag => tag.trim()) : [];

      const { error } = await supabase
        .from('workout_templates')
        .insert({
          user_id: user.id,
          name: templateName.trim(),
          exercises: templateExercises,
          tags: tags
        });

      if (error) throw error;

      setTemplateName('');
      setTemplateTags('');
      setShowSaveModal(false);
      loadTemplates();
      Alert.alert('Success', 'Template saved successfully!');
    } catch (error) {
      console.error('Error saving template:', error);
      Alert.alert('Error', 'Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  const updateTemplate = async () => {
    if (!editingTemplate || !templateName.trim() || !user) return;

    setLoading(true);
    try {
      const tags = templateTags.trim() ? templateTags.split(',').map(tag => tag.trim()) : [];

      const { error } = await supabase
        .from('workout_templates')
        .update({
          name: templateName.trim(),
          tags: tags
        })
        .eq('id', editingTemplate.id)
        .eq('user_id', user.id);

      if (error) throw error;

      setEditingTemplate(null);
      setTemplateName('');
      setTemplateTags('');
      setShowEditModal(false);
      loadTemplates();
      Alert.alert('Success', 'Template updated successfully!');
    } catch (error) {
      console.error('Error updating template:', error);
      Alert.alert('Error', 'Failed to update template');
    } finally {
      setLoading(false);
    }
  };

  const deleteTemplate = async (template: WorkoutTemplate) => {
    Alert.alert(
      'Delete Template',
      `Are you sure you want to delete "${template.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            
            try {
              const { error } = await supabase
                .from('workout_templates')
                .delete()
                .eq('id', template.id)
                .eq('user_id', user.id);

              if (error) throw error;
              loadTemplates();
              Alert.alert('Success', 'Template deleted successfully!');
            } catch (error) {
              console.error('Error deleting template:', error);
              Alert.alert('Error', 'Failed to delete template');
            }
          }
        }
      ]
    );
  };

  const editTemplate = (template: WorkoutTemplate) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setTemplateTags(template.tags?.join(', ') || '');
    setShowEditModal(true);
  };

  const formatExerciseCount = (exercises: TemplateExercise[]) => {
    return `${exercises.length} exercise${exercises.length !== 1 ? 's' : ''}`;
  };

  const formatTags = (tags?: string[]) => {
    if (!tags || tags.length === 0) return '';
    return tags.join(', ');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Workout Templates</Text>
          <TouchableOpacity 
            onPress={() => setShowSaveModal(true)}
            style={[styles.saveButton, { backgroundColor: colors.tint }]}
          >
            <Plus size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {templates.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No templates yet
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Save your favorite workouts as templates to reuse them later
              </Text>
              {currentWorkout && (
                <ThemedButton
                  title="Save Current Workout as Template"
                  onPress={() => setShowSaveModal(true)}
                  style={{ marginTop: 20 }}
                />
              )}
            </View>
          ) : (
            <View style={styles.templateList}>
              {templates.map((template) => (
                <View key={template.id} style={[styles.templateCard, { backgroundColor: colors.card }]}>
                  <View style={styles.templateHeader}>
                    <View style={styles.templateInfo}>
                      <Text style={[styles.templateName, { color: colors.text }]}>
                        {template.name}
                      </Text>
                      <Text style={[styles.templateDetails, { color: colors.textSecondary }]}>
                        {formatExerciseCount(template.exercises)}
                      </Text>
                      {template.tags && template.tags.length > 0 && (
                        <Text style={[styles.templateTags, { color: colors.tint }]}>
                          {formatTags(template.tags)}
                        </Text>
                      )}
                    </View>
                    <View style={styles.templateActions}>
                      <TouchableOpacity
                        onPress={() => editTemplate(template)}
                        style={[styles.actionButton, { backgroundColor: colors.tint + '20' }]}
                      >
                        <Edit3 size={16} color={colors.tint} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => deleteTemplate(template)}
                        style={[styles.actionButton, { backgroundColor: colors.error + '20' }]}
                      >
                        <Trash2 size={16} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.useTemplateButton, { backgroundColor: colors.tint }]}
                    onPress={() => {
                      onSelectTemplate(template);
                      onClose();
                    }}
                  >
                    <Play size={16} color="#fff" />
                    <Text style={styles.useTemplateButtonText}>Use Template</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Save Template Modal */}
        <Modal
          visible={showSaveModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowSaveModal(false)}
        >
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setShowSaveModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Save as Template</Text>
              <TouchableOpacity
                onPress={saveAsTemplate}
                disabled={loading || !templateName.trim()}
                style={[
                  styles.saveModalButton,
                  { backgroundColor: templateName.trim() ? colors.tint : colors.border }
                ]}
              >
                <Save size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              <ThemedInput
                label="Template Name"
                value={templateName}
                onChangeText={setTemplateName}
                placeholder="Enter template name"
              />
              <ThemedInput
                label="Tags (optional)"
                value={templateTags}
                onChangeText={setTemplateTags}
                placeholder="Enter tags separated by commas"
              />
            </View>
          </View>
        </Modal>

        {/* Edit Template Modal */}
        <Modal
          visible={showEditModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowEditModal(false)}
        >
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Template</Text>
              <TouchableOpacity
                onPress={updateTemplate}
                disabled={loading || !templateName.trim()}
                style={[
                  styles.saveModalButton,
                  { backgroundColor: templateName.trim() ? colors.tint : colors.border }
                ]}
              >
                <Save size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              <ThemedInput
                label="Template Name"
                value={templateName}
                onChangeText={setTemplateName}
                placeholder="Enter template name"
              />
              <ThemedInput
                label="Tags (optional)"
                value={templateTags}
                onChangeText={setTemplateTags}
                placeholder="Enter tags separated by commas"
              />
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  saveButton: {
    padding: 10,
    borderRadius: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  templateList: {
    gap: 16,
  },
  templateCard: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  templateDetails: {
    fontSize: 14,
    marginBottom: 4,
  },
  templateTags: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  templateActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
  },
  useTemplateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  useTemplateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  saveModalButton: {
    padding: 10,
    borderRadius: 8,
  },
  modalContent: {
    padding: 20,
    gap: 16,
  },
}); 