-- 1. Add missing columns that are causing schema errors
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS total_trips INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 5.0,
ADD COLUMN IF NOT EXISTS current_lat NUMERIC,
ADD COLUMN IF NOT EXISTS current_lng NUMERIC;

-- 2. Clean up duplicate driver records (Recommended)
WITH duplicates AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
    FROM public.drivers
)
DELETE FROM public.drivers
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);

-- 3. Add UNIQUE constraint (Recommended for data integrity)
ALTER TABLE public.drivers DROP CONSTRAINT IF EXISTS drivers_user_id_key;
ALTER TABLE public.drivers ADD CONSTRAINT drivers_user_id_key UNIQUE (user_id);

-- 4. Reload Schema Cache (CRITICAL FIX for "Could not find column" error)
NOTIFY pgrst, 'reload config';
