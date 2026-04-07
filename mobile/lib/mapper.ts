
// Utility to map Supabase snake_case to camelCase for the app

export function mapUser(data: any): any {
    if (!data) return data;
    return {
        id: data.id,
        fullName: data.full_name,
        email: data.email,
        phone: data.phone,
        role: data.role,
        profilePhoto: data.profile_photo || data.avatar_url,
        avatarUrl: data.avatar_url,
        bio: data.bio,
        organization: data.organization,
        referralCode: data.referral_code,
        onboardingCompleted: data.onboarding_completed,
        pushToken: data.push_token,
        notificationPreferences: data.notification_preferences,
        isVerified: data.verification_status === 'verified' || data.is_verified === true,
        verificationStatus: data.verification_status,
        createdAt: data.created_at,
        updatedAt: data.updated_at
    };
}

export function mapDriver(data: any): any {
    if (!data) return data;
    const driver: any = {
        id: data.id,
        userId: data.user_id,
        vehicleType: data.vehicle_type,
        vehicleMake: data.vehicle_make,
        vehicleModel: data.vehicle_model,
        vehicleYear: data.vehicle_year,
        vehicleColor: data.vehicle_color,
        vehiclePlate: data.vehicle_plate || data.vehicle_number,
        vehicleNumber: data.vehicle_number,
        licenseNumber: data.license_number,
        licensePhoto: data.license_photo,
        vehiclePhotos: data.vehicle_photos || [],
        verificationStatus: data.verification_status,
        isVerified: data.is_verified || data.verification_status === 'verified',
        rating: data.rating,
        totalTrips: data.total_trips,
        isAvailable: data.is_available,
        currentLat: data.current_lat,
        currentLng: data.current_lng,
        updatedAt: data.updated_at,
        createdAt: data.created_at
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
        bookingId: data.booking_id,
        driverId: data.driver_id,
        pickupLocation: data.pickup_location,
        dropLocation: data.drop_location,
        pickupLat: data.pickup_lat,
        pickupLng: data.pickup_lng,
        dropLat: data.drop_lat,
        dropLng: data.drop_lng,
        departureTime: data.departure_time || data.start_time,
        startTime: data.start_time,
        endTime: data.end_time,
        distanceCovered: data.distance_covered,
        distance: data.distance,
        duration: data.duration,
        pricePerSeat: data.price_per_seat,
        basePrice: data.base_price,
        surgeMultiplier: data.surge_multiplier,
        availableSeats: data.available_seats,
        totalSeats: data.total_seats,
        status: data.status,
        preferences: data.preferences,
        route: data.route,
        carbonSaved: data.carbon_saved,
        createdAt: data.created_at,
        updatedAt: data.updated_at
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
        driverId: data.driver_id,
        seatsBooked: data.seats_booked,
        fare: data.fare,
        totalAmount: data.total_amount || data.fare,
        status: data.status,
        otp: data.otp,
        paymentStatus: data.payment_status,
        isSplitFare: data.is_split_fare,
        splitFareDetails: data.split_fare_details,
        pickupLocation: data.pickup_location,
        dropLocation: data.drop_location,
        pickupLat: data.pickup_lat ? parseFloat(data.pickup_lat) : undefined,
        pickupLng: data.pickup_lng ? parseFloat(data.pickup_lng) : undefined,
        dropLat: data.drop_lat ? parseFloat(data.drop_lat) : undefined,
        dropLng: data.drop_lng ? parseFloat(data.drop_lng) : undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at
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
        payoutStatus: data.payout_status,
        refundStatus: data.refund_status,
        refundAmount: data.refund_amount,
        paymentMethod: data.payment_method,
        createdAt: data.created_at,
        updatedAt: data.updated_at
    };
}

