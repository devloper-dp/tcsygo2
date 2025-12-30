import { supabase } from '@/lib/supabase';

export interface SurgeZone {
    id: string;
    zone_name: string;
    current_multiplier: number;
    demand_level: 'low' | 'medium' | 'high' | 'very_high';
    is_active: boolean;
    coordinates: Array<{ lat: number; lng: number }>;
}

export interface SurgePricingUpdate {
    multiplier: number;
    reason: string;
    zoneId?: string;
    zoneName?: string;
}

export const SurgePricingService = {
    /**
     * Get current surge multiplier for a location
     */
    getSurgeMultiplier: async (
        latitude: number,
        longitude: number
    ): Promise<SurgePricingUpdate> => {
        try {
            // Get all active surge zones
            const { data: zones, error } = await supabase
                .from('surge_pricing_zones')
                .select('*')
                .eq('is_active', true)
                .order('current_multiplier', { ascending: false });

            if (error) throw error;

            // Check if location is in any surge zone
            if (zones && zones.length > 0) {
                for (const zone of zones) {
                    if (SurgePricingService.isPointInZone(latitude, longitude, zone.coordinates)) {
                        return {
                            multiplier: zone.current_multiplier,
                            reason: `${zone.demand_level.charAt(0).toUpperCase() + zone.demand_level.slice(1)} Demand in ${zone.zone_name}`,
                            zoneId: zone.id,
                            zoneName: zone.zone_name,
                        };
                    }
                }
            }

            // Fallback to time-based surge
            return SurgePricingService.getTimeBasedSurge();
        } catch (error) {
            console.error('Error getting surge multiplier:', error);
            return SurgePricingService.getTimeBasedSurge();
        }
    },

    /**
     * Check if a point is inside a polygon zone
     */
    isPointInZone: (
        lat: number,
        lng: number,
        polygon: Array<{ lat: number; lng: number }>
    ): boolean => {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].lng;
            const yi = polygon[i].lat;
            const xj = polygon[j].lng;
            const yj = polygon[j].lat;

            const intersect =
                yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
            if (intersect) inside = !inside;
        }
        return inside;
    },

    /**
     * Get time-based surge pricing
     */
    getTimeBasedSurge: (): SurgePricingUpdate => {
        const hour = new Date().getHours();
        const day = new Date().getDay();

        // Peak morning hours (8-10 AM)
        if (hour >= 8 && hour < 10) {
            return {
                multiplier: 1.5,
                reason: 'Morning Peak Hours',
            };
        }

        // Peak evening hours (5-8 PM)
        if (hour >= 17 && hour < 20) {
            return {
                multiplier: 1.6,
                reason: 'Evening Peak Hours',
            };
        }

        // Late night (11 PM - 5 AM)
        if (hour >= 23 || hour < 5) {
            return {
                multiplier: 1.3,
                reason: 'Late Night Hours',
            };
        }

        // Weekend surge
        if (day === 0 || day === 6) {
            return {
                multiplier: 1.2,
                reason: 'Weekend',
            };
        }

        // Normal pricing
        return {
            multiplier: 1.0,
            reason: '',
        };
    },

    /**
     * Update surge pricing for a zone
     */
    updateSurgeZone: async (
        zoneId: string,
        multiplier: number,
        demandLevel: 'low' | 'medium' | 'high' | 'very_high'
    ): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('surge_pricing_zones')
                .update({
                    current_multiplier: multiplier,
                    demand_level: demandLevel,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', zoneId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error updating surge zone:', error);
            return false;
        }
    },

    /**
     * Calculate dynamic surge based on demand
     */
    calculateDynamicSurge: async (
        latitude: number,
        longitude: number,
        radius: number = 5000 // 5km radius
    ): Promise<number> => {
        try {
            // Get active bookings in the area
            const { data: bookings, error: bookingsError } = await supabase
                .from('bookings')
                .select('*')
                .in('status', ['pending', 'accepted', 'started'])
                .gte('created_at', new Date(Date.now() - 30 * 60000).toISOString()); // Last 30 minutes

            if (bookingsError) throw bookingsError;

            // Get available drivers in the area
            const { data: drivers, error: driversError } = await supabase
                .from('drivers')
                .select('*')
                .eq('is_available', true)
                .eq('verification_status', 'verified');

            if (driversError) throw driversError;

            // Calculate demand/supply ratio
            const demandCount = bookings?.length || 0;
            const supplyCount = drivers?.length || 0;

            if (supplyCount === 0) return 2.0; // Maximum surge if no drivers

            const ratio = demandCount / supplyCount;

            // Calculate surge multiplier based on ratio
            if (ratio >= 3) return 2.0; // Very high demand
            if (ratio >= 2) return 1.8; // High demand
            if (ratio >= 1.5) return 1.5; // Medium-high demand
            if (ratio >= 1) return 1.3; // Medium demand
            if (ratio >= 0.5) return 1.1; // Low-medium demand

            return 1.0; // Normal pricing
        } catch (error) {
            console.error('Error calculating dynamic surge:', error);
            return 1.0;
        }
    },

    /**
     * Get all active surge zones
     */
    getActiveSurgeZones: async (): Promise<SurgeZone[]> => {
        try {
            const { data, error } = await supabase
                .from('surge_pricing_zones')
                .select('*')
                .eq('is_active', true)
                .order('current_multiplier', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting active surge zones:', error);
            return [];
        }
    },

    /**
     * Create a new surge zone
     */
    createSurgeZone: async (
        zoneName: string,
        coordinates: Array<{ lat: number; lng: number }>,
        multiplier: number,
        demandLevel: 'low' | 'medium' | 'high' | 'very_high'
    ): Promise<string | null> => {
        try {
            const { data, error } = await supabase
                .from('surge_pricing_zones')
                .insert({
                    zone_name: zoneName,
                    coordinates,
                    current_multiplier: multiplier,
                    demand_level: demandLevel,
                    is_active: true,
                })
                .select()
                .single();

            if (error) throw error;
            return data.id;
        } catch (error) {
            console.error('Error creating surge zone:', error);
            return null;
        }
    },

    /**
     * Deactivate a surge zone
     */
    deactivateSurgeZone: async (zoneId: string): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('surge_pricing_zones')
                .update({ is_active: false })
                .eq('id', zoneId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deactivating surge zone:', error);
            return false;
        }
    },
};
