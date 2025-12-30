import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

const SCHEDULED_RIDES_KEY = 'scheduled_rides';
const SCHEDULED_RIDE_TASK = 'SCHEDULED_RIDE_TASK';

export interface ScheduledRide {
    id: string;
    userId: string;
    pickupLocation: {
        latitude: number;
        longitude: number;
        address: string;
    };
    dropLocation: {
        latitude: number;
        longitude: number;
        address: string;
    };
    scheduledTime: string;
    vehicleType: 'bike' | 'auto' | 'car';
    preferences?: any;
    notificationIds: string[];
    status: 'pending' | 'booked' | 'cancelled';
    createdAt: string;
}

// Configure notification handler
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export const ScheduledRideManager = {
    /**
     * Initialize scheduled ride manager
     */
    init: async () => {
        try {
            // Request notification permissions
            const { status } = await Notifications.requestPermissionsAsync();
            if (status !== 'granted') {
                console.warn('Notification permissions not granted');
            }

            // Check for rides that need to be booked
            await ScheduledRideManager.checkPendingRides();
        } catch (error) {
            console.error('Error initializing scheduled ride manager:', error);
        }
    },

    /**
     * Schedule a ride for future
     */
    scheduleRide: async (
        userId: string,
        pickupLocation: { latitude: number; longitude: number; address: string },
        dropLocation: { latitude: number; longitude: number; address: string },
        scheduledTime: Date,
        vehicleType: 'bike' | 'auto' | 'car',
        preferences?: any
    ): Promise<string | null> => {
        try {
            // Create scheduled ride object
            const scheduledRide: ScheduledRide = {
                id: `scheduled_${Date.now()}`,
                userId,
                pickupLocation,
                dropLocation,
                scheduledTime: scheduledTime.toISOString(),
                vehicleType,
                preferences,
                notificationIds: [],
                status: 'pending',
                createdAt: new Date().toISOString(),
            };

            // Schedule notifications
            const notificationIds = await ScheduledRideManager.scheduleNotifications(
                scheduledRide.id,
                scheduledTime
            );
            scheduledRide.notificationIds = notificationIds;

            // Save to local storage
            const rides = await ScheduledRideManager.getScheduledRides();
            rides.push(scheduledRide);
            await AsyncStorage.setItem(SCHEDULED_RIDES_KEY, JSON.stringify(rides));

            // Save to database
            await supabase.from('scheduled_rides').insert({
                id: scheduledRide.id,
                user_id: userId,
                pickup_location: pickupLocation.address,
                pickup_lat: pickupLocation.latitude,
                pickup_lng: pickupLocation.longitude,
                drop_location: dropLocation.address,
                drop_lat: dropLocation.latitude,
                drop_lng: dropLocation.longitude,
                scheduled_time: scheduledTime.toISOString(),
                vehicle_type: vehicleType,
                preferences,
                status: 'pending',
            });

            return scheduledRide.id;
        } catch (error) {
            console.error('Error scheduling ride:', error);
            return null;
        }
    },

    scheduleNotifications: async (
        rideId: string,
        scheduledTime: Date
    ): Promise<string[]> => {
        try {
            const notificationIds: string[] = [];
            const now = new Date();

            // Calculate notification times in seconds from now
            const oneHourBefore = new Date(scheduledTime.getTime() - 60 * 60 * 1000);
            const fifteenMinsBefore = new Date(scheduledTime.getTime() - 15 * 60 * 1000);

            // Schedule 1 hour before notification
            if (oneHourBefore > now) {
                const secondsUntil = Math.floor((oneHourBefore.getTime() - now.getTime()) / 1000);
                const id1 = await Notifications.scheduleNotificationAsync({
                    content: {
                        title: 'Ride Reminder',
                        body: 'Your scheduled ride is in 1 hour',
                        data: { rideId, type: 'reminder' },
                    },
                    trigger: { seconds: secondsUntil },
                });
                notificationIds.push(id1);
            }

            // Schedule 15 minutes before notification
            if (fifteenMinsBefore > now) {
                const secondsUntil = Math.floor((fifteenMinsBefore.getTime() - now.getTime()) / 1000);
                const id2 = await Notifications.scheduleNotificationAsync({
                    content: {
                        title: 'Ride Starting Soon',
                        body: 'Your ride will start in 15 minutes. Booking driver now...',
                        data: { rideId, type: 'booking' },
                    },
                    trigger: { seconds: secondsUntil },
                });
                notificationIds.push(id2);
            }

            return notificationIds;
        } catch (error) {
            console.error('Error scheduling notifications:', error);
            return [];
        }
    },

    /**
     * Get all scheduled rides
     */
    getScheduledRides: async (): Promise<ScheduledRide[]> => {
        try {
            const ridesJson = await AsyncStorage.getItem(SCHEDULED_RIDES_KEY);
            return ridesJson ? JSON.parse(ridesJson) : [];
        } catch (error) {
            console.error('Error getting scheduled rides:', error);
            return [];
        }
    },

    /**
     * Get scheduled rides for a user
     */
    getUserScheduledRides: async (userId: string): Promise<ScheduledRide[]> => {
        try {
            const rides = await ScheduledRideManager.getScheduledRides();
            return rides.filter((ride) => ride.userId === userId && ride.status === 'pending');
        } catch (error) {
            console.error('Error getting user scheduled rides:', error);
            return [];
        }
    },

    /**
     * Cancel a scheduled ride
     */
    cancelScheduledRide: async (rideId: string): Promise<boolean> => {
        try {
            // Get all rides
            const rides = await ScheduledRideManager.getScheduledRides();
            const ride = rides.find((r) => r.id === rideId);

            if (!ride) return false;

            // Cancel notifications
            for (const notificationId of ride.notificationIds) {
                await Notifications.cancelScheduledNotificationAsync(notificationId);
            }

            // Update status
            ride.status = 'cancelled';

            // Save to storage
            await AsyncStorage.setItem(SCHEDULED_RIDES_KEY, JSON.stringify(rides));

            // Update database
            await supabase
                .from('scheduled_rides')
                .update({ status: 'cancelled' })
                .eq('id', rideId);

            return true;
        } catch (error) {
            console.error('Error cancelling scheduled ride:', error);
            return false;
        }
    },

    /**
     * Check for pending rides that need to be booked
     */
    checkPendingRides: async () => {
        try {
            const rides = await ScheduledRideManager.getScheduledRides();
            const now = new Date();

            for (const ride of rides) {
                if (ride.status !== 'pending') continue;

                const scheduledTime = new Date(ride.scheduledTime);
                const timeDiff = scheduledTime.getTime() - now.getTime();

                // Book ride 15 minutes before scheduled time
                if (timeDiff <= 15 * 60 * 1000 && timeDiff > 0) {
                    await ScheduledRideManager.bookScheduledRide(ride);
                }

                // Clean up past rides
                if (timeDiff < -60 * 60 * 1000) {
                    // 1 hour past
                    ride.status = 'cancelled';
                }
            }

            // Save updated rides
            await AsyncStorage.setItem(SCHEDULED_RIDES_KEY, JSON.stringify(rides));
        } catch (error) {
            console.error('Error checking pending rides:', error);
        }
    },

    /**
     * Book a scheduled ride
     */
    bookScheduledRide: async (ride: ScheduledRide): Promise<boolean> => {
        try {
            const { QuickBookService } = await import('./QuickBookService');

            const result = await QuickBookService.quickBook({
                pickupLocation: ride.pickupLocation,
                dropLocation: ride.dropLocation,
                vehicleType: ride.vehicleType,
                preferences: ride.preferences,
            });

            if (result.success) {
                // Update ride status
                ride.status = 'booked';

                // Save to storage
                const rides = await ScheduledRideManager.getScheduledRides();
                const index = rides.findIndex((r) => r.id === ride.id);
                if (index !== -1) {
                    rides[index] = ride;
                    await AsyncStorage.setItem(SCHEDULED_RIDES_KEY, JSON.stringify(rides));
                }

                // Update database
                await supabase
                    .from('scheduled_rides')
                    .update({ status: 'booked', booking_id: result.bookingId })
                    .eq('id', ride.id);

                // Send notification
                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: 'Ride Booked!',
                        body: 'Your scheduled ride has been booked successfully',
                        data: { bookingId: result.bookingId },
                    },
                    trigger: null,
                });

                return true;
            }

            return false;
        } catch (error) {
            console.error('Error booking scheduled ride:', error);
            return false;
        }
    },

    /**
     * Clean up old scheduled rides
     */
    cleanupOldRides: async () => {
        try {
            const rides = await ScheduledRideManager.getScheduledRides();
            const now = new Date();

            // Keep only rides from last 30 days
            const filteredRides = rides.filter((ride) => {
                const rideDate = new Date(ride.scheduledTime);
                const daysDiff = (now.getTime() - rideDate.getTime()) / (1000 * 60 * 60 * 24);
                return daysDiff < 30;
            });

            await AsyncStorage.setItem(SCHEDULED_RIDES_KEY, JSON.stringify(filteredRides));
        } catch (error) {
            console.error('Error cleaning up old rides:', error);
        }
    },
};

// Set up background task to check for pending rides
TaskManager.defineTask(SCHEDULED_RIDE_TASK, async () => {
    try {
        await ScheduledRideManager.checkPendingRides();
        return { success: true };
    } catch (error) {
        console.error('Error in scheduled ride task:', error);
        return { success: false };
    }
});
