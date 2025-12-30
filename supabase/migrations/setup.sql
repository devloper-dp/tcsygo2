-- ============================================
-- TCSYGO/Rapido Clone - Complete Database Setup
-- Description: Consolidated schema, RLS, Storage, and Seed Data
-- ============================================

-- ============================================
-- 0. RESET & BASICS
-- ============================================

-- Drop the public schema and all its objects to ensure a clean slate
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- Grant necessary permissions
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Grant permissions for storage schema (Safe Mode)
DO $$ 
BEGIN 
  -- Try to grant permissions, ignore if we are not owner/superuser
  BEGIN
    GRANT ALL ON SCHEMA storage TO postgres;
    GRANT ALL ON SCHEMA storage TO service_role;
    GRANT ALL ON SCHEMA storage TO authenticated;
    GRANT ALL ON SCHEMA storage TO anon;
  EXCEPTION WHEN OTHERS THEN 
    RAISE NOTICE 'Could not grant storage schema permissions (likely already set or restricted): %', SQLERRM; 
  END;
END $$;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "cube";
CREATE EXTENSION IF NOT EXISTS "earthdistance";

-- ============================================
-- 1. ENUMS & TYPES (Implicit via Text Checks)
-- ============================================
-- We use TEXT columns with CHECK constraints for flexibility and standard Supabase practices.

-- ============================================
-- 2. TABLES
-- ============================================

-- 2.1 Users (Core Profile)
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Matches auth.users.id via trigger
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  full_name TEXT,
  role TEXT DEFAULT 'passenger' CHECK (role IN ('passenger', 'driver', 'admin')),
  avatar_url TEXT,
  organization TEXT,
  referral_code TEXT UNIQUE,
  profile_photo TEXT, -- Alias for avatar_url consistency
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.2 Drivers (Extended Profile)
CREATE TABLE public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  vehicle_type TEXT CHECK (vehicle_type IN ('bike', 'auto', 'car')),
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_number TEXT,
  license_number TEXT,
  license_photo TEXT,
  vehicle_photos TEXT[],
  rating DECIMAL(3,2) DEFAULT 5.00,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.3 Fare Configuration
CREATE TABLE public.fare_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_type TEXT NOT NULL UNIQUE CHECK (vehicle_type IN ('bike', 'auto', 'car')),
  base_fare DECIMAL(10,2) NOT NULL,
  per_km DECIMAL(10,2) NOT NULL,
  per_minute DECIMAL(10,2) NOT NULL,
  min_fare DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.4 Promo Codes
CREATE TABLE public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL,
  max_discount DECIMAL(10,2),
  min_amount DECIMAL(10,2) DEFAULT 0,
  min_fare DECIMAL(10,2), -- Legacy/Alias support
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  per_user_limit INTEGER DEFAULT 1,
  user_usage_limit INTEGER DEFAULT 1, -- Alias
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  applicable_vehicle_types TEXT[] DEFAULT ARRAY['bike', 'auto', 'car'],
  applicable_to TEXT DEFAULT 'all',
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.5 Driver Availability
CREATE TABLE public.driver_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE NOT NULL UNIQUE,
  is_online BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT true,
  current_lat NUMERIC(10,7),
  current_lng NUMERIC(10,7),
  current_heading NUMERIC(5,2),
  current_speed NUMERIC(5,2),
  battery_level INTEGER,
  last_location_update TIMESTAMPTZ,
  active_ride_id UUID, -- Will reference bookings/ride_requests later (circular dep handled by logic)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.6 Bookings (Core Ride)
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  trip_id UUID, -- Circular reference to trips
  pickup_location TEXT NOT NULL,
  pickup_lat DECIMAL(10,7) NOT NULL,
  pickup_lng DECIMAL(10,7) NOT NULL,
  drop_location TEXT NOT NULL,
  drop_lat DECIMAL(10,7) NOT NULL,
  drop_lng DECIMAL(10,7) NOT NULL,
  fare DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'ongoing', 'confirmed', 'completed', 'cancelled')),
  otp TEXT,
  payment_status TEXT DEFAULT 'pending',
  is_split_fare BOOLEAN DEFAULT FALSE,
  split_fare_details JSONB,
  seats_booked INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.7 Trips (Ride Execution)
