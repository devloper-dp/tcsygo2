-- Check Trips and their Bookings consistency
SELECT 
  t.id as trip_id,
  t.status as trip_status,
  t.total_seats,
  t.available_seats,
  (
    SELECT COUNT(*) 
    FROM public.bookings b 
    WHERE b.trip_id = t.id AND b.status = 'confirmed'
  ) as actual_confirmed_booking_count,
  (
    SELECT COALESCE(SUM(b.seats_booked), 0) 
    FROM public.bookings b 
    WHERE b.trip_id = t.id AND b.status = 'confirmed'
  ) as actual_seats_occupied
FROM public.trips t
WHERE t.status IN ('upcoming', 'confirmed');
