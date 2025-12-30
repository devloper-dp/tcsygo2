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
        const { tripId, driverId, lat, lng, heading, speed } = await req.json()

        if (!tripId || !driverId || lat === undefined || lng === undefined) {
            throw new Error('Missing required fields: tripId, driverId, lat, lng')
        }

        // Initialize Supabase client
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Upsert location (update if exists, insert if not)
        const { data: location, error: locationError } = await supabaseClient
            .from('live_locations')
            .upsert({
                trip_id: tripId,
                driver_id: driverId,
                lat,
                lng,
                heading: heading || null,
                speed: speed || null,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'trip_id,driver_id',
            })
            .select()
            .single()

        if (locationError) {
            throw new Error(`Failed to update location: ${locationError.message}`)
        }

        // Get trip details to check for geofencing alerts
        const { data: trip } = await supabaseClient
            .from('trips')
            .select('pickup_lat, pickup_lng, drop_lat, drop_lng')
            .eq('id', tripId)
            .single()

        if (trip) {
            // Calculate distance to pickup and drop
            const distanceToPickup = calculateDistance(lat, lng, trip.pickup_lat, trip.pickup_lng)
            const distanceToDrop = calculateDistance(lat, lng, trip.drop_lat, trip.drop_lng)

            // Get bookings for this trip
            const { data: bookings } = await supabaseClient
                .from('bookings')
                .select('passenger_id')
                .eq('trip_id', tripId)
                .eq('status', 'confirmed')

            // Send notifications if driver is nearby
            if (bookings && bookings.length > 0) {
                for (const booking of bookings) {
                    // Notify when driver is 500m from pickup
                    if (distanceToPickup <= 0.5 && distanceToPickup > 0.05) {
                        await supabaseClient.from('notifications').insert({
                            user_id: booking.passenger_id,
                            title: 'Driver Nearby',
                            message: 'Your driver is approaching the pickup location',
                            type: 'arrival',
                            data: {
                                trip_id: tripId,
                                distance: distanceToPickup,
                            },
                        })
                    }

                    // Notify when driver has arrived at pickup
                    if (distanceToPickup <= 0.05) {
                        await supabaseClient.from('notifications').insert({
                            user_id: booking.passenger_id,
                            title: 'Driver Arrived',
                            message: 'Your driver has arrived at the pickup location',
                            type: 'arrival',
                            data: {
                                trip_id: tripId,
                            },
                        })
                    }

                    // Notify when approaching drop location
                    if (distanceToDrop <= 0.5 && distanceToDrop > 0.05) {
                        await supabaseClient.from('notifications').insert({
                            user_id: booking.passenger_id,
                            title: 'Approaching Destination',
                            message: 'You are approaching your drop-off location',
                            type: 'arrival',
                            data: {
                                trip_id: tripId,
                                distance: distanceToDrop,
                            },
                        })
                    }
                }
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                location,
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

// Helper function to calculate distance using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371 // Radius of Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
}