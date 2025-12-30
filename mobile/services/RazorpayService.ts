import RazorpayCheckout from 'react-native-razorpay';
import { PaymentService } from './PaymentService';
import { logger } from './LoggerService';

const RAZORPAY_KEY_ID = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || '';

export interface RazorpayOptions {
    amount: number; // in paise
    orderId: string;
    description: string;
    prefill: {
        name: string;
        email: string;
        contact: string;
    };
}

export const RazorpayService = {
    openCheckout: async (options: RazorpayOptions) => {
        if (!RAZORPAY_KEY_ID) {
            logger.error('Razorpay Key ID is not configured');
            return { success: false, error: 'Payment gateway configuration missing' };
        }

        const checkoutOptions = {
            description: options.description,
            image: 'https://ui-avatars.com/api/?name=TCSYGO&background=3b82f6&color=fff',
            currency: 'INR',
            key: RAZORPAY_KEY_ID,
            amount: options.amount,
            name: 'TCSYGO',
            order_id: options.orderId,
            prefill: options.prefill,
            theme: { color: '#3b82f6' }
        };

        try {
            const data = await RazorpayCheckout.open(checkoutOptions);

            // Verify payment on server
            const verified = await PaymentService.verifyPayment(
                data.razorpay_order_id,
                data.razorpay_payment_id,
                data.razorpay_signature
            );

            if (verified) {
                return {
                    success: true,
                    paymentId: data.razorpay_payment_id,
                    orderId: data.razorpay_order_id,
                    signature: data.razorpay_signature
                };
            } else {
                return { success: false, error: 'Payment verification failed' };
            }
        } catch (error: any) {
            logger.error('Razorpay Error:', error);
            // Error structure depends on what RazorpayCheckout.open throws/rejects with
            return {
                success: false,
                error: error.description || error.message || 'Payment cancelled or failed'
            };
        }
    }
};
