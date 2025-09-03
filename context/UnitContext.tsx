import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface MeasurementUnits {
  measurement_system: 'imperial' | 'metric';
  weight_unit: 'lbs' | 'kg';
  distance_unit: 'miles' | 'km';
  height_unit: 'ft' | 'cm';
  temperature_unit: 'f' | 'c';
}

interface UnitContextType {
  units: MeasurementUnits;
  loading: boolean;
  updateUnits: (newUnits: Partial<MeasurementUnits>) => Promise<void>;
  convertWeight: (value: number, from: 'lbs' | 'kg', to: 'lbs' | 'kg') => number;
  convertDistance: (value: number, from: 'miles' | 'km', to: 'miles' | 'km') => number;
  convertHeight: (value: number, from: 'ft' | 'cm', to: 'ft' | 'cm') => number;
  formatWeight: (value: number, fromUnit?: 'lbs' | 'kg', toUnit?: 'lbs' | 'kg') => string;
  formatDistance: (value: number, unit?: 'miles' | 'km') => string;
  formatHeight: (value: number, unit?: 'ft' | 'cm') => string;
  getWeightIncrement: (incrementType: 'small' | 'large') => number;
}

const defaultUnits: MeasurementUnits = {
  measurement_system: 'imperial',
  weight_unit: 'lbs',
  distance_unit: 'miles',
  height_unit: 'ft',
  temperature_unit: 'f',
};

const UnitContext = createContext<UnitContextType | undefined>(undefined);

export const useUnits = () => {
  const context = useContext(UnitContext);
  if (context === undefined) {
    throw new Error('useUnits must be used within a UnitProvider');
  }
  return context;
};

interface UnitProviderProps {
  children: ReactNode;
}

