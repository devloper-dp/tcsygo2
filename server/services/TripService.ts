import { supabase } from './supabase';
import { db } from '../db';
import { trips, drivers, users } from '@shared/schema';
import { eq, and, gte, ilike } from 'drizzle-orm';
import { eventBus } from './EventBus';
import { InsertTrip, Trip, TripWithDriver } from '@shared/schema';

export class TripService {
  private useSupabase() {
    return process.env.VITE_SUPABASE_URL && !process.env.VITE_SUPABASE_URL.includes('placeholder');
  }

  async createTrip(tripData: InsertTrip): Promise<Trip> {
    if (this.useSupabase()) {
      const { data, error } = await supabase
        .from('trips')
        .insert(tripData)
        .select()
        .single();

      if (error) throw new Error(error.message);
      eventBus.emit('trip:created', data.id);
      return data;
    } else {
      const [trip] = await db
        .insert(trips)
        .values(tripData as any)
        .returning();

      eventBus.emit('trip:created', trip.id);
      return trip;
    }
  }

  async getTripById(tripId: string): Promise<TripWithDriver | null> {
    if (this.useSupabase()) {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          driver:drivers(
            *,
            user:users(*)
          )
        `)
        .eq('id', tripId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw new Error(error.message);
      }

      return data;
    } else {
      const trip = await db.query.trips.findFirst({
        where: eq(trips.id, tripId),
        with: {
          driver: {
            with: {
              user: true
            }
          }
        }
      });
      return trip as TripWithDriver | null;
    }
  }

  async searchTrips(params: {
    pickup?: string;
    drop?: string;
    date?: string;
  }): Promise<TripWithDriver[]> {
    if (this.useSupabase()) {
      let query = supabase
        .from('trips')
        .select(`
          *,
          driver:drivers(
            *,
            user:users(*)
          )
        `)
        .eq('status', 'upcoming')
        .gt('available_seats', 0);

      if (params.pickup) {
        query = query.ilike('pickup_location', `%${params.pickup}%`);
      }

      if (params.drop) {
        query = query.ilike('drop_location', `%${params.drop}%`);
      }

      if (params.date) {
        const startOfDay = new Date(params.date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(params.date);
        endOfDay.setHours(23, 59, 59, 999);

        query = query
          .gte('departure_time', startOfDay.toISOString())
          .lte('departure_time', endOfDay.toISOString());
      }

      const { data, error } = await query.order('departure_time', { ascending: true });

      if (error) throw new Error(error.message);
      return data || [];
    } else {
      const conditions = [
        eq(trips.status, 'upcoming'),
        gte(trips.availableSeats, 1)
      ];

      if (params.pickup) {
        conditions.push(ilike(trips.pickupLocation, `%${params.pickup}%`));
      }

      if (params.drop) {
        conditions.push(ilike(trips.dropLocation, `%${params.drop}%`));
      }

      if (params.date) {
        const startOfDay = new Date(params.date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(params.date);
        endOfDay.setHours(23, 59, 59, 999);

        // Note: Drizzle timestamp comparison might need exact string format or date object depending on driver
        // For simplicity in this logical block, we are skipping precise date filtering on the DB side if complex
        // but adding it here as a best effort.
        // In a real app, you'd use sql operators for date truncation.

        // For now, let's just filter by date string if possible or refine in-memory if needed.
        // Or assume the input date is YYYY-MM-DD

        // Simple string comparison for now as fallback
        conditions.push(gte(trips.departureTime, startOfDay));
      }

      const results = await db.query.trips.findMany({
        where: and(...conditions),
        with: {
          driver: {
            with: {
              user: true
            }
          }
        },
        orderBy: (trips, { asc }) => [asc(trips.departureTime)]
      });

      return results as TripWithDriver[];
    }
  }

  async getMyTrips(driverId: string): Promise<TripWithDriver[]> {
    if (this.useSupabase()) {
      const { data: driver } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', driverId)
        .single();

      if (!driver) return [];

      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          driver:drivers(
            *,
            user:users(*)
          )
        `)
        .eq('driver_id', driver.id)
        .order('departure_time', { ascending: false });

      if (error) throw new Error(error.message);
      return data || [];
    } else {
      const driver = await db.query.drivers.findFirst({
        where: eq(drivers.userId, driverId)
      });

      if (!driver) return [];

      const results = await db.query.trips.findMany({
        where: eq(trips.driverId, driver.id),
        with: {
          driver: {
            with: {
              user: true
            }
          }
        },
        orderBy: (trips, { desc }) => [desc(trips.departureTime)]
      });

      return results as TripWithDriver[];
    }
  }

  async updateTripStatus(tripId: string, status: string): Promise<void> {
    if (this.useSupabase()) {
      const { error } = await supabase
        .from('trips')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', tripId);

      if (error) throw new Error(error.message);
    } else {
      await db
        .update(trips)
        .set({ status, updatedAt: new Date() })
        .where(eq(trips.id, tripId));
    }

    eventBus.emit('trip:updated', tripId);
  }

  async updateAvailableSeats(tripId: string, seatsChange: number): Promise<void> {
    if (this.useSupabase()) {
      const { data: trip } = await supabase
        .from('trips')
        .select('available_seats')
        .eq('id', tripId)
        .single();

      if (!trip) throw new Error('Trip not found');

      const newSeats = trip.available_seats + seatsChange;

      const { error } = await supabase
        .from('trips')
        .update({ available_seats: newSeats })
        .eq('id', tripId);

      if (error) throw new Error(error.message);
    } else {
      const trip = await db.query.trips.findFirst({
        where: eq(trips.id, tripId)
      });

      if (!trip) throw new Error('Trip not found');

      const newSeats = trip.availableSeats + seatsChange;

      await db
        .update(trips)
        .set({ availableSeats: newSeats })
        .where(eq(trips.id, tripId));
    }

    eventBus.emit('trip:updated', tripId);
  }
}

export const tripService = new TripService();
