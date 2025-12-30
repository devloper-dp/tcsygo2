-- Migration to add scheduled_time column to ride_requests table
ALTER TABLE IF EXISTS public.ride_requests 
ADD COLUMN IF NOT EXISTS scheduled_time TIMESTAMPTZ;

-- Add index for efficient querying of scheduled rides
CREATE INDEX IF NOT EXISTS idx_ride_requests_scheduled_time ON public.ride_requests(scheduled_time) WHERE scheduled_time IS NOT NULL;

-- Update status check to include possible states for scheduled rides
-- Current check: CHECK (status IN ('pending', 'searching', 'matched', 'accepted', 'rejected', 'cancelled', 'expired', 'completed', 'timeout'))
-- No changes needed to the check as those statuses apply to scheduled rides as well.
-- However, we might want to ensure scheduled_time is in the future for new requests.
ALTER TABLE public.ride_requests
ADD CONSTRAINT check_scheduled_time_future 
CHECK (scheduled_time IS NULL OR scheduled_time > created_at);
