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
        console.log('=== Add Money to Wallet Request ===')
        console.log('Method:', req.method)
        console.log('Headers:', Object.fromEntries(req.headers.entries()))

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Get user from JWT
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            console.error('❌ Missing Authorization header')
            throw new Error('Authentication required. Please log in again.')
        }

        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

        if (userError || !user) {
            console.error('❌ Auth error:', userError)
            throw new Error('Invalid or expired session. Please log in again.')
        }

        console.log('✅ User authenticated:', user.id)

        // Parse request body
        let body
        try {
            body = await req.json()
            console.log('Request body:', body)
        } catch (e) {
            console.error('❌ Failed to parse request body:', e)
            throw new Error('Invalid request format. Please try again.')
        }

        const { amount } = body

        // Validate amount
        if (!amount) {
            console.error('❌ Amount is missing')
            throw new Error('Amount is required')
        }

        if (typeof amount !== 'number' || isNaN(amount)) {
            console.error('❌ Amount is not a valid number:', amount)
            throw new Error('Amount must be a valid number')
        }

        if (amount < 10) {
            console.error('❌ Amount too small:', amount)
            throw new Error('Minimum amount is ₹10')
        }

        if (amount > 10000) {
            console.error('❌ Amount too large:', amount)
            throw new Error('Maximum amount is ₹10,000')
        }

        console.log('✅ Amount validated:', amount)

        // Check Razorpay configuration
        const key_id = Deno.env.get('RAZORPAY_KEY_ID')
        const key_secret = Deno.env.get('RAZORPAY_KEY_SECRET')

        if (!key_id) {
            console.error('❌ RAZORPAY_KEY_ID not configured')
            throw new Error('Payment gateway not configured. Please contact support. (Error: RAZORPAY_KEY_ID missing)')
        }

        if (!key_secret) {
            console.error('❌ RAZORPAY_KEY_SECRET not configured')
            throw new Error('Payment gateway not configured. Please contact support. (Error: RAZORPAY_KEY_SECRET missing)')
        }

        console.log('✅ Razorpay credentials found')

        // Initialize Razorpay
        let razorpay
        try {
            razorpay = new Razorpay({
                key_id,
                key_secret,
            })
            console.log('✅ Razorpay initialized')
        } catch (e) {
            console.error('❌ Failed to initialize Razorpay:', e)
            throw new Error('Failed to initialize payment gateway. Please contact support.')
        }

        // Create Razorpay order
        console.log(`Creating Razorpay order for user ${user.id}, amount: ₹${amount}`)

        // Generate a short receipt ID (max 40 chars)
        // Format: wallet_<timestamp>_<random>
        const timestamp = Date.now().toString().slice(-8) // Last 8 digits
        const random = Math.random().toString(36).substring(2, 8) // 6 random chars
        const receipt = `wlt_${timestamp}_${random}` // Total: ~20 chars

        let order
        try {
            order = await razorpay.orders.create({
                amount: Math.round(amount * 100), // Convert to paise
                currency: 'INR',
                receipt: receipt,
                notes: {
                    user_id: user.id,
                    type: 'wallet_recharge',
                },
            })
            console.log('✅ Razorpay order created:', order.id)
        } catch (e: any) {
            console.error('❌ Razorpay order creation failed')
            console.error('Error type:', typeof e)
            console.error('Error object:', e)
            console.error('Error message:', e.message)
            console.error('Error description:', e.description)
            console.error('Error statusCode:', e.statusCode)
            console.error('Error error:', e.error)

            // Try to extract meaningful error message
            let errorMsg = 'Unknown error'
            if (e.error && e.error.description) {
                errorMsg = e.error.description
            } else if (e.description) {
                errorMsg = e.description
            } else if (e.message) {
                errorMsg = e.message
            }

            // Include status code if available
            if (e.statusCode) {
                errorMsg = `${errorMsg} (Status: ${e.statusCode})`
            }

            throw new Error(`Failed to create payment order: ${errorMsg}`)
        }

        // Get or create wallet
        let walletId: string | null = null
        const { data: walletData, error: walletError } = await supabaseClient
            .from('wallets')
            .select('id')
            .eq('user_id', user.id)
            .single()

        if (walletError) {
            if (walletError.code === 'PGRST116') {
                // Wallet doesn't exist, create it
                console.log(`Creating wallet for user ${user.id}`)
                const { data: newWallet, error: createError } = await supabaseClient
                    .from('wallets')
                    .insert({ user_id: user.id, balance: 0, currency: 'INR' })
                    .select('id')
                    .single()

                if (createError) {
                    console.error('❌ Failed to create wallet:', createError)
                    throw new Error(`Database error: Failed to create wallet. ${createError.message}`)
                }
                walletId = newWallet.id
                console.log('✅ Wallet created:', walletId)
            } else {
                console.error('❌ Wallet lookup error:', walletError)
                throw new Error(`Database error: Failed to fetch wallet. ${walletError.message}`)
            }
        } else {
            walletId = walletData.id
            console.log('✅ Wallet found:', walletId)
        }

        if (!walletId) {
            console.error('❌ Wallet ID is null')
            throw new Error('Wallet not found. Please contact support.')
        }

        // Store pending transaction
        const { error: txError } = await supabaseClient
            .from('wallet_transactions')
            .insert({
                wallet_id: walletId,
                type: 'credit',
                amount: amount,
                description: 'Wallet Recharge',
                reference_id: order.id,
                status: 'pending',
            })

        if (txError) {
            console.error('❌ Transaction insert error:', txError)
            throw new Error(`Database error: Failed to create transaction. ${txError.message}`)
        }

        console.log('✅ Transaction record created')
        console.log('=== Request completed successfully ===')

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
        console.error('=== Edge Function Error ===')
        console.error('Error type:', typeof error)
        console.error('Error:', error)

        // Ensure we always have an error message
        let errorMessage = 'An unexpected error occurred'
        let errorDetails = null

        if (error instanceof Error) {
            errorMessage = error.message
            errorDetails = {
                name: error.name,
                stack: error.stack,
            }
            console.error('Error message:', errorMessage)
            console.error('Error stack:', error.stack)
        } else if (typeof error === 'string') {
            errorMessage = error
        } else {
            console.error('Unknown error type:', typeof error)
            errorMessage = 'An unexpected error occurred. Please try again.'
            errorDetails = JSON.stringify(error)
        }

        console.error('Final error message:', errorMessage)
        console.error('=== End Error ===')

        return new Response(
            JSON.stringify({
                error: errorMessage,
                timestamp: new Date().toISOString(),
                details: Deno.env.get('ENVIRONMENT') === 'development' ? errorDetails : undefined
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
