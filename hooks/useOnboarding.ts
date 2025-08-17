import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export const useOnboarding = () => {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setHasCompletedOnboarding(false);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc('has_completed_onboarding', {
        p_user_id: user.id
      });

      if (error) {
        console.error('Error checking onboarding status:', error);
        setHasCompletedOnboarding(false);
      } else {
        setHasCompletedOnboarding(data);
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setHasCompletedOnboarding(false);
    } finally {
      setLoading(false);
    }
  };

  const markOnboardingComplete = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return false;

      const { error } = await supabase
        .from('profiles')
        .update({
          has_completed_onboarding: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error marking onboarding complete:', error);
        return false;
      }

      setHasCompletedOnboarding(true);
      return true;
    } catch (error) {
      console.error('Error marking onboarding complete:', error);
      return false;
    }
  };

  return {
    hasCompletedOnboarding,
    loading,
    checkOnboardingStatus,
    markOnboardingComplete,
  };
};
