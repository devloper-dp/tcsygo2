-- Broaden RLS policies to allow PUBLIC read access for search functionality
-- This ensures that even unauthenticated users (or basic authenticated ones without specific roles) can search for trips

-- 1. Users Table: Allow PUBLIC to select (view profiles)
DROP POLICY IF EXISTS "Authenticated users view all profiles" ON public.users;
DROP POLICY IF EXISTS "Public view profiles" ON public.users;

CREATE POLICY "Public view profiles" ON public.users 
FOR SELECT 
USING (true); -- Applies to ALL roles including anon

-- 2. Drivers Table: Ensure PUBLIC can view drivers
DROP POLICY IF EXISTS "Public drivers view" ON public.drivers;
CREATE POLICY "Public drivers view" ON public.drivers 
FOR SELECT 
USING (true);

-- 3. Trips Table: Ensure PUBLIC can view upcoming trips
DROP POLICY IF EXISTS "Public view upcoming trips" ON public.trips;
CREATE POLICY "Public view upcoming trips" ON public.trips 
FOR SELECT 
USING (status = 'upcoming' OR status = 'started');
