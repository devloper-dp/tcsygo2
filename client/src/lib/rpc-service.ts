import { supabase } from './supabase';
import type {
    ApplyPromoCodeParams,
    ApplyPromoCodeResult,
    CheckPromoCodeParams,
    CheckPromoCodeResult,
    GetWalletBalanceParams,
    GetWalletBalanceResult,
    TransferWalletFundsParams,
    TransferWalletFundsResult,
    CalculateTripPriceParams,
    CalculateTripPriceResult,
    GetNearbyDriversParams,
    GetNearbyDriversResult,
    GetDriverStatisticsParams,
    GetDriverStatisticsResult,
    GetUserStatisticsParams,
    GetUserStatisticsResult,
    AddMoneyToWalletParams,
    AddMoneyToWalletResult,
} from '@/types/supabase-types';
import type {
    FindNearbyDriversParams,
    FindNearbyDriversResult,
    MatchRideRequestParams,
    MatchRideRequestResult,
} from '@/types/additional-types';

/**
 * RPC Service
 * Wrappers for Supabase RPC (Remote Procedure Call) functions
 * These are database functions defined in SQL
 */

class RPCService {
    /**
     * Apply a promo code to a booking
     */
    async applyPromoCode(
        params: ApplyPromoCodeParams
    ): Promise<{ data: ApplyPromoCodeResult | null; error: any }> {
        try {
            const { data, error } = await supabase.rpc('apply_promo_code', {
                p_code: params.code,
                p_booking_id: params.bookingId,
                p_amount: params.amount,
            });

            if (error) {
                console.error('Error applying promo code:', error);
                return { data: null, error };
            }

            return { data, error: null };
        } catch (error) {
            console.error('Exception applying promo code:', error);
            return { data: null, error };
        }
    }

    /**
     * Check if a promo code is valid
     */
    async checkPromoCode(
        params: CheckPromoCodeParams
    ): Promise<{ data: CheckPromoCodeResult | null; error: any }> {
        try {
            const { data, error } = await supabase.rpc('check_promo_code', {
                p_code: params.code,
                p_amount: params.amount,
            });

            if (error) {
                console.error('Error checking promo code:', error);
                return { data: null, error };
            }

            return { data, error: null };
        } catch (error) {
            console.error('Exception checking promo code:', error);
            return { data: null, error };
        }
    }

    /**
     * Get wallet balance for a user
     */
    async getWalletBalance(
        params: GetWalletBalanceParams
    ): Promise<{ data: GetWalletBalanceResult | null; error: any }> {
        try {
            const { data, error } = await supabase.rpc('get_wallet_balance', {
                p_user_id: params.userId,
            });

            if (error) {
                console.error('Error getting wallet balance:', error);
                return { data: null, error };
            }

            return { data: { balance: data || 0 }, error: null };
        } catch (error) {
            console.error('Exception getting wallet balance:', error);
            return { data: null, error };
        }
    }

    /**
     * Transfer funds between wallets
     */
    async transferWalletFunds(
        params: TransferWalletFundsParams
    ): Promise<{ data: TransferWalletFundsResult | null; error: any }> {
        try {
            const { data, error } = await supabase.rpc('transfer_wallet_funds', {
                p_from_user_id: params.fromUserId,
                p_to_user_id: params.toUserId,
                p_amount: params.amount,
                p_description: params.description,
            });

            if (error) {
                console.error('Error transferring wallet funds:', error);
                return { data: null, error };
            }

            return { data, error: null };
        } catch (error) {
            console.error('Exception transferring wallet funds:', error);
            return { data: null, error };
        }
    }

    /**
     * Calculate trip price based on distance and duration
     */
    async calculateTripPrice(
        params: CalculateTripPriceParams
    ): Promise<{ data: CalculateTripPriceResult | null; error: any }> {
        try {
            const { data, error } = await supabase.rpc('calculate_trip_price', {
                p_distance: params.distance,
                p_duration: params.duration,
                p_surge_multiplier: params.surgeMultiplier || 1.0,
            });

            if (error) {
                console.error('Error calculating trip price:', error);
                return { data: null, error };
            }

            return { data, error: null };
        } catch (error) {
            console.error('Exception calculating trip price:', error);
            return { data: null, error };
        }
    }

    /**
     * Get nearby drivers within a radius
     */
    async getNearbyDrivers(
        params: GetNearbyDriversParams
    ): Promise<{ data: GetNearbyDriversResult | null; error: any }> {
        try {
            const { data, error } = await supabase.rpc('get_nearby_drivers', {
                p_lat: params.lat,
                p_lng: params.lng,
                p_radius: params.radius,
            });

            if (error) {
                console.error('Error getting nearby drivers:', error);
                return { data: null, error };
            }

            return { data: { drivers: data || [] }, error: null };
        } catch (error) {
            console.error('Exception getting nearby drivers:', error);
            return { data: null, error };
        }
    }

