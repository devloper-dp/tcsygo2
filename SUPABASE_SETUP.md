# Supabase Setup Guide for TCSYGO

This guide will help you set up the backend infrastructure for TCSYGO using Supabase.

## 1. Prerequisites

- A [Supabase](https://supabase.com) account.
- [Supabase CLI](https://supabase.com/docs/guides/cli) installed (`npm i -g supabase`).
- [Deno](https://deno.land/) installed (for local Edge Function testing, optional if deploying directly).
- A [Razorpay](https://razorpay.com) account (for payments).
- An [Expo](https://expo.dev) account (for push notifications).

## 2. Project Setup

1.  **Create a new Supabase Project** in the dashboard.
2.  **Get your credentials**:
    -   Go to **Project Settings** -> **API**.
    -   Copy `Project URL`, `anon public` key, and `service_role` key.

## 3. Database Migration

The entire database schema is located in `supabase/migrations/20241222_complete_schema.sql`.

1.  Go to the **SQL Editor** in your Supabase Dashboard.
2.  Copy the contents of `supabase/migrations/20241222_complete_schema.sql`.
3.  Paste and run the SQL.

This will create:
-   All required tables (Users, Drivers, Trips, Bookings, etc.).
-   RLS Policies for security.
-   Storage buckets configuration (though you may need to ensure buckets are set to public in the Storage dashboard if SQL fails to create them due to permissions).
-   Triggers for updated_at timestamps.

## 4. Storage Configuration

If the SQL script didn't create the buckets (sometimes requires specific privileges):

1.  Go to **Storage** in the Dashboard.
2.  Create a new Public bucket named `profile-photos`.
3.  Create a new Public bucket named `vehicles`.
4.  Create a new **Private** bucket named `licenses`.

## 5. Edge Functions Deployment

You have 3 Edge Functions to deploy:
-   `create-payment-order`: Creates Razorpay orders.
-   `verify-payment`: Verifies signatures and updates booking status.
-   `send-push-notification`: Sends notifications via Expo.

### Environment Variables

Go to **Edge Functions** -> **Secrets** (or Project Settings -> Edge Functions) and add these secrets:

```bash
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
SUPABASE_URL=your_project_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Deployment Commands

Run these commands from the project root:

```bash
npx supabase login
npx supabase link --project-ref your-project-id

npx supabase functions deploy create-payment-order --no-verify-jwt
npx supabase functions deploy verify-payment --no-verify-jwt
npx supabase functions deploy send-push-notification --no-verify-jwt
```

> **Note**: `--no-verify-jwt` is used if you handle Auth verification manually or want to allow open access (controlled by CORS and internal logic). For `verify-payment`, we verify the signature, so it's secure.

## 6. Client Configuration

Update your client `.env` file (`client/.env`):

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
```

## 7. Verification

1.  **Sign Up**: Create a user in the app. Check the `users` table.
2.  **Driver Onboarding**: Upload license/vehicle photos. Check Storage buckets.
3.  **Create Trip**: Post a trip as a driver.
4.  **Book Trip**: Book text trip as a passenger.
5.  **Payment**:
    -   Initiate payment (Client -> `create-payment-order`).
    -   Complete payment (Razorpay Mock/Real).
    -   Client sends success -> `verify-payment`.
    -   `verify-payment` confirms booking and sends Push Notification.

## Troubleshooting

-   **RLS Errors**: Check the Policies in the Authentication -> Policies tab.
-   **CORS Issues**: Ensure Edge Functions have the correct CORS headers (included in the code).
-   **Notification Failures**: Check `send-push-notification` logs in the Supabase Dashboard.
