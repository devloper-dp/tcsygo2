import { supabase } from './supabase';
import { eventBus } from './EventBus';
import { InsertDriver, Driver, drivers, ratings } from '@shared/schema';
import { db } from '../db';
import { eq, sql } from 'drizzle-orm';

export class DriverService {
  private useSupabase() {
    return process.env.VITE_SUPABASE_URL && !process.env.VITE_SUPABASE_URL.includes('placeholder');
  }

  async createDriverProfile(driverData: InsertDriver): Promise<Driver> {
    if (this.useSupabase()) {
      const { data, error } = await supabase
        .from('drivers')
        .insert(driverData)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    } else {
      const [driver] = await db.insert(drivers).values(driverData as any).returning();
      return driver;
    }
  }

  async getDriverProfile(userId: string): Promise<Driver | null> {
    if (this.useSupabase()) {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw new Error(error.message);
      }

      return data;
    } else {
      const driver = await db.query.drivers.findFirst({
        where: eq(drivers.userId, userId)
      });
      return driver || null;
    }
  }

  async updateDriverProfile(driverId: string, updates: Partial<Driver>): Promise<Driver> {
    if (this.useSupabase()) {
      const { data, error } = await supabase
        .from('drivers')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', driverId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    } else {
      const [driver] = await db.update(drivers)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(drivers.id, driverId))
        .returning();
      return driver;
    }
  }

  async updateDriverAvailability(userId: string, isAvailable: boolean): Promise<void> {
    const driver = await this.getDriverProfile(userId);
    if (!driver) throw new Error('Driver profile not found');

    if (this.useSupabase()) {
      const { error } = await supabase
        .from('drivers')
        .update({ is_available: isAvailable })
        .eq('id', driver.id);

      if (error) throw new Error(error.message);
    } else {
      await db.update(drivers)
        .set({ isAvailable })
        .where(eq(drivers.id, driver.id));
    }
  }

  async verifyDriver(driverId: string, status: 'verified' | 'rejected'): Promise<void> {
    if (this.useSupabase()) {
      const { error } = await supabase
        .from('drivers')
        .update({
          verification_status: status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', driverId);

      if (error) throw new Error(error.message);
    } else {
      await db.update(drivers)
        .set({ verificationStatus: status, updatedAt: new Date() })
        .where(eq(drivers.id, driverId));
    }

    if (status === 'verified') {
      eventBus.emit('driver:verified', driverId);
    }
  }

  async getPendingVerifications(): Promise<Driver[]> {
    if (this.useSupabase()) {
      const { data, error } = await supabase
        .from('drivers')
        .select(`
            *,
            user:users(*)
          `)
        .eq('verification_status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw new Error(error.message);
      return data || [];
    } else {
      const results = await db.query.drivers.findMany({
        where: eq(drivers.verificationStatus, 'pending'),
        with: {
          user: true
        },
        orderBy: (drivers, { asc }) => [asc(drivers.createdAt)]
      });
      return results as Driver[];
    }
  }

  async updateDriverRating(driverId: string): Promise<void> {
    if (this.useSupabase()) {
      const { data: ratings } = await supabase
        .from('ratings')
        .select('rating')
        .eq('to_user_id', (await supabase.from('drivers').select('user_id').eq('id', driverId).single()).data?.user_id);

      if (!ratings || ratings.length === 0) return;

      const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;

      const { error } = await supabase
        .from('drivers')
        .update({ rating: avgRating.toFixed(2) })
        .eq('id', driverId);

      if (error) console.error('Error updating driver rating:', error);
    } else {
      // Complex logic: get driver -> get user -> get ratings -> avg -> update driver
      const driver = await db.query.drivers.findFirst({
        columns: { userId: true },
        where: eq(drivers.id, driverId)
      });

      if (!driver) return;

      const driverRatings = await db.query.ratings.findMany({
        where: eq(ratings.toUserId, driver.userId)
      });

      if (driverRatings.length === 0) return;

      const avgRating = driverRatings.reduce((sum, r) => sum + r.rating, 0) / driverRatings.length;

      await db.update(drivers)
        .set({ rating: avgRating.toFixed(2) })
        .where(eq(drivers.id, driverId));
    }
  }
}

export const driverService = new DriverService();
