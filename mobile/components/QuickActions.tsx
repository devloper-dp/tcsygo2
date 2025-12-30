import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface QuickActionProps {
    onAction: (action: string) => void;
    recentRide?: {
        destination: string;
        time: string;
    };
    savedPlaces?: Array<{ id: string, name: string, icon: string, lat?: number, lng?: number }>;
}

export function QuickActions({ onAction, recentRide, savedPlaces = [] }: QuickActionProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Quick Actions</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Repeat Last Ride */}
                {recentRide && (
                    <TouchableOpacity
                        style={[styles.card, styles.repeatCard]}
                        onPress={() => onAction('repeat_ride')}
                    >
                        <View style={styles.iconBox}>
                            <Ionicons name="reload" size={20} color="#fff" />
                        </View>
                        <View>
                            <Text style={styles.cardTitle}>Repeat Ride</Text>
                            <Text style={styles.cardSubtitle} numberOfLines={1}>
                                To {recentRide.destination}
                            </Text>
                        </View>
                    </TouchableOpacity>
                )}

                {/* Saved Places */}
                {savedPlaces.map(place => (
                    <TouchableOpacity
                        key={place.id}
                        style={styles.card}
                        onPress={() => onAction(`place_${place.id}`)}
                    >
                        <View style={[styles.iconBox, { backgroundColor: '#eff6ff' }]}>
                            <Ionicons name={(place.icon as any) || 'location'} size={20} color="#3b82f6" />
                        </View>
                        <View>
                            <Text style={styles.cardTitle}>{place.name}</Text>
                            <Text style={styles.cardAction}>Go now</Text>
                        </View>
                    </TouchableOpacity>
                ))}

                {/* Add Place */}
                <TouchableOpacity
                    style={[styles.card, { borderStyle: 'dashed', borderWidth: 1, borderColor: '#d1d5db', backgroundColor: 'transparent' }]}
                    onPress={() => onAction('add_place')}
                >
                    <View style={[styles.iconBox, { backgroundColor: '#f3f4f6' }]}>
                        <Ionicons name="add" size={20} color="#6b7280" />
                    </View>
                    <Text style={[styles.cardTitle, { color: '#6b7280' }]}>Add Place</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
        paddingHorizontal: 16,
        color: '#1f2937',
    },
    scrollContent: {
        paddingHorizontal: 16,
        gap: 12,
    },
    card: {
        backgroundColor: 'white',
        padding: 12,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        width: 160,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    repeatCard: {
        backgroundColor: '#1e40af', // Dark blue
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    cardSubtitle: {
        fontSize: 12,
        color: '#dbeafe',
    },
    cardAction: {
        fontSize: 12,
        color: '#3b82f6',
        fontWeight: '500',
    },
});
