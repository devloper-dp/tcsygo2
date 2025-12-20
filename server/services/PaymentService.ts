import Razorpay from 'razorpay';
import crypto from 'crypto';
import { supabase } from './supabase';
import { eventBus } from './EventBus';
import { bookingService } from './BookingService';
import { Payment, payments } from '@shared/schema';
import { db } from '../db';
import { eq } from 'drizzle-orm';

const razorpayKeyId = process.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_placeholder';
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret';

// Soft initialization of Razorpay to avoid crashes if keys are invalid in dev
let razorpay: Razorpay | null = null;
try {
  razorpay = new Razorpay({
    key_id: razorpayKeyId,
    key_secret: razorpayKeySecret,
  });
} catch (e) {
  console.warn("Razorpay client failed to initialize, payments will be mocked.");
}

export class PaymentService {
  private useSupabase() {
    return process.env.VITE_SUPABASE_URL && !process.env.VITE_SUPABASE_URL.includes('placeholder');
  }

  async createOrder(bookingId: string): Promise<{ razorpayOrderId: string; amount: number }> {
    const booking = await bookingService.getBookingById(bookingId);
    if (!booking) throw new Error('Booking not found');

    const amount = parseFloat(booking.totalAmount);
    const platformFee = amount * 0.05;
    const driverEarnings = amount - platformFee;

    let orderId = `order_${crypto.randomUUID()}`;

    // Only try real razorpay if configured and not in full dev fallback mode
    if (this.useSupabase() && razorpayKeyId !== 'rzp_test_placeholder') {
      try {
        if (razorpay) {
          const order = await razorpay.orders.create({
            amount: Math.round(amount * 100), // Convert to paise
            currency: 'INR',
            receipt: `booking_${bookingId}`,
          });
          orderId = order.id;
        }
      } catch (error: any) {
        console.error('Razorpay order creation error:', error);
        throw new Error('Failed to create payment order');
      }
    }

    if (this.useSupabase()) {
      const { data, error } = await supabase
        .from('payments')
        .insert({
          booking_id: bookingId,
          amount: amount.toString(),
          platform_fee: platformFee.toString(),
          driver_earnings: driverEarnings.toString(),
          razorpay_order_id: orderId,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
    } else {
      await db.insert(payments).values({
        bookingId,
        amount: amount.toFixed(2),
        platformFee: platformFee.toFixed(2),
        driverEarnings: driverEarnings.toFixed(2),
        razorpayOrderId: orderId,
        status: 'pending',
      } as any);
    }

    return {
      razorpayOrderId: orderId,
      amount,
    };
  }

  async verifyPayment(params: {
    bookingId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }): Promise<Payment> {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, bookingId } = params;

    // Verify signature only if we are in production-ish mode or keys are set
    if (this.useSupabase() && razorpayKeyId !== 'rzp_test_placeholder') {
      const generatedSignature = crypto
        .createHmac('sha256', razorpayKeySecret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      if (generatedSignature !== razorpaySignature) {
        await this.updatePaymentStatus(bookingId, 'failed');
        throw new Error('Invalid payment signature');
      }
    }

    let paymentData: Payment;

    if (this.useSupabase()) {
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
      paymentData = data;
    } else {
      const [payment] = await db.update(payments)
        .set({
          razorpayPaymentId,
          status: 'success',
          paymentMethod: 'razorpay',
          updatedAt: new Date()
        })
        .where(eq(payments.bookingId, bookingId)) // fallback to finding by bookingId closer, assuming 1:1
        .returning();
      bookingService.updateBookingStatus(bookingId, 'confirmed'); // Update booking status here for local
      paymentData = payment;
    }

    if (this.useSupabase()) {
      await bookingService.updateBookingStatus(bookingId, 'confirmed');
    }

    eventBus.emit('payment:success', paymentData.id);
    return paymentData;
  }

  async updatePaymentStatus(bookingId: string, status: string): Promise<void> {
    if (this.useSupabase()) {
      const { error } = await supabase
        .from('payments')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('booking_id', bookingId);

      if (error) throw new Error(error.message);
    } else {
      await db.update(payments)
        .set({ status, updatedAt: new Date() })
        .where(eq(payments.bookingId, bookingId));
    }

    if (status === 'failed') {
      // Fetch payment ID to emit event
      if (this.useSupabase()) {
        const { data: payment } = await supabase
          .from('payments')
          .select('id')
          .eq('booking_id', bookingId)
          .single();

        if (payment) {
          eventBus.emit('payment:failed', payment.id);
        }
      } else {
        const payment = await db.query.payments.findFirst({
          where: eq(payments.bookingId, bookingId)
        });
        if (payment) {
          eventBus.emit('payment:failed', payment.id);
        }
      }
    }
  }

  async getPaymentsByBooking(bookingId: string): Promise<Payment[]> {
    if (this.useSupabase()) {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return data || [];
    } else {
      const results = await db.query.payments.findMany({
        where: eq(payments.bookingId, bookingId),
        orderBy: (payments, { desc }) => [desc(payments.createdAt)]
      });
      return results as Payment[];
    }
  }
}

export const paymentService = new PaymentService();
