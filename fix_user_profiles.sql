-- Fix Missing User Profiles (v3 - with Auto Pay Settings)
-- Run this script in the Supabase SQL Editor.

DO $$
BEGIN
    RAISE NOTICE 'Starting profile synchronization...';

    -- 1. Insert missing users into public.users
    -- If a phone number already exists in public.users, we insert NULL for the phone to avoid collision.
    INSERT INTO public.users (id, email, full_name, phone, role)
    SELECT 
        au.id, 
        au.email, 
        COALESCE(au.raw_user_meta_data->>'full_name', au.email), 
        CASE 
            WHEN EXISTS (SELECT 1 FROM public.users WHERE phone = au.raw_user_meta_data->>'phone') THEN NULL
            ELSE au.raw_user_meta_data->>'phone'
        END,
        'passenger'
    FROM auth.users au
    LEFT JOIN public.users pu ON au.id = pu.id
    WHERE pu.id IS NULL;

    RAISE NOTICE 'Inserted missing users into public.users';

    -- 2. Initialize Wallets
    INSERT INTO public.wallets (user_id, balance)
    SELECT id, 0.00
    FROM public.users
    WHERE id NOT IN (SELECT user_id FROM public.wallets);

    RAISE NOTICE 'Initialized missing wallets';

    -- 3. Initialize Ride Preferences
    INSERT INTO public.ride_preferences (user_id)
    SELECT id
    FROM public.users
    WHERE id NOT IN (SELECT user_id FROM public.ride_preferences);

    RAISE NOTICE 'Initialized missing ride preferences';

    -- 4. Initialize Auto Pay Settings
    INSERT INTO public.auto_pay_settings (user_id)
    SELECT id
    FROM public.users
    WHERE id NOT IN (SELECT user_id FROM public.auto_pay_settings);

    RAISE NOTICE 'Initialized missing auto pay settings';

    RAISE NOTICE 'Profile synchronization completed successfully.';
END $$;
