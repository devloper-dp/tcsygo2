import { supabase } from '@/lib/supabase';

export interface UserPreferences {
  userId: string;
  ridePreferences: {
    acRequired: boolean;
    musicAllowed: boolean;
    petsAllowed: boolean;
    luggageCapacity: number;
    smokingAllowed: boolean;
    conversationLevel: 'silent' | 'minimal' | 'friendly' | 'chatty';
  };
  notificationPreferences: {
    pushNotifications: boolean;
    emailNotifications: boolean;
    smsNotifications: boolean;
    bookingUpdates: boolean;
    promotionalOffers: boolean;
    driverArrival: boolean;
    paymentReminders: boolean;
  };
  appPreferences: {
    language: 'en' | 'hi' | 'mr';
    theme: 'light' | 'dark' | 'system';
    autoPlayMusic: boolean;
    showSpeedLimits: boolean;
    enableVoiceNavigation: boolean;
  };
  privacyPreferences: {
    shareProfilePhoto: boolean;
    shareRideHistory: boolean;
    allowLocationTracking: boolean;
    showOnlineStatus: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SavedPlace {
  id: string;
  userId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: 'home' | 'work' | 'favorite' | 'recent';
  isDefault?: boolean;
  visitCount: number;
  lastVisited?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuickAction {
  id: string;
  type: 'repeat_ride' | 'saved_place' | 'favorite_route' | 'emergency_sos';
  title: string;
  description: string;
  icon: string;
  action: string;
  data?: any;
  isEnabled: boolean;
  sortOrder: number;
}

export interface FavoriteRoute {
  id: string;
  userId: string;
  name: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropAddress: string;
  dropLat: number;
  dropLng: number;
  estimatedDistance: number;
  estimatedDuration: number;
  averageFare: number;
  usageCount: number;
  lastUsed?: string;
  createdAt: string;
  updatedAt: string;
}

export class UserPreferencesService {
  static async getUserPreferences(): Promise<UserPreferences> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      // Return default preferences
      const defaultPrefs: UserPreferences = {
        userId: user.id,
        ridePreferences: {
          acRequired: false,
          musicAllowed: true,
          petsAllowed: false,
          luggageCapacity: 2,
          smokingAllowed: false,
          conversationLevel: 'minimal',
        },
        notificationPreferences: {
          pushNotifications: true,
          emailNotifications: true,
          smsNotifications: false,
          bookingUpdates: true,
          promotionalOffers: true,
          driverArrival: true,
          paymentReminders: true,
        },
        appPreferences: {
          language: 'en',
          theme: 'system',
          autoPlayMusic: false,
          showSpeedLimits: true,
          enableVoiceNavigation: false,
        },
        privacyPreferences: {
          shareProfilePhoto: true,
          shareRideHistory: false,
          allowLocationTracking: true,
          showOnlineStatus: true,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Create default preferences
      await this.createUserPreferences(defaultPrefs);
      return defaultPrefs;
    }

    return data;
  }

  static async createUserPreferences(preferences: UserPreferences): Promise<void> {
    const { error } = await supabase
      .from('user_preferences')
      .insert({
        user_id: preferences.userId,
        ride_preferences: preferences.ridePreferences,
        notification_preferences: preferences.notificationPreferences,
        app_preferences: preferences.appPreferences,
        privacy_preferences: preferences.privacyPreferences,
        created_at: preferences.createdAt,
        updated_at: preferences.updatedAt,
      });

    if (error) throw error;
  }

  static async updateUserPreferences(
    updates: Partial<UserPreferences>
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.ridePreferences) {
      updateData.ride_preferences = updates.ridePreferences;
    }
    if (updates.notificationPreferences) {
      updateData.notification_preferences = updates.notificationPreferences;
    }
    if (updates.appPreferences) {
      updateData.app_preferences = updates.appPreferences;
    }
    if (updates.privacyPreferences) {
      updateData.privacy_preferences = updates.privacyPreferences;
    }

    const { error } = await supabase
      .from('user_preferences')
      .update(updateData)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  static async getSavedPlaces(): Promise<SavedPlace[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('saved_places')
      .select('*')
      .eq('user_id', user.id)
      .order('visit_count', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async addSavedPlace(place: {
    name: string;
    address: string;
    lat: number;
    lng: number;
    type: 'home' | 'work' | 'favorite' | 'recent';
    isDefault?: boolean;
  }): Promise<SavedPlace> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // If setting as default for type, unset other default
    if (place.isDefault) {
      await supabase
        .from('saved_places')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .eq('type', place.type);
    }

    const { data, error } = await supabase
      .from('saved_places')
      .insert({
        user_id: user.id,
        name: place.name,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
        type: place.type,
        is_default: place.isDefault || false,
        visit_count: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateSavedPlace(
    id: string,
    updates: Partial<SavedPlace>
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // If setting as default for type, unset other default
    if (updates.isDefault && updates.type) {
      await supabase
        .from('saved_places')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .eq('type', updates.type)
        .neq('id', id);
    }

    const { error } = await supabase
      .from('saved_places')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  static async deleteSavedPlace(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('saved_places')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  static async incrementPlaceVisit(id: string): Promise<void> {
    const { error } = await supabase.rpc('increment_place_visit', {
      place_id: id,
    });

    if (error) throw error;
  }

  static async getFavoriteRoutes(): Promise<FavoriteRoute[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('favorite_routes')
      .select('*')
      .eq('user_id', user.id)
      .order('usage_count', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async addFavoriteRoute(route: {
    name: string;
    pickupAddress: string;
    pickupLat: number;
    pickupLng: number;
    dropAddress: string;
    dropLat: number;
    dropLng: number;
    estimatedDistance: number;
    estimatedDuration: number;
    averageFare: number;
  }): Promise<FavoriteRoute> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('favorite_routes')
      .insert({
        user_id: user.id,
        name: route.name,
        pickup_address: route.pickupAddress,
        pickup_lat: route.pickupLat,
        pickup_lng: route.pickupLng,
        drop_address: route.dropAddress,
        drop_lat: route.dropLat,
        drop_lng: route.dropLng,
        estimated_distance: route.estimatedDistance,
        estimated_duration: route.estimatedDuration,
        average_fare: route.averageFare,
        usage_count: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async incrementRouteUsage(id: string): Promise<void> {
    const { error } = await supabase.rpc('increment_route_usage', {
      route_id: id,
    });

    if (error) throw error;
  }

  static async getQuickActions(): Promise<QuickAction[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Get user's recent trips for repeat ride action
    const { data: recentTrips } = await supabase
      .from('trips')
      .select('bookings(pickup_location, pickup_lat, pickup_lng, drop_location, drop_lat, drop_lng)')
      .eq('driver_id', user.id)
      .or('status.eq.completed,status.eq.ongoing')
      .order('created_at', { ascending: false })
      .limit(1);

    // Get saved places
    const savedPlaces = await this.getSavedPlaces();

    // Get favorite routes
    const favoriteRoutes = await this.getFavoriteRoutes();

    const recentTripBooking = recentTrips?.[0]?.bookings as any;

    const quickActions: QuickAction[] = [
      {
        id: 'repeat-ride',
        type: 'repeat_ride',
        title: 'Repeat Last Ride',
        description: 'Book the same route again',
        icon: 'repeat',
        action: 'repeat_ride',
        data: recentTripBooking || null,
        isEnabled: !!recentTripBooking,
        sortOrder: 1,
      },
      {
        id: 'go-home',
        type: 'saved_place',
        title: 'Go Home',
        description: 'Book a ride to home',
        icon: 'home',
        action: 'book_to_saved_place',
        data: savedPlaces.find(p => p.type === 'home' && p.isDefault),
        isEnabled: !!savedPlaces.find(p => p.type === 'home'),
        sortOrder: 2,
      },
      {
        id: 'go-to-work',
        type: 'saved_place',
        title: 'Go to Work',
        description: 'Book a ride to work',
        icon: 'briefcase',
        action: 'book_to_saved_place',
        data: savedPlaces.find(p => p.type === 'work' && p.isDefault),
        isEnabled: !!savedPlaces.find(p => p.type === 'work'),
        sortOrder: 3,
      },
      {
        id: 'emergency-sos',
        type: 'emergency_sos',
        title: 'Emergency SOS',
        description: 'Trigger emergency alert',
        icon: 'shield',
        action: 'trigger_sos',
        isEnabled: true,
        sortOrder: 4,
      },
    ];

    // Add favorite routes as quick actions
    favoriteRoutes.slice(0, 2).forEach((route, index) => {
      quickActions.push({
        id: `favorite-route-${route.id}`,
        type: 'favorite_route',
        title: route.name,
        description: `${route.pickupAddress} → ${route.dropAddress}`,
        icon: 'star',
        action: 'book_favorite_route',
        data: route,
        isEnabled: true,
        sortOrder: 5 + index,
      });
    });

    return quickActions.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  static async executeQuickAction(action: QuickAction): Promise<any> {
    switch (action.action) {
      case 'repeat_ride':
        // action.data already points to the bookings object structure now (or whatever we put in 'data')
        // In getQuickActions, we put 'recentTripBooking' into 'data'.
        // So action.data IS the booking info.
        if (!action.data) throw new Error('No trip data available');
        return {
          type: 'navigate',
          destination: '/search',
          params: {
            pickup: action.data.pickup_location,
            pickupLat: action.data.pickup_lat,
            pickupLng: action.data.pickup_lng,
            drop: action.data.drop_location,
            dropLat: action.data.drop_lat,
            dropLng: action.data.drop_lng,
          },
        };

      case 'book_to_saved_place':
        if (!action.data) throw new Error('No saved place data available');
        return {
          type: 'navigate',
          destination: '/search',
          params: {
            drop: action.data.address,
            dropLat: action.data.lat,
            dropLng: action.data.lng,
          },
        };

      case 'book_favorite_route':
        if (!action.data) throw new Error('No favorite route data available');
        return {
          type: 'navigate',
          destination: '/search',
          params: {
            pickup: action.data.pickup_address,
            pickupLat: action.data.pickup_lat,
            pickupLng: action.data.pickup_lng,
            drop: action.data.drop_address,
            dropLat: action.data.drop_lat,
            dropLng: action.data.drop_lng,
          },
        };

      case 'trigger_sos':
        return {
          type: 'sos',
          action: 'trigger_emergency_alert',
        };

      default:
        throw new Error(`Unknown quick action: ${action.action}`);
    }
  }

  static async getRecentSearches(limit: number = 10): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('recent_searches')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  static async addRecentSearch(search: {
    pickup: string;
    pickupLat?: number;
    pickupLng?: number;
    drop: string;
    dropLat?: number;
    dropLng?: number;
  }): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('recent_searches')
      .upsert({
        user_id: user.id,
        pickup: search.pickup,
        pickup_lat: search.pickupLat,
        pickup_lng: search.pickupLng,
        drop: search.drop,
        drop_lat: search.dropLat,
        drop_lng: search.dropLng,
        created_at: new Date().toISOString(),
      });
  }

  static async clearRecentSearches(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('recent_searches')
      .delete()
      .eq('user_id', user.id);
  }
}

// React hook for user preferences
export function useUserPreferences() {
  const getPreferences = async () => {
    return await UserPreferencesService.getUserPreferences();
  };

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    return await UserPreferencesService.updateUserPreferences(updates);
  };

  const getSavedPlaces = async () => {
    return await UserPreferencesService.getSavedPlaces();
  };

  const addSavedPlace = async (place: {
    name: string;
    address: string;
    lat: number;
    lng: number;
    type: 'home' | 'work' | 'favorite' | 'recent';
    isDefault?: boolean;
  }) => {
    return await UserPreferencesService.addSavedPlace(place);
  };

  const updateSavedPlace = async (id: string, updates: Partial<SavedPlace>) => {
    return await UserPreferencesService.updateSavedPlace(id, updates);
  };

  const deleteSavedPlace = async (id: string) => {
    return await UserPreferencesService.deleteSavedPlace(id);
  };

  const getFavoriteRoutes = async () => {
    return await UserPreferencesService.getFavoriteRoutes();
  };

  const addFavoriteRoute = async (route: {
    name: string;
    pickupAddress: string;
    pickupLat: number;
    pickupLng: number;
    dropAddress: string;
    dropLat: number;
    dropLng: number;
    estimatedDistance: number;
    estimatedDuration: number;
    averageFare: number;
  }) => {
    return await UserPreferencesService.addFavoriteRoute(route);
  };

  const getQuickActions = async () => {
    return await UserPreferencesService.getQuickActions();
  };

  const executeQuickAction = async (action: QuickAction) => {
    return await UserPreferencesService.executeQuickAction(action);
  };

  const getRecentSearches = async (limit?: number) => {
    return await UserPreferencesService.getRecentSearches(limit);
  };

  const addRecentSearch = async (search: {
    pickup: string;
    pickupLat?: number;
    pickupLng?: number;
    drop: string;
    dropLat?: number;
    dropLng?: number;
  }) => {
    return await UserPreferencesService.addRecentSearch(search);
  };

  const clearRecentSearches = async () => {
    return await UserPreferencesService.clearRecentSearches();
  };

  return {
    getPreferences,
    updatePreferences,
    getSavedPlaces,
    addSavedPlace,
    updateSavedPlace,
    deleteSavedPlace,
    getFavoriteRoutes,
    addFavoriteRoute,
    getQuickActions,
    executeQuickAction,
    getRecentSearches,
    addRecentSearch,
    clearRecentSearches,
  };
}
