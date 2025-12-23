# Database Setup Guide for TCSYGO

## Overview

This guide will help you set up all required database tables and security policies in Supabase for the TCSYGO carpooling platform.

## Step 1: Run Consolidated Database Schema

Execute the SQL commands from the consolidated migration file to create all tables, RLS policies, and triggers:

**File:** `supabase/migrations/20241222_complete_schema.sql`

**This creates:**
- All core tables (users, drivers, trips, bookings, payments, ratings, live_locations, notifications)
- All feature tables (messages, sos_alerts, saved_searches, payment_methods, promo_codes)
- All RLS policies for security
- Business logic triggers (seat updates, notification triggers)
- Storage bucket configurations (avatars, vehicles, licenses)

## Step 2: Verify Setup

Run this query to verify all tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'users', 'drivers', 'trips', 'bookings', 'payments', 
    'ratings', 'live_locations', 'notifications', 
    'messages', 'sos_alerts', 'saved_searches', 
    'payment_methods', 'promo_codes'
)
ORDER BY table_name;
```

Expected result: 13 tables

## Step 4: Verify Setup

Run this query to verify all tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'users', 'drivers', 'trips', 'bookings', 'payments', 
    'ratings', 'live_locations', 'notifications', 
    'messages', 'emergency_alerts', 'saved_searches', 
    'payment_methods', 'promo_codes'
)
ORDER BY table_name;
```

Expected result: 13 tables

## Step 5: Verify RLS Policies

Run this query to check RLS policies:

```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

You should see policies for all tables.

## Quick Setup Script

For convenience, here's a combined script that runs everything:

```sql
-- This combines all three SQL files in the correct order
-- Copy and paste this entire block into Supabase SQL Editor

-- [Paste contents of README.md database schema here]
-- [Paste contents of supabase/migrations/add_new_features.sql here]
-- [Paste contents of supabase_policies.sql here]
-- [Paste contents of supabase/migrations/add_rls_policies.sql here]
```

## Troubleshooting

### Table Already Exists Error

If you see "relation already exists" errors:
- This is normal if tables were created previously
- The `IF NOT EXISTS` clause will skip creation
- Continue with the next steps

### Permission Errors

If you see permission errors:
- Ensure you're using the Supabase SQL Editor (not a client)
- The SQL Editor runs with admin privileges
- Check that you're logged in to the correct project

### RLS Policy Conflicts

If you see "policy already exists" errors:
- Drop the existing policy first:
  ```sql
  DROP POLICY IF EXISTS "policy_name" ON table_name;
  ```
- Then re-run the CREATE POLICY statement

## Testing Database Setup

After setup, test with these queries:

```sql
-- Test messages table
SELECT * FROM messages LIMIT 1;

-- Test sos_alerts table
SELECT * FROM sos_alerts LIMIT 1;

-- Test RLS on messages (should return empty if not authenticated)
SELECT * FROM messages;
```

## Next Steps

After database setup is complete:
1. ✅ Test mobile chat functionality
2. ✅ Test emergency SOS button
3. ✅ Verify real-time location tracking
4. ✅ Test payment flow
5. ✅ Test all user roles (passenger, driver, admin)

---

**Need Help?**

If you encounter any issues:
1. Check Supabase logs in Dashboard → Logs
2. Verify environment variables in `.env` files
3. Ensure Supabase project is active and not paused
