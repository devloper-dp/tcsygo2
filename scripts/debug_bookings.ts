
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

console.log('Supabase URL:', supabaseUrl);
// console.log('Service Key:', supabaseServiceKey); // Don't log secret

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    console.log('Ensure .env exists in:', path.resolve(__dirname, '../.env'));
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugBookings() {
    console.log('Fetching all bookings...');

    // 1. Fetch raw bookings
    const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('*');

    if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        return;
    }

    console.log(`Found ${bookings.length} bookings.`);

    for (const booking of bookings) {
        console.log(`\nChecking Booking ID: ${booking.id}`);
        console.log(`- Passenger ID: ${booking.passenger_id}`);
        console.log(`- Trip ID: ${booking.trip_id}`);

        // Check Trip
        const { data: trip, error: tripError } = await supabase
            .from('trips')
            .select('*')
            .eq('id', booking.trip_id)
            .single();

        if (tripError || !trip) {
            console.error(`  [ERROR] Trip not found for ID ${booking.trip_id}:`, tripError);
            continue;
        }
        console.log(`  - Trip Found: ${trip.id} (Driver ID: ${trip.driver_id})`);

        // Check Driver
        const { data: driver, error: driverError } = await supabase
            .from('drivers')
            .select('*')
            .eq('id', trip.driver_id)
            .single();

        if (driverError || !driver) {
            console.error(`  [ERROR] Driver not found for ID ${trip.driver_id}:`, driverError);
            continue;
        }
        console.log(`  - Driver Found: ${driver.id} (User ID: ${driver.user_id})`);

        // Check Driver User
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, full_name, email')
            .eq('id', driver.user_id)
            .single();

        if (userError || !user) {
            console.error(`  [ERROR] Driver User not found for ID ${driver.user_id}:`, userError);
            continue;
        }
        console.log(`  - Driver User Found: ${user.full_name} (${user.email})`);

        // Simulate the query done in frontend
        const { data: deepQuery, error: deepError } = await supabase
            .from('bookings')
            .select(`
            *,
            trip:trips(
                *,
                driver:drivers(
                    *,
                    user:users(*)
                )
            )
        `)
            .eq('id', booking.id)
            .single();

        if (deepError) {
            console.error(`  [ERROR] Deep query failed:`, deepError);
        } else {
            console.log(`  - Deep query successful.`);
            // @ts-ignore
            const t = deepQuery.trip;
            if (!t) console.error(`    [!] trip is missing in deep query`);
            else if (!t.driver) console.error(`    [!] trip.driver is missing in deep query`);
            else if (!t.driver.user) console.error(`    [!] trip.driver.user is missing in deep query`);
            else console.log(`    [OK] All relations present in deep query. Filter should pass.`);
        }
    }
}

debugBookings().catch(console.error);
