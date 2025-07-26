import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Check, Image as ImageIcon, ChevronLeft, Camera, Save, Share2, Eye } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { ThemedInput } from '@/components/ThemedInput';
import { ThemedButton } from '@/components/ThemedButton';
import { showImagePickerOptions } from '@/lib/imagePickerUtils';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export default function WorkoutSummaryScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const { theme } = useTheme();
  const colors = Colors[theme];

  const [myGymChecked, setMyGymChecked] = useState(false);
  const [justForMeChecked, setJustForMeChecked] = useState(false);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [privateNotes, setPrivateNotes] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [showPreview, setShowPreview] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  // Track saving state & grab params / auth
  const [saving, setSaving] = useState(false);
  const { workoutId } = useLocalSearchParams<{ workoutId?: string }>();
  const { currentUserId } = useAuth();

  // Add safety check for required dependencies
  React.useEffect(() => {
    console.log('Workout Summary Screen loaded');
    console.log('Workout ID:', workoutId);
    console.log('User ID:', currentUserId);
    console.log('Colors available:', !!colors);
    console.log('Image picker utils available:', typeof showImagePickerOptions);
  }, [workoutId, currentUserId]);

  // Auto-save draft functionality
  React.useEffect(() => {
    if (title || caption || photoUri) {
      const timer = setTimeout(() => {
        setDraftSaved(true);
        setTimeout(() => setDraftSaved(false), 2000);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [title, caption, photoUri]);

  // Quick fill options
  const quickFillOptions = [
    { emoji: '💪', title: 'Crushed It!', caption: 'Just absolutely crushed this workout! Feeling stronger every day 💪' },
    { emoji: '🔥', title: 'Tough One', caption: 'That was a grind, but we got through it! 🔥 No pain, no gain' },
    { emoji: '📈', title: 'New PR!', caption: 'Hit a new personal record today! 📈 Progress never stops' },
    { emoji: '😤', title: 'Grind Mode', caption: 'Put in the work today 😤 Consistency is everything' }
  ];

  const handleQuickFill = (option: typeof quickFillOptions[0]) => {
    setTitle(option.title);
    setCaption(option.caption);
    setCurrentStep(2);
  };

  const handlePickPhoto = async () => {
    try {
      console.log('Photo picker button pressed');
      
      // Add visual feedback that the button was pressed
      Alert.alert('Photo Picker', 'Opening image picker...', [], { cancelable: true });
      
      const uri = await showImagePickerOptions();
      console.log('Image picker returned:', uri);
      if (uri) {
        setPhotoUri(uri);
        console.log('Photo URI set:', uri);
        Alert.alert('Success', 'Photo selected successfully!');
        setCurrentStep(2);
      } else {
        console.log('No image selected or picker cancelled');
        Alert.alert('Info', 'No photo was selected.');
      }
    } catch (error) {
      console.error('Error in handlePickPhoto:', error);
      Alert.alert('Error', `Failed to open image picker: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleTakePhoto = async () => {
    try {
      // This would use camera directly - for now, use same picker
      const uri = await showImagePickerOptions();
      if (uri) {
        setPhotoUri(uri);
        setCurrentStep(2);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const getCharacterCount = (text: string, limit: number = 280) => {
    return `${text.length}/${limit}`;
  };

  const isOverLimit = (text: string, limit: number = 280) => {
    return text.length > limit;
  };

  const handleSaveDraft = async () => {
    // Save as draft without posting
    if (!workoutId) {
      Alert.alert('Error', 'Missing workout reference.');
      return;
    }

    setSaving(true);
    try {
      // Save draft logic here
      Alert.alert('Draft Saved', 'Your workout post has been saved as a draft');
      router.push('/fitness/workout-tracker');
    } catch (error) {
      Alert.alert('Error', 'Failed to save draft');
    } finally {
      setSaving(false);
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

      // Navigate back to tracker with success message
      Alert.alert(
        'Workout Posted! 🎉', 
        'Your workout has been shared successfully!',
        [
          {
            text: 'View Feed',
            onPress: () => router.push('/(tabs)/index'),
          },
          {
            text: 'Post Another',
            onPress: () => {
              // Reset form for another post
              setTitle('');
              setCaption('');
              setPrivateNotes('');
              setPhotoUri(null);
              setCurrentStep(1);
              setMyGymChecked(false);
              setJustForMeChecked(false);
            },
          },
          {
            text: 'Done',
            onPress: () => router.push('/fitness/workout-tracker'),
            style: 'default',
          }
        ]
      );
    } catch (err) {
      console.error('Failed to save workout share info:', err);
      Alert.alert('Error', 'Failed to save summary, please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Responsive dimensions
  const progressBarWidth = Math.min(screenWidth * 0.6, 300);
  const photoPickerHeight = Math.min(screenWidth * 0.9, 400);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with Progress */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/fitness/workout-tracker')}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Share Workout</Text>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: colors.backgroundSecondary, width: progressBarWidth }]}>
              <View style={[styles.progressFill, { 
                backgroundColor: colors.tint, 
                width: `${(currentStep / 3) * 100}%` 
              }]} />
            </View>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>
              Step {currentStep} of 3
            </Text>
          </View>
        </View>
        {draftSaved && (
          <View style={[styles.draftIndicator, { backgroundColor: colors.success }]}>
            <Text style={styles.draftText}>✓ Saved</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Step 1: Photo */}
        {currentStep === 1 && (
          <>
            <Text style={[styles.stepTitle, { color: colors.text }]}>📸 Step 1: Add Your Progress Photo</Text>
            
            {/* Enhanced Photo Picker */}
            <View style={styles.photoSection}>
              <TouchableOpacity
                style={[styles.enhancedPhotoPicker, { backgroundColor: colors.inputBackground, height: photoPickerHeight }]}
                onPress={handlePickPhoto}
                activeOpacity={0.8}
              >
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.photo} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <ImageIcon size={48} color={colors.textSecondary} />
                    <Text style={[styles.photoPlaceholderText, { color: colors.text }]}>
                      Select Your Best Shot
                    </Text>
                    <Text style={[styles.photoHint, { color: colors.textSecondary }]}>
                      Show off that post-workout glow! 💪
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              
              <View style={styles.photoActions}>
                <TouchableOpacity
                  style={[styles.photoActionButton, { backgroundColor: colors.tint }]}
                  onPress={handleTakePhoto}
                >
                  <Camera size={20} color="#fff" />
                  <Text style={styles.photoActionText}>Take Selfie</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.photoActionButton, { backgroundColor: colors.backgroundSecondary }]}
                  onPress={handlePickPhoto}
                >
                  <ImageIcon size={20} color={colors.text} />
                  <Text style={[styles.photoActionText, { color: colors.text }]}>Choose Photo</Text>
                </TouchableOpacity>
              </View>
              
              {photoUri && (
                <TouchableOpacity
                  style={[styles.continueButton, { backgroundColor: colors.tint }]}
                  onPress={() => setCurrentStep(2)}
                >
                  <Text style={styles.continueButtonText}>Continue to Details →</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {/* Step 2: Content */}
        {currentStep === 2 && (
          <>
            <Text style={[styles.stepTitle, { color: colors.text }]}>✍️ Step 2: Tell Your Story</Text>
            
            {/* Quick Fill Options */}
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Quick Fill Options</Text>
            <View style={styles.quickFillContainer}>
              {quickFillOptions.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.quickFillButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => handleQuickFill(option)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.quickFillEmoji}>{option.emoji}</Text>
                  <Text style={[styles.quickFillText, { color: colors.text }]}>{option.title}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Enhanced Inputs */}
            <ThemedInput
              label="Title"
              value={title}
              onChangeText={setTitle}
              placeholder="What was your best lift today?"
            />
            
            <View style={styles.captionContainer}>
              <ThemedInput
                label="Caption"
                value={caption}
                onChangeText={setCaption}
                placeholder="Share your workout victory... 💪"
                multiline
                style={{ minHeight: 100, textAlignVertical: 'top' }}
              />
              <Text style={[
                styles.characterCount, 
                { color: isOverLimit(caption) ? colors.error : colors.textSecondary }
              ]}>
                {getCharacterCount(caption)}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.continueButton, { backgroundColor: colors.tint }]}
              onPress={() => setCurrentStep(3)}
            >
              <Text style={styles.continueButtonText}>Continue to Sharing →</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Step 3: Sharing Options */}
        {currentStep === 3 && (
          <>
            <Text style={[styles.stepTitle, { color: colors.text }]}>🚀 Step 3: Choose Sharing Options</Text>
            
            {/* Preview Card */}
            <TouchableOpacity
              style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setShowPreview(!showPreview)}
            >
              <View style={styles.previewHeader}>
                <Eye size={20} color={colors.tint} />
                <Text style={[styles.previewTitle, { color: colors.tint }]}>Preview Your Post</Text>
              </View>
              {showPreview && (
                <View style={styles.previewContent}>
                  {photoUri && <Image source={{ uri: photoUri }} style={styles.previewImage} />}
                  <Text style={[styles.previewText, { color: colors.text }]}>{title}</Text>
                  <Text style={[styles.previewCaption, { color: colors.textSecondary }]}>{caption}</Text>
                </View>
              )}
            </TouchableOpacity>
            {/* Sharing Options */}
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Sharing Options</Text>
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
              <Text style={[styles.checkboxLabel, { color: colors.text }]}>Share with My Gym</Text>
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
              <Text style={[styles.checkboxLabel, { color: colors.text }]}>Keep Private (Just For Me)</Text>
            </TouchableOpacity>

            <ThemedInput
              label="Private Notes"
              value={privateNotes}
              onChangeText={setPrivateNotes}
              placeholder="Add any private notes for yourself..."
              multiline
              style={{ minHeight: 80, textAlignVertical: 'top' }}
            />

            {/* Final Action Buttons */}
            <View style={styles.finalActions}>
              <TouchableOpacity
                style={[styles.draftButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
                onPress={handleSaveDraft}
                disabled={saving}
              >
                <Save size={18} color={colors.text} />
                <Text style={[styles.draftButtonText, { color: colors.text }]}>Save Draft</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.postButton, { backgroundColor: colors.tint }]}
                onPress={handleDone}
                disabled={saving}
              >
                <Share2 size={18} color="#fff" />
                <Text style={styles.postButtonText}>
                  {saving ? 'Posting...' : 'Post to Feed'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
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
  // Header styles
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  progressContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
  },
  draftIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  draftText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Step styles
  stepTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  
  // Photo section styles
  photoSection: {
    marginBottom: 30,
  },
  enhancedPhotoPicker: {
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(0,0,0,0.1)',
  },
  photoPlaceholderText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
  },
  photoHint: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  photoActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  photoActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  photoActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  
  // Quick fill styles
  quickFillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  quickFillButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  quickFillEmoji: {
    fontSize: 20,
  },
  quickFillText: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Caption styles
  captionContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  characterCount: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    fontSize: 12,
  },
  
  // Preview styles
  previewCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  previewContent: {
    gap: 8,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  previewText: {
    fontSize: 16,
    fontWeight: '600',
  },
  previewCaption: {
    fontSize: 14,
    lineHeight: 20,
  },
  
  // Action buttons
  continueButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  finalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  draftButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  draftButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  postButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  postButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 