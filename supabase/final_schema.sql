-- 1. ENABLE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. CREATE TABLES

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  bio TEXT,
  profile_photo TEXT,
  role TEXT CHECK (role IN ('passenger', 'driver', 'admin', 'both')) DEFAULT 'passenger',
  verification_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drivers Table
CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  license_number TEXT,
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_year TEXT,
  vehicle_color TEXT,
  vehicle_plate TEXT,
  is_available BOOLEAN DEFAULT false,
  rating NUMERIC DEFAULT 5.0,
  total_trips INTEGER DEFAULT 0,
  verification_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trips Table
CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
  pickup_location TEXT NOT NULL,
  pickup_lat NUMERIC,
  pickup_lng NUMERIC,
  drop_location TEXT NOT NULL,
  drop_lat NUMERIC,
  drop_lng NUMERIC,
  departure_time TIMESTAMPTZ NOT NULL,
  distance NUMERIC,
  duration NUMERIC,
  price_per_seat NUMERIC NOT NULL,
  total_seats INTEGER NOT NULL,
  available_seats INTEGER NOT NULL,
  status TEXT DEFAULT 'upcoming', -- upcoming, ongoing, completed, cancelled
  route JSONB, -- Store full route geometry
  preferences JSONB DEFAULT '{"smoking": false, "pets": false, "music": true}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  passenger_id UUID REFERENCES users(id) ON DELETE CASCADE,
  seats_booked INTEGER DEFAULT 1,
  total_amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, confirmed, cancelled, completed
  booking_code TEXT, -- specific verification code for ride start
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id),
  amount NUMERIC NOT NULL,
  platform_fee NUMERIC,
  driver_earnings NUMERIC,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  status TEXT DEFAULT 'pending', 
  payment_method TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages Table (Chat)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  receiver_id UUID REFERENCES users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS live_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
  lat NUMERIC NOT NULL,
  lng NUMERIC NOT NULL,
  heading NUMERIC,
  speed NUMERIC,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Or 'admin' string if system notif? Better to have a dedicated admin user or handle 'admin' specially. For now assume user_id is UUID. We will use a constraint or trigger to handle admin alerts differently or assign them to a specific admin UUID.
  -- To support 'admin' as a generic receiver, we might need a nullable user_id or a separate field.
  -- For this schema, let's keep user_id NOT NULL and assume there is an Admin User.
  -- IF we really want 'admin' string, we need to change user_id type to TEXT.
  -- Let's stick to UUID and assume we look up admin ID.
  -- UPDATE: The existing code uses 'admin' string. Let's change user_id to TEXT to support both UUIDs and 'admin' literal.
  recipient_id TEXT, -- To support both UUIDs and 'admin' literal
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT, -- booking, system, payment, emergency
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SOS/Emergency Alerts Table
CREATE TABLE IF NOT EXISTS emergency_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  lat NUMERIC,
  lng NUMERIC,
  status TEXT DEFAULT 'active', -- active, resolved
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Promo Codes Table
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  discount NUMERIC NOT NULL,
  type TEXT NOT NULL, -- percentage, fixed
  description TEXT,
  min_amount NUMERIC DEFAULT 0,
  max_discount NUMERIC,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ratings Table
CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID REFERENCES trips(id),
  from_user_id UUID REFERENCES users(id),
  to_user_id UUID REFERENCES users(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- 3. ENABLE ROW LEVEL SECURITY

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;


-- 3. ENHANCED RLS POLICIES

-- USERS
CREATE POLICY "Public profiles are viewable by everyone" ON users FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can delete own profile" ON users FOR DELETE USING (auth.uid() = id);
CREATE POLICY "Admins can view all users" ON users FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update any user" ON users FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- DRIVERS
CREATE POLICY "Drivers are viewable by everyone" ON drivers FOR SELECT USING (true);
CREATE POLICY "Users can register as driver" ON drivers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Drivers can update own info" ON drivers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Drivers can delete own profile" ON drivers FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all drivers" ON drivers FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update any driver" ON drivers FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- TRIPS
CREATE POLICY "Trips are viewable by everyone" ON trips FOR SELECT USING (true);
CREATE POLICY "Drivers can create trips" ON trips FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM drivers WHERE id = driver_id AND user_id = auth.uid())
);
CREATE POLICY "Drivers can update own trips" ON trips FOR UPDATE USING (
    EXISTS (SELECT 1 FROM drivers WHERE id = driver_id AND user_id = auth.uid())
);
CREATE POLICY "Drivers can delete own trips" ON trips FOR DELETE USING (
    EXISTS (SELECT 1 FROM drivers WHERE id = driver_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can manage all trips" ON trips FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- BOOKINGS
CREATE POLICY "Users can view own bookings" ON bookings FOR SELECT USING (passenger_id = auth.uid());
CREATE POLICY "Drivers can view bookings for their trips" ON bookings FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM trips 
        JOIN drivers ON trips.driver_id = drivers.id
        WHERE trips.id = bookings.trip_id AND drivers.user_id = auth.uid()
    )
);
CREATE POLICY "Users can create bookings" ON bookings FOR INSERT WITH CHECK (passenger_id = auth.uid());
CREATE POLICY "Users and Drivers can update related bookings" ON bookings FOR UPDATE USING (
    passenger_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM trips 
        JOIN drivers ON trips.driver_id = drivers.id
        WHERE trips.id = bookings.trip_id AND drivers.user_id = auth.uid()
    )
);
CREATE POLICY "Users can cancel own bookings" ON bookings FOR DELETE USING (
  passenger_id = auth.uid() AND status = 'pending'
);
CREATE POLICY "Drivers can reject bookings" ON bookings FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM trips 
    JOIN drivers ON trips.driver_id = drivers.id
    WHERE trips.id = bookings.trip_id AND drivers.user_id = auth.uid()
  ) AND status = 'pending'
);
CREATE POLICY "Admins can manage all bookings" ON bookings FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- MESSAGES
CREATE POLICY "Users and Drivers can view their messages" ON messages FOR SELECT USING (
    sender_id = auth.uid() OR receiver_id = auth.uid()
);
CREATE POLICY "Users and Drivers can send messages" ON messages FOR INSERT WITH CHECK (
    sender_id = auth.uid()
);
CREATE POLICY "Users can delete own sent messages" ON messages FOR DELETE USING (
  sender_id = auth.uid()
);
CREATE POLICY "Admins can view all messages" ON messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- PAYMENTS
CREATE POLICY "Users view own payments" ON payments FOR SELECT USING (
    EXISTS (SELECT 1 FROM bookings WHERE bookings.id = payments.booking_id AND bookings.passenger_id = auth.uid())
);
CREATE POLICY "Drivers view payments for their trips" ON payments FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM bookings
        JOIN trips ON bookings.trip_id = trips.id
        JOIN drivers ON trips.driver_id = drivers.id
        WHERE bookings.id = payments.booking_id AND drivers.user_id = auth.uid()
    )
);
CREATE POLICY "Enable insert for authenticated users" ON payments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage all payments" ON payments FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- LIVE LOCATIONS
CREATE POLICY "Locations viewable by everyone" ON live_locations FOR SELECT USING (true);
CREATE POLICY "Drivers update own location" ON live_locations FOR ALL USING (
   EXISTS (SELECT 1 FROM drivers WHERE id = driver_id AND user_id = auth.uid())
);

-- NOTIFICATIONS
CREATE POLICY "Users see own notifications" ON notifications FOR SELECT USING (
    recipient_id = auth.uid()::text 
);
CREATE POLICY "Admins see admin notifications" ON notifications FOR SELECT USING (
    recipient_id = 'admin' AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Service role can create notifications" ON notifications FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- EMERGENCY ALERTS
CREATE POLICY "Emergency alerts public" ON emergency_alerts FOR SELECT USING (true);
CREATE POLICY "Users can create emergency alerts" ON emergency_alerts FOR INSERT WITH CHECK (
   user_id = auth.uid()
);
CREATE POLICY "Admins can update emergency alerts" ON emergency_alerts FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- RATINGS
CREATE POLICY "Ratings viewable by everyone" ON ratings FOR SELECT USING (true);
CREATE POLICY "Users can insert ratings" ON ratings FOR INSERT WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY "Users can update own ratings" ON ratings FOR UPDATE USING (auth.uid() = from_user_id);
CREATE POLICY "Admins can manage all ratings" ON ratings FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- PROMO CODES
CREATE POLICY "Promo codes are viewable by everyone" ON promo_codes FOR SELECT USING (true);
CREATE POLICY "Admins can manage promo codes" ON promo_codes FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);


-- 5. FUNCTIONS & TRIGGERS

-- Trigger to notify Admin on Emergency Alert
CREATE OR REPLACE FUNCTION notify_admin_on_emergency()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (recipient_id, title, message, type, data)
  VALUES (
    'admin', -- Static 'admin' Recipient ID. The Admin Dashboard must query where recipient_id = 'admin'
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
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_emergency_create
  AFTER INSERT ON emergency_alerts
  FOR EACH ROW EXECUTE FUNCTION notify_admin_on_emergency();


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

CREATE TRIGGER on_booking_confirm
  AFTER UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_seats_on_booking();