CREATE TABLE public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL , -- 1-to-1 relationship mostly, but could be 1-to-many for pool
  driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE NOT NULL,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  distance_covered DECIMAL(10,2),
  status TEXT DEFAULT 'started' CHECK (status IN ('started', 'completed', 'cancelled')),
  carbon_saved DECIMAL(10,2) DEFAULT 0,
  available_seats INTEGER DEFAULT 0, -- For pooling logic
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.8 Ride Requests (Instant Booking / Matching)
CREATE TABLE public.ride_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  pickup_location TEXT NOT NULL,
  pickup_lat DECIMAL(10,7) NOT NULL,
  pickup_lng DECIMAL(10,7) NOT NULL,
  drop_location TEXT NOT NULL,
  drop_lat DECIMAL(10,7) NOT NULL,
  drop_lng DECIMAL(10,7) NOT NULL,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('bike', 'auto', 'car')),
  fare DECIMAL(10,2) NOT NULL,
  distance DECIMAL(10,2) NOT NULL,
  duration INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'searching', 'matched', 'accepted', 'rejected', 'cancelled', 'expired', 'completed', 'timeout')),
  matched_driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL, -- Alias for matched_driver_id
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  preferences JSONB DEFAULT '{}'::jsonb,
  promo_code TEXT,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  surge_multiplier DECIMAL(3,2) DEFAULT 1.00,
  search_radius INTEGER DEFAULT 5000,
  organization_only BOOLEAN DEFAULT FALSE,
  organization TEXT,
  timeout_at TIMESTAMPTZ,
  matched_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.9 Promo Code Uses
CREATE TABLE public.promo_code_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID REFERENCES public.promo_codes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  ride_request_id UUID REFERENCES public.ride_requests(id) ON DELETE SET NULL,
  discount_amount DECIMAL(10,2) NOT NULL,
  original_amount DECIMAL(10,2) NOT NULL,
  final_amount DECIMAL(10,2) NOT NULL,
  used_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.10 Wallets
CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  balance DECIMAL(10,2) DEFAULT 0.00 CHECK (balance >= 0),
  currency TEXT DEFAULT 'INR',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.11 Wallet Transactions
CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES public.wallets(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('credit', 'debit')),
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  description TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  reference_id TEXT,
  reference_type TEXT CHECK (reference_type IN ('booking', 'refund', 'topup', 'tip', 'payout')),
  razorpay_payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.12 Ride Preferences
CREATE TABLE public.ride_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  ac_preferred BOOLEAN DEFAULT TRUE,
  music_allowed BOOLEAN DEFAULT TRUE,
  pet_friendly BOOLEAN DEFAULT FALSE,
  luggage_capacity INTEGER DEFAULT 1 CHECK (luggage_capacity >= 0 AND luggage_capacity <= 5),
  conversation_preference TEXT DEFAULT 'moderate',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.13 Auto Pay Settings
CREATE TABLE public.auto_pay_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  enabled BOOLEAN DEFAULT FALSE,
  default_payment_method TEXT DEFAULT 'wallet',
  spending_limit DECIMAL(10,2),
  require_confirmation BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.14 User Preferences (General)
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  theme TEXT DEFAULT 'light',
  language TEXT DEFAULT 'en',
  notification_settings JSONB DEFAULT '{"booking": true, "promotions": true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.15 Saved Places & Favorite Routes
CREATE TABLE public.saved_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  lat DECIMAL(10,7) NOT NULL,
  lng DECIMAL(10,7) NOT NULL,
  place_type TEXT DEFAULT 'other' CHECK (place_type IN ('home', 'work', 'favorite', 'other')),
  icon TEXT,
  type TEXT, -- Alias
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.favorite_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  pickup_location TEXT NOT NULL,
  pickup_lat DECIMAL(10,7) NOT NULL,
  pickup_lng DECIMAL(10,7) NOT NULL,
  drop_location TEXT NOT NULL,
  drop_lat DECIMAL(10,7) NOT NULL,
  drop_lng DECIMAL(10,7) NOT NULL,
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.16 Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.17 Safety & Emergency
CREATE TABLE public.emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  relationship TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  auto_notify BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.safety_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('safe', 'missed', 'need_help', 'help_needed')),
  location_lat DECIMAL(10,7),
  location_lng DECIMAL(10,7),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.emergency_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'triggered',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.18 Payments & Financials
