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
  
  const [mode, setMode] = useState<'buyer' | 'seller'>('buyer');
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

  const loadSellerProducts = async () => {
    if (!session?.user?.id) return;
    
    setLoadingSellerProducts(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSellerProducts(data || []);
    } catch (err) {
      console.error('Error loading seller products:', err);
      setError('Failed to load your products');
    } finally {
      setLoadingSellerProducts(false);
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

  useEffect(() => {
    if (mode === 'seller') {
      if (!isVerified) {
        setShowVerificationModal(true);
      } else {
        loadSellerProducts();
      }
    }
  }, [mode, isVerified, session?.user?.id]);

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
      loadSellerProducts();
      loadProducts(); // Refresh main products too
      Alert.alert('Success', 'Product listed successfully!');
    } catch (err) {
      console.error('Product upload error:', err);
      setError('Failed to upload product. Please try again.');
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
      loadSellerProducts();
      loadProducts();
      Alert.alert('Success', 'Product updated successfully!');
    } catch (err) {
      console.error('Product update error:', err);
      setError('Failed to update product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllProducts = async () => {
    console.log('=== DELETE ALL PRODUCTS DEBUG ===');

    setLoading(true);
    try {
      // Check current user and session
      const { data: { user } } = await supabase.auth.getUser();
      const { data: { session } } = await supabase.auth.getSession();
      
      console.log('Current user:', user?.id);
      console.log('Has session:', !!session);

      if (!user?.id) {
        throw new Error('You must be logged in to delete products');
      }

      // Get count of user's products first
      const { count: productCount, error: countError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', user.id);

      if (countError) {
        console.error('Error counting products:', countError);
        throw new Error(`Failed to count products: ${countError.message}`);
      }

      console.log('Products to delete:', productCount);

      if (!productCount || productCount === 0) {
        Alert.alert('Info', 'No products to delete');
        return;
      }

      // Delete all products for the current user
      console.log('Attempting to delete all products...');
      const { error, data, count } = await supabase
        .from('products')
        .delete()
        .eq('seller_id', user.id)
        .select();

      console.log('Delete response:');
      console.log('- Error:', error);
      console.log('- Data:', data);
      console.log('- Count:', count);
      console.log('- Deleted rows:', data?.length || 0);

      if (error) {
        console.error('Delete error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      const deletedCount = data?.length || 0;
      console.log(`Successfully deleted ${deletedCount} products`);
      console.log('=== DELETE ALL SUCCESS ===');

      setShowDeleteModal(false);
      setProductToDelete(null);
      
      // Reload both product lists
      await Promise.all([
        loadSellerProducts(),
        loadProducts()
      ]);
      
      Alert.alert('Success', `Successfully deleted ${deletedCount} product${deletedCount !== 1 ? 's' : ''}!`);
    } catch (err) {
      console.error('=== DELETE ALL FAILED ===');
      console.error('Delete all products error:', err);
      const errorMessage = (err as Error).message || 'Unknown error';
      Alert.alert('Error', `Failed to delete products: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) {
      console.log('No product to delete');
      return;
    }

    console.log('=== DELETE SINGLE PRODUCT DEBUG ===');
    console.log('Product to delete:', productToDelete);
    console.log('Product ID:', productToDelete.id);

    setLoading(true);
    try {
      // Check current user and session
      const { data: { user } } = await supabase.auth.getUser();
      
      console.log('Current user:', user?.id);

      if (!user?.id) {
        throw new Error('You must be logged in to delete products');
      }

      // Attempt the delete
      console.log('Attempting delete operation...');
      const { error, data } = await supabase
        .from('products')
        .delete()
        .eq('id', productToDelete.id)
        .eq('seller_id', user.id) // Extra security: ensure user owns the product
        .select();

      console.log('Delete response:');
      console.log('- Error:', error);
      console.log('- Data:', data);

      if (error) {
        console.error('Delete error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('Product not found or you do not have permission to delete it');
      }

      console.log('Delete successful, deleted rows:', data);
      console.log('=== DELETE SUCCESS ===');

      setShowDeleteModal(false);
      setProductToDelete(null);
      
      // Reload both product lists
      await Promise.all([
        loadSellerProducts(),
        loadProducts()
      ]);
      
      Alert.alert('Success', 'Product deleted successfully!');
    } catch (err) {
      console.error('=== DELETE FAILED ===');
      console.error('Product delete error:', err);
      const errorMessage = (err as Error).message || 'Unknown error';
      Alert.alert('Error', `Failed to delete product: ${errorMessage}`);
    } finally {
      setLoading(false);
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

  const renderSellerDashboard = () => (
    <ScrollView style={styles.sellerContainer} contentContainerStyle={{ paddingBottom: 20 }}>
      <View style={styles.sellerHeader}>
        <Text style={[styles.sellerTitle, { color: colors.text }]}>My Products</Text>
        <View style={styles.headerButtons}>
          {sellerProducts.length > 0 && (
            <TouchableOpacity
              style={[styles.deleteAllButton, { backgroundColor: '#FF3B30' }]}
              onPress={confirmDeleteAllProducts}
            >
              <Trash2 size={18} color="#fff" />
              <Text style={styles.deleteAllButtonText}>Clear All</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              resetForm();
              setSellerView('add');
            }}
          >
            <LinearGradient
              colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.addButtonGradient}
            >
              <Plus size={20} color="#fff" />
              <Text style={styles.addButtonText}>Add Product</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {loadingSellerProducts ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : sellerProducts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Package size={60} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Products Yet</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Start selling by adding your first product
          </Text>
          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: colors.tint }]}
            onPress={() => {
              resetForm();
              setSellerView('add');
            }}
          >
            <Text style={styles.emptyButtonText}>Add Your First Product</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.productsGrid}>
          {sellerProducts.map((product) => (
            <View key={product.id} style={[styles.sellerProductCard, { backgroundColor: colors.card }]}>
              <Image source={{ uri: product.image_url }} style={styles.sellerProductImage} />
              <View style={styles.sellerProductInfo}>
                <Text style={[styles.sellerProductName, { color: colors.text }]} numberOfLines={2}>
                  {product.name}
                </Text>
                <Text style={[styles.sellerProductPrice, { color: colors.tint }]}>
                  ${product.price}
                </Text>
                <Text style={[styles.sellerProductDate, { color: colors.textSecondary }]}>
                  {new Date(product.created_at).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.sellerProductActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.editButton, { backgroundColor: colors.tint + '20' }]}
                  onPress={() => startEditProduct(product)}
                >
                  <Edit3 size={16} color={colors.tint} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => confirmDeleteProduct(product)}
                >
                  <Trash2 size={16} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );

  const renderProductForm = () => (
    <ScrollView style={styles.sellerContainer} contentContainerStyle={{ paddingBottom: 20 }}>
      <View style={styles.formHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            resetForm();
            setSellerView('dashboard');
          }}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.formTitle, { color: colors.text }]}>
          {sellerView === 'edit' ? 'Edit Product' : 'Add New Product'}
        </Text>
      </View>

      {error && (
        <View style={[styles.errorContainer, { backgroundColor: colors.error + '20' }]}>
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.imageUpload} onPress={pickImage}>
        {productImage ? (
          <Image source={{ uri: productImage }} style={styles.uploadedImage} />
        ) : (
          <View style={[styles.uploadPlaceholder, { 
            backgroundColor: colors.backgroundSecondary,
            borderColor: colors.tint
          }]}>
            <Camera size={40} color={colors.tint} />
            <Text style={[styles.uploadText, { color: colors.tint }]}>
              {sellerView === 'edit' ? 'Change Product Image' : 'Upload Product Image'}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <TextInput
        style={[styles.input, { 
          backgroundColor: colors.inputBackground,
          color: colors.text,
          borderColor: colors.border
        }]}
        placeholder="Product Name *"
        placeholderTextColor={colors.textSecondary}
        value={productName}
        onChangeText={setProductName}
        maxLength={100}
      />

      <TextInput
        style={[styles.input, { 
          backgroundColor: colors.inputBackground,
          color: colors.text,
          borderColor: colors.border
        }]}
        placeholder="Price *"
        placeholderTextColor={colors.textSecondary}
        value={productPrice}
        onChangeText={setProductPrice}
        keyboardType="decimal-pad"
        maxLength={10}
      />

      <TextInput
        style={[styles.descriptionInput, { 
          backgroundColor: colors.inputBackground,
          color: colors.text,
          borderColor: colors.border
        }]}
        placeholder="Description (optional)"
        placeholderTextColor={colors.textSecondary}
        value={productDescription}
        onChangeText={setProductDescription}
        multiline
        numberOfLines={4}
        maxLength={500}
        textAlignVertical="top"
      />

      <TouchableOpacity
        style={[
          styles.submitButton, 
          loading && styles.buttonDisabled, 
          { backgroundColor: colors.tint }
        ]}
        onPress={sellerView === 'edit' ? handleEditProduct : handleCreateProduct}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>
            {sellerView === 'edit' ? 'Update Product' : 'List Product'}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.push('/')}>
          <Text style={[styles.logo, { color: colors.tint }]}>Gymsta</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleContainer, { backgroundColor: colors.backgroundSecondary }]}
          onPress={() => setMode(mode === 'buyer' ? 'seller' : 'buyer')}>
          <View style={[
            styles.toggleOption,
            mode === 'buyer' && [styles.toggleOptionActive, { backgroundColor: colors.card }]
          ]}>
            <ShoppingBag size={16} color={mode === 'buyer' ? colors.tint : colors.textSecondary} />
            <Text style={[
              styles.toggleText,
              { color: mode === 'buyer' ? colors.tint : colors.textSecondary }
            ]}>Buyer</Text>
          </View>
          <View style={[
            styles.toggleOption,
            mode === 'seller' && [styles.toggleOptionActive, { backgroundColor: colors.card }]
          ]}>
            <LayoutGrid size={16} color={mode === 'seller' ? colors.tint : colors.textSecondary} />
            <Text style={[
              styles.toggleText,
              { color: mode === 'seller' ? colors.tint : colors.textSecondary }
            ]}>Seller</Text>
          </View>
        </TouchableOpacity>
        
        {mode === 'buyer' && (
          <View style={styles.searchWrapper}>
            <View style={[styles.searchContainer, { backgroundColor: colors.inputBackground }]}>
              <Search size={20} color={colors.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search products..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>
        )}
      </View>

      {mode === 'buyer' ? (
        <ScrollView 
          style={[styles.scrollView, { backgroundColor: colors.background }]}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: 10 }}
        >
          {loadingProducts ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.tint} />
            </View>
          ) : (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>My Gym</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.featuredContainer}>
                {featuredProducts.map((product) => (
                  <TouchableOpacity
                    key={product.id}
                    style={[styles.featuredProduct, { 
                      backgroundColor: colors.card,
                      shadowColor: colors.shadow
                    }]}
                    onPress={() => router.push(`/marketplace/${product.id}`)}>
                    <Image source={{ uri: product.image_url }} style={styles.featuredImage} />
                    <View style={styles.featuredInfo}>
                      <Text style={[styles.productName, { color: colors.text }]}>{product.name}</Text>
                      <Text style={[styles.productPrice, { color: colors.tint }]}>${product.price}</Text>
                      <Text style={[styles.sellerName, { color: colors.tint }]}>by {product.seller.username}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.sectionTitle, { color: colors.text }]}>All Products</Text>
              <View style={styles.productsGrid}>
                {filteredProducts.map((product) => (
                  <TouchableOpacity
                    key={product.id}
                    style={[styles.productCard, { 
                      backgroundColor: colors.card,
                      shadowColor: colors.shadow
                    }]}
                    onPress={() => router.push(`/marketplace/${product.id}`)}>
                    <Image source={{ uri: product.image_url }} style={styles.productImage} />
                    <View style={styles.productInfo}>
                      <Text style={[styles.productName, { color: colors.text }]}>{product.name}</Text>
                      <Text style={[styles.productPrice, { color: colors.tint }]}>${product.price}</Text>
                      <Text style={[styles.sellerName, { color: colors.tint }]}>by {product.seller.username}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      ) : (
        <>
          {!isVerified ? (
            <View style={styles.verificationContainer}>
              <AlertCircle size={60} color={colors.tint} />
              <Text style={[styles.verificationTitle, { color: colors.text }]}>
                Verified Accounts Only
              </Text>
              <Text style={[styles.verificationText, { color: colors.textSecondary }]}>
                Only verified accounts can list products on Gymsta Marketplace. This helps ensure quality and authenticity for our users.
              </Text>
              <TouchableOpacity
                style={[styles.backToBuyerButton, { backgroundColor: colors.tint }]}
                onPress={() => setMode('buyer')}>
                <Text style={styles.backToBuyerText}>Back to Shopping</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {sellerView === 'dashboard' ? renderSellerDashboard() : renderProductForm()}
            </>
          )}
        </>
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
                setMode('buyer');
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 15,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  toggleContainer: {
    position: 'absolute',
    top: 50,
    right: 15,
    flexDirection: 'row',
    borderRadius: 20,
    padding: 4,
  },
  toggleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 4,
  },
  toggleOptionActive: {
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  searchWrapper: {
    position: 'relative',
    marginTop: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    ...Platform.select({
      web: {
        outlineStyle: 'none' as any,
      },
    }),
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    margin: 15,
  },
  featuredContainer: {
    paddingHorizontal: 15,
  },
  featuredProduct: {
    width: 200,
    marginRight: 15,
    borderRadius: 10,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  featuredImage: {
    width: '100%',
    height: 150,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  featuredInfo: {
    padding: 10,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 15,
    gap: 15,
  },
  productCard: {
    width: '47%',
    borderRadius: 10,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  productImage: {
    width: '100%',
    height: 150,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  productInfo: {
    padding: 10,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    marginBottom: 2,
  },
  sellerName: {
    fontSize: 12,
  },
  
  // Seller Section Styles
  sellerContainer: {
    flex: 1,
    padding: 15,
  },
  sellerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sellerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addButton: {
    borderRadius: BorderRadius.md,
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.md,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.md,
    gap: 8,
  },
  deleteAllButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  emptyButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: BorderRadius.md,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Seller Product Cards
  sellerProductCard: {
    width: '47%',
    borderRadius: BorderRadius.md,
    marginBottom: 15,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  sellerProductImage: {
    width: '100%',
    height: 120,
  },
  sellerProductInfo: {
    padding: 12,
  },
  sellerProductName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  sellerProductPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sellerProductDate: {
    fontSize: 12,
  },
  sellerProductActions: {
    flexDirection: 'row',
    padding: 8,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
  },
  editButton: {
  },
  deleteButton: {
    backgroundColor: '#FF3B3020',
  },
  
  // Form Styles
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 15,
  },
  backButton: {
    padding: 8,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  errorContainer: {
    padding: 15,
    borderRadius: BorderRadius.md,
    marginBottom: 15,
  },
  errorText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
  imageUpload: {
    width: '100%',
    height: 200,
    marginBottom: 15,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
  },
  uploadPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.md,
  },
  uploadText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    borderRadius: BorderRadius.md,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
  },
  descriptionInput: {
    borderRadius: BorderRadius.md,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    height: 100,
  },
  submitButton: {
    padding: 15,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Verification Container
  verificationContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  verificationTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  verificationText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  backToBuyerButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: BorderRadius.md,
  },
  backToBuyerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Modal Styles
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