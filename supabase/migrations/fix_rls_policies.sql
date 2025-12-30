-- ============================================
-- Fix Missing RLS Policies
-- Description: Add missing RLS policies for ride_requests and ride_preferences tables
-- ============================================

-- ============================================
-- 1. RIDE_REQUESTS POLICIES
-- ============================================

-- Allow users to view their own ride requests
DROP POLICY IF EXISTS "Users view own ride requests" ON public.ride_requests;
CREATE POLICY "Users view own ride requests" ON public.ride_requests 
FOR SELECT 
USING (auth.uid() = passenger_id);

-- Allow users to create ride requests for themselves
DROP POLICY IF EXISTS "Users create own ride requests" ON public.ride_requests;
CREATE POLICY "Users create own ride requests" ON public.ride_requests 
FOR INSERT 
WITH CHECK (auth.uid() = passenger_id);

-- Allow users to update their own ride requests
DROP POLICY IF EXISTS "Users update own ride requests" ON public.ride_requests;
CREATE POLICY "Users update own ride requests" ON public.ride_requests 
FOR UPDATE 
USING (auth.uid() = passenger_id);

-- Allow users to delete their own ride requests
DROP POLICY IF EXISTS "Users delete own ride requests" ON public.ride_requests;
CREATE POLICY "Users delete own ride requests" ON public.ride_requests 
FOR DELETE 
USING (auth.uid() = passenger_id);

-- Allow drivers to view ride requests matched to them
DROP POLICY IF EXISTS "Drivers view matched ride requests" ON public.ride_requests;
CREATE POLICY "Drivers view matched ride requests" ON public.ride_requests 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.drivers 
    WHERE id = matched_driver_id AND user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.drivers 
    WHERE id = driver_id AND user_id = auth.uid()
  )
);

-- Allow drivers to update ride requests matched to them (accept/reject)
DROP POLICY IF EXISTS "Drivers update matched ride requests" ON public.ride_requests;
CREATE POLICY "Drivers update matched ride requests" ON public.ride_requests 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.drivers 
    WHERE id = matched_driver_id AND user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.drivers 
    WHERE id = driver_id AND user_id = auth.uid()
  )
);

-- ============================================
-- 2. RIDE_PREFERENCES POLICIES
-- ============================================

-- Allow users to view their own ride preferences
DROP POLICY IF EXISTS "Users view own ride preferences" ON public.ride_preferences;
CREATE POLICY "Users view own ride preferences" ON public.ride_preferences 
FOR SELECT 
USING (auth.uid() = user_id);

-- Allow users to insert their own ride preferences
DROP POLICY IF EXISTS "Users create own ride preferences" ON public.ride_preferences;
CREATE POLICY "Users create own ride preferences" ON public.ride_preferences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own ride preferences
DROP POLICY IF EXISTS "Users update own ride preferences" ON public.ride_preferences;
CREATE POLICY "Users update own ride preferences" ON public.ride_preferences 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Allow users to delete their own ride preferences
DROP POLICY IF EXISTS "Users delete own ride preferences" ON public.ride_preferences;
CREATE POLICY "Users delete own ride preferences" ON public.ride_preferences 
FOR DELETE 
USING (auth.uid() = user_id);

-- ============================================
-- 3. SAVED_PLACES POLICIES (Additional Fix)
-- ============================================

-- Allow users to view their own saved places
DROP POLICY IF EXISTS "Users view own saved places" ON public.saved_places;
CREATE POLICY "Users view own saved places" ON public.saved_places 
FOR SELECT 
USING (auth.uid() = user_id);

-- Allow users to create their own saved places
DROP POLICY IF EXISTS "Users create own saved places" ON public.saved_places;
CREATE POLICY "Users create own saved places" ON public.saved_places 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own saved places
DROP POLICY IF EXISTS "Users update own saved places" ON public.saved_places;
CREATE POLICY "Users update own saved places" ON public.saved_places 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Allow users to delete their own saved places
DROP POLICY IF EXISTS "Users delete own saved places" ON public.saved_places;
CREATE POLICY "Users delete own saved places" ON public.saved_places 
FOR DELETE 
USING (auth.uid() = user_id);

-- ============================================
-- 4. NOTIFICATIONS POLICIES (Additional Fix)
-- ============================================

-- Allow users to view their own notifications
DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications" ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

-- Allow users to update their own notifications (mark as read)
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications" ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Allow users to delete their own notifications
DROP POLICY IF EXISTS "Users delete own notifications" ON public.notifications;
CREATE POLICY "Users delete own notifications" ON public.notifications 
FOR DELETE 
USING (auth.uid() = user_id);

-- ============================================
-- COMPLETION
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'RLS policies added successfully for ride_requests, ride_preferences, saved_places, and notifications tables.';
END $$;
