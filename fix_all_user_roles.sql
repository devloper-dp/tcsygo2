-- Fix all user roles in the database
-- This script updates all users to have their correct roles based on the seed data

-- Update admin user
UPDATE public.users 
SET role = 'admin' 
WHERE email = 'admin@tcsygo.com';

-- Update all driver users
UPDATE public.users 
SET role = 'driver' 
WHERE email IN (
  'john.driver@tcsygo.com',
  'priya.driver@tcsygo.com',
  'rahul.driver@tcsygo.com',
  'snehal.driver@tcsygo.com',
  'venkat.driver@tcsygo.com'
);

-- Verify the updates
SELECT email, full_name, role 
FROM public.users 
WHERE email LIKE '%@tcsygo.com'
ORDER BY role, email;
