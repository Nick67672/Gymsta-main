import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  ChevronLeft, 
  ChevronRight, 
  MapPin, 
  Calendar, 
  Target, 
  Activity, 
  Clock, 
  Award,
  Globe,
  User,
  Check
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { BorderRadius, Shadows, Spacing } from '@/constants/Spacing';
import { Typography } from '@/constants/Typography';

interface OnboardingData {
  age: string;
  location: string; // country
  measurementSystem: 'imperial' | 'metric';
  weight: string; // optional
  workoutFrequency: string; // 1-2_times,3-4_times,5-6_times,daily
  goals: string[]; // multi-select
  preferredDuration?: string; // optional: 15-30_min,30-45_min,45-60_min,60+_min
  experienceYears?: string; // optional
}

const FITNESS_LEVELS = [
  { value: 'beginner', label: 'Beginner', description: 'New to fitness or getting back into it' },
  { value: 'intermediate', label: 'Intermediate', description: 'Some experience with regular workouts' },
  { value: 'advanced', label: 'Advanced', description: 'Consistent training for 1+ years' },
  { value: 'expert', label: 'Expert', description: 'Highly experienced with specialized training' },
];

const PRIMARY_GOALS = [
  { value: 'weight_loss', label: 'Weight Loss', icon: 'Target' },
  { value: 'muscle_gain', label: 'Muscle Gain', icon: 'Activity' },
  { value: 'strength', label: 'Strength', icon: 'Award' },
  { value: 'endurance', label: 'Endurance', icon: 'Activity' },
  { value: 'general_fitness', label: 'General Fitness', icon: 'Target' },
  { value: 'sports_performance', label: 'Sports Performance', icon: 'Award' },
  { value: 'recovery', label: 'Recovery & Wellness', icon: 'Activity' },
];

const WORKOUT_FREQUENCIES = [
  { value: '1-2_times', label: '1-2 times per week' },
  { value: '3-4_times', label: '3-4 times per week' },
  { value: '5-6_times', label: '5-6 times per week' },
  { value: 'daily', label: 'Daily' },
];

const WORKOUT_DURATIONS = [
  { value: '15-30_min', label: '15-30 minutes' },
  { value: '30-45_min', label: '30-45 minutes' },
  { value: '45-60_min', label: '45-60 minutes' },
  { value: '60+_min', label: '60+ minutes' },
];

