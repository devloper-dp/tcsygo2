import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from "https://deno.land/std@0.160.0/node/crypto.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            bookingId,
        } = await req.json()

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !bookingId) {
            throw new Error('Missing required fields')
        }

        // Verify signature
        const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')
        if (!razorpayKeySecret) {
            throw new Error('Razorpay secret not configured')
        }

        const text = `${razorpay_order_id}|${razorpay_payment_id}`
        const generated_signature = createHmac('sha256', razorpayKeySecret)
            .update(text)
            .digest('hex')

        if (generated_signature !== razorpay_signature) {
            throw new Error('Invalid payment signature')
        }

        // Initialize Supabase client
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Update payment status
        const { data: payment, error: paymentError } = await supabaseClient
            .from('payments')
            .update({
                razorpay_payment_id,
                status: 'success',
                updated_at: new Date().toISOString(),
            })
            .eq('razorpay_order_id', razorpay_order_id)
            .select()
            .single()

        if (paymentError) {
            throw new Error(`Failed to update payment: ${paymentError.message}`)
        }

        // Update booking status to confirmed
        const { error: bookingError } = await supabaseClient
            .from('bookings')
            .update({
                status: 'confirmed',
                updated_at: new Date().toISOString(),
            })
            .eq('id', bookingId)

        if (bookingError) {
            throw new Error(`Failed to update booking: ${bookingError.message}`)
        }

        // Get booking details for notification
        const { data: booking } = await supabaseClient
            .from('bookings')
            .select('*, trip:trips(*, driver:drivers(user:users(*)))')
            .eq('id', bookingId)
            .single()

        // Create notifications
        if (booking) {
            // Notify passenger
            await supabaseClient.from('notifications').insert({
                user_id: booking.passenger_id,
                title: 'Payment Successful',
                message: `Your payment of ₹${payment.amount} was successful. Booking confirmed!`,
                type: 'payment',
                data: {
                    booking_id: bookingId,
                    payment_id: payment.id,
                    amount: payment.amount,
                },
            })

            // Notify driver
            if (booking.trip?.driver?.user?.id) {
                await supabaseClient.from('notifications').insert({
                    user_id: booking.trip.driver.user.id,
                    title: 'New Booking',
                    message: `You have a new booking for ${booking.seats_booked} seat(s)`,
                    type: 'booking',
                    data: {
                        booking_id: bookingId,
                        passenger_id: booking.passenger_id,
                        seats: booking.seats_booked,
                    },
                })
            }
        }

        // Update promo code usage if used
        if (payment.promo_code_id) {
            await supabaseClient
                .from('promo_codes')
                .update({ current_uses: supabaseClient.raw('current_uses + 1') })
                .eq('id', payment.promo_code_id)
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Payment verified successfully',
                payment,
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )
    } catch (error) {
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message,
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})