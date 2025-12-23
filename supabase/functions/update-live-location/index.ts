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
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const { tripId, lat, lng, heading, speed } = await req.json()

        // Verify driver owns this trip
        const { data: trip, error: tripError } = await supabaseClient
            .from('trips')
            .select('driver_id')
            .eq('id', tripId)
            .single()

        if (tripError || !trip) {
            throw new Error('Trip not found')
        }

        // Get driver ID from trip
        const { data: driver, error: driverError } = await supabaseClient
            .from('drivers')
            .select('id')
            .eq('id', trip.driver_id)
            .eq('user_id', supabaseClient.auth.getUser().then(({ data }) => data.user?.id))
            .single()

        if (driverError || !driver) {
            throw new Error('Unauthorized: You are not the driver for this trip')
        }

        // Update or insert live location
        const { data, error } = await supabaseClient
            .from('live_locations')
            .upsert({
                trip_id: tripId,
                driver_id: driver.id,
                lat: parseFloat(lat),
                lng: parseFloat(lng),
                heading: heading ? parseFloat(heading) : null,
                speed: speed ? parseFloat(speed) : null,
                updated_at: new Date().toISOString()
            })
            .select()
            .single()

        if (error) throw error

        return new Response(
            JSON.stringify({ success: true, location: data }),
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
