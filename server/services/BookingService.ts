import { supabase } from './supabase';
import { eventBus } from './EventBus';
import { tripService } from './TripService';
import { InsertBooking, Booking, BookingWithDetails } from '@shared/schema';

export class BookingService {
  async createBooking(bookingData: Omit<InsertBooking, 'totalAmount'>): Promise<Booking> {
    const trip = await tripService.getTripById(bookingData.tripId);
    if (!trip) throw new Error('Trip not found');

    if (trip.availableSeats < bookingData.seatsBooked) {
      throw new Error('Not enough seats available');
    }

    const totalAmount = parseFloat(trip.pricePerSeat) * bookingData.seatsBooked;

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        ...bookingData,
        total_amount: totalAmount.toString(),
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    await tripService.updateAvailableSeats(bookingData.tripId, -bookingData.seatsBooked);

    eventBus.emit('booking:created', data.id);
    return data;
  }

  async getBookingById(bookingId: string): Promise<BookingWithDetails | null> {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        trip:trips(
          *,
          driver:drivers(
            *,
            user:users(*)
          )
        ),
        passenger:users(*),
        payment:payments(*)
      `)
      .eq('id', bookingId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }

    return data;
  }

  async getMyBookings(userId: string): Promise<BookingWithDetails[]> {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        trip:trips(
          *,
          driver:drivers(
            *,
            user:users(*)
          )
        ),
        passenger:users(*),
        payment:payments(*)
      `)
      .eq('passenger_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  }

  async updateBookingStatus(bookingId: string, status: string): Promise<void> {
    const { error } = await supabase
      .from('bookings')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', bookingId);

    if (error) throw new Error(error.message);

    if (status === 'confirmed') {
      eventBus.emit('booking:confirmed', bookingId);
    } else if (status === 'cancelled') {
      const booking = await this.getBookingById(bookingId);
      if (booking) {
        await tripService.updateAvailableSeats(booking.tripId, booking.seatsBooked);
      }
      eventBus.emit('booking:cancelled', bookingId);
    }
  }
}

export const bookingService = new BookingService();
