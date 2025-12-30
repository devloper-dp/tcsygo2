import { supabase } from './supabase';

export interface PromoCode {
    id: string;
    code: string;
    description?: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    max_discount?: number;
    min_amount: number;
    max_uses?: number;
    current_uses: number;
    per_user_limit: number;
    valid_from: string;
    valid_until: string;
    is_active: boolean;
    applicable_vehicle_types: string[];
    created_at: string;
}

export interface PromoCodeUse {
    id: string;
    promo_code_id: string;
    user_id: string;
    booking_id?: string;
    ride_request_id?: string;
    discount_amount: number;
    original_amount: number;
    final_amount: number;
    created_at: string;
}

/**
 * Get all active promo codes
 */
export async function getActivePromoCodes(): Promise<PromoCode[]> {
    const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('is_active', true)
        .lte('valid_from', new Date().toISOString())
        .gte('valid_until', new Date().toISOString())
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Failed to fetch promo codes:', error);
        return [];
    }

    return data || [];
}

/**
 * Validate and apply promo code
 */
export async function applyPromoCode(
    code: string,
    amount: number,
    vehicleType?: string
): Promise<{
    success: boolean;
    promo?: PromoCode;
    discount?: number;
    finalAmount?: number;
    message: string;
}> {
    const { data, error } = await supabase.rpc('apply_promo_code', {
        p_code: code.toUpperCase(),
        p_amount: amount,
    });

    if (error) {
        console.error('Failed to apply promo code:', error);
        return {
            success: false,
            message: 'Failed to apply promo code',
        };
    }

    if (!data.success) {
        return {
            success: false,
            message: data.message || 'Invalid promo code',
        };
    }

    return {
        success: true,
        discount: data.discount,
        finalAmount: data.final_amount,
        message: data.message || 'Promo code applied successfully',
    };
}

/**
 * Get promo code by code
 */
export async function getPromoCodeByCode(code: string): Promise<PromoCode | null> {
    const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .lte('valid_from', new Date().toISOString())
        .gte('valid_until', new Date().toISOString())
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        console.error('Failed to fetch promo code:', error);
        return null;
    }

    return data;
}

/**
 * Check if user can use promo code
 */
export async function canUsePromoCode(
    promoCodeId: string,
    userId: string
): Promise<boolean> {
    const { data: promo, error: promoError } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('id', promoCodeId)
        .single();

    if (promoError || !promo) return false;

    // Check if promo code has reached max uses
    if (promo.max_uses && promo.current_uses >= promo.max_uses) {
        return false;
    }

    // Check user's usage count
    const { data: uses, error: usesError } = await supabase
        .from('promo_code_uses')
        .select('id')
        .eq('promo_code_id', promoCodeId)
        .eq('user_id', userId);

    if (usesError) return false;

    if (uses && uses.length >= promo.per_user_limit) {
        return false;
    }

    return true;
}

/**
 * Record promo code usage
 */
export async function recordPromoCodeUse(
    promoCodeId: string,
    discountAmount: number,
    originalAmount: number,
    finalAmount: number,
    bookingId?: string,
    rideRequestId?: string
): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase.from('promo_code_uses').insert({
        promo_code_id: promoCodeId,
        user_id: user.id,
        booking_id: bookingId,
        ride_request_id: rideRequestId,
        discount_amount: discountAmount,
        original_amount: originalAmount,
        final_amount: finalAmount,
    });

    if (error) {
        console.error('Failed to record promo use:', error);
        return false;
    }

    return true;
}

/**
 * Get user's promo code usage history
 */
export async function getUserPromoHistory(): Promise<PromoCodeUse[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('promo_code_uses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Failed to fetch promo history:', error);
        return [];
    }

    return data || [];
}

/**
 * Calculate discount amount
 */
export function calculateDiscount(
    promo: PromoCode,
    amount: number
): number {
    let discount = 0;

    if (promo.discount_type === 'percentage') {
        discount = (amount * promo.discount_value) / 100;
        if (promo.max_discount && discount > promo.max_discount) {
            discount = promo.max_discount;
        }
    } else {
        discount = promo.discount_value;
    }

    return Math.min(discount, amount); // Discount can't exceed amount
}

/**
 * Validate promo code eligibility
 */
export async function validatePromoCode(
    code: string,
    amount: number,
    vehicleType?: string
): Promise<{
    valid: boolean;
    promo?: PromoCode;
    discount?: number;
    message: string;
}> {
    const promo = await getPromoCodeByCode(code);

    if (!promo) {
        return {
            valid: false,
            message: 'Invalid or expired promo code',
        };
    }

    // Check minimum amount
    if (amount < promo.min_amount) {
        return {
            valid: false,
            message: `Minimum order amount is ₹${promo.min_amount}`,
        };
    }

    // Check vehicle type
    if (vehicleType && !promo.applicable_vehicle_types.includes(vehicleType)) {
        return {
            valid: false,
            message: 'Promo code not applicable for this vehicle type',
        };
    }

    // Check user eligibility
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const canUse = await canUsePromoCode(promo.id, user.id);
        if (!canUse) {
            return {
                valid: false,
                message: 'You have already used this promo code',
            };
        }
    }

    const discount = calculateDiscount(promo, amount);

    return {
        valid: true,
        promo,
        discount,
        message: `You saved ₹${discount.toFixed(2)}!`,
    };
}

/**
 * Get recommended promo codes for user
 */
export async function getRecommendedPromoCodes(
    amount: number,
    vehicleType?: string
): Promise<PromoCode[]> {
    const allPromos = await getActivePromoCodes();

    return allPromos.filter((promo) => {
        // Filter by minimum amount
        if (amount < promo.min_amount) return false;

        // Filter by vehicle type
        if (vehicleType && !promo.applicable_vehicle_types.includes(vehicleType)) {
            return false;
        }

        // Filter by max uses
        if (promo.max_uses && promo.current_uses >= promo.max_uses) {
            return false;
        }

        return true;
    });
}
