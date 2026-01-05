-- Function to update available seats on booking
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
    
  -- When a booking is deleted (rare, but good to handle)
  ELSIF (TG_OP = 'DELETE' AND OLD.status = 'confirmed') THEN
    UPDATE public.trips
    SET available_seats = available_seats + OLD.seats_booked
    WHERE id = OLD.trip_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; -- SECURITY DEFINER allows execution with owner privs (bypassing RLS for the update)

-- Trigger for Insert
DROP TRIGGER IF EXISTS on_booking_created ON public.bookings;
CREATE TRIGGER on_booking_created
AFTER INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.update_available_seats();

-- Trigger for Update (Cancellation)
DROP TRIGGER IF EXISTS on_booking_updated ON public.bookings;
CREATE TRIGGER on_booking_updated
AFTER UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.update_available_seats();

-- Trigger for Delete
DROP TRIGGER IF EXISTS on_booking_deleted ON public.bookings;
CREATE TRIGGER on_booking_deleted
AFTER DELETE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.update_available_seats();
