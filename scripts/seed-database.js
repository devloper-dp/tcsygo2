/**
 * TCSYGO Database Seeding Script
 * 
 * This script creates realistic test data for the TCSYGO rideshare platform.
 * It uses the Supabase Admin API to create auth users and then populates
 * all related tables with sample data.
 * 
 * Prerequisites:
 * - Supabase project must be set up with COMPLETE_SETUP.sql run
 * - Environment variables must be configured (.env file)
 * - Node.js 18+ installed
 * 
 * Usage:
 *   node seed-database.js
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

// Helper function to cleanup existing test data
async function cleanupDatabase() {
    console.log('🧹 Cleaning up existing test data...');

    try {
        // 1. Get all users with @tcsygo.com email
        const { data: { users: testUsers }, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) throw listError;

        const usersToDelete = testUsers.filter(u => u.email.endsWith('@tcsygo.com'));
        console.log(`   Found ${usersToDelete.length} test users to delete.`);

        // Delete dependencies in order
        // Note: RLS might prevent some deletes if not using service role, 
        // but since we are using service role key, it should be fine.

        // Delete notifications, payments, bookings, and trips first (cascading might handle some, but let's be safe)
        const userIds = usersToDelete.map(u => u.id);

        if (userIds.length > 0) {
            console.log('   Deleting related records from all dependent tables...');

            // 1. Delete ratings (both from and to users)
            await supabase.from('ratings').delete().in('from_user_id', userIds);
            await supabase.from('ratings').delete().in('to_user_id', userIds);

            // 2. Delete messages (both sender and receiver)
            await supabase.from('messages').delete().in('sender_id', userIds);
            await supabase.from('messages').delete().in('receiver_id', userIds);

            // 3. Delete emergency alerts
            await supabase.from('emergency_alerts').delete().in('user_id', userIds);

            // 4. Delete support tickets
            await supabase.from('support_tickets').delete().in('user_id', userIds);

            // 5. Delete saved searches
            await supabase.from('saved_searches').delete().in('user_id', userIds);

            // 6. Delete payment methods
            await supabase.from('payment_methods').delete().in('user_id', userIds);

            // 7. Delete notifications
            await supabase.from('notifications').delete().in('user_id', userIds);

            // 8. Delete payments (Must be before bookings)
            // Get all bookings for these users as passenger
            const { data: bData } = await supabase.from('bookings').select('id').in('passenger_id', userIds);
            const bIds = bData?.map(b => b.id) || [];

            // Get drivers for these users
            const { data: dData } = await supabase.from('drivers').select('id').in('user_id', userIds);
            const drIds = dData?.map(d => d.id) || [];

            if (drIds.length > 0) {
                // Get trips for these drivers
                const { data: tData } = await supabase.from('trips').select('id').in('driver_id', drIds);
                const trIds = tData?.map(t => t.id) || [];

                if (trIds.length > 0) {
                    // Get bookings for these trips
                    const { data: tbData } = await supabase.from('bookings').select('id').in('trip_id', trIds);
                    tbData?.forEach(b => {
                        if (!bIds.includes(b.id)) bIds.push(b.id);
                    });
                }
            }

            if (bIds.length > 0) {
                console.log(`   Deleting ${bIds.length} payments associated with bookings...`);
                await supabase.from('payments').delete().in('booking_id', bIds);
            }

            // 9. Delete bookings
            console.log('   Deleting bookings...');
            await supabase.from('bookings').delete().in('passenger_id', userIds);
            if (drIds.length > 0) {
                const { data: tData } = await supabase.from('trips').select('id').in('driver_id', drIds);
                const trIds = tData?.map(t => t.id) || [];
                if (trIds.length > 0) {
                    await supabase.from('bookings').delete().in('trip_id', trIds);
                }
            }

            // 10. Delete driver-related data
            if (drIds.length > 0) {
                console.log('   Deleting driver-related data...');
                await supabase.from('payout_requests').delete().in('driver_id', drIds);
                await supabase.from('live_locations').delete().in('driver_id', drIds);
                await supabase.from('trips').delete().in('driver_id', drIds);
                await supabase.from('drivers').delete().in('id', drIds);
            }

            // 11. Delete public users
            console.log('   Deleting public user profiles...');
            await supabase.from('users').delete().in('id', userIds);

            // 12. Delete auth users
            console.log(`   Deleting ${usersToDelete.length} auth users...`);
            for (const user of usersToDelete) {
                const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
                if (deleteError) {
                    console.error(`   ❌ Error deleting auth user ${user.email}:`, deleteError.message);
                } else {
                    console.log(`   ✅ Deleted auth user: ${user.email}`);
                }
            }
        }

        // 2. Delete static data that doesn't strictly depend on auth users but are part of seed
        console.log('   Cleaning up static seed data...');
        await supabase.from('promo_codes').delete().filter('code', 'in', '("WELCOME50","FLAT100")');

        console.log('✅ Cleanup completed.\n');
    } catch (error) {
        console.error('❌ Error during cleanup:', error.message);
        throw error;
    }
}

// Sample user data
const sampleUsers = [
    {
        email: 'john.driver@tcsygo.com',
        password: 'Test@123',
        full_name: 'John Kumar',
        phone: '+919876543210',
        role: 'driver',
        bio: 'Professional driver with 5 years of experience. I love driving and meeting new people.',
        profile_photo: 'https://randomuser.me/api/portraits/men/1.jpg',
        isDriver: true,
        driverData: {
            license_number: 'DL-1234567890',
            license_photo: 'https://placehold.co/600x400/png?text=License+Photo',
            vehicle_make: 'Toyota',
            vehicle_model: 'Innova Crysta',
            vehicle_year: 2022,
            vehicle_color: 'Silver',
            vehicle_plate: 'DL-01-AB-1234',
            vehicle_photos: [
                'https://placehold.co/600x400/png?text=Car+Front',
                'https://placehold.co/600x400/png?text=Car+Side',
                'https://placehold.co/600x400/png?text=Car+Interior'
            ],
            documents: {
                insurance: 'https://placehold.co/600x400/png?text=Insurance',
                rc: 'https://placehold.co/600x400/png?text=RC'
            },
            is_available: true,
            verification_status: 'verified',
            rating: 4.8,
            total_trips: 152
        }
    },
    {
        email: 'priya.driver@tcsygo.com',
        password: 'Test@123',
        full_name: 'Priya Sharma',
        phone: '+919876543211',
        role: 'driver',
        bio: 'Safe and reliable driver. prioritizing passenger comfort.',
        profile_photo: 'https://randomuser.me/api/portraits/women/2.jpg',
        isDriver: true,
        driverData: {
            license_number: 'DL-9876543210',
            license_photo: 'https://placehold.co/600x400/png?text=License+Photo',
            vehicle_make: 'Honda',
            vehicle_model: 'City',
            vehicle_year: 2021,
            vehicle_color: 'White',
            vehicle_plate: 'DL-02-CD-5678',
            vehicle_photos: [
                'https://placehold.co/600x400/png?text=Car+Front',
                'https://placehold.co/600x400/png?text=Car+Side'
            ],
            documents: {
                insurance: 'https://placehold.co/600x400/png?text=Insurance'
            },
            is_available: true,
            verification_status: 'verified',
            rating: 4.9,
            total_trips: 89
        }
    },
    {
        email: 'rahul.driver@tcsygo.com',
        password: 'Test@123',
        full_name: 'Rahul Verma',
        phone: '+919876543212',
        role: 'driver',
        bio: 'Friendly driver, know all the shortcuts in Indore.',
        profile_photo: 'https://randomuser.me/api/portraits/men/3.jpg',
        isDriver: true,
        driverData: {
            license_number: 'MH-1122334455',
            license_photo: 'https://placehold.co/600x400/png?text=License+Photo',
            vehicle_make: 'Maruti',
            vehicle_model: 'Ertiga',
            vehicle_year: 2023,
            vehicle_color: 'Blue',
            vehicle_plate: 'MH-01-EF-9012',
            vehicle_photos: [
                'https://placehold.co/600x400/png?text=Car+Front'
            ],
            documents: {
                insurance: 'https://placehold.co/600x400/png?text=Insurance'
            },
            is_available: true,
            verification_status: 'verified',
            rating: 4.7,
            total_trips: 210
        }
    },
    {
        email: 'snehal.driver@tcsygo.com',
        password: 'Test@123',
        full_name: 'Snehal Patil',
        phone: '+919876543220',
        role: 'driver',
        bio: 'Experienced driver for long distance travel.',
        profile_photo: 'https://randomuser.me/api/portraits/women/4.jpg',
        isDriver: true,
        driverData: {
            license_number: 'PN-4455667788',
            license_photo: 'https://placehold.co/600x400/png?text=License+Photo',
            vehicle_make: 'Hyundai',
            vehicle_model: 'Creta',
            vehicle_year: 2022,
            vehicle_color: 'Red',
            vehicle_plate: 'MH-12-PQ-9988',
            vehicle_photos: [
                'https://placehold.co/600x400/png?text=Car+Front'
            ],
            documents: {
                insurance: 'https://placehold.co/600x400/png?text=Insurance'
            },
            is_available: true,
            verification_status: 'verified',
            rating: 4.6,
            total_trips: 45
        }
    },
    {
        email: 'venkat.driver@tcsygo.com',
        password: 'Test@123',
        full_name: 'Venkatesh Rao',
        phone: '+919876543221',
        role: 'driver',
        bio: 'Always on time. Luxury driving experience.',
        profile_photo: 'https://randomuser.me/api/portraits/men/5.jpg',
        isDriver: true,
        driverData: {
            license_number: 'HYD-9900112233',
            license_photo: 'https://placehold.co/600x400/png?text=License+Photo',
            vehicle_make: 'Mahindra',
            vehicle_model: 'XUV700',
            vehicle_year: 2023,
            vehicle_color: 'Black',
            vehicle_plate: 'TS-09-XY-5544',
            vehicle_photos: [
                'https://placehold.co/600x400/png?text=Car+Front',
                'https://placehold.co/600x400/png?text=Car+Interior'
            ],
            documents: {
                insurance: 'https://placehold.co/600x400/png?text=Insurance'
            },
            is_available: true,
            verification_status: 'verified',
            rating: 4.9,
            total_trips: 12
        }
    },
    {
        email: 'amit.passenger@tcsygo.com',
        password: 'Test@123',
        full_name: 'Amit Patel',
        phone: '+919876543213',
        role: 'passenger',
        bio: 'Frequent traveler for business.',
        profile_photo: 'https://randomuser.me/api/portraits/men/6.jpg',
        isDriver: false
    },
    {
        email: 'sneha.passenger@tcsygo.com',
        password: 'Test@123',
        full_name: 'Sneha Reddy',
        phone: '+919876543214',
        role: 'passenger',
        bio: 'Student at IIT Indore.',
        profile_photo: 'https://randomuser.me/api/portraits/women/7.jpg',
        isDriver: false
    },
    {
        email: 'vikram.passenger@tcsygo.com',
        password: 'Test@123',
        full_name: 'Vikram Singh',
        phone: '+919876543215',
        role: 'passenger',
        bio: 'Love to explore new cities.',
        profile_photo: 'https://randomuser.me/api/portraits/men/8.jpg',
        isDriver: false
    },
    {
        email: 'ananya.passenger@tcsygo.com',
        password: 'Test@123',
        full_name: 'Ananya Iyer',
        phone: '+919876543230',
        role: 'passenger',
        bio: 'Music lover and daily commuter.',
        profile_photo: 'https://randomuser.me/api/portraits/women/9.jpg',
        isDriver: false
    },
    {
        email: 'rajesh.passenger@tcsygo.com',
        password: 'Test@123',
        full_name: 'Rajesh Mukherjee',
        phone: '+919876543231',
        role: 'passenger',
        bio: 'Foodie and traveler.',
        profile_photo: 'https://randomuser.me/api/portraits/men/10.jpg',
        isDriver: false
    },
    {
        email: 'admin@tcsygo.com',
        password: 'Admin@123',
        full_name: 'Admin User',
        phone: '+919876543216',
        role: 'admin',
        bio: 'System Administrator',
        profile_photo: 'https://ui-avatars.com/api/?name=Admin+User&background=random',
        isDriver: false
    }
];

// Helper function to create users
async function createUsers() {
    console.log('🔄 Creating users...');
    const createdUsers = [];

    // Get existing users to avoid duplicates
    const { data: { users: existingUsers }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
        console.error('❌ Error listing existing users:', listError.message);
    }

    for (const userData of sampleUsers) {
        try {
            const userExists = existingUsers?.find(u => u.email === userData.email);
            let authId;

            if (userExists) {
                console.log(`ℹ️ User already exists: ${userData.email}`);
                authId = userExists.id;
            } else {
                // Create auth user
                const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                    email: userData.email,
                    password: userData.password,
                    email_confirm: true,
                    user_metadata: {
                        full_name: userData.full_name,
                        phone: userData.phone
                    }
                });

                if (authError) {
                    console.error(`❌ Error creating user ${userData.email}:`, authError.message);
                    continue;
                }

                console.log(`✅ Created user: ${userData.email}`);
                authId = authData.user.id;
            }

            // Update user role in public.users
            const { error: updateError } = await supabase
                .from('users')
                .update({
                    role: userData.role,
                    full_name: userData.full_name,
                    phone: userData.phone,
                    bio: userData.bio,
                    profile_photo: userData.profile_photo
                })
                .eq('id', authId);

            if (updateError) {
                console.error(`❌ Error updating role for ${userData.email}:`, updateError.message);
            }

            const userObj = {
                ...userData,
                id: authId
            };

            // Create driver profile if applicable
            if (userData.isDriver && userData.driverData) {
                const { data: existingDriver } = await supabase
                    .from('drivers')
                    .select('id')
                    .eq('user_id', authId)
                    .maybeSingle();

                if (existingDriver) {
                    console.log(`ℹ️ Driver profile already exists for: ${userData.email}`);
                    userObj.driver_id = existingDriver.id;
                } else {
                    const { data: driverData, error: driverError } = await supabase
                        .from('drivers')
                        .insert({
                            user_id: authId,
                            ...userData.driverData
                        })
                        .select()
                        .single();

                    if (driverError) {
                        console.error(`❌ Error creating driver profile for ${userData.email}:`, driverError.message);
                    } else {
                        console.log(`✅ Created driver profile for: ${userData.email}`);
                        userObj.driver_id = driverData.id;
                    }
                }
            }

            createdUsers.push(userObj);

        } catch (error) {
            console.error(`❌ Unexpected error for ${userData.email}:`, error);
        }
    }

    return createdUsers;
}

// Helper function to create promo codes
async function createPromoCodes() {
    console.log('\n🔄 Creating promo codes...');
    const promoCodes = [
        {
            code: 'WELCOME50',
            discount_type: 'percentage',
            discount_value: 50,
            description: '🎉 Welcome bonus - 50% off!',
            min_amount: 0,
            max_discount: 100,
            max_uses: 1000,
            valid_from: new Date().toISOString(),
            valid_until: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
            is_active: true
        },
        {
            code: 'FLAT100',
            discount_type: 'fixed',
            discount_value: 100,
            description: '💰 Flat ₹100 off on rides above ₹500',
            min_amount: 500,
            max_discount: 100,
            max_uses: 500,
            valid_from: new Date().toISOString(),
            valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            is_active: true
        }
    ];

    for (const promo of promoCodes) {
        const { data, error } = await supabase
            .from('promo_codes')
            .upsert(promo, { onConflict: 'code' })
            .select()
            .single();

        if (error) {
            console.error(`❌ Error creating promo code ${promo.code}:`, error.message);
        } else {
            console.log(`✅ Created promo code: ${promo.code}`);
        }
    }
}

// Helper function to create trips
async function createTrips(drivers) {
    console.log('\n🔄 Creating trips...');
    const trips = [];

    const tripData = [
        {
            pickup_location: 'Rajwada Palace, Indore',
            pickup_lat: 22.7196,
            pickup_lng: 75.8577,
            drop_location: 'Phoenix Citadel Mall, Indore',
            drop_lat: 22.7441,
            drop_lng: 75.9224,
            departure_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            distance: 8.5,
            duration: 25,
            price_per_seat: 80,
            available_seats: 3,
            total_seats: 4,
            status: 'upcoming'
        },
        {
            pickup_location: 'Indore Airport (IDR)',
            pickup_lat: 22.7217,
            pickup_lng: 75.8011,
            drop_location: 'Vijay Nagar, Indore',
            drop_lat: 22.7533,
            drop_lng: 75.8937,
            departure_time: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
            distance: 12.0,
            duration: 35,
            price_per_seat: 120,
            available_seats: 2,
            total_seats: 3,
            status: 'upcoming'
        },
        {
            pickup_location: 'Bhanwar Kuwa, Indore',
            pickup_lat: 22.6917,
            pickup_lng: 75.8667,
            drop_location: 'TCS Indore (SEZ)',
            drop_lat: 22.6288,
            drop_lng: 75.8065,
            departure_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            distance: 15.5,
            duration: 40,
            price_per_seat: 100,
            available_seats: 4,
            total_seats: 4,
            status: 'upcoming'
        },
        {
            pickup_location: 'Sarafa Bazar, Indore',
            pickup_lat: 22.7188,
            pickup_lng: 75.8540,
            drop_location: 'Palasia, Indore',
            drop_lat: 22.7244,
            drop_lng: 75.8839,
            departure_time: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
            distance: 4.2,
            duration: 15,
            price_per_seat: 50,
            available_seats: 1,
            total_seats: 4,
            status: 'ongoing'
        },
        {
            pickup_location: 'Meghdoot Garden, Indore',
            pickup_lat: 22.7597,
            pickup_lng: 75.8970,
            drop_location: 'Treasure Island Mall, Indore',
            drop_lat: 22.7211,
            drop_lng: 75.8778,
            departure_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            distance: 6.8,
            duration: 20,
            price_per_seat: 70,
            available_seats: 0,
            total_seats: 4,
            status: 'completed'
        }
    ];

    for (let i = 0; i < tripData.length; i++) {
        const driverIndex = i % drivers.length;
        const driver = drivers[driverIndex];

        if (!driver?.driver_id) continue;

        const { data, error } = await supabase
            .from('trips')
            .insert({
                driver_id: driver.driver_id,
                ...tripData[i]
            })
            .select()
            .single();

        if (error) {
            console.error('❌ Error creating trip:', error.message);
        } else {
            console.log(`✅ Created trip: ${tripData[i].pickup_location} → ${tripData[i].drop_location} (${tripData[i].status})`);
            trips.push(data);
        }
    }

    return trips;
}

// Helper function to create bookings and payments
async function createBookingsAndPayments(trips, passengers) {
    console.log('\n🔄 Creating bookings and payments...');

    if (trips.length === 0 || passengers.length === 0) {
        console.log('⚠️  No trips or passengers available for bookings');
        return;
    }

    for (let i = 0; i < 5; i++) {
        const trip = trips[i % trips.length];
        const passenger = passengers[i % passengers.length];

        const bookingCode = `BK-${Date.now()}-${i}`;
        const seats = Math.min(1, trip.available_seats || 1);
        const amount = seats * trip.price_per_seat;

        const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .insert({
                trip_id: trip.id,
                passenger_id: passenger.id,
                seats_booked: seats,
                total_amount: amount,
                status: trip.status === 'completed' ? 'completed' : 'confirmed',
                booking_code: bookingCode
            })
            .select()
            .single();

        if (bookingError) {
            console.error(`❌ Error creating booking for ${passenger.email}:`, bookingError.message);
            continue;
        }

        console.log(`✅ Created booking: ${bookingCode}`);

        // Create payment for the booking
        const { error: paymentError } = await supabase
            .from('payments')
            .insert({
                booking_id: booking.id,
                amount: amount,
                platform_fee: amount * 0.1,
                driver_earnings: amount * 0.9,
                status: 'success',
                payment_method: 'upi',
                razorpay_payment_id: `pay_${Math.random().toString(36).substring(7)}`
            });

        if (paymentError) {
            console.error(`❌ Error creating payment for booking ${bookingCode}:`, paymentError.message);
        } else {
            console.log(`   ✅ Created payment for: ${bookingCode}`);
        }

        // If trip is completed, add a rating
        if (trip.status === 'completed') {
            const { data: driverInfo } = await supabase.from('drivers').select('user_id').eq('id', trip.driver_id).single();

            if (driverInfo) {
                await supabase.from('ratings').insert({
                    trip_id: trip.id,
                    from_user_id: passenger.id,
                    to_user_id: driverInfo.user_id,
                    rating: 5,
                    review: 'Excellent ride! Very professional driver.'
                });
                console.log(`   ✅ Created rating for: ${bookingCode}`);
            }
        }
    }
}

// Helper function to create notifications
async function createNotifications(users) {
    console.log('\n🔄 Creating notifications...');

    for (const user of users) {
        const notifications = [
            {
                user_id: user.id,
                title: '🎉 Welcome to TCSYGO!',
                message: `Hi ${user.full_name}, welcome to the next generation of ridesharing!`,
                type: 'welcome',
                is_read: false
            }
        ];

        if (user.role === 'passenger') {
            notifications.push({
                user_id: user.id,
                title: '🎁 Special Offer for You',
                message: 'Use code WELCOME50 for 50% off your first ride!',
                type: 'promo',
                is_read: false
            });
        }

        for (const notification of notifications) {
            const { error } = await supabase
                .from('notifications')
                .insert(notification);

            if (error) {
                console.error(`❌ Error creating notification for ${user.email}:`, error.message);
            }
        }
    }
    console.log('✅ Notifications created for all users.');
}

// Main seeding function
async function seedDatabase() {
    console.log('🌱 Starting Indore-specific database seeding...\n');

    try {
        // 0. Cleanup existing test data
        await cleanupDatabase();

        // 1. Create promo codes
        await createPromoCodes();

        // 2. Create users (both passengers and drivers)
        const users = await createUsers();

        const drivers = users.filter(u => u.isDriver);
        const passengers = users.filter(u => !u.isDriver && u.role !== 'admin');

        console.log(`\n📊 Total Users: ${users.length} (${drivers.length} drivers, ${passengers.length} passengers)`);

        // 3. Create trips
        const trips = await createTrips(drivers);
        console.log(`\n📊 Created ${trips.length} trips`);

        // 4. Create bookings and payments (which also creates ratings for completed trips)
        await createBookingsAndPayments(trips, passengers);

        // 5. Create notifications
        await createNotifications(users);

        console.log('\n✅ Database seeding completed successfully!');
        console.log('\n📝 Test Credentials:');
        console.log('   Indore Driver 1: john.driver@tcsygo.com / Test@123');
        console.log('   Indore Driver 2: priya.driver@tcsygo.com / Test@123');
        console.log('   Indore Driver 3: rahul.driver@tcsygo.com / Test@123');
        console.log('   Indore Passenger: amit.passenger@tcsygo.com / Test@123');
        console.log('   Admin: admin@tcsygo.com / Admin@123');

    } catch (error) {
        console.error('\n❌ Error during seeding:', error);
        process.exit(1);
    }
}

// Run the seeding
seedDatabase();
