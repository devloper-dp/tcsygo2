import React from 'react';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { View, StyleSheet, Platform } from 'react-native';

interface MapProps {
    children?: React.ReactNode;
    style?: any;
    initialRegion?: any;
}

export function Map({ children, style, initialRegion }: MapProps) {
    if (Platform.OS === 'web') {
        const MapWeb = require('./Map.web').Map;
        return <MapWeb style={style} initialRegion={initialRegion}>{children}</MapWeb>;
    }

    // Using default provider (no PROVIDER_GOOGLE) allows for OSM tiles
    // This works without any API keys and is free to use
    return (
        <MapView
            style={style}
            initialRegion={initialRegion}
            showsUserLocation
            showsMyLocationButton
        >
            {children}
        </MapView>
    );
}

export { Marker, Polyline };

const styles = StyleSheet.create({});
