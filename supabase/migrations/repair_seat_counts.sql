-- 1. Force Sync: Recalculate available_seats for all upcoming trips
UPDATE public.trips t
SET available_seats = t.total_seats - (
  SELECT COALESCE(SUM(b.seats_booked), 0)
  FROM public.bookings b
  WHERE b.trip_id = t.id
  AND b.status = 'confirmed' -- Only counting confirmed for now to match trigger logic
)
WHERE t.status IN ('upcoming', 'confirmed');

-- 2. Ensure Schema: Drop existing triggers to be safe
DROP TRIGGER IF EXISTS on_booking_created ON public.bookings;
DROP TRIGGER IF EXISTS on_booking_updated ON public.bookings;
DROP TRIGGER IF EXISTS on_booking_deleted ON public.bookings;
DROP FUNCTION IF EXISTS public.update_available_seats();

-- 3. Re-Create Function
CREATE OR REPLACE FUNCTION public.update_available_seats()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new booking is confirmed
  IF (TG_OP = 'INSERT' AND NEW.status = 'confirmed') THEN
    UPDATE public.trips
    SET available_seats = available_seats - NEW.seats_booked
    WHERE id = NEW.trip_id;
  
  -- When a booking is cancelled
  ELSIF (TG_OP = 'UPDATE' AND OLD.status = 'confirmed' AND NEW.status = 'cancelled') THEN
    UPDATE public.trips
    SET available_seats = available_seats + OLD.seats_booked
    WHERE id = NEW.trip_id;
    
  -- When a booking is deleted
  ELSIF (TG_OP = 'DELETE' AND OLD.status = 'confirmed') THEN
    UPDATE public.trips
    SET available_seats = available_seats + OLD.seats_booked
    WHERE id = OLD.trip_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Re-Create Triggers
CREATE TRIGGER on_booking_created
AFTER INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.update_available_seats();

CREATE TRIGGER on_booking_updated
AFTER UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.update_available_seats();

CREATE TRIGGER on_booking_deleted
AFTER DELETE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.update_available_seats();
