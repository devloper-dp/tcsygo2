export interface FareBreakdown {
    baseFare: number;
    distanceCharge: number;
    timeCharge: number;
    surgePricing: number;
    platformFee: number;
    gst: number;
    totalFare: number;
    surgeMultiplier: number;
    discount: number;
    currency: string;
    vehicleType?: 'bike' | 'auto' | 'car';
}

export const DEFAULT_FARE_CONFIG = {
    bike: { baseFare: 20, perKm: 8, perMinute: 1, minFare: 30 },
    auto: { baseFare: 30, perKm: 12, perMinute: 1.5, minFare: 50 },
    car: { baseFare: 50, perKm: 15, perMinute: 2, minFare: 80 },
};

export function calculateFare(
    vehicleType: 'bike' | 'auto' | 'car',
    distanceKm: number,
    durationMinutes: number,
    surgeMultiplier: number = 1.0,
    config: typeof DEFAULT_FARE_CONFIG = DEFAULT_FARE_CONFIG
): FareBreakdown {
    const vehicleConfig = config[vehicleType];

    const baseFare = vehicleConfig.baseFare;
    const distanceCharge = distanceKm * vehicleConfig.perKm;
    const timeCharge = durationMinutes * vehicleConfig.perMinute;

    let subtotal = baseFare + distanceCharge + timeCharge;

    if (subtotal < vehicleConfig.minFare) {
        subtotal = vehicleConfig.minFare;
    }

    const surgePricing = subtotal * (surgeMultiplier - 1);
    const totalWithSurge = subtotal * surgeMultiplier;

    const platformFee = totalWithSurge * 0.05;
    const gst = (totalWithSurge + platformFee) * 0.05;

    const totalFare = Math.round(totalWithSurge + platformFee + gst);

    return {
        baseFare,
        distanceCharge,
        timeCharge,
        surgePricing,
        platformFee,
        gst,
        totalFare,
        surgeMultiplier,
        vehicleType,
        discount: 0,
        currency: 'INR'
    };
}
