import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { MapView } from '@/components/MapView';
import { Play, Pause, RotateCcw, FastForward, Clock, MapPin, TrendingUp, X } from 'lucide-react';
import { Coordinates } from '@/lib/maps';
import { format } from 'date-fns';

interface TripReplayProps {
    tripId: string;
    route: Coordinates[];
    startTime: string;
    endTime: string;
    pickupLocation: string;
    dropLocation: string;
    distance: number;
    duration: number;
    className?: string;
    onClose?: () => void;
}

export function TripReplay({
    tripId,
    route,
    startTime,
    endTime,
    pickupLocation,
    dropLocation,
    distance,
    duration,
    className = '',
    onClose,
}: TripReplayProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (!isPlaying || currentIndex >= route.length - 1) {
            setIsPlaying(false);
            return;
        }

        const interval = setInterval(() => {
            setCurrentIndex((prev) => {
                const next = prev + 1;
                if (next >= route.length - 1) {
                    setIsPlaying(false);
                    return route.length - 1;
                }
                return next;
            });
        }, 1000 / playbackSpeed);

        return () => clearInterval(interval);
    }, [isPlaying, currentIndex, playbackSpeed, route.length]);

    useEffect(() => {
        setProgress((currentIndex / (route.length - 1)) * 100);
    }, [currentIndex, route.length]);

    const handlePlayPause = () => {
        if (currentIndex >= route.length - 1) {
            setCurrentIndex(0);
        }
        setIsPlaying(!isPlaying);
    };

    const handleReset = () => {
        setCurrentIndex(0);
        setIsPlaying(false);
        setProgress(0);
    };

    const handleSpeedChange = () => {
        const speeds = [0.5, 1, 2, 4];
        const currentSpeedIndex = speeds.indexOf(playbackSpeed);
        const nextSpeed = speeds[(currentSpeedIndex + 1) % speeds.length];
        setPlaybackSpeed(nextSpeed);
    };

    const handleProgressChange = (value: number[]) => {
        const newIndex = Math.floor((value[0] / 100) * (route.length - 1));
        setCurrentIndex(newIndex);
        setProgress(value[0]);
    };

    // Calculate elapsed time based on progress
    const start = new Date(startTime);
    const end = new Date(endTime);
    const totalDuration = end.getTime() - start.getTime();
    const elapsedTime = new Date(start.getTime() + (totalDuration * progress) / 100);

    // Prepare markers for map
    const markers = [
        {
            id: 'pickup',
            coordinates: route[0],
            color: '#22c55e',
            popup: `<strong>Pickup:</strong> ${pickupLocation}`,
        },
        {
            id: 'drop',
            coordinates: route[route.length - 1],
            color: '#ef4444',
            popup: `<strong>Drop:</strong> ${dropLocation}`,
        },
    ];

    if (currentIndex > 0 && currentIndex < route.length) {
        markers.push({
            id: 'current',
            coordinates: route[currentIndex],
            color: '#3b82f6',
            popup: `<strong>Current Position</strong>`,
        });
    }

    return (
        <Card className={`overflow-hidden relative ${className}`}>
            {onClose && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 z-10 bg-background/80 hover:bg-background rounded-full"
                    onClick={onClose}
                >
                    <X className="w-4 h-4" />
                </Button>
            )}
            {/* Map View */}
            <div className="relative h-96">
                <MapView
                    markers={markers}
                    route={route.slice(0, currentIndex + 1)}
                    className="w-full h-full"
                    zoom={13}
                />

                {/* Playback Badge */}
                <Badge
                    variant="secondary"
                    className="absolute top-4 left-4 bg-background/90 backdrop-blur"
                >
                    <Clock className="w-3 h-3 mr-1" />
                    {format(elapsedTime, 'HH:mm:ss')}
                </Badge>
            </div>

            {/* Controls */}
            <div className="p-6 space-y-4">
                {/* Progress Bar */}
                <div className="space-y-2">
                    <Slider
                        value={[progress]}
                        onValueChange={handleProgressChange}
                        max={100}
                        step={0.1}
                        className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{format(start, 'HH:mm')}</span>
                        <span>
                            {currentIndex + 1} / {route.length} points
                        </span>
                        <span>{format(end, 'HH:mm')}</span>
                    </div>
                </div>

                {/* Playback Controls */}
                <div className="flex items-center justify-center gap-2">
                    <Button
                        size="icon"
                        variant="outline"
                        onClick={handleReset}
                        disabled={currentIndex === 0}
                    >
                        <RotateCcw className="w-4 h-4" />
                    </Button>

                    <Button
                        size="lg"
                        onClick={handlePlayPause}
                        className="w-24"
                    >
                        {isPlaying ? (
                            <>
                                <Pause className="w-4 h-4 mr-2" />
                                Pause
                            </>
                        ) : (
                            <>
                                <Play className="w-4 h-4 mr-2" />
                                Play
                            </>
                        )}
                    </Button>

                    <Button
                        size="icon"
                        variant="outline"
                        onClick={handleSpeedChange}
                    >
                        <FastForward className="w-4 h-4" />
                    </Button>

                    <Badge variant="outline" className="ml-2">
                        {playbackSpeed}x
                    </Badge>
                </div>

                {/* Trip Stats */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                            <MapPin className="w-4 h-4" />
                            <span className="text-xs">Distance</span>
                        </div>
                        <p className="text-lg font-semibold">
                            {(distance / 1000).toFixed(1)} km
                        </p>
                    </div>
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                            <Clock className="w-4 h-4" />
                            <span className="text-xs">Duration</span>
                        </div>
                        <p className="text-lg font-semibold">
                            {Math.floor(duration / 60)} min
                        </p>
                    </div>
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                            <TrendingUp className="w-4 h-4" />
                            <span className="text-xs">Avg Speed</span>
                        </div>
                        <p className="text-lg font-semibold">
                            {Math.round((distance / 1000) / (duration / 3600))} km/h
                        </p>
                    </div>
                </div>

                {/* Route Info */}
                <div className="space-y-2 pt-4 border-t">
                    <div className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-success mt-2" />
                        <div className="flex-1">
                            <p className="text-xs text-muted-foreground">Pickup</p>
                            <p className="text-sm font-medium">{pickupLocation}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-destructive mt-2" />
                        <div className="flex-1">
                            <p className="text-xs text-muted-foreground">Drop</p>
                            <p className="text-sm font-medium">{dropLocation}</p>
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
}
