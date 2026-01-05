-- ============================================
-- Fix Trip Status Constraint
-- Description: Update trips status check constraint to allow 'ongoing'
-- ============================================

-- 1. Drop existing check constraint
ALTER TABLE public.trips DROP CONSTRAINT IF EXISTS trips_status_check;

-- 2. Add updated check constraint including 'ongoing' and 'confirmed' (for upcoming trips)
ALTER TABLE public.trips 
ADD CONSTRAINT trips_status_check 
CHECK (status IN ('started', 'ongoing', 'confirmed', 'completed', 'cancelled', 'upcoming'));

-- 3. Update existing 'started' trips to 'ongoing' for consistency (Optional but recommended)
UPDATE public.trips 
SET status = 'ongoing' 
WHERE status = 'started';

-- 4. Ensure bookings also support these statuses (just in case)
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_status_check 
CHECK (status IN ('pending', 'matched', 'ongoing', 'confirmed', 'completed', 'cancelled', 'payment_pending', 'paid', 'upcoming'));
