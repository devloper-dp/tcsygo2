-- FIX ADMIN PERMISSIONS FOR DRIVER APPROVAL

-- 1. Enable RLS on drivers table (good practice, ensures policies apply)
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- 2. Allow Admins to UPDATE any driver (This fixes the "Approve" button issue)
DROP POLICY IF EXISTS "Admins can update drivers" ON public.drivers;
CREATE POLICY "Admins can update drivers" ON public.drivers
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() 
    AND (role = 'admin' OR email LIKE '%@tcsygo.com') -- Fallback for safety if role isn't set yet
  )
);

-- 3. Allow Admins to SELECT any driver (to view the list)
DROP POLICY IF EXISTS "Admins can view all drivers" ON public.drivers;
CREATE POLICY "Admins can view all drivers" ON public.drivers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() 
    AND (role = 'admin' OR email LIKE '%@tcsygo.com')
  )
);

-- 4. Allow Users to View/Update THEIR OWN driver profile
DROP POLICY IF EXISTS "Users can view own driver profile" ON public.drivers;
CREATE POLICY "Users can view own driver profile" ON public.drivers
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own driver profile" ON public.drivers;
CREATE POLICY "Users can update own driver profile" ON public.drivers
FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own driver profile" ON public.drivers;
CREATE POLICY "Users can insert own driver profile" ON public.drivers
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 5. Force Role Update for the current Admin User (Safety Net)
-- Only runs if the user exists
UPDATE public.users 
SET role = 'admin' 
WHERE email = 'Admin@tcsygo.com';

-- 6. Reload Cache
NOTIFY pgrst, 'reload config';
