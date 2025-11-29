import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, TouchableWithoutFeedback, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { ThemedButton } from '../components/ThemedButton';
import { ThemedInput } from '../components/ThemedInput';
import { Check, User as UserIcon, MapPin } from 'lucide-react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

// Type definitions for Google Places
interface PlacesError {
  message: string;
  code?: string;
}

interface PlaceDetails {
  description: string;
  place_id: string;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types?: string[];
  formatted_address?: string;
  name?: string;
}

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [gym, setGym] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGymInputFocused, setIsGymInputFocused] = useState(false);
  const { theme, setTheme } = useTheme();
  const colors = Colors[theme];
  const scrollRef = useRef<ScrollView | null>(null);
  const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY || '';
  
  // Debug: Log API key status (remove in production)
  useEffect(() => {
    if (!API_KEY) {
      console.warn('Google Places API key is missing. Dropdown will not work.');
    }
  }, [API_KEY]);

  const onSearchError = React.useCallback((error?: any) => {
    console.log('Google Places Error:', error);
    const errorMessage = error?.message || error || 'An error occurred while searching for gyms';
    setError(typeof errorMessage === 'string' ? errorMessage : 'An error occurred while searching for gyms');
  }, []);

  const onPlaceSelected = React.useCallback((place: PlaceDetails) => {
    console.log(place);
    if (place.description) {
      setGym(place.description);
      setError(null);
      setIsGymInputFocused(false);
    }
  }, []);

  // Check if a place is a gym based on its types
  const isGymPlace = React.useCallback((types: string[] | undefined): boolean => {
    if (!types || !Array.isArray(types)) return false;
    
    const gymKeywords = ['gym', 'fitness', 'health', 'sport', 'athletic', 'training', 'workout'];
    return types.some((type) => {
      const lowerType = type.toLowerCase();
      return gymKeywords.some(keyword => lowerType.includes(keyword));
    });
  }, []);

  // Wrapper to adapt library's onPress to onPlaceSelected
  const handlePlacePress = React.useCallback((data: any, details: any = null) => {
    try {
      const placeTypes = details?.types || [];
      
      // Validate that the selected place is a gym
      if (!isGymPlace(placeTypes)) {
        setError('Please select a gym location. The selected place is not recognized as a gym.');
        setGym('');
        setIsGymInputFocused(false);
        return;
      }

      const place: PlaceDetails = {
        description: data.description || data.structured_formatting?.main_text || '',
        place_id: data.place_id || '',
        geometry: details?.geometry,
        types: placeTypes,
        formatted_address: details?.formatted_address,
        name: details?.name || data.structured_formatting?.main_text,
      };
      onPlaceSelected(place);
    } catch (err) {
      const error: PlacesError = {
        message: err instanceof Error ? err.message : 'Failed to process selected place',
      };
      onSearchError(error);
    }
  }, [onPlaceSelected, onSearchError, isGymPlace]);

  // Check auth session on component mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        setError('Please sign in to continue');
        setTimeout(() => router.replace('/auth?mode=signup'), 2000);
      }
    };
    
    checkSession();
  }, []);

  const checkUsername = async (candidate: string) => {
    const name = candidate.trim();
    if (!name) {
      setUsernameAvailable(null);
      return;
    }
    // Allow letters, numbers, underscores, 3-30 chars
    const valid = /^[_A-Za-z0-9]{3,30}$/.test(name);
    if (!valid) {
      setUsernameAvailable(false);
      return;
    }
    setCheckingUsername(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', name)
        .maybeSingle();
      if (error) throw error;
      setUsernameAvailable(!data);
    } catch (e) {
      setUsernameAvailable(null);
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleSubmit = async () => {
    if (!username.trim()) {
      setError('Username is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Auth error:', userError);
        setError('Authentication session expired. Please sign in again.');
        setTimeout(() => router.replace('/auth?mode=signup'), 2000);
        return;
      }
      
      if (!user) {
        setError('No authenticated user found. Redirecting to sign in...');
        setTimeout(() => router.replace('/auth?mode=signup'), 2000);
        return;
      }

      // Re-check username availability server-side
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.trim())
        .maybeSingle();
      if (checkError) throw checkError;
      if (existingUser) { setError('Username is already taken'); return; }

      // Create new profile
      const { data: profile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          username: username.trim(),
          bio: bio.trim() || null,
          gym: gym.trim() || null,
          has_completed_onboarding: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any)
        .select()
        .single();

      if (createError) {
        if (createError.message.includes('duplicate key')) {
          setError('Username is already taken');
          return;
        }
        throw createError;
      }

      if (!profile) {
        throw new Error('Failed to create profile');
      }

      // If the user selected Arete gym, switch to dark theme by default
      if (gym.trim().toLowerCase() === 'arete') {
        setTheme('dark');
      }

      // Go straight to the app on success
      router.replace('/(tabs)');
    } catch (err) {
      console.error('Profile creation error:', err);
      setError(
        err instanceof Error 
          ? err.message 
          : 'An unexpected error occurred while creating your profile'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <TouchableWithoutFeedback onPress={() => {
        Keyboard.dismiss();
      }}>
        <ScrollView 
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={[styles.container, { backgroundColor: colors.background, paddingBottom: 40 }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
        >
        <Text style={[styles.title, { color: colors.tint }]}>Complete Your Profile</Text>
        
        {error && (
          <View style={[styles.errorContainer, { backgroundColor: colors.error + '20' }]}>
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        )}
        
        <ThemedInput
          label="Username"
          value={username}
          onChangeText={(t) => { setUsername(t); checkUsername(t); }}
          autoCapitalize="none"
          autoCorrect={false}
          leftIcon={<UserIcon size={18} color={colors.textSecondary} />}
          rightIcon={username.length >= 3 && usernameAvailable ? <Check size={18} color={colors.tint} /> : undefined}
          error={username.length > 0 && usernameAvailable === false ? 'Username unavailable or invalid' : undefined}
          variant="filled"
          size="large"
        />
        
        <ThemedInput
          label="Bio (optional)"
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={4}
          variant="filled"
          size="large"
          style={{ minHeight: 100, textAlignVertical: 'top' }}
        />

        <View style={styles.gymInputContainer}>
          <View style={styles.gymLabelContainer}>
            <Text style={[styles.gymLabel, { color: colors.textSecondary }]}>Gym (optional)</Text>
          </View>
          <View style={[
            styles.googlePlacesContainer,
            {
              backgroundColor: colors.inputBackground,
              borderRadius: 8,
              ...styles.shadow,
            }
          ]}>
            <View style={styles.mapPinIcon}>
              <MapPin size={18} color={colors.textSecondary} />
            </View>
            <View style={styles.googlePlacesWrapper}>
              <GooglePlacesAutocomplete
                placeholder="Search for a gym..."
                predefinedPlaces={[]}
                onPress={handlePlacePress}
                onFail={onSearchError}
                query={{
                  key: API_KEY,
                  language: 'en',
                  types: 'gym',
                }}
                fetchDetails={true}
                enablePoweredByContainer={false}
                debounce={300}
                listViewDisplayed={isGymInputFocused ? 'auto' : false}
                minLength={2}
                keepResultsAfterBlur={false}
                nearbyPlacesAPI="GooglePlacesSearch"
                styles={{
                  container: { flex: 1, zIndex: 1000 },
                  textInputContainer: styles.textInputContainer,
                  textInput: [
                    styles.googlePlacesInput,
                    { color: colors.text }
                  ],
                  listView: [
                    styles.googlePlacesList,
                    { backgroundColor: colors.inputBackground }
                  ],
                  row: [
                    styles.googlePlacesRow,
                    { backgroundColor: colors.inputBackground }
                  ],
                  separator: {
                    height: 1,
                    backgroundColor: colors.border,
                  },
                  description: {
                    color: colors.text,
                    fontSize: 16,
                  },
                  predefinedPlacesDescription: {
                    color: colors.textSecondary,
                  },
                }}
                textInputProps={{
                  placeholderTextColor: colors.textSecondary,
                  returnKeyType: 'search',
                  onFocus: () => setIsGymInputFocused(true),
                  onBlur: () => setIsGymInputFocused(false),
                }}
                keyboardShouldPersistTaps="handled"
              />
            </View>
          </View>
        </View>

        <ThemedButton
          title={loading ? 'Creating Account...' : 'Complete Registration'}
          onPress={handleSubmit}
          variant="primary"
          loading={loading}
          disabled={loading || !username.trim()}
          style={[
            styles.completeButton,
            isGymInputFocused && { marginTop: 220 } // Push button down when dropdown is visible
          ]}
        />
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  errorContainer: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    textAlign: 'center',
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  gymInputContainer: {
    marginBottom: 16,
    position: 'relative',
    zIndex: 10,
    overflow: 'visible',
  },
  gymLabelContainer: {
    marginBottom: 8,
    paddingLeft: 4,
  },
  gymLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  googlePlacesContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingLeft: 48,
    paddingRight: 12,
    overflow: 'visible',
  },
  mapPinIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 2,
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  googlePlacesWrapper: {
    flex: 1,
    overflow: 'visible',
    zIndex: 1000,
  },
  textInputContainer: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    borderBottomWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  googlePlacesInput: {
    height: 56,
    fontSize: 16,
    paddingVertical: 0,
    paddingHorizontal: 0,
    margin: 0,
    backgroundColor: 'transparent',
  },
  googlePlacesList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderRadius: 8,
    marginTop: 8,
    maxHeight: 200,
    borderWidth: 1,
    zIndex: 10000,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  googlePlacesRow: {
    padding: 12,
  },
  completeButton: {
    marginTop: 20,
  },
});