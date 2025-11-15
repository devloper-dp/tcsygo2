import Razorpay from 'razorpay';
import crypto from 'crypto';
import { supabase } from './supabase';
import { eventBus } from './EventBus';
import { bookingService } from './BookingService';
import { Payment } from '@shared/schema';

const razorpayKeyId = process.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_placeholder';
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret';

const razorpay = new Razorpay({
  key_id: razorpayKeyId,
  key_secret: razorpayKeySecret,
});

export class PaymentService {
  async createOrder(bookingId: string): Promise<{ razorpayOrderId: string; amount: number }> {
    const booking = await bookingService.getBookingById(bookingId);
    if (!booking) throw new Error('Booking not found');

    const amount = parseFloat(booking.totalAmount);
    const platformFee = amount * 0.05;
    const driverEarnings = amount - platformFee;

    try {
      const order = await razorpay.orders.create({
        amount: Math.round(amount * 100), // Convert to paise
        currency: 'INR',
        receipt: `booking_${bookingId}`,
      });

      const { data, error } = await supabase
        .from('payments')
        .insert({
          booking_id: bookingId,
          amount: amount.toString(),
          platform_fee: platformFee.toString(),
          driver_earnings: driverEarnings.toString(),
          razorpay_order_id: order.id,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      return {
        razorpayOrderId: order.id,
        amount,
      };
    } catch (error: any) {
      console.error('Razorpay order creation error:', error);
      throw new Error('Failed to create payment order');
    }
  }

  async verifyPayment(params: {
    bookingId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }): Promise<Payment> {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, bookingId } = params;

    const generatedSignature = crypto
      .createHmac('sha256', razorpayKeySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (generatedSignature !== razorpaySignature) {
      await this.updatePaymentStatus(bookingId, 'failed');
      throw new Error('Invalid payment signature');
    }

    const { data, error } = await supabase
      .from('payments')
      .update({
        razorpay_payment_id: razorpayPaymentId,
        status: 'success',
        payment_method: 'razorpay',
        updated_at: new Date().toISOString(),
      })
      .eq('booking_id', bookingId)
      .eq('razorpay_order_id', razorpayOrderId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    await bookingService.updateBookingStatus(bookingId, 'confirmed');

    eventBus.emit('payment:success', data.id);
    return data;
  }

  async updatePaymentStatus(bookingId: string, status: string): Promise<void> {
    const { error } = await supabase
      .from('payments')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('booking_id', bookingId);

    if (error) throw new Error(error.message);

    if (status === 'failed') {
      const { data: payment } = await supabase
        .from('payments')
        .select('id')
        .eq('booking_id', bookingId)
        .single();

      if (payment) {
        eventBus.emit('payment:failed', payment.id);
      }
    }
  }

  async getPaymentsByBooking(bookingId: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  }
}

export const paymentService = new PaymentService();
