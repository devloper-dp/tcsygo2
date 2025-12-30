# Supabase Complete Setup Guide

## Overview

This guide provides step-by-step instructions to set up your complete Supabase backend for the TCSYGO Rapido-like ride-sharing application.

## Prerequisites

- Supabase account (https://supabase.com)
- Razorpay account for payments (https://razorpay.com)
- Expo account for push notifications (optional, for mobile app)

---

## Step 1: Database Setup

### 1.1 Run Core Database Setup

1. Open your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `COMPLETE_SETUP.sql`
4. Click **Run** to execute

This creates:
- ✅ 15 core tables (users, drivers, trips, bookings, payments, etc.)
- ✅ Row Level Security (RLS) policies
- ✅ Core triggers and functions
- ✅ Performance indexes
- ✅ 4 storage buckets (profile-photos, vehicles, licenses, documents)

### 1.2 Run Rapido Features Setup

1. In the **SQL Editor**, create a new query
2. Copy and paste the contents of `RAPIDO_FEATURES_COMPLETE.sql`
3. Click **Run** to execute

This creates:
- ✅ 14 Rapido feature tables:
  - ride_preferences
  - auto_pay_settings
  - split_fare_requests
  - safety_checkins
  - driver_tips
  - wallets
  - wallet_transactions
  - saved_places
  - emergency_contacts
  - referral_codes
  - referral_uses
  - favorite_routes
  - ride_statistics
  - trip_surge_pricing
- ✅ 2 additional storage buckets (receipts, safety-media)
- ✅ RLS policies for all tables
- ✅ Triggers for auto-updates
- ✅ RPC functions for wallet and promo codes

### 1.3 Run Ride Sharing Invites Setup

1. In the **SQL Editor**, create a new query
2. Copy and paste the contents of `RIDE_SHARING_INVITES.sql`
3. Click **Run** to execute

This creates:
- ✅ ride_sharing_invites table
- ✅ RLS policies for invites

---

## Step 2: Storage Buckets Configuration

Verify all 6 storage buckets are created:

### Public Buckets
1. **profile-photos** - User profile pictures
2. **vehicles** - Vehicle photos for verification

### Private Buckets
3. **licenses** - Driver license documents
4. **documents** - Other sensitive documents
5. **receipts** - Payment receipts
6. **safety-media** - Safety-related media (SOS photos/videos)

### Verify Buckets

1. Navigate to **Storage** in Supabase Dashboard
2. Confirm all 6 buckets exist
3. Check that RLS policies are applied

---

## Step 3: Edge Functions Deployment

### 3.1 Install Supabase CLI

```bash
npm install -g supabase
```

### 3.2 Login to Supabase

```bash
supabase login
```

### 3.3 Link Your Project

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### 3.4 Set Environment Variables

Create a `.env` file in the `supabase/functions` directory:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

### 3.5 Deploy Edge Functions

Deploy all 5 Edge Functions:

```bash
cd supabase/functions

# Deploy payment order creation
supabase functions deploy create-payment-order --no-verify-jwt

# Deploy payment verification
supabase functions deploy verify-payment --no-verify-jwt

# Deploy push notifications
supabase functions deploy send-push-notification --no-verify-jwt

# Deploy live location updates
supabase functions deploy update-live-location --no-verify-jwt

# Deploy safety check-ins
supabase functions deploy safety-checkin --no-verify-jwt
```

### 3.6 Set Function Secrets

Set environment variables for each function:

```bash
supabase secrets set RAZORPAY_KEY_ID=your_key_id
supabase secrets set RAZORPAY_KEY_SECRET=your_key_secret
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

---

## Step 4: Verify Setup

### 4.1 Check Tables

1. Navigate to **Table Editor**
2. Verify all 30 tables exist:
   - Core tables (15)
   - Rapido feature tables (14)
   - Ride sharing invites (1)

### 4.2 Check RLS Policies

1. For each table, click on the table name
2. Navigate to **Policies** tab
3. Verify RLS is enabled and policies exist

### 4.3 Check Storage

1. Navigate to **Storage**
2. Verify all 6 buckets exist
3. Test upload to each bucket

### 4.4 Check Edge Functions

1. Navigate to **Edge Functions**
2. Verify all 5 functions are deployed
3. Check function logs for any errors

---

## Step 5: Seed Data (Optional)

To populate your database with test data:

1. Open **SQL Editor**
2. Copy and paste contents of `SEED_DATA.sql`
3. Click **Run**

This creates:
- Sample users (passengers and drivers)
- Sample trips
- Sample bookings
- Sample payments

---

## Step 6: Configure Client Application

Update your client `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

---

## Database Schema Summary

### Core Tables (15)
1. users - User profiles
2. drivers - Driver information
3. trips - Ride listings
4. bookings - Trip bookings
5. payments - Payment transactions
6. ratings - User/driver ratings
7. live_locations - Real-time GPS tracking
8. notifications - Push notifications
9. messages - In-app chat
10. emergency_alerts - SOS alerts
11. saved_searches - Saved search preferences
12. payment_methods - Saved payment methods
13. promo_codes - Discount codes
14. support_tickets - Customer support
15. payout_requests - Driver payouts

### Rapido Feature Tables (14)
16. ride_preferences - User ride preferences
17. auto_pay_settings - Auto-payment configuration
18. split_fare_requests - Fare splitting
19. safety_checkins - Periodic safety checks
20. driver_tips - Driver tipping
21. wallets - User wallet balances
22. wallet_transactions - Wallet transaction history
23. saved_places - Home, work, favorites
24. emergency_contacts - Emergency contact list
25. referral_codes - Referral program codes
26. referral_uses - Referral usage tracking
27. favorite_routes - Frequently used routes
28. ride_statistics - User ride statistics
29. trip_surge_pricing - Surge pricing data
30. ride_sharing_invites - Ride sharing invitations

---

## Edge Functions Summary

### 1. create-payment-order
**Purpose**: Create Razorpay payment orders
**Endpoint**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/create-payment-order`
**Input**:
```json
{
  "bookingId": "uuid",
  "amount": 500,
  "promoCodeId": "uuid" // optional
}
```

### 2. verify-payment
**Purpose**: Verify Razorpay payment signatures
**Endpoint**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/verify-payment`
**Input**:
```json
{
  "razorpayOrderId": "order_xxx",
  "razorpayPaymentId": "pay_xxx",
  "razorpaySignature": "signature_xxx",
  "bookingId": "uuid"
}
```

### 3. send-push-notification
**Purpose**: Send push notifications via Expo
**Endpoint**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-push-notification`
**Input**:
```json
{
  "userId": "uuid",
  "title": "Driver Arrived",
  "message": "Your driver has arrived",
  "data": {},
  "pushTokens": ["ExponentPushToken[xxx]"]
}
```

### 4. update-live-location
**Purpose**: Update driver's live location
**Endpoint**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/update-live-location`
**Input**:
```json
{
  "tripId": "uuid",
  "lat": 22.7196,
  "lng": 75.8577,
  "heading": 45,
  "speed": 40
}
```

### 5. safety-checkin
**Purpose**: Handle safety check-ins during rides
**Endpoint**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/safety-checkin`
**Input**:
```json
{
  "tripId": "uuid",
  "status": "safe",
  "lat": 22.7196,
  "lng": 75.8577,
  "notes": "All good"
}
```

---

## Storage Buckets Summary

### Public Buckets
- **profile-photos**: User profile pictures (publicly accessible)
- **vehicles**: Vehicle photos for driver verification (publicly accessible)

### Private Buckets
- **licenses**: Driver license documents (owner-only access)
- **documents**: Other sensitive documents (owner-only access)
- **receipts**: Payment receipts (owner-only access)
- **safety-media**: Safety-related media (owner-only access)

---

## Troubleshooting

### "Permission denied" errors
- Check RLS policies in Supabase Dashboard
- Ensure user is authenticated
- Verify user has correct role

### "Relation does not exist" errors
- Ensure all SQL scripts ran successfully
- Check for SQL errors in execution log
- Verify table names are correct

### Edge Function deployment fails
- Check Supabase CLI is installed and updated
- Verify you're logged in: `supabase login`
- Ensure project is linked: `supabase link`

### Storage upload failures
- Verify buckets are created
- Check storage policies
- Ensure file path follows: `{user_id}/{filename}`

---

## Next Steps

1. ✅ Database setup complete
2. ✅ Edge Functions deployed
3. ✅ Storage buckets configured
4. 🔄 Configure client application
5. 🔄 Test all features
6. 🔄 Deploy to production

---

## Support

For issues or questions:
- Check Supabase documentation: https://supabase.com/docs
- Review Edge Function logs in Supabase Dashboard
- Check database logs for errors

---

## Maintenance

### Regular Tasks
- Monitor Edge Function logs
- Check database performance
- Review storage usage
- Update RLS policies as needed
- Backup database regularly

### Scaling Considerations
- Add database indexes for frequently queried columns
- Optimize Edge Functions for performance
- Monitor storage bucket sizes
- Consider database replication for high availability
