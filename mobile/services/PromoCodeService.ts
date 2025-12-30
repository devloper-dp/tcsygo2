import { supabase } from '@/lib/supabase';
import { Alert } from 'react-native';

export interface PromoCode {
    id: string;
    code: string;
    description: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    min_order_value: number;
    max_discount: number;
    valid_from: string;
    valid_until: string;
    usage_limit: number;
    usage_count: number;
    is_active: boolean;
    user_specific?: boolean;
    applicable_vehicle_types?: string[];
}

export interface PromoCodeValidation {
    valid: boolean;
    discount: number;
    message: string;
    promoCode?: PromoCode;
}

export const PromoCodeService = {
    /**
     * Validate and apply promo code
     */
    validatePromoCode: async (
        code: string,
        userId: string,
        orderAmount: number,
        vehicleType?: string
    ): Promise<PromoCodeValidation> => {
        try {
            // Fetch promo code from database
            const { data: promoCode, error } = await supabase
                .from('promo_codes')
                .select('*')
                .eq('code', code.toUpperCase())
                .eq('is_active', true)
                .single();

            if (error || !promoCode) {
                return {
                    valid: false,
                    discount: 0,
                    message: 'Invalid promo code',
                };
            }

            // Check if promo code is expired
            const now = new Date();
            const validFrom = new Date(promoCode.valid_from);
            const validUntil = new Date(promoCode.valid_until);

            if (now < validFrom) {
                return {
                    valid: false,
                    discount: 0,
                    message: 'Promo code not yet active',
                };
            }

            if (now > validUntil) {
                return {
                    valid: false,
                    discount: 0,
                    message: 'Promo code has expired',
                };
            }

            // Check usage limit
            if (promoCode.usage_limit && promoCode.usage_count >= promoCode.usage_limit) {
                return {
                    valid: false,
                    discount: 0,
                    message: 'Promo code usage limit reached',
                };
            }

            // Check minimum order value
            if (orderAmount < promoCode.min_order_value) {
                return {
                    valid: false,
                    discount: 0,
                    message: `Minimum order value of ₹${promoCode.min_order_value} required`,
                };
            }

            // Check vehicle type applicability
            if (promoCode.applicable_vehicle_types && vehicleType) {
                const applicableTypes = promoCode.applicable_vehicle_types;
                if (!applicableTypes.includes(vehicleType)) {
                    return {
                        valid: false,
                        discount: 0,
                        message: `Promo code not applicable for ${vehicleType}`,
                    };
                }
            }

            // Check if user has already used this promo code
            if (promoCode.user_specific) {
                const { data: usage, error: usageError } = await supabase
                    .from('promo_code_usage')
                    .select('*')
                    .eq('promo_code_id', promoCode.id)
                    .eq('user_id', userId)
                    .single();

                if (usage && !usageError) {
                    return {
                        valid: false,
                        discount: 0,
                        message: 'You have already used this promo code',
                    };
                }
            }

            // Calculate discount
            let discount = 0;
            if (promoCode.discount_type === 'percentage') {
                discount = (orderAmount * promoCode.discount_value) / 100;
                if (promoCode.max_discount && discount > promoCode.max_discount) {
                    discount = promoCode.max_discount;
                }
            } else {
                discount = promoCode.discount_value;
            }

            // Ensure discount doesn't exceed order amount
            discount = Math.min(discount, orderAmount);

            return {
                valid: true,
                discount: Math.round(discount),
                message: `Promo code applied! You saved ₹${Math.round(discount)}`,
                promoCode,
            };
        } catch (error: any) {
            console.error('Error validating promo code:', error);
            return {
                valid: false,
                discount: 0,
                message: 'Error validating promo code',
            };
        }
    },

    /**
     * Apply promo code to booking
     */
    applyPromoCode: async (
        promoCodeId: string,
        userId: string,
        bookingId: string,
        discountAmount: number
    ): Promise<boolean> => {
        try {
            // Record promo code usage
            const { error: usageError } = await supabase
                .from('promo_code_usage')
                .insert({
                    promo_code_id: promoCodeId,
                    user_id: userId,
                    booking_id: bookingId,
                    discount_amount: discountAmount,
                });

            if (usageError) throw usageError;

            // Update promo code usage count
            const { error: updateError } = await supabase.rpc('increment_promo_usage', {
                promo_id: promoCodeId,
            });

            if (updateError) {
                console.error('Error updating promo code usage count:', updateError);
            }

            // Update booking with discount
            const { error: bookingError } = await supabase
                .from('bookings')
                .update({
                    promo_code_id: promoCodeId,
                    discount_amount: discountAmount,
                })
                .eq('id', bookingId);

            if (bookingError) throw bookingError;

            return true;
        } catch (error: any) {
            console.error('Error applying promo code:', error);
            return false;
        }
    },

    /**
     * Get available promo codes for user
     */
    getAvailablePromoCodes: async (userId: string): Promise<PromoCode[]> => {
        try {
            const now = new Date().toISOString();

            const { data, error } = await supabase
                .from('promo_codes')
                .select('*')
                .eq('is_active', true)
                .lte('valid_from', now)
                .gte('valid_until', now)
                .order('discount_value', { ascending: false });

            if (error) throw error;

            // Filter out user-specific codes that have been used
            const availableCodes: PromoCode[] = [];
            for (const code of data || []) {
                if (code.user_specific) {
                    const { data: usage } = await supabase
                        .from('promo_code_usage')
                        .select('*')
                        .eq('promo_code_id', code.id)
                        .eq('user_id', userId)
                        .single();

                    if (!usage) {
                        availableCodes.push(code);
                    }
                } else {
                    availableCodes.push(code);
                }
            }

            return availableCodes;
        } catch (error: any) {
            console.error('Error fetching available promo codes:', error);
            return [];
        }
    },

    /**
     * Get user's promo code usage history
     */
    getPromoCodeUsageHistory: async (userId: string): Promise<any[]> => {
        try {
            const { data, error } = await supabase
                .from('promo_code_usage')
                .select('*, promo_code:promo_codes(*), booking:bookings(*)')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error: any) {
            console.error('Error fetching promo code usage history:', error);
            return [];
        }
    },

    /**
     * Create referral promo code for user
     */
    createReferralCode: async (userId: string, userName: string): Promise<string | null> => {
        try {
            // Generate unique referral code
            const referralCode = `REF${userName.substring(0, 3).toUpperCase()}${Math.random()
                .toString(36)
                .substring(2, 8)
                .toUpperCase()}`;

            // Check if user already has a referral code
            const { data: existing } = await supabase
                .from('referral_codes')
                .select('code')
                .eq('user_id', userId)
                .single();

            if (existing) {
                return existing.code;
            }

            // Create referral code
            const { data, error } = await supabase
                .from('referral_codes')
                .insert({
                    user_id: userId,
                    code: referralCode,
                    reward_amount: 50, // ₹50 reward
                    max_uses: 10,
                })
                .select()
                .single();

            if (error) throw error;
            return data.code;
        } catch (error: any) {
            console.error('Error creating referral code:', error);
            return null;
        }
    },

    /**
     * Apply referral code for new user
     */
    applyReferralCode: async (
        referralCode: string,
        newUserId: string
    ): Promise<{ success: boolean; reward: number }> => {
        try {
            // Fetch referral code
            const { data: referral, error } = await supabase
                .from('referral_codes')
                .select('*')
                .eq('code', referralCode.toUpperCase())
                .single();

            if (error || !referral) {
                return { success: false, reward: 0 };
            }

            // Check if max uses reached
            if (referral.uses_count >= referral.max_uses) {
                return { success: false, reward: 0 };
            }

            // Check if user already used a referral code
            const { data: existingUse } = await supabase
                .from('referral_usage')
                .select('*')
                .eq('referred_user_id', newUserId)
                .single();

            if (existingUse) {
                return { success: false, reward: 0 };
            }

            // Record referral usage
            const { error: usageError } = await supabase.from('referral_usage').insert({
                referral_code_id: referral.id,
                referrer_user_id: referral.user_id,
                referred_user_id: newUserId,
                reward_amount: referral.reward_amount,
            });

            if (usageError) throw usageError;

            // Update referral code usage count
            const { error: updateError } = await supabase
                .from('referral_codes')
                .update({ uses_count: referral.uses_count + 1 })
                .eq('id', referral.id);

            if (updateError) throw updateError;

            // Add reward to both users' wallets
            await PromoCodeService.addReferralReward(referral.user_id, referral.reward_amount);
            await PromoCodeService.addReferralReward(newUserId, referral.reward_amount);

            return { success: true, reward: referral.reward_amount };
        } catch (error: any) {
            console.error('Error applying referral code:', error);
            return { success: false, reward: 0 };
        }
    },

    /**
     * Add referral reward to wallet
     */
    addReferralReward: async (userId: string, amount: number): Promise<void> => {
        try {
            // Get or create wallet
            const { data: wallet, error: walletError } = await supabase
                .from('wallets')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (walletError && walletError.code === 'PGRST116') {
                // Create wallet
                await supabase.from('wallets').insert({
                    user_id: userId,
                    balance: amount,
                    currency: 'INR',
                });
            } else if (wallet) {
                // Update wallet
                await supabase
                    .from('wallets')
                    .update({ balance: wallet.balance + amount })
                    .eq('id', wallet.id);
            }

            // Record transaction
            if (wallet) {
                await supabase.from('wallet_transactions').insert({
                    wallet_id: wallet.id,
                    type: 'credit',
                    amount,
                    description: 'Referral reward',
                    status: 'completed',
                });
            }
        } catch (error: any) {
            console.error('Error adding referral reward:', error);
        }
    },
};
