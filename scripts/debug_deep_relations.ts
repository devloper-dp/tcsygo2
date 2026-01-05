
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugRelations() {
    console.log('Fetching first booking...');

    const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, trip_id')
        .limit(1);

    if (bookingsError || !bookings.length) {
        console.error('No bookings found or error:', bookingsError);
        return;
    }

    const bookingId = bookings[0].id;
    const tripId = bookings[0].trip_id;
    console.log(`Analyzing Booking ID: ${bookingId}, Trip ID: ${tripId}`);

    // 1. Check Trip Fields
    const { data: trip } = await supabase.from('trips').select('*').eq('id', tripId).single();
    console.log('\n--- Trip Raw Data ---');
    console.log('Keys:', Object.keys(trip || {}));
    console.log('departure_time:', trip?.departure_time);
    console.log('driver_id:', trip?.driver_id);

    // 2. Try variations of the Deep Query
    console.log('\n--- Testing Joins ---');

    // Variation A: Original
    const { data: varA, error: errA } = await supabase
        .from('bookings')
        .select('*, trip:trips(*, driver:drivers(*, user:users(*)))')
        .eq('id', bookingId)
        .single();

    if (errA) console.log('Variation A (Original) Error:', errA.message);
    else {
        // @ts-ignore
        const t = varA.trip;
        console.log('Variation A Result:');
        console.log('  trip.departure_time:', t?.departure_time);
        console.log('  trip.driver:', t?.driver ? 'FOUND' : 'NULL');
        if (t?.driver) console.log('    driver.user:', t.driver.user ? 'FOUND' : 'NULL');
    }

    // Variation B: Simplified Driver Join (without user)
    const { data: varB, error: errB } = await supabase
        .from('trips')
        .select('*, driver:drivers(*)')
        .eq('id', tripId)
        .single();

    if (errB) console.log('Variation B (Trip->Driver) Error:', errB.message);
    else {
        console.log('Variation B Result:');
        // @ts-ignore
        console.log('  trip.driver:', varB.driver ? 'FOUND' : 'NULL');
    }

    // Variation C: Check Foreign Keys (Introspection if possible, or just raw)
    // We can't easily iterate foreign keys via JS client without admin API access usually, 
    // but we can try to guess if the relation name is different.
    // Sometimes it's plural 'drivers', sometimes singular 'driver' in the definitions if manually set.

    // Variation D: Try selecting without alias
    // .select('*, trips(*, drivers(*))')
    const { data: varD, error: errD } = await supabase
        .from('bookings')
        .select(`
        *,
        trips (
            *,
            drivers (
                *
            )
        )
    `)
        .eq('id', bookingId)
        .single();

    if (errD) console.log('Variation D (No Alias) Error:', errD.message);
    else {
        console.log('Variation D Result:');
        // @ts-ignore
        const t = varD.trips; // array or object?
        console.log('  trips type:', Array.isArray(t) ? 'Array' : typeof t);
        console.log('  trips val:', t);
    }

}

debugRelations().catch(console.error);
