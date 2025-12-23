import { createClient } from '@supabase/supabase-js';

// Environment variables for Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
const isConfigured = supabaseUrl && supabaseAnonKey &&
  !supabaseUrl.includes('placeholder') &&
  supabaseAnonKey !== 'placeholder';

if (!isConfigured) {
  const errorMessage = `
╔════════════════════════════════════════════════════════════════╗
║  SUPABASE CONFIGURATION REQUIRED                               ║
╚════════════════════════════════════════════════════════════════╝

Please configure your Supabase credentials in the .env file:

1. Copy .env.example to .env
2. Add your Supabase credentials:
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key

Get your credentials from: https://app.supabase.com/project/_/settings/api
  `.trim();

  console.error(errorMessage);
}

// Create Supabase client with fallback for development
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storageKey: 'tcsygo-auth',
    },
    global: {
      headers: {
        'x-application-name': 'tcsygo-web',
      },
    },
    db: {
      schema: 'public',
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

// Export configuration status for use in components
export const isSupabaseConfigured = isConfigured;
