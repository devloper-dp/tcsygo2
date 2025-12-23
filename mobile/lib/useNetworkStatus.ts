import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from './supabase';
import { getPendingActions, removePendingAction, PendingAction } from './offline-storage';

export function useNetworkStatus() {
    const [isConnected, setIsConnected] = useState<boolean | null>(true);
    const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(true);

    useEffect(() => {
        // Subscribe to network state updates
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsConnected(state.isConnected);
            setIsInternetReachable(state.isInternetReachable);

            // If connection is restored, sync pending actions
            if (state.isConnected && state.isInternetReachable) {
                syncPendingActions();
            }
        });

        return () => unsubscribe();
    }, []);

    const syncPendingActions = async () => {
        try {
            const pending = await getPendingActions();

            for (const action of pending) {
                try {
                    await executeAction(action);
                    await removePendingAction(action.id);
                } catch (error) {
                    console.error('Failed to sync action:', action.type, error);
                    // Keep action in queue for next sync attempt
                }
            }
        } catch (error) {
            console.error('Error syncing pending actions:', error);
        }
    };

    const executeAction = async (action: PendingAction) => {
        switch (action.type) {
            case 'create_booking':
                await supabase.from('bookings').insert(action.data);
                break;
            case 'cancel_booking':
                await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', action.data.bookingId);
                break;
            case 'update_profile':
                await supabase.from('users').update(action.data).eq('id', action.data.userId);
                break;
            case 'send_message':
                await supabase.from('messages').insert(action.data);
                break;
            default:
                console.warn('Unknown action type:', action.type);
        }
    };

    return {
        isConnected,
        isInternetReachable,
        isOnline: isConnected && isInternetReachable,
        syncPendingActions,
    };
}
