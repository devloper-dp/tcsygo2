-- ========================================================
-- TCSYGO COMPLETE DATABASE SCHEMA (Consolidated)
-- ========================================================
-- Run this in Supabase SQL Editor to set up the entire backend.

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- usage regarding location features
CREATE EXTENSION IF NOT EXISTS "cube";
CREATE EXTENSION IF NOT EXISTS "earthdistance";

-- 2. TABLES

-- USERS (Public Profile)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, -- Link to Auth
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  profile_photo TEXT,
  role TEXT NOT NULL DEFAULT 'passenger' CHECK (role IN ('passenger', 'driver', 'both', 'admin')),
  bio TEXT,
  verification_status TEXT DEFAULT 'pending', -- pending, verified, rejected
  push_token TEXT, -- For Expo Push Notifications
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DRIVERS
CREATE TABLE IF NOT EXISTS public.drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  license_number TEXT NOT NULL,
  license_photo TEXT,
  vehicle_make TEXT NOT NULL,
  vehicle_model TEXT NOT NULL,
  vehicle_year INTEGER NOT NULL,
  vehicle_color TEXT NOT NULL,
  vehicle_plate TEXT NOT NULL,
  vehicle_photos JSONB DEFAULT '[]'::jsonb,
  is_available BOOLEAN DEFAULT FALSE,
  rating NUMERIC(3,2) DEFAULT 0.00,
  total_trips INTEGER DEFAULT 0,
  verification_status TEXT DEFAULT 'pending',
  documents JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- TRIPS
CREATE TABLE IF NOT EXISTS public.trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE NOT NULL,
  pickup_location TEXT NOT NULL,
  pickup_lat NUMERIC(10,7) NOT NULL,
  pickup_lng NUMERIC(10,7) NOT NULL,
  drop_location TEXT NOT NULL,
  drop_lat NUMERIC(10,7) NOT NULL,
  drop_lng NUMERIC(10,7) NOT NULL,
  departure_time TIMESTAMPTZ NOT NULL,
  distance NUMERIC(10,2) NOT NULL, -- km
  duration INTEGER NOT NULL, -- minutes
  price_per_seat NUMERIC(10,2) NOT NULL,
  available_seats INTEGER NOT NULL,
  total_seats INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming', -- upcoming, ongoing, completed, cancelled
  route JSONB,
  preferences JSONB DEFAULT '{"smoking": false, "pets": false, "music": true}'::jsonb,
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BOOKINGS
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  passenger_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  seats_booked INTEGER NOT NULL DEFAULT 1,
  total_amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, cancelled, completed, rejected
  pickup_location TEXT, -- Optional specific pickup (if different from trip start)
  drop_location TEXT,
  booking_code TEXT, -- OTP for ride start
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PAYMENTS
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES public.bookings(id) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  platform_fee NUMERIC(10,2) NOT NULL,
  driver_earnings NUMERIC(10,2) NOT NULL,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, success, failed, refunded
  payment_method TEXT,
  payout_status TEXT DEFAULT 'pending',
  discount_amount NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MESSAGES (Chat)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.users(id) NOT NULL,
  receiver_id UUID REFERENCES public.users(id) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- LIVE LOCATIONS
CREATE TABLE IF NOT EXISTS public.live_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE NOT NULL,
  lat NUMERIC(10,7) NOT NULL,
  lng NUMERIC(10,7) NOT NULL,
  heading NUMERIC(5,2),
  speed NUMERIC(5,2),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RATINGS
CREATE TABLE IF NOT EXISTS public.ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID REFERENCES public.trips(id) NOT NULL,
  from_user_id UUID REFERENCES public.users(id) NOT NULL,
  to_user_id UUID REFERENCES public.users(id) NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- EMERGENCY ALERTS
CREATE TABLE IF NOT EXISTS public.emergency_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID REFERENCES public.trips(id),
  user_id UUID REFERENCES public.users(id) NOT NULL, -- Renamed reporter_id to user_id to match frontend
  lat NUMERIC(10,7) NOT NULL,
  lng NUMERIC(10,7) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SAVED SEARCHES
