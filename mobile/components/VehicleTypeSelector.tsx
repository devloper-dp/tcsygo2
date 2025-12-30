import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Bike, Car, Zap, Clock, IndianRupee } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { RideService, FareEstimate } from '@/services/RideService';

interface VehicleType {
    id: 'bike' | 'auto' | 'cab' | 'premium';
    name: string;
    icon: string;
    description: string;
    multiplier: number;
    capacity: number;
    features: string[];
}

interface VehicleTypeSelectorProps {
    pickupCoords: { lat: number; lng: number };
    dropCoords: { lat: number; lng: number };
    onSelect: (vehicleType: string, price: number, eta: number) => void;
    selectedType?: string;
}

export const VehicleTypeSelector: React.FC<VehicleTypeSelectorProps> = ({
    pickupCoords,
    dropCoords,
    onSelect,
    selectedType: initialSelectedType,
}) => {
    const [selectedType, setSelectedType] = useState<string>(initialSelectedType || 'bike');
    const [loading, setLoading] = useState(true);
    const [baseEstimate, setBaseEstimate] = useState<FareEstimate | null>(null);
    const [surgeActive, setSurgeActive] = useState(false);

    const vehicleTypes: VehicleType[] = [
        {
            id: 'bike',
            name: 'Bike',
            icon: 'bicycle',
            description: 'Affordable & Fast',
            multiplier: 0.5,
            capacity: 1,
            features: ['Quick pickup', 'Beat traffic', 'Eco-friendly'],
        },
        {
            id: 'auto',
            name: 'Auto',
            icon: 'car-sport',
            description: 'Comfortable Ride',
            multiplier: 0.8,
            capacity: 3,
            features: ['More space', 'Weather protection', 'Affordable'],
        },
        {
            id: 'cab',
            name: 'Cab',
            icon: 'car',
            description: 'Premium Comfort',
            multiplier: 1.5,
            capacity: 4,
            features: ['AC available', 'Spacious', 'Professional drivers'],
        },
        {
            id: 'premium',
            name: 'Premium',
            icon: 'car-sport-outline',
            description: 'Luxury Experience',
            multiplier: 2.0,
            capacity: 4,
            features: ['Luxury cars', 'Top-rated drivers', 'Premium service'],
        },
    ];

    useEffect(() => {
        loadFareEstimate();
    }, [pickupCoords, dropCoords]);

    const loadFareEstimate = async () => {
        setLoading(true);
        try {
            const estimate = await RideService.estimateFare(pickupCoords, dropCoords);
            setBaseEstimate(estimate);
            setSurgeActive(estimate.surgeMultiplier > 1);
        } catch (error) {
            console.error('Error loading fare estimate:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectVehicle = (vehicle: VehicleType) => {
        if (!baseEstimate) return;

        setSelectedType(vehicle.id);
        const price = Math.round(baseEstimate.estimatedPrice * vehicle.multiplier);
        const eta = Math.round(baseEstimate.durationMins + (vehicle.id === 'bike' ? 0 : vehicle.id === 'auto' ? 2 : 5));

        onSelect(vehicle.id, price, eta);
    };

    const calculatePrice = (multiplier: number): number => {
        if (!baseEstimate) return 0;
        return Math.round(baseEstimate.estimatedPrice * multiplier);
    };

    const calculateETA = (vehicleId: string): number => {
        if (!baseEstimate) return 0;
        const baseETA = baseEstimate.durationMins;

        switch (vehicleId) {
            case 'bike':
                return baseETA;
            case 'auto':
                return baseETA + 2;
            case 'cab':
            case 'premium':
                return baseETA + 5;
            default:
                return baseETA;
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Finding best options...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Choose Your Ride</Text>
                {surgeActive && (
                    <View style={styles.surgeBadge}>
                        <Zap size={14} color="#fff" fill="#fff" />
                        <Text style={styles.surgeText}>
                            {baseEstimate?.surgeMultiplier}x Surge
                        </Text>
                    </View>
                )}
            </View>

            {baseEstimate && (
                <View style={styles.tripInfo}>
                    <View style={styles.tripInfoItem}>
                        <Clock size={16} color="#6b7280" />
                        <Text style={styles.tripInfoText}>
                            {baseEstimate.distanceKm} km
                        </Text>
                    </View>
                    <View style={styles.tripInfoDivider} />
                    <View style={styles.tripInfoItem}>
                        <Clock size={16} color="#6b7280" />
                        <Text style={styles.tripInfoText}>
                            ~{baseEstimate.durationMins} mins
                        </Text>
                    </View>
                </View>
            )}

            <View style={styles.vehicleGrid}>
                {vehicleTypes.map((vehicle) => {
                    const isSelected = selectedType === vehicle.id;
                    const price = calculatePrice(vehicle.multiplier);
                    const eta = calculateETA(vehicle.id);

                    return (
                        <TouchableOpacity
                            key={vehicle.id}
                            style={[
                                styles.vehicleCard,
                                isSelected && styles.vehicleCardSelected,
                            ]}
                            onPress={() => handleSelectVehicle(vehicle)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.vehicleHeader}>
                                <View
                                    style={[
                                        styles.iconContainer,
                                        isSelected && styles.iconContainerSelected,
                                    ]}
                                >
                                    <Ionicons
                                        name={vehicle.icon as any}
                                        size={28}
                                        color={isSelected ? '#fff' : '#374151'}
                                    />
                                </View>
                                {isSelected && (
                                    <View style={styles.selectedBadge}>
                                        <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                                    </View>
                                )}
                            </View>

                            <Text style={[styles.vehicleName, isSelected && styles.textSelected]}>
                                {vehicle.name}
                            </Text>
                            <Text
                                style={[
                                    styles.vehicleDescription,
                                    isSelected && styles.descriptionSelected,
                                ]}
                            >
                                {vehicle.description}
                            </Text>

                            <View style={styles.capacityContainer}>
                                <Ionicons
                                    name="person"
                                    size={14}
                                    color={isSelected ? '#bfdbfe' : '#9ca3af'}
                                />
                                <Text
                                    style={[
                                        styles.capacityText,
                                        isSelected && styles.capacityTextSelected,
                                    ]}
                                >
                                    {vehicle.capacity} {vehicle.capacity === 1 ? 'seat' : 'seats'}
                                </Text>
                            </View>

                            <View style={styles.priceContainer}>
                                <View style={styles.priceRow}>
                                    <IndianRupee
                                        size={18}
                                        color={isSelected ? '#fff' : '#1f2937'}
                                    />
                                    <Text style={[styles.price, isSelected && styles.priceSelected]}>
                                        {price}
                                    </Text>
                                </View>
                                <Text
                                    style={[
                                        styles.etaText,
                                        isSelected && styles.etaTextSelected,
                                    ]}
                                >
                                    {eta} min
                                </Text>
                            </View>

                            {isSelected && (
                                <View style={styles.featuresContainer}>
                                    {vehicle.features.slice(0, 2).map((feature, index) => (
                                        <View key={index} style={styles.featureItem}>
                                            <Ionicons
                                                name="checkmark-circle"
                                                size={12}
                                                color="#10b981"
                                            />
                                            <Text style={styles.featureText}>{feature}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>

            {surgeActive && baseEstimate && (
                <View style={styles.surgeInfo}>
                    <Zap size={16} color="#ef4444" fill="#ef4444" />
                    <Text style={styles.surgeInfoText}>
                        High demand in your area. Prices are {baseEstimate.surgeMultiplier}x higher than usual.
                    </Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '500',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1f2937',
    },
    surgeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ef4444',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    surgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#fff',
    },
    tripInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    tripInfoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    tripInfoText: {
        fontSize: 14,
        color: '#4b5563',
        fontWeight: '500',
    },
    tripInfoDivider: {
        width: 1,
        height: 16,
        backgroundColor: '#d1d5db',
        marginHorizontal: 16,
    },
    vehicleGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    vehicleCard: {
        width: '48%',
        backgroundColor: '#f9fafb',
        borderRadius: 12,
        padding: 14,
        borderWidth: 2,
        borderColor: '#e5e7eb',
    },
    vehicleCardSelected: {
        backgroundColor: '#3b82f6',
        borderColor: '#3b82f6',
    },
    vehicleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#e5e7eb',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainerSelected: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    selectedBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#fff',
        borderRadius: 10,
    },
    vehicleName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 2,
    },
    textSelected: {
        color: '#fff',
    },
    vehicleDescription: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 8,
    },
    descriptionSelected: {
        color: '#bfdbfe',
    },
    capacityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 8,
    },
    capacityText: {
        fontSize: 11,
        color: '#9ca3af',
    },
    capacityTextSelected: {
        color: '#bfdbfe',
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    price: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1f2937',
    },
    priceSelected: {
        color: '#fff',
    },
    etaText: {
        fontSize: 12,
        color: '#6b7280',
        fontWeight: '600',
    },
    etaTextSelected: {
        color: '#bfdbfe',
    },
    featuresContainer: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.2)',
        gap: 6,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    featureText: {
        fontSize: 11,
        color: '#fff',
        fontWeight: '500',
    },
    surgeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fef2f2',
        padding: 12,
        borderRadius: 8,
        marginTop: 16,
        gap: 8,
    },
    surgeInfoText: {
        flex: 1,
        fontSize: 12,
        color: '#991b1b',
        fontWeight: '500',
    },
});
