import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Coordinates } from './maps';

export interface SearchFilters {
    minPrice?: number;
    maxPrice?: number;
    minSeats?: number;
    departureTimeStart?: string;
    departureTimeEnd?: string;
    preferences?: {
        smoking?: boolean;
        pets?: boolean;
        music?: boolean;
        luggage?: boolean;
    };
    sortBy?: 'price' | 'departure' | 'duration' | 'rating';
    sortOrder?: 'asc' | 'desc';
}

export interface RecentSearch {
    pickup: string;
    pickupCoords?: Coordinates;
    drop: string;
    dropCoords?: Coordinates;
    date?: string;
    timestamp: number;
}

export interface SavedSearch extends RecentSearch {
    id: string;
    name: string;
}

interface SearchStore {
    filters: SearchFilters;
    recentSearches: RecentSearch[];
    savedSearches: SavedSearch[];
    setFilters: (newFilters: Partial<SearchFilters>) => void;
    resetFilters: () => void;
    addRecentSearch: (search: Omit<RecentSearch, 'timestamp'>) => void;
    clearRecentSearches: () => void;
    saveSearch: (search: SavedSearch) => void;
    removeSavedSearch: (id: string) => void;
}

export const useSearchStore = create<SearchStore>()(
    persist(
        (set) => ({
            filters: {},
            recentSearches: [],
            savedSearches: [],

            setFilters: (newFilters: Partial<SearchFilters>) =>
                set((state: SearchStore) => ({
                    filters: { ...state.filters, ...newFilters },
                })),

            resetFilters: () =>
                set({
                    filters: {},
                }),

            addRecentSearch: (search: Omit<RecentSearch, 'timestamp'>) =>
                set((state: SearchStore) => {
                    // Remove duplicate if exists
                    const filtered = state.recentSearches.filter(
                        (s: RecentSearch) => s.pickup === search.pickup && s.drop === search.drop
                    );

                    // Add new search at the beginning
                    const newSearch: RecentSearch = {
                        ...search,
                        timestamp: Date.now(),
                    };

                    return {
                        recentSearches: [newSearch, ...filtered].slice(0, 10), // Keep only last 10
                    };
                }),

            clearRecentSearches: () =>
                set({
                    recentSearches: [],
                }),

            saveSearch: (search: SavedSearch) =>
                set((state: SearchStore) => {
                    const exists = state.savedSearches.some((s: SavedSearch) => s.id === search.id);
                    if (exists) {
                        return state;
                    }
                    return {
                        savedSearches: [...state.savedSearches, search],
                    };
                }),

            removeSavedSearch: (id: string) =>
                set((state: SearchStore) => ({
                    savedSearches: state.savedSearches.filter((s: SavedSearch) => s.id !== id),
                })),
        }),
        {
            name: 'tcsygo-search-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
