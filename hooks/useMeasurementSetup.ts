import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export const useMeasurementSetup = () => {
  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkMeasurementSetup();
  }, []);

  const checkMeasurementSetup = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Check if user has measurement preferences
      const { data, error } = await supabase
        .from('user_measurement_preferences')
        .select('measurement_system')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        // If table is missing (42P01), treat as not set up but don't log noisy error
        if ((error as any).code !== '42P01') {
          console.error('Error checking measurement setup:', error);
        }
        setNeedsSetup(true);
      } else if (!data) {
        // No measurement preferences found, user needs setup
        setNeedsSetup(true);
      } else {
        // User has measurement preferences
        setNeedsSetup(false);
      }
    } catch (error) {
      console.error('Error checking measurement setup:', error);
      setNeedsSetup(true);
    } finally {
      setLoading(false);
    }
  };

  return { needsSetup, loading, checkMeasurementSetup, setNeedsSetup };
};
