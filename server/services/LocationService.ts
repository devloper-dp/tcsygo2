import { supabase } from './supabase';
import { eventBus } from './EventBus';
import { InsertLiveLocation, LiveLocation } from '@shared/schema';

export class LocationService {
  async updateLocation(locationData: InsertLiveLocation): Promise<LiveLocation> {
    const { data: existing } = await supabase
      .from('live_locations')
      .select('id')
      .eq('trip_id', locationData.tripId)
      .eq('driver_id', locationData.driverId)
      .single();

    if (existing) {
      const { data, error } = await supabase
        .from('live_locations')
        .update({
          lat: locationData.lat,
          lng: locationData.lng,
          heading: locationData.heading,
          speed: locationData.speed,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw new Error(error.message);

      eventBus.emit('location:updated', locationData.tripId, {
        lat: parseFloat(locationData.lat),
        lng: parseFloat(locationData.lng),
      });

      return data;
    } else {
      const { data, error } = await supabase
        .from('live_locations')
        .insert(locationData)
        .select()
        .single();

      if (error) throw new Error(error.message);

      eventBus.emit('location:updated', locationData.tripId, {
        lat: parseFloat(locationData.lat),
        lng: parseFloat(locationData.lng),
      });

      return data;
    }
  }

  async getLocationByTrip(tripId: string): Promise<LiveLocation | null> {
    const { data, error } = await supabase
      .from('live_locations')
      .select('*')
      .eq('trip_id', tripId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }

    return data;
  }

  async subscribeToTripLocation(tripId: string, callback: (location: LiveLocation) => void) {
    return supabase
      .channel(`trip-${tripId}-location`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_locations',
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          callback(payload.new as LiveLocation);
        }
      )
      .subscribe();
  }
}

export const locationService = new LocationService();
