import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, ActivityIndicator, ScrollView, Modal, Alert, Platform, FlatList } from 'react-native';
import { Camera, Upload, Search, X, MapPin, AtSign, Save } from 'lucide-react-native';
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
  position: number;
}

interface Location {
  name: string;
  latitude: number;
  longitude: number;
}

const DRAFTS_KEY_PREFIX = 'post_drafts_';

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

  const { theme } = useTheme();
  const colors = Colors[theme];
  const { user } = useAuth();

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (userSearchQuery.length > 1 && userSearchQuery !== lastSearch) {
        searchUsers();
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [userSearchQuery]);

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
      const captionText = caption.trim() || null;
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
    // Add @mention to caption at current cursor position (simplified)
    const newCaption = caption ? `${caption} @${user.username} ` : `@${user.username} `;
    setCaption(newCaption);
    
    // Add to tagged users list
    setTaggedUsers(prev => [...prev, { user, position: caption.length }]);
    
    // Reset and close modal
    setShowUserSearchModal(false);
    setUserSearchQuery('');
    setUserSearchResults([]);
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
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedH2>Create Post</ThemedH2>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={{flex: 1}}>
          {error && (
            <View style={[styles.errorContainer, { backgroundColor: colors.error + '20' }]}>
              <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
            </View>
          )}

          <View style={styles.imageAndCaption}>
            <Image source={{ uri: imageUri as string }} style={styles.preview} />
            <TextInput
              style={[styles.captionInput, { 
                borderColor: colors.border,
                backgroundColor: colors.inputBackground,
                color: colors.text
              }]}
              placeholder="Write a caption..."
              placeholderTextColor={colors.textSecondary}
              value={caption}
              onChangeText={setCaption}
              multiline
            />
          </View>
          
          <View style={styles.optionsContainer}>
            <ThemedButton 
              title="Tag People"
              onPress={() => setShowUserSearchModal(true)}
              variant="secondary"
              style={styles.optionButton}
            />
            <ThemedButton 
              title="Link Product"
              onPress={loadProducts}
              variant="secondary"
              style={styles.optionButton}
              loading={loadingProducts}
            />
          </View>

          {selectedProductId && (
            <View style={[styles.selectedProduct, { backgroundColor: colors.tint + '20' }]}>
              <Image 
                source={{ uri: products.find(p => p.id === selectedProductId)?.image_url }}
                style={styles.productImage}
              />
              <View style={styles.productInfo}>
                <ThemedText style={styles.productName}>
                  {products.find(p => p.id === selectedProductId)?.name}
                </ThemedText>
              </View>
              <TouchableOpacity 
                onPress={() => setSelectedProductId(null)} 
                style={styles.removeProductButton}
              >
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
          )}

          {uploading && (
            <View style={styles.progressContainer}>
              <ThemedCaptionText style={styles.progressText}>
                Uploading: {Math.round(uploadProgress * 100)}%
              </ThemedCaptionText>
              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <View style={[styles.progressFill, { 
                  width: `${uploadProgress * 100}%`,
                  backgroundColor: colors.tint,
                }]} />
              </View>
            </View>
          )}
        </View>
      </ScrollView>
      
      <View style={[styles.actionButtonsContainer, { borderTopColor: colors.border }]}>
        <ThemedButton 
          title="Post"
          onPress={handleUpload}
          style={{ marginBottom: Spacing.sm }}
          loading={loading}
        />
        <ThemedButton 
          title="Save Draft"
          onPress={saveDraft}
          variant="secondary"
          disabled={loading}
        />
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
                        <Text style={[styles.productPrice, { color: colors.tint }]}>
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
                    <Image source={{ uri: item.avatar_url }} style={styles.userAvatar} />
                    <Text style={[styles.username, { color: colors.text }]}>{item.username}</Text>
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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: Typography.h2.fontSize,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.md,
    flexGrow: 1,
  },
  imageAndCaption: {
    flexDirection: 'column',
    marginBottom: Spacing.md,
  },
  preview: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  captionInput: {
    width: '100%',
    height: 120,
    textAlignVertical: 'top',
    padding: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    fontSize: Typography.bodyMedium.fontSize,
  },
  errorContainer: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  error: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  selectedProduct: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  productImage: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.sm,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: Typography.bodySmall.fontSize,
  },
  removeProductButton: {
    padding: Spacing.xs,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.md,
  },
  optionButton: {
    flex: 1,
    marginHorizontal: Spacing.xs,
  },
  actionButtonsContainer: {
    flexDirection: 'column',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    borderTopWidth: 1,
  },
  progressContainer: {
    marginVertical: Spacing.md,
  },
  progressText: {
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  
  bottomContainer: {
    padding: Spacing.md,
    borderTopWidth: 1,
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
  productPrice: {
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
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: Spacing.md,
  },
  username: {
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
});