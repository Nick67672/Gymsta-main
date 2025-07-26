import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, ActivityIndicator, Alert, Platform } from 'react-native';
import { Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import Colors from '@/constants/Colors';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { ThemedView } from '@/components/ThemedView';
import { ThemedH2 } from '@/components/ThemedText';
import { ThemedButton } from '@/components/ThemedButton';

export default function CreateProductScreen() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { user } = useAuth();

  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productImage, setProductImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
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
    }
  };

  const handleCreateProduct = async () => {
    if (!productName || !productPrice || !productImage) {
      setError('Product name, price, and image are required.');
      return;
    }
    if (!user) {
        setError('You must be logged in to create a product.');
        return;
    }

    setLoading(true);
    setError(null);

    try {
      const fileName = `${user.id}/${Date.now()}.jpg`;
      const response = await fetch(productImage);
      const blob = await response.blob();
      
      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from('products')
        .insert({
          seller_id: user.id,
          name: productName.trim(),
          price: parseFloat(productPrice),
          description: productDescription.trim() || null,
          image_url: publicUrl,
          category: 'default', // Or some other default/selected category
        });

      if (insertError) throw insertError;

      Alert.alert('Success', 'Your product has been listed!', [
          { text: 'OK', onPress: () => router.back() }
      ]);

    } catch (e: any) {
      setError(`Failed to create product: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedH2 style={styles.title}>List a New Product</ThemedH2>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          {productImage ? (
            <Image source={{ uri: productImage }} style={styles.productImage} />
          ) : (
            <View style={[styles.imagePlaceholder, {borderColor: colors.border}]}>
              <Camera size={40} color={colors.textSecondary} />
              <Text style={{color: colors.textSecondary}}>Upload Image</Text>
            </View>
          )}
        </TouchableOpacity>

        <TextInput
          style={[styles.input, {color: colors.text, borderColor: colors.border}]}
          placeholder="Product Name"
          placeholderTextColor={colors.textSecondary}
          value={productName}
          onChangeText={setProductName}
        />
        <TextInput
          style={[styles.input, {color: colors.text, borderColor: colors.border}]}
          placeholder="Price ($)"
          placeholderTextColor={colors.textSecondary}
          value={productPrice}
          onChangeText={setProductPrice}
          keyboardType="decimal-pad"
        />
        <TextInput
          style={[styles.input, styles.description, {color: colors.text, borderColor: colors.border}]}
          placeholder="Description (optional)"
          placeholderTextColor={colors.textSecondary}
          value={productDescription}
          onChangeText={setProductDescription}
          multiline
        />

        <ThemedButton
          title={loading ? 'Listing...' : 'List Product'}
          onPress={handleCreateProduct}
          disabled={loading}
          loading={loading}
        />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  title: {
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  errorText: {
    color: 'red',
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  imagePicker: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.md,
  },
  input: {
    borderWidth: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    fontSize: 16,
    marginBottom: Spacing.md,
  },
  description: {
    height: 100,
    textAlignVertical: 'top',
  }
}); 