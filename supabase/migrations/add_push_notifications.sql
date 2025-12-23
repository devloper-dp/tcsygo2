-- Add push_token to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Create a function to be called by the trigger
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER AS $$
DECLARE
  recipient_token TEXT;
  sender_name TEXT;
BEGIN
  -- Get the recipient's push token
  SELECT push_token INTO recipient_token
  FROM users
  WHERE id = NEW.receiver_id;

  -- Get the sender's name
  SELECT full_name INTO sender_name
  FROM users
  WHERE id = NEW.sender_id;

  -- If token exists, invoke the edge function
  IF recipient_token IS NOT NULL THEN
    -- We can't directly invoke Edge Functions from PL/pgSQL in Supabase easily without pg_net
    -- But we can insert into the notifications table, which can be listened to by the client or another worker.
    -- OR we can use pg_net if enabled.
    -- For simplicity and standard Supabase patterns without extensions enabled by default:
    -- We will insert a notification record.
    
    INSERT INTO notifications (user_id, title, message, type, data)
    VALUES (
      NEW.receiver_id, 
      'New Message from ' || sender_name, 
      left(NEW.message, 50) || '...', 
      'message', 
      jsonb_build_object('trip_id', NEW.trip_id, 'sender_id', NEW.sender_id)
    );
    
    -- Note: To actually send the PUSH notification, we rely on the Edge Function 
    -- listening to a webhook OR the client triggering it.
    -- Ideally, a Database Webhook calls the Edge Function.
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new messages
DROP TRIGGER IF EXISTS on_new_message ON messages;
CREATE TRIGGER on_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_message();

-- Ensure storage buckets exist (idempotent)
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('avatars', 'avatars', true),
  ('vehicles', 'vehicles', true),
  ('licenses', 'licenses', false)
ON CONFLICT (id) DO NOTHING;

-- RLS for Storage (if not already present in full_schema.sql, but good to ensure coverage)
-- (Omitted here as they are in full_schema.sql, this file is for NEW changes)
