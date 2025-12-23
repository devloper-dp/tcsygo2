import React from 'react';
import MapView, { Marker } from 'react-native-maps';
import { StyleSheet } from 'react-native';

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

export const Map = ({ style, initialRegion, children }: MapProps) => {
    return (
        <MapView style={style} initialRegion={initialRegion}>
            {children}
        </MapView>
    );
};

export { Marker };

const styles = StyleSheet.create({});
