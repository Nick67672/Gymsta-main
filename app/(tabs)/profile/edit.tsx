import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Alert, Platform, ScrollView, TouchableWithoutFeedback, Keyboard, KeyboardAvoidingView } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera, User, MapPin, FileText } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { ThemedInput } from '@/components/ThemedInput';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedView, ThemedCardView, ThemedSurfaceView } from '@/components/ThemedView';
import { ThemedText, ThemedSecondaryText, ThemedH2, ThemedH3 } from '@/components/ThemedText';
import { BorderRadius, Shadows, Spacing } from '@/constants/Spacing';
import { Typography } from '@/constants/Typography';
import { goBack } from '@/lib/goBack';

export default function EditProfileScreen() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [gym, setGym] = useState('');
  const [showGymSuggestions, setShowGymSuggestions] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);
  const [gymInputY, setGymInputY] = useState<number>(0);

  // Filter gyms based on user input
  const filteredGyms = GYM_LIST.filter((g: string) =>
    g.toLowerCase().includes(gym.toLowerCase())
  ).slice(0, 10);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('username, bio, gym, avatar_url')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setUsername(data.username);
        setBio(data.bio || '');
        setGym(data.gym || '');
        setAvatar(data.avatar_url);
      }
    } catch (err) {
      setError('Failed to load profile data');
      console.error('Profile load error:', err);
    } finally {
      setInitialLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        setError('Permission to access gallery was denied. Please enable it in your device settings.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        setAvatar(result.assets[0].uri);
        setError(null);
      }
    } catch (err) {
      setError('Failed to access the gallery. Please try again.');
      console.error('Image picker error:', err);
    }
  };

  const uploadAvatar = async (uri: string, userId: string): Promise<string | null> => {
    try {
      setUploadingAvatar(true);
      const fileName = `${userId}/${Date.now()}.jpg`;
      
      // Handle image upload based on platform
      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, blob, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;
      } else {
        // For native platforms (iOS/Android)
        const formData = new FormData();
        formData.append('file', {
          uri,
          name: fileName,
          type: 'image/jpeg',
        } as any);

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, formData, {
            contentType: 'multipart/form-data',
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (err) {
      console.error('Avatar upload error:', err);
      throw err;
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!username.trim()) {
      setError('Username is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be logged in to update your profile');
        return;
      }

      let avatarUrl = avatar;

      // Upload new avatar if it's a local file (starts with file:// or content://)
      if (avatar && (avatar.startsWith('file://') || avatar.startsWith('content://'))) {
        try {
          avatarUrl = await uploadAvatar(avatar, user.id);
        } catch (err) {
          if (err instanceof Error) {
            if (err.message.includes('Bucket not found')) {
              setError('Avatar storage is not properly configured. Please contact support.');
            } else if (err.message.includes('Permission denied')) {
              setError('You do not have permission to upload avatars.');
            } else if (err.message.includes('Entity too large')) {
              setError('Image file is too large. Please choose a smaller image.');
            } else {
              setError(`Avatar upload failed: ${err.message}`);
            }
          } else {
            setError('Failed to upload avatar. Please try again.');
          }
          return;
        }
      }

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          username: username.trim(),
          bio: bio.trim() || null,
          gym: gym.trim() || null,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) {
        if (updateError.message.includes('duplicate key')) {
          setError('This username is already taken. Please choose another one.');
        } else if (updateError.message.includes('check constraint')) {
          setError('Invalid input. Please check your username and bio.');
        } else {
          setError('Failed to update profile. Please try again.');
        }
        return;
      }

      // Success - navigate back to profile
      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: goBack }
      ]);
    } catch (err) {
      console.error('Profile update error:', err);
      setError('An unexpected error occurred. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
        <ThemedText style={styles.loadingText}>Loading profile...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 120 : 0}
      >
      <ScrollView 
        ref={scrollRef}
        contentContainerStyle={[
          styles.scrollContent,
          showGymSuggestions ? { paddingBottom: Spacing.xl * 4 } : null,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        bounces={true}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => {
          Keyboard.dismiss();
        }}
      >
          {/* Header */}
          <View style={styles.header}>
            <ThemedH2 style={styles.title}>Edit Profile</ThemedH2>
            <ThemedSecondaryText style={styles.subtitle}>
              Update your profile information
            </ThemedSecondaryText>
          </View>

          {/* Error Display */}
          {error && (
            <ThemedSurfaceView style={[styles.errorContainer, { 
              backgroundColor: colors.error + '15',
              borderColor: colors.error + '30'
            }]}>
              <ThemedText style={[styles.errorText, { color: colors.error }]}>{error}</ThemedText>
              <TouchableOpacity 
                style={[styles.dismissButton, { borderColor: colors.error }]} 
                onPress={() => setError(null)}
              >
                <ThemedText style={[styles.dismissText, { color: colors.error }]}>Dismiss</ThemedText>
              </TouchableOpacity>
            </ThemedSurfaceView>
          )}

          {/* Avatar Section */}
          <ThemedCardView style={styles.avatarSection}>
            <ThemedH3 style={styles.sectionTitle}>Profile Picture</ThemedH3>
            <TouchableOpacity 
              style={styles.avatarContainer} 
              onPress={pickImage}
              disabled={uploadingAvatar}
              activeOpacity={0.8}
            >
              {uploadingAvatar ? (
                <View style={[styles.avatarPlaceholder, { 
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border 
                }]}>
                  <ActivityIndicator size="large" color={colors.tint} />
                  <ThemedText style={[styles.uploadingText, { color: colors.textSecondary }]}>
                    Uploading...
                  </ThemedText>
                </View>
              ) : avatar ? (
                <View style={styles.avatarWrapper}>
                  <Image source={{ uri: avatar }} style={styles.avatar} />
                  <View style={[styles.avatarOverlay, { backgroundColor: colors.background + '80' }]}>
                    <Camera size={24} color={colors.text} />
                  </View>
                </View>
              ) : (
                <View style={[styles.avatarPlaceholder, { 
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border 
                }]}>
                  <Camera size={32} color={colors.textSecondary} />
                  <ThemedText style={[styles.avatarText, { color: colors.textSecondary }]}>
                    Add Photo
                  </ThemedText>
                </View>
              )}
            </TouchableOpacity>
          </ThemedCardView>

          {/* Profile Information */}
          <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
            <View>
              <ThemedCardView style={styles.formSection}>
                <ThemedH3 style={styles.sectionTitle}>Profile Information</ThemedH3>
                
                <View style={styles.inputGroup}>
                  <View style={styles.inputContainer}>
                    <ThemedText style={styles.inputLabel}>Username</ThemedText>
                    <ThemedInput
                      value={username}
                      onChangeText={setUsername}
                      leftIcon={<User size={20} color={colors.textSecondary} />}
                      variant="filled"
                      size="medium"
                      autoCapitalize="none"
                      autoCorrect={false}
                      error={error && error.includes('username') ? 'Username is required' : undefined}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <ThemedText style={styles.inputLabel}>Bio (Optional)</ThemedText>
                    <ThemedInput
                      value={bio}
                      onChangeText={setBio}
                      leftIcon={<FileText size={20} color={colors.textSecondary} />}
                      variant="filled"
                      size="medium"
                    />
                  </View>

                  <View
                    style={!showGymSuggestions || filteredGyms.length == 0
                      ? styles.gymInputContainer : styles.gymSuggestionAndInputContainer}
                    onLayout={(e) => setGymInputY(e.nativeEvent.layout.y)}
                  >
                    <View style={styles.inputContainer}>
                      <ThemedText style={styles.inputLabel}>Gym (Optional)</ThemedText>
                      <ThemedInput
                        value={gym}
                        onChangeText={(text) => {
                          setGym(text);
                          setShowGymSuggestions(true);
                        }}
                        onFocus={() => {
                          setShowGymSuggestions(true);
                          // Ensure the field and dropdown are visible above the keyboard
                          setTimeout(() => {
                            if (scrollRef.current) {
                              scrollRef.current.scrollTo({ y: Math.max(gymInputY - 120, 0), animated: true });
                            }
                          }, 50);
                        }}
                        leftIcon={<MapPin size={20} color={colors.textSecondary} />}
                        variant="filled"
                        size="medium"
                      />
                    </View>
                    
                    {showGymSuggestions && filteredGyms.length > 0 && (
                      <ThemedSurfaceView style={[styles.suggestionsContainer, {
                        borderColor: colors.border
                      }]}>
                        <ScrollView 
                          style={styles.suggestionsList}
                          keyboardShouldPersistTaps="handled"
                          nestedScrollEnabled
                          showsVerticalScrollIndicator={false}
                        >
                          {filteredGyms.map((suggestion: string, index: number) => (
                            <TouchableOpacity
                              key={index}
                              style={[styles.suggestionItem, { 
                                borderBottomColor: colors.border,
                                borderBottomWidth: index < filteredGyms.length - 1 ? 1 : 0
                              }]}
                              onPress={() => {
                                setGym(suggestion);
                                setShowGymSuggestions(false);
                              }}
                              activeOpacity={0.7}
                            >
                              <MapPin size={16} color={colors.textSecondary} style={styles.suggestionIcon} />
                              <ThemedText style={styles.suggestionText}>
                                {suggestion}
                              </ThemedText>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </ThemedSurfaceView>
                    )}
                  </View>
                </View>
              </ThemedCardView>
            </View>
          </TouchableWithoutFeedback>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
             <ThemedButton
               title="Cancel"
               onPress={goBack}
               variant="secondary"
               size="medium"
               disabled={loading || uploadingAvatar}
               style={styles.cancelButton}
             />

             <ThemedButton
               title="Save Changes"
               onPress={handleSave}
               variant="primary"
               size="medium"
               loading={loading}
               disabled={uploadingAvatar}
               style={styles.saveButton}
             />
           </View>
        </ScrollView>
      </KeyboardAvoidingView>
      </ThemedView>
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
    paddingTop: Spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    opacity: 0.7,
  },
  header: {
    paddingTop: Spacing.xl + 20,
    paddingBottom: Spacing.lg,
    alignItems: 'center',
  },
  title: {
    marginBottom: Spacing.xs,
  },
  subtitle: {
    textAlign: 'center',
  },
  errorContainer: {
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  errorText: {
    textAlign: 'center',
    marginBottom: Spacing.md,
    ...Typography.bodyMedium,
  },
  dismissButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  dismissText: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
  avatarSection: {
    marginBottom: Spacing.lg,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  sectionTitle: {
    marginBottom: Spacing.lg,
    alignSelf: 'flex-start',
    width: '100%',
  },
  avatarContainer: {
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  avatarText: {
    marginTop: Spacing.sm,
    ...Typography.bodySmall,
    fontWeight: '500',
  },
  uploadingText: {
    marginTop: Spacing.sm,
    ...Typography.bodySmall,
  },
  formSection: {
    marginBottom: Spacing.xs,
    padding: Spacing.xl,
  },
  inputGroup: {
    gap: Spacing.lg,
  },
  inputContainer: {
    marginBottom: Spacing.sm,
  },
  inputLabel: {
    marginBottom: Spacing.xs,
    marginLeft: 0,
    ...Typography.bodyMedium,
    fontWeight: '600',
  },

  gymInputContainer: {
    position: 'relative',
    zIndex: 10,
    marginBottom: 0,
  },

  gymSuggestionAndInputContainer : {
    position: 'relative',
    zIndex: 10,
    marginBottom: Spacing.xl * 2, // Add more margin to prevent overlap
  },

  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    maxHeight: 120, // Reduce height to prevent scroll interference
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginTop: Spacing.xs,
    zIndex: 11,
    ...Shadows.medium,
  },
  suggestionsList: {
    flex: 1,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  suggestionIcon: {
    marginRight: Spacing.sm,
  },
  suggestionText: {
    flex: 1,
    ...Typography.bodyMedium,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: 0,
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    maxWidth: 400,
    alignSelf: 'center',
  },
  cancelButton: {
    flex: 1,
    minWidth: 120,
    maxWidth: 140,
  },
  saveButton: {
    flex: 1.2,
    minWidth: 140,
    maxWidth: 160,
  },
});

const GYM_LIST = [
  'Arete'
];