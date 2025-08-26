import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { goBack } from '@/lib/goBack';

export default function ChangePasswordScreen() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChangePassword = async () => {
    setError(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill out all fields');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        throw new Error('No authenticated user');
      }

      // Re-authenticate to verify the current password
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (reauthError) {
        throw new Error('Current password is incorrect');
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      Alert.alert('Success', 'Your password has been updated.');
      goBack();
    } catch (e: any) {
      setError(e?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <View style={[styles.header, { borderBottomColor: colors.border }]}> 
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Change Password</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {error ? (
          <Text style={[styles.errorText, { color: colors.tint }]}>{error}</Text>
        ) : null}

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Current Password</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.inputBackground, color: colors.text }]}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            autoCapitalize="none"
            placeholder="Enter current password"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>New Password</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.inputBackground, color: colors.text }]}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoCapitalize="none"
            placeholder="Enter new password"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Confirm New Password</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.inputBackground, color: colors.text }]}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
            placeholder="Re-enter new password"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.button }, loading && styles.buttonDisabled]}
          onPress={handleChangePassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Update Password</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 30,
    paddingHorizontal: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 10,
    marginRight: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
    gap: 16,
  },
  inputGroup: {
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  button: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 14,
    marginBottom: 4,
  },
});


