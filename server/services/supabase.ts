import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key';

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export type Database = {
  public: {
    Tables: {
      users: any;
      drivers: any;
      trips: any;
      bookings: any;
      payments: any;
      ratings: any;
      live_locations: any;
      notifications: any;
    };
  };
};
