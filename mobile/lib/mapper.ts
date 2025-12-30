
// Utility to map Supabase snake_case to camelCase for the app

export function mapUser(data: any): any {
    if (!data) return data;
    return {
        id: data.id,
        fullName: data.full_name,
        email: data.email,
        phone: data.phone,
        role: data.role,
        profilePhoto: data.profile_photo,
        bio: data.bio,
        isVerified: data.verification_status === 'verified',
        verificationStatus: data.verification_status,
        createdAt: data.created_at
    };
}

export function mapDriver(data: any): any {
    if (!data) return data;
    const driver: any = {
        id: data.id,
        userId: data.user_id,
        licenseNumber: data.license_number,
        vehicleMake: data.vehicle_make,
        vehicleModel: data.vehicle_model,
        vehicleYear: data.vehicle_year,
        vehicleColor: data.vehicle_color,
        vehiclePlate: data.vehicle_plate,
        verificationStatus: data.verification_status,
        rating: data.rating,
        totalTrips: data.total_trips,
        isAvailable: data.is_available,
        currentLat: data.current_lat,
        currentLng: data.current_lng
    };

    if (data.user) {
        driver.user = mapUser(data.user);
    }
    return driver;
}

export function mapTrip(data: any): any {
    if (!data) return data;
    const trip: any = {
        id: data.id,
        driverId: data.driver_id,
        pickupLocation: data.pickup_location,
        dropLocation: data.drop_location,
        pickupLat: data.pickup_lat,
        pickupLng: data.pickup_lng,
        dropLat: data.drop_lat,
        dropLng: data.drop_lng,
        departureTime: data.departure_time,
        pricePerSeat: data.price_per_seat,
        availableSeats: data.available_seats,
        totalSeats: data.total_seats,
        status: data.status,
        preferences: data.preferences,
        createdAt: data.created_at
    };

    if (data.driver) {
        trip.driver = mapDriver(data.driver);
    }
    return trip;
}

export function mapBooking(data: any): any {
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
        createdAt: data.created_at
    };

    if (data.trip) {
        booking.trip = mapTrip(data.trip);
    }
    if (data.passenger) {
        booking.passenger = mapUser(data.passenger);
    }
    return booking;
}

export function mapPayment(data: any): any {
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

export function mapEmergencyAlert(data: any): any {
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
