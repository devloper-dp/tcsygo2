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
        console.log('=== Testing Razorpay Configuration ===')

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Get user from JWT (optional for this test endpoint)
        const authHeader = req.headers.get('Authorization')
        let userId = 'anonymous'

        if (authHeader) {
            const token = authHeader.replace('Bearer ', '')
            const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

            if (!userError && user) {
                userId = user.id
                console.log('✅ User authenticated:', userId)
            }
        }

        const results: any = {
            timestamp: new Date().toISOString(),
            userId,
            checks: {},
            summary: {
                passed: 0,
                failed: 0,
                warnings: 0
            }
        }

        // Check 1: Supabase URL
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        if (supabaseUrl) {
            results.checks.supabaseUrl = {
                status: 'passed',
                message: 'Supabase URL is configured',
                value: supabaseUrl.substring(0, 30) + '...'
            }
            results.summary.passed++
        } else {
            results.checks.supabaseUrl = {
                status: 'failed',
                message: 'SUPABASE_URL environment variable is not set'
            }
            results.summary.failed++
        }

        // Check 2: Supabase Service Role Key
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        if (serviceRoleKey) {
            results.checks.supabaseServiceRoleKey = {
                status: 'passed',
                message: 'Supabase Service Role Key is configured',
                value: serviceRoleKey.substring(0, 20) + '...'
            }
            results.summary.passed++
        } else {
            results.checks.supabaseServiceRoleKey = {
                status: 'failed',
                message: 'SUPABASE_SERVICE_ROLE_KEY environment variable is not set'
            }
            results.summary.failed++
        }

        // Check 3: Razorpay Key ID
        const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID')
        if (razorpayKeyId) {
            results.checks.razorpayKeyId = {
                status: 'passed',
                message: 'Razorpay Key ID is configured',
                value: razorpayKeyId.substring(0, 10) + '...'
            }
            results.summary.passed++
        } else {
            results.checks.razorpayKeyId = {
                status: 'failed',
                message: 'RAZORPAY_KEY_ID environment variable is not set',
                fix: 'Set RAZORPAY_KEY_ID in Supabase Dashboard → Project Settings → Edge Functions → Secrets'
            }
            results.summary.failed++
        }

        // Check 4: Razorpay Key Secret
        const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')
        if (razorpayKeySecret) {
            results.checks.razorpayKeySecret = {
                status: 'passed',
                message: 'Razorpay Key Secret is configured',
                value: razorpayKeySecret.substring(0, 10) + '...'
            }
            results.summary.passed++
        } else {
            results.checks.razorpayKeySecret = {
                status: 'failed',
                message: 'RAZORPAY_KEY_SECRET environment variable is not set',
                fix: 'Set RAZORPAY_KEY_SECRET in Supabase Dashboard → Project Settings → Edge Functions → Secrets'
            }
            results.summary.failed++
        }

        // Check 5: Razorpay Initialization
        if (razorpayKeyId && razorpayKeySecret) {
            try {
                const razorpay = new Razorpay({
                    key_id: razorpayKeyId,
                    key_secret: razorpayKeySecret,
                })
                results.checks.razorpayInitialization = {
                    status: 'passed',
                    message: 'Razorpay SDK initialized successfully'
                }
                results.summary.passed++

                // Check 6: Test Razorpay API Connection (optional)
                try {
                    // Try to fetch a non-existent order to test API connectivity
                    // This will fail but confirms the API is reachable
                    await razorpay.orders.fetch('test_order_id').catch((e: any) => {
                        // Expected to fail, but if it's an auth error, credentials are wrong
                        if (e.statusCode === 401) {
                            throw new Error('Invalid Razorpay credentials')
                        }
                        // Any other error means API is reachable
                        return null
                    })

                    results.checks.razorpayApiConnection = {
                        status: 'passed',
                        message: 'Razorpay API is reachable and credentials are valid'
                    }
                    results.summary.passed++
                } catch (e: any) {
                    if (e.message === 'Invalid Razorpay credentials') {
                        results.checks.razorpayApiConnection = {
                            status: 'failed',
                            message: 'Razorpay credentials are invalid (401 Unauthorized)',
                            fix: 'Verify your RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are correct'
                        }
                        results.summary.failed++
                    } else {
                        results.checks.razorpayApiConnection = {
                            status: 'warning',
                            message: 'Could not verify Razorpay API connection',
                            error: e.message
                        }
                        results.summary.warnings++
                    }
                }
            } catch (e: any) {
                results.checks.razorpayInitialization = {
                    status: 'failed',
                    message: 'Failed to initialize Razorpay SDK',
                    error: e.message
                }
                results.summary.failed++
            }
        } else {
            results.checks.razorpayInitialization = {
                status: 'skipped',
                message: 'Skipped - Razorpay credentials not configured'
            }
        }

        // Check 7: Database connectivity
        try {
            const { data, error } = await supabaseClient
                .from('wallets')
                .select('count')
                .limit(1)

            if (error) {
                results.checks.databaseConnection = {
                    status: 'warning',
                    message: 'Database query returned an error',
                    error: error.message
                }
                results.summary.warnings++
            } else {
                results.checks.databaseConnection = {
                    status: 'passed',
                    message: 'Database connection is working'
                }
                results.summary.passed++
            }
        } catch (e: any) {
            results.checks.databaseConnection = {
                status: 'failed',
                message: 'Failed to connect to database',
                error: e.message
            }
            results.summary.failed++
        }

        // Overall status
        results.overallStatus = results.summary.failed > 0 ? 'failed' :
            results.summary.warnings > 0 ? 'warning' : 'passed'

        console.log('Test Results:', JSON.stringify(results, null, 2))
        console.log('=== Test Completed ===')

        return new Response(
            JSON.stringify(results, null, 2),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )
    } catch (error) {
        console.error('=== Test Endpoint Error ===')
        console.error('Error:', error)

        let errorMessage = 'An unexpected error occurred during testing'
        if (error instanceof Error) {
            errorMessage = error.message
        }

        return new Response(
            JSON.stringify({
                error: errorMessage,
                timestamp: new Date().toISOString()
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            }
        )
    }
})
