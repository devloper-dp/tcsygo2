-- ========================================================
-- TCSYGO CONSOLIDATED DATABASE SCHEMA
-- ========================================================
-- This script sets up all tables, indexes, and RLS policies
-- required for the TCSYGO platform.
-- Run this in your Supabase SQL Editor.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================================
-- CORE TABLES
-- ========================================================

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  profile_photo TEXT,
  role TEXT NOT NULL DEFAULT 'passenger',
  bio TEXT,
  verification_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create drivers table
CREATE TABLE IF NOT EXISTS drivers (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR REFERENCES users(id) NOT NULL,
  license_number TEXT NOT NULL,
  license_photo TEXT,
  vehicle_make TEXT NOT NULL,
  vehicle_model TEXT NOT NULL,
  vehicle_year INTEGER NOT NULL,
  vehicle_color TEXT NOT NULL,
  vehicle_plate TEXT NOT NULL,
  vehicle_photos JSONB DEFAULT '[]',
  is_available BOOLEAN DEFAULT FALSE,
  rating DECIMAL(3,2) DEFAULT 0.00,
  total_trips INTEGER DEFAULT 0,
  verification_status TEXT DEFAULT 'pending',
  documents JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create trips table
CREATE TABLE IF NOT EXISTS trips (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id VARCHAR REFERENCES drivers(id) NOT NULL,
  pickup_location TEXT NOT NULL,
  pickup_lat DECIMAL(10,7) NOT NULL,
  pickup_lng DECIMAL(10,7) NOT NULL,
  drop_location TEXT NOT NULL,
  drop_lat DECIMAL(10,7) NOT NULL,
  drop_lng DECIMAL(10,7) NOT NULL,
  departure_time TIMESTAMP NOT NULL,
  distance DECIMAL(10,2) NOT NULL,
  duration INTEGER NOT NULL,
  price_per_seat DECIMAL(10,2) NOT NULL,
  available_seats INTEGER NOT NULL,
  total_seats INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming',
  route JSONB,
  preferences JSONB DEFAULT '{}',
  cancellation_reason TEXT,
  cancelled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id VARCHAR REFERENCES trips(id) NOT NULL,
  passenger_id VARCHAR REFERENCES users(id) NOT NULL,
  seats_booked INTEGER NOT NULL DEFAULT 1,
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  pickup_location TEXT,
  drop_location TEXT,
  cancellation_reason TEXT,
  cancelled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id VARCHAR REFERENCES bookings(id) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL,
  driver_earnings DECIMAL(10,2) NOT NULL,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  payout_status TEXT DEFAULT 'pending',
  promo_code_id VARCHAR, -- Added references later if needed
  discount_amount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create ratings table
CREATE TABLE IF NOT EXISTS ratings (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id VARCHAR REFERENCES trips(id) NOT NULL,
  from_user_id VARCHAR REFERENCES users(id) NOT NULL,
  to_user_id VARCHAR REFERENCES users(id) NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create live_locations table
CREATE TABLE IF NOT EXISTS live_locations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id VARCHAR REFERENCES trips(id) NOT NULL,
  driver_id VARCHAR REFERENCES drivers(id) NOT NULL,
  lat DECIMAL(10,7) NOT NULL,
  lng DECIMAL(10,7) NOT NULL,
  heading DECIMAL(5,2),
  speed DECIMAL(5,2),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR REFERENCES users(id) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ========================================================
-- FEATURE TABLES
-- ========================================================

-- Add messages table for chat functionality
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id VARCHAR REFERENCES trips(id) NOT NULL,
  sender_id VARCHAR REFERENCES users(id) NOT NULL,
  receiver_id VARCHAR REFERENCES users(id) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add emergency_alerts table for SOS functionality
CREATE TABLE IF NOT EXISTS emergency_alerts (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id VARCHAR REFERENCES trips(id) NOT NULL,
  user_id VARCHAR REFERENCES users(id) NOT NULL,
  lat DECIMAL(10,7) NOT NULL,
  lng DECIMAL(10,7) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add saved_searches table for user preferences
CREATE TABLE IF NOT EXISTS saved_searches (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR REFERENCES users(id) NOT NULL,
  name TEXT NOT NULL,
  pickup_location TEXT,
  drop_location TEXT,
  filters JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add payment_methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR REFERENCES users(id) NOT NULL,
  type TEXT NOT NULL,
  last_four TEXT,
  card_brand TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  razorpay_customer_id TEXT,
  razorpay_card_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add promo_codes table
CREATE TABLE IF NOT EXISTS promo_codes (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL,
  discount_value DECIMAL(10,2) NOT NULL,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  valid_from TIMESTAMP NOT NULL,
  valid_until TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add promo_code_id FK to payments
ALTER TABLE payments ADD CONSTRAINT fk_payments_promo_code FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id);

-- ========================================================
-- INDEXES
-- ========================================================

CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_departure ON trips(departure_time);
CREATE INDEX IF NOT EXISTS idx_bookings_passenger ON bookings(passenger_id);
CREATE INDEX IF NOT EXISTS idx_bookings_trip ON bookings(trip_id);
CREATE INDEX IF NOT EXISTS idx_locations_trip ON live_locations(trip_id);
CREATE INDEX IF NOT EXISTS idx_messages_trip ON messages(trip_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_emergency_trip ON emergency_alerts(trip_id);
CREATE INDEX IF NOT EXISTS idx_emergency_status ON emergency_alerts(status);
CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);

-- ========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

-- USERS
CREATE POLICY "Public profiles are viewable by everyone" ON users FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- DRIVERS
CREATE POLICY "Drivers are viewable by everyone" ON drivers FOR SELECT USING (true);
CREATE POLICY "Users can register as driver" ON drivers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Drivers can update own info" ON drivers FOR UPDATE USING (auth.uid() = user_id);

-- TRIPS
CREATE POLICY "Trips are viewable by everyone" ON trips FOR SELECT USING (true);
CREATE POLICY "Drivers can create trips" ON trips FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM drivers WHERE id = driver_id AND user_id = auth.uid()));
CREATE POLICY "Drivers can update own trips" ON trips FOR UPDATE USING (EXISTS (SELECT 1 FROM drivers WHERE id = driver_id AND user_id = auth.uid()));

-- BOOKINGS
CREATE POLICY "Users can view own bookings" ON bookings FOR SELECT USING (passenger_id = auth.uid());
CREATE POLICY "Drivers can view bookings for their trips" ON bookings FOR SELECT USING (EXISTS (SELECT 1 FROM trips JOIN drivers ON trips.driver_id = drivers.id WHERE trips.id = bookings.trip_id AND drivers.user_id = auth.uid()));
CREATE POLICY "Users can create bookings" ON bookings FOR INSERT WITH CHECK (passenger_id = auth.uid());
CREATE POLICY "Users and Drivers can update related bookings" ON bookings FOR UPDATE USING (passenger_id = auth.uid() OR EXISTS (SELECT 1 FROM trips JOIN drivers ON trips.driver_id = drivers.id WHERE trips.id = bookings.trip_id AND drivers.user_id = auth.uid()));

-- PAYMENTS
CREATE POLICY "Users view own payments" ON payments FOR SELECT USING (EXISTS (SELECT 1 FROM bookings WHERE bookings.id = payments.booking_id AND bookings.passenger_id = auth.uid()));
CREATE POLICY "Drivers view requests payments" ON payments FOR SELECT USING (EXISTS (SELECT 1 FROM bookings JOIN trips ON bookings.trip_id = trips.id JOIN drivers ON trips.driver_id = drivers.id WHERE bookings.id = payments.booking_id AND drivers.user_id = auth.uid()));
CREATE POLICY "Enable insert for authenticated users" ON payments FOR INSERT WITH CHECK (true);

-- RATINGS
CREATE POLICY "Ratings are viewable by everyone" ON ratings FOR SELECT USING (true);
CREATE POLICY "Users can insert ratings" ON ratings FOR INSERT WITH CHECK (auth.uid() = from_user_id);

-- LIVE LOCATIONS
CREATE POLICY "Locations viewable by everyone" ON live_locations FOR SELECT USING (true);
CREATE POLICY "Drivers update own location" ON live_locations FOR ALL USING (auth.uid() = (SELECT user_id FROM drivers WHERE id = driver_id));

-- NOTIFICATIONS
CREATE POLICY "Users see own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users insert notifications" ON notifications FOR INSERT WITH CHECK (user_id = auth.uid());

-- MESSAGES
CREATE POLICY "Users can view messages they sent or received" ON messages FOR SELECT USING (sender_id = auth.uid() OR receiver_id = auth.uid());
CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (sender_id = auth.uid());
CREATE POLICY "Users can update their own messages" ON messages FOR UPDATE USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- EMERGENCY ALERTS
CREATE POLICY "Emergency alerts are viewable by everyone" ON emergency_alerts FOR SELECT USING (true);
CREATE POLICY "Users can create emergency alerts" ON emergency_alerts FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own emergency alerts" ON emergency_alerts FOR UPDATE USING (user_id = auth.uid());

-- PAYMENT METHODS
CREATE POLICY "Users can view own payment methods" ON payment_methods FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add payment methods" ON payment_methods FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own payment methods" ON payment_methods FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own payment methods" ON payment_methods FOR DELETE USING (auth.uid() = user_id);

-- PROMO CODES
CREATE POLICY "Active promo codes are viewable by everyone" ON promo_codes FOR SELECT USING (is_active = true AND NOW() BETWEEN valid_from AND valid_until);

-- SAVED SEARCHES
CREATE POLICY "Users can view own saved searches" ON saved_searches FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create saved searches" ON saved_searches FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own saved searches" ON saved_searches FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own saved searches" ON saved_searches FOR DELETE USING (auth.uid() = user_id);

-- ========================================================
-- STORAGE CONFIGURATION
-- ========================================================

-- Create buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('vehicles', 'vehicles', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('licenses', 'licenses', false)
ON CONFLICT (id) DO NOTHING;

-- STORAGE POLICIES

-- Avatars: Public read, owner write
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Vehicles: Public read, owner write
CREATE POLICY "Vehicle images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'vehicles');

CREATE POLICY "Drivers can upload vehicle photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'vehicles' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Licenses: Private (only owner and service role), service role handles admin view
CREATE POLICY "Users can view own licenses" ON storage.objects
  FOR SELECT USING (bucket_id = 'licenses' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own licenses" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'licenses' AND auth.uid()::text = (storage.foldername(name))[1]);
