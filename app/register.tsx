import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { ThemedButton } from '../components/ThemedButton';
import { ThemedInput } from '../components/ThemedInput';
import { Check, User as UserIcon, MapPin } from 'lucide-react-native';

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [gym, setGym] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showGymSuggestions, setShowGymSuggestions] = useState(false);
  const { theme, setTheme } = useTheme();
  const colors = Colors[theme];

  // Check auth session on component mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        setError('Please sign in to continue');
        setTimeout(() => router.replace('/auth?mode=signin'), 2000);
      }
    };
    
    checkSession();
  }, []);

  const filteredGyms = GYM_LIST.filter(g => 
    g.toLowerCase().includes(gym.toLowerCase())
  );

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
        setTimeout(() => router.replace('/auth?mode=signin'), 2000);
        return;
      }
      
      if (!user) {
        setError('No authenticated user found. Redirecting to sign in...');
        setTimeout(() => router.replace('/auth?mode=signin'), 2000);
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
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
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

      // Redirect to onboarding on success
      router.replace('/onboarding');
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
    <TouchableWithoutFeedback onPress={() => {
      Keyboard.dismiss();
      setShowGymSuggestions(false);
    }}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
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
          <ThemedInput
            label="Gym (optional)"
            value={gym}
            onChangeText={(text) => {
              setGym(text);
              setShowGymSuggestions(true);
            }}
            onFocus={() => setShowGymSuggestions(true)}
            leftIcon={<MapPin size={18} color={colors.textSecondary} />}
            variant="filled"
            size="large"
            style={{
              marginBottom: showGymSuggestions && filteredGyms.length > 0 ? 0 : 16,
              borderBottomLeftRadius: showGymSuggestions && filteredGyms.length > 0 ? 0 : 8,
              borderBottomRightRadius: showGymSuggestions && filteredGyms.length > 0 ? 0 : 8,
            }}
          />
          
          {showGymSuggestions && filteredGyms.length > 0 && (
            <ScrollView 
              style={[
                styles.suggestionsContainer,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.border
                }
              ]}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              {filteredGyms.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.suggestionItem,
                    { borderBottomColor: colors.border }
                  ]}
                  onPress={() => {
                    setGym(suggestion);
                    setShowGymSuggestions(false);
                  }}
                >
                  <Text style={[styles.suggestionText, { color: colors.text }]}>
                    {suggestion}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        <ThemedButton
          title={loading ? 'Creating Account...' : 'Complete Registration'}
          onPress={handleSubmit}
          variant="primary"
          loading={loading}
          disabled={loading || !username.trim()}
          style={styles.completeButton}
        />
      </View>
    </TouchableWithoutFeedback>
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
    position: 'relative',
    zIndex: 1,
  },
  suggestionsContainer: {
    maxHeight: 200,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    marginBottom: 16,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
  },
  suggestionText: {
    fontSize: 16,
  },
  completeButton: {
    marginTop: 20,
  },
});

const GYM_LIST = [
'Arete'
];