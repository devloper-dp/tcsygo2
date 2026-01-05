-- Fix bookings status check constraint to include all used statuses
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check 
CHECK (status IN (
  'pending', 
  'confirmed', 
  'payment_pending', 
  'rejected', 
  'cancelled', 
  'picked_up', 
  'completed', 
  'matched', 
  'ongoing', 
  'paid', 
  'upcoming'
));
