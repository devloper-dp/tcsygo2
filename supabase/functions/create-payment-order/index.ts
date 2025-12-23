
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Razorpay from "npm:razorpay@2.9.2";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const { bookingId } = await req.json()

        // Get booking details
        const { data: booking, error: bookingError } = await supabaseClient
            .from('bookings')
            .select('total_amount, id')
            .eq('id', bookingId)
            .single()

        if (bookingError || !booking) {
            throw new Error('Booking not found')
        }

        const instance = new Razorpay({
            key_id: Deno.env.get('RAZORPAY_KEY_ID') ?? '',
            key_secret: Deno.env.get('RAZORPAY_KEY_SECRET') ?? '',
        });

        const options = {
            amount: Math.round(parseFloat(booking.total_amount) * 100), // amount in paisa
            currency: "INR",
            receipt: `receipt_${bookingId.substring(0, 8)}`,
        };

        const order = await instance.orders.create(options);

        return new Response(
            JSON.stringify({
                razorpayOrderId: order.id,
                amount: order.amount,
                currency: order.currency,
            }),
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
