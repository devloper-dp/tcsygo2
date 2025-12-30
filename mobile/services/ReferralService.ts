import { supabase } from '@/lib/supabase';
import { Alert } from 'react-native';

export interface ReferralCode {
    id: string;
    user_id: string;
    code: string;
    total_referrals: number;
    total_rewards: number;
    created_at: string;
}

export interface ReferralStats {
    totalReferrals: number;
    pendingRewards: number;
    claimedRewards: number;
    referralCode: string;
}

export interface ReferralReward {
    id: string;
    referrer_id: string;
    referred_id: string;
    reward_amount: number;
    status: 'pending' | 'claimed';
    created_at: string;
}

export const ReferralService = {
    /**
     * Generate unique referral code for user
     */
    generateReferralCode: async (userId: string): Promise<{ code: string; error?: string }> => {
        try {
            // Check if user already has a referral code
            const { data: existing, error: fetchError } = await supabase
                .from('referral_codes')
                .select('code')
                .eq('user_id', userId)
                .single();

            if (existing) {
                return { code: existing.code };
            }

            // Generate unique code (6 characters: first 3 letters of name + 3 random digits)
            const { data: user } = await supabase
                .from('users')
                .select('full_name')
                .eq('id', userId)
                .single();

            const namePrefix = (user?.full_name || 'USER')
                .substring(0, 3)
                .toUpperCase()
                .replace(/[^A-Z]/g, 'X');

            const randomSuffix = Math.floor(100 + Math.random() * 900).toString();
            let code = `${namePrefix}${randomSuffix}`;

            // Ensure uniqueness
            let attempts = 0;
            while (attempts < 10) {
                const { data: duplicate } = await supabase
                    .from('referral_codes')
                    .select('id')
                    .eq('code', code)
                    .single();

                if (!duplicate) break;

                // Generate new code if duplicate
                const newSuffix = Math.floor(100 + Math.random() * 900).toString();
                code = `${namePrefix}${newSuffix}`;
                attempts++;
            }

            // Create referral code
            const { data, error } = await supabase
                .from('referral_codes')
                .insert([{
                    user_id: userId,
                    code: code,
                    total_referrals: 0,
                    total_rewards: 0
                }])
                .select()
                .single();

            if (error) throw error;

            return { code: data.code };
        } catch (error: any) {
            console.error('Error generating referral code:', error);
            return { code: '', error: error.message };
        }
    },

    /**
     * Apply referral code during signup
     */
    applyReferralCode: async (
        newUserId: string,
        referralCode: string
    ): Promise<{ success: boolean; error?: string }> => {
        try {
            // Find referrer by code
            const { data: referrer, error: fetchError } = await supabase
                .from('referral_codes')
                .select('user_id, id')
                .eq('code', referralCode.toUpperCase())
                .single();

            if (!referrer) {
                return {
                    success: false,
                    error: 'Invalid referral code'
                };
            }

            // Check if user already used a referral code
            const { data: existing } = await supabase
                .from('referral_rewards')
                .select('id')
                .eq('referred_id', newUserId)
                .single();

            if (existing) {
                return {
                    success: false,
                    error: 'You have already used a referral code'
                };
            }

            // Create referral reward (pending until first ride)
            const REFERRAL_REWARD_AMOUNT = 50; // ₹50 for both referrer and referred

            const { error: rewardError } = await supabase
                .from('referral_rewards')
                .insert([{
                    referrer_id: referrer.user_id,
                    referred_id: newUserId,
                    reward_amount: REFERRAL_REWARD_AMOUNT,
                    status: 'pending'
                }]);

            if (rewardError) throw rewardError;

            // Update referral code stats
            const { data: currentStats } = await supabase
                .from('referral_codes')
                .select('total_referrals')
                .eq('id', referrer.id)
                .single();

            await supabase
                .from('referral_codes')
                .update({
                    total_referrals: (currentStats?.total_referrals || 0) + 1
                })
                .eq('id', referrer.id);

            return { success: true };
        } catch (error: any) {
            console.error('Error applying referral code:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    /**
     * Get referral statistics for user
     */
    getReferralStats: async (userId: string): Promise<ReferralStats> => {
        try {
            // Get referral code
            const { data: codeData } = await supabase
                .from('referral_codes')
                .select('code, total_referrals, total_rewards')
                .eq('user_id', userId)
                .single();

            if (!codeData) {
                // Generate code if doesn't exist
                const { code } = await ReferralService.generateReferralCode(userId);
                return {
                    totalReferrals: 0,
                    pendingRewards: 0,
                    claimedRewards: 0,
                    referralCode: code
                };
            }

            // Get pending rewards
            const { data: pendingRewards } = await supabase
                .from('referral_rewards')
                .select('reward_amount')
                .eq('referrer_id', userId)
                .eq('status', 'pending');

            const pendingAmount = pendingRewards?.reduce(
                (sum, r) => sum + parseFloat(r.reward_amount.toString()),
                0
            ) || 0;

            // Get claimed rewards
            const { data: claimedRewards } = await supabase
                .from('referral_rewards')
                .select('reward_amount')
                .eq('referrer_id', userId)
                .eq('status', 'claimed');

            const claimedAmount = claimedRewards?.reduce(
                (sum, r) => sum + parseFloat(r.reward_amount.toString()),
                0
            ) || 0;

            return {
                totalReferrals: codeData.total_referrals || 0,
                pendingRewards: pendingAmount,
                claimedRewards: claimedAmount,
                referralCode: codeData.code
            };
        } catch (error) {
            console.error('Error fetching referral stats:', error);
            return {
                totalReferrals: 0,
                pendingRewards: 0,
                claimedRewards: 0,
                referralCode: ''
            };
        }
    },

    /**
     * Claim referral reward (after referred user completes first ride)
     */
    claimReferralReward: async (
        referralRewardId: string
    ): Promise<{ success: boolean; amount?: number; error?: string }> => {
        try {
            // Get reward details
            const { data: reward, error: fetchError } = await supabase
                .from('referral_rewards')
                .select('*')
                .eq('id', referralRewardId)
                .single();

            if (!reward) {
                return {
                    success: false,
                    error: 'Reward not found'
                };
            }

            if (reward.status === 'claimed') {
                return {
                    success: false,
                    error: 'Reward already claimed'
                };
            }

            // Add reward to wallet
            const { PaymentService } = await import('./PaymentService');
            const walletResult = await PaymentService.addMoneyToWallet(
                reward.referrer_id,
                parseFloat(reward.reward_amount.toString()),
                `referral_${referralRewardId}`,
                'Referral reward'
            );

            if (!walletResult) {
                return {
                    success: false,
                    error: 'Failed to add reward to wallet'
                };
            }

            // Mark reward as claimed
            await supabase
                .from('referral_rewards')
                .update({ status: 'claimed' })
                .eq('id', referralRewardId);

            // Update total rewards in referral code
            const { data: currentCode } = await supabase
                .from('referral_codes')
                .select('total_rewards')
                .eq('user_id', reward.referrer_id)
                .single();

            await supabase
                .from('referral_codes')
                .update({
                    total_rewards: (currentCode?.total_rewards || 0) + parseFloat(reward.reward_amount.toString())
                })
                .eq('user_id', reward.referrer_id);

            return {
                success: true,
                amount: parseFloat(reward.reward_amount.toString())
            };
        } catch (error: any) {
            console.error('Error claiming referral reward:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    /**
     * Get pending referral rewards for user
     */
    getPendingRewards: async (userId: string): Promise<ReferralReward[]> => {
        try {
            const { data, error } = await supabase
                .from('referral_rewards')
                .select(`
                    *,
                    referred:users!referred_id(full_name)
                `)
                .eq('referrer_id', userId)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Error fetching pending rewards:', error);
            return [];
        }
    },

    /**
     * Activate referral reward after referred user completes first ride
     */
    activateReferralReward: async (referredUserId: string): Promise<void> => {
        try {
            // Find pending reward for this user
            const { data: reward } = await supabase
                .from('referral_rewards')
                .select('id, referrer_id, referred_id, reward_amount')
                .eq('referred_id', referredUserId)
                .eq('status', 'pending')
                .single();

            if (!reward) return;

            // Auto-claim reward for referrer
            await ReferralService.claimReferralReward(reward.id);

            // Also give reward to referred user
            const { PaymentService } = await import('./PaymentService');
            await PaymentService.addMoneyToWallet(
                referredUserId,
                parseFloat(reward.reward_amount.toString()),
                `welcome_${reward.id}`,
                'Welcome bonus from referral'
            );
        } catch (error) {
            console.error('Error activating referral reward:', error);
        }
    },

    /**
     * Share referral code
     */
    shareReferralCode: async (code: string, userName: string): Promise<void> => {
        try {
            const { Share } = await import('react-native');
            await Share.share({
                message: `Join TCSYGO using my referral code ${code} and get ₹50 bonus on your first ride! Download now: https://tcsygo.app/download`,
                title: `${userName} invited you to TCSYGO`
            });
        } catch (error) {
            console.error('Error sharing referral code:', error);
        }
    },
};
