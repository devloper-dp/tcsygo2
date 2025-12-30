import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/card';

interface Coordinates {
    latitude: number;
    longitude: number;
}

interface TripReplayProps {
    route: Coordinates[];
    pickup: Coordinates;
    drop: Coordinates;
    style?: any;
}

export function TripReplay({ route, pickup, drop, style }: TripReplayProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [speed, setSpeed] = useState(1);
    const [currentPos, setCurrentPos] = useState<Coordinates>(pickup);
    const animationRef = useRef<any>(null);

    useEffect(() => {
        if (isPlaying) {
            animationRef.current = setInterval(() => {
                setProgress((prev) => {
                    if (prev >= route.length - 1) {
                        setIsPlaying(false);
                        return 0; // Reset or stop
                    }
                    const nextIndex = Math.min(prev + speed, route.length - 1);
                    // Very rough interpolation could go here, but jumping points for MVP
                    setCurrentPos(route[Math.floor(nextIndex)]);
                    return nextIndex;
                });
            }, 100);
        } else {
            if (animationRef.current) clearInterval(animationRef.current);
        }

        return () => {
            if (animationRef.current) clearInterval(animationRef.current);
        };
    }, [isPlaying, speed]);

    const togglePlay = () => setIsPlaying(!isPlaying);

    const handleSpeedChange = () => {
        setSpeed(prev => prev >= 4 ? 1 : prev * 2);
    };

    return (
        <Card style={[styles.container, style]}>
            <View style={styles.mapContainer}>
                <MapView
                    style={styles.map}
                    provider={PROVIDER_DEFAULT}
                    initialRegion={{
                        ...pickup,
                        latitudeDelta: 0.05,
                        longitudeDelta: 0.05,
                    }}
                >
                    <Marker coordinate={pickup} pinColor="green" title="Pickup" />
                    <Marker coordinate={drop} pinColor="red" title="Drop" />

                    <Polyline
                        coordinates={route}
                        strokeColor="#3b82f6"
                        strokeWidth={4}
                    />

                    {/* Current Vehicle Position */}
                    <Marker coordinate={currentPos}>
                        <View style={styles.vehicleMarker}>
                            <Ionicons name="car" size={20} color="white" />
                        </View>
                    </Marker>
                </MapView>
            </View>

            <View style={styles.controls}>
                <TouchableOpacity onPress={togglePlay} style={styles.playButton}>
                    <Ionicons name={isPlaying ? "pause" : "play"} size={24} color="white" />
                </TouchableOpacity>

                <View style={styles.progressInfo}>
                    <Text style={styles.progressText}>
                        {Math.round((progress / route.length) * 100)}% Complete
                    </Text>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${(progress / route.length) * 100}%` }]} />
                    </View>
                </View>

                <TouchableOpacity onPress={handleSpeedChange} style={styles.speedButton}>
                    <Text style={styles.speedText}>{speed}x</Text>
                </TouchableOpacity>
            </View>
        </Card>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: 'white',
    },
    mapContainer: {
        height: 200,
        width: '100%',
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    vehicleMarker: {
        backgroundColor: '#3b82f6',
        padding: 6,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: 'white',
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    playButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#3b82f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressInfo: {
        flex: 1,
    },
    progressText: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 4,
    },
    progressBar: {
        height: 4,
        backgroundColor: '#e5e7eb',
        borderRadius: 2,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#3b82f6',
        borderRadius: 2,
    },
    speedButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
    },
    speedText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
});
