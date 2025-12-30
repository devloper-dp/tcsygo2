import { supabase } from './supabase';

export interface AutoPaySettings {
    user_id: string;
    enabled: boolean;
    default_payment_method?: string;
    daily_limit: number;
    weekly_limit: number;
    monthly_limit: number;
    require_confirmation: boolean;
    enabled_for_rides: boolean;
    enabled_for_food: boolean;
    enabled_for_shopping: boolean;
    created_at: string;
    updated_at: string;
}

export interface WalletTransaction {
    id: string;
    user_id: string;
    type: 'credit' | 'debit';
    amount: number;
    balance: number;
    description: string;
    category: 'ride' | 'topup' | 'refund' | 'penalty' | 'reward';
    reference_id?: string;
    status: 'pending' | 'completed' | 'failed';
    created_at: string;
    processed_at?: string;
}

export interface Wallet {
    id: string;
    user_id: string;
    balance: number;
    blocked_amount: number;
    total_added: number;
    total_spent: number;
    last_updated: string;
}

/**
 * Get auto-pay settings for a user
 */
export async function getAutoPaySettings(): Promise<AutoPaySettings | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('auto_pay_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return data;
}

/**
 * Update auto-pay settings
 */
export async function updateAutoPaySettings(
    settings: Partial<AutoPaySettings>
): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
        .from('auto_pay_settings')
        .upsert({
            user_id: user.id,
            ...settings,
            updated_at: new Date().toISOString(),
        });

    if (error) throw error;
}

/**
 * Get wallet for a user
 */
export async function getWallet(): Promise<Wallet> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            // Create wallet if it doesn't exist
            const { data: newWallet, error: createError } = await supabase
                .from('wallets')
                .insert({
                    user_id: user.id,
                    balance: 0,
                    blocked_amount: 0,
                    total_added: 0,
                    total_spent: 0,
                    last_updated: new Date().toISOString(),
                })
                .select()
                .single();

            if (createError) throw createError;
            return newWallet;
        }
        throw error;
    }

    return data;
}

/**
 * Add funds to wallet
 */
export async function addFundsToWallet(
    amount: number,
    paymentMethodId: string,
    description?: string
): Promise<WalletTransaction> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get current wallet
    const wallet = await getWallet();
    const newBalance = wallet.balance + amount;

    // Create transaction record
    const { data: transaction, error: transactionError } = await supabase
        .from('wallet_transactions')
        .insert({
            user_id: user.id,
            type: 'credit',
            amount,
            balance: newBalance,
            description: description || `Wallet top-up of ₹${amount}`,
            category: 'topup',
            status: 'pending',
            reference_id: paymentMethodId,
        })
        .select()
        .single();

    if (transactionError) throw transactionError;

    // Process the transaction (in real app, this would involve payment gateway)
    await processWalletTransaction(transaction.id, 'completed');

    // Update wallet balance
    await supabase
        .from('wallets')
        .update({
            balance: newBalance,
            total_added: wallet.total_added + amount,
            last_updated: new Date().toISOString(),
        })
        .eq('user_id', user.id);

    return transaction;
}

/**
 * Process wallet transaction
 */
export async function processWalletTransaction(
    transactionId: string,
    status: 'completed' | 'failed'
): Promise<void> {
    const { error } = await supabase
        .from('wallet_transactions')
        .update({
            status,
            processed_at: status === 'completed' ? new Date().toISOString() : null,
        })
        .eq('id', transactionId);

    if (error) throw error;
}

/**
 * Get wallet transactions
 */
export async function getWalletTransactions(
    limit: number = 50,
    offset: number = 0
): Promise<WalletTransaction[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
}

/**
 * Process auto-payment for a ride
 */
export async function processAutoPayment(
    amount: number,
    category: 'ride' | 'food' | 'shopping',
    referenceId: string,
    description: string
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Get auto-pay settings
        const settings = await getAutoPaySettings();

        if (!settings || !settings.enabled) {
            return { success: false, error: 'Auto-pay is disabled' };
        }

        // Check if auto-pay is enabled for this category
        const categoryEnabled =
            (category === 'ride' && settings.enabled_for_rides) ||
            (category === 'food' && settings.enabled_for_food) ||
            (category === 'shopping' && settings.enabled_for_shopping);

        if (!categoryEnabled) {
            return { success: false, error: `Auto-pay is disabled for ${category}` };
        }

        // Get wallet balance
        const wallet = await getWallet();

        if (wallet.balance < amount) {
            return { success: false, error: 'Insufficient wallet balance' };
        }

        // Process payment from wallet
        const newBalance = wallet.balance - amount;

        // Create transaction record
        const { data: transaction, error: transactionError } = await supabase
            .from('wallet_transactions')
            .insert({
                user_id: user.id,
                type: 'debit',
                amount,
                balance: newBalance,
                description,
                category,
                status: 'completed',
                reference_id: referenceId,
                processed_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (transactionError) throw transactionError;

        // Update wallet balance
        await supabase
            .from('wallets')
            .update({
                balance: newBalance,
                total_spent: wallet.total_spent + amount,
                last_updated: new Date().toISOString(),
            })
            .eq('user_id', user.id);

        return { success: true, transactionId: transaction.id };

    } catch (error: any) {
        console.error('Auto-pay error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Process auto-payments for a completed trip
 */
export async function processAutoPayments(tripId: string) {
    try {
        // 1. Fetch all confirmed bookings for this trip
        const { data: bookings, error: bookingError } = await supabase
            .from('bookings')
            .select('*, passenger:users(*)')
            .eq('trip_id', tripId)
            .eq('status', 'confirmed');

        if (bookingError) throw bookingError;
        if (!bookings || bookings.length === 0) return;

        for (const booking of bookings) {
            const amount = parseFloat(booking.total_amount);

            // Try auto-payment
            const autoPayResult = await processAutoPayment(
                amount,
                'ride',
                booking.id,
                `Payment for ride: Trip #${tripId.slice(0, 8)}`
            );

            if (autoPayResult.success) {
                // Update booking status
                await supabase
                    .from('bookings')
                    .update({
                        status: 'completed',
                        payment_status: 'paid',
                        payment_method: 'wallet',
                        transaction_id: autoPayResult.transactionId
                    })
                    .eq('id', booking.id);

                console.log(`Auto-payment processed for booking ${booking.id}`);
            } else {
                console.log(`Auto-payment failed for booking ${booking.id}:`, autoPayResult.error);
                // In a real app, you would notify the user to complete payment manually
            }
        }
    } catch (error) {
        console.error('Auto-pay processing failed:', error);
    }
}
