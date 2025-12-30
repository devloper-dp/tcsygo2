import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
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

        const { tripId } = await req.json()

        if (!tripId) {
            throw new Error('Trip ID is required')
        }

        // Get all bookings for this trip that need auto-payment
        const { data: bookings, error: bookingsError } = await supabaseClient
            .from('bookings')
            .select(`
        *,
        passenger:users!bookings_passenger_id_fkey(id, email, full_name),
        autoPaySettings:auto_pay_settings!inner(*)
      `)
            .eq('trip_id', tripId)
            .eq('status', 'confirmed')
            .eq('payment_status', 'pending')

        if (bookingsError) throw bookingsError

        const results = []

        for (const booking of bookings || []) {
            try {
                // Check if auto-pay is enabled
                if (!booking.autoPaySettings || !booking.autoPaySettings.enabled) {
                    continue
                }

                const amount = parseFloat(booking.total_amount)

                // Check spending limit
                if (booking.autoPaySettings.spending_limit) {
                    const limit = parseFloat(booking.autoPaySettings.spending_limit)
                    if (amount > limit) {
                        results.push({
                            bookingId: booking.id,
                            success: false,
                            reason: 'Exceeds spending limit',
                        })
                        continue
                    }
                }

                // Process payment based on default method
                const paymentMethod = booking.autoPaySettings.default_payment_method

                if (paymentMethod === 'wallet') {
                    // Get wallet balance
                    const { data: wallet } = await supabaseClient
                        .from('wallets')
                        .select('id, balance')
                        .eq('user_id', booking.passenger_id)
                        .single()

                    if (!wallet || parseFloat(wallet.balance) < amount) {
                        results.push({
                            bookingId: booking.id,
                            success: false,
                            reason: 'Insufficient wallet balance',
                        })
                        continue
                    }

                    // Deduct from wallet
                    const newBalance = parseFloat(wallet.balance) - amount

                    await supabaseClient
                        .from('wallets')
                        .update({ balance: newBalance })
                        .eq('id', wallet.id)

                    // Create transaction record
                    await supabaseClient.from('wallet_transactions').insert({
                        wallet_id: wallet.id,
                        type: 'debit',
                        amount: amount,
                        description: `Auto-pay for trip ${tripId}`,
                        reference_id: booking.id,
                        status: 'completed',
                    })

                    // Update booking
                    await supabaseClient
                        .from('bookings')
                        .update({
                            payment_status: 'success',
                            payment_method: 'wallet',
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', booking.id)

                    // Create payment record
                    await supabaseClient.from('payments').insert({
                        booking_id: booking.id,
                        amount: amount,
                        payment_method: 'wallet',
                        status: 'completed',
                        transaction_id: `auto_pay_${booking.id}_${Date.now()}`,
                    })

                    // Send notification
                    await supabaseClient.from('notifications').insert({
                        user_id: booking.passenger_id,
                        title: 'Auto-Pay Successful',
                        message: `₹${amount} has been automatically deducted from your wallet for your recent trip.`,
                        type: 'payment',
                        is_read: false,
                    })

                    results.push({
                        bookingId: booking.id,
                        success: true,
                        amount: amount,
                        method: 'wallet',
                    })
                } else {
                    // For other payment methods, mark as pending for manual payment
                    results.push({
                        bookingId: booking.id,
                        success: false,
                        reason: 'Auto-pay only supports wallet payment',
                    })
                }
            } catch (error) {
                results.push({
                    bookingId: booking.id,
                    success: false,
                    reason: error.message,
                })
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                processed: results.length,
                results,
            }),
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
