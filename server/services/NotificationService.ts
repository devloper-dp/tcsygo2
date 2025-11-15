import { supabase } from './supabase';
import { eventBus } from './EventBus';
import { InsertNotification, Notification } from '@shared/schema';

export class NotificationService {
  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    eventBus.on('booking:created', async (bookingId) => {
      const { data: booking } = await supabase
        .from('bookings')
        .select('*, trip:trips(*, driver:drivers(user_id))')
        .eq('id', bookingId)
        .single();

      if (booking) {
        await this.createNotification({
          userId: booking.trip.driver.user_id,
          title: 'New Booking Request',
          message: `You have a new booking request for your trip`,
          type: 'booking',
          data: { bookingId },
        });
      }
    });

    eventBus.on('booking:confirmed', async (bookingId) => {
      const { data: booking } = await supabase
        .from('bookings')
        .select('*, passenger_id')
        .eq('id', bookingId)
        .single();

      if (booking) {
        await this.createNotification({
          userId: booking.passenger_id,
          title: 'Booking Confirmed',
          message: 'Your trip booking has been confirmed!',
          type: 'booking',
          data: { bookingId },
        });
      }
    });

    eventBus.on('payment:success', async (paymentId) => {
      const { data: payment } = await supabase
        .from('payments')
        .select('*, booking:bookings(passenger_id)')
        .eq('id', paymentId)
        .single();

      if (payment) {
        await this.createNotification({
          userId: payment.booking.passenger_id,
          title: 'Payment Successful',
          message: `Payment of ₹${payment.amount} completed successfully`,
          type: 'payment',
          data: { paymentId },
        });
      }
    });

    eventBus.on('trip:created', async (tripId) => {
      const { data: trip } = await supabase
        .from('trips')
        .select('*, driver:drivers(user_id)')
        .eq('id', tripId)
        .single();

      if (trip) {
        await this.createNotification({
          userId: trip.driver.user_id,
          title: 'Trip Published',
          message: 'Your trip has been published successfully',
          type: 'trip',
          data: { tripId },
        });
      }
    });
  }

  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const { data, error } = await supabase
      .from('notifications')
      .insert(notificationData)
      .select()
      .single();

    if (error) throw new Error(error.message);

    await supabase
      .channel(`user-${notificationData.userId}`)
      .send({
        type: 'broadcast',
        event: 'notification',
        payload: data,
      });

    return data;
  }

  async getUserNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return data || [];
  }

  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) throw new Error(error.message);
  }

  async markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw new Error(error.message);
  }
}

export const notificationService = new NotificationService();
