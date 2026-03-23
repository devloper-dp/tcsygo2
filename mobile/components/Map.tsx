import React from 'react';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { View, Platform } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
 
// Premium Tactical Dark Map Style
const DARK_MAP_STYLE = [
  {
    "elementType": "geometry",
    "stylers": [{ "color": "#020617" }]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#475569" }]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#020617" }]
  },
  {
    "featureType": "administrative",
    "elementType": "geometry",
    "stylers": [{ "color": "#1e293b" }]
  },
  {
    "featureType": "poi",
    "elementType": "geometry",
    "stylers": [{ "color": "#0f172a" }]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#64748b" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [{ "color": "#1e293b" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#0f172a" }]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#94a3b8" }]
  },
  {
    "featureType": "transit",
    "elementType": "geometry",
    "stylers": [{ "color": "#0f172a" }]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{ "color": "#020617" }]
  }
];
 
interface MapProps {
    children?: React.ReactNode;
    style?: any;
    className?: string;
    initialRegion?: any;
    region?: any;
}
 
export function Map({ children, style, className, initialRegion, region }: MapProps) {
    const { isDark } = useTheme();
 
    if (Platform.OS === 'web') {
        const MapWeb = require('./Map.web').Map;
        return <MapWeb style={style} className={className} initialRegion={initialRegion}>{children}</MapWeb>;
    }
 
    return (
        <MapView
            style={style}
            className={className}
            initialRegion={initialRegion}
            region={region}
            showsUserLocation
            showsMyLocationButton={false}
            customMapStyle={isDark ? DARK_MAP_STYLE : []}
        >
            {children}
        </MapView>
    );
}
 
export { Marker, Polyline };
