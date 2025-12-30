import { supabase } from '@/lib/supabase';
import { logger } from './LoggerService';
import { Alert } from 'react-native';
import * as SMS from 'expo-sms';
import * as Sharing from 'expo-sharing';

export interface SplitFareRequest {
    id: string;
    booking_id: string;
    initiator_user_id: string;
    total_amount: number;
    split_type: 'equal' | 'custom';
    status: 'pending' | 'accepted' | 'rejected' | 'completed';
    created_at: string;
}

export interface SplitFareParticipant {
    id: string;
    split_fare_id: string;
    user_id?: string;
    email?: string;
    phone?: string;
    amount: number;
    payment_status: 'pending' | 'paid' | 'failed';
    paid_at?: string;
}

export interface RideShareInvite {
    id: string;
    trip_id: string;
    inviter_user_id: string;
    invitee_email?: string;
    invitee_phone?: string;
    status: 'pending' | 'accepted' | 'rejected';
    created_at: string;
}

export const SocialService = {
    /**
     * Create split fare request
     */
    createSplitFareRequest: async (
        bookingId: string,
        userId: string,
        totalAmount: number,
        splitType: 'equal' | 'custom',
        participants: Array<{
            email?: string;
            phone?: string;
            amount?: number;
        }>
    ): Promise<string | null> => {
        try {
            // Create split fare request
            const { data: splitFare, error: splitError } = await supabase
                .from('split_fare_requests')
                .insert({
                    booking_id: bookingId,
                    initiator_user_id: userId,
                    total_amount: totalAmount,
                    split_type: splitType,
                    status: 'pending',
                })
                .select()
                .single();

            if (splitError) throw splitError;

            // Calculate amounts for equal split
            let participantAmount = 0;
            if (splitType === 'equal') {
                participantAmount = Math.round(totalAmount / (participants.length + 1));
            }

            // Add initiator as participant
            await supabase.from('split_fare_participants').insert({
                split_fare_id: splitFare.id,
                user_id: userId,
                amount: participantAmount,
                payment_status: 'pending',
            });

            // Add other participants
            for (const participant of participants) {
                const amount = splitType === 'custom' ? participant.amount : participantAmount;

                await supabase.from('split_fare_participants').insert({
                    split_fare_id: splitFare.id,
                    email: participant.email,
                    phone: participant.phone,
                    amount,
                    payment_status: 'pending',
                });

                // Send invitation
                await SocialService.sendSplitFareInvitation(
                    splitFare.id,
                    participant.email,
                    participant.phone,
                    amount || 0
                );
            }

            return splitFare.id;
        } catch (error: any) {
            console.error('Error creating split fare request:', error);
            return null;
        }
    },

    /**
     * Send split fare invitation
     */
    sendSplitFareInvitation: async (
        splitFareId: string,
        email?: string,
        phone?: string,
        amount?: number
    ): Promise<void> => {
        try {
            // Get split fare details
            const { data: splitFare } = await supabase
                .from('split_fare_requests')
                .select('*, booking:bookings(*), initiator:users!initiator_user_id(*)')
                .eq('id', splitFareId)
                .single();

            if (!splitFare) return;

            const initiatorName = splitFare.initiator?.full_name || 'Someone';
            const inviteLink = `https://tcsygo.com/split-fare/${splitFareId}`;
            const message = `${initiatorName} has invited you to split a ride fare of ₹${amount}. Click here to pay: ${inviteLink}`;

            // Send via SMS if phone provided
            if (phone) {
                const isAvailable = await SMS.isAvailableAsync();
                if (isAvailable) {
                    await SMS.sendSMSAsync([phone], message);
                }
            }

            // Send via email if email provided
            if (email) {
                try {
                    const { supabase } = await import('@/lib/supabase');
                    await supabase.functions.invoke('send-split-fare-email', {
                        body: {
                            splitFareId,
                            recipientEmail: email,
                            initiatorName,
                            amount,
                            inviteLink,
                        },
                    });
                    console.log('Email invitation sent to:', email);
                } catch (error) {
                    console.error('Failed to send email invitation:', error);
                }
            }
        } catch (error: any) {
            console.error('Error sending split fare invitation:', error);
        }
    },

    /**
     * Get split fare requests for user
     */
    getSplitFareRequests: async (userId: string): Promise<SplitFareRequest[]> => {
        try {
            const { data, error } = await supabase
                .from('split_fare_requests')
                .select('*, participants:split_fare_participants(*)')
                .eq('initiator_user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error: any) {
            console.error('Error fetching split fare requests:', error);
            return [];
        }
    },

    /**
     * Get split fare invitations for user
     */
    getSplitFareInvitations: async (userEmail: string, userPhone: string): Promise<any[]> => {
        try {
            const { data, error } = await supabase
                .from('split_fare_participants')
                .select('*, split_fare:split_fare_requests(*)')
                .or(`email.eq.${userEmail},phone.eq.${userPhone}`)
                .eq('payment_status', 'pending')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error: any) {
            console.error('Error fetching split fare invitations:', error);
            return [];
        }
    },

    /**
     * Pay split fare share
     */
    paySplitFareShare: async (
        participantId: string,
        paymentMethod: string
    ): Promise<boolean> => {
        try {
            // Get participant details
            const { data: participant } = await supabase
                .from('split_fare_participants')
                .select('*')
                .eq('id', participantId)
                .single();

            if (!participant) return false;

            // Process payment (integrate with PaymentService)
            // For now, just mark as paid
            const { error } = await supabase
                .from('split_fare_participants')
                .update({
                    payment_status: 'paid',
                    paid_at: new Date().toISOString(),
                })
                .eq('id', participantId);

            if (error) throw error;

            // Check if all participants have paid
            const { data: allParticipants } = await supabase
                .from('split_fare_participants')
                .select('*')
                .eq('split_fare_id', participant.split_fare_id);

            const allPaid = allParticipants?.every((p) => p.payment_status === 'paid');

            if (allPaid) {
                // Update split fare status to completed
                await supabase
                    .from('split_fare_requests')
                    .update({ status: 'completed' })
                    .eq('id', participant.split_fare_id);
            }

            return true;
        } catch (error: any) {
            console.error('Error paying split fare share:', error);
            return false;
        }
    },

    /**
     * Create ride share invite
     */
    createRideShareInvite: async (
        tripId: string,
        userId: string,
        invitees: Array<{ email?: string; phone?: string }>
    ): Promise<boolean> => {
        try {
            // Get trip details
            const { data: trip } = await supabase
                .from('trips')
                .select('*')
                .eq('id', tripId)
                .single();

            if (!trip) return false;

            // Create invites
            for (const invitee of invitees) {
                const { data: invite, error } = await supabase
                    .from('ride_share_invites')
                    .insert({
                        trip_id: tripId,
                        inviter_user_id: userId,
                        invitee_email: invitee.email,
                        invitee_phone: invitee.phone,
                        status: 'pending',
                    })
                    .select()
                    .single();

                if (error) throw error;

                // Send invitation
                await SocialService.sendRideShareInvitation(invite.id, invitee.email, invitee.phone);
            }

            return true;
        } catch (error: any) {
            console.error('Error creating ride share invite:', error);
            return false;
        }
    },

    /**
     * Send ride share invitation
     */
    sendRideShareInvitation: async (
        inviteId: string,
        email?: string,
        phone?: string
    ): Promise<void> => {
        try {
            // Get invite details
            const { data: invite } = await supabase
                .from('ride_share_invites')
                .select('*, trip:trips(*), inviter:users!inviter_user_id(*)')
                .eq('id', inviteId)
                .single();

            if (!invite) return;

            const inviterName = invite.inviter?.full_name || 'Someone';
            const inviteLink = `https://tcsygo.com/ride-invite/${inviteId}`;
            const message = `${inviterName} has invited you to join their ride from ${invite.trip.pickup_location} to ${invite.trip.drop_location} on ${new Date(invite.trip.departure_time).toLocaleDateString()}. Click here to accept: ${inviteLink}`;

            // Send via SMS if phone provided
            if (phone) {
                const isAvailable = await SMS.isAvailableAsync();
                if (isAvailable) {
                    await SMS.sendSMSAsync([phone], message);
                }
            }

            // Send via email if email provided
            if (email) {
                try {
                    const { supabase } = await import('@/lib/supabase');
                    await supabase.functions.invoke('send-ride-share-email', {
                        body: {
                            inviteId,
                            recipientEmail: email,
                            inviterName,
                            pickupLocation: invite.trip.pickup_location,
                            dropLocation: invite.trip.drop_location,
                            departureTime: invite.trip.departure_time,
                            inviteLink,
                        },
                    });
                    console.log('Email invitation sent to:', email);
                } catch (error) {
                    console.error('Failed to send email invitation:', error);
                }
            }
        } catch (error: any) {
            console.error('Error sending ride share invitation:', error);
        }
    },

    /**
     * Accept ride share invite
     */
    acceptRideShareInvite: async (inviteId: string, userId: string): Promise<boolean> => {
        try {
            // Update invite status
            const { error: inviteError } = await supabase
                .from('ride_share_invites')
                .update({ status: 'accepted' })
                .eq('id', inviteId);

            if (inviteError) throw inviteError;

            // Get invite details
            const { data: invite } = await supabase
                .from('ride_share_invites')
                .select('*')
                .eq('id', inviteId)
                .single();

            if (!invite) return false;

            // Create booking for the invitee
            const { data: trip } = await supabase
                .from('trips')
                .select('*')
                .eq('id', invite.trip_id)
                .single();

            if (!trip) return false;

            const { error: bookingError } = await supabase.from('bookings').insert({
                trip_id: invite.trip_id,
                passenger_id: userId,
                seats_booked: 1,
                total_amount: trip.price_per_seat,
                status: 'confirmed',
            });

            if (bookingError) throw bookingError;

            return true;
        } catch (error: any) {
            console.error('Error accepting ride share invite:', error);
            return false;
        }
    },

    /**
     * Reject ride share invite
     */
    rejectRideShareInvite: async (inviteId: string): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('ride_share_invites')
                .update({ status: 'rejected' })
                .eq('id', inviteId);

            if (error) throw error;
            return true;
        } catch (error: any) {
            console.error('Error rejecting ride share invite:', error);
            return false;
        }
    },

    /**
     * Get ride share invites for user
     */
    getRideShareInvites: async (userEmail: string, userPhone: string): Promise<any[]> => {
        try {
            const { data, error } = await supabase
                .from('ride_share_invites')
                .select('*, trip:trips(*), inviter:users!inviter_user_id(*)')
                .or(`invitee_email.eq.${userEmail},invitee_phone.eq.${userPhone}`)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error: any) {
            logger.error('Error fetching friends:', error);
            return [];
        }
    },

    /**
     * Share ride details with friends
     */
    shareRideDetails: async (bookingId: string, userId: string): Promise<void> => {
        try {
            // Get booking details
            const { data: booking } = await supabase
                .from('bookings')
                .select('*, trip:trips(*), driver:drivers(*)')
                .eq('id', bookingId)
                .single();

            if (!booking) return;

            const shareMessage = `Check out my ride with TCSYGO!\n\nFrom: ${booking.trip.pickup_location}\nTo: ${booking.trip.drop_location}\nDate: ${new Date(booking.trip.departure_time).toLocaleDateString()}\nPrice: ₹${booking.total_amount}\n\nBook your ride at https://tcsygo.com`;

            // Use native share
            const isAvailable = await Sharing.isAvailableAsync();
            if (isAvailable) {
                await Sharing.shareAsync(shareMessage);
            }
        } catch (error: any) {
            console.error('Error sharing ride details:', error);
        }
    },

    /**
     * Get user's referral statistics
     */
    getReferralStatistics: async (userId: string): Promise<{
        totalReferrals: number;
        successfulReferrals: number;
        totalRewards: number;
        pendingRewards: number;
    }> => {
        try {
            // Get referral code
            const { data: referralCode } = await supabase
                .from('referral_codes')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (!referralCode) {
                return {
                    totalReferrals: 0,
                    successfulReferrals: 0,
                    totalRewards: 0,
                    pendingRewards: 0,
                };
            }

            // Get referral usage
            const { data: referrals } = await supabase
                .from('referral_usage')
                .select('*')
                .eq('referrer_user_id', userId);

            const totalReferrals = referrals?.length || 0;
            const successfulReferrals = referrals?.filter((r) => r.reward_claimed)?.length || 0;
            const totalRewards =
                referrals?.reduce((sum, r) => sum + (r.reward_claimed ? r.reward_amount : 0), 0) || 0;
            const pendingRewards =
                referrals?.reduce((sum, r) => sum + (!r.reward_claimed ? r.reward_amount : 0), 0) || 0;

            return {
                totalReferrals,
                successfulReferrals,
                totalRewards,
                pendingRewards,
            };
        } catch (error: any) {
            console.error('Error fetching referral statistics:', error);
            return {
                totalReferrals: 0,
                successfulReferrals: 0,
                totalRewards: 0,
                pendingRewards: 0,
            };
        }
    },

    /**
     * Get user's social activity
     */
    getSocialActivity: async (userId: string): Promise<{
        splitFares: number;
        rideShares: number;
        referrals: number;
    }> => {
        try {
            // Get split fare count
            const { data: splitFares } = await supabase
                .from('split_fare_requests')
                .select('id')
                .eq('initiator_user_id', userId);

            // Get ride share count
            const { data: rideShares } = await supabase
                .from('ride_share_invites')
                .select('id')
                .eq('inviter_user_id', userId);

            // Get referral count
            const { data: referrals } = await supabase
                .from('referral_usage')
                .select('id')
                .eq('referrer_user_id', userId);

            return {
                splitFares: splitFares?.length || 0,
                rideShares: rideShares?.length || 0,
                referrals: referrals?.length || 0,
            };
        } catch (error: any) {
            console.error('Error fetching social activity:', error);
            return {
                splitFares: 0,
                rideShares: 0,
                referrals: 0,
            };
        }
    },
};
