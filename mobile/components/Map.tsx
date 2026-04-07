import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps';
import { View, Platform, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

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
            style={[StyleSheet.absoluteFillObject, style]}
            className={className}
            initialRegion={initialRegion}
            region={region}
            showsUserLocation
            showsMyLocationButton={false}
            // Use 'none' to disable the base map layer when using custom tiles
            mapType={Platform.OS === 'android' ? 'none' : 'standard'}
        >
            <UrlTile
                /**
                 * Use CARTO Voyager tiles (based on OSM data) for a reliable open mapping experience.
                 * This avoids 403 errors from direct OSM servers which require specific User-Agents.
                 */
                urlTemplate="https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                maximumZ={19}
                tileSize={256}
                flipY={false}
            />
            {children}
        </MapView>
    );
}
 
export { Marker, Polyline };
