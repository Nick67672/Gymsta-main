import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Resolve environment variables with multiple fallbacks (process.env first, then Expo extra)
const resolveEnv = (key: string): string | undefined => {
  const fromProcess = (process.env as any)?.[key];
  if (fromProcess) return fromProcess.trim();

  // Expo config (works in dev & production builds)
  const extra = (Constants?.expoConfig as any)?.extra ?? (Constants?.manifest2 as any)?.extra ?? {};
  const fromExpo = extra?.[key];
  return typeof fromExpo === 'string' ? fromExpo.trim() : undefined;
};

const supabaseUrl = resolveEnv('EXPO_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = resolveEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase env not found. Falling back to placeholder client. Ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set via app.config.js');
}

const effectiveUrl = supabaseUrl ?? 'https://invalid-project.supabase.co';
const effectiveAnonKey = supabaseAnonKey ?? 'public-anon-key';

console.log('Initializing Supabase client...', effectiveUrl); // Debug log for production builds

export const supabase = createClient<Database>(
  effectiveUrl,
  effectiveAnonKey,
  {
    auth: {
      persistSession: true,
      detectSessionInUrl: false,
      autoRefreshToken: true,
      storage: AsyncStorage,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
    global: {
      headers: {
        'X-Client-Info': 'expo-router',
      },
    },
  }
);