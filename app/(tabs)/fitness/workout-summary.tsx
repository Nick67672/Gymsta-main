import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, Platform, useWindowDimensions, Modal, TextInput } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { goBack } from '@/lib/goBack';
import { Image as ImageIcon, ChevronLeft, Camera, Eye, Dumbbell } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { showImagePickerOptions } from '@/lib/imagePickerUtils';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import WorkoutSwipeDisplay from '@/components/WorkoutSwipeDisplay';
import { BorderRadius, Shadows, Spacing } from '@/constants/Spacing';

export default function WorkoutSummaryScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const { theme } = useTheme();
  const colors = Colors[theme];
  const insets = useSafeAreaInsets();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [showSwipeDisplay, setShowSwipeDisplay] = useState(false);
  const [workoutData, setWorkoutData] = useState<any>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [shareToFeed, setShareToFeed] = useState<boolean>(false);
  const [justForMe, setJustForMe] = useState<boolean>(true);
  const [hasSavedShareInfo, setHasSavedShareInfo] = useState<boolean>(false);
  const [titleText, setTitleText] = useState<string>('');
  const [captionText, setCaptionText] = useState<string>('');

  // Track saving state & grab params / auth
  const [saving, setSaving] = useState(false);
  const { workoutId } = useLocalSearchParams<{ workoutId?: string }>();
  const { currentUserId } = useAuth();

  // Load workout data
  useEffect(() => {
    if (workoutId && currentUserId) {
      loadWorkoutData();
    }
  }, [workoutId, currentUserId]);

  const loadWorkoutData = async () => {
    try {
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('id', workoutId)
        .single();

      if (error) throw error;
      setWorkoutData(data);
    } catch (error) {
      console.error('Error loading workout data:', error);
      Alert.alert('Error', 'Failed to load workout data');
    }
  };

  const handlePickPhoto = async () => {
    try {
      const uri = await showImagePickerOptions();
      if (uri) {
        setPhotoUri(uri);
        // Upload photo and get URL
        await uploadPhoto(uri);
      }
    } catch (error) {
      console.error('Error picking photo:', error);
      Alert.alert('Error', 'Failed to pick photo');
    }
  };

  const uploadPhoto = async (uri: string) => {
    if (!currentUserId) return;

    try {
      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${currentUserId}/${fileName}`;
      const WORKOUT_IMAGES_BUCKET = process.env.EXPO_PUBLIC_WORKOUT_IMAGES_BUCKET ?? 'workout_images';

      // Use Blob upload for both web and native (FormData is not supported by Supabase storage upload)
      const response = await fetch(uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from(WORKOUT_IMAGES_BUCKET)
        .upload(filePath, blob, {
          contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicData } = supabase.storage
        .from(WORKOUT_IMAGES_BUCKET)
        .getPublicUrl(filePath);

      setPhotoUrl(publicData?.publicUrl ?? null);
    } catch (error) {
      console.error('Error uploading photo:', error);
      Alert.alert('Error', 'Failed to upload photo');
    }
  };

  const handleShowWorkoutDisplay = () => {
    if (!workoutData) {
      Alert.alert('Error', 'No workout data available');
      return;
    }
    setShowSwipeDisplay(true);
  };

  const handleCloseWorkoutDisplay = () => {
    setShowSwipeDisplay(false);
    // Navigate back to workout tracker
    router.push('/fitness/workout-tracker');
  };

  const handleDone = async () => {
    if (saving) return;

    if (!workoutId) {
      Alert.alert('Error', 'Missing workout reference.');
      return;
    }

    setSaving(true);

    try {
      // Enforce rule: If sharing to feed, photo is required
      if (shareToFeed && !photoUrl) {
        Alert.alert('Photo required', 'Please add a workout photo to share to the feed.');
        return;
      }

      // Save sharing preferences once
      if (!hasSavedShareInfo && currentUserId) {
        const dateStr = new Date().toISOString().split('T')[0];
        const defaultTitle = titleText.trim() || 'Workout Summary';
        const defaultCaption = (captionText.trim().length > 0)
          ? captionText.trim()
          : `Crushed a workout on ${dateStr} 💪`;

        const { error } = await supabase
          .from('workout_sharing_information')
          .insert({
            workout_id: workoutId,
            user_id: currentUserId,
            title: defaultTitle,
            caption: defaultCaption,
            private_notes: null,
            photo_url: photoUrl,
            is_my_gym: !!shareToFeed,
            is_just_for_me: !!justForMe,
          });

        if (error) {
          console.error('Failed to save workout sharing info:', error);
          Alert.alert('Error', 'Failed to save workout sharing preferences.');
          return;
        }

        setHasSavedShareInfo(true);
      }

      // Show the workout display
      handleShowWorkoutDisplay();
    } catch (err) {
      console.error('Failed to show workout display:', err);
      Alert.alert('Error', 'Failed to show workout display, please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.card }]}
          onPress={goBack}
        >
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={[styles.title, { color: colors.text }]}>Workout Summary</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Review your completed workout
          </Text>
        </View>
        
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Workout Info */}
        <View style={styles.workoutInfoSection}>
          <View style={styles.stepHeader}>
            <Dumbbell size={24} color={colors.tint} />
            <Text style={[styles.stepTitle, { color: colors.text }]}>
              Workout Complete! 💪
            </Text>
          </View>
          
          <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
            Great job! Add a photo to remember this workout or view your stats
          </Text>
        </View>

        {/* Photo Selection */}
        <View style={styles.photoSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Add a Workout Photo (Optional)
          </Text>
          
          <View style={styles.photoOptions}>
            <TouchableOpacity
              style={[styles.photoOption, { backgroundColor: colors.card }]}
              onPress={handlePickPhoto}
              activeOpacity={0.8}
            >
              <ImageIcon size={32} color={colors.tint} />
              <Text style={[styles.photoOptionText, { color: colors.text }]}>
                Choose from Gallery
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.photoOption, { backgroundColor: colors.card }]}
              onPress={handlePickPhoto}
              activeOpacity={0.8}
            >
              <Camera size={32} color={colors.tint} />
              <Text style={[styles.photoOptionText, { color: colors.text }]}>
                Take Photo
              </Text>
            </TouchableOpacity>
          </View>

          {/* Photo Preview */}
          {photoUri && (
            <View style={[styles.photoPreview, { backgroundColor: colors.card }]}>
              <Image 
                source={{ uri: photoUri }} 
                style={styles.previewImage}
                resizeMode="cover"
              />
            </View>
          )}
        </View>

        {/* Visibility Options */}
        <View style={styles.visibilitySection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Visibility</Text>
          <View style={styles.visibilityOptions}>
            <TouchableOpacity
              style={[
                styles.toggleOption,
                shareToFeed && { borderColor: colors.tint, backgroundColor: colors.tint + '15' },
                { borderColor: colors.border },
              ]}
              onPress={() => {
                setShareToFeed(true);
                setJustForMe(false);
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleOptionText, { color: colors.text }]}>Share to Feed</Text>
              <Text style={[styles.toggleHint, { color: colors.textSecondary }]}>Photo required</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.toggleOption,
                justForMe && { borderColor: colors.tint, backgroundColor: colors.tint + '15' },
                { borderColor: colors.border },
              ]}
              onPress={() => {
                setShareToFeed(false);
                setJustForMe(true);
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleOptionText, { color: colors.text }]}>Just for Me</Text>
              <Text style={[styles.toggleHint, { color: colors.textSecondary }]}>No photo required</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Details */}
        <View style={styles.detailsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Details</Text>
          <Text style={[styles.stepDescription, { color: colors.textSecondary, marginBottom: Spacing.md }]}>Add a title and caption for your workout. Captions help your friends understand your session.</Text>

          <Text style={[styles.inputLabel, { color: colors.text }]}>Title (optional)</Text>
          <TextInput
            value={titleText}
            onChangeText={setTitleText}
            placeholder="e.g., Push Day PRs"
            placeholderTextColor={colors.textSecondary}
            style={[styles.textInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
            maxLength={80}
          />

          <Text style={[styles.inputLabel, { color: colors.text }]}>Caption {shareToFeed ? '(required)' : '(optional)'}</Text>
          <TextInput
            value={captionText}
            onChangeText={setCaptionText}
            placeholder="How did it go? Highlights, lifts, or how you felt."
            placeholderTextColor={colors.textSecondary}
            style={[styles.textArea, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
            multiline
            numberOfLines={4}
            maxLength={300}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.tint }]}
            onPress={handleDone}
            disabled={saving}
          >
            <Eye size={18} color="#fff" />
            <Text style={styles.primaryButtonText}>
              {saving ? 'Loading...' : 'View Workout Summary'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, { backgroundColor: colors.backgroundSecondary }]}
            onPress={() => router.push('/fitness/workout-tracker')}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>
              Back to Tracker
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Workout Swipe Display Modal */}
      <Modal
        visible={showSwipeDisplay}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        {workoutData && (
          <WorkoutSwipeDisplay
            workout={workoutData}
            photoUrl={photoUrl}
            onClose={handleCloseWorkoutDisplay}
          />
        )}
      </Modal>
    </SafeAreaView>
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
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.light,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: Spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  headerRight: {
    width: 44,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  workoutInfoSection: {
    marginBottom: Spacing.xl,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  stepDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  photoSection: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: Spacing.md,
  },
  photoOptions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  photoOption: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    ...Shadows.light,
  },
  photoOptionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  photoPreview: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.light,
  },
  previewImage: {
    width: '100%',
    height: 200,
  },
  actionSection: {
    gap: Spacing.md,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    ...Shadows.light,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  visibilitySection: {
    marginBottom: Spacing.xl,
  },
  visibilityOptions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  toggleOption: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  toggleOptionText: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  toggleHint: {
    fontSize: 12,
    fontWeight: '500',
  },
  detailsSection: {
    marginBottom: Spacing.xl,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    minHeight: 100,
  },
}); 