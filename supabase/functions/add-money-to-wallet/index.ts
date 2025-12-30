import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Razorpay from 'npm:razorpay@2.9.2'

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
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Get user from JWT
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            throw new Error('Missing Authorization header')
        }

        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

        if (userError || !user) {
            console.error('Auth error:', userError)
            throw new Error('Unauthorized')
        }

        const body = await req.json().catch(() => ({}))
        const { amount } = body

        if (!amount || amount < 10 || amount > 10000) {
            throw new Error('Invalid amount. Must be between ₹10 and ₹10,000')
        }

        const key_id = Deno.env.get('RAZORPAY_KEY_ID')
        const key_secret = Deno.env.get('RAZORPAY_KEY_SECRET')

        if (!key_id || !key_secret) {
            console.error('Missing Razorpay keys')
            throw new Error('Server configuration error: parameters missing')
        }

        // Initialize Razorpay
        const razorpay = new Razorpay({
            key_id,
            key_secret,
        })

        // Create Razorpay order
        console.log(`Creating order for user ${user.id} amount ${amount}`)
        const order = await razorpay.orders.create({
            amount: Math.round(amount * 100), // Convert to paise
            currency: 'INR',
            receipt: `wallet_${user.id}_${Date.now()}`,
            notes: {
                user_id: user.id,
                type: 'wallet_recharge',
            },
        })

        // Store pending transaction
        const { error: txError } = await supabaseClient
            .from('wallet_transactions')
            .insert({
                wallet_id: (await supabaseClient
                    .from('wallets')
                    .select('id')
                    .eq('user_id', user.id)
                    .single()).data?.id,
                type: 'credit',
                amount: amount,
                description: 'Wallet Recharge',
                reference_id: order.id,
                status: 'pending',
            })

        if (txError) {
            console.error('Transaction insert error:', txError)
            throw txError
        }

        return new Response(
            JSON.stringify({
                razorpayOrderId: order.id,
                amount: order.amount,
                currency: order.currency,
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )
    } catch (error) {
        console.error('Edge Function Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
