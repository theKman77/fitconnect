import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { config, isBackendConfigured } from './config';

/**
 * Supabase client. When credentials are absent (before the owner has wired up
 * their project) we still construct a client against a placeholder URL so the
 * app boots; screens gate real calls behind `isBackendConfigured` and fall back
 * to seeded demo data. See docs/SETUP.md.
 */
const url = isBackendConfigured ? config.supabaseUrl : 'https://placeholder.supabase.co';
const key = isBackendConfigured ? config.supabaseAnonKey : 'placeholder-anon-key';

export const supabase = createClient(url, key, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export { isBackendConfigured };
