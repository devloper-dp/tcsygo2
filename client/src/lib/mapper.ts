import { Trip, TripWithDriver, Driver, User, Booking, BookingWithDetails, Notification, PromoCode } from '@shared/schema';

export function mapUser(data: any): User {
    if (!data) return data;
    return {
        id: data.id,
        email: data.email,
        fullName: data.full_name,
        phone: data.phone,
        profilePhoto: data.profile_photo,
        role: data.role,
        bio: data.bio,
        verificationStatus: data.verification_status,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
    };
}

export function mapDriver(data: any): Driver {
    if (!data) return data;
    return {
        id: data.id,
        userId: data.user_id,
        licenseNumber: data.license_number,
        licensePhoto: data.license_photo,
        vehicleMake: data.vehicle_make,
        vehicleModel: data.vehicle_model,
        vehicleYear: data.vehicle_year,
        vehicleColor: data.vehicle_color,
        vehiclePlate: data.vehicle_plate,
        vehiclePhotos: data.vehicle_photos || [],
        isAvailable: data.is_available,
        rating: data.rating,
        totalTrips: data.total_trips,
        verificationStatus: data.verification_status,
        documents: data.documents || [],
        createdAt: data.created_at,
        updatedAt: data.updated_at,
    };
}

export function mapTrip(data: any): TripWithDriver {
    if (!data) return data;

    const trip: any = {
        id: data.id,
        driverId: data.driver_id,
        pickupLocation: data.pickup_location,
        pickupLat: data.pickup_lat,
        pickupLng: data.pickup_lng,
        dropLocation: data.drop_location,
        dropLat: data.drop_lat,
        dropLng: data.drop_lng,
        departureTime: data.departure_time,
        distance: data.distance,
        duration: data.duration,
        pricePerSeat: data.price_per_seat,
        availableSeats: data.available_seats,
        totalSeats: data.total_seats,
        status: data.status,
        route: data.route,
        preferences: data.preferences || {},
        createdAt: data.created_at,
        updatedAt: data.updated_at,
    };

    if (data.driver) {
        trip.driver = mapDriver(data.driver);
        if (data.driver.user) {
            trip.driver.user = mapUser(data.driver.user);
        }
    }

    return trip;
}

export function mapBooking(data: any): BookingWithDetails {
    if (!data) return data;

    const booking: any = {
        id: data.id,
        tripId: data.trip_id,
        passengerId: data.passenger_id,
        seatsBooked: data.seats_booked,
        totalAmount: data.total_amount,
        status: data.status,
        pickupLocation: data.pickup_location,
        dropLocation: data.drop_location,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
    };

    if (data.trip) {
        booking.trip = mapTrip(data.trip);
    }
    if (data.passenger) {
        booking.passenger = mapUser(data.passenger);
    }

    return booking;
}

export function mapPayment(data: any): any { // using any for return type temporarily to match other mappers loose typing or Import Payment
    if (!data) return data;
    return {
        id: data.id,
        bookingId: data.booking_id,
        amount: data.amount,
        platformFee: data.platform_fee,
        driverEarnings: data.driver_earnings,
        razorpayOrderId: data.razorpay_order_id,
        razorpayPaymentId: data.razorpay_payment_id,
        status: data.status,
        paymentMethod: data.payment_method,
        createdAt: data.created_at,
        updatedAt: data.updated_at
    };
}

export function mapSOSAlert(data: any): any {
    if (!data) return data;
    const alert: any = {
        id: data.id,
        tripId: data.trip_id,
        userId: data.user_id,
        lat: data.lat,
        lng: data.lng,
        status: data.status,
        createdAt: data.created_at,
        resolvedAt: data.resolved_at
    };
    if (data.user) {
        alert.user = mapUser(data.user);
    }
    return alert;
}

export function mapNotification(data: any): Notification {
    if (!data) return data;
    return {
        id: data.id,
        userId: data.user_id,
        title: data.title,
        message: data.message,
        type: data.type,
        isRead: data.is_read,
        data: data.data,
        createdAt: data.created_at,
    };
}

export function mapPromoCode(data: any): PromoCode {
    if (!data) return data;
    return {
        id: data.id,
        code: data.code,
        discount: parseFloat(data.discount),
        type: data.type,
        description: data.description,
        minAmount: parseFloat(data.min_amount || '0'),
        maxDiscount: data.max_discount ? parseFloat(data.max_discount) : null,
        expiresAt: data.expires_at,
        isActive: data.is_active,
        createdAt: data.created_at,
    };
}