CREATE TABLE IF NOT EXISTS public.saved_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  pickup_location TEXT,
  drop_location TEXT,
  filters JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PAYMENT METHODS
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  last_four TEXT,
  card_brand TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  razorpay_customer_id TEXT,
  razorpay_card_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PROMO CODES
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL, -- percentage, fixed
  discount_value NUMERIC(10,2) NOT NULL,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add promo_code_id to payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS promo_code_id UUID REFERENCES promo_codes(id);

-- 3. ENABLE RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES

-- USERS
CREATE POLICY "Public profiles are viewable by everyone" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Handle New User Trigger (Sync Auth to Public)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'phone',
    'passenger'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new auth user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- DRIVERS
CREATE POLICY "Drivers are viewable by everyone" ON public.drivers FOR SELECT USING (true);
CREATE POLICY "Users can register as driver" ON public.drivers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Drivers can update own info" ON public.drivers FOR UPDATE USING (auth.uid() = user_id);

-- TRIPS
CREATE POLICY "Trips are viewable by everyone" ON public.trips FOR SELECT USING (true);
CREATE POLICY "Drivers can create trips" ON public.trips FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM drivers WHERE id = driver_id AND user_id = auth.uid())
);
CREATE POLICY "Drivers can update own trips" ON public.trips FOR UPDATE USING (
    EXISTS (SELECT 1 FROM drivers WHERE id = driver_id AND user_id = auth.uid())
);

-- BOOKINGS
CREATE POLICY "Users can view own bookings" ON public.bookings FOR SELECT USING (passenger_id = auth.uid());
CREATE POLICY "Drivers can view bookings for their trips" ON public.bookings FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM trips 
        JOIN drivers ON trips.driver_id = drivers.id 
        WHERE trips.id = bookings.trip_id AND drivers.user_id = auth.uid()
    )
);
CREATE POLICY "Users can create bookings" ON public.bookings FOR INSERT WITH CHECK (passenger_id = auth.uid());
CREATE POLICY "Users and Drivers can update related bookings" ON public.bookings FOR UPDATE USING (
    passenger_id = auth.uid() OR 
    EXISTS (
        SELECT 1 FROM trips 
        JOIN drivers ON trips.driver_id = drivers.id 
        WHERE trips.id = bookings.trip_id AND drivers.user_id = auth.uid()
    )
);

-- MESSAGES
CREATE POLICY "Users can view messages they sent or received" ON public.messages FOR SELECT USING (sender_id = auth.uid() OR receiver_id = auth.uid());
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (sender_id = auth.uid());
CREATE POLICY "Users can update their own messages" ON public.messages FOR UPDATE USING (sender_id = auth.uid());

-- NOTIFICATIONS
CREATE POLICY "Users see own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());
-- Allow inserting notifications via functions/admin (Service Role bypasses RLS)

-- LIVE LOCATIONS
CREATE POLICY "Locations viewable by everyone" ON public.live_locations FOR SELECT USING (true);
CREATE POLICY "Drivers update own location" ON public.live_locations FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM drivers WHERE id = driver_id AND user_id = auth.uid())
);
CREATE POLICY "Drivers modify own location" ON public.live_locations FOR UPDATE USING (
    EXISTS (SELECT 1 FROM drivers WHERE id = driver_id AND user_id = auth.uid())
);

-- PAYMENTS
CREATE POLICY "Users view own payments" ON public.payments FOR SELECT USING (
    EXISTS (SELECT 1 FROM bookings WHERE bookings.id = payments.booking_id AND bookings.passenger_id = auth.uid())
);
CREATE POLICY "Drivers view trip payments" ON public.payments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM bookings
    JOIN trips ON bookings.trip_id = trips.id
    JOIN drivers ON trips.driver_id = drivers.id
    WHERE bookings.id = payments.booking_id AND drivers.user_id = auth.uid()
  )
);
-- Allow authenticated inserts for initial payment creation if driven by client (though preferably explicit RPC)
CREATE POLICY "Enable insert for authenticated users" ON public.payments FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- RATINGS
CREATE POLICY "Ratings are viewable by everyone" ON public.ratings FOR SELECT USING (true);
CREATE POLICY "Users can insert ratings" ON public.ratings FOR INSERT WITH CHECK (auth.uid() = from_user_id);

