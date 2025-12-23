import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { Share, Platform } from 'react-native';

const SAVED_TRIPS_KEY = '@tcsygo_saved_trips';
const RECENT_SEARCHES_KEY = '@tcsygo_recent_searches';

export interface SavedTrip {
    id: string;
    savedAt: string;
}

export interface RecentSearch {
    pickup: string;
    drop: string;
    pickupLat?: number;
    pickupLng?: number;
    dropLat?: number;
    dropLng?: number;
    searchedAt: string;
}

/**
 * Save a trip to favorites
 */
export async function saveTrip(tripId: string): Promise<void> {
    try {
        const existing = await getSavedTrips();
        const newTrip: SavedTrip = {
            id: tripId,
            savedAt: new Date().toISOString(),
        };

        // Add to beginning of array (most recent first)
        const updated = [newTrip, ...existing.filter(t => t.id !== tripId)];

        await AsyncStorage.setItem(SAVED_TRIPS_KEY, JSON.stringify(updated));
    } catch (error) {
        console.error('Error saving trip:', error);
        throw error;
    }
}

/**
 * Remove a trip from favorites
 */
export async function unsaveTrip(tripId: string): Promise<void> {
    try {
        const existing = await getSavedTrips();
        const updated = existing.filter(t => t.id !== tripId);

        await AsyncStorage.setItem(SAVED_TRIPS_KEY, JSON.stringify(updated));
    } catch (error) {
        console.error('Error unsaving trip:', error);
        throw error;
    }
}

/**
 * Get all saved trips
 */
export async function getSavedTrips(): Promise<SavedTrip[]> {
    try {
        const data = await AsyncStorage.getItem(SAVED_TRIPS_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error getting saved trips:', error);
        return [];
    }
}

/**
 * Check if a trip is saved
 */
export async function isTripSaved(tripId: string): Promise<boolean> {
    const saved = await getSavedTrips();
    return saved.some(t => t.id === tripId);
}

/**
 * Save a recent search
 */
export async function saveRecentSearch(search: Omit<RecentSearch, 'searchedAt'>): Promise<void> {
    try {
        const existing = await getRecentSearches();
        const newSearch: RecentSearch = {
            ...search,
            searchedAt: new Date().toISOString(),
        };

        // Remove duplicates and add to beginning
        const filtered = existing.filter(
            s => !(s.pickup === search.pickup && s.drop === search.drop)
        );
        const updated = [newSearch, ...filtered].slice(0, 10); // Keep last 10 searches

        await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (error) {
        console.error('Error saving recent search:', error);
    }
}

/**
 * Get recent searches
 */
export async function getRecentSearches(): Promise<RecentSearch[]> {
    try {
        const data = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error getting recent searches:', error);
        return [];
    }
}

/**
 * Clear recent searches
 */
export async function clearRecentSearches(): Promise<void> {
    try {
        await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch (error) {
        console.error('Error clearing recent searches:', error);
    }
}

/**
 * Share a trip via native share dialog
 */
export async function shareTrip(tripId: string, tripDetails?: {
    pickup: string;
    drop: string;
    departureTime: string;
    pricePerSeat: number;
}): Promise<void> {
    try {
        let message = `Check out this trip on TCSYGO!`;

        if (tripDetails) {
            message = `🚗 Trip from ${tripDetails.pickup} to ${tripDetails.drop}\n` +
                `📅 ${new Date(tripDetails.departureTime).toLocaleDateString()}\n` +
                `💰 ₹${tripDetails.pricePerSeat}/seat\n\n` +
                `Book now on TCSYGO!`;
        }

        const url = `tcsygo://trip/${tripId}`;

        const result = await Share.share({
            message: Platform.OS === 'ios' ? message : `${message}\n\n${url}`,
            url: Platform.OS === 'ios' ? url : undefined,
            title: 'Share Trip',
        });

        if (result.action === Share.sharedAction) {
            console.log('Trip shared successfully');
        }
    } catch (error) {
        console.error('Error sharing trip:', error);
        throw error;
    }
}

/**
 * Generate deep link for trip
 */
export function generateTripDeepLink(tripId: string): string {
    return `tcsygo://trip/${tripId}`;
}

/**
 * Sync saved trips with backend (optional - for cross-device sync)
 */
export async function syncSavedTripsWithBackend(userId: string): Promise<void> {
    try {
        const localSaved = await getSavedTrips();

        // Get saved trips from backend
        const { data: backendSaved, error } = await supabase
            .from('saved_searches')
            .select('*')
            .eq('user_id', userId)
            .eq('type', 'trip');

        if (error) throw error;

        // Merge local and backend saved trips
        const merged = new Map<string, SavedTrip>();

        localSaved.forEach(trip => merged.set(trip.id, trip));
        backendSaved?.forEach((trip: any) => {
            if (!merged.has(trip.trip_id)) {
                merged.set(trip.trip_id, {
                    id: trip.trip_id,
                    savedAt: trip.created_at,
                });
            }
        });

        // Save merged list locally
        const mergedArray = Array.from(merged.values());
        await AsyncStorage.setItem(SAVED_TRIPS_KEY, JSON.stringify(mergedArray));

        // Sync to backend
        for (const trip of mergedArray) {
            await supabase
                .from('saved_searches')
                .upsert({
                    user_id: userId,
                    type: 'trip',
                    trip_id: trip.id,
                    created_at: trip.savedAt,
                });
        }
    } catch (error) {
        console.error('Error syncing saved trips:', error);
    }
}
