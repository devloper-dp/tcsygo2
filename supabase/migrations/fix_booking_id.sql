-- Make booking_id nullable in trips table as new trips (created by drivers) don't have bookings yet
ALTER TABLE public.trips ALTER COLUMN booking_id DROP NOT NULL;

-- Ensure route column is JSONB (it should be, but just in case)
-- ALTER TABLE public.trips ALTER COLUMN route TYPE JSONB USING route::jsonb;
