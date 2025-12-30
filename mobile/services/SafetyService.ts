import { supabase } from '@/lib/supabase';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import * as SMS from 'expo-sms';
import * as Linking from 'expo-linking';
import { logger } from './LoggerService';

export interface SafetyCheckIn {
    id: string;
    booking_id: string;
    user_id: string;
    status: 'safe' | 'need_help' | 'missed';
    location_lat: number;
    location_lng: number;
    created_at: string;
}

export interface EmergencyContact {
    id: string;
    user_id: string;
    name: string;
    phone: string;
    relationship: string;
    is_primary: boolean;
}

export interface TripShare {
    id: string;
    booking_id: string;
    share_token: string;
    expires_at: string;
}

export const SafetyService = {
    /**
     * Create safety check-in
     */
    createSafetyCheckIn: async (
        bookingId: string,
        userId: string,
        status: 'safe' | 'need_help'
    ): Promise<boolean> => {
        try {
            // Get current location
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });

            // Create check-in record
            const { error } = await supabase.from('safety_checkins').insert({
                trip_id: bookingId,
                user_id: userId,
                status,
                location_lat: location.coords.latitude,
                location_lng: location.coords.longitude,
                response_time: new Date().toISOString(),
            });

            if (error) throw error;

            // If user needs help, trigger emergency protocol
            if (status === 'need_help') {
                await SafetyService.triggerEmergencyProtocol(bookingId, userId, {
                    lat: location.coords.latitude,
                    lng: location.coords.longitude,
                });
            }

            return true;
        } catch (error: any) {
            logger.error('Error creating safety check-in:', error);
            return false;
        }
    },

    /**
     * Record missed check-in
     */
    recordMissedCheckIn: async (bookingId: string, userId: string): Promise<void> => {
        try {
            // Get current location
            let location;
            try {
                location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });
            } catch (locError) {
                console.error('Could not get location for missed check-in:', locError);
            }

            // Create missed check-in record
            const { error } = await supabase.from('safety_checkins').insert({
                trip_id: bookingId,
                user_id: userId,
                status: 'missed',
                location_lat: location?.coords.latitude || 0,
                location_lng: location?.coords.longitude || 0,
            });

            if (error) throw error;

            // Check if this is the second missed check-in
            const { data: missedCheckIns } = await supabase
                .from('safety_checkins')
                .select('*')
                .eq('trip_id', bookingId)
                .eq('status', 'missed')
                .order('created_at', { ascending: false })
                .limit(2);

            if (missedCheckIns && missedCheckIns.length >= 2) {
                // Trigger emergency protocol after 2 missed check-ins
                await SafetyService.triggerEmergencyProtocol(bookingId, userId, {
                    lat: location?.coords.latitude || 0,
                    lng: location?.coords.longitude || 0,
                });
            }
        } catch (error: any) {
            logger.error('Error recording missed check-in:', error);
        }
    },

    /**
     * Trigger emergency protocol
     */
    triggerEmergencyProtocol: async (
        bookingId: string,
        userId: string,
        location: { lat: number; lng: number }
    ): Promise<void> => {
        try {
            // Create emergency alert
            const { data: alert, error: alertError } = await supabase
                .from('emergency_alerts')
                .insert({
                    booking_id: bookingId,
                    user_id: userId,
                    alert_type: 'safety_concern',
                    location_lat: location.lat,
                    location_lng: location.lng,
                    status: 'active',
                })
                .select()
                .single();

            if (alertError) throw alertError;

            // Notify emergency contacts
            await SafetyService.notifyEmergencyContacts(userId, bookingId, location);

            // Send notification to admin/support
            await supabase.from('notifications').insert({
                user_id: 'admin', // Admin notification
                title: 'Emergency Alert',
                message: `User ${userId} triggered emergency protocol for booking ${bookingId}`,
                type: 'emergency',
                data: { booking_id: bookingId, alert_id: alert.id },
            });
        } catch (error: any) {
            logger.error('Error triggering emergency protocol:', error);
        }
    },

    /**
     * Notify emergency contacts
     */
    notifyEmergencyContacts: async (
        userId: string,
        bookingId: string,
        location: { lat: number; lng: number }
    ): Promise<void> => {
        try {
            // Get emergency contacts
            const { data: contacts, error } = await supabase
                .from('emergency_contacts')
                .select('*')
                .eq('user_id', userId)
                .eq('is_active', true);

            if (error) throw error;

            // Get user details
            const { data: user } = await supabase
                .from('users')
                .select('full_name, phone')
                .eq('id', userId)
                .single();

            // Get booking details
            const { data: booking } = await supabase
                .from('bookings')
                .select('*, trip:trips(*)')
                .eq('id', bookingId)
                .single();

            const userName = user?.full_name || 'User';
            const locationLink = `https://maps.google.com/?q=${location.lat},${location.lng}`;

            const message = `EMERGENCY ALERT: ${userName} has triggered an emergency alert during their ride. Current location: ${locationLink}. Booking ID: ${bookingId}. Please contact them immediately.`;

            // Send SMS to each emergency contact
            for (const contact of contacts || []) {
                try {
                    const isAvailable = await SMS.isAvailableAsync();
                    if (isAvailable) {
                        await SMS.sendSMSAsync([contact.phone], message);
                    }

                    // Also create in-app notification if contact is a user
                    const { data: contactUser } = await supabase
                        .from('users')
                        .select('id')
                        .eq('phone', contact.phone)
                        .single();

                    if (contactUser) {
                        await supabase.from('notifications').insert({
                            user_id: contactUser.id,
                            title: 'Emergency Alert',
                            message,
                            type: 'emergency',
                            data: { booking_id: bookingId, location },
                        });
                    }
                } catch (smsError) {
                    console.error('Error sending SMS to contact:', contact.phone, smsError);
                }
            }
        } catch (error: any) {
            logger.error('Error notifying emergency contacts:', error);
        }
    },

    /**
     * Get emergency contacts
     */
    getEmergencyContacts: async (userId: string): Promise<EmergencyContact[]> => {
        try {
            const { data, error } = await supabase
                .from('emergency_contacts')
                .select('*')
                .eq('user_id', userId)
                .eq('is_active', true)
                .order('is_primary', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error: any) {
            logger.error('Error fetching emergency contacts:', error);
            return [];
        }
    },

    /**
     * Add emergency contact
     */
    addEmergencyContact: async (
        userId: string,
        contact: Omit<EmergencyContact, 'id' | 'user_id'>
    ): Promise<boolean> => {
        try {
            const { error } = await supabase.from('emergency_contacts').insert({
                user_id: userId,
                ...contact,
                is_active: true,
            });

            if (error) throw error;
            return true;
        } catch (error: any) {
            logger.error('Error adding emergency contact:', error);
            return false;
        }
    },

    /**
     * Update emergency contact
     */
    updateEmergencyContact: async (
        contactId: string,
        updates: Partial<EmergencyContact>
    ): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('emergency_contacts')
                .update(updates)
                .eq('id', contactId);

            if (error) throw error;
            return true;
        } catch (error: any) {
            logger.error('Error updating emergency contact:', error);
            return false;
        }
    },

    /**
     * Delete emergency contact
     */
    deleteEmergencyContact: async (contactId: string): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('emergency_contacts')
                .update({ is_active: false })
                .eq('id', contactId);

            if (error) throw error;
            return true;
        } catch (error: any) {
            logger.error('Error deleting emergency contact:', error);
            return false;
        }
    },

    /**
     * Create trip share link
     */
    createTripShareLink: async (bookingId: string, userId: string): Promise<string | null> => {
        try {
            // Generate unique share token
            const shareToken = `${bookingId}_${Math.random().toString(36).substring(2, 15)}`;

            // Create trip share record
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24); // Expires in 24 hours

            const { error } = await supabase.from('trip_shares').insert({
                booking_id: bookingId,
                user_id: userId,
                share_token: shareToken,
                expires_at: expiresAt.toISOString(),
            });

            if (error) throw error;

            // Generate share link
            const shareLink = `https://tcsygo.com/track/${shareToken}`;
            return shareLink;
        } catch (error: any) {
            logger.error('Error creating trip share link:', error);
            return null;
        }
    },

    /**
     * Share trip with contacts
     */
    shareTripWithContacts: async (
        bookingId: string,
        userId: string,
        contactIds: string[]
    ): Promise<boolean> => {
        try {
            // Create share link
            const shareLink = await SafetyService.createTripShareLink(bookingId, userId);
            if (!shareLink) return false;

            // Get user details
            const { data: user } = await supabase
                .from('users')
                .select('full_name')
                .eq('id', userId)
                .single();

            const userName = user?.full_name || 'User';

            // Get booking details
            const { data: booking } = await supabase
                .from('bookings')
                .select('*, trip:trips(*)')
                .eq('id', bookingId)
                .single();

            const message = `${userName} is sharing their ride with you. Track their journey here: ${shareLink}`;

            let targetContactIds = contactIds;
            if (targetContactIds.length === 0) {
                const { data: primaryContacts } = await supabase
                    .from('emergency_contacts')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('is_primary', true)
                    .eq('is_active', true);

                if (primaryContacts) {
                    targetContactIds = primaryContacts.map(c => c.id);
                }
            }

            // Send to each contact
            for (const contactId of targetContactIds) {
                const { data: contact } = await supabase
                    .from('emergency_contacts')
                    .select('*')
                    .eq('id', contactId)
                    .single();

                if (contact) {
                    // Send SMS
                    try {
                        const isAvailable = await SMS.isAvailableAsync();
                        if (isAvailable) {
                            await SMS.sendSMSAsync([contact.phone], message);
                        }
                    } catch (smsError) {
                        logger.error('Error sending SMS:', smsError);
                    }

                    // Record share (Skip for now to avoid table error)
                }
            }

            return true;
        } catch (error: any) {
            logger.error('Error sharing trip with contacts:', error);
            return false;
        }
    },

    /**
     * Get trip share details
     */
    getTripShareDetails: async (shareToken: string): Promise<any | null> => {
        try {
            const { data: share, error } = await supabase
                .from('trip_shares')
                .select('*, booking:bookings(*, trip:trips(*), driver:drivers(*))')
                .eq('share_token', shareToken)
                .single();

            if (error) throw error;

            // Check if expired
            const expiresAt = new Date(share.expires_at);
            if (new Date() > expiresAt) {
                return null;
            }

            return share;
        } catch (error: any) {
            logger.error('Error fetching trip share details:', error);
            return null;
        }
    },

    /**
     * Verify driver before ride
     */
    verifyDriver: async (
        bookingId: string,
        driverId: string,
        verificationData: {
            photoMatch: boolean;
            vehicleMatch: boolean;
            licensePlateMatch: boolean;
        }
    ): Promise<boolean> => {
        try {
            const { error } = await supabase.from('driver_verifications').insert({
                booking_id: bookingId,
                driver_id: driverId,
                photo_verified: verificationData.photoMatch,
                vehicle_verified: verificationData.vehicleMatch,
                license_plate_verified: verificationData.licensePlateMatch,
                verified_at: new Date().toISOString(),
            });

            if (error) throw error;

            // If any verification fails, create alert
            if (
                !verificationData.photoMatch ||
                !verificationData.vehicleMatch ||
                !verificationData.licensePlateMatch
            ) {
                await supabase.from('notifications').insert({
                    user_id: 'admin',
                    title: 'Driver Verification Failed',
                    message: `Driver verification failed for booking ${bookingId}`,
                    type: 'alert',
                    data: { booking_id: bookingId, driver_id: driverId, ...verificationData },
                });
            }

            return true;
        } catch (error: any) {
            logger.error('Error verifying driver:', error);
            return false;
        }
    },

    /**
     * Report driver mismatch
     */
    reportDriverMismatch: async (
        bookingId: string,
        driverId: string,
        reason: string,
        details: string
    ): Promise<boolean> => {
        try {
            // Create mismatch report
            const { error } = await supabase.from('driver_mismatch_reports').insert({
                booking_id: bookingId,
                driver_id: driverId,
                reason,
                details,
                status: 'pending',
            });

            if (error) throw error;

            // Notify admin
            await supabase.from('notifications').insert({
                user_id: 'admin',
                title: 'Driver Mismatch Reported',
                message: `Driver mismatch reported for booking ${bookingId}: ${reason}`,
                type: 'alert',
                data: { booking_id: bookingId, driver_id: driverId, reason, details },
            });

            return true;
        } catch (error: any) {
            logger.error('Error reporting driver mismatch:', error);
            return false;
        }
    },

    /**
     * Get safety tips
     */
    getSafetyTips: async (context: 'pre_ride' | 'during_ride' | 'emergency'): Promise<string[]> => {
        const tips = {
            pre_ride: [
                'Verify driver photo and vehicle details before getting in',
                'Share your trip details with emergency contacts',
                'Check driver ratings and reviews',
                'Ensure the license plate matches the app',
                'Sit in the back seat for safety',
            ],
            during_ride: [
                'Keep your phone charged and accessible',
                'Stay alert and aware of your surroundings',
                'Follow the route on the app',
                'Respond to safety check-ins promptly',
                'Trust your instincts - if something feels wrong, speak up',
            ],
            emergency: [
                'Call emergency services (112) immediately if in danger',
                'Use the in-app SOS button to alert emergency contacts',
                'Share your live location with trusted contacts',
                'Stay calm and try to remember details',
                'Exit the vehicle in a safe, public area if possible',
            ],
        };

        return tips[context] || [];
    },
};
