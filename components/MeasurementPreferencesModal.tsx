import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Check } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useUnits } from '@/context/UnitContext';
import Colors from '@/constants/Colors';
import { BorderRadius, Shadows, Spacing } from '@/constants/Spacing';

interface MeasurementPreferencesModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function MeasurementPreferencesModal({ 
  visible, 
  onClose 
}: MeasurementPreferencesModalProps) {
  const { theme } = useTheme();
  const { updateUnits } = useUnits();
  const colors = Colors[theme];
  
  const [selectedSystem, setSelectedSystem] = useState<'imperial' | 'metric'>('imperial');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateUnits({
        measurement_system: selectedSystem,
        weight_unit: selectedSystem === 'imperial' ? 'lbs' : 'kg',
        distance_unit: selectedSystem === 'imperial' ? 'miles' : 'km',
        height_unit: selectedSystem === 'imperial' ? 'ft' : 'cm',
        temperature_unit: selectedSystem === 'imperial' ? 'f' : 'c',
      });
      // Close the modal after successful save
      onClose();
    } catch (error) {
      console.error('Error saving measurement preferences:', error);
      Alert.alert('Error', 'Failed to save your preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            Choose Your Measurement System
          </Text>
          
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            This helps us display weights, distances, and other measurements in your preferred format.
          </Text>

          <TouchableOpacity
            style={[
              styles.optionCard,
              { 
                backgroundColor: colors.card,
                borderColor: selectedSystem === 'imperial' ? colors.tint : colors.border
              }
            ]}
            onPress={() => setSelectedSystem('imperial')}
          >
            <View style={styles.optionContent}>
              <View style={styles.optionHeader}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>
                  Imperial (US)
                </Text>
                {selectedSystem === 'imperial' && (
                  <Check size={20} color={colors.tint} />
                )}
              </View>
              <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                Pounds (lbs), Miles, Feet, Fahrenheit
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionCard,
              { 
                backgroundColor: colors.card,
                borderColor: selectedSystem === 'metric' ? colors.tint : colors.border
              }
            ]}
            onPress={() => setSelectedSystem('metric')}
          >
            <View style={styles.optionContent}>
              <View style={styles.optionHeader}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>
                  Metric
                </Text>
                {selectedSystem === 'metric' && (
                  <Check size={20} color={colors.tint} />
                )}
              </View>
              <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                Kilograms (kg), Kilometers, Centimeters, Celsius
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.saveButton,
                { 
                  backgroundColor: colors.tint,
                  opacity: loading ? 0.5 : 1
                }
              ]}
              onPress={handleSave}
              disabled={loading}
            >
              <Text style={[styles.saveButtonText, { color: '#fff' }]}>
                {loading ? 'Saving...' : 'Save Preferences'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    ...Shadows.light,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  optionCard: {
    borderWidth: 2,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  optionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  buttonContainer: {
    marginTop: Spacing.xl,
  },
  saveButton: {
    height: 50,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
