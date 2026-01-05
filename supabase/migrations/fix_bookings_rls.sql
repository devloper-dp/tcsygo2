-- ============================================
-- Fix Booking RLS Policies
-- Description: Allow users to view their own bookings
-- ============================================

-- Enable RLS on bookings if not already enabled (it should be)
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own bookings
DROP POLICY IF EXISTS "Users view own bookings" ON public.bookings;
CREATE POLICY "Users view own bookings" ON public.bookings
FOR SELECT
USING (auth.uid() = passenger_id);

-- Allow users to create their own bookings (already implicitly handled maybe, but good to be explicit)
DROP POLICY IF EXISTS "Users create own bookings" ON public.bookings;
CREATE POLICY "Users create own bookings" ON public.bookings
FOR INSERT
WITH CHECK (auth.uid() = passenger_id);

-- Allow users to update their own bookings (e.g. cancel)
DROP POLICY IF EXISTS "Users update own bookings" ON public.bookings;
CREATE POLICY "Users update own bookings" ON public.bookings
FOR UPDATE
USING (auth.uid() = passenger_id);

-- Allow drivers to view bookings for their trips
DROP POLICY IF EXISTS "Drivers view trip bookings" ON public.bookings;
CREATE POLICY "Drivers view trip bookings" ON public.bookings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.trips t
    JOIN public.drivers d ON t.driver_id = d.id
    WHERE t.id = trip_id 
    AND d.user_id = auth.uid()
  )
);
