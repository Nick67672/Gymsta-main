import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, ActivityIndicator, Alert, Modal, FlatList } from 'react-native';
import { ArrowLeft, Lock, Trash2, TriangleAlert as AlertTriangle, Users, Scale, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { useBlocking } from '@/context/BlockingContext';
import { goBack } from '@/lib/goBack';

export default function SettingsScreen() {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const { blockedUserIds, unblockUser, refreshBlockedUsers } = useBlocking();
  const [loading, setLoading] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showBlockedUsers, setShowBlockedUsers] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [loadingBlockedUsers, setLoadingBlockedUsers] = useState(false);
  const [measurementSystem, setMeasurementSystem] = useState<'imperial' | 'metric'>('imperial');
  const [savingUnits, setSavingUnits] = useState(false);
  const colors = Colors[theme];

  useEffect(() => {
    loadPrivacySettings();
    loadMeasurementUnits();
  }, []);

  const loadPrivacySettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('is_private')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setIsPrivate(data?.is_private || false);
    } catch (err) {
      console.error('Error loading privacy settings:', err);
    }
  };

  const handlePrivacyToggle = async () => {
    setSavingPrivacy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ is_private: !isPrivate })
        .eq('id', user.id);

      if (error) throw error;
      setIsPrivate(!isPrivate);
    } catch (err) {
      console.error('Error updating privacy settings:', err);
    } finally {
      setSavingPrivacy(false);
    }
  };
  
  const handleSignOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      router.replace('/');
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    setShowDeleteConfirmation(true);
  };

  const confirmDeleteAccount = async () => {
    setDeletingAccount(true);
    setShowDeleteConfirmation(false);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Call the RPC function to delete the account
      const { error } = await supabase.rpc('delete_my_account');
      
      if (error) throw error;

      // Force clear session and redirect to home
      // Use signOut with scope: 'local' to ensure local session is cleared even if server call fails
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch (signOutError) {
        console.warn('Sign out failed after account deletion, but continuing with redirect:', signOutError);
      }
      
      // Force redirect regardless of signOut success
      router.replace('/');
    } catch (err) {
      console.error('Error deleting account:', err);
      Alert.alert('Error', 'Failed to delete account. Please try again later.');
    } finally {
      setDeletingAccount(false);
    }
  };

  const loadMeasurementUnits = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_measurement_preferences')
        .select('measurement_system')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading measurement units:', error);
        return;
      }

      if (data) {
        setMeasurementSystem(data.measurement_system || 'imperial');
      }
    } catch (err) {
      console.error('Error loading measurement units:', err);
    }
  };

  const updateMeasurementSystem = async (system: 'imperial' | 'metric') => {
    setSavingUnits(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Set all units based on the chosen system
      const systemUnits = system === 'imperial' 
        ? {
            measurement_system: 'imperial',
            weight_unit: 'lbs',
            distance_unit: 'miles',
            height_unit: 'ft',
            temperature_unit: 'f'
          }
        : {
            measurement_system: 'metric',
            weight_unit: 'kg',
            distance_unit: 'km',
            height_unit: 'cm',
            temperature_unit: 'c'
          };

      const { error } = await supabase
        .from('user_measurement_preferences')
        .upsert({
          user_id: user.id,
          ...systemUnits,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setMeasurementSystem(system);
    } catch (err) {
      console.error('Error updating measurement system:', err);
      Alert.alert('Error', 'Failed to update measurement system. Please try again.');
    } finally {
      setSavingUnits(false);
    }
  };

  const loadBlockedUsers = async () => {
    setLoadingBlockedUsers(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('blocked_users')
        .select(`
          blocked_id,
          profiles!blocked_users_blocked_id_fkey (
            id,
            username,
            avatar_url
          )
        `)
        .eq('blocker_id', user.id);

      if (error) throw error;

      setBlockedUsers(data || []);
    } catch (err) {
      console.error('Error loading blocked users:', err);
      Alert.alert('Error', 'Failed to load blocked users. Please try again.');
    } finally {
      setLoadingBlockedUsers(false);
    }
  };

  const handleUnblockUser = async (userId: string, username: string) => {
    Alert.alert(
      'Unblock User',
      `Are you sure you want to unblock ${username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          style: 'destructive',
          onPress: async () => {
            try {
              await unblockUser(userId);
              setBlockedUsers(prev => prev.filter(user => user.blocked_id !== userId));
              Alert.alert('Success', `${username} has been unblocked.`);
            } catch (error) {
              console.error('Error unblocking user:', error);
              Alert.alert('Error', 'Failed to unblock user. Please try again.');
            }
          }
        }
      ]
    );
  };

  const openBlockedUsers = () => {
    setShowBlockedUsers(true);
    loadBlockedUsers();
  };
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={goBack}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
      </View>
      
      <ScrollView style={styles.settingsContainer}>
        <View style={[styles.section, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
          <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Dark Mode</Text>
            <Switch
              trackColor={{ false: '#E5E5E5', true: '#a395e9' }}
              thumbColor={isDarkMode ? '#6C5CE7' : '#f4f3f4'}
              ios_backgroundColor="#E5E5E5"
              onValueChange={toggleTheme}
              value={isDarkMode}
            />
          </View>
        </View>

        <View style={[styles.section, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Privacy & Safety</Text>
          <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
            <View style={styles.settingLabelContainer}>
              <Lock size={20} color={colors.text} style={styles.settingIcon} />
              <View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Private Account</Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  Only followers can see your posts
                </Text>
              </View>
            </View>
            {savingPrivacy ? (
              <ActivityIndicator size="small" color={colors.tint} />
            ) : (
              <Switch
                trackColor={{ false: '#E5E5E5', true: '#a395e9' }}
                thumbColor={isPrivate ? '#6C5CE7' : '#f4f3f4'}
                ios_backgroundColor="#E5E5E5"
                onValueChange={handlePrivacyToggle}
                value={isPrivate}
              />
            )}
          </View>
          <TouchableOpacity 
            style={[styles.settingItem, { borderBottomWidth: 0 }]}
            onPress={openBlockedUsers}>
            <View style={styles.settingLabelContainer}>
              <Users size={20} color={colors.text} style={styles.settingIcon} />
              <View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Blocked Users</Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  Manage users you've blocked ({blockedUserIds.length})
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={[styles.section, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Measurement System</Text>
          <View style={[styles.settingItem, { borderBottomWidth: 0 }]}>
            <View style={styles.settingLabelContainer}>
              <Scale size={20} color={colors.text} style={styles.settingIcon} />
              <View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Unit System</Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  {measurementSystem === 'imperial' 
                    ? 'Imperial (lbs, miles, ft, °F)' 
                    : 'Metric (kg, km, cm, °C)'}
                </Text>
              </View>
            </View>
            {savingUnits ? (
              <ActivityIndicator size="small" color={colors.tint} />
            ) : (
              <Switch
                trackColor={{ false: '#E5E5E5', true: '#a395e9' }}
                thumbColor={measurementSystem === 'metric' ? '#6C5CE7' : '#f4f3f4'}
                ios_backgroundColor="#E5E5E5"
                onValueChange={(value) => updateMeasurementSystem(value ? 'metric' : 'imperial')}
                value={measurementSystem === 'metric'}
              />
            )}
          </View>
        </View>
        
        <TouchableOpacity
          style={[styles.signOutButton, { backgroundColor: colors.button }]}
          onPress={handleSignOut}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.signOutText}>Sign Out</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.deleteAccountButton, { backgroundColor: colors.error }]}
          onPress={handleDeleteAccount}
          disabled={deletingAccount}>
          {deletingAccount ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Trash2 size={20} color="#fff" style={styles.deleteIcon} />
              <Text style={styles.deleteAccountText}>Delete Account</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={showDeleteConfirmation}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirmation(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalBackground }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.warningIconContainer}>
              <AlertTriangle size={48} color={colors.error} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Delete Account?</Text>
            <Text style={[styles.modalText, { color: colors.textSecondary }]}>
              This action cannot be undone. All your data, posts, messages, and profile information will be permanently deleted.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => setShowDeleteConfirmation(false)}>
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, { backgroundColor: colors.error }]}
                onPress={confirmDeleteAccount}>
                <Text style={styles.confirmButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Blocked Users Modal */}
      <Modal
        visible={showBlockedUsers}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowBlockedUsers(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalBackground }]}>
          <View style={[styles.blockedUsersModal, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Blocked Users</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowBlockedUsers(false)}>
                <Text style={[styles.closeButtonText, { color: colors.tint }]}>Done</Text>
              </TouchableOpacity>
            </View>
            
            {loadingBlockedUsers ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.tint} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading blocked users...</Text>
              </View>
            ) : blockedUsers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Users size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No blocked users</Text>
                <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                  Users you block will appear here
                </Text>
              </View>
            ) : (
              <FlatList
                data={blockedUsers}
                keyExtractor={(item) => item.blocked_id}
                style={styles.blockedUsersList}
                renderItem={({ item }) => (
                  <View style={[styles.blockedUserItem, { borderBottomColor: colors.border }]}>
                    <View style={styles.userInfo}>
                      <View style={[styles.avatar, { backgroundColor: colors.tint }]}>
                        <Text style={styles.avatarText}>
                          {item.profiles?.username?.charAt(0).toUpperCase() || '?'}
                        </Text>
                      </View>
                      <Text style={[styles.username, { color: colors.text }]}>
                        {item.profiles?.username || 'Unknown User'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.unblockButton, { backgroundColor: colors.tint }]}
                      onPress={() => handleUnblockUser(item.blocked_id, item.profiles?.username || 'Unknown User')}>
                      <Text style={styles.unblockButtonText}>Unblock</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
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
  settingsContainer: {
    flex: 1,
  },
  section: {
    borderBottomWidth: 1,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  settingLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 15,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
  },
  settingDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  signOutButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 30,
    marginHorizontal: 20,
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteAccountButton: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 40,
    marginHorizontal: 20,
  },
  deleteAccountText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteIcon: {
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0px 2px 3.84px rgba(0, 0, 0, 0.25)',
    elevation: 5,
  },
  warningIconContainer: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  confirmButton: {
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Blocked Users Modal Styles
  blockedUsersModal: {
    width: '95%',
    maxHeight: '80%',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0px 2px 3.84px rgba(0, 0, 0, 0.25)',
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  blockedUsersList: {
    maxHeight: 400,
  },
  blockedUserItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  username: {
    fontSize: 16,
    fontWeight: '500',
  },
  unblockButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  unblockButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});