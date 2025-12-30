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
        const { userId, title, message, data, pushTokens } = await req.json()

        if (!userId || !title || !message) {
            throw new Error('Missing required fields: userId, title, message')
        }

        // Initialize Supabase client
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Create notification in database
        const { data: notification, error: notificationError } = await supabaseClient
            .from('notifications')
            .insert({
                user_id: userId,
                title,
                message,
                type: data?.type || 'general',
                data: data || {},
            })
            .select()
            .single()

        if (notificationError) {
            throw new Error(`Failed to create notification: ${notificationError.message}`)
        }

        // Send push notification via Expo if push tokens provided
        if (pushTokens && pushTokens.length > 0) {
            const expoMessages = pushTokens.map((token: string) => ({
                to: token,
                sound: 'default',
                title,
                body: message,
                data: data || {},
            }))

            const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Accept-Encoding': 'gzip, deflate',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(expoMessages),
            })

            if (!expoResponse.ok) {
                console.error('Failed to send push notification:', await expoResponse.text())
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                notification,
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