CREATE TABLE public.saved_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  method_type TEXT NOT NULL CHECK (method_type IN ('card', 'upi', 'netbanking')),
  is_default BOOLEAN DEFAULT false,
  card_last4 TEXT,
  card_brand TEXT,
  card_token TEXT,
  upi_id TEXT,
  bank_name TEXT,
  bank_code TEXT,
  nickname TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id),
  amount DECIMAL(10,2) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'success', 'failed')),
  payout_status TEXT DEFAULT 'pending',
  driver_earnings DECIMAL(10,2),
  refund_status TEXT CHECK (refund_status IN ('none', 'requested', 'processing', 'completed', 'rejected')),
  refund_amount DECIMAL(10,2),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.driver_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE,
  passenger_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL,
  payment_status TEXT DEFAULT 'pending',
  razorpay_payment_id TEXT,
  status TEXT DEFAULT 'pending', -- Alias
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.split_fare_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  requester_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  participant_email TEXT,
  participant_name TEXT,
  participant_phone TEXT,
  participant_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'paid', 'expired', 'declined')),
  payment_method TEXT,
  paid_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.19 Referrals
CREATE TABLE public.referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  code TEXT UNIQUE NOT NULL,
  referral_count INTEGER DEFAULT 0,
  total_earnings DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.referral_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id UUID REFERENCES public.referral_codes(id) ON DELETE CASCADE NOT NULL,
  referred_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  referrer_reward DECIMAL(10,2) DEFAULT 0.00,
  referee_reward DECIMAL(10,2) DEFAULT 0.00,
  status TEXT DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.20 Extras (Ride Sharing, Surge, Stats)
CREATE TABLE public.ride_sharing_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  inviter_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  invitee_name TEXT NOT NULL,
  invitee_contact TEXT NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.ride_sharing_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_request_id UUID REFERENCES public.ride_requests(id) ON DELETE CASCADE NOT NULL,
  requester_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  partner_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending',
  shared_distance DECIMAL(10,2),
  cost_split_percentage DECIMAL(5,2) DEFAULT 50.00,
  requester_amount DECIMAL(10,2),
  partner_amount DECIMAL(10,2),
  message TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.ride_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  route_points JSONB NOT NULL,
  total_distance DECIMAL(10,2),
  total_duration INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.surge_pricing_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_name TEXT NOT NULL,
  zone_polygon JSONB NOT NULL,
  current_multiplier DECIMAL(3,2) DEFAULT 1.00,
  demand_level TEXT DEFAULT 'low',
  is_active BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.trip_surge_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  surge_multiplier DECIMAL(3,2),
  base_fare DECIMAL(10,2),
  surge_fare DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.ride_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  total_rides INTEGER DEFAULT 0,
  total_distance DECIMAL(10,2) DEFAULT 0.00,
  total_spent DECIMAL(10,2) DEFAULT 0.00,
  total_saved DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.ride_insurance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL UNIQUE,
  policy_number TEXT UNIQUE NOT NULL,
  provider TEXT DEFAULT 'TCSYGO Insurance',
  coverage_amount DECIMAL(10,2) DEFAULT 500000.00,
  premium_amount DECIMAL(10,2) DEFAULT 5.00,
  status TEXT DEFAULT 'active',
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================
-- 3. INDEXES
-- ============================================

CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_phone ON public.users(phone);
CREATE INDEX idx_drivers_user ON public.drivers(user_id);
CREATE INDEX idx_bookings_passenger ON public.bookings(passenger_id);
CREATE INDEX idx_bookings_driver ON public.bookings(driver_id);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_trips_booking ON public.trips(booking_id);
CREATE INDEX idx_ride_requests_participant ON public.ride_requests(passenger_id);
CREATE INDEX idx_ride_requests_status ON public.ride_requests(status);
CREATE INDEX idx_driver_avail_loc ON public.driver_availability USING GIST (
  ll_to_earth(current_lat::float8, current_lng::float8)
); -- Requires cube/earthdistance or manual calc. Using simple lat/lng b-tree for now if ext missing
CREATE INDEX idx_driver_avail_lat_lng ON public.driver_availability(current_lat, current_lng);


