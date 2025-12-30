import { supabase } from '@/lib/supabase';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { logger } from './LoggerService';

export interface ReceiptData {
    id: string;
    bookingId: string;
    tripId: string;
    passengerName: string;
    driverName: string;
    date: string;
    pickupLocation: string;
    dropLocation: string;
    distance: number;
    duration: number;
    fareBreakdown: {
        baseFare: number;
        distanceFare: number;
        timeFare: number;
        surgeCharge: number;
        taxes: number;
        discount: number;
        tip?: number;
        total: number;
    };
    paymentMethod: string;
    transactionId: string;
    vehicleType: string;
    vehicleNumber?: string;
}

export const ReceiptService = {
    /**
     * Generate receipt data from booking
     */
    generateReceiptData: async (bookingId: string): Promise<ReceiptData | null> => {
        try {
            // Fetch booking details
            const { data: booking, error: bookingError } = await supabase
                .from('bookings')
                .select(`
                    *,
                    trip:trips(*),
                    passenger:users!bookings_passenger_id_fkey(*),
                    driver:users!bookings_driver_id_fkey(*)
                `)
                .eq('id', bookingId)
                .single();

            if (bookingError) throw bookingError;

            // Fetch payment details
            const { data: payment, error: paymentError } = await supabase
                .from('payments')
                .select('*')
                .eq('booking_id', bookingId)
                .single();

            if (paymentError) {
                logger.warn('Payment not found, using booking data');
            }

            // Calculate fare breakdown
            const baseFare = 20;
            const distance = booking.trip?.distance || 0;
            const distanceFare = distance * 12; // ₹12 per km
            const duration = booking.trip?.duration || 0;
            const timeFare = (duration / 60) * 2; // ₹2 per minute
            const surgeMultiplier = booking.surge_multiplier || 1.0;
            const surgeCharge = (baseFare + distanceFare + timeFare) * (surgeMultiplier - 1);
            const subtotal = baseFare + distanceFare + timeFare + surgeCharge;
            const taxes = subtotal * 0.05; // 5% GST
            const discount = booking.discount_amount || 0;

            // Get tip if exists
            const { data: tip } = await supabase
                .from('driver_tips')
                .select('amount')
                .eq('booking_id', bookingId)
                .single();

            const total = subtotal + taxes - discount + (tip?.amount || 0);

            const receiptData: ReceiptData = {
                id: `RCP-${bookingId.substring(0, 8).toUpperCase()}`,
                bookingId: bookingId,
                tripId: booking.trip_id,
                passengerName: booking.passenger?.full_name || 'Passenger',
                driverName: booking.driver?.full_name || 'Driver',
                date: new Date(booking.created_at).toISOString(),
                pickupLocation: booking.pickup_location,
                dropLocation: booking.drop_location,
                distance: distance,
                duration: duration,
                fareBreakdown: {
                    baseFare: Math.round(baseFare),
                    distanceFare: Math.round(distanceFare),
                    timeFare: Math.round(timeFare),
                    surgeCharge: Math.round(surgeCharge),
                    taxes: Math.round(taxes),
                    discount: Math.round(discount),
                    tip: tip?.amount,
                    total: Math.round(total),
                },
                paymentMethod: payment?.payment_method || booking.payment_method || 'cash',
                transactionId: payment?.transaction_id || payment?.id || bookingId,
                vehicleType: booking.vehicle_type || 'bike',
                vehicleNumber: booking.trip?.vehicle_number,
            };

            return receiptData;
        } catch (error) {
            logger.error('Error generating receipt data:', error);
            return null;
        }
    },

    /**
     * Generate HTML receipt
     */
    generateHTMLReceipt: (receipt: ReceiptData): string => {
        const formattedDate = new Date(receipt.date).toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short',
        });

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TCSYGO Receipt - ${receipt.id}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; padding: 20px; }
        .receipt { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { font-size: 32px; margin-bottom: 8px; }
        .header p { opacity: 0.9; font-size: 14px; }
        .receipt-id { background: rgba(255,255,255,0.2); display: inline-block; padding: 8px 16px; border-radius: 20px; margin-top: 12px; font-weight: 600; }
        .content { padding: 30px; }
        .section { margin-bottom: 24px; }
        .section-title { font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; font-weight: 600; }
        .info-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f3f4f6; }
        .info-row:last-child { border-bottom: none; }
        .info-label { color: #6b7280; font-size: 14px; }
        .info-value { color: #1f2937; font-weight: 600; font-size: 14px; text-align: right; }
        .location { display: flex; align-items: flex-start; gap: 12px; padding: 12px; background: #f9fafb; border-radius: 8px; margin-bottom: 8px; }
        .location-icon { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 12px; }
        .pickup-icon { background: #dbeafe; color: #3b82f6; }
        .drop-icon { background: #dcfce7; color: #10b981; }
        .location-text { flex: 1; font-size: 14px; color: #1f2937; }
        .fare-breakdown { background: #f9fafb; border-radius: 8px; padding: 16px; }
        .fare-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
        .fare-row.total { border-top: 2px solid #e5e7eb; margin-top: 8px; padding-top: 12px; font-size: 18px; font-weight: 700; color: #1f2937; }
        .fare-row.discount { color: #10b981; }
        .fare-row.surge { color: #f59e0b; }
        .payment-badge { display: inline-block; padding: 6px 12px; background: #dbeafe; color: #3b82f6; border-radius: 6px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
        .footer { background: #f9fafb; padding: 20px 30px; text-align: center; color: #6b7280; font-size: 12px; }
        .footer p { margin-bottom: 4px; }
        @media print {
            body { background: white; padding: 0; }
            .receipt { box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="receipt">
        <div class="header">
            <h1>TCSYGO</h1>
            <p>Ride Receipt</p>
            <div class="receipt-id">${receipt.id}</div>
        </div>
        
        <div class="content">
            <div class="section">
                <div class="section-title">Trip Details</div>
                <div class="info-row">
                    <span class="info-label">Date & Time</span>
                    <span class="info-value">${formattedDate}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Driver</span>
                    <span class="info-value">${receipt.driverName}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Vehicle</span>
                    <span class="info-value">${receipt.vehicleType.toUpperCase()}${receipt.vehicleNumber ? ` - ${receipt.vehicleNumber}` : ''}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Distance</span>
                    <span class="info-value">${receipt.distance.toFixed(1)} km</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Duration</span>
                    <span class="info-value">${Math.round(receipt.duration / 60)} mins</span>
                </div>
            </div>

            <div class="section">
                <div class="section-title">Route</div>
                <div class="location">
                    <div class="location-icon pickup-icon">📍</div>
                    <div class="location-text">${receipt.pickupLocation}</div>
                </div>
                <div class="location">
                    <div class="location-icon drop-icon">🏁</div>
                    <div class="location-text">${receipt.dropLocation}</div>
                </div>
            </div>

            <div class="section">
                <div class="section-title">Fare Breakdown</div>
                <div class="fare-breakdown">
                    <div class="fare-row">
                        <span>Base Fare</span>
                        <span>₹${receipt.fareBreakdown.baseFare}</span>
                    </div>
                    <div class="fare-row">
                        <span>Distance Fare (${receipt.distance.toFixed(1)} km)</span>
                        <span>₹${receipt.fareBreakdown.distanceFare}</span>
                    </div>
                    <div class="fare-row">
                        <span>Time Fare (${Math.round(receipt.duration / 60)} mins)</span>
                        <span>₹${receipt.fareBreakdown.timeFare}</span>
                    </div>
                    ${receipt.fareBreakdown.surgeCharge > 0 ? `
                    <div class="fare-row surge">
                        <span>Surge Charge</span>
                        <span>₹${receipt.fareBreakdown.surgeCharge}</span>
                    </div>
                    ` : ''}
                    <div class="fare-row">
                        <span>GST (5%)</span>
                        <span>₹${receipt.fareBreakdown.taxes}</span>
                    </div>
                    ${receipt.fareBreakdown.discount > 0 ? `
                    <div class="fare-row discount">
                        <span>Discount</span>
                        <span>-₹${receipt.fareBreakdown.discount}</span>
                    </div>
                    ` : ''}
                    ${receipt.fareBreakdown.tip ? `
                    <div class="fare-row">
                        <span>Tip to Driver</span>
                        <span>₹${receipt.fareBreakdown.tip}</span>
                    </div>
                    ` : ''}
                    <div class="fare-row total">
                        <span>Total Amount</span>
                        <span>₹${receipt.fareBreakdown.total}</span>
                    </div>
                </div>
            </div>

            <div class="section">
                <div class="section-title">Payment</div>
                <div class="info-row">
                    <span class="info-label">Method</span>
                    <span class="info-value"><span class="payment-badge">${receipt.paymentMethod.toUpperCase()}</span></span>
                </div>
                <div class="info-row">
                    <span class="info-label">Transaction ID</span>
                    <span class="info-value">${receipt.transactionId}</span>
                </div>
            </div>
        </div>

        <div class="footer">
            <p><strong>Thank you for riding with TCSYGO!</strong></p>
            <p>For support, contact: support@tcsygo.com</p>
            <p>This is a computer-generated receipt and does not require a signature.</p>
        </div>
    </div>
</body>
</html>
        `;
    },

    /**
     * Save receipt as HTML file
     */
    saveReceipt: async (receipt: ReceiptData): Promise<string | null> => {
        try {
            const html = ReceiptService.generateHTMLReceipt(receipt);
            const fileName = `TCSYGO_Receipt_${receipt.id}.html`;
            const filePath = `${(FileSystem as any).documentDirectory}${fileName}`;

            await FileSystem.writeAsStringAsync(filePath, html, {
                encoding: (FileSystem as any).EncodingType.UTF8,
            });

            return filePath;
        } catch (error) {
            logger.error('Error saving receipt:', error);
            return null;
        }
    },

    /**
     * Share receipt
     */
    shareReceipt: async (receipt: ReceiptData): Promise<boolean> => {
        try {
            const filePath = await ReceiptService.saveReceipt(receipt);
            if (!filePath) return false;

            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
                await Sharing.shareAsync(filePath, {
                    mimeType: 'text/html',
                    dialogTitle: 'Share Receipt',
                });
                return true;
            }

            return false;
        } catch (error) {
            logger.error('Error sharing receipt:', error);
            return false;
        }
    },

    /**
     * Email receipt (requires email service integration)
     */
    emailReceipt: async (receipt: ReceiptData, email: string): Promise<boolean> => {
        try {
            // This would integrate with your email service (SendGrid, AWS SES, etc.)
            // For now, we'll store the request in the database
            const { error } = await supabase
                .from('email_queue')
                .insert({
                    to: email,
                    subject: `TCSYGO Receipt - ${receipt.id}`,
                    html: ReceiptService.generateHTMLReceipt(receipt),
                    type: 'receipt',
                    metadata: { bookingId: receipt.bookingId },
                });

            if (error) throw error;
            return true;
        } catch (error) {
            logger.error('Error queueing email:', error);
            return false;
        }
    },

    /**
     * Get receipt history for user
     */
    getReceiptHistory: async (userId: string, limit: number = 20): Promise<ReceiptData[]> => {
        try {
            const { data: bookings, error } = await supabase
                .from('bookings')
                .select('id')
                .eq('passenger_id', userId)
                .eq('status', 'completed')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            const receipts: ReceiptData[] = [];
            for (const booking of bookings || []) {
                const receipt = await ReceiptService.generateReceiptData(booking.id);
                if (receipt) receipts.push(receipt);
            }

            return receipts;
        } catch (error) {
            logger.error('Error getting receipt history:', error);
            return [];
        }
    },
};
