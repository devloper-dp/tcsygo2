-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE sos_alerts ENABLE ROW LEVEL SECURITY;

-- USERS
-- Everyone can read users (needed for profiles in trips, reviews etc)
CREATE POLICY "Public profiles are viewable by everyone" ON users
  FOR SELECT USING (true);

-- Users can insert their own profile (Supabase auth triggers usually handle this, but for loose coupling)
CREATE POLICY "Users can insert their own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can update own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- DRIVERS
-- Public read
CREATE POLICY "Drivers are viewable by everyone" ON drivers
  FOR SELECT USING (true);

-- Users can register as driver
CREATE POLICY "Users can register as driver" ON drivers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Drivers can update own info
CREATE POLICY "Drivers can update own info" ON drivers
  FOR UPDATE USING (auth.uid() = user_id);

-- TRIPS
-- Public read
CREATE POLICY "Trips are viewable by everyone" ON trips
  FOR SELECT USING (true);

-- Drivers can create trips
CREATE POLICY "Drivers can create trips" ON trips
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM drivers 
      WHERE id = driver_id AND user_id = auth.uid()
    )
  );

-- Drivers can update their own trips
CREATE POLICY "Drivers can update own trips" ON trips
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM drivers 
      WHERE id = driver_id AND user_id = auth.uid()
    )
  );

-- BOOKINGS
-- Users can see their own bookings
CREATE POLICY "Users can view own bookings" ON bookings
  FOR SELECT USING (passenger_id = auth.uid());

-- Drivers can see bookings for their trips
CREATE POLICY "Drivers can view bookings for their trips" ON bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trips 
      JOIN drivers ON trips.driver_id = drivers.id
      WHERE trips.id = bookings.trip_id AND drivers.user_id = auth.uid()
    )
  );

-- Users can create bookings
CREATE POLICY "Users can create bookings" ON bookings
  FOR INSERT WITH CHECK (passenger_id = auth.uid());

-- Users/Drivers can update bookings (e.g. status changes, cancellations)
CREATE POLICY "Users and Drivers can update related bookings" ON bookings
  FOR UPDATE USING (
    passenger_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM trips 
      JOIN drivers ON trips.driver_id = drivers.id
      WHERE trips.id = bookings.trip_id AND drivers.user_id = auth.uid()
    )
  );

-- PAYMENTS
-- Users see their payments
CREATE POLICY "Users view own payments" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = payments.booking_id AND bookings.passenger_id = auth.uid()
    )
  );

-- Drivers see payments for their trips
CREATE POLICY "Drivers view requests payments" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings
      JOIN trips ON bookings.trip_id = trips.id
      JOIN drivers ON trips.driver_id = drivers.id
      WHERE bookings.id = payments.booking_id AND drivers.user_id = auth.uid()
    )
  );

-- Payments created by Edge Functions or temporary client-side dev mode (should restrict to service role in prod)
CREATE POLICY "Enable insert for authenticated users for now" ON payments
  FOR INSERT WITH CHECK (true); -- In prod, better restrict or rely on function service role

-- RATINGS
-- Public read
CREATE POLICY "Ratings are viewable by everyone" ON ratings
  FOR SELECT USING (true);

-- Authenticated users can rate
CREATE POLICY "Users can insert ratings" ON ratings
  FOR INSERT WITH CHECK (auth.uid() = from_user_id);

-- LIVE LOCATIONS
-- Public read (for tracking)
CREATE POLICY "Locations viewable by everyone" ON live_locations
  FOR SELECT USING (true);

-- Drivers update their location
CREATE POLICY "Drivers update own location" ON live_locations
  FOR ALL USING (auth.uid() = driver_id);

-- NOTIFICATIONS
-- Users see own notifications
CREATE POLICY "Users see own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

-- System or triggers insert notifications, but for now allow insert? 
-- Let's restrict to service role mostly, but if we have client-side logic triggering it:
CREATE POLICY "Users see/update own notifications" ON notifications
  FOR ALL USING (user_id = auth.uid());

-- SOS ALERTS
-- Public read (safety team, dashboard)
CREATE POLICY "SOS Alerts viewable" ON sos_alerts
  FOR SELECT USING (true);

-- Any user can trigger
CREATE POLICY "Users can trigger SOS" ON sos_alerts
  FOR INSERT WITH CHECK (reporter_id = auth.uid());
