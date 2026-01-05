-- Allow authenticated users to view all user profiles (needed for search results where we show driver details)
DROP POLICY IF EXISTS "Users view own profile" ON public.users;

-- Re-create the policy to allow all authenticated users to view profiles
-- We use "USING (true)" for SELECT to allow viewing any user row
CREATE POLICY "Authenticated users view all profiles" ON public.users 
FOR SELECT 
TO authenticated 
USING (true);

-- Ensure update is still restricted to own profile
DROP POLICY IF EXISTS "Users update own profile" ON public.users;
CREATE POLICY "Users update own profile" ON public.users 
FOR UPDATE 
USING (auth.uid() = id);