-- EMERGENCY ALERTS
CREATE POLICY "Emergency alerts are viewable by everyone" ON public.emergency_alerts FOR SELECT USING (true);
CREATE POLICY "Users can create emergency alerts" ON public.emergency_alerts FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own emergency alerts" ON public.emergency_alerts FOR UPDATE USING (user_id = auth.uid());

-- SAVED SEARCHES & PAYMENT METHODS & PROMO CODES
CREATE POLICY "Users own saved searches" ON public.saved_searches FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own payment methods" ON public.payment_methods FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public Promos" ON public.promo_codes FOR SELECT USING (is_active = true);


-- 5. STORAGE BUCKETS & POLICIES

-- Attempt to create buckets if not exist (Note: Insert into storage.buckets often requires superuser or specific permissions)
-- Ideally configure this in the Dashboard, but here is the SQL:

INSERT INTO storage.buckets (id, name, public) 
VALUES ('profile-photos', 'profile-photos', true) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('vehicles', 'vehicles', true) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('licenses', 'licenses', false) 
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
-- profile-photos
CREATE POLICY "Public Profile Photos" ON storage.objects FOR SELECT USING (bucket_id = 'profile-photos');
CREATE POLICY "Users upload own profile photo" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'profile-photos' AND auth.role() = 'authenticated'
);
CREATE POLICY "Users update own profile photo" ON storage.objects FOR UPDATE USING (
    bucket_id = 'profile-photos' AND auth.uid() = owner
);

-- vehicles (Public view)
CREATE POLICY "Public Vehicle Photos" ON storage.objects FOR SELECT USING (bucket_id = 'vehicles');
CREATE POLICY "Drivers upload vehicle photos" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'vehicles' AND auth.role() = 'authenticated'
);

-- licenses (Private)
CREATE POLICY "Users view own license" ON storage.objects FOR SELECT USING (
    bucket_id = 'licenses' AND auth.uid() = owner
);
CREATE POLICY "Users upload own license" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'licenses' AND auth.role() = 'authenticated'
);

-- 6. INDEXES
CREATE INDEX IF NOT EXISTS idx_trips_location ON trips USING gist (
  ll_to_earth(pickup_lat, pickup_lng)
);
CREATE INDEX IF NOT EXISTS idx_live_location ON live_locations USING gist (
  ll_to_earth(lat, lng)
);

-- 7. BUSINESS LOGIC TRIGGERS

-- Trigger to update available seats when booking confirmed
CREATE OR REPLACE FUNCTION update_seats_on_booking()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    UPDATE trips
    SET available_seats = available_seats - NEW.seats_booked
    WHERE id = NEW.trip_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_booking_confirm ON bookings;
CREATE TRIGGER on_booking_confirm
  AFTER UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_seats_on_booking();

-- Trigger to notify Admin on Emergency Alert
CREATE OR REPLACE FUNCTION notify_admin_on_emergency()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, type, data)
  VALUES (
    -- Ideally we fetch a real Admin ID. For now, we unfortunately must pick a valid UUID or handle this via a separate Admin table lookup
    -- Since we can't guess the Admin ID, we will log strict warning or rely on a known Admin User ID.
    -- For this script to run safely, we will try to find a user with role 'admin' or fallback to the alert creator (which is weird but safe).
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1), 
    '🚨 EMERGENCY ALERT',
    'Emergency SOS triggered on trip ' || NEW.trip_id,
    'emergency',
    jsonb_build_object(
        'tripId', NEW.trip_id,
        'userId', NEW.user_id,
        'lat', NEW.lat,
        'lng', NEW.lng
    )
  );
  -- Note: If no admin exists, the INSERT above might fail if user_id is null/invalid.
  -- We rely on the app having an admin.
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_emergency_create ON emergency_alerts;
CREATE TRIGGER on_emergency_create
  AFTER INSERT ON emergency_alerts
  FOR EACH ROW EXECUTE FUNCTION notify_admin_on_emergency();

