import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Coordinates } from '@/lib/maps';

interface TripRecordingProps {
    tripId: string;
    isActive: boolean;
    onRecordingComplete?: (recordingId: string) => void;
}

interface RoutePoint extends Coordinates {
    timestamp: number;
    speed?: number;
    heading?: number;
}

interface TripStatistics {
    totalDistance: number;
    duration: number;
    averageSpeed: number;
    maxSpeed: number;
    startTime: number;
    endTime: number;
}

export function TripRecording({ tripId, isActive, onRecordingComplete }: TripRecordingProps) {
    const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
    const [statistics, setStatistics] = useState<TripStatistics | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (!isActive) return;

        let watchId: number | null = null;
        const startTime = Date.now();

        // Start recording GPS coordinates
        if ('geolocation' in navigator) {
            watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const point: RoutePoint = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        timestamp: position.timestamp,
                        speed: position.coords.speed || undefined,
                        heading: position.coords.heading || undefined,
                    };

                    setRoutePoints((prev) => [...prev, point]);
                },
                (error) => {
                    console.error('GPS recording error:', error);
                },
                {
                    enableHighAccuracy: true,
                    maximumAge: 0,
                    timeout: 5000,
                }
            );
        }

        return () => {
            if (watchId !== null) {
                navigator.geolocation.clearWatch(watchId);
            }
        };
    }, [isActive, tripId]);

    // Calculate statistics when recording stops
    useEffect(() => {
        if (!isActive && routePoints.length > 1) {
            calculateAndSaveRecording();
        }
    }, [isActive, routePoints]);

    const calculateDistance = (point1: Coordinates, point2: Coordinates): number => {
        const R = 6371; // Earth's radius in km
        const dLat = ((point2.lat - point1.lat) * Math.PI) / 180;
        const dLon = ((point2.lng - point1.lng) * Math.PI) / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((point1.lat * Math.PI) / 180) *
            Math.cos((point2.lat * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const calculateAndSaveRecording = async () => {
        if (routePoints.length < 2) return;

        // Calculate total distance
        let totalDistance = 0;
        for (let i = 1; i < routePoints.length; i++) {
            totalDistance += calculateDistance(routePoints[i - 1], routePoints[i]);
        }

        // Calculate duration
        const startTime = routePoints[0].timestamp;
        const endTime = routePoints[routePoints.length - 1].timestamp;
        const duration = (endTime - startTime) / 1000; // in seconds

        // Calculate speeds
        const speeds = routePoints.filter((p) => p.speed !== undefined).map((p) => p.speed!);
        const averageSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
        const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0;

        const stats: TripStatistics = {
            totalDistance,
            duration,
            averageSpeed,
            maxSpeed,
            startTime,
            endTime,
        };

        setStatistics(stats);

        // Save to database
        try {
            const { data, error } = await supabase
                .from('ride_recordings')
                .insert({
                    trip_id: tripId,
                    route_data: routePoints,
                    statistics: stats,
                })
                .select()
                .single();

            if (error) throw error;

            toast({
                title: 'Trip Recorded',
                description: 'Your trip has been saved successfully.',
            });

            if (onRecordingComplete && data) {
                onRecordingComplete(data.id);
            }
        } catch (error: any) {
            console.error('Failed to save trip recording:', error);
            toast({
                title: 'Recording Failed',
                description: 'Unable to save trip recording.',
                variant: 'destructive',
            });
        }
    };

    // This component doesn't render anything visible
    return null;
}
