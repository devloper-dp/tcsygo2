import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
// We can use the same logic as clear-trips for key if needed, 
// but for SELECT count, ANON might be enough if RLS allows reading (or returns 0 if restricted, which is acceptable false positive? No, we want to know if data exists).
// If RLS hides data, we might think it's empty when it's not.
// Ideally we verify with Service Role if possible.
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
const targetKey = supabaseServiceKey || supabaseKey;

const supabase = createClient(supabaseUrl, targetKey);

async function verify() {
    console.log('--- VERIFICATION START ---');
    console.log('Using key:', targetKey === supabaseServiceKey ? 'SERVICE_ROLE' : 'ANON');

    const tables = [
        'trips',
        'bookings',
        'ride_requests',
        'payments',
        'ride_recordings',
        'wallet_transactions' // We manually check filtering for this one
    ];

    let allClean = true;

    for (const table of tables) {
        let query = supabase.from(table).select('*', { count: 'exact', head: true });

        if (table === 'wallet_transactions') {
            query = query.in('reference_type', ['booking', 'refund', 'tip']);
        }

        const { count, error } = await query;

        if (error) {
            console.error(`${table}: Error - ${error.message}`);
        } else {
            console.log(`${table}: ${count} records`);
            if (count > 0) allClean = false;
        }
    }

    console.log('--- VERIFICATION END ---');
    if (allClean) {
        console.log('SUCCESS: All target data cleared.');
    } else {
        console.log('WARNING: Some data remains.');
    }
}

verify();