export function mapRideRequest(data: any): any {
    if (!data) return data;
    const request: any = {
        id: data.id,
        passengerId: data.passenger_id,
        pickupLocation: data.pickup_location,
        pickupLat: data.pickup_lat,
        pickupLng: data.pickup_lng,
        dropLocation: data.drop_location,
        dropLat: data.drop_lat,
        dropLng: data.drop_lng,
        vehicleType: data.vehicle_type,
        fare: data.fare,
        distance: data.distance,
        duration: data.duration,
        status: data.status,
        matchedDriverId: data.matched_driver_id || data.driver_id,
        driverId: data.driver_id || data.matched_driver_id,
        tripId: data.trip_id,
        preferences: data.preferences,
        promoCode: data.promo_code,
        discountAmount: data.discount_amount,
        surgeMultiplier: data.surge_multiplier,
        timeoutAt: data.timeout_at,
        matchedAt: data.matched_at,
        acceptedAt: data.accepted_at,
        cancelledAt: data.cancelled_at,
        cancellationReason: data.cancellation_reason,
        createdAt: data.created_at,
        updatedAt: data.updated_at
    };

    if (data.passenger) {
        request.passenger = mapUser(data.passenger);
    }
    if (data.driver) {
        request.driver = mapDriver(data.driver);
    }
    return request;
}

export function mapMessage(data: any): any {
    if (!data) return data;
    return {
        id: data.id,
        tripId: data.trip_id,
        senderId: data.sender_id,
        receiverId: data.receiver_id,
        message: data.message,
        isRead: data.is_read,
        createdAt: data.created_at
    };
}

export function mapRating(data: any): any {
    if (!data) return data;
    return {
        id: data.id,
        tripId: data.trip_id,
        fromUserId: data.from_user_id,
        toUserId: data.to_user_id,
        rating: data.rating,
        review: data.review,
        createdAt: data.created_at
    };
}

export function mapLiveLocation(data: any): any {
    if (!data) return data;
    return {
        id: data.id,
        tripId: data.trip_id,
        driverId: data.driver_id,
        lat: data.lat,
        lng: data.lng,
        heading: data.heading,
        speed: data.speed,
        accuracy: data.accuracy,
        altitude: data.altitude,
        updatedAt: data.updated_at
    };
}

export function mapNotification(data: any): any {
    if (!data) return data;
    return {
        id: data.id,
        userId: data.user_id,
        title: data.title,
        message: data.message,
        type: data.type,
        isRead: data.is_read,
        data: data.data,
        createdAt: data.created_at
    };
}

export function mapSavedPlace(data: any): any {
    if (!data) return data;
    return {
        id: data.id,
        userId: data.user_id,
        name: data.name,
        address: data.address,
        lat: data.lat,
        lng: data.lng,
        placeType: data.place_type || data.type,
        icon: data.icon,
        createdAt: data.created_at,
        updatedAt: data.updated_at
    };
}

export function mapPromoCode(data: any): any {
    if (!data) return data;
    return {
        id: data.id,
        code: data.code,
        description: data.description,
        discountType: data.discount_type,
        discountValue: data.discount_value,
        maxDiscount: data.max_discount,
        minAmount: data.min_amount || data.min_fare,
        maxUses: data.max_uses,
        currentUses: data.current_uses,
        validFrom: data.valid_from,
        validUntil: data.valid_until,
        isActive: data.is_active,
        createdAt: data.created_at
    };
}

export function mapWallet(data: any): any {
    if (!data) return data;
    return {
        id: data.id,
        userId: data.user_id,
        balance: data.balance,
        currency: data.currency,
        createdAt: data.created_at,
        updatedAt: data.updated_at
    };
}

