# Supabase Directory

This directory contains all Supabase-related configuration files for the TCSYGO project.

## 📁 Directory Structure

```
supabase/
├── COMPLETE_SETUP.sql              ⭐ Core database setup (15 tables)
├── RAPIDO_FEATURES_COMPLETE.sql    ⭐ Rapido features setup (14 tables)
├── SEED_DATA.sql                   Sample data for testing
├── SEEDING_GUIDE.md                Guide for seeding data
├── README.md                       This file
└── functions/                      Edge Functions for serverless operations
    ├── create-payment-order/       Razorpay payment integration
    ├── verify-payment/             Payment verification
    ├── send-push-notification/     Push notifications via Expo
    ├── update-live-location/       Real-time location tracking
    └── safety-checkin/             Safety check-ins and emergency alerts
```

## 🚀 Quick Start

### For New Setup

**Use these two files in order**:

1. `COMPLETE_SETUP.sql` - Core database schema (15 tables)
2. `RAPIDO_FEATURES_COMPLETE.sql` - Rapido features (14 tables)

This includes:
- All 15 core table definitions
- All 14 Rapido feature tables
- Complete RLS policies for security
- Storage buckets (profile-photos, vehicles, licenses, documents, receipts, safety-media)
- All triggers and functions
- All indexes for performance

### Steps:
1. Open Supabase Dashboard → SQL Editor
2. Run `COMPLETE_SETUP.sql` first
3. Run `RAPIDO_FEATURES_COMPLETE.sql` second
4. Done! ✅

## 📝 File Descriptions

### ⭐ COMPLETE_SETUP.sql
**Status**: CURRENT - Run this first

The core database setup script. This includes:
- All 15 core database tables (users, drivers, trips, bookings, payments, etc.)
- Complete RLS policies for security
- Storage buckets (profile-photos, vehicles, licenses, documents)
- Core triggers and functions
- Performance indexes

### ⭐ RAPIDO_FEATURES_COMPLETE.sql
**Status**: CURRENT - Run this second

The Rapido features setup script. This includes:
- All 14 Rapido feature tables
- Ride preferences, auto-pay, split fare, safety check-ins
- Driver tips, wallets, saved places, emergency contacts
- Referral program, favorite routes, ride statistics
- Surge pricing system
- Additional storage buckets (receipts, safety-media)
- Feature-specific RLS policies and triggers

### Edge Functions

Located in `functions/` directory. Deploy these after running the SQL setup:

1. **create-payment-order**: Creates Razorpay payment orders
2. **verify-payment**: Verifies payment signatures and updates booking status
3. **send-push-notification**: Sends push notifications via Expo


Deploy with:
```bash
cd supabase/functions
supabase functions deploy create-payment-order
supabase functions deploy verify-payment
supabase functions deploy send-push-notification
supabase functions deploy update-live-location
supabase functions deploy safety-checkin
```

## 🔧 Database Schema Overview

### Core Tables
- **users**: User profiles linked to Supabase Auth
- **drivers**: Driver-specific information and verification
- **trips**: Ride sharing trip listings
- **bookings**: Trip booking records
- **payments**: Payment transactions and payout tracking

### Feature Tables
- **messages**: In-app chat between users
- **notifications**: Push notification records
- **live_locations**: Real-time driver location tracking
- **ratings**: User and driver ratings/reviews
- **emergency_alerts**: SOS emergency alerts

### Supporting Tables
- **saved_searches**: User's saved search preferences
- **payment_methods**: Saved payment methods
- **promo_codes**: Discount and promo codes
- **support_tickets**: Customer support tickets
- **payout_requests**: Driver payout requests

## 🔐 Security Features

All tables have Row Level Security (RLS) enabled with appropriate policies:
- Users can only modify their own data
- Drivers can only manage their own trips
- Passengers can only view their own bookings
- Public data (trips, ratings) is viewable by all
- Private data (payments, messages) is restricted

## 📦 Storage Buckets

Four storage buckets are configured:

1. **profile-photos** (Public)
   - User profile pictures
   - Publicly accessible

2. **vehicles** (Public)
   - Vehicle photos for driver verification
   - Publicly accessible

3. **licenses** (Private)
   - Driver license documents
   - Only accessible by owner

4. **documents** (Private)
   - Other sensitive documents
   - Only accessible by owner

## 🔄 Triggers & Functions

### Auto-sync Functions
- `handle_new_user()`: Syncs auth.users to public.users on signup
- `update_updated_at_column()`: Auto-updates timestamps

### Business Logic
- `update_seats_on_booking()`: Decreases available seats when booking confirmed
- `notify_admin_on_emergency()`: Sends notification to admin on SOS alert

### RPC Functions
- `request_payout(driver_id)`: Driver payout request system

## 📊 Indexes

Performance indexes are created on:
- Trip status and departure time
- Booking passenger and trip references
- Payment status
- Message sender/receiver
- Geospatial indexes for location-based queries

## 🆘 Troubleshooting

### "Permission denied" errors
- Check RLS policies in Supabase Dashboard
- Ensure user is authenticated
- Verify user has correct role

### "Relation does not exist" errors
- Ensure `COMPLETE_SETUP.sql` was run successfully
- Check for SQL errors in the execution log

### Storage upload failures
- Verify buckets are created
- Check storage policies
- Ensure file path follows: `{user_id}/{filename}`

## 📚 Additional Documentation

- Main setup guide: `../SUPABASE_SETUP.md`
- Database design: See table comments in `COMPLETE_SETUP.sql`
- Edge Functions: See individual function directories

## 🔄 Updating the Schema

If you need to make changes to the database:

1. Make changes in `COMPLETE_SETUP.sql`
2. Test in a development Supabase project
3. Create a new migration file in `migrations/` for version control
4. Document changes in this README

## ✅ Verification

After running `COMPLETE_SETUP.sql`, verify:
- [ ] All 15 tables exist in Table Editor
- [ ] All 4 storage buckets exist in Storage
- [ ] RLS is enabled on all tables
- [ ] Storage policies are applied
- [ ] Triggers are created

## 🎯 Next Steps

1. Run `COMPLETE_SETUP.sql` in Supabase SQL Editor
2. Deploy Edge Functions
3. Configure environment variables in your apps
4. Test the application

For detailed instructions, see `../SUPABASE_SETUP.md`
