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
    const layersRef = useRef<any[]>([]);

    const updateMapLayers = (L: any, map: any) => {
        // Clear existing layers
        layersRef.current.forEach(layer => map.removeLayer(layer));
        layersRef.current = [];

        // Simple function to add markers and polylines from children
        React.Children.forEach(children, (child: any) => {
            if (!child) return;
            const props = child.props;

            if (props.coordinate) {
                const marker = L.marker([props.coordinate.latitude, props.coordinate.longitude])
                    .addTo(map);
                if (props.title) marker.bindPopup(props.title);
                layersRef.current.push(marker);
            } else if (props.coordinates) {
                const polyline = L.polyline(
                    props.coordinates.map((c: any) => [c.latitude, c.longitude]),
                    { color: props.strokeColor || '#3b82f6', weight: props.strokeWidth || 3 }
                ).addTo(map);
                layersRef.current.push(polyline);
            }
        });
    };

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
                    const map = L.map(mapContainerRef.current).setView(
                        [initialRegion.latitude, initialRegion.longitude],
                        13
                    );

                    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    }).addTo(map);

                    mapRef.current = map;
                    updateMapLayers(L, map);
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

    // Update layers when children change
    useEffect(() => {
        const L = (window as any).L;
        if (L && mapRef.current) {
            updateMapLayers(L, mapRef.current);
        }
    }, [children]);

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

export const Marker = ({ coordinate, title, children }: any) => {
    return null;
};

export const Polyline = ({ coordinates, strokeColor, strokeWidth }: any) => {
    return null;
};