export function mapWalletTransaction(data: any): any {
    if (!data) return data;
    return {
        id: data.id,
        walletId: data.wallet_id,
        type: data.type,
        amount: data.amount,
        description: data.description,
        status: data.status,
        referenceId: data.reference_id,
        referenceType: data.reference_type,
        razorpayPaymentId: data.razorpay_payment_id,
        createdAt: data.created_at
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

export function mapFareConfig(data: any): any {
    if (!data) return data;
    return {
        id: data.id,
        vehicleType: data.vehicle_type,
        baseFare: data.base_fare,
        perKm: data.per_km,
        perMinute: data.per_minute,
        minFare: data.min_fare,
        createdAt: data.created_at,
        updatedAt: data.updated_at
    };
}

export function mapDriverAvailability(data: any): any {
    if (!data) return data;
    return {
        id: data.id,
        driverId: data.driver_id,
        isOnline: data.is_online,
        isAvailable: data.is_available,
        currentLat: data.current_lat,
        currentLng: data.current_lng,
        currentHeading: data.current_heading,
        currentSpeed: data.current_speed,
        batteryLevel: data.battery_level,
        lastLocationUpdate: data.last_location_update,
        activeRideId: data.active_ride_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at
    };
}

export function mapPromoCodeUse(data: any): any {
    if (!data) return data;
    return {
        id: data.id,
        promoCodeId: data.promo_code_id,
        userId: data.user_id,
        bookingId: data.booking_id,
        rideRequestId: data.ride_request_id,
        discountAmount: data.discount_amount,
        originalAmount: data.original_amount,
        finalAmount: data.final_amount,
        usedAt: data.used_at,
        createdAt: data.created_at
    };
}

export function mapRidePreference(data: any): any {
    if (!data) return data;
    return {
        id: data.id,
        userId: data.user_id,
        acPreferred: data.ac_preferred,
        musicAllowed: data.music_allowed,
        petFriendly: data.pet_friendly,
        luggageCapacity: data.luggage_capacity,
        conversationPreference: data.conversation_preference,
        createdAt: data.created_at,
        updatedAt: data.updated_at
    };
}

export function mapAutoPaySetting(data: any): any {
    if (!data) return data;
    return {
        id: data.id,
        userId: data.user_id,
        enabled: data.enabled,
        defaultPaymentMethod: data.default_payment_method,
        spendingLimit: data.spending_limit,
        requireConfirmation: data.require_confirmation,
        createdAt: data.created_at,
        updatedAt: data.updated_at
    };
}

export function mapUserPreference(data: any): any {
    if (!data) return data;
    return {
        id: data.id,
        userId: data.user_id,
        theme: data.theme,
        language: data.language,
        notificationSettings: data.notification_settings,
        createdAt: data.created_at,
        updatedAt: data.updated_at
    };
}

export function mapFavoriteRoute(data: any): any {
    if (!data) return data;
    return {
        id: data.id,
        userId: data.user_id,
        name: data.name,
        pickupLocation: data.pickup_location,
        pickupLat: data.pickup_lat,
        pickupLng: data.pickup_lng,
        dropLocation: data.drop_location,
        dropLat: data.drop_lat,
        dropLng: data.drop_lng,
        useCount: data.use_count,
        lastUsedAt: data.last_used_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at
    };
}

export function mapEmergencyContact(data: any): any {
    if (!data) return data;
    return {
        id: data.id,
        userId: data.user_id,
        name: data.name,
        phone: data.phone,
        email: data.email,
        relationship: data.relationship,
        isPrimary: data.is_primary,
        autoNotify: data.auto_notify,
        createdAt: data.created_at,
        updatedAt: data.updated_at
    };
}

export function mapSafetyCheckin(data: any): any {
    if (!data) return data;
    return {
        id: data.id,
        tripId: data.trip_id,
        userId: data.user_id,
        status: data.status,
        locationLat: data.location_lat,
        locationLng: data.location_lng,
        notes: data.notes,
        createdAt: data.created_at
    };
}

export function mapSavedPaymentMethod(data: any): any {
    if (!data) return data;
    return {
        id: data.id,
        userId: data.user_id,
        methodType: data.method_type,
        isDefault: data.is_default,
        cardLast4: data.card_last4,
        cardBrand: data.card_brand,
        cardToken: data.card_token,
        upiId: data.upi_id,
        bankName: data.bank_name,
        bankCode: data.bank_code,
        nickname: data.nickname,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at
    };
}

export function mapDriverTip(data: any): any {
    if (!data) return data;
    return {
        id: data.id,
        bookingId: data.booking_id,
        driverId: data.driver_id,
        passengerId: data.passenger_id,
        amount: data.amount,
        paymentMethod: data.payment_method,
        paymentStatus: data.payment_status,
        razorpayPaymentId: data.razorpay_payment_id,
        status: data.status,
        createdAt: data.created_at
    };
}

export function mapSplitFareRequest(data: any): any {
    if (!data) return data;
    return {
        id: data.id,
        bookingId: data.booking_id,
        requesterId: data.requester_id,
        participantEmail: data.participant_email,
        participantName: data.participant_name,
        participantPhone: data.participant_phone,
        participantId: data.participant_id,
        amount: data.amount,
        status: data.status,
        paymentMethod: data.payment_method,
        paidAt: data.paid_at,
        expiresAt: data.expires_at,
        createdAt: data.created_at
    };
}

export function mapReferralCode(data: any): any {
    if (!data) return data;
    return {
        id: data.id,
        userId: data.user_id,
        code: data.code,
        referralCount: data.referral_count,
        totalEarnings: data.total_earnings,
        createdAt: data.created_at
    };
}

export function mapReferralUse(data: any): any {
    if (!data) return data;
    return {
        id: data.id,
        referralCodeId: data.referral_code_id,
        referredUserId: data.referred_user_id,
        referrerReward: data.referrer_reward,
        refereeReward: data.referee_reward,
        status: data.status,
        completedAt: data.completed_at,
        createdAt: data.created_at
    };
}

export function mapRideSharingInvite(data: any): any {
    if (!data) return data;
    return {
        id: data.id,
        tripId: data.trip_id,
        inviterId: data.inviter_id,
        inviteeName: data.invitee_name,
        inviteeContact: data.invitee_contact,
        message: data.message,
        status: data.status,
        createdAt: data.created_at,
        updatedAt: data.updated_at
    };
}

export function mapRideSharingMatch(data: any): any {
    if (!data) return data;
    return {
        id: data.id,
        rideRequestId: data.ride_request_id,
        requesterId: data.requester_id,
        partnerId: data.partner_id,
        status: data.status,
        sharedDistance: data.shared_distance,
        costSplitPercentage: data.cost_split_percentage,
        requesterAmount: data.requester_amount,
        partnerAmount: data.partner_amount,
        message: data.message,
        respondedAt: data.responded_at,
        createdAt: data.created_at
    };
}

export function mapRideRecording(data: any): any {
    if (!data) return data;
    return {
        id: data.id,
        tripId: data.trip_id,
        bookingId: data.booking_id,
        routePoints: data.route_points,
        totalDistance: data.total_distance,
        totalDuration: data.total_duration,
        createdAt: data.created_at
    };
}

export function mapSurgePricingZone(data: any): any {
    if (!data) return data;
    return {
        id: data.id,
        zoneName: data.zone_name,
        zonePolygon: data.zone_polygon,
        currentMultiplier: data.current_multiplier,
        demandLevel: data.demand_level,
        isActive: data.is_active,
        updatedAt: data.updated_at,
        createdAt: data.created_at
    };
}

export function mapTripSurgePricing(data: any): any {
    if (!data) return data;
    return {
        id: data.id,
        tripId: data.trip_id,
        surgeMultiplier: data.surge_multiplier,
        baseFare: data.base_fare,
        surgeFare: data.surge_fare,
        createdAt: data.created_at
    };
}

export function mapRideStatistic(data: any): any {
    if (!data) return data;
    return {
        id: data.id,
        userId: data.user_id,
        totalRides: data.total_rides,
        totalDistance: data.total_distance,
        totalSpent: data.total_spent,
        totalSaved: data.total_saved,
        createdAt: data.created_at,
        updatedAt: data.updated_at
    };
}

export function mapRideInsurance(data: any): any {
    if (!data) return data;
    return {
        id: data.id,
        bookingId: data.booking_id,
        policyNumber: data.policy_number,
        provider: data.provider,
        coverageAmount: data.coverage_amount,
        premiumAmount: data.premium_amount,
        status: data.status,
        validFrom: data.valid_from,
        validUntil: data.valid_until,
        createdAt: data.created_at
    };
}

