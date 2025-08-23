import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, ActivityIndicator, ScrollView, Modal, Alert, Platform, FlatList, SafeAreaView, PanResponder, KeyboardAvoidingView } from 'react-native';
import { Camera, Upload, Search, X, MapPin, AtSign, Save, ArrowLeft } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImageManipulator from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { Typography } from '@/constants/Typography';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText, ThemedH2, ThemedCaptionText } from '@/components/ThemedText';
import { ThemedButton } from '@/components/ThemedButton';
import { useAuth } from '@/context/AuthContext';
import { goBack } from '@/lib/goBack';
import { getAvatarUrl } from '@/lib/avatarUtils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Product {
  id: string;
  name: string;
  image_url: string;
  price: number;
  longitude: number;
}

interface User {
  id: string;
  username: string;
  avatar_url: string;
}

interface Tag {
  user: User;
  position: { x: number; y: number };
}

interface Location {
  name: string;
  latitude: number;
  longitude: number;
}

const DRAFTS_KEY_PREFIX = 'post_drafts_';

interface DraggableTagProps {
  tag: Tag;
  index: number;
  colors: any;
  imageSize: { width: number; height: number };
  onUpdate: (index: number, position: { x: number; y: number }) => void;
  onRemove: (index: number) => void;
}