export const UnitProvider: React.FC<UnitProviderProps> = ({ children }) => {
  const [units, setUnits] = useState<MeasurementUnits>(defaultUnits);
  const [loading, setLoading] = useState(true);
  const STORAGE_KEY = 'user_measurement_units_v1';

  useEffect(() => {
    loadUserUnits();
  }, []);

  const loadUserUnits = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found, attempting to load units from local storage');
        try {
          const stored = await AsyncStorage.getItem(STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored) as MeasurementUnits;
            setUnits(parsed);
            console.log('Loaded units from local storage (no user):', parsed);
          }
        } catch (storageErr) {
          console.warn('Failed to load units from local storage:', storageErr);
        }
        setLoading(false);
        return;
      }

      console.log('Loading units for user:', user.id);

      // Try direct table access first (more reliable)
      const { data: tableData, error: tableError } = await supabase
        .from('user_measurement_preferences')
        .select('measurement_system, weight_unit, distance_unit, height_unit, temperature_unit')
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('Direct table access result:', { tableData, tableError });

      if (!tableError && tableData) {
        const loadedUnits = {
          measurement_system: tableData.measurement_system,
          weight_unit: tableData.weight_unit,
          distance_unit: tableData.distance_unit,
          height_unit: tableData.height_unit,
          temperature_unit: tableData.temperature_unit,
        };
        console.log('Setting units from direct table access:', loadedUnits);
        setUnits(loadedUnits);
        try {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(loadedUnits));
        } catch (e) {
          console.warn('Failed to cache loaded units to local storage:', e);
        }
      } else if (tableError) {
        // Check if table doesn't exist
        if ((tableError as any).code === '42P01') {
          console.log('Table does not exist, using default units');
          // relation does not exist → migration likely not applied yet
        } else {
          console.error('Error loading user units:', tableError);
        }
        // Attempt to load from local storage as a fallback
        try {
          const stored = await AsyncStorage.getItem(STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored) as MeasurementUnits;
            setUnits(parsed);
            console.log('Loaded units from local storage (fallback after table error):', parsed);
          }
        } catch (storageErr) {
          console.warn('Failed to load units from local storage (fallback):', storageErr);
        }
      } else {
        console.log('No user preferences found, creating default preferences');
        // Create default preferences for the user
        try {
          const { error: createError } = await supabase
            .from('user_measurement_preferences')
            .insert({
              user_id: user.id,
              measurement_system: 'imperial',
              weight_unit: 'lbs',
              distance_unit: 'miles',
              height_unit: 'ft',
              temperature_unit: 'f',
            });

          if (createError) {
            console.error('Error creating default preferences:', createError);
          } else {
            console.log('Created default preferences for user');
          }
        } catch (createError) {
          console.error('Error creating default preferences:', createError);
        }
        // Also try loading any locally stored preferences
        try {
          const stored = await AsyncStorage.getItem(STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored) as MeasurementUnits;
            setUnits(parsed);
            console.log('Loaded units from local storage (no prefs found):', parsed);
          }
        } catch (storageErr) {
          console.warn('Failed to load units from local storage (no prefs found):', storageErr);
        }
      }
      // If no data is returned, keep default units
    } catch (error) {
      console.error('Error loading user units:', error);
      // Keep default units if there's an error
    } finally {
      setLoading(false);
    }
  };

  const updateUnits = async (newUnits: Partial<MeasurementUnits>) => {
    const updatedUnits = { ...units, ...newUnits };
    console.log('Updating units (optimistic):', { current: units, new: newUnits, updated: updatedUnits });

    // Optimistically update local state
    setUnits(updatedUnits);

    // Persist to local storage regardless of auth state
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUnits));
    } catch (e) {
      console.warn('Failed to persist units to local storage:', e);
    }

    // Try to sync with server if user is logged in
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found, skipped remote sync for units');
        return;
      }

      // Lightweight ping to avoid noisy errors when table doesn't exist
      const { error: pingError } = await supabase
        .from('user_measurement_preferences')
        .select('user_id')
        .eq('user_id', user.id)
        .limit(1);
      if (pingError) {
        const anyPing: any = pingError as any;
        if (anyPing?.code === '42P01') {
          console.log('Measurement preferences table missing; skipping remote sync');
          return;
        }
        // If another unexpected ping error occurs, skip remote sync silently
        console.log('Skipping remote sync due to preflight error');
        return;
      }

      const { error } = await supabase
        .from('user_measurement_preferences')
        .upsert(
          {
            user_id: user.id,
            ...updatedUnits,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (error) {
        const anyErr: any = error as any;
        const code = anyErr?.code ?? 'unknown';
        const message = anyErr?.message ?? 'unknown error';
        const details = anyErr?.details ?? undefined;
        console.error('Error updating units in database (non-fatal):', { code, message, details });
      } else {
        console.log('Successfully updated units in database');
      }
    } catch (error) {
      console.error('Unexpected error syncing units to server (non-fatal):', error);
    }
  };

  // Conversion functions
  const convertWeight = (value: number, from: 'lbs' | 'kg', to: 'lbs' | 'kg'): number => {
    if (from === to) return value;
    
    if (from === 'lbs' && to === 'kg') {
      return value * 0.453592;
    } else if (from === 'kg' && to === 'lbs') {
      return value * 2.20462;
    }
    
    return value;
  };

  const convertDistance = (value: number, from: 'miles' | 'km', to: 'miles' | 'km'): number => {
    if (from === to) return value;
    
    if (from === 'miles' && to === 'km') {
      return value * 1.60934;
    } else if (from === 'km' && to === 'miles') {
      return value * 0.621371;
    }
    
    return value;
  };

  const convertHeight = (value: number, from: 'ft' | 'cm', to: 'ft' | 'cm'): number => {
    if (from === to) return value;
    
    if (from === 'ft' && to === 'cm') {
      return value * 30.48;
    } else if (from === 'cm' && to === 'ft') {
      return value * 0.0328084;
    }
    
    return value;
  };

  // Formatting functions
  const formatWeight = (value: number, fromUnit?: 'lbs' | 'kg', toUnit?: 'lbs' | 'kg'): string => {
    const targetUnit = toUnit || units.weight_unit;
    const sourceUnit = fromUnit || 'kg'; // Default assumption: weights are stored in kg
    
    // Convert the value to the target unit
    const convertedValue = convertWeight(value, sourceUnit, targetUnit);
    return `${convertedValue.toFixed(1)} ${targetUnit}`;
  };

  const formatDistance = (value: number, unit?: 'miles' | 'km'): string => {
    const targetUnit = unit || units.distance_unit;
    return `${value.toFixed(1)} ${targetUnit}`;
  };

  const formatHeight = (value: number, unit?: 'ft' | 'cm'): string => {
    const targetUnit = unit || units.height_unit;
    return `${value.toFixed(1)} ${targetUnit}`;
  };

  // Utility function for weight increments
  const getWeightIncrement = (incrementType: 'small' | 'large') => {
    if (units.weight_unit === 'lbs') {
      return incrementType === 'small' ? 5 : 10;
    } else { // metric
      return incrementType === 'small' ? 2.5 : 5;
    }
  };

  const value: UnitContextType = {
    units,
    loading,
    updateUnits,
    convertWeight,
    convertDistance,
    convertHeight,
    formatWeight,
    formatDistance,
    formatHeight,
    getWeightIncrement,
  };

  return (
    <UnitContext.Provider value={value}>
      {children}
    </UnitContext.Provider>
  );
}; 