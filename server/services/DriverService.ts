import { supabase } from './supabase';
import { eventBus } from './EventBus';
import { InsertDriver, Driver } from '@shared/schema';

export class DriverService {
  async createDriverProfile(driverData: InsertDriver): Promise<Driver> {
    const { data, error } = await supabase
      .from('drivers')
      .insert(driverData)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async getDriverProfile(userId: string): Promise<Driver | null> {
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
  }

  async updateDriverProfile(driverId: string, updates: Partial<Driver>): Promise<Driver> {
    const { data, error } = await supabase
      .from('drivers')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', driverId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async updateDriverAvailability(userId: string, isAvailable: boolean): Promise<void> {
    const driver = await this.getDriverProfile(userId);
    if (!driver) throw new Error('Driver profile not found');

    const { error } = await supabase
      .from('drivers')
      .update({ is_available: isAvailable })
      .eq('id', driver.id);

    if (error) throw new Error(error.message);
  }

  async verifyDriver(driverId: string, status: 'verified' | 'rejected'): Promise<void> {
    const { error } = await supabase
      .from('drivers')
      .update({
        verification_status: status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', driverId);

    if (error) throw new Error(error.message);

    if (status === 'verified') {
      eventBus.emit('driver:verified', driverId);
    }
  }

  async getPendingVerifications(): Promise<Driver[]> {
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
  }

  async updateDriverRating(driverId: string): Promise<void> {
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
  }
}

export const driverService = new DriverService();
