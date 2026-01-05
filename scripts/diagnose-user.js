
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function diagnose() {
    const userId = '0e8ac538-c538-47c5-9127-f2839aedbb93';
    console.log(`Diagnosing user: ${userId}`);

    // 1. Check User Table
    const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

    if (userError) console.error('User Error:', userError);
    else console.log('User Record:', user);

    // 2. Check Driver Table
    const { data: driver, error: driverError } = await supabase
        .from('drivers')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(); // Use maybeSingle to avoid 406/JSON error if not found? No, library handles it.

    if (driverError) console.error('Driver Error:', driverError);
    else console.log('Driver Record:', driver);

    // 3. Check Auth User (admin)
    const { data: { user: authUser }, error: authError } = await supabase.auth.admin.getUserById(userId);
    if (authError) console.error('Auth Error:', authError);
    else console.log('Auth Metadata:', authUser.user_metadata, 'Email:', authUser.email);
}

diagnose();
