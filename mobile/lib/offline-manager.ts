import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';

export interface OfflineQueueItem {
    id: string;
    type: 'booking' | 'payment' | 'rating' | 'message';
    data: any;
    timestamp: number;
    retryCount: number;
}

class OfflineManager {
    private isOnline: boolean = true;
    private listeners: Array<(isOnline: boolean) => void> = [];
    private queue: OfflineQueueItem[] = [];
    private readonly QUEUE_KEY = 'offline_queue';
    private readonly MAX_RETRIES = 3;

    async init() {
        // Load queue from storage
        await this.loadQueue();

        // Subscribe to network state changes
        NetInfo.addEventListener((state: NetInfoState) => {
            const wasOffline = !this.isOnline;
            this.isOnline = state.isConnected ?? false;

            // Notify listeners
            this.notifyListeners();

            // Process queue when coming back online
            if (wasOffline && this.isOnline) {
                this.processQueue();
            }
        });

        // Get initial state
        const state = await NetInfo.fetch();
        this.isOnline = state.isConnected ?? false;
        this.notifyListeners();
    }

    getIsOnline(): boolean {
        return this.isOnline;
    }

    subscribe(listener: (isOnline: boolean) => void) {
        this.listeners.push(listener);
        // Immediately call with current state
        listener(this.isOnline);

        return () => {
            this.listeners = this.listeners.filter((l) => l !== listener);
        };
    }

    private notifyListeners() {
        this.listeners.forEach((listener) => listener(this.isOnline));
    }

    /**
     * Add item to offline queue
     */
    async addToQueue(item: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'retryCount'>) {
        const queueItem: OfflineQueueItem = {
            ...item,
            id: Math.random().toString(36).substring(7),
            timestamp: Date.now(),
            retryCount: 0,
        };

        this.queue.push(queueItem);
        await this.saveQueue();

        // Try to process immediately if online
        if (this.isOnline) {
            await this.processQueue();
        }
    }

    /**
     * Process offline queue
     */
    private async processQueue() {
        if (!this.isOnline || this.queue.length === 0) {
            return;
        }

        const itemsToProcess = [...this.queue];
        this.queue = [];

        for (const item of itemsToProcess) {
            try {
                await this.processQueueItem(item);
            } catch (error) {
                console.error('Error processing queue item:', error);

                // Re-add to queue if under retry limit
                if (item.retryCount < this.MAX_RETRIES) {
                    this.queue.push({
                        ...item,
                        retryCount: item.retryCount + 1,
                    });
                } else {
                    console.error('Max retries reached for queue item:', item);
                }
            }
        }

        await this.saveQueue();
    }

    /**
     * Process individual queue item
     */
    private async processQueueItem(item: OfflineQueueItem) {
        switch (item.type) {
            case 'booking':
                // Process booking
                console.log('Processing offline booking:', item.data);
                try {
                    const { RideService } = await import('@/services/RideService');
                    await RideService.bookRide(item.data);
                    console.log('Successfully processed offline booking');
                } catch (error) {
                    console.error('Failed to process offline booking:', error);
                    throw error;
                }
                break;

            case 'payment':
                // Process payment
                console.log('Processing offline payment:', item.data);
                try {
                    const { PaymentService } = await import('@/services/PaymentService');
                    const result = await PaymentService.processPayment(
                        item.data.bookingId,
                        item.data.amount,
                        item.data.method,
                        item.data.autoPayEnabled
                    );
                    if (!result.success) {
                        throw new Error(result.error || 'Payment processing failed');
                    }
                    console.log('Successfully processed offline payment');
                } catch (error) {
                    console.error('Failed to process offline payment:', error);
                    throw error;
                }
                break;

            case 'rating':
                // Process rating
                console.log('Processing offline rating:', item.data);
                try {
                    const { supabase } = await import('@/lib/supabase');
                    const { error } = await supabase
                        .from('ratings')
                        .insert({
                            booking_id: item.data.bookingId,
                            driver_id: item.data.driverId,
                            passenger_id: item.data.passengerId,
                            rating: item.data.rating,
                            review: item.data.review,
                            created_at: new Date().toISOString(),
                        });
                    if (error) throw error;
                    console.log('Successfully processed offline rating');
                } catch (error) {
                    console.error('Failed to process offline rating:', error);
                    throw error;
                }
                break;

            case 'message':
                // Process message
                console.log('Processing offline message:', item.data);
                try {
                    const { supabase } = await import('@/lib/supabase');
                    const { error } = await supabase
                        .from('messages')
                        .insert({
                            sender_id: item.data.senderId,
                            receiver_id: item.data.receiverId,
                            booking_id: item.data.bookingId,
                            content: item.data.content,
                            created_at: new Date().toISOString(),
                        });
                    if (error) throw error;
                    console.log('Successfully processed offline message');
                } catch (error) {
                    console.error('Failed to process offline message:', error);
                    throw error;
                }
                break;

            default:
                console.warn('Unknown queue item type:', item.type);
        }
    }