const DraggableTag: React.FC<DraggableTagProps> = ({
  tag,
  index,
  colors,
  imageSize,
  onUpdate,
  onRemove,
}) => {
  const basePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        basePositionRef.current = {
          x: tag.position.x * (imageSize.width || 1),
          y: tag.position.y * (imageSize.height || 1),
        };
      },
      onPanResponderMove: (_evt, gestureState) => {
        if (!imageSize.width || !imageSize.height) return;
        const nextX = basePositionRef.current.x + gestureState.dx;
        const nextY = basePositionRef.current.y + gestureState.dy;
        const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(v, max));
        const normalizedX = clamp(nextX / imageSize.width, 0, 1);
        const normalizedY = clamp(nextY / imageSize.height, 0, 1);
        onUpdate(index, { x: normalizedX, y: normalizedY });
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (!imageSize.width || !imageSize.height) return;
        const nextX = basePositionRef.current.x + gestureState.dx;
        const nextY = basePositionRef.current.y + gestureState.dy;
        const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(v, max));
        const normalizedX = clamp(nextX / imageSize.width, 0, 1);
        const normalizedY = clamp(nextY / imageSize.height, 0, 1);
        onUpdate(index, { x: normalizedX, y: normalizedY });
      },
    })
  ).current;

  return (
    <View
      style={[
        styles.tagOverlay,
        {
          left: `${tag.position.x * 100}%`,
          top: `${tag.position.y * 100}%`,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={[styles.tagBubble, { backgroundColor: colors.tint }]}> 
        <Text style={styles.tagUsername}>{tag.user.username}</Text>
      </View>
      <TouchableOpacity style={styles.removeTagButton} onPress={() => onRemove(index)}>
        <X size={12} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

export default function UploadScreen() {
  const { imageUri: initialImageUri, draftId: draftIdToLoad } = useLocalSearchParams();
  const [imageUri, setImageUri] = useState(initialImageUri);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  
  // New state for tagging and location
  const [showUserSearchModal, setShowUserSearchModal] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [taggedUsers, setTaggedUsers] = useState<Tag[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [lastSearch, setLastSearch] = useState('');
  const [draftId, setDraftId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isTaggingMode, setIsTaggingMode] = useState(false);
  const [selectedUserForTagging, setSelectedUserForTagging] = useState<User | null>(null);

  const { theme } = useTheme();
  const colors = Colors[theme];
  const { user } = useAuth();
  const [imageSize, setImageSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (userSearchQuery.length > 1 && userSearchQuery !== lastSearch) {
        searchUsers();
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [userSearchQuery]);

  // Load user profile
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', user.id)
          .single();
        
        if (!error && data) {
          setUserProfile(data);
        }
      } catch (err) {
        console.error('Error loading user profile:', err);
      }
    };

    loadUserProfile();
  }, [user]);

  // Load a specific draft if a draftId is passed
  useEffect(() => {
    if (draftIdToLoad) {
      loadDraft(draftIdToLoad as string);
    }
  }, [draftIdToLoad]);

  // Redirect back to tabs if no image URI is provided
  useEffect(() => {
    if (!imageUri) {
      goBack();
    }
  }, [imageUri]);

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('products')
        .select('id, name, image_url, price, longitude')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
      setShowProductModal(true);
    } catch (err) {
      console.error('Error loading products:', err);
      Alert.alert('Error', 'Failed to load products. Please try again.');
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleLinkProduct = (productId: string) => {
    setSelectedProductId(productId);
    setShowProductModal(false);
  };

  const uploadImage = async (uri: string, userId: string): Promise<string> => {
    try {
      setUploading(true);

      // --- Image Compression Step ---
      console.log('Compressing image...');
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1080 } }], // Resize to a standard width
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      console.log('Image compressed:', manipulatedImage.uri);
      // --- End of Compression Step ---

      // Upload image to Supabase Storage
      const fileName = `${userId}/${Date.now()}.jpg`;
      
      if (Platform.OS === 'web') {
        const response = await fetch(manipulatedImage.uri);
        const blob = await response.blob();
        
        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(fileName, blob, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: false,
            // @ts-ignore
            onProgress: (event) => {
              setUploadProgress(event.loaded / event.total);
            },
          });

        if (uploadError) {
          throw uploadError;
        }
      } else {
        // For native platforms, progress tracking is harder with the current setup.
        // We'll simulate it for a better UX, but a real implementation might need
        // a different upload method (e.g., TUS protocol) for accurate progress.
        setUploadProgress(0);
        const formData = new FormData();
        formData.append('file', {
          uri: manipulatedImage.uri,
          name: fileName,
          type: 'image/jpeg',
        } as any);

        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(fileName, formData, {
            contentType: 'multipart/form-data',
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          throw uploadError;
        }
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('posts')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (err) {
      console.error('Image upload error:', err);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = async () => {
    if (!imageUri) {
      setError('No image selected');
      return;
    }

    // Require a non-empty caption before allowing upload
    if (!caption || !caption.trim()) {
      setError('Please add a caption to your post.');
      return;
    }

    setUploading(true);
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be logged in to upload posts');
        return;
      }

      let publicUrl;
      try {
        publicUrl = await uploadImage(imageUri as string, user.id);
      } catch (err) {
        if (err instanceof Error) {
          if (err.message.includes('Bucket not found')) {
            setError('Storage is not properly configured. Please contact support.');
          } else if (err.message.includes('Permission denied')) {
            setError('You do not have permission to upload files.');
          } else if (err.message.includes('Entity too large')) {
            setError('File is too large. Please choose a smaller file.');
          } else {
            setError(`Upload failed: ${err.message}`);
          }
        } else {
          setError('Failed to upload image. Please try again.');
        }
        return;
      }

      // --- New logic to handle tags and location ---
      const captionText = caption.trim();
      let taggedUserIds: string[] = [];

      if (captionText) {
        const mentions = captionText.match(/@(\w+)/g);
        if (mentions) {
          const usernames = mentions.map(m => m.substring(1));
          // In a real app, you'd fetch user IDs from usernames
          // For now, let's assume taggedUsers state holds the correct info
          taggedUserIds = taggedUsers.map(t => t.user.id);
        }
      }
      // --- End of new logic ---

      // Create post in database
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          image_url: publicUrl,
          caption: captionText,
          product_id: selectedProductId,
          location_name: selectedLocation?.name,
          latitude: selectedLocation?.latitude,
          longitude: selectedLocation?.longitude,
        })
        .select()
        .single();

      if (postError) {
        if (postError.message.includes('duplicate key')) {
          setError('You have already created this post.');
        } else if (postError.message.includes('foreign key')) {
          setError('Your profile needs to be set up before posting.');
        } else {
          setError('Failed to create post. Please try again.');
        }
        return;
      }
      
      // --- New logic to insert tags and create notifications ---
      if (taggedUsers.length > 0 && postData) {
        const tagsToInsert = taggedUsers.map(t => ({
          post_id: postData.id,
          user_id: t.user.id,
          position_x: t.position.x,
          position_y: t.position.y,
        }));
        
        const { error: tagsError } = await supabase
          .from('post_tags')
          .insert(tagsToInsert);
          
        if (tagsError) {
          console.error('Error inserting tags:', tagsError);
        }

        const notificationsToInsert = taggedUsers.map(t => ({
          user_id: t.user.id, // The user being notified
          actor_id: user.id, // The user who created the post
          type: 'post_tag',
          post_id: postData.id,
        }));

        const { error: notificationError } = await supabase
          .from('notifications')
          .insert(notificationsToInsert);

        if (notificationError) {
          console.error('Error creating tag notifications:', notificationError);
        }
      }
      // --- End of new logic ---

      // Clear draft and reset form
      await clearDraft();
      setCaption('');
      setSelectedProductId(null);
      setTaggedUsers([]);
      setSelectedLocation(null);
      
      // Show success message and navigate back to main feed
      Alert.alert('Success', 'Your post has been uploaded!');
      // Navigate away from the upload screen after a short delay to allow the user to see the success message
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 500);
    } catch (err) {
      console.error('Post upload error:', err);
      setError('An unexpected error occurred. Please try again later.');
    } finally {
      setUploading(false);
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const searchUsers = async () => {
    setLoadingUsers(true);
    setLastSearch(userSearchQuery);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .ilike('username', `%${userSearchQuery}%`)
        .limit(10);

      if (error) throw error;
      setUserSearchResults(data || []);
    } catch (err) {
      console.error('Error searching users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleTagUser = (user: User) => {
    // Set the user for tagging and enter tagging mode
    setSelectedUserForTagging(user);
    setIsTaggingMode(true);
    
    // Reset and close modal
    setShowUserSearchModal(false);
    setUserSearchQuery('');
    setUserSearchResults([]);
  };

  const handleImageTap = (event: any) => {
    if (!isTaggingMode || !selectedUserForTagging) return;

    const { locationX, locationY } = event.nativeEvent;
    if (imageSize.width <= 0 || imageSize.height <= 0) return;

    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));
    const relativeX = clamp(locationX / imageSize.width, 0, 1);
    const relativeY = clamp(locationY / imageSize.height, 0, 1);

    setTaggedUsers(prev => [
      ...prev,
      {
        user: selectedUserForTagging,
        position: { x: relativeX, y: relativeY },
      },
    ]);

    setIsTaggingMode(false);
    setSelectedUserForTagging(null);
  };

  const updateTagPosition = (index: number, newPosition: { x: number; y: number }) => {
    setTaggedUsers(prev => prev.map((t, i) => (i === index ? { ...t, position: newPosition } : t)));
  };

  const removeTag = (index: number) => {
    setTaggedUsers(prev => prev.filter((_, i) => i !== index));
  };

  const saveDraft = async () => {
    if (!user || !imageUri) return;

    try {
      const DRAFTS_KEY = `${DRAFTS_KEY_PREFIX}${user.id}`;
      const newDraft = {
        id: draftId || new Date().toISOString(), // Use existing ID or create a new one
        imageUri,
        caption,
        selectedProductId,
        taggedUsers,
        selectedLocation,
        createdAt: new Date().toISOString(),
      };

      const existingDraftsString = await AsyncStorage.getItem(DRAFTS_KEY);
      const existingDrafts = existingDraftsString ? JSON.parse(existingDraftsString) : [];

      const draftIndex = existingDrafts.findIndex((d: any) => d.id === newDraft.id);

      if (draftIndex > -1) {
        // Update existing draft
        existingDrafts[draftIndex] = newDraft;
      } else {
        // Add new draft
        existingDrafts.push(newDraft);
      }
      
      await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(existingDrafts));
      Alert.alert('Draft Saved', 'Your post has been saved to your drafts.');
      router.push('/(tabs)/profile');
    } catch (e) {
      console.error('Failed to save draft.', e);
      Alert.alert('Error', 'Could not save draft.');
    }
  };

  const loadDraft = async (id: string) => {
    if (!user) return;
    try {
      const DRAFTS_KEY = `${DRAFTS_KEY_PREFIX}${user.id}`;
      const savedDraftsString = await AsyncStorage.getItem(DRAFTS_KEY);
      if (savedDraftsString) {
        const drafts = JSON.parse(savedDraftsString);
        const draftToLoad = drafts.find((d: any) => d.id === id);
        if (draftToLoad) {
          setDraftId(draftToLoad.id);
          setImageUri(draftToLoad.imageUri);
          setCaption(draftToLoad.caption || '');
          setSelectedProductId(draftToLoad.selectedProductId || null);
          setTaggedUsers(draftToLoad.taggedUsers || []);
          setSelectedLocation(draftToLoad.selectedLocation || null);
        }
      }
    } catch (e) {
      console.error('Failed to load draft.', e);
    }
  };

  const clearDraft = async () => {
    if (!user || !draftId) return;
    try {
      const DRAFTS_KEY = `${DRAFTS_KEY_PREFIX}${user.id}`;
      const savedDraftsString = await AsyncStorage.getItem(DRAFTS_KEY);
      if (savedDraftsString) {
        const drafts = JSON.parse(savedDraftsString);
        const newDrafts = drafts.filter((d: any) => d.id !== draftId);
        await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(newDrafts));
      }
    } catch (e) {
      console.error('Failed to clear draft.', e);
    }
  };

  if (!imageUri) {
    return null;
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={insets.top}
    >
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={goBack}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Create Post</Text>
        <TouchableOpacity 
          style={[styles.postButton, { backgroundColor: colors.tint, opacity: (loading || !caption.trim()) ? 0.6 : 1 }]}
          onPress={handleUpload}
          disabled={loading || !caption.trim()}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.postButtonText}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        keyboardShouldPersistTaps="handled"
      >
        {error && (
          <View style={[styles.errorContainer, { backgroundColor: colors.error + '15' }]}>
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        )}

        {/* Image Preview */}
        <View style={styles.imageContainer}>
          <TouchableOpacity 
            style={styles.imageWrapper}
            onPress={handleImageTap}
            activeOpacity={1}
          >
            <Image
              source={{ uri: imageUri as string }}
              style={styles.previewImage}
              onLayout={(e) => {
                const { width, height } = e.nativeEvent.layout;
                setImageSize({ width, height });
              }}
            />
            
            {/* Display existing tags with drag-to-move */}
            {taggedUsers.map((tag, index) => (
              <DraggableTag
                key={`${tag.user.id}-${index}`}
                tag={tag}
                index={index}
                colors={colors}
                imageSize={imageSize}
                onUpdate={updateTagPosition}
                onRemove={removeTag}
              />
            ))}
            
            {/* Show tagging hint when in tagging mode */}
            {isTaggingMode && selectedUserForTagging && (
              <View style={styles.taggingHint}>
                <Text style={[styles.taggingHintText, { color: colors.text }]}>
                  Tap where you want to tag @{selectedUserForTagging.username}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Caption Input */}
        <View style={styles.captionSection}>
          <View style={styles.userInfo}>
            <Image 
              source={{ uri: getAvatarUrl(user?.user_metadata?.avatar_url, userProfile?.username || user?.user_metadata?.username || 'default') }} 
              style={styles.userAvatar} 
            />
            <Text style={[styles.username, { color: colors.text }]}>
              {userProfile?.username || user?.user_metadata?.username || 'user'}
            </Text>
          </View>
          <TextInput
            style={[styles.captionInput, { 
              color: colors.text,
              backgroundColor: colors.background
            }]}
            placeholder="Write a caption..."
            placeholderTextColor={colors.textSecondary}
            value={caption}
            onChangeText={setCaption}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, { borderBottomColor: colors.border }]}
            onPress={() => {
              if (isTaggingMode) {
                setIsTaggingMode(false);
                setSelectedUserForTagging(null);
              } else {
                setShowUserSearchModal(true);
              }
            }}
          >
            <AtSign size={20} color={colors.text} />
            <Text style={[styles.actionButtonText, { color: colors.text }]}>
              {isTaggingMode ? 'Cancel Tagging' : 'Tag People'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { borderBottomColor: colors.border }]}
            onPress={loadProducts}
          >
            <Search size={20} color={colors.text} />
            <Text style={[styles.actionButtonText, { color: colors.text }]}>Link Product</Text>
          </TouchableOpacity>
        </View>

        {/* Selected Product Display */}
        {selectedProductId && (
          <View style={[styles.selectedProduct, { backgroundColor: colors.card }]}>
            <Image 
              source={{ uri: products.find(p => p.id === selectedProductId)?.image_url }}
              style={styles.productImage}
            />
            <View style={styles.productInfo}>
              <Text style={[styles.productName, { color: colors.text }]}>
                {products.find(p => p.id === selectedProductId)?.name}
              </Text>
              <Text style={[styles.productPrice, { color: colors.tint }]}>
                ${products.find(p => p.id === selectedProductId)?.price.toFixed(2)}
              </Text>
            </View>
            <TouchableOpacity 
              onPress={() => setSelectedProductId(null)} 
              style={styles.removeProductButton}
            >
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Upload Progress */}
        {uploading && (
          <View style={styles.progressContainer}>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>
              Uploading... {Math.round(uploadProgress * 100)}%
            </Text>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View style={[styles.progressFill, { 
                width: `${uploadProgress * 100}%`,
                backgroundColor: colors.tint,
              }]} />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={[styles.bottomBar, { borderTopColor: colors.border }]}>
        <TouchableOpacity 
          style={[styles.draftButton, { borderColor: colors.border }]}
          onPress={saveDraft}
          disabled={loading}
        >
          <Save size={20} color={colors.textSecondary} />
          <Text style={[styles.draftButtonText, { color: colors.textSecondary }]}>Save Draft</Text>
        </TouchableOpacity>
      </View>

      {/* Product Modal */}
      <Modal
        visible={showProductModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProductModal(false)}>
        <View style={[styles.productModalContainer, { backgroundColor: colors.modalBackground }]}>
          <View style={[styles.productModalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.productModalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.productModalTitle, { color: colors.text }]}>Your Products</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowProductModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {products.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.text }]}>No products uploaded yet</Text>
                <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                  Add products in the marketplace tab to link them to your posts
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.productList}>
                <View style={styles.productGrid}>
                  {products.map((product) => (
                    <View key={product.id} style={[styles.productCard, { 
                      backgroundColor: colors.card,
                      borderColor: colors.border
                    }]}>
                      <Image
                        source={{ uri: product.image_url }}
                        style={styles.productImage}
                      />
                      <View style={styles.productInfo}>
                        <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
                          {product.name}
                        </Text>
                        <Text style={[styles.modalProductPrice, { color: colors.tint }]}>
                          ${product.price.toFixed(2)}
                        </Text>
                        <TouchableOpacity 
                          style={[
                            styles.linkProductButton,
                            selectedProductId === product.id && styles.linkedProductButton
                          ]}
                          onPress={() => handleLinkProduct(product.id)}>
                          <Text style={styles.linkProductButtonText}>
                            {selectedProductId === product.id ? 'Linked' : 'Link'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* User Search Modal for Tagging */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showUserSearchModal}
        onRequestClose={() => setShowUserSearchModal(false)}
      >
        <View style={styles.userSearchModalContainer}>
          <View style={[styles.userSearchModalContent, { backgroundColor: colors.background }]}>
            <ThemedH2 style={styles.modalTitle}>Tag a User</ThemedH2>
            <View style={styles.searchContainer}>
              <TextInput
                placeholder="Search for a user..."
                placeholderTextColor={colors.textSecondary}
                style={[styles.searchInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                value={userSearchQuery}
                onChangeText={setUserSearchQuery}
                autoFocus
              />
            </View>

            {loadingUsers ? (
              <ActivityIndicator size="large" color={colors.tint} style={{marginTop: 20}} />
            ) : (
              <FlatList
                data={userSearchResults}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.userItem}
                    onPress={() => handleTagUser(item)}
                  >
                    <Image source={{ uri: item.avatar_url }} style={styles.modalUserAvatar} />
                    <Text style={[styles.modalUsername, { color: colors.text }]}>{item.username}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <ThemedText style={{ textAlign: 'center', color: colors.textSecondary }}>
                      {userSearchQuery.length > 1 ? `No users found for "${userSearchQuery}"` : 'Start typing to search for users.'}
                    </ThemedText>
                  </View>
                }
              />
            )}
            <ThemedButton 
              title="Close" 
              onPress={() => setShowUserSearchModal(false)} 
              variant="secondary" 
              style={{marginTop: Spacing.md}} 
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
    </KeyboardAvoidingView>
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  postButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  postButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    padding: Spacing.lg,
  },
  previewImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: BorderRadius.md,
  },
  captionSection: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: Spacing.sm,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
  },
  captionInput: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  actionButtons: {
    paddingHorizontal: Spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  actionButtonText: {
    fontSize: 16,
    marginLeft: Spacing.md,
  },
  selectedProduct: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.md,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '500',
  },
  removeProductButton: {
    padding: Spacing.xs,
  },
  progressContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  progressText: {
    textAlign: 'center',
    marginBottom: Spacing.sm,
    fontSize: 14,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  bottomBar: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  draftButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
  },
  draftButtonText: {
    fontSize: 16,
    marginLeft: Spacing.sm,
  },
  errorContainer: {
    margin: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  errorText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Styles for product modal
  productModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    maxHeight: '70%',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  productModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: '50%',
    maxHeight: '90%',
  },
  productModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  productModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
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
  productList: {
    padding: 10,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  productCard: {
    width: '48%',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
  },
  modalProductPrice: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  linkProductButton: {
    backgroundColor: '#6C5CE7',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  linkedProductButton: {
    backgroundColor: '#4CAF50',
  },
  linkProductButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  userSearchModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  userSearchModalContent: {
    width: '90%',
    maxHeight: '70%',
    borderRadius: 20,
    padding: 20,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#eee', // Will be replaced by theme color
  },
  modalUserAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: Spacing.md,
  },
  modalUsername: {
    fontSize: Typography.bodyMedium.fontSize,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: Typography.h3.fontSize,
    fontWeight: 'bold',
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  searchContainer: {
    marginBottom: Spacing.md,
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
  imageWrapper: {
    position: 'relative',
  },
  tagOverlay: {
    position: 'absolute',
    transform: [{ translateX: -20 }, { translateY: -20 }],
  },
  tagBubble: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    minWidth: 40,
    alignItems: 'center',
  },
  tagUsername: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  removeTagButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ff4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taggingHint: {
    position: 'absolute',
    bottom: Spacing.md,
    left: Spacing.md,
    right: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  taggingHintText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});