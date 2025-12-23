-- RLS Policies for Messages Table
-- This ensures users can only see and send messages they are part of

-- Enable RLS on messages table
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages they sent or received
CREATE POLICY "Users can view messages they sent or received" ON messages
  FOR SELECT USING (
    sender_id = auth.uid() OR receiver_id = auth.uid()
  );

-- Users can send messages (insert)
CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
  );

-- Users can update their own messages (for read status, etc.)
CREATE POLICY "Users can update their own messages" ON messages
  FOR UPDATE USING (
    sender_id = auth.uid() OR receiver_id = auth.uid()
  );

-- RLS Policies for Emergency Alerts Table
-- Already covered in supabase_policies.sql but ensuring it's complete

-- Enable RLS on emergency_alerts table (if not already enabled)
ALTER TABLE emergency_alerts ENABLE ROW LEVEL SECURITY;

-- Everyone can view emergency alerts (for safety team monitoring)
CREATE POLICY "Emergency alerts are viewable by everyone" ON emergency_alerts
  FOR SELECT USING (true);

-- Users can create emergency alerts
CREATE POLICY "Users can create emergency alerts" ON emergency_alerts
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );

-- Only admins or the user who created it can update
CREATE POLICY "Users can update own emergency alerts" ON emergency_alerts
  FOR UPDATE USING (
    user_id = auth.uid()
  );

-- ============================================
-- PAYMENT_METHODS TABLE POLICIES
-- ============================================

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Users can only view their own payment methods
CREATE POLICY "Users can view own payment methods" ON payment_methods
  FOR SELECT USING (auth.uid() = user_id);

-- Users can add their own payment methods
CREATE POLICY "Users can add payment methods" ON payment_methods
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own payment methods
CREATE POLICY "Users can update own payment methods" ON payment_methods
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own payment methods
CREATE POLICY "Users can delete own payment methods" ON payment_methods
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- PROMO_CODES TABLE POLICIES
-- ============================================

ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

-- Everyone can view active promo codes
CREATE POLICY "Active promo codes are viewable by everyone" ON promo_codes
  FOR SELECT USING (is_active = true AND NOW() BETWEEN valid_from AND valid_until);

-- Only service role can manage promo codes (handled via admin functions)
-- No insert/update/delete policies for regular users

-- ============================================
-- SAVED_SEARCHES TABLE POLICIES
-- ============================================

ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

-- Users can view their own saved searches
CREATE POLICY "Users can view own saved searches" ON saved_searches
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create saved searches
CREATE POLICY "Users can create saved searches" ON saved_searches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own saved searches
CREATE POLICY "Users can update own saved searches" ON saved_searches
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own saved searches
CREATE POLICY "Users can delete own saved searches" ON saved_searches
  FOR DELETE USING (auth.uid() = user_id);
