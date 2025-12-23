import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SearchHistoryItem {
    id: string;
    pickup: string;
    drop: string;
    pickupLat?: number;
    pickupLng?: number;
    dropLat?: number;
    dropLng?: number;
    timestamp: string;
}

interface SearchState {
    history: SearchHistoryItem[];
    addSearch: (search: Omit<SearchHistoryItem, 'id' | 'timestamp'>) => void;
    removeSearch: (id: string) => void;
    clearHistory: () => void;
}

export const useSearchStore = create<SearchState>()(
    persist(
        (set) => ({
            history: [],
            addSearch: (search) => set((state) => {
                const newItem: SearchHistoryItem = {
                    ...search,
                    id: Math.random().toString(36).substring(7),
                    timestamp: new Date().toISOString(),
                };
                // Keep only unique searches based on pickup/drop and limit to 10
                const filtered = state.history.filter(
                    (h) => !(h.pickup === search.pickup && h.drop === search.drop)
                );
                return {
                    history: [newItem, ...filtered].slice(0, 10),
                };
            }),
            removeSearch: (id) => set((state) => ({
                history: state.history.filter((h) => h.id !== id),
            })),
            clearHistory: () => set({ history: [] }),
        }),
        {
            name: 'tcsygo-search-history',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
