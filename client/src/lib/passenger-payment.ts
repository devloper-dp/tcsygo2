import { supabase } from './supabase';
import { processAutoPayment } from './auto-pay';

export async function handlePassengerPayment(bookingId: string, amount: number, tripId: string) {
    console.log("Attempting auto-payment for booking:", bookingId);

    // 1. Check if already paid
    const { data: booking } = await supabase
        .from('bookings')
        .select('payment_status')
        .eq('id', bookingId)
        .single();

    if (booking?.payment_status === 'paid') {
        console.log("Booking already paid.");
        return true;
    }

    // 2. Process Payment
    const result = await processAutoPayment(
        amount,
        'ride',
        bookingId,
        `Payment for ride: Trip #${tripId.slice(0, 8)}`
    );

    if (result.success) {
        // 3. Update Booking
        const { error } = await supabase
            .from('bookings')
            .update({
                status: 'completed',
                payment_status: 'paid',
                payment_method: 'wallet',
                transaction_id: result.transactionId
            })
            .eq('id', bookingId);

        if (error) {
            console.error("Failed to update booking after payment:", error);
            return false;
        }
        return true;
    } else {
        console.warn("Auto-payment failed:", result.error);
        return false;
    }
}
