import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { db, DatabaseService } from '@/lib/database-service';
import type {
    Trip,
    Booking,
    Driver,
    User,
    WalletTransaction,
    SavedPlace,
    EmergencyContact,
    RidePreference,
    Notification,
    QueryOptions,
} from '@/types/supabase-types';
import { useToast } from './use-toast';

/**
 * React Query Hooks for Database Operations
 * Provides type-safe hooks with automatic caching and refetching
 */

// ============================================================================
// Query Keys
// ============================================================================

export const queryKeys = {
    users: {
        all: ['users'] as const,
        detail: (id: string) => ['users', id] as const,
        byEmail: (email: string) => ['users', 'email', email] as const,
    },
    drivers: {
        all: ['drivers'] as const,
        detail: (id: string) => ['drivers', id] as const,
        byUser: (userId: string) => ['drivers', 'user', userId] as const,
        pending: ['drivers', 'pending'] as const,
    },
    trips: {
        all: ['trips'] as const,
        detail: (id: string) => ['trips', id] as const,
        byDriver: (driverId: string) => ['trips', 'driver', driverId] as const,
        active: ['trips', 'active'] as const,
    },
    bookings: {
        all: ['bookings'] as const,
        detail: (id: string) => ['bookings', id] as const,
        byPassenger: (passengerId: string) => ['bookings', 'passenger', passengerId] as const,
        byTrip: (tripId: string) => ['bookings', 'trip', tripId] as const,
    },
    wallets: {
        byUser: (userId: string) => ['wallets', 'user', userId] as const,
        transactions: (userId: string) => ['wallet-transactions', userId] as const,
    },
    notifications: {
        byUser: (userId: string, unreadOnly?: boolean) =>
            ['notifications', userId, unreadOnly ? 'unread' : 'all'] as const,
    },
    savedPlaces: {
        byUser: (userId: string) => ['saved-places', userId] as const,
    },
    emergencyContacts: {
        byUser: (userId: string) => ['emergency-contacts', userId] as const,
    },
    ridePreferences: {
        byUser: (userId: string) => ['ride-preferences', userId] as const,
    },
};

// ============================================================================
// User Hooks
// ============================================================================

export function useUser(userId: string, options?: Omit<UseQueryOptions<User, Error>, 'queryKey' | 'queryFn'>) {
    return useQuery({
        queryKey: queryKeys.users.detail(userId),
        queryFn: async (): Promise<User> => {
            const { data, error } = await db.users.getById(userId);
            if (error) throw error;
            return data as User;
        },
        ...options,
    });
}

export function useUserByEmail(email: string, options?: Omit<UseQueryOptions<User, Error>, 'queryKey' | 'queryFn'>) {
    return useQuery({
        queryKey: queryKeys.users.byEmail(email),
        queryFn: async (): Promise<User> => {
            const data = await db.users.getByEmail(email);
            return data as User;
        },
        ...options,
    });
}

// ============================================================================
// Driver Hooks
// ============================================================================

export function useDriver(driverId: string, options?: Omit<UseQueryOptions<Driver, Error>, 'queryKey' | 'queryFn'>) {
    return useQuery({
        queryKey: queryKeys.drivers.detail(driverId),
        queryFn: async (): Promise<Driver> => {
            const { data, error } = await db.drivers.getById(driverId);
            if (error) throw error;
            return data as Driver;
        },
        ...options,
    });
}

export function useDriverByUserId(userId: string, options?: Omit<UseQueryOptions<Driver, Error>, 'queryKey' | 'queryFn'>) {
    return useQuery({
        queryKey: queryKeys.drivers.byUser(userId),
        queryFn: async (): Promise<Driver> => {
            const data = await db.drivers.getByUserId(userId);
            return data as Driver;
        },
        ...options,
    });
}

export function usePendingDrivers(options?: Omit<UseQueryOptions<Driver[], Error>, 'queryKey' | 'queryFn'>) {
    return useQuery({
        queryKey: queryKeys.drivers.pending,
        queryFn: async (): Promise<Driver[]> => {
            const { data, error } = await db.drivers.getPending();
            if (error) throw error;
            return (data || []) as Driver[];
        },
        ...options,
    });
}

// ============================================================================
// Trip Hooks
// ============================================================================

export function useTrip(tripId: string, options?: Omit<UseQueryOptions<Trip, Error>, 'queryKey' | 'queryFn'>) {
    return useQuery({
        queryKey: queryKeys.trips.detail(tripId),
        queryFn: async (): Promise<Trip> => {
            const { data, error } = await db.trips.getById(tripId);
            if (error) throw error;
            return data as Trip;
        },
        ...options,
    });
}

