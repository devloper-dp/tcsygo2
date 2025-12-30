import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LocationAutocomplete } from '@/components/LocationAutocomplete';
import { FareEstimator } from '@/components/FareEstimator';
import { PromoCodeInput } from '@/components/PromoCodeInput';
import { SurgePricingIndicator } from '@/components/SurgePricingIndicator';
import { RideScheduler } from '@/components/RideScheduler';
import { useAuth } from '@/contexts/AuthContext';
import { Zap, MapPin, Car, Bike, Users, Building2 } from 'lucide-react';
import { Coordinates } from '@/lib/maps';
import { getRoute } from '@/lib/maps';
import {
    calculateFare,
    calculateSurgeMultiplier,
    getCurrentDemand,
    applyPromoCode,
    FareBreakdown as NewFareBreakdown,
} from '@/lib/fareCalculator';
import { PromoCode } from '@/lib/promo-service';
import { RidePreferences, RidePreference } from '@/components/RidePreferences';
import { useToast } from '@/hooks/use-toast';

interface QuickBookWidgetProps {
    className?: string;
}

export function QuickBookWidget({ className = '' }: QuickBookWidgetProps) {
    const [, navigate] = useLocation();
    const { user } = useAuth();
    const { toast } = useToast();
    const [showDialog, setShowDialog] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);
    const [destination, setDestination] = useState('');
    const [destinationCoords, setDestinationCoords] = useState<Coordinates | null>(null);
    const [vehicleType, setVehicleType] = useState<'bike' | 'auto' | 'car'>('auto');
    const [fareEstimate, setFareEstimate] = useState<NewFareBreakdown | null>(null);
    const [loading, setLoading] = useState(false);
    const [bookingType, setBookingType] = useState<'instant' | 'scheduled'>('instant');
    const [scheduledDateTime, setScheduledDateTime] = useState<Date | null>(null);
    const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
    const [distanceKm, setDistanceKm] = useState(0);
    const [durationMinutes, setDurationMinutes] = useState(0);
    const [demand, setDemand] = useState<'low' | 'medium' | 'high' | 'very_high'>('low');
    const [preferences, setPreferences] = useState<RidePreference | null>(null);
    const [organizationOnly, setOrganizationOnly] = useState(false);

    const [pickupAddress, setPickupAddress] = useState('Current Location');

    // Get current location on mount
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const coords = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };
                    setCurrentLocation(coords);

                    // Reverse geocode
                    try {
                        const { reverseGeocode } = await import('@/lib/maps');
                        const address = await reverseGeocode(coords);
                        setPickupAddress(address);
                    } catch (error) {
                        console.error('Error reverse geocoding:', error);
                    }
                },
                (error) => {
                    console.error('Error getting location:', error);
                }
            );
        }
    }, []);

    // Calculate fare when destination changes
    useEffect(() => {
        if (currentLocation && destinationCoords) {
            calculateFareEstimate();
        }
    }, [currentLocation, destinationCoords, vehicleType]);

    const calculateFareEstimate = async () => {
        if (!currentLocation || !destinationCoords) return;

        setLoading(true);
        try {
            const route = await getRoute(currentLocation, destinationCoords);
            const distKm = route.distance / 1000; // Convert to km
            const durMin = Math.ceil(route.duration / 60); // Convert to minutes

            setDistanceKm(distKm);
            setDurationMinutes(durMin);

            // Get current demand
            const currentHour = new Date().getHours();
            const currentDemand = getCurrentDemand(currentHour);
            setDemand(currentDemand);

            // Calculate surge multiplier
            const surgeMultiplier = calculateSurgeMultiplier(currentDemand);

            // Calculate base fare
            let fare = calculateFare(vehicleType, distKm, durMin, surgeMultiplier);

            // Apply promo code if exists
            if (appliedPromo) {
                fare = applyPromoCode(fare, appliedPromo);
            }

            setFareEstimate(fare);
        } catch (error) {
            console.error('Error calculating fare:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleQuickBook = () => {
        if (!user) {
            navigate('/login');
            return;
        }
        setShowDialog(true);
    };

    const handlePromoApplied = (promo: PromoCode) => {
        setAppliedPromo(promo);
        // Recalculate fare with promo
        if (fareEstimate) {
            const newFare = applyPromoCode(fareEstimate, promo);
            setFareEstimate(newFare);
        }
    };

    const handlePromoRemoved = () => {
        setAppliedPromo(null);
        // Recalculate fare without promo
        calculateFareEstimate();
    };

    const handleSchedule = (date: Date) => {
        setScheduledDateTime(date);
        setBookingType('scheduled');
    };

    const handleConfirmBooking = async () => {
        if (!currentLocation || !destinationCoords) {
            toast({
                title: "Missing Locations",
                description: "Please select both pickup and destination.",
                variant: "destructive"
            });
            return;
        }

        if (!user) {
            navigate('/login');
            return;
        }

        setLoading(true);
        try {
            // Create ride request using ride matching service
            const { createRideRequest, autoMatchRideRequest } = await import('@/lib/ride-matching-service');

            const isScheduled = bookingType === 'scheduled';

            const request = await createRideRequest({
                pickupLocation: pickupAddress,
                pickupCoords: currentLocation as Coordinates,
                dropLocation: destination,
                dropCoords: destinationCoords as Coordinates,
                vehicleType,
                fare: fareEstimate?.totalFare || 0,
                distance: distanceKm,
                duration: durationMinutes,
                preferences,
                promoCode: appliedPromo?.code,
                discountAmount: appliedPromo ? (fareEstimate?.discount || 0) : 0,
                surgeMultiplier: fareEstimate?.surgeMultiplier || 1.0,
                organizationOnly: organizationOnly,
                organization: user?.organization || undefined,
                scheduledTime: isScheduled ? (scheduledDateTime || undefined) : undefined,
            });

            toast({
                title: isScheduled ? "📅 Ride Scheduled" : "🔍 Finding Drivers",
                description: isScheduled
                    ? `Your ride for ${scheduledDateTime?.toLocaleString()} has been scheduled.`
                    : "Searching for nearby drivers...",
            });

            setShowDialog(false);

            // Navigate to ride request page
            navigate(`/ride-request/${request.id}`);

            // Start auto-matching in background for instant rides only
            if (!isScheduled) {
                setTimeout(async () => {
                    try {
                        await autoMatchRideRequest(request.id);
                    } catch (error) {
                        console.error('Auto-match error:', error);
                    }
                }, 1000);
            }

        } catch (error: any) {
            console.error("Booking Error:", error);
            toast({
                title: "Booking Failed",
                description: error.message || 'Failed to create ride request',
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Button
                size="lg"
                className={`gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 ${className}`}
                onClick={handleQuickBook}
            >
                <Zap className="w-5 h-5" />
                Quick Book
            </Button>

            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Zap className="w-5 h-5 text-primary" />
                            Quick Book a Ride
                        </DialogTitle>
                        <DialogDescription>
                            Book an instant ride or schedule for later
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Booking Type Tabs */}
                        <Tabs value={bookingType} onValueChange={(v) => setBookingType(v as 'instant' | 'scheduled')}>
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="instant">Instant Booking</TabsTrigger>
                                <TabsTrigger value="scheduled">Schedule Ride</TabsTrigger>
                            </TabsList>

                            <TabsContent value="instant" className="space-y-4 mt-4">
                                {/* Current Location */}
                                <div className="flex items-center gap-3 p-3 bg-success/10 rounded-lg border border-success/20">
                                    <MapPin className="w-5 h-5 text-success" />
                                    <div className="flex-1">
                                        <p className="text-xs text-muted-foreground">Pickup</p>
                                        <p className="font-medium truncate">{pickupAddress}</p>
                                    </div>
                                </div>

                                {/* Destination */}
                                <div>
                                    <LocationAutocomplete
                                        value={destination}
                                        onChange={(val, coords) => {
                                            setDestination(val);
                                            setDestinationCoords(coords || null);
                                        }}
                                        placeholder="Where to?"
                                        className="h-12"
                                    />
                                </div>

                                {/* Vehicle Type Selection */}
                                <div>
                                    <p className="text-sm font-medium mb-3">Select Vehicle</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        <Button
                                            variant={vehicleType === 'bike' ? 'default' : 'outline'}
                                            className="flex-col h-auto py-3"
                                            onClick={() => setVehicleType('bike')}
                                        >
                                            <Bike className="w-5 h-5 mb-1" />
                                            <span className="text-xs">Bike</span>
                                        </Button>
                                        <Button
                                            variant={vehicleType === 'auto' ? 'default' : 'outline'}
                                            className="flex-col h-auto py-3"
                                            onClick={() => setVehicleType('auto')}
                                        >
                                            <Users className="w-5 h-5 mb-1" />
                                            <span className="text-xs">Auto</span>
                                        </Button>
                                        <Button
                                            variant={vehicleType === 'car' ? 'default' : 'outline'}
                                            className="flex-col h-auto py-3"
                                            onClick={() => setVehicleType('car')}
                                        >
                                            <Car className="w-5 h-5 mb-1" />
                                            <span className="text-xs">Car</span>
                                        </Button>
                                    </div>
                                </div>

                                {/* Surge Pricing Indicator */}
                                {fareEstimate && fareEstimate.surgeMultiplier > 1 && (
                                    <SurgePricingIndicator
                                        multiplier={fareEstimate.surgeMultiplier}
                                        demand={demand}
                                    />
                                )}

                                {/* Promo Code */}
                                <PromoCodeInput
                                    onPromoApplied={handlePromoApplied}
                                    onPromoRemoved={handlePromoRemoved}
                                />

                                {/* Fare Estimate */}
                                {/* Ride Preferences */}
                                <div className="py-2">
                                    <RidePreferences
                                        showSaveButton={false}
                                        onPreferencesChange={setPreferences}
                                        className="border-0 shadow-none p-0"
                                    />
                                </div>

                                {/* Colleague Carpooling Toggle */}
                                {user?.organization && (
                                    <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/10">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="w-5 h-5 text-primary" />
                                            <div>
                                                <Label htmlFor="org-toggle" className="font-medium">Ride with Colleagues Only</Label>
                                                <p className="text-[10px] text-muted-foreground">Only drivers from {user.organization} will be matched.</p>
                                            </div>
                                        </div>
                                        <Switch
                                            id="org-toggle"
                                            checked={organizationOnly}
                                            onCheckedChange={setOrganizationOnly}
                                        />
                                    </div>
                                )}

                                {/* Book Button */}
                                <Button
                                    size="lg"
                                    className="w-full"
                                    onClick={handleConfirmBooking}
                                    disabled={!destination || !destinationCoords || loading}
                                >
                                    {loading ? 'Calculating...' : 'Find Rides'}
                                </Button>
                            </TabsContent>

                            <TabsContent value="scheduled" className="space-y-4 mt-4">
                                {/* Current Location */}
                                <div className="flex items-center gap-3 p-3 bg-success/10 rounded-lg border border-success/20">
                                    <MapPin className="w-5 h-5 text-success" />
                                    <div className="flex-1">
                                        <p className="text-xs text-muted-foreground">Pickup</p>
                                        <p className="font-medium truncate">{pickupAddress}</p>
                                    </div>
                                </div>

                                {/* Destination */}
                                <div>
                                    <LocationAutocomplete
                                        value={destination}
                                        onChange={(val, coords) => {
                                            setDestination(val);
                                            setDestinationCoords(coords || null);
                                        }}
                                        placeholder="Where to?"
                                        className="h-12"
                                    />
                                </div>

                                {/* Ride Scheduler */}
                                <RideScheduler onSchedule={handleSchedule} className="w-full" />

                                {scheduledDateTime && (
                                    <Card className="p-3 bg-primary/5 border-primary/20">
                                        <p className="text-sm font-medium">Scheduled for:</p>
                                        <p className="text-lg font-bold text-primary">
                                            {scheduledDateTime.toLocaleString()}
                                        </p>
                                    </Card>
                                )}

                                {/* Vehicle Type Selection */}
                                <div>
                                    <p className="text-sm font-medium mb-3">Select Vehicle</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        <Button
                                            variant={vehicleType === 'bike' ? 'default' : 'outline'}
                                            className="flex-col h-auto py-3"
                                            onClick={() => setVehicleType('bike')}
                                        >
                                            <Bike className="w-5 h-5 mb-1" />
                                            <span className="text-xs">Bike</span>
                                        </Button>
                                        <Button
                                            variant={vehicleType === 'auto' ? 'default' : 'outline'}
                                            className="flex-col h-auto py-3"
                                            onClick={() => setVehicleType('auto')}
                                        >
                                            <Users className="w-5 h-5 mb-1" />
                                            <span className="text-xs">Auto</span>
                                        </Button>
                                        <Button
                                            variant={vehicleType === 'car' ? 'default' : 'outline'}
                                            className="flex-col h-auto py-3"
                                            onClick={() => setVehicleType('car')}
                                        >
                                            <Car className="w-5 h-5 mb-1" />
                                            <span className="text-xs">Car</span>
                                        </Button>
                                    </div>
                                </div>

                                {/* Fare Estimate */}
                                {fareEstimate && distanceKm > 0 && (
                                    <FareEstimator
                                        vehicleType={vehicleType}
                                        distanceKm={distanceKm}
                                        durationMinutes={durationMinutes}
                                        onFareCalculated={setFareEstimate}
                                    />
                                )}

                                {/* Ride Preferences */}
                                <div className="py-2">
                                    <RidePreferences
                                        showSaveButton={false}
                                        onPreferencesChange={setPreferences}
                                        inline
                                        className="py-1"
                                    />
                                </div>

                                {/* Colleague Carpooling Toggle for Scheduled */}
                                {user?.organization && (
                                    <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/10 mb-4">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="w-5 h-5 text-primary" />
                                            <div>
                                                <Label htmlFor="org-toggle-sched" className="font-medium">Ride with Colleagues Only</Label>
                                                <p className="text-[10px] text-muted-foreground">Only drivers from {user.organization} will be matched.</p>
                                            </div>
                                        </div>
                                        <Switch
                                            id="org-toggle-sched"
                                            checked={organizationOnly}
                                            onCheckedChange={setOrganizationOnly}
                                        />
                                    </div>
                                )}

                                {/* Book Button */}
                                <Button
                                    size="lg"
                                    className="w-full"
                                    onClick={handleConfirmBooking}
                                    disabled={!destination || !destinationCoords || !scheduledDateTime || loading}
                                >
                                    {loading ? 'Calculating...' : 'Schedule Ride'}
                                </Button>
                            </TabsContent>
                        </Tabs>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
