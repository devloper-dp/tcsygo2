import { supabase } from './supabase';
import { driverService } from './DriverService';
import { InsertRating, Rating } from '@shared/schema';

export class RatingService {
  async createRating(ratingData: InsertRating): Promise<Rating> {
    const { data: existing } = await supabase
      .from('ratings')
      .select('id')
      .eq('trip_id', ratingData.tripId)
      .eq('from_user_id', ratingData.fromUserId)
      .eq('to_user_id', ratingData.toUserId)
      .single();

    if (existing) {
      throw new Error('You have already rated this user for this trip');
    }

    const { data, error } = await supabase
      .from('ratings')
      .insert(ratingData)
      .select()
      .single();

    if (error) throw new Error(error.message);

    const { data: driver } = await supabase
      .from('drivers')
      .select('id')
      .eq('user_id', ratingData.toUserId)
      .single();

    if (driver) {
      await driverService.updateDriverRating(driver.id);
    }

    return data;
  }

  async getRatingsForUser(userId: string): Promise<Rating[]> {
    const { data, error } = await supabase
      .from('ratings')
      .select(`
        *,
        from_user:users!from_user_id(*),
        to_user:users!to_user_id(*)
      `)
      .eq('to_user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  }

  async getRatingByTrip(tripId: string, fromUserId: string, toUserId: string): Promise<Rating | null> {
    const { data, error } = await supabase
      .from('ratings')
      .select('*')
      .eq('trip_id', tripId)
      .eq('from_user_id', fromUserId)
      .eq('to_user_id', toUserId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }

    return data;
  }
}

export const ratingService = new RatingService();
