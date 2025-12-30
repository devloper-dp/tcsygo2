import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/card';

export function RideInsuranceCard({ style }: { style?: any }) {
    return (
        <Card style={[styles.container, style]}>
            <View style={styles.header}>
                <Ionicons name="shield-checkmark" size={24} color="#10b981" />
                <Text style={styles.title}>Ride Insured</Text>
            </View>

            <Text style={styles.description}>
                This ride is insured by Acko General Insurance. Covers medical expenses, hospitalization, and more.
            </Text>

            <TouchableOpacity style={styles.link}>
                <Text style={styles.linkText}>View Policy Details</Text>
                <Ionicons name="chevron-forward" size={16} color="#3b82f6" />
            </TouchableOpacity>
        </Card>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: '#ecfdf5',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#a7f3d0',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#065f46',
    },
    description: {
        fontSize: 13,
        color: '#047857',
        lineHeight: 18,
        marginBottom: 12,
    },
    link: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    linkText: {
        fontSize: 14,
        color: '#3b82f6',
        fontWeight: '500',
        marginRight: 4,
    },
});
