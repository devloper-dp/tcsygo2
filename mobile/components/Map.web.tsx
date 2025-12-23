import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MapProps {
    style: any;
    initialRegion: {
        latitude: number;
        longitude: number;
        latitudeDelta: number;
        longitudeDelta: number;
    };
    children?: React.ReactNode;
}

// Simple fallback for web to prevent 500 error
export const Map = ({ style, initialRegion, children }: MapProps) => {
    return (
        <View style={[style, styles.container]}>
            <Text style={styles.text}>Maps are not available on web in this demo.</Text>
            <Text style={styles.subtext}>Coordinates: {initialRegion.latitude}, {initialRegion.longitude}</Text>
            {children}
        </View>
    );
};

export const Marker = ({ coordinate, title }: any) => {
    return null; // Don't render markers on web fallback
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    text: {
        fontSize: 16,
        color: '#4b5563',
        fontWeight: '600',
        textAlign: 'center',
    },
    subtext: {
        fontSize: 14,
        color: '#9ca3af',
        marginTop: 8,
    }
});
