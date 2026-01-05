-- ============================================
-- Fix Driver Permissions for Bookings
-- Description: Allow authenticated drivers to CREATE and UPDATE bookings.
-- ============================================

-- 1. DROP existing restrictive policies if necessary (optional, but cleaner if we replace)
-- We don't want to drop "Create bookings" for passengers, so we will ADD a new policy.

-- Policy: Drivers create bookings
-- Allows a user to insert a booking IF they are the assigned driver.
CREATE POLICY "Drivers create bookings" ON public.bookings
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.drivers 
    WHERE id = driver_id 
    AND user_id = auth.uid()
  )
);

-- Policy: Drivers update bookings
-- Allows a user to update a booking IF they are the assigned driver (e.g., adding trip_id, changing status)
CREATE POLICY "Drivers update their bookings" ON public.bookings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.drivers 
    WHERE id = driver_id 
    AND user_id = auth.uid()
  )
);

-- Ensure Drivers can select the bookings they just created (already covered by "View own bookings" usually, but let's double check)
-- "View own bookings" checks: auth.uid() = passenger_id OR EXISTS (SELECT 1 FROM drivers WHERE id = driver_id AND user_id = auth.uid())
-- This is already correct for drivers! So SELECT is fine.
