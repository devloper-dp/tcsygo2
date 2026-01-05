-- ============================================
-- Fix Booking and Tracking Visibility
-- Description: Allow drivers to update bookings and broadcast location
-- ============================================

-- 1. BOOKINGS POLICIES
-- Allow drivers to view bookings where they are the driver
DROP POLICY IF EXISTS "Drivers view assigned bookings" ON public.bookings;
CREATE POLICY "Drivers view assigned bookings" ON public.bookings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.drivers
    WHERE id = bookings.driver_id
    AND user_id = auth.uid()
  )
  OR
  passenger_id = auth.uid()
);

-- Allow drivers to update bookings where they are the driver (CRITICAL for accept flow)
DROP POLICY IF EXISTS "Drivers update assigned bookings" ON public.bookings;
CREATE POLICY "Drivers update assigned bookings" ON public.bookings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.drivers
    WHERE id = bookings.driver_id
    AND user_id = auth.uid()
  )
);

-- 2. LIVE LOCATIONS POLICIES
ALTER TABLE public.live_locations ENABLE ROW LEVEL SECURITY;

-- Allow drivers to insert/update their own live location
DROP POLICY IF EXISTS "Drivers manage own live locations" ON public.live_locations;
CREATE POLICY "Drivers manage own live locations" ON public.live_locations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.drivers
    WHERE id = live_locations.driver_id
    AND user_id = auth.uid()
  )
);

-- Allow authenticated users to view live locations (for tracking)
DROP POLICY IF EXISTS "Authenticated users view live locations" ON public.live_locations;
CREATE POLICY "Authenticated users view live locations" ON public.live_locations
FOR SELECT
TO authenticated
USING (true);

-- 3. TRIPS POLICIES (Ensure drivers can manage their trips)
-- Allow drivers to update their trips (e.g. status)
DROP POLICY IF EXISTS "Drivers manage own trips" ON public.trips;
CREATE POLICY "Drivers manage own trips" ON public.trips
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.drivers
    WHERE id = trips.driver_id
    AND user_id = auth.uid()
  )
);

-- Allow passengers to view trips they are booked on OR all trips (usually public search)
-- Assuming trips are generally visible, but let's ensure:
DROP POLICY IF EXISTS "Public view trips" ON public.trips;
CREATE POLICY "Public view trips" ON public.trips
FOR SELECT
USING (true);

-- 4. DATA FIX (Fix existing broken bookings)
-- Link bookings to trips if they are missing trip_id but trip references the booking
DO $$
BEGIN
  UPDATE public.bookings b
  SET trip_id = t.id
  FROM public.trips t
  WHERE t.booking_id = b.id
  AND b.trip_id IS NULL;
  
  RAISE NOTICE 'Fixed missing trip_ids on bookings.';
END $$;
