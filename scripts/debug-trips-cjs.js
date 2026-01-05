
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load env vars manually or via dotenv
const envPath = path.join(__dirname, '../.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

for (const k in envConfig) {
    process.env[k] = envConfig[k];
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debug() {
    console.log('--- Debugging Data ---');

    // 1. Fetch all trips
    const { data: trips, error } = await supabase.from('trips').select('*');

    if (error) {
        console.error('Error fetching trips:', error);
        return;
    }

    console.log(`Total Trips: ${trips.length}`);

    if (trips.length === 0) {
        console.log('No trips found. Creation might have failed.');
        return;
    }

    trips.forEach(trip => {
        console.log(`\nTrip ID: ${trip.id}`);
        console.log(`Status: ${trip.status}`);
        console.log(`Departure: ${trip.departure_time}`);
        console.log(`Pickup: ${trip.pickup_location}`);
        console.log(`Drop: ${trip.drop_location}`);
        console.log(`Driver ID: ${trip.driver_id}`);
        console.log(`Available Seats: ${trip.available_seats}`);
    });

    // 2. Fetch specific driver
    const driverId = trips[0].driver_id;
    const { data: driver, error: driverError } = await supabase
        .from('drivers')
        .select('*, user:users(*)')
        .eq('id', driverId)
        .single();

    if (driverError) {
        console.error('Error fetching driver:', driverError);
    } else {
        console.log('\nDriver Details:');
        console.log(`ID: ${driver.id}`);
        console.log(`User ID: ${driver.user_id}`);
        if (driver.user) {
            console.log(`User Name: ${driver.user.full_name}`);
        } else {
            console.error('Driver has no user relation! RLS or data integrity issue.');
        }
    }

    // 3. Test Join Query filter
    const { data: joined, error: joinError } = await supabase
        .from('trips')
        .select('*, driver:drivers(*, user:users(*))')
        .eq('status', 'upcoming')
        .gt('available_seats', 0);

    if (joinError) {
        console.error('Join query error:', joinError);
    } else {
        console.log(`\nJoin Query Results: ${joined.length}`);
        if (joined.length > 0) {
            console.log('Sample driver from join:', joined[0].driver ? 'Present' : 'Missing');
            if (joined[0].driver) {
                console.log('Sample user from join:', joined[0].driver.user ? 'Present' : 'Missing');
            }
        }
    }
}

debug();