    /**
     * Load queue from storage
     */
    private async loadQueue() {
        try {
            const queueJson = await AsyncStorage.getItem(this.QUEUE_KEY);
            if (queueJson) {
                this.queue = JSON.parse(queueJson);
            }
        } catch (error) {
            console.error('Error loading offline queue:', error);
            this.queue = [];
        }
    }

    /**
     * Save queue to storage
     */
    private async saveQueue() {
        try {
            await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(this.queue));
        } catch (error) {
            console.error('Error saving offline queue:', error);
        }
    }

    /**
     * Get queue size
     */
    getQueueSize(): number {
        return this.queue.length;
    }

    /**
     * Clear queue
     */
    async clearQueue() {
        this.queue = [];
        await this.saveQueue();
    }

    /**
     * Cache data for offline access
     */
    async cacheData(key: string, data: any) {
        try {
            await AsyncStorage.setItem(`cache_${key}`, JSON.stringify({
                data,
                timestamp: Date.now(),
            }));
        } catch (error) {
            console.error('Error caching data:', error);
        }
    }

    /**
     * Get cached data
     */
    async getCachedData(key: string, maxAge: number = 3600000): Promise<any | null> {
        try {
            const cachedJson = await AsyncStorage.getItem(`cache_${key}`);
            if (!cachedJson) return null;

            const cached = JSON.parse(cachedJson);
            const age = Date.now() - cached.timestamp;

            if (age > maxAge) {
                // Cache expired
                await AsyncStorage.removeItem(`cache_${key}`);
                return null;
            }

            return cached.data;
        } catch (error) {
            console.error('Error getting cached data:', error);
            return null;
        }
    }

    /**
     * Clear all cached data
     */
    async clearCache() {
        try {
            const keys = await AsyncStorage.getAllKeys();
            const cacheKeys = keys.filter((key) => key.startsWith('cache_'));
            await AsyncStorage.multiRemove(cacheKeys);
        } catch (error) {
            console.error('Error clearing cache:', error);
        }
    }
}

export const offlineManager = new OfflineManager();

// Hook for React components
export function useOffline() {
    const [isOnline, setIsOnline] = React.useState(offlineManager.getIsOnline());
    const [queueSize, setQueueSize] = React.useState(offlineManager.getQueueSize());

    React.useEffect(() => {
        const unsubscribe = offlineManager.subscribe((online) => {
            setIsOnline(online);
            setQueueSize(offlineManager.getQueueSize());
        });

        return unsubscribe;
    }, []);

    return {
        isOnline,
        isOffline: !isOnline,
        queueSize,
        addToQueue: (item: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'retryCount'>) =>
            offlineManager.addToQueue(item),
        cacheData: (key: string, data: any) => offlineManager.cacheData(key, data),
        getCachedData: (key: string, maxAge?: number) => offlineManager.getCachedData(key, maxAge),
    };
}
