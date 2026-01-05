-- Migration: Fix missing tables, columns, RLS policies, and Permissions
-- Date: 2025-01-01

-- 1. Fix Bookings Column Mismatch
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'fare') THEN
    ALTER TABLE public.bookings RENAME COLUMN fare TO total_amount;
  END IF;
END $$;

-- 2. Add missing columns to Users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS push_token TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"messages": true, "trips": true, "bookings": true, "payments": true, "marketing": true}'::jsonb;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending';

-- 3. Create Live Locations Table
CREATE TABLE IF NOT EXISTS public.live_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE NOT NULL,
  lat DECIMAL(10,7) NOT NULL,
  lng DECIMAL(10,7) NOT NULL,
  heading DECIMAL(5,2),
  speed DECIMAL(5,2),
  accuracy DECIMAL(10,2),
  altitude DECIMAL(10,2),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create Ratings Table
CREATE TABLE IF NOT EXISTS public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Grant Permissions (CRITICAL for new tables)
GRANT ALL ON public.live_locations TO anon, authenticated, service_role;
GRANT ALL ON public.messages TO anon, authenticated, service_role;
GRANT ALL ON public.ratings TO anon, authenticated, service_role;

-- 7. Enable RLS
ALTER TABLE public.live_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies

-- Notifications
DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);

-- Live Locations
DROP POLICY IF EXISTS "Anyone can view live locations" ON public.live_locations;
CREATE POLICY "Anyone can view live locations" ON public.live_locations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Drivers can update own location" ON public.live_locations;
CREATE POLICY "Drivers can update own location" ON public.live_locations FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.drivers WHERE id = driver_id AND user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.trips WHERE id = trip_id AND driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()))
);

DROP POLICY IF EXISTS "Drivers can update own location update" ON public.live_locations;
CREATE POLICY "Drivers can update own location update" ON public.live_locations FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.drivers WHERE id = driver_id AND user_id = auth.uid())
);

-- Messages
DROP POLICY IF EXISTS "Users can view involved messages" ON public.messages;
CREATE POLICY "Users can view involved messages" ON public.messages FOR SELECT USING (
  auth.uid() = sender_id OR auth.uid() = receiver_id
);

DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id
);

DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;
CREATE POLICY "Users can update own messages" ON public.messages FOR UPDATE USING (
  auth.uid() = sender_id OR auth.uid() = receiver_id
);

-- Ratings
DROP POLICY IF EXISTS "Public view ratings" ON public.ratings;
CREATE POLICY "Public view ratings" ON public.ratings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create ratings" ON public.ratings;
CREATE POLICY "Users can create ratings" ON public.ratings FOR INSERT WITH CHECK (
  auth.uid() = from_user_id
);

-- Fix RLS for Trip Bookings just in case
DROP POLICY IF EXISTS "View own trip bookings" ON public.bookings;
CREATE POLICY "View own trip bookings" ON public.bookings FOR SELECT USING (
  auth.uid() = passenger_id OR 
  EXISTS (SELECT 1 FROM public.drivers WHERE id = driver_id AND user_id = auth.uid())
);
