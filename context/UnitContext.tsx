import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

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

  useEffect(() => {
    loadUserUnits();
  }, []);

  const loadUserUnits = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // First try RPC for performance and centralized logic
      const { data, error } = await supabase.rpc('get_user_measurement_units', {
        p_user_id: user.id
      });

      if (!error && data && data.length > 0) {
        setUnits({
          measurement_system: data[0].measurement_system,
          weight_unit: data[0].weight_unit,
          distance_unit: data[0].distance_unit,
          height_unit: data[0].height_unit,
          temperature_unit: data[0].temperature_unit,
        });
      } else {
        // Fallback: read directly from user_measurement_preferences if RPC missing
        const { data: tableData, error: tableError } = await supabase
          .from('user_measurement_preferences')
          .select('measurement_system, weight_unit, distance_unit, height_unit, temperature_unit')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!tableError && tableData) {
          setUnits({
            measurement_system: tableData.measurement_system,
            weight_unit: tableData.weight_unit,
            distance_unit: tableData.distance_unit,
            height_unit: tableData.height_unit,
            temperature_unit: tableData.temperature_unit,
          });
        } else if (tableError) {
          // Suppress noisy error if table does not exist; keep defaults silently
          if ((tableError as any).code === '42P01') {
            // relation does not exist → migration likely not applied yet
          } else {
            console.error('Error loading user units (fallback):', tableError);
          }
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
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updatedUnits = { ...units, ...newUnits };
      
      const { error } = await supabase
        .from('user_measurement_preferences')
        .upsert({
          user_id: user.id,
          ...updatedUnits,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error updating units:', error);
        throw error;
      }

      setUnits(updatedUnits);
    } catch (error) {
      console.error('Error updating units:', error);
      throw error;
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
  };

  return (
    <UnitContext.Provider value={value}>
      {children}
    </UnitContext.Provider>
  );
}; 