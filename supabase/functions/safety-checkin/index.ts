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
        const { tripId, userId, status, lat, lng, notes } = await req.json()

        if (!tripId || !userId || !status) {
            throw new Error('Missing required fields: tripId, userId, status')
        }

        // Initialize Supabase client
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Create safety check-in
        const { data: checkin, error: checkinError } = await supabaseClient
            .from('safety_checkins')
            .insert({
                trip_id: tripId,
                user_id: userId,
                status,
                location_lat: lat,
                location_lng: lng,
                notes,
            })
            .select()
            .single()

        if (checkinError) {
            throw new Error(`Failed to create check-in: ${checkinError.message}`)
        }

        // If status is help_needed, trigger emergency alert
        if (status === 'help_needed') {
            // Create emergency alert
            await supabaseClient.from('emergency_alerts').insert({
                trip_id: tripId,
                user_id: userId,
                lat: lat || 0,
                lng: lng || 0,
                status: 'active',
            })

            // Get user details
            const { data: user } = await supabaseClient
                .from('users')
                .select('full_name, phone')
                .eq('id', userId)
                .single()

            // Get trip details
            const { data: trip } = await supabaseClient
                .from('trips')
                .select('*, driver:drivers(user:users(*))')
                .eq('id', tripId)
                .single()

            // Notify admin
            const { data: admins } = await supabaseClient
                .from('users')
                .select('id')
                .eq('role', 'admin')

            if (admins) {
                for (const admin of admins) {
                    await supabaseClient.from('notifications').insert({
                        user_id: admin.id,
                        title: '🚨 EMERGENCY ALERT',
                        message: `${user?.full_name || 'User'} needs help on trip ${tripId}`,
                        type: 'emergency',
                        data: {
                            trip_id: tripId,
                            user_id: userId,
                            lat,
                            lng,
                            notes,
                        },
                    })
                }
            }

            // Notify emergency contacts
            const { data: emergencyContacts } = await supabaseClient
                .from('emergency_contacts')
                .select('*')
                .eq('user_id', userId)
                .eq('auto_notify', true)

            if (emergencyContacts) {
                for (const contact of emergencyContacts) {
                    // In production, send SMS/email to contact.phone/contact.email
                    console.log(`Notifying emergency contact: ${contact.name} - ${contact.phone}`)
                }
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                checkin,
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
