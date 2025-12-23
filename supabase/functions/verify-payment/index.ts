
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import crypto from 'node:crypto';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Need service role to update payments securely if RLS blocks
        )

        const {
            bookingId,
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature
        } = await req.json()

        // Verify Signature
        const body = razorpayOrderId + "|" + razorpayPaymentId;
        const expectedSignature = crypto
            .createHmac('sha256', Deno.env.get('RAZORPAY_KEY_SECRET') ?? '')
            .update(body.toString())
            .digest('hex');

        if (expectedSignature !== razorpaySignature) {
            throw new Error('Invalid signature');
        }

        // Get Booking Amount for calculations
        const { data: booking } = await supabaseClient
            .from('bookings')
            .select('total_amount')
            .eq('id', bookingId)
            .single();

        if (!booking) throw new Error('Booking not found');

        const amount = parseFloat(booking.total_amount);
        const platformFee = (amount * 0.05).toString();
        const driverEarnings = (amount * 0.95).toString();

        // 1. Create Payment Record
        const { error: paymentError } = await supabaseClient.from('payments').insert({
            booking_id: bookingId,
            amount: amount.toString(),
            platform_fee: platformFee,
            driver_earnings: driverEarnings,
            razorpay_order_id: razorpayOrderId,
            razorpay_payment_id: razorpayPaymentId,
            status: 'success',
            payment_method: 'upi' // Can get from razorpay API details if needed
        });

        if (paymentError) throw paymentError;

        // 2. Update Booking Status
        const { error: bookingError } = await supabaseClient
            .from('bookings')
            .update({ status: 'confirmed' })
            .eq('id', bookingId);

        if (bookingError) throw bookingError;

        // 3. Send Push Notifications (Async - don't block response)
        try {
            const { data: details } = await supabaseClient
                .from('bookings')
                .select(`
                    passenger_id,
                    trip:trips (
                        drop_location,
                        driver:drivers (
                            user:users (
                                id,
                                push_token
                            )
                        )
                    ),
                    passenger:users (
                        full_name,
                        push_token
                    )
                `)
                .eq('id', bookingId)
                .single();

            if (details) {
                const passengerToken = details.passenger?.push_token;
                const passengerName = details.passenger?.full_name || 'Passenger';
                const driverToken = details.trip?.driver?.user?.push_token;
                const driverId = details.trip?.driver?.user?.id;

                // Notify Passenger
                if (passengerToken) {
                    await supabaseClient.functions.invoke('send-push-notification', {
                        body: {
                            userId: details.passenger_id,
                            title: 'Booking Confirmed! ✅',
                            body: `Your ride to ${details.trip?.drop_location} is confirmed. View details in the app.`,
                            data: { bookingId, type: 'booking_confirmed' }
                        }
                    });
                }

                // Notify Driver
                if (driverToken && driverId) {
                    await supabaseClient.functions.invoke('send-push-notification', {
                        body: {
                            userId: driverId,
                            title: 'New Booking! 🚗',
                            body: `${passengerName} has booked a seat for your trip to ${details.trip?.drop_location}.`,
                            data: { bookingId, type: 'new_booking' }
                        }
                    });
                }
            }
        } catch (notifyError) {
            console.error('Notification error:', notifyError);
            // Continue execution, don't fail the payment
        }

        return new Response(
            JSON.stringify({ success: true }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            },
        )
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            },
        )
    }
})
