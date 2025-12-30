import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { bookingId, amount, promoCodeId } = await req.json()

        // Validate inputs
        if (!bookingId || !amount) {
            throw new Error('Missing required fields: bookingId, amount')
        }

        // Initialize Supabase client
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Get booking details
        const { data: booking, error: bookingError } = await supabaseClient
            .from('bookings')
            .select('*, trip:trips(*), passenger:users(*)')
            .eq('id', bookingId)
            .single()

        if (bookingError || !booking) {
            throw new Error('Booking not found')
        }

        // Apply promo code if provided
        let finalAmount = amount
        let discount = 0

        if (promoCodeId) {
            const { data: promo } = await supabaseClient
                .from('promo_codes')
                .select('*')
                .eq('id', promoCodeId)
                .single()

            if (promo && promo.is_active) {
                if (promo.discount_type === 'percentage') {
                    discount = (amount * promo.discount_value) / 100
                    if (promo.max_discount && discount > promo.max_discount) {
                        discount = promo.max_discount
                    }
                } else {
                    discount = promo.discount_value
                }
                finalAmount = amount - discount
            }
        }

        // Create Razorpay order
        const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID')
        const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')

        if (!razorpayKeyId || !razorpayKeySecret) {
            throw new Error('Razorpay credentials not configured')
        }

        const auth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`)

        const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: Math.round(finalAmount * 100), // Convert to paise
                currency: 'INR',
                receipt: `booking_${bookingId}`,
                notes: {
                    booking_id: bookingId,
                    passenger_id: booking.passenger_id,
                    trip_id: booking.trip_id,
                },
            }),
        })

        if (!razorpayResponse.ok) {
            const errorData = await razorpayResponse.json()
            throw new Error(`Razorpay error: ${errorData.error?.description || 'Unknown error'}`)
        }

        const razorpayOrder = await razorpayResponse.json()

        // Create payment record
        const platformFee = finalAmount * 0.05 // 5% platform fee
        const driverEarnings = finalAmount - platformFee

        const { data: payment, error: paymentError } = await supabaseClient
            .from('payments')
            .insert({
                booking_id: bookingId,
                amount: finalAmount,
                platform_fee: platformFee,
                driver_earnings: driverEarnings,
                razorpay_order_id: razorpayOrder.id,
                status: 'pending',
                discount_amount: discount,
                promo_code_id: promoCodeId,
            })
            .select()
            .single()

        if (paymentError) {
            throw new Error(`Failed to create payment record: ${paymentError.message}`)
        }

        return new Response(
            JSON.stringify({
                success: true,
                razorpayOrderId: razorpayOrder.id,
                amount: finalAmount,
                discount: discount,
                payment: payment,
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