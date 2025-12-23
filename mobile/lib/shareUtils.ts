import { Share } from 'react-native';

export interface TripShareData {
    tripId: string;
    pickup: string;
    drop: string;
    departureTime: string;
    pricePerSeat: number;
    driverName?: string;
    availableSeats?: number;
}

/**
 * Generate shareable trip message
 */
export function generateShareMessage(trip: TripShareData): string {
    const date = new Date(trip.departureTime);
    const formattedDate = date.toLocaleDateString('en-IN', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });
    const formattedTime = date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
    });

    let message = `🚗 *TCSYGO Trip*\n\n`;
    message += `📍 From: ${trip.pickup}\n`;
    message += `📍 To: ${trip.drop}\n`;
    message += `📅 Date: ${formattedDate}\n`;
    message += `⏰ Time: ${formattedTime}\n`;
    message += `💰 Price: ₹${trip.pricePerSeat}/seat\n`;

    if (trip.availableSeats) {
        message += `🪑 Seats Available: ${trip.availableSeats}\n`;
    }

    if (trip.driverName) {
        message += `👤 Driver: ${trip.driverName}\n`;
    }

    message += `\n🔗 Book now: https://tcsygo.com/trip/${trip.tripId}`;

    return message;
}

/**
 * Share trip via native share dialog
 */
export async function shareTripNative(trip: TripShareData): Promise<boolean> {
    try {
        const message = generateShareMessage(trip);

        const result = await Share.share({
            message,
            title: `Trip from ${trip.pickup} to ${trip.drop}`,
        });

        return result.action === Share.sharedAction;
    } catch (error) {
        console.error('Error sharing trip:', error);
        return false;
    }
}

/**
 * Generate WhatsApp share link
 */
export function generateWhatsAppLink(trip: TripShareData): string {
    const message = generateShareMessage(trip);
    const encoded = encodeURIComponent(message);
    return `whatsapp://send?text=${encoded}`;
}

/**
 * Generate SMS share link
 */
export function generateSMSLink(trip: TripShareData): string {
    const message = generateShareMessage(trip);
    const encoded = encodeURIComponent(message);
    return `sms:?body=${encoded}`;
}

/**
 * Generate email share link
 */
export function generateEmailLink(trip: TripShareData): string {
    const subject = `Trip from ${trip.pickup} to ${trip.drop}`;
    const body = generateShareMessage(trip);
    return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Copy trip link to clipboard
 */
export function getTripLink(tripId: string): string {
    return `https://tcsygo.com/trip/${tripId}`;
}
