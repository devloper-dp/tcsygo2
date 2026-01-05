
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { join } from 'path';

// Load env vars
dotenv.config({ path: join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugSearch() {
    console.log('--- Debugging Trip Search ---');

    // 1. Check if we can fetch ANY trips
    const { data: trips, error: tripsError } = await supabase
        .from('trips')
        .select('*');

    if (tripsError) {
        console.error('Error fetching simple trips:', tripsError);
    } else {
        console.log(`Found ${trips?.length || 0} total trips (raw fetch)`);
        if (trips && trips.length > 0) {
            console.log('Sample trip:', trips[0]);
        }
    }

    // 2. Check the specific search query used in frontend
    // .select('*, driver:drivers(*, user:users(*))')
    const { data: searchResults, error: searchError } = await supabase
        .from('trips')
        .select('*, driver:drivers(*, user:users(*))')
        .eq('status', 'upcoming')
        .gt('available_seats', 0);

    if (searchError) {
        console.error('Error executing search query:', searchError);
    } else {
        console.log(`Found ${searchResults?.length || 0} trips with joins`);
        if (searchResults && searchResults.length > 0) {
            console.log('Sample result:', JSON.stringify(searchResults[0], null, 2));
        } else {
            console.log('No trips found with joins. Checking individual joins...');

            // Check drivers join only
            const { data: tripsWithDriver, error: driverError } = await supabase
                .from('trips')
                .select('*, driver:drivers(*)')
                .limit(1);

            if (driverError) console.error('Error fetching trips+drivers:', driverError);
            else console.log('Trips+Drivers:', tripsWithDriver?.length);

            // Check if we can see users (likely the issue)
            if (tripsWithDriver && tripsWithDriver.length > 0 && tripsWithDriver[0].driver) {
                const driverUserId = tripsWithDriver[0].driver.user_id;
                console.log('Checking user visibility for ID:', driverUserId);
                const { data: user, error: userError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', driverUserId)
                    .single();

                if (userError) console.error('Error fetching user:', userError);
                else console.log('User found:', user ? 'Yes' : 'No');
            }
        }
    }
}

debugSearch().catch(console.error);
