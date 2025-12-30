import { Alert } from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';
import { supabase } from './supabase';

export interface PaymentOptions {
    amount: number;
    currency?: string;
    orderId: string;
    name: string;
    description: string;
    prefillContact?: string;
    prefillEmail?: string;
}

export interface PaymentResult {
    success: boolean;
    paymentId?: string;
    orderId?: string;
    signature?: string;
    error?: string;
}

const RAZORPAY_KEY = process.env.EXPO_PUBLIC_RAZORPAY_KEY || 'rzp_test_demo';
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

/**
 * Initiates a Razorpay payment with retry logic
 */
export async function initiatePayment(
    options: PaymentOptions,
    retryCount = 0
): Promise<PaymentResult> {
    try {
        const paymentOptions = {
            description: options.description,
            image: 'https://placehold.co/200x200?text=TCSYGO',
            currency: options.currency || 'INR',
            key: RAZORPAY_KEY,
            amount: options.amount * 100, // Convert to paise
            order_id: options.orderId,
            name: options.name,
            prefill: {
                email: options.prefillEmail || '',
                contact: options.prefillContact || '',
                name: options.name,
            },
            theme: { color: '#3b82f6' },
        };

        const data = await RazorpayCheckout.open(paymentOptions);

        // Payment successful
        return {
            success: true,
            paymentId: data.razorpay_payment_id,
            orderId: data.razorpay_order_id,
            signature: data.razorpay_signature,
        };
    } catch (error: any) {
        console.error('Payment error:', error);

        // Check if we should retry
        if (retryCount < MAX_RETRIES && isRetryableError(error)) {
            // Show retry prompt
            return new Promise((resolve) => {
                Alert.alert(
                    'Payment Failed',
                    `${error.description || 'Payment could not be processed'}. Would you like to retry?`,
                    [
                        {
                            text: 'Cancel',
                            style: 'cancel',
                            onPress: () => resolve({
                                success: false,
                                error: error.description || 'Payment cancelled by user',
                            }),
                        },
                        {
                            text: 'Retry',
                            onPress: async () => {
                                // Wait before retrying
                                await new Promise(r => setTimeout(r, RETRY_DELAY));
                                const result = await initiatePayment(options, retryCount + 1);
                                resolve(result);
                            },
                        },
                    ]
                );
            });
        }

        // Max retries reached or non-retryable error
        return {
            success: false,
            error: error.description || 'Payment failed',
        };
    }
}

/**
 * Determines if an error is retryable
 */
function isRetryableError(error: any): boolean {
    const retryableCodes = [
        'NETWORK_ERROR',
        'SERVER_ERROR',
        'TIMEOUT',
        'BAD_REQUEST_ERROR',
    ];

    return retryableCodes.some(code =>
        error.code?.includes(code) || error.description?.includes(code)
    );
}

/**
 * Verifies payment on the server
 */
export async function verifyPayment(
    paymentId: string,
    orderId: string,
    signature: string,
    bookingId: string
): Promise<boolean> {
    console.log('Payment: Starting verification for paymentId:', paymentId, 'orderId:', orderId);
    try {
        const { data, error } = await supabase.functions.invoke('verify-payment', {
            body: {
                payment_id: paymentId,
                order_id: orderId,
                signature: signature,
                booking_id: bookingId,
            },
        });

        if (error) {
            console.error('Payment: Verification function error', error);
            throw error;
        }
        console.log('Payment: Verification result received', data);
        return data?.verified || false;
    } catch (error) {
        console.error('Payment: Verification error', error);
        return false;
    }
}

/**
 * Creates a payment order
 */
export async function createPaymentOrder(
    amount: number,
    bookingId: string
): Promise<{ orderId: string; amount: number } | null> {
    console.log('Payment: Creating payment order for amount:', amount, 'bookingId:', bookingId);
    try {
        const { data, error } = await supabase.functions.invoke('create-payment-order', {
            body: {
                amount: amount,
                booking_id: bookingId,
                currency: 'INR',
            },
        });

        if (error) {
            console.error('Payment: Create order function error', error);
            throw error;
        }

        console.log('Payment: Order created successfully', { orderId: data.order_id });
        return {
            orderId: data.order_id,
            amount: data.amount,
        };
    } catch (error) {
        console.error('Payment: Order creation error', error);
        return null;
    }
}

/**
 * Handles the complete payment flow with retry logic
 */
export async function processPayment(
    bookingId: string,
    amount: number,
    userDetails: {
        name: string;
        email?: string;
        phone?: string;
    }
): Promise<PaymentResult> {
    console.log('Payment: Starting processPayment for bookingId:', bookingId, 'amount:', amount);
    try {
        // Step 1: Create order
        console.log('Payment: Step 1 - Creating order...');
        const order = await createPaymentOrder(amount, bookingId);
        if (!order) {
            console.error('Payment: Step 1 failed - Failed to create payment order');
            return {
                success: false,
                error: 'Failed to create payment order',
            };
        }

        // Step 2: Initiate payment with retry logic
        console.log('Payment: Step 2 - Initiating Razorpay checkout...', { orderId: order.orderId });
        const paymentResult = await initiatePayment({
            amount: order.amount,
            orderId: order.orderId,
            name: userDetails.name,
            description: `Booking #${bookingId}`,
            prefillEmail: userDetails.email,
            prefillContact: userDetails.phone,
        });

        if (!paymentResult.success) {
            console.error('Payment: Step 2 failed - Payment result unsuccessful', paymentResult.error);
            return paymentResult;
        }

        // Step 3: Verify payment
        console.log('Payment: Step 3 - Verifying payment...', { paymentId: paymentResult.paymentId });
        const verified = await verifyPayment(
            paymentResult.paymentId!,
            paymentResult.orderId!,
            paymentResult.signature!,
            bookingId
        );

        if (!verified) {
            console.error('Payment: Step 3 failed - Verification returned false');
            return {
                success: false,
                error: 'Payment verification failed',
            };
        }

        console.log('Payment: All steps completed successfully!');
        return paymentResult;
    } catch (error: any) {
        console.error('Payment: Processing exception', error);
        return {
            success: false,
            error: error.message || 'Payment processing failed',
        };
    }
}
