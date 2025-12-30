import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Location } from '@/lib/geofence';

interface LocationUpdate {
    lat: number;
    lng: number;
    heading?: number;
    speed?: number;
    timestamp: Date;
}

interface UseRealTimeLocationOptions {
    tripId: string;
    driverId?: string;
    enabled?: boolean;
}

export function useRealTimeLocation({
    tripId,
    driverId,
    enabled = true,
}: UseRealTimeLocationOptions) {
    const [location, setLocation] = useState<LocationUpdate | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Fetch initial location
    const fetchLocation = useCallback(async () => {
        if (!enabled) return;

        try {
            setIsLoading(true);
            const { data, error: fetchError } = await supabase
                .from('live_locations')
                .select('*')
                .eq('trip_id', tripId)
                .order('updated_at', { ascending: false })
                .limit(1)
                .single();

            if (fetchError) throw fetchError;

            if (data) {
                setLocation({
                    lat: parseFloat(data.lat),
                    lng: parseFloat(data.lng),
                    heading: data.heading ? parseFloat(data.heading) : undefined,
                    speed: data.speed ? parseFloat(data.speed) : undefined,
                    timestamp: new Date(data.updated_at),
                });
            }
        } catch (err) {
            setError(err as Error);
        } finally {
            setIsLoading(false);
        }
    }, [tripId, enabled]);

    // Subscribe to real-time updates
    useEffect(() => {
        if (!enabled) return;

        fetchLocation();

        const channel = supabase
            .channel(`location:${tripId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'live_locations',
                    filter: `trip_id=eq.${tripId}`,
                },
                (payload) => {
                    if (payload.new) {
                        const newData = payload.new as any;
                        setLocation({
                            lat: parseFloat(newData.lat),
                            lng: parseFloat(newData.lng),
                            heading: newData.heading ? parseFloat(newData.heading) : undefined,
                            speed: newData.speed ? parseFloat(newData.speed) : undefined,
                            timestamp: new Date(newData.updated_at),
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [tripId, enabled, fetchLocation]);

    // Update location (for drivers)
    const updateLocation = useCallback(
        async (newLocation: Location & { heading?: number; speed?: number }) => {
            if (!driverId) {
                console.warn('Driver ID required to update location');
                return;
            }

            try {
                const { error: updateError } = await supabase
                    .from('live_locations')
                    .upsert({
                        trip_id: tripId,
                        driver_id: driverId,
                        lat: newLocation.lat,
                        lng: newLocation.lng,
                        heading: newLocation.heading,
                        speed: newLocation.speed,
                        updated_at: new Date().toISOString(),
                    });

                if (updateError) throw updateError;
            } catch (err) {
                console.error('Error updating location:', err);
                setError(err as Error);
            }
        },
        [tripId, driverId]
    );

    return {
        location,
        isLoading,
        error,
        updateLocation,
        refetch: fetchLocation,
    };
}
