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

CREATE INDEX idx_messages_trip ON messages(trip_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_id);

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

CREATE INDEX idx_emergency_trip ON emergency_alerts(trip_id);
CREATE INDEX idx_emergency_status ON emergency_alerts(status);

-- Add payout_status to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payout_status TEXT DEFAULT 'pending';

-- Add cancellation fields to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;

-- Add cancellation fields to trips
ALTER TABLE trips ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;

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

CREATE INDEX idx_saved_searches_user ON saved_searches(user_id);

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

CREATE INDEX idx_payment_methods_user ON payment_methods(user_id);

-- Add promo_codes table
CREATE TABLE IF NOT EXISTS promo_codes (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL, -- 'percentage' or 'fixed'
  discount_value DECIMAL(10,2) NOT NULL,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  valid_from TIMESTAMP NOT NULL,
  valid_until TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_promo_codes_code ON promo_codes(code);

-- Add promo_code_id to payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS promo_code_id VARCHAR REFERENCES promo_codes(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;
