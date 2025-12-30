import { AppState } from 'react-native';
import "react-native-url-polyfill/auto";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Get environment variables from multiple sources
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  Constants.expoConfig?.extra?.supabaseUrl ||
  'https://placeholder.supabase.co';

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  Constants.expoConfig?.extra?.supabaseAnonKey ||
  'placeholder-key';

// Validate configuration
const isConfigured = supabaseUrl && supabaseAnonKey &&
  !supabaseUrl.includes('placeholder') &&
  supabaseAnonKey !== 'placeholder-key';

if (__DEV__ && !isConfigured) {
  console.error(`
╔════════════════════════════════════════════════════════════════╗
║  SUPABASE CONFIGURATION REQUIRED                               ║
╚════════════════════════════════════════════════════════════════╝

Please configure your Supabase credentials:

Option 1: Create mobile/.env file:
  EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
  EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

Option 2: Add to app.json under "extra":
  "extra": {
    "supabaseUrl": "https://your-project.supabase.co",
    "supabaseAnonKey": "your-anon-key"
  }

Get credentials from: https://app.supabase.com/project/_/settings/api
  `);
}

import { logProcess } from './error-logger';

// Export configuration status
export const isSupabaseConfigured = isConfigured;

const client = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-application-name': 'tcsygo-mobile',
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Add logging proxy for development
export const supabase = __DEV__ ? new Proxy(client, {
  get(target, prop, receiver) {
    const original = Reflect.get(target, prop, receiver);

    // Log calls to from, auth, storage etc.
    if (typeof original === 'function' && ['from', 'auth', 'storage', 'rpc'].includes(prop as string)) {
      return (...args: any[]) => {
        logProcess(`Supabase.${prop as string}`, 'start', { args });
        return original.apply(target, args);
      };
    }
    return original;
  }
}) : client;

// Tells Supabase Auth to continuously refresh the session automatically if
// the app is in the foreground. When this is added, you will continue to receive
// `onAuthStateChange` events with the `TOKEN_REFRESHED` or `SIGNED_OUT` event
// if the user's session is terminated. This should only be registered once.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh()
  } else {
    supabase.auth.stopAutoRefresh()
  }
})
