import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY') || ''
const SENDGRID_FROM_EMAIL = Deno.env.get('SENDGRID_FROM_EMAIL') || 'noreply@tcsygo.com'

interface RideShareEmailRequest {
    inviteId: string
    recipientEmail: string
    recipientName?: string
    inviterName: string
    pickupLocation: string
    dropLocation: string
    departureTime: string
    inviteLink: string
}

serve(async (req) => {
    try {
        // CORS headers
        if (req.method === 'OPTIONS') {
            return new Response('ok', {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST',
                    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
                },
            })
        }

        const {
            inviteId,
            recipientEmail,
            recipientName,
            inviterName,
            pickupLocation,
            dropLocation,
            departureTime,
            inviteLink,
        } = await req.json() as RideShareEmailRequest

        // Validate required fields
        if (!recipientEmail || !inviterName || !pickupLocation || !dropLocation || !inviteLink) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // Format departure time
        const formattedDate = new Date(departureTime).toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })

        // Send email using SendGrid
        const emailResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SENDGRID_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                personalizations: [
                    {
                        to: [{ email: recipientEmail, name: recipientName || recipientEmail }],
                        subject: `${inviterName} invited you to join their ride`,
                    },
                ],
                from: {
                    email: SENDGRID_FROM_EMAIL,
                    name: 'TCSYGO',
                },
                content: [
                    {
                        type: 'text/html',
                        value: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Ride Share Invitation</title>
              </head>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">TCSYGO</h1>
                  <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Ride Share Invitation</p>
                </div>
                
                <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                  <p style="font-size: 18px; margin-bottom: 20px;">
                    Hi ${recipientName || 'there'},
                  </p>
                  
                  <p style="font-size: 16px; margin-bottom: 20px;">
                    <strong>${inviterName}</strong> has invited you to join their ride!
                  </p>
                  
                  <div style="background: white; padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #667eea;">
                    <div style="margin-bottom: 15px;">
                      <p style="margin: 0; font-size: 12px; color: #666; text-transform: uppercase;">Pickup</p>
                      <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: bold; color: #333;">📍 ${pickupLocation}</p>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                      <p style="margin: 0; font-size: 12px; color: #666; text-transform: uppercase;">Drop-off</p>
                      <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: bold; color: #333;">📍 ${dropLocation}</p>
                    </div>
                    
                    <div>
                      <p style="margin: 0; font-size: 12px; color: #666; text-transform: uppercase;">Departure Time</p>
                      <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: bold; color: #667eea;">🕐 ${formattedDate}</p>
                    </div>
                  </div>
                  
                  <p style="text-align: center; margin: 30px 0;">
                    <a href="${inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 25px; font-size: 16px; font-weight: bold;">
                      Accept Invitation
                    </a>
                  </p>
                  
                  <p style="font-size: 14px; color: #666; margin-top: 30px;">
                    Or copy and paste this link in your browser:<br>
                    <a href="${inviteLink}" style="color: #667eea; word-break: break-all;">${inviteLink}</a>
                  </p>
                  
                  <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 15px; margin: 30px 0;">
                    <p style="margin: 0; font-size: 14px; color: #856404;">
                      <strong>💡 Tip:</strong> Carpooling is eco-friendly and helps reduce traffic congestion!
                    </p>
                  </div>
                  
                  <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                  
                  <p style="font-size: 12px; color: #999; text-align: center;">
                    This is an automated email from TCSYGO. Please do not reply to this email.
                  </p>
                </div>
              </body>
              </html>
            `,
                    },
                ],
            }),
        })

        if (!emailResponse.ok) {
            const errorText = await emailResponse.text()
            console.error('SendGrid error:', errorText)
            throw new Error(`Failed to send email: ${errorText}`)
        }

        return new Response(
            JSON.stringify({ success: true, message: 'Email sent successfully' }),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
            }
        )
    } catch (error) {
        console.error('Error sending ride share email:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
            }
        )
    }
})
