import { useState, useEffect, useCallback, useRef } from 'react';
import { queueAction, getPendingActions, removePendingAction, type PendingAction } from './offline-storage';
import { supabase } from './supabase';

interface SyncStatus {
    isSyncing: boolean;
    pendingCount: number;
    lastSyncTime: Date | null;
    errors: Array<{ action: PendingAction; error: string }>;
}

class SyncManager {
    private isSyncing = false;
    private listeners: Set<(status: SyncStatus) => void> = new Set();
    private status: SyncStatus = {
        isSyncing: false,
        pendingCount: 0,
        lastSyncTime: null,
        errors: [],
    };

    constructor() {
        // Auto-sync when coming online
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => {
                this.syncPendingActions();
            });
        }
    }

    subscribe(listener: (status: SyncStatus) => void) {
        this.listeners.add(listener);
        listener(this.status);
        return () => {
            this.listeners.delete(listener);
        };
    }

    private notifyListeners() {
        this.listeners.forEach((listener) => listener(this.status));
    }

    private updateStatus(updates: Partial<SyncStatus>) {
        this.status = { ...this.status, ...updates };
        this.notifyListeners();
    }

    async syncPendingActions() {
        if (this.isSyncing) {
            console.log('Sync already in progress');
            return;
        }

        this.isSyncing = true;
        this.updateStatus({ isSyncing: true, errors: [] });

        try {
            const pendingActions = await getPendingActions();
            this.updateStatus({ pendingCount: pendingActions.length });

            if (pendingActions.length === 0) {
                console.log('No pending actions to sync');
                return;
            }

            console.log(`Syncing ${pendingActions.length} pending actions...`);

            const errors: Array<{ action: PendingAction; error: string }> = [];

            for (const action of pendingActions) {
                try {
                    await this.processAction(action);
                    await removePendingAction(action.id);
                    console.log(`Successfully synced action: ${action.type}`);
                } catch (error: any) {
                    console.error(`Failed to sync action ${action.type}:`, error);
                    errors.push({
                        action,
                        error: error.message || 'Unknown error',
                    });
                }
            }

            const remainingActions = await getPendingActions();
            this.updateStatus({
                pendingCount: remainingActions.length,
                lastSyncTime: new Date(),
                errors,
            });

            if (errors.length === 0) {
                console.log('All pending actions synced successfully');
            } else {
                console.warn(`${errors.length} actions failed to sync`);
            }
        } catch (error) {
            console.error('Error during sync:', error);
        } finally {
            this.isSyncing = false;
            this.updateStatus({ isSyncing: false });
        }
    }

    private async processAction(action: PendingAction): Promise<void> {
        switch (action.type) {
            case 'create_booking':
                return this.syncCreateBooking(action.data);
            case 'cancel_booking':
                return this.syncCancelBooking(action.data);
            case 'update_profile':
                return this.syncUpdateProfile(action.data);
            case 'send_message':
                return this.syncSendMessage(action.data);
            default:
                throw new Error(`Unknown action type: ${action.type}`);
        }
    }

    private async syncCreateBooking(data: any) {
        const { error } = await supabase.from('bookings').insert(data);
        if (error) throw error;
    }

    private async syncCancelBooking(data: any) {
        const { error } = await supabase
            .from('bookings')
            .update({ status: 'cancelled' })
            .eq('id', data.bookingId);
        if (error) throw error;
    }

    private async syncUpdateProfile(data: any) {
        const { error } = await supabase
            .from('users')
            .update(data.updates)
            .eq('id', data.userId);
        if (error) throw error;
    }

    private async syncSendMessage(data: any) {
        const { error } = await supabase.from('messages').insert(data);
        if (error) throw error;
    }

    async getPendingCount(): Promise<number> {
        const actions = await getPendingActions();
        return actions.length;
    }

    getStatus(): SyncStatus {
        return this.status;
    }
}

// Singleton instance
export const syncManager = new SyncManager();

// React hook for using sync manager
export function useSyncManager() {
    const [status, setStatus] = useState<SyncStatus>(syncManager.getStatus());

    useEffect(() => {
        const unsubscribe = syncManager.subscribe(setStatus);
        return unsubscribe;
    }, []);

    const sync = useCallback(async () => {
        await syncManager.syncPendingActions();
    }, []);

    return {
        ...status,
        sync,
    };
}

// Hook for auto-sync on network change
export function useAutoSync(enabled = true) {
    const { sync } = useSyncManager();
    const hasTriedSync = useRef(false);

    useEffect(() => {
        if (!enabled) return;

        const handleOnline = () => {
            console.log('Network online, syncing pending actions...');
            sync();
        };

        // Try to sync on mount if online
        if (navigator.onLine && !hasTriedSync.current) {
            hasTriedSync.current = true;
            sync();
        }

        window.addEventListener('online', handleOnline);

        return () => {
            window.removeEventListener('online', handleOnline);
        };
    }, [enabled, sync]);
}

export default syncManager;
