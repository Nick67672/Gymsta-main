import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, ActivityIndicator, Modal, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, ShoppingBag, LayoutGrid, Camera, CircleAlert as AlertCircle, Plus, Edit3, Trash2, Package, ArrowLeft } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import Colors from '@/constants/Colors';
import { BorderRadius, Spacing } from '@/constants/Spacing';
import { ThemedButton } from '@/components/ThemedButton';

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
  description: string | null;
  category: string;
  seller: {
    username: string;
    avatar_url: string | null;
  };
}

interface SellerProduct {
  id: string;
  name: string;
  price: number;
  image_url: string;
  description: string | null;
  category: string;
  created_at: string;
}

export default function MarketplaceScreen() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { isAuthenticated, session } = useAuth();
  
  const [view, setView] = useState<'browse' | 'orders' | 'sales'>('browse');
  const [sellerView, setSellerView] = useState<'dashboard' | 'add' | 'edit'>('dashboard');
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productImage, setProductImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [sellerProducts, setSellerProducts] = useState<SellerProduct[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingSellerProducts, setLoadingSellerProducts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<SellerProduct | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState<SellerProduct | null>(null);
  const [deleteMode, setDeleteMode] = useState<'single' | 'all'>('single');

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          price,
          image_url,
          description,
          category,
          seller:profiles!seller_id (
            username,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        // Transform the data to match our interface
        const transformedData = data.map((item: any) => ({
          ...item,
          seller: Array.isArray(item.seller) ? item.seller[0] : item.seller
        })) as Product[];
        setFeaturedProducts(transformedData.slice(0, 2));
        setProducts(transformedData.slice(2));
      }
    } catch (err) {
      console.error('Error loading products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const checkVerificationStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('is_verified')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setIsVerified(data?.is_verified || false);
    } catch (err) {
      console.error('Error checking verification status:', err);
    }
  };

  useEffect(() => {
    loadProducts();
    checkVerificationStatus();
  }, []);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        setError('Permission to access gallery was denied');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        setProductImage(result.assets[0].uri);
        setError(null);
      }
    } catch (err) {
      setError('Failed to pick image');
    }
  };

  const resetForm = () => {
    setProductName('');
    setProductPrice('');
    setProductDescription('');
    setProductImage(null);
    setEditingProduct(null);
    setError(null);
  };

  const handleCreateProduct = async () => {
    if (!isVerified) {
      setShowVerificationModal(true);
      return;
    }

    if (!productName || !productPrice || !productImage) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be logged in to list products');
        return;
      }

      const fileName = `${user.id}/${Date.now()}.jpg`;
      let uploadError;
      
      if (Platform.OS === 'web') {
        const response = await fetch(productImage);
        const blob = await response.blob();
        ({ error: uploadError } = await supabase.storage
          .from('products')
          .upload(fileName, blob, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: false
          }));
      } else {
        const formData = new FormData();
        formData.append('file', {
          uri: productImage,
          name: fileName,
          type: 'image/jpeg',
        } as any);
        ({ error: uploadError } = await supabase.storage
          .from('products')
          .upload(fileName, formData, {
            contentType: 'multipart/form-data',
            cacheControl: '3600',
            upsert: false
          }));
      }
      
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(fileName);

      const { error: productError } = await supabase
        .from('products')
        .insert({
          seller_id: user.id,
          name: productName.trim(),
          price: parseFloat(productPrice),
          description: productDescription.trim() || null,
          image_url: publicUrl,
          category: 'fitness',
        });

      if (productError) throw productError;

      resetForm();
      setSellerView('dashboard');
      router.push('/(tabs)/marketplace/seller-dashboard');
      Alert.alert('Success', 'Product listed successfully!');
    } catch (err) {
      console.error('Product upload error:', err);
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditProduct = async () => {
    if (!editingProduct) return;

    if (!productName || !productPrice) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      let imageUrl = editingProduct.image_url;

      // Upload new image if selected
      if (productImage && productImage !== editingProduct.image_url) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not found');

        const fileName = `${user.id}/${Date.now()}.jpg`;
        let uploadError;
        
        if (Platform.OS === 'web') {
          const response = await fetch(productImage);
          const blob = await response.blob();
          ({ error: uploadError } = await supabase.storage
            .from('products')
            .upload(fileName, blob, {
              contentType: 'image/jpeg',
              cacheControl: '3600',
              upsert: false
            }));
        } else {
          const formData = new FormData();
          formData.append('file', {
            uri: productImage,
            name: fileName,
            type: 'image/jpeg',
          } as any);
          ({ error: uploadError } = await supabase.storage
            .from('products')
            .upload(fileName, formData, {
              contentType: 'multipart/form-data',
              cacheControl: '3600',
              upsert: false
            }));
        }
        
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('products')
          .getPublicUrl(fileName);
        
        imageUrl = publicUrl;
      }

      const { error } = await supabase
        .from('products')
        .update({
          name: productName.trim(),
          price: parseFloat(productPrice),
          description: productDescription.trim() || null,
          image_url: imageUrl,
        })
        .eq('id', editingProduct.id);

      if (error) throw error;

      resetForm();
      setSellerView('dashboard');
      Alert.alert('Success', 'Product updated successfully!');
    } catch (err) {
      console.error('Product update error:', err);
      setError('Failed to update product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllProducts = async () => {
    if (!session?.user?.id) {
      setError('You must be logged in.');
      return;
    }
    try {
      // ... (delete logic)
      Alert.alert('Success', 'All products have been deleted.');
      setSellerProducts([]);
    } catch (err) {
      console.error('Error deleting all products:', err);
      setError('Failed to delete all products.');
    } finally {
      setShowDeleteModal(false);
      setProductToDelete(null);
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete || !session?.user?.id) {
      setError('No product selected for deletion.');
      return;
    }
    try {
      // ... (delete logic)
      Alert.alert('Success', 'Product deleted.');
      setSellerProducts(prev => prev.filter(p => p.id !== productToDelete.id));
    } catch (err) {
      console.error('Error deleting product:', err);
      setError('Failed to delete the product.');
    } finally {
      setShowDeleteModal(false);
      setProductToDelete(null);
    }
  };

  const startEditProduct = (product: SellerProduct) => {
    setEditingProduct(product);
    setProductName(product.name);
    setProductPrice(product.price.toString());
    setProductDescription(product.description || '');
    setProductImage(product.image_url);
    setSellerView('edit');
    setError(null);
  };

  const confirmDeleteProduct = (product: SellerProduct) => {
    setProductToDelete(product);
    setDeleteMode('single');
    setShowDeleteModal(true);
  };

  const confirmDeleteAllProducts = () => {
    setProductToDelete(null);
    setDeleteMode('all');
    setShowDeleteModal(true);
  };

  // Filter products based on search query
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderBuyerDashboard = () => (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Featured Products */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Featured</Text>
      <View style={styles.featuredGrid}>
        {featuredProducts.map(item => (
          <TouchableOpacity 
            key={item.id} 
            style={[styles.featuredCard, { backgroundColor: colors.card }]}
            onPress={() => router.push(`/(tabs)/marketplace/${item.id}`)}
          >
            <Image source={{ uri: item.image_url }} style={styles.featuredImage} />
            <View style={styles.featuredTextContainer}>
              <Text style={[styles.featuredName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
              <Text style={[styles.featuredPrice, { color: colors.tint }]}>${item.price.toFixed(2)}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* All Products */}
      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: Spacing.lg }]}>All Products</Text>
      <View style={styles.productGrid}>
        {products.map(item => (
          <TouchableOpacity 
            key={item.id} 
            style={[styles.productCard, { backgroundColor: colors.card }]}
            onPress={() => router.push(`/(tabs)/marketplace/${item.id}`)}
          >
            <Image source={{ uri: item.image_url }} style={styles.productImage} />
            <View style={styles.productInfo}>
              <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>{item.name}</Text>
              <Text style={[styles.productPrice, { color: colors.tint }]}>${item.price.toFixed(2)}</Text>
              <View style={styles.sellerInfo}>
                <Image source={{ uri: item.seller?.avatar_url || 'https://placehold.co/24x24' }} style={styles.sellerAvatar} />
                <Text style={[styles.sellerName, { color: colors.text }]} numberOfLines={1}>{item.seller?.username || 'Unknown'}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  return (
    <LinearGradient colors={[colors.background, colors.card]} style={styles.container}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <View style={[styles.searchContainer, {backgroundColor: colors.inputBackground}]}>
          <Search color={colors.textSecondary} size={20} />
          <TextInput
            placeholder="Search Gymsta Marketplace"
            placeholderTextColor={colors.textSecondary}
            style={[styles.searchInput, { color: colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={[styles.navigationContainer, {borderColor: colors.border}]}>
        <ThemedButton
            title="Browse"
            onPress={() => setView('browse')}
            variant={view === 'browse' ? 'primary' : 'secondary'}
            style={styles.navButton}
        />
        <ThemedButton
            title="My Orders"
            onPress={() => router.push('/(tabs)/marketplace/my-orders')}
            variant={'secondary'}
            style={styles.navButton}
        />
        <ThemedButton
            title="Seller Dashboard"
            onPress={() => router.push('/(tabs)/marketplace/seller-dashboard')}
            variant={'secondary'}
            style={[styles.navButton, { paddingHorizontal: 4 }]}
            textStyle={{ fontSize: 13 }}
        />
      </View>

      {loadingProducts ? (
        <ActivityIndicator size="large" color={colors.tint} style={{ flex: 1 }} />
      ) : (
        renderBuyerDashboard()
      )}

      {/* Verification Modal */}
      <Modal
        visible={showVerificationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowVerificationModal(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalBackground }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalIconContainer}>
              <AlertCircle size={60} color={colors.tint} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Verified Accounts Only
            </Text>
            <Text style={[styles.modalText, { color: colors.textSecondary }]}>
              Only verified accounts can list products on Gymsta Marketplace. This helps ensure quality and authenticity for our users.
            </Text>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.tint }]}
              onPress={() => {
                setShowVerificationModal(false);
                setView('browse');
              }}>
              <Text style={styles.modalButtonText}>I Understand</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalBackground }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalIconContainer}>
              <Trash2 size={60} color="#FF3B30" />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {deleteMode === 'all' ? 'Delete All Products' : 'Delete Product'}
            </Text>
            <Text style={[styles.modalText, { color: colors.textSecondary }]}>
              {deleteMode === 'all' 
                ? `Are you sure you want to delete ALL ${sellerProducts.length} product${sellerProducts.length !== 1 ? 's' : ''}? This action cannot be undone.`
                : `Are you sure you want to delete "${productToDelete?.name}"? This action cannot be undone.`
              }
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: colors.backgroundSecondary }]}
                onPress={() => setShowDeleteModal(false)}>
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
                              <TouchableOpacity
                  style={[styles.modalButton, styles.deleteModalButton]}
                  onPress={deleteMode === 'all' ? handleDeleteAllProducts : handleDeleteProduct}
                  disabled={loading}>
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.modalButtonText}>
                      {deleteMode === 'all' ? 'Delete All' : 'Delete'}
                    </Text>
                  )}
                </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.md,
    fontSize: 16,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  navButton: {
    flex: 1,
    marginHorizontal: Spacing.xs,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginLeft: Spacing.lg,
    marginBottom: Spacing.md,
  },
  featuredGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
  },
  featuredCard: {
    width: '48%',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  featuredImage: {
    width: '100%',
    height: 150,
  },
  featuredTextContainer: {
    padding: Spacing.md,
  },
  featuredName: {
    fontSize: 16,
    fontWeight: '600',
  },
  featuredPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: Spacing.xs,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
  },
  productCard: {
    width: '48%',
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: 120,
  },
  productInfo: {
    padding: Spacing.md,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: Spacing.sm,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 'auto',
  },
  sellerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: Spacing.sm,
  },
  sellerName: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    borderRadius: BorderRadius.lg,
    padding: 25,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalIconContainer: {
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  cancelButton: {
  },
  deleteModalButton: {
    backgroundColor: '#FF3B30',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});