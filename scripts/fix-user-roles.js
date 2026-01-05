/**
 * Fix User Roles Script
 * 
 * This script updates all user roles in the database to match the intended roles
 * from the seed data. It fixes the issue where all users are created with 'passenger'
 * role by default due to the database trigger.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client with service role key (admin access)
const supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

async function fixUserRoles() {
    console.log('🔧 Fixing user roles in the database...\n');

    try {
        // Define the correct roles for each user
        const userRoles = [
            { email: 'admin@tcsygo.com', role: 'admin' },
            { email: 'john.driver@tcsygo.com', role: 'driver' },
            { email: 'priya.driver@tcsygo.com', role: 'driver' },
            { email: 'rahul.driver@tcsygo.com', role: 'driver' },
            { email: 'snehal.driver@tcsygo.com', role: 'driver' },
            { email: 'venkat.driver@tcsygo.com', role: 'driver' },
            { email: 'amit.passenger@tcsygo.com', role: 'passenger' },
            { email: 'sneha.passenger@tcsygo.com', role: 'passenger' },
            { email: 'vikram.passenger@tcsygo.com', role: 'passenger' },
            { email: 'ananya.passenger@tcsygo.com', role: 'passenger' },
            { email: 'rajesh.passenger@tcsygo.com', role: 'passenger' }
        ];

        // Update each user's role
        for (const { email, role } of userRoles) {
            const { data, error } = await supabase
                .from('users')
                .update({ role })
                .eq('email', email)
                .select();

            if (error) {
                console.error(`❌ Error updating ${email}:`, error.message);
            } else if (data && data.length > 0) {
                console.log(`✅ Updated ${email} to role: ${role}`);
            } else {
                console.log(`⚠️  User not found: ${email}`);
            }
        }

        // Verify the updates
        console.log('\n📊 Verifying user roles...\n');
        const { data: users, error: fetchError } = await supabase
            .from('users')
            .select('email, full_name, role')
            .like('email', '%@tcsygo.com')
            .order('role', { ascending: true })
            .order('email', { ascending: true });

        if (fetchError) {
            console.error('❌ Error fetching users:', fetchError.message);
        } else {
            console.table(users);
        }

        console.log('\n✅ User roles fixed successfully!');
        console.log('\n📝 You can now log in with the correct roles:');
        console.log('   Admin: admin@tcsygo.com / Admin@123');
        console.log('   Driver: john.driver@tcsygo.com / Test@123');
        console.log('   Passenger: amit.passenger@tcsygo.com / Test@123');

    } catch (error) {
        console.error('\n❌ Error during role fix:', error);
        process.exit(1);
    }
}

// Run the fix
fixUserRoles();
