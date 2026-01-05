import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from root
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
// Using SERVICE_ROLE key if available would be better for deletions to bypass RLS, 
// but user environment might only have ANON. 
// However, deletions might require admin rights or RLS policies allowing it.
// The prompted `debug-trips.js` used ANON key. 
// If RLS prevents deletion, we might need SERVICE_ROLE key.
// I'll check if SERVICE_ROLE key is in .env or I'll try with available key.
// Usually backend scripts use SERVICE_ROLE.
// Let's check .env file content first? No, I shouldn't read .env directly if I can avoid it (security).
// But I can try to use SUPABASE_SERVICE_KEY if it exists in process.env, else fallback.
// The `debug-trips.js` used `VITE_SUPABASE_ANON_KEY`.
// I'll stick to what I see but I'll check if I can 'delete' with anon key.
// If RLS is set to 'auth.uid() = passenger_id', then anon key (client) can't delete other people's data.
// This is a "clear all" admin task. I should unlikely be able to do this with ANON key unless I have a service role key.
// Let's assume there is a SERVICE_ROLE key or I should look for it.
// `debug-trips.js` only did SELECT.
// I'll check `package.json` to see if there are other scripts using service key.
// `scripts/fix-user-roles.js` might use it.

// Let's check `fix-user-roles.js` content quickly in my thought process or effectively in the script...
// Actually, I'll just try to load `SUPABASE_SERVICE_ROLE_KEY` or `SERVICE_ROLE_KEY` from env.

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

// If no service key, warn user, but try with Anon (might fail).
const targetKey = supabaseServiceKey || supabaseKey;

if (!supabaseUrl || !targetKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, targetKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function clearTrips() {
    console.log('--- STARTING CLEARANCE ---');
    console.log('Using key:', targetKey === supabaseServiceKey ? 'SERVICE_ROLE (Admin)' : 'ANON (Public/User)');

    const tablesToClear = [
        'payments',
        'ride_insurance',
        'driver_tips',
        'split_fare_requests',
        'ride_sharing_invites',
        'ride_sharing_matches',
        'ride_recordings',
        'safety_checkins',
        'emergency_alerts',
        'trip_surge_pricing',
        'promo_code_uses',
        'bookings',       // Cascades to trips usually
        'trips',          // Explicit cleanup
        'ride_requests'
    ];

    // Helper to delete all generic
    const deleteAll = async (table) => {
        // Check count first
        const { count, error: countError } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
        
        if (countError) {
             console.error(`Error counting ${table}:`, countError.message);
             return;
        }

        if (count === 0) {
            console.log(`${table}: Already empty.`);
            return;
        }

        console.log(`${table}: Found ${count} records. Deleting...`);

        const { error } = await supabase
            .from(table)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all valid UUIDs

        if (error) {
            console.error(`Error deleting from ${table}:`, error.message);
        } else {
            console.log(`${table}: Cleared successfully.`);
        }
    };

    // 1. Clear Tables
    for (const table of tablesToClear) {
        await deleteAll(table);
    }

    // 2. Clear Wallet Transactions (Conditional)
    // Only 'booking', 'refund', 'tip'
    const walletTypes = ['booking', 'refund', 'tip'];
    console.log(`wallet_transactions: Clearing types ${walletTypes.join(', ')}...`);
    
    // Check count
    const { count: wCount } = await supabase
        .from('wallet_transactions')
        .select('*', { count: 'exact', head: true })
        .in('reference_type', walletTypes);

    if (wCount > 0) {
        const { error: wError } = await supabase
            .from('wallet_transactions')
            .delete()
            .in('reference_type', walletTypes);
        
        if (wError) console.error('Error clearing wallet transactions:', wError.message);
        else console.log(`wallet_transactions: Cleared ${wCount} records.`);
    } else {
        console.log('wallet_transactions: No relevant records found.');
    }

    console.log('--- CLEARANCE COMPLETE ---');
}

clearTrips();