export function useDriverTrips(driverId: string, options?: Omit<UseQueryOptions<Trip[], Error>, 'queryKey' | 'queryFn'>) {
    return useQuery({
        queryKey: queryKeys.trips.byDriver(driverId),
        queryFn: async (): Promise<Trip[]> => {
            const { data, error } = await db.trips.getByDriver(driverId);
            if (error) throw error;
            return (data || []) as Trip[];
        },
        ...options,
    });
}

export function useActiveTrips(options?: Omit<UseQueryOptions<Trip[], Error>, 'queryKey' | 'queryFn'>) {
    return useQuery({
        queryKey: queryKeys.trips.active,
        queryFn: async (): Promise<Trip[]> => {
            const { data, error } = await db.trips.getActive();
            if (error) throw error;
            return (data || []) as Trip[];
        },
        ...options,
    });
}

export function useTrips(queryOptions?: QueryOptions<Trip>, options?: Omit<UseQueryOptions<Trip[], Error>, 'queryKey' | 'queryFn'>) {
    return useQuery({
        queryKey: [...queryKeys.trips.all, queryOptions],
        queryFn: async () => {
            const { data, error } = await DatabaseService.query<Trip>('trips', queryOptions);
            if (error) throw error;
            return data || [];
        },
        ...options,
    });
}

// ============================================================================
// Booking Hooks
// ============================================================================

export function useBooking(bookingId: string, options?: Omit<UseQueryOptions<Booking, Error>, 'queryKey' | 'queryFn'>) {
    return useQuery({
        queryKey: queryKeys.bookings.detail(bookingId),
        queryFn: async (): Promise<Booking> => {
            const { data, error } = await db.bookings.getById(bookingId);
            if (error) throw error;
            return data as Booking;
        },
        ...options,
    });
}

export function usePassengerBookings(passengerId: string, options?: Omit<UseQueryOptions<Booking[], Error>, 'queryKey' | 'queryFn'>) {
    return useQuery({
        queryKey: queryKeys.bookings.byPassenger(passengerId),
        queryFn: async (): Promise<Booking[]> => {
            const { data, error } = await db.bookings.getByPassenger(passengerId);
            if (error) throw error;
            return (data || []) as Booking[];
        },
        ...options,
    });
}

export function useTripBookings(tripId: string, options?: Omit<UseQueryOptions<Booking[], Error>, 'queryKey' | 'queryFn'>) {
    return useQuery({
        queryKey: queryKeys.bookings.byTrip(tripId),
        queryFn: async (): Promise<Booking[]> => {
            const { data, error } = await db.bookings.getByTrip(tripId);
            if (error) throw error;
            return (data || []) as Booking[];
        },
        ...options,
    });
}

// ============================================================================
// Wallet Hooks
// ============================================================================

export function useWallet(userId: string, options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>) {
    return useQuery({
        queryKey: queryKeys.wallets.byUser(userId),
        queryFn: async () => {
            const data = await db.wallets.getByUserId(userId);
            return data;
        },
        ...options,
    });
}

export function useWalletTransactions(userId: string, options?: Omit<UseQueryOptions<WalletTransaction[], Error>, 'queryKey' | 'queryFn'>) {
    return useQuery({
        queryKey: queryKeys.wallets.transactions(userId),
        queryFn: async () => {
            const { data, error } = await DatabaseService.query<WalletTransaction>(
                'wallet_transactions',
                {
                    filters: [{ column: 'user_id', operator: 'eq', value: userId }],
                    orderBy: { column: 'created_at', ascending: false },
                }
            );
            if (error) throw error;
            return data || [];
        },
        ...options,
    });
}

// ============================================================================
// Notification Hooks
// ============================================================================

export function useNotifications(
    userId: string,
    unreadOnly = false,
    options?: Omit<UseQueryOptions<Notification[], Error>, 'queryKey' | 'queryFn'>
) {
    return useQuery({
        queryKey: queryKeys.notifications.byUser(userId, unreadOnly),
        queryFn: async (): Promise<Notification[]> => {
            const { data, error } = await db.notifications.getByUserId(userId, unreadOnly);
            if (error) throw error;
            return (data || []) as Notification[];
        },
        ...options,
    });
}

// ============================================================================
// Saved Places Hooks
// ============================================================================

export function useSavedPlaces(userId: string, options?: Omit<UseQueryOptions<SavedPlace[], Error>, 'queryKey' | 'queryFn'>) {
    return useQuery({
        queryKey: queryKeys.savedPlaces.byUser(userId),
        queryFn: async (): Promise<SavedPlace[]> => {
            const { data, error } = await db.savedPlaces.getByUserId(userId);
            if (error) throw error;
            return (data || []) as SavedPlace[];
        },
        ...options,
    });
}

// ============================================================================
// Emergency Contacts Hooks
// ============================================================================

