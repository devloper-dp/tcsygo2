import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';

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

// OpenStreetMap implementation for web using Leaflet
export const Map = ({ style, initialRegion, children }: MapProps) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);

    useEffect(() => {
        // Dynamically load Leaflet only on web
        if (typeof window !== 'undefined' && mapContainerRef.current && !mapRef.current) {
            // Load Leaflet CSS
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);

            // Load Leaflet JS
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = () => {
                const L = (window as any).L;
                if (L && mapContainerRef.current) {
                    // Create map
                    const map = L.map(mapContainerRef.current).setView(
                        [initialRegion.latitude, initialRegion.longitude],
                        13
                    );

                    // Add OpenStreetMap tiles
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '© OpenStreetMap contributors',
                        maxZoom: 19,
                    }).addTo(map);

                    mapRef.current = map;
                }
            };
            document.head.appendChild(script);
        }

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [initialRegion]);

    return (
        <View style={style}>
            <div
                ref={mapContainerRef}
                style={{
                    width: '100%',
                    height: '100%',
                    minHeight: 300,
                }}
            />
        </View>
    );
};

export const Marker = ({ coordinate, title }: any) => {
    // Markers will be handled by the parent component passing them as children
    return null;
};

export const Polyline = ({ coordinates, strokeColor, strokeWidth }: any) => {
    // Polylines will be handled by the parent component
    return null;
};