    /**
     * Get driver statistics
     */
    async getDriverStatistics(
        params: GetDriverStatisticsParams
    ): Promise<{ data: GetDriverStatisticsResult | null; error: any }> {
        try {
            const { data, error } = await supabase.rpc('get_driver_statistics', {
                p_driver_id: params.driverId,
            });

            if (error) {
                console.error('Error getting driver statistics:', error);
                return { data: null, error };
            }

            return { data, error: null };
        } catch (error) {
            console.error('Exception getting driver statistics:', error);
            return { data: null, error };
        }
    }

    /**
     * Get user statistics
     */
    async getUserStatistics(
        params: GetUserStatisticsParams
    ): Promise<{ data: GetUserStatisticsResult | null; error: any }> {
        try {
            const { data, error } = await supabase.rpc('get_user_statistics', {
                p_user_id: params.userId,
            });

            if (error) {
                console.error('Error getting user statistics:', error);
                return { data: null, error };
            }

            return { data, error: null };
        } catch (error) {
            console.error('Exception getting user statistics:', error);
            return { data: null, error };
        }
    }

    /**
     * Find nearby available drivers
     */
    async findNearbyDrivers(
        params: FindNearbyDriversParams
    ): Promise<{ data: FindNearbyDriversResult[] | null; error: any }> {
        try {
            const { data, error } = await supabase.rpc('find_nearby_drivers', {
                p_lat: params.lat,
                p_lng: params.lng,
                p_radius: params.radius || 5000,
                p_vehicle_type: params.vehicleType || null,
            });

            if (error) {
                console.error('Error finding nearby drivers:', error);
                return { data: null, error };
            }

            return { data: data || [], error: null };
        } catch (error) {
            console.error('Exception finding nearby drivers:', error);
            return { data: null, error };
        }
    }

    /**
     * Match ride request with driver
     */
    async matchRideRequest(
        params: MatchRideRequestParams
    ): Promise<{ data: MatchRideRequestResult | null; error: any }> {
        try {
            const { data, error } = await supabase.rpc('match_ride_request', {
                p_request_id: params.requestId,
                p_driver_id: params.driverId,
            });

            if (error) {
                console.error('Error matching ride request:', error);
                return { data: null, error };
            }

            return { data, error: null };
        } catch (error) {
            console.error('Exception matching ride request:', error);
            return { data: null, error };
        }
    }

    /**
     * Add money to wallet
     */
    async addMoneyToWallet(
        params: AddMoneyToWalletParams
    ): Promise<{ data: AddMoneyToWalletResult | null; error: any }> {
        try {
            const { data, error } = await supabase.rpc('add_money_to_wallet', {
                p_amount: params.amount,
                p_payment_id: params.paymentId,
            });

            if (error) {
                console.error('Error adding money to wallet:', error);
                return { data: null, error };
            }

            return { data, error: null };
        } catch (error) {
            console.error('Exception adding money to wallet:', error);
            return { data: null, error };
        }
    }

    /**
     * Get or create referral code for user
     */
    async getOrCreateReferralCode(): Promise<{
        data: string | null;
        error: any;
    }> {
        try {
            const { data, error } = await supabase.rpc('get_or_create_referral_code');

            if (error) {
                console.error('Error getting/creating referral code:', error);
                return { data: null, error };
            }

            return { data, error: null };
        } catch (error) {
            console.error('Exception getting/creating referral code:', error);
            return { data: null, error };
        }
    }

    /**
     * Check promo code validity without applying it
     */
    async checkPromoCodeValidity(
        code: string,
        amount: number
    ): Promise<{ data: CheckPromoCodeResult | null; error: any }> {
        try {
            const { data, error } = await supabase.rpc('apply_promo_code', {
                p_code: code,
                p_amount: amount,
            });

            if (error) {
                console.error('Error checking promo code validity:', error);
                return { data: null, error };
            }

            // Transform the result to match CheckPromoCodeResult
            const result: CheckPromoCodeResult = {
                valid: data?.success || false,
                discountAmount: data?.discount || 0,
                finalAmount: data?.final_amount || amount,
                message: data?.message || '',
            };

            return { data: result, error: null };
        } catch (error) {
            console.error('Exception checking promo code validity:', error);
            return { data: null, error };
        }
    }
}

// Export singleton instance
export const rpc = new RPCService();

// Export individual functions for convenience
export const {
    applyPromoCode,
    checkPromoCode,
    getWalletBalance,
    transferWalletFunds,
    calculateTripPrice,
    getNearbyDrivers,
    getDriverStatistics,
    getUserStatistics,
    findNearbyDrivers,
    matchRideRequest,
    addMoneyToWallet,
    getOrCreateReferralCode,
    checkPromoCodeValidity,
} = rpc;

