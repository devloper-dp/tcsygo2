-- Fix admin user role in the database
-- This script updates the admin@tcsygo.com user's role from 'passenger' to 'admin'

UPDATE public.users 
SET role = 'admin' 
WHERE email = 'admin@tcsygo.com';

-- Verify the update
SELECT id, email, full_name, role, created_at 
FROM public.users 
WHERE email = 'admin@tcsygo.com';
