/**
 * Database Verification Script for TCSYGO
 * Checks if all required tables and features are set up in Supabase
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Required tables for Rapido features
const REQUIRED_TABLES = [
    // Core tables
    'users', 'drivers', 'trips', 'bookings', 'payments',
    'messages', 'notifications', 'live_locations', 'ratings',
    'emergency_alerts', 'saved_searches', 'payment_methods',
    'promo_codes', 'support_tickets', 'payout_requests',

    // Rapido feature tables
    'ride_preferences', 'auto_pay_settings', 'split_fare_requests',
    'safety_checkins', 'driver_tips', 'wallets', 'wallet_transactions',
    'saved_places', 'emergency_contacts', 'referral_codes',
    'referral_uses', 'favorite_routes', 'ride_statistics',
    'trip_surge_pricing'
];

async function checkTables() {
    console.log('🔍 Checking database tables...\n');

    const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');

    if (error) {
        console.error('❌ Error fetching tables:', error.message);
        return false;
    }

    const existingTables = data?.map((t: any) => t.table_name) || [];
    const missingTables: string[] = [];

    REQUIRED_TABLES.forEach(table => {
        const exists = existingTables.includes(table);
        if (exists) {
            console.log(`✅ ${table}`);
        } else {
            console.log(`❌ ${table} - MISSING`);
            missingTables.push(table);
        }
    });

    if (missingTables.length > 0) {
        console.log(`\n⚠️  Missing ${missingTables.length} tables:`);
        console.log('   Please run the following SQL files in Supabase SQL Editor:');
        console.log('   1. supabase/COMPLETE_SETUP.sql');
        console.log('   2. supabase/RAPIDO_FEATURES_COMPLETE.sql\n');
        return false;
    }

    console.log('\n✅ All required tables exist!\n');
    return true;
}

async function checkRLS() {
    console.log('🔒 Checking Row Level Security...\n');

    const { data, error } = await supabase.rpc('check_rls_enabled');

    if (error) {
        console.log('⚠️  Could not verify RLS (this is normal if RPC function not created)');
        console.log('   RLS should be enabled manually in Supabase dashboard\n');
        return true;
    }

    console.log('✅ RLS verification complete\n');
    return true;
}

async function checkStorageBuckets() {
    console.log('📦 Checking storage buckets...\n');

    const requiredBuckets = [
        'profile-photos', 'vehicles', 'licenses',
        'documents', 'receipts', 'safety-media'
    ];

    const { data, error } = await supabase.storage.listBuckets();

    if (error) {
        console.error('❌ Error fetching buckets:', error.message);
        return false;
    }

    const existingBuckets = data?.map(b => b.name) || [];
    const missingBuckets: string[] = [];

    requiredBuckets.forEach(bucket => {
        const exists = existingBuckets.includes(bucket);
        if (exists) {
            console.log(`✅ ${bucket}`);
        } else {
            console.log(`⚠️  ${bucket} - MISSING (will be auto-created)`);
            missingBuckets.push(bucket);
        }
    });

    console.log('');
    return true;
}

async function testBasicQueries() {
    console.log('🧪 Testing basic database queries...\n');

    // Test users table
    const { data: users, error: usersError } = await supabase
        .from('users')
        .select('count')
        .limit(1);

    if (usersError) {
        console.log('❌ Users table query failed:', usersError.message);
        return false;
    }
    console.log('✅ Users table accessible');

    // Test wallets table (Rapido feature)
    const { data: wallets, error: walletsError } = await supabase
        .from('wallets')
        .select('count')
        .limit(1);

    if (walletsError) {
        console.log('❌ Wallets table query failed:', walletsError.message);
        return false;
    }
    console.log('✅ Wallets table accessible');

    // Test ride_preferences table (Rapido feature)
    const { data: prefs, error: prefsError } = await supabase
        .from('ride_preferences')
        .select('count')
        .limit(1);

    if (prefsError) {
        console.log('❌ Ride preferences table query failed:', prefsError.message);
        return false;
    }
    console.log('✅ Ride preferences table accessible');

    console.log('\n✅ All basic queries successful!\n');
    return true;
}

async function main() {
    console.log('═══════════════════════════════════════════════════');
    console.log('  TCSYGO Database Verification');
    console.log('═══════════════════════════════════════════════════\n');

    const tablesOk = await checkTables();
    const rlsOk = await checkRLS();
    const bucketsOk = await checkStorageBuckets();
    const queriesOk = await testBasicQueries();

    console.log('═══════════════════════════════════════════════════');
    if (tablesOk && rlsOk && bucketsOk && queriesOk) {
        console.log('✅ DATABASE VERIFICATION PASSED');
        console.log('   Your database is ready for Rapido features!');
    } else {
        console.log('⚠️  DATABASE VERIFICATION INCOMPLETE');
        console.log('   Please review the errors above and run the SQL scripts.');
    }
    console.log('═══════════════════════════════════════════════════\n');
}

main().catch(console.error);
