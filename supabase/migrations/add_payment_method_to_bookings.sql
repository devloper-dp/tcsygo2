-- Add payment_method column to bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';

-- Comment on column
COMMENT ON COLUMN public.bookings.payment_method IS 'Payment method used for the booking (cash, wallet, upi, etc.)';
