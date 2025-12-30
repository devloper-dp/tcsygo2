import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from 'https://deno.land/std@0.168.0/node/crypto.ts'

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
        const authHeader = req.headers.get('Authorization')!
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

        if (userError || !user) {
            throw new Error('Unauthorized')
        }

        const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = await req.json()

        // Verify signature
        const text = `${razorpayOrderId}|${razorpayPaymentId}`
        const secret = Deno.env.get('RAZORPAY_KEY_SECRET') ?? ''

        const generatedSignature = createHmac('sha256', secret)
            .update(text)
            .digest('hex')

        if (generatedSignature !== razorpaySignature) {
            throw new Error('Invalid payment signature')
        }

        // Get transaction
        const { data: transaction, error: txError } = await supabaseClient
            .from('wallet_transactions')
            .select('*')
            .eq('reference_id', razorpayOrderId)
            .single()

        if (txError || !transaction) {
            throw new Error('Transaction not found')
        }

        // Update transaction status
        await supabaseClient
            .from('wallet_transactions')
            .update({
                status: 'completed',
                updated_at: new Date().toISOString(),
            })
            .eq('id', transaction.id)

        // Update wallet balance
        const { data: wallet } = await supabaseClient
            .from('wallets')
            .select('balance')
            .eq('id', transaction.wallet_id)
            .single()

        const newBalance = parseFloat(wallet.balance) + parseFloat(transaction.amount)

        await supabaseClient
            .from('wallets')
            .update({ balance: newBalance })
            .eq('id', transaction.wallet_id)

        // Send notification
        await supabaseClient.from('notifications').insert({
            user_id: user.id,
            title: 'Money Added to Wallet',
            message: `₹${transaction.amount} has been added to your wallet successfully.`,
            type: 'payment',
            is_read: false,
        })

        return new Response(
            JSON.stringify({ success: true, newBalance }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