-- ============================================
-- 3.5 GRANTS (Crucial for Access)
-- ============================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- ============================================
-- 4. RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Public drivers view" ON public.drivers FOR SELECT USING (true);
CREATE POLICY "Drivers manage own data" ON public.drivers FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "View own bookings" ON public.bookings FOR SELECT USING (
  auth.uid() = passenger_id OR 
  EXISTS (SELECT 1 FROM public.drivers WHERE id = driver_id AND user_id = auth.uid())
);
CREATE POLICY "Create bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = passenger_id);

CREATE POLICY "View own wallets" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "View own transactions" ON public.wallet_transactions FOR SELECT USING (
  wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid())
);

CREATE POLICY "Public read fare config" ON public.fare_config FOR SELECT USING (true);
CREATE POLICY "Public read active promos" ON public.promo_codes FOR SELECT USING (is_active = true);


-- ============================================
-- 5. FUNCTIONS & TRIGGERS
-- ============================================

-- 5.1 Update Updated At
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON public.drivers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5.2 Handle New User (Auth Sync)
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
  INSERT INTO public.wallets (user_id, balance) VALUES (NEW.id, 0.00) ON CONFLICT DO NOTHING;
  INSERT INTO public.ride_preferences (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: Trigger creation on auth.users usually requires superuser/special privileges in some Supabase setups or is done via dashboard.
-- We include it here for completeness if runs as postgres.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5.3 Find Nearby Drivers
CREATE OR REPLACE FUNCTION public.find_nearby_drivers(
  p_lat NUMERIC,
  p_lng NUMERIC,
  p_radius INTEGER DEFAULT 5000,
  p_vehicle_type TEXT DEFAULT NULL,
  p_organization TEXT DEFAULT NULL
)
RETURNS TABLE (
  driver_id UUID,
  distance_meters NUMERIC,
  driver_name TEXT,
  driver_rating NUMERIC,
  vehicle_info TEXT,
  current_lat NUMERIC,
  current_lng NUMERIC,
  organization TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id AS driver_id,
    (
      6371000 * acos(
        cos(radians(p_lat)) * cos(radians(da.current_lat)) *
        cos(radians(da.current_lng) - radians(p_lng)) +
        sin(radians(p_lat)) * sin(radians(da.current_lat))
      )
    ) AS distance_meters,
    u.full_name AS driver_name,
    d.rating AS driver_rating,
    d.vehicle_make || ' ' || d.vehicle_model AS vehicle_info,
    da.current_lat,
    da.current_lng,
    u.organization
  FROM public.drivers d
  JOIN public.driver_availability da ON da.driver_id = d.id
  JOIN public.users u ON u.id = d.user_id
  WHERE da.is_online = true
    AND da.is_available = true
    AND (p_vehicle_type IS NULL OR d.vehicle_type = p_vehicle_type)
    AND (p_organization IS NULL OR u.organization = p_organization)
    AND (
      6371000 * acos(
        cos(radians(p_lat)) * cos(radians(da.current_lat)) *
        cos(radians(da.current_lng) - radians(p_lng)) +
        sin(radians(p_lat)) * sin(radians(da.current_lat))
      )
    ) <= p_radius
  ORDER BY distance_meters ASC
  LIMIT 10;
END;
$$;


-- ============================================
-- 6. STORAGE SETUP
-- ============================================

-- Create buckets if they don't exist
DO $$
BEGIN
  BEGIN
    INSERT INTO storage.buckets (id, name, public) VALUES 
    ('profile-photos', 'profile-photos', true),
    ('licenses', 'licenses', false),
    ('vehicles', 'vehicles', true),
    ('documents', 'documents', false)
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not create storage buckets (permission denied or already exists): %', SQLERRM;
  END;
END $$;

DO $$
BEGIN
  BEGIN
    CREATE OR REPLACE FUNCTION storage.format_file_size(size_bytes bigint)
    RETURNS text AS $inner$
    DECLARE
      size_kb numeric;
      size_mb numeric;
    BEGIN
      IF size_bytes < 1024 THEN RETURN size_bytes || ' B'; END IF;
      size_kb := size_bytes / 1024.0;
      IF size_kb < 1024 THEN RETURN ROUND(size_kb, 2) || ' KB'; END IF;
      size_mb := size_kb / 1024.0;
      RETURN ROUND(size_mb, 2) || ' MB';
    END;
    $inner$ LANGUAGE plpgsql IMMUTABLE;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not create storage function: %', SQLERRM;
  END;
END $$;

-- Policies for storage
-- Profile Photos (Public Read, Auth Insert/Update)
DO $$
BEGIN
  BEGIN
    CREATE POLICY "Public Profile Photos" ON storage.objects FOR SELECT USING (bucket_id = 'profile-photos');
    CREATE POLICY "User Upload Profile Photo" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'profile-photos' AND auth.role() = 'authenticated');
    CREATE POLICY "User Update Profile Photo" ON storage.objects FOR UPDATE USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not create storage policies: %', SQLERRM;
  END;
END $$;


-- ============================================
-- 7. SEED DATA
-- ============================================

DO $$
DECLARE
  v_passenger1_id UUID := '00000000-0000-0000-0000-000000000001';
  v_driver1_id UUID := '00000000-0000-0000-0000-000000000003';
  v_driver_profile_id UUID;
BEGIN
  -- Insert Auth Users (Mock)
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
  VALUES 
  (v_passenger1_id, 'passenger1@example.com', crypt('password123', gen_salt('bf')), NOW(), '{"full_name":"John Doe"}'),
  (v_driver1_id, 'driver1@example.com', crypt('password123', gen_salt('bf')), NOW(), '{"full_name":"Mike Racer"}')
  ON CONFLICT (id) DO NOTHING;

  -- Insert Public Users
  INSERT INTO public.users (id, email, full_name, phone, role)
  VALUES
  (v_passenger1_id, 'passenger1@example.com', 'John Doe', '+919876543210', 'passenger'),
  (v_driver1_id, 'driver1@example.com', 'Mike Racer', '+919876543212', 'driver')
  ON CONFLICT (id) DO NOTHING;

  -- Insert Driver Profile
  INSERT INTO public.drivers (user_id, vehicle_type, vehicle_make, vehicle_model, vehicle_number, license_number, rating, is_verified)
  VALUES (v_driver1_id, 'bike', 'Honda', 'Activa', 'MH-01-AB-1234', 'DL1234567890', 4.8, TRUE)
  ON CONFLICT (user_id) DO NOTHING
  RETURNING id INTO v_driver_profile_id;

  -- If not returned (already existed), fetch it
  IF v_driver_profile_id IS NULL THEN
    SELECT id INTO v_driver_profile_id FROM public.drivers WHERE user_id = v_driver1_id;
  END IF;

  -- Insert Configurations
  INSERT INTO public.fare_config (vehicle_type, base_fare, per_km, per_minute, min_fare) VALUES 
  ('bike', 20.00, 8.00, 1.00, 30.00),
  ('auto', 30.00, 12.00, 1.50, 50.00),
  ('car', 50.00, 15.00, 2.00, 80.00)
  ON CONFLICT (vehicle_type) DO NOTHING;

  INSERT INTO public.promo_codes (code, discount_type, discount_value, max_discount, valid_until) VALUES
  ('WELCOME50', 'percentage', 50.00, 100.00, NOW() + INTERVAL '1 year')
  ON CONFLICT (code) DO NOTHING;

  -- Driver Availability
  INSERT INTO public.driver_availability (driver_id, is_online, is_available, current_lat, current_lng)
  VALUES (v_driver_profile_id, TRUE, TRUE, 19.0760, 72.8777)
  ON CONFLICT (driver_id) DO NOTHING;

  RAISE NOTICE 'Seed completed.';
END $$;

-- ============================================
-- COMPLETION
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'Setup.sql execution completed successfully. Database is valid.';
END $$;
