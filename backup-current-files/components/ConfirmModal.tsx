import React from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { ThemedButton } from './ThemedButton';
import { ThemedView } from './ThemedView';
import { ThemedH2, ThemedText } from './ThemedText';
import { Spacing, BorderRadius } from '@/constants/Spacing';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmButtonTitle?: string;
  confirmButtonVariant?: 'primary' | 'secondary' | 'ghost';
  isDestructive?: boolean;
}

export function ConfirmModal({
  visible,
  title,
  message,
  onCancel,
  onConfirm,
  confirmButtonTitle = 'Confirm',
  isDestructive = false,
}: ConfirmModalProps) {
  const { theme } = useTheme();
  const colors = Colors[theme];

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onCancel}
    >
      <View style={[styles.centeredView, { backgroundColor: colors.modalBackground }]}>
        <ThemedView style={styles.modalView}>
          <ThemedH2 style={styles.modalTitle}>{title}</ThemedH2>
          <ThemedText style={styles.modalText}>{message}</ThemedText>

          <View style={styles.buttonContainer}>
            <ThemedButton
              title="Cancel"
              onPress={onCancel}
              variant="secondary"
              style={styles.button}
            />
            <ThemedButton
              title={confirmButtonTitle}
              onPress={onConfirm}
              variant={isDestructive ? 'destructive' : 'primary'}
              style={styles.button}
            />
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalView: {
    margin: Spacing.xl,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '85%',
  },
  modalTitle: {
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  modalText: {
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    flex: 1,
    marginHorizontal: Spacing.sm,
  },
}); 