
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase URL or Anon Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAccess() {
    console.log('Testing connection to:', supabaseUrl);

    try {
        // 3. Test Authenticated Access (like Browser)
        console.log('\n--- Testing Authenticated Access ---');
        console.log('Attempting sign in for test user...');

        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: 'amit.passenger@tcsygo.com',
            password: 'Test@123'
        });

        if (authError) {
            console.error('❌ Sign in failed:', authError.message);
            return;
        }

        console.log('✅ Signed in successfully, User ID:', authData.user.id);

        console.log(`Attempting to fetch profile for: ${authData.user.id}`);
        const start2 = Date.now();
        const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', authData.user.id)
            .single();
        const duration2 = Date.now() - start2;

        if (profileError) {
            console.error('❌ Authenticated fetch failed:', profileError);
        } else {
            console.log(`✅ Authenticated fetch successful in ${duration2}ms:`, profile?.full_name);
        }

    } catch (err) {
        console.error('❌ Unexpected error:', err);
    }
}

testAccess();
