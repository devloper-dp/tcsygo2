-- COMPREHENSIVE FIX FOR DRIVERS TABLE
-- This script adds ALL columns used in the app to ensure no more "column not found" errors.

-- 1. Add ALL columns used in the onboarding form
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS license_number TEXT,
ADD COLUMN IF NOT EXISTS license_photo TEXT,
ADD COLUMN IF NOT EXISTS vehicle_make TEXT,
ADD COLUMN IF NOT EXISTS vehicle_model TEXT,
ADD COLUMN IF NOT EXISTS vehicle_year INTEGER,
ADD COLUMN IF NOT EXISTS vehicle_color TEXT,
ADD COLUMN IF NOT EXISTS vehicle_plate TEXT,
ADD COLUMN IF NOT EXISTS vehicle_photos TEXT[], -- Array of strings
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS total_trips INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 5.0,
ADD COLUMN IF NOT EXISTS vehicle_type TEXT DEFAULT 'car',
ADD COLUMN IF NOT EXISTS current_lat NUMERIC,
ADD COLUMN IF NOT EXISTS current_lng NUMERIC;

-- 2. Clean up duplicates (Safety measure)
WITH duplicates AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
    FROM public.drivers
)
DELETE FROM public.drivers
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);

-- 3. Add UNIQUE constraint on user_id
-- This allows "upsert" to work in the future if we switch back to it
ALTER TABLE public.drivers DROP CONSTRAINT IF EXISTS drivers_user_id_key;
ALTER TABLE public.drivers ADD CONSTRAINT drivers_user_id_key UNIQUE (user_id);

-- 4. Reload Schema Cache (CRITICAL)
NOTIFY pgrst, 'reload config';
