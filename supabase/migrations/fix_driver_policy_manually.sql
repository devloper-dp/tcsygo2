-- ============================================
-- Fix Driver Visibility for Instant Rides
-- Description: Allow authenticated drivers to see 'searching' and 'pending' requests.
-- ============================================

-- Policy: Drivers view available requests
-- Allows any user who has a driver profile to see requests that are 'searching' (Instant) or 'pending' (Scheduled).
DROP POLICY IF EXISTS "Drivers view available requests" ON public.ride_requests;

CREATE POLICY "Drivers view available requests" ON public.ride_requests
FOR SELECT
USING (
  -- The request is in a state that should be visible to drivers
  status IN ('searching', 'pending')
  AND
  -- The current user is a registered driver
  EXISTS (
    SELECT 1 FROM public.drivers 
    WHERE user_id = auth.uid()
  )
);