const EXPERIENCE_LEVELS = [
  'Beginner',
  'Intermediate',
  'Advanced'
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: Spacing.xs,
  },
  stepSubtitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  progressContainer: {
    alignItems: 'flex-end',
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  progressBar: {
    width: 60,
    height: 4,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  stepContainer: {
    gap: Spacing.lg,
  },
  stepDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: Spacing.md,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  textInput: {
    height: 50,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
  optionCard: {
    borderWidth: 2,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.light,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  optionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  goalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  goalCard: {
    width: '48%',
    borderWidth: 2,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Shadows.light,
  },
  goalContent: {
    alignItems: 'center',
    position: 'relative',
  },
  goalTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  goalCheck: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  preferenceSection: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: Spacing.lg,
  },
  measurementCard: {
    borderWidth: 2,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.light,
  },
  measurementContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  measurementHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  measurementTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  measurementDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    borderTopWidth: 1,
    padding: Spacing.lg,
    paddingBottom: Spacing.lg + 20, // Extra padding for safe area
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  locationInputContainer: {
    position: 'relative',
    zIndex: 1,
  },
  experienceInputContainer: {
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
});

export default function OnboardingScreen() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [showExperienceSuggestions, setShowExperienceSuggestions] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    age: '',
    location: '',
    measurementSystem: 'imperial',
    weight: '',
    workoutFrequency: '',
    goals: [],
    preferredDuration: undefined,
    experienceYears: undefined,
  });

  const [username, setUsername] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

  const steps = [
    { title: 'Quick Setup', subtitle: 'Just a few details to personalize' },
  ];

  const filteredCountries = COUNTRIES_LIST.filter(c => 
    c.toLowerCase().includes(data.location.toLowerCase())
  );

  // Simplified flow: no experience level suggestions

  const updateData = (field: keyof OnboardingData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const validateUsernameFormat = (name: string) => /^[_A-Za-z0-9]{3,30}$/.test(name);

  const checkUsername = async (candidate: string) => {
    const name = candidate.trim();
    if (!name || !validateUsernameFormat(name)) {
      setUsernameAvailable(null);
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
    } catch (_e) {
      setUsernameAvailable(null);
    } finally {
      setCheckingUsername(false);
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    const usernameValid = !!username.trim() && validateUsernameFormat(username) && usernameAvailable === true;
    const unitsValid = data.measurementSystem === 'imperial' || data.measurementSystem === 'metric';
    const frequencyValid = !!data.workoutFrequency;
    return usernameValid && unitsValid && frequencyValid;
  };

  const handleComplete = async () => {
    if (!canProceed()) return;

    setLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');

      // Convert optional weight to kg if provided
      const weightKg = data.weight
        ? (data.measurementSystem === 'imperial' ? Math.round((parseFloat(data.weight) || 0) * 0.453592 * 10) / 10 : parseFloat(data.weight))
        : null;

      // Update profile with simplified data (avoid non-existent columns)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          username: username.trim(),
          age: data.age ? parseInt(data.age) : null,
          location: data.location || null,
          primary_goal: (data as any).goals?.[0] || null,
          goals: (data as any).goals && (data as any).goals.length ? (data as any).goals : null,
          workout_frequency: data.workoutFrequency,
          preferred_workout_duration: data.preferredDuration || null,
          experience_years: data.experienceYears ? parseInt(data.experienceYears) : null,
          has_completed_onboarding: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (profileError) throw profileError;

      // Create or update measurement preferences
      const { error: measurementError } = await supabase
        .from('user_measurement_preferences')
        .upsert({
          user_id: user.id,
          measurement_system: data.measurementSystem,
          weight_unit: data.measurementSystem === 'imperial' ? 'lbs' : 'kg',
          distance_unit: data.measurementSystem === 'imperial' ? 'miles' : 'km',
          height_unit: data.measurementSystem === 'imperial' ? 'ft' : 'cm',
          temperature_unit: data.measurementSystem === 'imperial' ? 'f' : 'c',
          updated_at: new Date().toISOString(),
        });

      if (measurementError) {
        // Suppress table missing error on first-run environments
        if ((measurementError as any).code !== '42P01') {
          throw measurementError;
        }
      }

      // Optionally store last known weight in preferences if table exists
      if (weightKg !== null) {
        try {
          await supabase
            .from('user_measurement_preferences')
            .update({ last_weight_kg: weightKg, updated_at: new Date().toISOString() })
            .eq('user_id', user.id);
        } catch (e) {
          // ignore if column/table not present
        }
      }

      // Navigate to main app
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Onboarding error:', error);
      Alert.alert('Error', 'Failed to save your preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('profiles')
        .upsert({ id: user.id, has_completed_onboarding: true, updated_at: new Date().toISOString() }, { onConflict: 'id' });

      router.replace('/(tabs)');
    } catch (_e) {
      router.replace('/(tabs)');
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Username</Text>
              <TextInput
                style={[styles.textInput, { 
                  borderColor: colors.border,
                  backgroundColor: colors.inputBackground,
                  color: colors.text
                }]}
                placeholder="Pick a unique handle"
                placeholderTextColor={colors.textSecondary}
                value={username}
                onChangeText={(t) => { setUsername(t); checkUsername(t); }}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={30}
              />
              {username.length > 0 && (
                <Text style={{ marginTop: 6, color: colors.textSecondary, fontSize: 12 }}>
                  {checkingUsername ? 'Checking availability...' : usernameAvailable === true ? 'Available' : usernameAvailable === false ? 'Unavailable or invalid' : 'Use letters, numbers, underscores (3-30)'}
                </Text>
              )}
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Age</Text>
              <TextInput
                style={[styles.textInput, { 
                  borderColor: colors.border,
                  backgroundColor: colors.inputBackground,
                  color: colors.text
                }]}
                placeholder="Enter your age"
                placeholderTextColor={colors.textSecondary}
                value={data.age}
                onChangeText={(value) => updateData('age', value)}
                keyboardType="numeric"
                maxLength={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Country</Text>
              <View style={styles.locationInputContainer}>
                <TextInput
                  style={[
                    styles.textInput,
                    { 
                      borderColor: colors.border,
                      backgroundColor: colors.inputBackground,
                      color: colors.text,
                      marginBottom: showLocationSuggestions && filteredCountries.length > 0 ? 0 : 0,
                      borderBottomLeftRadius: showLocationSuggestions && filteredCountries.length > 0 ? 0 : 8,
                      borderBottomRightRadius: showLocationSuggestions && filteredCountries.length > 0 ? 0 : 8
                    }
                  ]}
                  placeholder="e.g., United States"
                  placeholderTextColor={colors.textSecondary}
                  value={data.location}
                  onChangeText={(value) => {
                    updateData('location', value);
                    setShowLocationSuggestions(true);
                  }}
                  onFocus={() => setShowLocationSuggestions(true)}
                />
                
                {showLocationSuggestions && filteredCountries.length > 0 && (
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
                    {filteredCountries.map((suggestion, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.suggestionItem,
                          { borderBottomColor: colors.border }
                        ]}
                        onPress={() => {
                          updateData('location', suggestion);
                          setShowLocationSuggestions(false);
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
            </View>

            {/* Units */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Units</Text>
            <TouchableOpacity
              style={[
                styles.measurementCard,
                { backgroundColor: colors.card, borderColor: data.measurementSystem === 'metric' ? colors.tint : colors.border }
              ]}
              onPress={() => updateData('measurementSystem', 'metric')}
            >
              <View style={styles.measurementContent}>
                <View style={styles.measurementHeader}>
                  <Text style={[styles.measurementTitle, { color: colors.text }]}>Metric (KG)</Text>
                  {data.measurementSystem === 'metric' && (<Check size={20} color={colors.tint} />)}
                </View>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.measurementCard,
                { backgroundColor: colors.card, borderColor: data.measurementSystem === 'imperial' ? colors.tint : colors.border }
              ]}
              onPress={() => updateData('measurementSystem', 'imperial')}
            >
              <View style={styles.measurementContent}>
                <View style={styles.measurementHeader}>
                  <Text style={[styles.measurementTitle, { color: colors.text }]}>Imperial (LBS)</Text>
                  {data.measurementSystem === 'imperial' && (<Check size={20} color={colors.tint} />)}
                </View>
              </View>
            </TouchableOpacity>

            {/* Optional Weight */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Weight (optional)</Text>
              <TextInput
                style={[styles.textInput, { 
                  borderColor: colors.border,
                  backgroundColor: colors.inputBackground,
                  color: colors.text
                }]}
                placeholder={data.measurementSystem === 'imperial' ? 'Enter weight in lbs' : 'Enter weight in kg'}
                placeholderTextColor={colors.textSecondary}
                value={data.weight as any}
                onChangeText={(value) => updateData('weight' as any, value)}
                keyboardType="numeric"
                maxLength={4}
              />
            </View>

            {/* Frequency */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>How often do you work out?</Text>
            {WORKOUT_FREQUENCIES.map((freq) => (
              <TouchableOpacity
                key={freq.value}
                style={[
                  styles.optionCard,
                  { backgroundColor: colors.card, borderColor: data.workoutFrequency === freq.value ? colors.tint : colors.border }
                ]}
                onPress={() => updateData('workoutFrequency', freq.value)}
              >
                <View style={styles.optionContent}>
                  <Text style={[styles.optionTitle, { color: colors.text }]}>{freq.label}</Text>
                  {data.workoutFrequency === freq.value && (<Check size={20} color={colors.tint} />)}
                </View>
              </TouchableOpacity>
            ))}

            {/* Optional Preferred Duration */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Preferred session length (optional)</Text>
            {WORKOUT_DURATIONS.map((dur) => (
              <TouchableOpacity
                key={dur.value}
                style={[
                  styles.optionCard,
                  { backgroundColor: colors.card, borderColor: data.preferredDuration === dur.value ? colors.tint : colors.border }
                ]}
                onPress={() => updateData('preferredDuration' as any, dur.value)}
              >
                <View style={styles.optionContent}>
                  <Text style={[styles.optionTitle, { color: colors.text }]}>{dur.label}</Text>
                  {data.preferredDuration === dur.value && (<Check size={20} color={colors.tint} />)}
                </View>
              </TouchableOpacity>
            ))}

            {/* Goals Multi-select */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>What’s your purpose? (select multiple)</Text>
            <View style={styles.goalsGrid}>
              {PRIMARY_GOALS.map((goal) => {
                const selected = (data as any).goals?.includes(goal.value);
                return (
                  <TouchableOpacity
                    key={goal.value}
                    style={[
                      styles.goalCard,
                      { backgroundColor: colors.card, borderColor: selected ? colors.tint : colors.border }
                    ]}
                    onPress={() => {
                      const current = (data as any).goals || [];
                      const next = selected ? current.filter((g: string) => g !== goal.value) : [...current, goal.value];
                      updateData('goals' as any, next as any);
                    }}
                  >
                    <View style={styles.goalContent}>
                      <Text style={[styles.goalTitle, { color: colors.text }]}>{goal.label}</Text>
                      {selected && (<Check size={16} color={colors.tint} style={styles.goalCheck} />)}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Optional Experience Years */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Training experience (years, optional)</Text>
              <TextInput
                style={[styles.textInput, { 
                  borderColor: colors.border,
                  backgroundColor: colors.inputBackground,
                  color: colors.text
                }]}
                placeholder="e.g., 0, 1, 2"
                placeholderTextColor={colors.textSecondary}
                value={(data.experienceYears || '') as any}
                onChangeText={(value) => updateData('experienceYears' as any, value)}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>
          </View>
        );

      case 1:
        return (
          <View />
        );

      case 2:
        return (
          <View />
        );

      case 3:
        return (
          <View />
        );

      case 4:
        return (
          <View />
        );

      default:
        return null;
    }
  };

  return (
    <TouchableWithoutFeedback onPress={() => {
      Keyboard.dismiss();
      setShowLocationSuggestions(false);
      setShowExperienceSuggestions(false);
    }}>
      <KeyboardAvoidingView 
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      {/* Header */}
      <LinearGradient
        colors={theme === 'dark' 
          ? ['rgba(99, 102, 241, 0.2)', 'rgba(168, 85, 247, 0.15)', 'transparent']
          : ['rgba(99, 102, 241, 0.15)', 'rgba(168, 85, 247, 0.1)', 'transparent']
        }
        style={styles.header}
      >
        <View style={styles.headerContent}>
          {/* Single-step flow: add Skip for low friction */}

          <View style={styles.headerText}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>
              Quick Setup
            </Text>
            <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
              Just a few details to personalize
            </Text>
          </View>

          <TouchableOpacity onPress={handleSkip} accessibilityRole="button">
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>Skip</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {renderStepContent()}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.nextButton,
            { 
              backgroundColor: canProceed() ? colors.tint : colors.border,
              opacity: canProceed() ? 1 : 0.5
            }
          ]}
          onPress={handleComplete}
          disabled={!canProceed() || loading}
        >
          <Text style={[styles.nextButtonText, { color: canProceed() ? '#fff' : colors.textSecondary }]}>
            {loading ? 'Saving...' : 'Get Started'}
          </Text>
          <ChevronRight size={20} color={canProceed() ? '#fff' : colors.textSecondary} />
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const COUNTRIES_LIST = [
  'Afghanistan',
  'Albania',
  'Algeria',
  'Andorra',
  'Angola',
  'Antigua and Barbuda',
  'Argentina',
  'Armenia',
  'Australia',
  'Austria',
  'Azerbaijan',
  'Bahamas',
  'Bahrain',
  'Bangladesh',
  'Barbados',
  'Belarus',
  'Belgium',
  'Belize',
  'Benin',
  'Bhutan',
  'Bolivia',
  'Bosnia and Herzegovina',
  'Botswana',
  'Brazil',
  'Brunei',
  'Bulgaria',
  'Burkina Faso',
  'Burundi',
  'Cabo Verde',
  'Cambodia',
  'Cameroon',
  'Canada',
  'Central African Republic',
  'Chad',
  'Chile',
  'China',
  'Colombia',
  'Comoros',
  'Congo (Congo-Brazzaville)',
  'Costa Rica',
  'Croatia',
  'Cuba',
  'Cyprus',
  'Czech Republic (Czechia)',
  'Denmark',
  'Djibouti',
  'Dominica',
  'Dominican Republic',
  'East Timor (Timor-Leste)',
  'Ecuador',
  'Egypt',
  'El Salvador',
  'Equatorial Guinea',
  'Eritrea',
  'Estonia',
  'Eswatini (Swaziland)',
  'Ethiopia',
  'Fiji',
  'Finland',
  'France',
  'Gabon',
  'Gambia',
  'Georgia',
  'Germany',
  'Ghana',
  'Greece',
  'Grenada',
  'Guatemala',
  'Guinea',
  'Guinea-Bissau',
  'Guyana',
  'Haiti',
  'Honduras',
  'Hungary',
  'Iceland',
  'India',
  'Indonesia',
  'Iran',
  'Iraq',
  'Ireland',
  'Israel',
  'Italy',
  'Jamaica',
  'Japan',
  'Jordan',
  'Kazakhstan',
  'Kenya',
  'Kiribati',
  'Korea, North (North Korea)',
  'Korea, South (South Korea)',
  'Kosovo',
  'Kuwait',
  'Kyrgyzstan',
  'Laos',
  'Latvia',
  'Lebanon',
  'Lesotho',
  'Liberia',
  'Libya',
  'Liechtenstein',
  'Lithuania',
  'Luxembourg',
  'Madagascar',
  'Malawi',
  'Malaysia',
  'Maldives',
  'Mali',
  'Malta',
  'Marshall Islands',
  'Mauritania',
  'Mauritius',
  'Mexico',
  'Micronesia',
  'Moldova',
  'Monaco',
  'Mongolia',
  'Montenegro',
  'Morocco',
  'Mozambique',
  'Myanmar (Burma)',
  'Namibia',
  'Nauru',
  'Nepal',
  'Netherlands',
  'New Zealand',
  'Nicaragua',
  'Niger',
  'Nigeria',
  'North Macedonia',
  'Norway',
  'Oman',
  'Pakistan',
  'Palau',
  'Palestine',
  'Panama',
  'Papua New Guinea',
  'Paraguay',
  'Peru',
  'Philippines',
  'Poland',
  'Portugal',
  'Qatar',
  'Romania',
  'Russia',
  'Rwanda',
  'Saint Kitts and Nevis',
  'Saint Lucia',
  'Saint Vincent and the Grenadines',
  'Samoa',
  'San Marino',
  'Sao Tome and Principe',
  'Saudi Arabia',
  'Senegal',
  'Serbia',
  'Seychelles',
  'Sierra Leone',
  'Singapore',
  'Slovakia',
  'Slovenia',
  'Solomon Islands',
  'Somalia',
  'South Africa',
  'South Sudan',
  'Spain',
  'Sri Lanka',
  'Sudan',
  'Suriname',
  'Sweden',
  'Switzerland',
  'Syria',
  'Taiwan',
  'Tajikistan',
  'Tanzania',
  'Thailand',
  'Togo',
  'Tonga',
  'Trinidad and Tobago',
  'Tunisia',
  'Turkey',
  'Turkmenistan',
  'Tuvalu',
  'Uganda',
  'Ukraine',
  'United Arab Emirates',
  'United Kingdom',
  'United States',
  'Uruguay',
  'Uzbekistan',
  'Vanuatu',
  'Vatican City (Holy See)',
  'Venezuela',
  'Vietnam',
  'Yemen',
  'Zambia',
  'Zimbabwe'
];
