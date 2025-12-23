import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
    TRIPS: '@tcsygo_cached_trips',
    BOOKINGS: '@tcsygo_cached_bookings',
    USER_PROFILE: '@tcsygo_user_profile',
    PENDING_ACTIONS: '@tcsygo_pending_actions',
};

export interface PendingAction {
    id: string;
    type: 'create_booking' | 'cancel_booking' | 'update_profile' | 'send_message';
    data: any;
    timestamp: number;
}

// Cache trip data for offline viewing
export async function cacheTrips(trips: any[]) {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(trips));
    } catch (error) {
        console.error('Error caching trips:', error);
    }
}

export async function getCachedTrips(): Promise<any[]> {
    try {
        const cached = await AsyncStorage.getItem(STORAGE_KEYS.TRIPS);
        return cached ? JSON.parse(cached) : [];
    } catch (error) {
        console.error('Error getting cached trips:', error);
        return [];
    }
}

// Cache bookings
export async function cacheBookings(bookings: any[]) {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
    } catch (error) {
        console.error('Error caching bookings:', error);
    }
}

export async function getCachedBookings(): Promise<any[]> {
    try {
        const cached = await AsyncStorage.getItem(STORAGE_KEYS.BOOKINGS);
        return cached ? JSON.parse(cached) : [];
    } catch (error) {
        console.error('Error getting cached bookings:', error);
        return [];
    }
}

// Cache user profile
export async function cacheUserProfile(profile: any) {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
    } catch (error) {
        console.error('Error caching user profile:', error);
    }
}

export async function getCachedUserProfile(): Promise<any | null> {
    try {
        const cached = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
        return cached ? JSON.parse(cached) : null;
    } catch (error) {
        console.error('Error getting cached user profile:', error);
        return null;
    }
}

// Queue actions for when connection is restored
export async function queueAction(action: Omit<PendingAction, 'id' | 'timestamp'>) {
    try {
        const pending = await getPendingActions();
        const newAction: PendingAction = {
            ...action,
            id: Date.now().toString(),
            timestamp: Date.now(),
        };
        pending.push(newAction);
        await AsyncStorage.setItem(STORAGE_KEYS.PENDING_ACTIONS, JSON.stringify(pending));
    } catch (error) {
        console.error('Error queuing action:', error);
    }
}

export async function getPendingActions(): Promise<PendingAction[]> {
    try {
        const cached = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_ACTIONS);
        return cached ? JSON.parse(cached) : [];
    } catch (error) {
        console.error('Error getting pending actions:', error);
        return [];
    }
}

export async function removePendingAction(actionId: string) {
    try {
        const pending = await getPendingActions();
        const filtered = pending.filter(a => a.id !== actionId);
        await AsyncStorage.setItem(STORAGE_KEYS.PENDING_ACTIONS, JSON.stringify(filtered));
    } catch (error) {
        console.error('Error removing pending action:', error);
    }
}

export async function clearPendingActions() {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.PENDING_ACTIONS, JSON.stringify([]));
    } catch (error) {
        console.error('Error clearing pending actions:', error);
    }
}

// Clear all cached data
export async function clearAllCache() {
    try {
        await AsyncStorage.multiRemove([
            STORAGE_KEYS.TRIPS,
            STORAGE_KEYS.BOOKINGS,
            STORAGE_KEYS.USER_PROFILE,
            STORAGE_KEYS.PENDING_ACTIONS,
        ]);
    } catch (error) {
        console.error('Error clearing cache:', error);
    }
}
