
// Replicating shared/schema types for Mobile App
export const UserRole = {
    PASSENGER: "passenger",
    DRIVER: "driver",
    BOTH: "both"
} as const;

export const TripStatus = {
    UPCOMING: "upcoming",
    ONGOING: "ongoing",
    COMPLETED: "completed",
    CANCELLED: "cancelled"
} as const;

export interface User {
    id: string;
    email: string;
    fullName: string;
    phone?: string | null;
    profilePhoto?: string | null;
    role: string;
    bio?: string | null;
    verificationStatus?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface Driver {
    id: string;
    userId: string;
    licenseNumber: string;
    licensePhoto?: string | null;
    vehicleMake: string;
    vehicleModel: string;
    vehicleYear: number;
    vehicleColor: string;
    vehiclePlate: string;
    vehiclePhotos: string[];
    isAvailable: boolean;
    rating: string;
    totalTrips: number;
    verificationStatus: string;
    documents: { type: string; url: string }[];
    createdAt: string;
    updatedAt: string;
}

export interface Trip {
    id: string;
    driverId: string;
    pickupLocation: string;
    pickupLat: string;
    pickupLng: string;
    dropLocation: string;
    dropLat: string;
    dropLng: string;
    departureTime: string;
    distance: string;
    duration: number;
    pricePerSeat: string;
    availableSeats: number;
    totalSeats: number;
    status: string;
    route?: { lat: number; lng: number }[] | null;
    preferences: {
        smoking?: boolean;
        pets?: boolean;
        music?: boolean;
    };
    createdAt: string;
    updatedAt: string;
}

export type TripWithDriver = Trip & {
    driver: Driver & { user: User };
};
