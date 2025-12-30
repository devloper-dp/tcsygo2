import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Ionicons } from '@expo/vector-icons';
import { RideService, FareEstimate } from '@/services/RideService';

interface FareEstimationProps {
    pickupCoords: { lat: number; lng: number };
    dropCoords: { lat: number; lng: number };
    onBook: (vehicleType: string, price: number) => void;
}

export function FareEstimation({ pickupCoords, dropCoords, onBook }: FareEstimationProps) {
    const [loading, setLoading] = useState(false);
    const [estimate, setEstimate] = useState<FareEstimate | null>(null);
    const [selectedType, setSelectedType] = useState<string>('bike');

    useEffect(() => {
        fetchEstimate();
    }, [pickupCoords, dropCoords]);

    const fetchEstimate = async () => {
        setLoading(true);
        try {
            const data = await RideService.estimateFare(pickupCoords, dropCoords);
            setEstimate(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#3b82f6" />
                <Text style={styles.loadingText}>Calculating best fares...</Text>
            </View>
        );
    }

    if (!estimate) return null;

    const vehicles = [
        { id: 'bike', name: 'Bike', icon: 'bicycle', multiplier: 0.5, time: estimate.durationMins },
        { id: 'auto', name: 'Auto', icon: 'bicycle-outline', multiplier: 0.8, time: estimate.durationMins + 2 }, // Auto icon workaround
        { id: 'cab', name: 'Cab', icon: 'car', multiplier: 1.5, time: estimate.durationMins + 5 },
    ];

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Instant Booking</Text>
            {estimate.surgeMultiplier > 1 && (
                <View style={styles.surgeBadge}>
                    <Ionicons name="flash" size={14} color="white" />
                    <Text style={styles.surgeText}>
                        Surge pricing active ({estimate.surgeMultiplier}x) due to high demand
                    </Text>
                </View>
            )}

            <View style={styles.optionsGrid}>
                {vehicles.map((v) => {
                    // Adjust price based on base estimate + multiplier
                    // RideService returns a base estimate which might be car-based or generic
                    // Let's assume RideService returns a 'Standard' price and we adjust
                    const price = Math.round(estimate.estimatedPrice * v.multiplier);

                    return (
                        <TouchableOpacity
                            key={v.id}
                            style={[
                                styles.optionCard,
                                selectedType === v.id && styles.optionCardActive
                            ]}
                            onPress={() => setSelectedType(v.id)}
                        >
                            <View style={styles.iconContainer}>
                                <Ionicons
                                    name={v.id === 'auto' ? 'car-sport' : v.icon as any}
                                    size={24}
                                    color={selectedType === v.id ? 'white' : '#374151'}
                                />
                            </View>
                            <Text style={[styles.vehicleName, selectedType === v.id && styles.textActive]}>
                                {v.name}
                            </Text>
                            <Text style={[styles.timeText, selectedType === v.id && { color: '#bfdbfe' }]}>
                                {v.time} min
                            </Text>
                            <Text style={[styles.priceText, selectedType === v.id && styles.textActive]}>
                                ₹{price}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <TouchableOpacity
                style={styles.bookBtn}
                onPress={() => {
                    const vehicle = vehicles.find(v => v.id === selectedType);
                    if (vehicle) {
                        const price = Math.round(estimate.estimatedPrice * vehicle.multiplier);
                        onBook(selectedType, price);
                    }
                }}
            >
                <Text style={styles.bookBtnText}>Book {vehicles.find(v => v.id === selectedType)?.name}</Text>
                <Ionicons name="arrow-forward" size={20} color="white" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: 'white',
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    loadingContainer: {
        padding: 20,
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        color: '#6b7280',
        fontSize: 14,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 12,
    },
    surgeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ef4444',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 20,
        alignSelf: 'flex-start',
        marginBottom: 16,
        gap: 6,
    },
    surgeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    optionsGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    optionCard: {
        flex: 1,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
    },
    optionCardActive: {
        backgroundColor: '#3b82f6',
        borderColor: '#3b82f6',
    },
    iconContainer: {
        marginBottom: 8,
    },
    vehicleName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 4,
    },
    timeText: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 4,
    },
    priceText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    textActive: {
        color: 'white',
    },
    bookBtn: {
        backgroundColor: '#1f2937',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    bookBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
