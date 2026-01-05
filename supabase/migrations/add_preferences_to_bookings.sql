-- Add preferences column to bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;

-- Comment on column
COMMENT ON COLUMN public.bookings.preferences IS 'Stores passenger preferences for the ride (music, pets, luggage, etc.)';
