// Fare calculation utilities for ride booking
// Pure logic functions - data fetching should happen in components/hooks

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
    promoApplied?: {
        code: string;
        discountAmount: number;
    };
}

import { PromoCode } from './promo-service';

import { supabase } from '@/lib/supabase';

export interface FareConfig {
    baseFare: number;
    perKm: number;
    perMinute: number;
    minFare: number;
}

export const DEFAULT_FARE_CONFIG = {
    bike: { baseFare: 20, perKm: 8, perMinute: 1, minFare: 30 },
    auto: { baseFare: 30, perKm: 12, perMinute: 1.5, minFare: 50 },
    car: { baseFare: 50, perKm: 15, perMinute: 2, minFare: 80 },
};

export async function fetchFareConfig(): Promise<typeof DEFAULT_FARE_CONFIG> {
    try {
        const { data, error } = await supabase.from('fare_config').select('*');
        if (error || !data || data.length === 0) return DEFAULT_FARE_CONFIG;

        // Transform DB data to config object
        const config: any = {};
        data.forEach((item: any) => {
            config[item.vehicle_type] = {
                baseFare: parseFloat(item.base_fare),
                perKm: parseFloat(item.per_km),
                perMinute: parseFloat(item.per_minute),
                minFare: parseFloat(item.min_fare),
            };
        });

        // Ensure all types are present, fallback to defaults if missing
        return {
            bike: config.bike || DEFAULT_FARE_CONFIG.bike,
            auto: config.auto || DEFAULT_FARE_CONFIG.auto,
            car: config.car || DEFAULT_FARE_CONFIG.car,
        };
    } catch (e) {
        console.error('Error fetching fare config:', e);
        return DEFAULT_FARE_CONFIG;
    }
}


const PLATFORM_FEE_PERCENTAGE = 0.05; // 5%
const GST_PERCENTAGE = 0.05; // 5%

/**
 * Calculate surge pricing multiplier based on demand
 */
export function calculateSurgeMultiplier(
    demand: 'low' | 'medium' | 'high' | 'very_high'
): number {
    const surgeMap = {
        low: 1.0,
        medium: 1.2,
        high: 1.5,
        very_high: 2.0,
    };
    return surgeMap[demand] || 1.0;
}

/**
 * Get current demand level based on time and location
 */
export function getCurrentDemand(hour: number): 'low' | 'medium' | 'high' | 'very_high' {
    const day = new Date().getDay();
    const isWeekend = day === 0 || day === 6;

    // Peak hours: 8-11 AM, 5-9 PM
    if ((hour >= 8 && hour < 11) || (hour >= 17 && hour < 21)) {
        return isWeekend ? 'high' : 'very_high';
    }

    // Late night: 11 PM - 5 AM
    if (hour >= 23 || hour <= 5) {
        return 'medium'; // Higher base fare at night
    }

    // Midday weekends high demand
    if (isWeekend && hour >= 11 && hour < 17) {
        return 'high';
    }

    // Normal hours
    return 'low';
}

/**
 * Calculate fare for a ride
 */
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

    // Calculate subtotal
    let subtotal = baseFare + distanceCharge + timeCharge;

    // Apply minimum fare
    if (subtotal < vehicleConfig.minFare) {
        subtotal = vehicleConfig.minFare;
    }

    // Apply surge pricing
    const surgePricing = subtotal * (surgeMultiplier - 1);
    const totalWithSurge = subtotal * surgeMultiplier;

    // Calculate fees
    const platformFee = totalWithSurge * PLATFORM_FEE_PERCENTAGE;
    const gst = (totalWithSurge + platformFee) * GST_PERCENTAGE;

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

/**
 * Apply promo code to fare
 */
export function applyPromoCode(
    fareBreakdown: FareBreakdown,
    promoCode: PromoCode
): FareBreakdown {
    let discount = 0;

    if (promoCode.discount_type === 'percentage') {
        discount = (fareBreakdown.totalFare * promoCode.discount_value) / 100;
        if (promoCode.max_discount) {
            discount = Math.min(discount, promoCode.max_discount);
        }
    } else {
        discount = promoCode.discount_value;
    }

    // Check minimum fare requirement
    if (promoCode.min_amount && fareBreakdown.totalFare < promoCode.min_amount) {
        return {
            ...fareBreakdown,
            discount: 0,
        };
    }

    const totalFare = Math.max(fareBreakdown.totalFare - discount, 0);

    return {
        ...fareBreakdown,
        discount: Math.round(discount * 100) / 100,
        totalFare: Math.round(totalFare * 100) / 100,
    };
}

// Redundant local validation removed. Use promo-service.ts validatePromoCode instead.

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
    return `₹${amount.toFixed(2)}`;
}

/**
 * Calculate ETA based on distance and traffic
 */
export function calculateETA(distanceKm: number, traffic: 'low' | 'medium' | 'high' = 'medium'): number {
    const speedMap = {
        low: 40, // km/h
        medium: 30,
        high: 20,
    };

    const speed = speedMap[traffic];
    const hours = distanceKm / speed;
    return Math.ceil(hours * 60); // Return minutes
}
