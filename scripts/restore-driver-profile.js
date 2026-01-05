
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function restoreProfile() {
    const email = 'snehal.driver@tcsygo.com';
    console.log(`Restoring profile for ${email}...`);

    const { data: users, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

    if (userError || !users) {
        console.error('User not found:', userError);
        return;
    }

    const userId = users.id;
    console.log(`User ID: ${userId}`);

    // Try minimal insert
    console.log('Attempting minimal insert...');
    try {
        const { data, error } = await supabase
            .from('drivers')
            .insert({
                user_id: userId,
                vehicle_type: 'car',
                vehicle_make: 'Hyundai',
                vehicle_model: 'Creta',
                vehicle_number: 'MH-12-PQ-9988',
                license_number: 'PN-4455667788'
            })
            .select()
            .single();

        if (error) {
            console.log('--- SUPABASE ERROR ---');
            console.log(JSON.stringify(error, null, 2));
            console.log('----------------------');
        } else {
            console.log('✅ Driver profile created:', data.id);
        }
    } catch (e) {
        console.error('EXCEPTION:', e);
    }
}

restoreProfile().catch(e => console.error('Top Level Error:', e));
