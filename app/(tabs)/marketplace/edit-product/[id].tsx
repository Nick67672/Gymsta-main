import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, ActivityIndicator, Alert, Platform } from 'react-native';
import { Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import Colors from '@/constants/Colors';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { ThemedView } from '@/components/ThemedView';
import { ThemedH2 } from '@/components/ThemedText';
import { ThemedButton } from '@/components/ThemedButton';

export default function EditProductScreen() {
  const { id } = useLocalSearchParams();
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { user } = useAuth();

  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productImage, setProductImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchProduct = async () => {
      setIsFetching(true);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) throw error;

        if (data) {
          setProductName(data.name);
          setProductPrice(data.price.toString());
          setProductDescription(data.description || '');
          setProductImage(data.image_url);
        }
      } catch (e: any) {
        setError(`Failed to fetch product details: ${e.message}`);
      } finally {
        setIsFetching(false);
      }
    };

    fetchProduct();
  }, [id]);

  const pickImage = async () => {
    // ... (same as in create-product)
  };

  const handleUpdateProduct = async () => {
    if (!productName || !productPrice) {
      setError('Product name and price are required.');
      return;
    }
    if (!user || !id) {
        setError('Authentication error or missing product ID.');
        return;
    }

    setLoading(true);
    setError(null);

    try {
      let imageUrl = productImage;
      // If a new image was picked, upload it
      if (productImage && !productImage.startsWith('http')) {
        const fileName = `${user.id}/${Date.now()}.jpg`;
        const response = await fetch(productImage);
        const blob = await response.blob();
        
        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(fileName, blob, { contentType: 'image/jpeg' });

        if (uploadError) throw uploadError;
        
        imageUrl = supabase.storage.from('products').getPublicUrl(fileName).data.publicUrl;
      }
      
      const { error: updateError } = await supabase
        .from('products')
        .update({
          name: productName.trim(),
          price: parseFloat(productPrice),
          description: productDescription.trim() || null,
          image_url: imageUrl,
        })
        .eq('id', id);

      if (updateError) throw updateError;

      Alert.alert('Success', 'Your product has been updated!', [
          { text: 'OK', onPress: () => router.back() }
      ]);

    } catch (e: any) {
      setError(`Failed to update product: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  if (isFetching) {
    return <ThemedView style={{flex: 1, justifyContent: 'center'}}><ActivityIndicator /></ThemedView>;
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedH2 style={styles.title}>Edit Product</ThemedH2>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Form is identical to create-product screen */}
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          {productImage ? (
            <Image source={{ uri: productImage }} style={styles.productImage} />
          ) : (
            <View style={[styles.imagePlaceholder, {borderColor: colors.border}]}>
              <Camera size={40} color={colors.textSecondary} />
              <Text style={{color: colors.textSecondary}}>Change Image</Text>
            </View>
          )}
        </TouchableOpacity>

        <TextInput
          style={[styles.input, {color: colors.text, borderColor: colors.border}]}
          placeholder="Product Name"
          value={productName}
          onChangeText={setProductName}
        />
        <TextInput
          style={[styles.input, {color: colors.text, borderColor: colors.border}]}
          placeholder="Price ($)"
          value={productPrice}
          onChangeText={setProductPrice}
          keyboardType="decimal-pad"
        />
        <TextInput
          style={[styles.input, styles.description, {color: colors.text, borderColor: colors.border}]}
          placeholder="Description"
          value={productDescription}
          onChangeText={setProductDescription}
          multiline
        />

        <ThemedButton
          title={loading ? 'Updating...' : 'Update Product'}
          onPress={handleUpdateProduct}
          disabled={loading}
          loading={loading}
        />
      </ScrollView>
    </ThemedView>
  );
}

// Styles are identical to create-product screen
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: Spacing.md },
  title: { marginBottom: Spacing.lg, textAlign: 'center' },
  errorText: { color: 'red', marginBottom: Spacing.md, textAlign: 'center' },
  imagePicker: { width: '100%', height: 200, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0', marginBottom: Spacing.lg, overflow: 'hidden' },
  productImage: { width: '100%', height: '100%' },
  imagePlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderStyle: 'dashed', borderRadius: BorderRadius.md },
  input: { borderWidth: 1, padding: Spacing.md, borderRadius: BorderRadius.md, fontSize: 16, marginBottom: Spacing.md },
  description: { height: 100, textAlignVertical: 'top' }
}); 