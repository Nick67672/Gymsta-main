import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { Check, Image as ImageIcon, ChevronLeft } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { ThemedInput } from '@/components/ThemedInput';
import { ThemedButton } from '@/components/ThemedButton';
import { showImagePickerOptions } from '@/lib/imagePickerUtils';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export default function WorkoutSummaryScreen() {
  const { theme } = useTheme();
  const colors = Colors[theme];

  const [myGymChecked, setMyGymChecked] = useState(false);
  const [justForMeChecked, setJustForMeChecked] = useState(false);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [privateNotes, setPrivateNotes] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // Track saving state & grab params / auth
  const [saving, setSaving] = useState(false);
  const { workoutId } = useLocalSearchParams<{ workoutId?: string }>();
  const { currentUserId } = useAuth();

  const handlePickPhoto = async () => {
    const uri = await showImagePickerOptions();
    if (uri) {
      setPhotoUri(uri);
    }
  };

  const handleDone = async () => {
    if (saving) return;

    if (!workoutId) {
      Alert.alert('Error', 'Missing workout reference.');
      return;
    }

    setSaving(true);

    try {
      let photoUrl: string | null = null;

      // Upload progress photo if one was picked
      if (photoUri) {
        const fileExt = photoUri.split('.').pop() || 'jpg';
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${currentUserId}/${fileName}`;

        // Allow bucket name to be configured via env
        const WORKOUT_IMAGES_BUCKET = process.env.EXPO_PUBLIC_WORKOUT_IMAGES_BUCKET ?? 'workout_images';
        
        let uploadError;
        
        if (Platform.OS === 'web') {
          // Web upload using fetch + blob
          const response = await fetch(photoUri);
          const blob = await response.blob();
          
          ({ error: uploadError } = await supabase.storage
            .from(WORKOUT_IMAGES_BUCKET)
            .upload(filePath, blob, { 
              contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
              cacheControl: '3600',
              upsert: false
            }));
        } else {
          // Mobile upload using FormData
          const formData = new FormData();
          formData.append('file', {
            uri: photoUri,
            name: fileName,
            type: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
          } as any);

          ({ error: uploadError } = await supabase.storage
            .from(WORKOUT_IMAGES_BUCKET)
            .upload(filePath, formData, {
              contentType: 'multipart/form-data',
              cacheControl: '3600',
              upsert: false
            }));
        }

        if (uploadError) {
          console.error('Photo upload error:', uploadError);
          Alert.alert('Upload Error', 'Failed to upload photo. Please try again.');
          return; // Don't save anything if upload fails
        } else {
          // Verify the file exists before getting URL
          const { data: fileData, error: downloadError } = await supabase.storage
            .from(WORKOUT_IMAGES_BUCKET)
            .download(filePath);
            
          if (downloadError) {
            console.error('File verification failed:', downloadError);
            Alert.alert('Upload Error', 'Photo upload verification failed. Please try again.');
            return;
          }
          
          const { data: publicData } = supabase.storage
            .from(WORKOUT_IMAGES_BUCKET)
            .getPublicUrl(filePath);
          console.log('Public URL data', publicData);
          photoUrl = publicData?.publicUrl ?? null;
          console.log('Verified photo URL:', photoUrl);
        }
      }

      // Insert summary record linked to this workout
      const { error } = await supabase.from('workout_sharing_information').insert({
        workout_id: workoutId,
        user_id: currentUserId,
        title,
        caption,
        private_notes: privateNotes,
        photo_url: photoUrl,
        is_my_gym: myGymChecked,
        is_just_for_me: justForMeChecked,
      });

      if (error) {
        console.error('Insert error:', error);
        throw error;
      }

      // Navigate back to tracker
      router.push('/fitness/workout-tracker');
    } catch (err) {
      console.error('Failed to save workout share info:', err);
      Alert.alert('Error', 'Failed to save summary, please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/fitness/workout-tracker')}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Workout Summary</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Checkboxes */}
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => {
            setMyGymChecked(true);
            setJustForMeChecked(false);
          }}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.checkbox,
              { borderColor: colors.tint },
              myGymChecked && { backgroundColor: colors.tint },
            ]}
          >
            {myGymChecked && <Check size={16} color="#fff" />}
          </View>
          <Text style={[styles.checkboxLabel, { color: colors.text }]}>My Gym</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => {
            setJustForMeChecked(true);
            setMyGymChecked(false);
          }}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.checkbox,
              { borderColor: colors.tint },
              justForMeChecked && { backgroundColor: colors.tint },
            ]}
          >
            {justForMeChecked && <Check size={16} color="#fff" />}
          </View>
          <Text style={[styles.checkboxLabel, { color: colors.text }]}>Just For Me</Text>
        </TouchableOpacity>

        {/* Inputs */}
        <ThemedInput
          label="Title"
          value={title}
          onChangeText={setTitle}
          placeholder="Enter a title"
        />
        <ThemedInput
          label="Caption"
          value={caption}
          onChangeText={setCaption}
          placeholder="Add a caption"
          multiline
          style={{ minHeight: 100, textAlignVertical: 'top' }}
        />
        <ThemedInput
          label="Private Notes"
          value={privateNotes}
          onChangeText={setPrivateNotes}
          placeholder="Add private notes"
          multiline
          style={{ minHeight: 100, textAlignVertical: 'top' }}
        />

        {/* Progress Photo */}
        <Text style={[styles.sectionLabel, { color: colors.text }]}>Progress Photo</Text>
        <TouchableOpacity
          style={[styles.photoPicker, { backgroundColor: colors.inputBackground }]}
          onPress={handlePickPhoto}
          activeOpacity={0.8}
        >
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <ImageIcon size={32} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary, marginTop: 8 }}>Select Photo</Text>
            </View>
          )}
        </TouchableOpacity>

        <ThemedButton title="Done" onPress={handleDone} style={{ marginTop: 24 }} />
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
    paddingTop: 60,
    paddingHorizontal: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 10,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxLabel: {
    fontSize: 16,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  photoPicker: {
    height: 200,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 24,
  },
  photoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  photo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
}); 