export function useEmergencyContacts(userId: string, options?: Omit<UseQueryOptions<EmergencyContact[], Error>, 'queryKey' | 'queryFn'>) {
    return useQuery({
        queryKey: queryKeys.emergencyContacts.byUser(userId),
        queryFn: async (): Promise<EmergencyContact[]> => {
            const { data, error } = await db.emergencyContacts.getByUserId(userId);
            if (error) throw error;
            return (data || []) as EmergencyContact[];
        },
        ...options,
    });
}

// ============================================================================
// Ride Preferences Hooks
// ============================================================================

export function useRidePreferences(userId: string, options?: Omit<UseQueryOptions<RidePreference | null, Error>, 'queryKey' | 'queryFn'>) {
    return useQuery({
        queryKey: queryKeys.ridePreferences.byUser(userId),
        queryFn: async () => {
            const { data, error } = await DatabaseService.query<RidePreference>(
                'ride_preferences',
                {
                    filters: [{ column: 'user_id', operator: 'eq', value: userId }],
                }
            );
            if (error) throw error;
            return data?.[0] || null;
        },
        ...options,
    });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

export function useCreateTrip() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (trip: Partial<Trip>) => {
            const { data, error } = await db.trips.create(trip);
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.trips.all });
            toast({
                title: 'Trip created',
                description: 'Your trip has been created successfully',
            });
        },
        onError: (error: any) => {
            toast({
                title: 'Error creating trip',
                description: error.message || 'Failed to create trip',
                variant: 'destructive',
            });
        },
    });
}

export function useUpdateTrip() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<Trip> }) => {
            const { data, error } = await db.trips.update(id, updates);
            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.trips.all });
            if ((data as Trip)?.id) {
                queryClient.invalidateQueries({ queryKey: queryKeys.trips.detail((data as Trip).id) });
            }
            toast({
                title: 'Trip updated',
                description: 'Trip has been updated successfully',
            });
        },
        onError: (error: any) => {
            toast({
                title: 'Error updating trip',
                description: error.message || 'Failed to update trip',
                variant: 'destructive',
            });
        },
    });
}

export function useCreateBooking() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (booking: Partial<Booking>) => {
            const { data, error } = await db.bookings.create(booking);
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
            toast({
                title: 'Booking created',
                description: 'Your booking has been created successfully',
            });
        },
        onError: (error: any) => {
            toast({
                title: 'Error creating booking',
                description: error.message || 'Failed to create booking',
                variant: 'destructive',
            });
        },
    });
}

export function useUpdateBooking() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<Booking> }) => {
            const { data, error } = await db.bookings.update(id, updates);
            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
            if ((data as Booking)?.id) {
                queryClient.invalidateQueries({ queryKey: queryKeys.bookings.detail((data as Booking).id) });
            }
        },
        onError: (error: any) => {
            toast({
                title: 'Error updating booking',
                description: error.message || 'Failed to update booking',
                variant: 'destructive',
            });
        },
    });
}

export function useMarkNotificationAsRead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (notificationId: string) => {
            const { data, error } = await db.notifications.markAsRead(notificationId);
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
}

export function useMarkAllNotificationsAsRead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (userId: string) => {
            const { data, error } = await db.notifications.markAllAsRead(userId);
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
}

export function useCreateSavedPlace() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (place: Partial<SavedPlace>) => {
            const { data, error } = await db.savedPlaces.create(place);
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['saved-places'] });
            toast({
                title: 'Place saved',
                description: 'Location has been saved successfully',
            });
        },
        onError: (error: any) => {
            toast({
                title: 'Error saving place',
                description: error.message || 'Failed to save location',
                variant: 'destructive',
            });
        },
    });
}

export function useDeleteSavedPlace() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (placeId: string) => {
            const { success, error } = await db.savedPlaces.delete(placeId);
            if (error) throw error;
            return success;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['saved-places'] });
            toast({
                title: 'Place deleted',
                description: 'Location has been removed',
            });
        },
        onError: (error: any) => {
            toast({
                title: 'Error deleting place',
                description: error.message || 'Failed to delete location',
                variant: 'destructive',
            });
        },
    });
}

export function useCreateEmergencyContact() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (contact: Partial<EmergencyContact>) => {
            const { data, error } = await db.emergencyContacts.create(contact);
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['emergency-contacts'] });
            toast({
                title: 'Contact added',
                description: 'Emergency contact has been added',
            });
        },
        onError: (error: any) => {
            toast({
                title: 'Error adding contact',
                description: error.message || 'Failed to add emergency contact',
                variant: 'destructive',
            });
        },
    });
}

export function useDeleteEmergencyContact() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (contactId: string) => {
            const { success, error } = await db.emergencyContacts.delete(contactId);
            if (error) throw error;
            return success;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['emergency-contacts'] });
            toast({
                title: 'Contact deleted',
                description: 'Emergency contact has been removed',
            });
        },
        onError: (error: any) => {
            toast({
                title: 'Error deleting contact',
                description: error.message || 'Failed to delete contact',
                variant: 'destructive',
            });
        },
    });
}
