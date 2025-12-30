
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
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
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { userId, amount } = await req.json()

        if (!userId || !amount || amount <= 0) {
            throw new Error('Invalid parameters')
        }

        // specific wallet fetch
        const { data: wallet, error: walletError } = await supabaseClient
            .from('wallets')
            .select('id, balance')
            .eq('user_id', userId)
            .single()

        if (walletError || !wallet) {
            throw new Error('Wallet not found')
        }

        if (wallet.balance < amount) {
            throw new Error('Insufficient balance')
        }

        // atomic decrement not strictly possible without RPC, but we can update
        // For better concurrency usage, an RPC or specific SQL query is better, 
        // but for now we follow the simple pattern:
        const newBalance = wallet.balance - amount

        const { error: updateError } = await supabaseClient
            .from('wallets')
            .update({ balance: newBalance })
            .eq('id', wallet.id)

        if (updateError) throw updateError

        // Log transaction
        await supabaseClient
            .from('wallet_transactions')
            .insert({
                wallet_id: wallet.id,
                amount: -amount,
                type: 'debit',
                description: 'Ride Payment',
                status: 'completed',
                date: new Date().toISOString()
            })

        return new Response(
            JSON.stringify({ success: true, newBalance }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
