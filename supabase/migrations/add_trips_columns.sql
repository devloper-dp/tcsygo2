-- ============================================
-- Add Missing Columns to Trips Table
-- Description: Add columns required for trip search functionality
-- ============================================

-- Add missing columns to trips table
ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS pickup_location TEXT,
ADD COLUMN IF NOT EXISTS pickup_lat DECIMAL(10,7),
ADD COLUMN IF NOT EXISTS pickup_lng DECIMAL(10,7),
ADD COLUMN IF NOT EXISTS drop_location TEXT,
ADD COLUMN IF NOT EXISTS drop_lat DECIMAL(10,7),
ADD COLUMN IF NOT EXISTS drop_lng DECIMAL(10,7),
ADD COLUMN IF NOT EXISTS departure_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS distance TEXT,
ADD COLUMN IF NOT EXISTS duration INTEGER,
ADD COLUMN IF NOT EXISTS price_per_seat DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS total_seats INTEGER DEFAULT 4,
ADD COLUMN IF NOT EXISTS route JSONB,
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS base_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS surge_multiplier DECIMAL(3,2) DEFAULT 1.00;

-- Update the status check constraint to include 'upcoming'
ALTER TABLE public.trips DROP CONSTRAINT IF EXISTS trips_status_check;
ALTER TABLE public.trips ADD CONSTRAINT trips_status_check 
CHECK (status IN ('upcoming', 'started', 'completed', 'cancelled'));

-- Create index on departure_time for faster queries
CREATE INDEX IF NOT EXISTS idx_trips_departure_time ON public.trips(departure_time);
CREATE INDEX IF NOT EXISTS idx_trips_status ON public.trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_available_seats ON public.trips(available_seats);

-- Add RLS policies for trips table
DROP POLICY IF EXISTS "Public view upcoming trips" ON public.trips;
CREATE POLICY "Public view upcoming trips" ON public.trips 
FOR SELECT 
USING (status = 'upcoming' OR status = 'started');

DROP POLICY IF EXISTS "Drivers manage own trips" ON public.trips;
CREATE POLICY "Drivers manage own trips" ON public.trips 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.drivers 
    WHERE id = driver_id AND user_id = auth.uid()
  )
);

-- ============================================
-- COMPLETION
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'Trips table columns added successfully. The trips table now supports search functionality.';
END $$;
