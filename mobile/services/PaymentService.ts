import { supabase } from '@/lib/supabase';
import { Alert } from 'react-native';
import { logger } from './LoggerService';

// Razorpay configuration
const RAZORPAY_KEY_ID = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || '';

export type PaymentMethod = 'wallet' | 'upi' | 'card' | 'cash' | 'netbanking';

export interface PaymentOrder {
    id: string;
    amount: number;
    currency: string;
    receipt: string;
    status: string;
}

export interface PaymentResult {
    success: boolean;
    paymentId?: string;
    orderId?: string;
    signature?: string;
    error?: string;
}

export interface WalletBalance {
    balance: number;
    currency: string;
}

export interface WalletTransaction {
    id: string;
    type: 'credit' | 'debit';
    amount: number;
    description: string;
    status: string;
    reference_id?: string;
    created_at: string;
}

export interface PaymentReceipt {
    id: string;
    booking_id: string;
    amount: number;
    payment_method: PaymentMethod;
    transaction_id: string;
    fare_breakdown: {
        base_fare: number;
        distance_fare: number;
        surge_charge: number;
        taxes: number;
        discount: number;
        tip?: number;
        total: number;
    };
    created_at: string;
}

export const PaymentService = {
    /**
     * Create Razorpay payment order
     */
    createOrder: async (
        amount: number,
        currency: string = 'INR',
        receipt?: string
    ): Promise<PaymentOrder> => {
        try {
            // Call Supabase Edge Function to create Razorpay order
            const { data, error } = await supabase.functions.invoke('create-payment-order', {
                body: {
                    amount: Math.round(amount * 100), // Convert to paise
                    currency,
                    receipt: receipt || `receipt_${Date.now()}`,
                },
            });

            if (error) throw error;
            return data;
        } catch (error: any) {
            logger.error('Error creating payment order:', error);
            throw new Error('Failed to create payment order: ' + error.message);
        }
    },

    /**
     * Verify Razorpay payment signature
     */
    verifyPayment: async (
        orderId: string,
        paymentId: string,
        signature: string
    ): Promise<boolean> => {
        try {
            // Call Supabase Edge Function to verify payment
            const { data, error } = await supabase.functions.invoke('verify-payment', {
                body: {
                    order_id: orderId,
                    payment_id: paymentId,
                    signature,
                },
            });

            if (error) throw error;
            return data.verified;
        } catch (error: any) {
            logger.error('Error verifying payment:', error);
            return false;
        }
    },

    /**
     * Process payment for a booking
     */
    processPayment: async (
        bookingId: string,
        amount: number,
        method: PaymentMethod,
        autoPayEnabled: boolean = false
    ): Promise<PaymentResult> => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            // Handle different payment methods
            switch (method) {
                case 'wallet':
                    return await PaymentService.processWalletPayment(user.id, bookingId, amount);

                case 'cash':
                    return await PaymentService.processCashPayment(bookingId, amount);

                case 'upi':
                case 'card':
                case 'netbanking':
                    return await PaymentService.processOnlinePayment(bookingId, amount, method);

                default:
                    throw new Error('Invalid payment method');
            }
        } catch (error: any) {
            logger.error('Error processing payment:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    },

    /**
     * Process wallet payment
     */
    processWalletPayment: async (
        userId: string,
        bookingId: string,
        amount: number
    ): Promise<PaymentResult> => {
        try {
            // Get wallet
            const { data: wallet, error: walletError } = await supabase
                .from('wallets')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (walletError) throw walletError;
            if (!wallet) throw new Error('Wallet not found');

            // Check balance
            if (wallet.balance < amount) {
                return {
                    success: false,
                    error: 'Insufficient wallet balance',
                };
            }

            // Deduct from wallet
            const { error: updateError } = await supabase
                .from('wallets')
                .update({ balance: wallet.balance - amount })
                .eq('id', wallet.id);

            if (updateError) throw updateError;

            // Create transaction record
            const { data: transaction, error: txError } = await supabase
                .from('wallet_transactions')
                .insert({
                    wallet_id: wallet.id,
                    type: 'debit',
                    amount,
                    description: `Payment for booking ${bookingId}`,
                    status: 'completed',
                    reference_id: bookingId,
                })
                .select()
                .single();

            if (txError) throw txError;

            // Update booking payment status
            await supabase
                .from('bookings')
                .update({ payment_status: 'completed', payment_method: 'wallet' })
                .eq('id', bookingId);

            return {
                success: true,
                paymentId: transaction.id,
            };
        } catch (error: any) {
            logger.error('Error processing wallet payment:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    },

    /**
     * Process cash payment
     */
    processCashPayment: async (
        bookingId: string,
        amount: number
    ): Promise<PaymentResult> => {
        try {
            // Update booking payment status
            const { error } = await supabase
                .from('bookings')
                .update({ payment_status: 'pending', payment_method: 'cash' })
                .eq('id', bookingId);

            if (error) throw error;

            return {
                success: true,
                paymentId: `cash_${bookingId}`,
            };
        } catch (error: any) {
            logger.error('Error processing cash payment:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    },

    /**
     * Process online payment (UPI/Card/NetBanking)
     */
    processOnlinePayment: async (
        bookingId: string,
        amount: number,
        method: PaymentMethod
    ): Promise<PaymentResult> => {
        try {
            // Create Razorpay order
            const order = await PaymentService.createOrder(amount, 'INR', bookingId);

            // Return order details for Razorpay checkout
            // The actual payment will be handled by Razorpay SDK in the UI
            return {
                success: true,
                orderId: order.id,
            };
        } catch (error: any) {
            logger.error('Error processing online payment:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    },

    /**
     * Get wallet balance
     */
    getWalletBalance: async (userId: string): Promise<WalletBalance> => {
        try {
            const { data: wallet, error } = await supabase
                .from('wallets')
                .select('balance, currency')
                .eq('user_id', userId)
                .single();

            if (error) {
                // Create wallet if doesn't exist
                if (error.code === 'PGRST116') {
                    const { data: newWallet, error: createError } = await supabase
                        .from('wallets')
                        .insert({ user_id: userId, balance: 0, currency: 'INR' })
                        .select()
                        .single();

                    if (createError) throw createError;
                    return { balance: 0, currency: 'INR' };
                }
                throw error;
            }

            return {
                balance: wallet.balance,
                currency: wallet.currency,
            };
        } catch (error: any) {
            logger.error('Error getting wallet balance:', error);
            throw error;
        }
    },

    /**
     * Add money to wallet
     */
    addMoneyToWallet: async (
        userId: string,
        amount: number,
        paymentId: string,
        description: string = 'Added money to wallet'
    ): Promise<boolean> => {
        try {
            // Get wallet
            const { data: wallet, error: walletError } = await supabase
                .from('wallets')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (walletError) throw walletError;

            // Add to wallet
            const { error: updateError } = await supabase
                .from('wallets')
                .update({ balance: wallet.balance + amount })
                .eq('id', wallet.id);

            if (updateError) throw updateError;

            // Create transaction record
            const { error: txError } = await supabase
                .from('wallet_transactions')
                .insert({
                    wallet_id: wallet.id,
                    type: 'credit',
                    amount,
                    description,
                    status: 'completed',
                    reference_id: paymentId,
                });

            if (txError) throw txError;

            return true;
        } catch (error: any) {
            logger.error('Error adding money to wallet:', error);
            return false;
        }
    },



    /**
     * Settle all payments for a trip (Auto-pay)
     */
    settleTripPayments: async (tripId: string): Promise<{ settled: number; failed: number }> => {
        try {
            // Get all confirmed bookings for this trip
            const { data: bookings, error } = await supabase
                .from('bookings')
                .select('*')
                .eq('trip_id', tripId)
                .in('status', ['confirmed', 'ongoing']);

            if (error) throw error;
            if (!bookings || bookings.length === 0) return { settled: 0, failed: 0 };

            let settled = 0;
            let failed = 0;

            for (const booking of bookings) {
                try {
                    // Only auto-pay if payment_status is not completed
                    if (booking.payment_status === 'completed') {
                        settled++;
                        continue;
                    }

                    const result = await PaymentService.processAutoPay(
                        booking.passenger_id,
                        booking.id,
                        parseFloat(booking.total_amount)
                    );

                    if (result.success) {
                        settled++;
                    } else {
                        console.warn(`Auto-pay failed for booking ${booking.id}: ${result.error}`);
                        failed++;
                    }
                } catch (e) {
                    console.error(`Error settling booking ${booking.id}:`, e);
                    failed++;
                }
            }

            return { settled, failed };
        } catch (error: any) {
            logger.error('Error settling trip payments:', error);
            return { settled: 0, failed: 0 };
        }
    },

    /**
     * Process auto-pay
     */
    processAutoPay: async (
        userId: string,
        bookingId: string,
        amount: number
    ): Promise<PaymentResult> => {
        try {
            // Get auto-pay settings
            const { data: settings, error: settingsError } = await supabase
                .from('auto_pay_settings')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (settingsError || !settings || !settings.enabled) {
                return {
                    success: false,
                    error: 'Auto-pay not enabled',
                };
            }

            // Check spending limit
            if (settings.spending_limit && amount > settings.spending_limit) {
                return {
                    success: false,
                    error: 'Amount exceeds spending limit',
                };
            }

            // Process payment using default method
            return await PaymentService.processPayment(
                bookingId,
                amount,
                settings.default_payment_method as PaymentMethod,
                true
            );
        } catch (error: any) {
            logger.error('Error processing auto-pay:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    },

    /**
 * Generate payment receipt (Consolidated to use ReceiptService)
 */
    generateReceipt: async (bookingId: string): Promise<PaymentReceipt | null> => {
        try {
            const { ReceiptService } = await import('./ReceiptService');
            const data = await ReceiptService.generateReceiptData(bookingId);
            if (!data) return null;

            return {
                id: data.transactionId,
                booking_id: bookingId,
                amount: data.fareBreakdown.total,
                payment_method: data.paymentMethod as any,
                transaction_id: data.transactionId,
                fare_breakdown: {
                    base_fare: data.fareBreakdown.baseFare,
                    distance_fare: data.fareBreakdown.distanceFare,
                    surge_charge: data.fareBreakdown.surgeCharge,
                    taxes: data.fareBreakdown.taxes,
                    discount: data.fareBreakdown.discount,
                    tip: data.fareBreakdown.tip || 0,
                    total: data.fareBreakdown.total
                },
                created_at: data.date,
            };
        } catch (error: any) {
            logger.error('Error generating receipt:', error);
            return null;
        }
    },

    /**
     * Process tip for driver
     */
    processTip: async (
        bookingId: string,
        driverId: string,
        amount: number,
        paymentMethod: PaymentMethod
    ): Promise<PaymentResult> => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            // Process tip payment
            const result = await PaymentService.processPayment(
                `tip_${bookingId}`,
                amount,
                paymentMethod
            );

            if (!result.success) return result;

            // Record tip
            const { error } = await supabase
                .from('driver_tips')
                .insert({
                    booking_id: bookingId,
                    driver_id: driverId,
                    passenger_id: user.id,
                    amount,
                    payment_method: paymentMethod,
                    payment_status: 'completed',
                });

            if (error) throw error;

            return {
                success: true,
                paymentId: result.paymentId,
            };
        } catch (error: any) {
            logger.error('Error processing tip:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    },
    /**
     * Get wallet transaction history
     */
    getWalletTransactions: async (
        userId: string,
        limit: number = 50,
        offset: number = 0
    ): Promise<WalletTransaction[]> => {
        try {
            const { data, error } = await supabase
                .from('wallet_transactions')
                .select('*, wallets!inner(*)')
                .eq('wallets.user_id', userId)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) throw error;
            return data || [];
        } catch (error: any) {
            logger.error('Error getting wallet transactions:', error);
            return [];
        }
    },

    /**
     * Subscribe to wallet balance updates
     */
    subscribeToBalance: (
        userId: string,
        onUpdate: (balance: WalletBalance) => void
    ) => {
        const channel = supabase
            .channel(`wallet:${userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'wallets',
                    filter: `user_id=eq.${userId}`,
                },
                async (payload) => {
                    if (payload.new) {
                        const data = payload.new as any;
                        onUpdate({
                            balance: parseFloat(data.balance),
                            currency: data.currency || 'INR',
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    },
};
