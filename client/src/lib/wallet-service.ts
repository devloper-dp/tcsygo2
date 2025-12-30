import { supabase } from './supabase';

export interface Wallet {
    id: string;
    user_id: string;
    balance: number;
    currency: string;
    created_at: string;
    updated_at: string;
}

export interface WalletTransaction {
    id: string;
    wallet_id: string;
    type: 'credit' | 'debit';
    amount: number;
    description: string;
    reference_id?: string;
    reference_type?: 'booking' | 'refund' | 'topup' | 'tip' | 'payout';
    status: 'pending' | 'completed' | 'failed';
    razorpay_payment_id?: string;
    created_at: string;
}

/**
 * Get user's wallet
 */
export async function getWallet(): Promise<Wallet | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (error) {
        // Create wallet if it doesn't exist
        if (error.code === 'PGRST116') {
            return await createWallet();
        }
        console.error('Failed to fetch wallet:', error);
        return null;
    }

    return data;
}

/**
 * Create wallet for user
 */
async function createWallet(): Promise<Wallet> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
        .from('wallets')
        .insert({
            user_id: user.id,
            balance: 0,
            currency: 'INR',
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Get wallet transactions
 */
export async function getWalletTransactions(
    limit: number = 50,
    offset: number = 0
): Promise<WalletTransaction[]> {
    const wallet = await getWallet();
    if (!wallet) return [];

    const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('wallet_id', wallet.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) {
        console.error('Failed to fetch transactions:', error);
        return [];
    }

    return data || [];
}

/**
 * Add money to wallet via Razorpay
 */
export async function addMoneyToWallet(
    amount: number,
    paymentId: string
): Promise<{ success: boolean; transaction_id?: string; message: string }> {
    const { data, error } = await supabase.rpc('add_money_to_wallet', {
        p_amount: amount,
        p_payment_id: paymentId,
    });

    if (error) {
        console.error('Failed to add money:', error);
        return { success: false, message: error.message };
    }

    return data;
}

/**
 * Deduct money from wallet for booking
 */
export async function deductFromWallet(
    amount: number,
    bookingId: string,
    description: string = 'Ride payment'
): Promise<boolean> {
    const wallet = await getWallet();
    if (!wallet) return false;

    if (wallet.balance < amount) {
        return false; // Insufficient balance
    }

    const { error } = await supabase.from('wallet_transactions').insert({
        wallet_id: wallet.id,
        type: 'debit',
        amount,
        description,
        reference_id: bookingId,
        reference_type: 'booking',
        status: 'completed',
    });

    if (error) {
        console.error('Failed to deduct from wallet:', error);
        return false;
    }

    return true;
}

/**
 * Refund to wallet
 */
export async function refundToWallet(
    amount: number,
    bookingId: string,
    description: string = 'Ride refund'
): Promise<boolean> {
    const wallet = await getWallet();
    if (!wallet) return false;

    const { error } = await supabase.from('wallet_transactions').insert({
        wallet_id: wallet.id,
        type: 'credit',
        amount,
        description,
        reference_id: bookingId,
        reference_type: 'refund',
        status: 'completed',
    });

    if (error) {
        console.error('Failed to refund to wallet:', error);
        return false;
    }

    return true;
}

/**
 * Get wallet balance
 */
export async function getWalletBalance(): Promise<number> {
    const wallet = await getWallet();
    return wallet?.balance || 0;
}

/**
 * Subscribe to wallet balance updates
 */
export function subscribeToWalletUpdates(callback: (wallet: Wallet) => void) {
    const channel = supabase
        .channel('wallet_updates')
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'wallets',
            },
            (payload) => {
                callback(payload.new as Wallet);
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}

/**
 * Create Razorpay order for wallet topup
 */
/**
 * Create Razorpay order for wallet topup via Edge Function
 */
export async function createWalletTopupOrder(amount: number): Promise<{
    orderId: string;
    amount: number;
    currency: string;
    key: string;
}> {
    const { data, error } = await supabase.functions.invoke('create-payment-order', {
        body: {
            amount: amount, // Function expects amount in rupees
            currency: 'INR',
            notes: {
                purpose: 'wallet_topup',
            }
        }
    });

    if (error) {
        console.error('Order creation error:', error);
        throw new Error('Failed to create payment order');
    }

    return {
        orderId: data.orderId,
        amount: data.amount,
        currency: data.currency,
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
    };
}

/**
 * Verify Razorpay payment and add to wallet via Edge Function
 */
export async function verifyAndAddToWallet(
    orderId: string,
    paymentId: string,
    signature: string,
    amount: number
): Promise<boolean> {
    try {
        const { data, error } = await supabase.functions.invoke('verify-wallet-payment', {
            body: {
                razorpayOrderId: orderId,
                razorpayPaymentId: paymentId,
                razorpaySignature: signature,
                amount: amount // Pass amount for validation/record keeping
            }
        });

        if (error) {
            console.error('Verification error:', error);
            throw error;
        }

        return data.success;
    } catch (error) {
        console.error('Verification exception:', error);
        return false;
    }
}
