import { supabase } from './supabase';
import { eventBus } from './EventBus';
import { tripService } from './TripService';
import { InsertBooking, Booking, BookingWithDetails, bookings, trips, drivers, users, payments } from '@shared/schema';
import { db } from '../db';
import { eq, desc } from 'drizzle-orm';

export class BookingService {
  private useSupabase() {
    return process.env.VITE_SUPABASE_URL && !process.env.VITE_SUPABASE_URL.includes('placeholder');
  }

  async createBooking(bookingData: Omit<InsertBooking, 'totalAmount'>): Promise<Booking> {
    const trip = await tripService.getTripById(bookingData.tripId);
    if (!trip) throw new Error('Trip not found');

    if (trip.availableSeats < bookingData.seatsBooked) {
      throw new Error('Not enough seats available');
    }

    const totalAmount = parseFloat(trip.pricePerSeat) * bookingData.seatsBooked;

    if (this.useSupabase()) {
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
    } else {
      const [booking] = await db.insert(bookings).values({
        ...bookingData,
        totalAmount: totalAmount.toFixed(2),
      } as any).returning();

      await tripService.updateAvailableSeats(bookingData.tripId, -bookingData.seatsBooked);
      eventBus.emit('booking:created', booking.id);
      return booking;
    }
  }

  async getBookingById(bookingId: string): Promise<BookingWithDetails | null> {
    if (this.useSupabase()) {
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
    } else {
      const booking = await db.query.bookings.findFirst({
        where: eq(bookings.id, bookingId),
        with: {
          trip: {
            with: {
              driver: {
                with: {
                  user: true
                }
              }
            }
          },
          passenger: true,
          payment: true
        }
      });
      return booking as BookingWithDetails | null;
    }
  }

  async getMyBookings(userId: string): Promise<BookingWithDetails[]> {
    if (this.useSupabase()) {
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
    } else {
      const results = await db.query.bookings.findMany({
        where: eq(bookings.passengerId, userId),
        with: {
          trip: {
            with: {
              driver: {
                with: {
                  user: true
                }
              }
            }
          },
          passenger: true,
          payment: true
        },
        orderBy: (bookings, { desc }) => [desc(bookings.createdAt)]
      });
      return results as BookingWithDetails[];
    }
  }

  async updateBookingStatus(bookingId: string, status: string): Promise<void> {
    if (this.useSupabase()) {
      const { error } = await supabase
        .from('bookings')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', bookingId);

      if (error) throw new Error(error.message);
    } else {
      await db.update(bookings)
        .set({ status, updatedAt: new Date() })
        .where(eq(bookings.id, bookingId));
    }

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
