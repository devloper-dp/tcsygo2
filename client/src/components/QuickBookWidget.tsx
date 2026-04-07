import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { LocationAutocomplete } from '@/components/LocationAutocomplete';
import { FareEstimator } from '@/components/FareEstimator';
import { PromoCodeInput } from '@/components/PromoCodeInput';
import { SurgePricingIndicator } from '@/components/SurgePricingIndicator';
import { useAuth } from '@/contexts/AuthContext';
import { Zap, MapPin, Car, Bike, Users, Building2, Clock, Info } from 'lucide-react';
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
import { FareBreakdownModal } from '@/components/FareBreakdownModal';

interface QuickBookWidgetProps {
    className?: string;
    defaultPickup?: string;
    defaultDrop?: string;
    defaultPickupCoords?: Coordinates | null;
    defaultDropCoords?: Coordinates | null;
    defaultDate?: Date;
    defaultBookingType?: 'instant' | 'scheduled';
}

export function QuickBookWidget({
    className = '',
    defaultPickup,
    defaultDrop,
    defaultPickupCoords,
    defaultDropCoords,
    defaultDate,
    defaultBookingType
}: QuickBookWidgetProps) {
    const [, navigate] = useLocation();
    const { user } = useAuth();
    const { toast } = useToast();
    const [showDialog, setShowDialog] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(defaultPickupCoords || null);
    const [destination, setDestination] = useState(defaultDrop || '');
    const [destinationCoords, setDestinationCoords] = useState<Coordinates | null>(defaultDropCoords || null);
    const [vehicleType, setVehicleType] = useState<'bike' | 'auto' | 'car'>('auto');
    const [fareEstimate, setFareEstimate] = useState<NewFareBreakdown | null>(null);
    const [loading, setLoading] = useState(false);
    const [bookingType, setBookingType] = useState<'instant' | 'scheduled'>(defaultBookingType || 'instant');
    const [scheduledDateTime, setScheduledDateTime] = useState<Date | null>(defaultDate || null);
    const [showFareBreakdown, setShowFareBreakdown] = useState(false);

    const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
    const [distanceKm, setDistanceKm] = useState(0);
    const [durationMinutes, setDurationMinutes] = useState(0);
    const [demand, setDemand] = useState<'low' | 'medium' | 'high' | 'very_high'>('low');
    const [preferences, setPreferences] = useState<RidePreference | null>(null);
    const [organizationOnly, setOrganizationOnly] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>();
    const [selectedTime, setSelectedTime] = useState('');

    const [pickupAddress, setPickupAddress] = useState(defaultPickup || 'Current Location');

    // Sync props when they change (optional, but good if parent updates)
    useEffect(() => {
        if (defaultPickup !== undefined) setPickupAddress(defaultPickup);
        if (defaultDrop !== undefined) setDestination(defaultDrop);
        if (defaultPickupCoords !== undefined) setCurrentLocation(defaultPickupCoords);
        if (defaultDropCoords !== undefined) setDestinationCoords(defaultDropCoords);
        if (defaultDate !== undefined) setScheduledDateTime(defaultDate);
        if (defaultBookingType !== undefined) setBookingType(defaultBookingType);
    }, [defaultPickup, defaultDrop, defaultPickupCoords, defaultDropCoords, defaultDate, defaultBookingType]);

    // Get current location on mount
    // Get current location on mount
    useEffect(() => {
        const fetchLocationFromIP = async () => {
            console.log('Falling back to IP-based geolocation...');
            try {
                const response = await fetch('https://ipapi.co/json/');
                if (!response.ok) throw new Error('IP Geolocation failed');
                const data = await response.json();

                const coords = {
                    lat: data.latitude,
                    lng: data.longitude
                };

                console.log('Location fetched from IP:', coords);
                setCurrentLocation(coords);

                // Reverse geocode
                try {
                    const { reverseGeocode } = await import('@/lib/maps');
                    const address = await reverseGeocode(coords);
                    setPickupAddress(address);
                } catch (err) {
                    console.error('Error reverse geocoding IP location:', err);
                }
            } catch (error) {
                console.error('Error fetching location from IP:', error);
                toast({
                    title: "Location Error",
                    description: "Could not detect location. Please search for pickup address manually.",
                    variant: "destructive"
                });
            }
        };

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
                    console.error('Error getting location from browser:', error);
                    // Fallback to IP geolocation
                    fetchLocationFromIP();
                },
                {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0
                }
            );
        } else {
            // Browser doesn't support geolocation, use IP
            fetchLocationFromIP();
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

    // Generate time slots (every 30 minutes)
    const generateTimeSlots = () => {
        const slots: string[] = [];
        for (let hour = 0; hour < 24; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
                const timeString = `${hour.toString().padStart(2, '0')}:${minute
                    .toString()
                    .padStart(2, '0')}`;
                slots.push(timeString);
            }
        }
        return slots;
    };

    // Update scheduledDateTime when date or time changes
    useEffect(() => {
        if (selectedDate && selectedTime) {
            const [hours, minutes] = selectedTime.split(':');
            const scheduledDateTime = new Date(selectedDate);
            scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            setScheduledDateTime(scheduledDateTime);
        } else {
            setScheduledDateTime(null);
        }
    }, [selectedDate, selectedTime]);

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
                console.log('Instant ride created, starting auto-match sequence...');
                setTimeout(async () => {
                    try {
                        const matched = await autoMatchRideRequest(request.id);
                        if (matched) {
                            console.log('Auto-match successful for request:', request.id);
                        } else {
                            console.log('Auto-match still searching for request:', request.id);
                        }
                    } catch (error) {
                        console.error('Auto-match fatal error:', error);
                    }
                }, 1000);
            } else {
                console.log('Scheduled ride created successfully:', request.id);
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
                {/* Responsive Width: 95% of viewport width on mobile, max-xl on tablet+ */}
                <DialogContent className="w-[90vw] sm:max-w-xl max-h-[90vh] p-4 sm:p-6 rounded-xl flex flex-col">
                    <DialogHeader className="pb-1 shrink-0">
                        <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
                            <Zap className="w-5 h-5 text-primary" />
                            Quick Book a Ride
                        </DialogTitle>
                        <DialogDescription className="text-xs sm:text-sm">
                            Book an instant ride or schedule for later
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 min-h-0 flex flex-col">
                        {/* Booking Type Tabs */}
                        <Tabs value={bookingType} onValueChange={(v) => setBookingType(v as 'instant' | 'scheduled')} className="flex flex-col flex-1 min-h-0">
                            <TabsList className="grid w-full grid-cols-2 h-9 sm:h-10 shrink-0">
                                <TabsTrigger value="instant" className="text-xs sm:text-sm">Instant Booking</TabsTrigger>
                                <TabsTrigger value="scheduled" className="text-xs sm:text-sm">Schedule Ride</TabsTrigger>
                            </TabsList>

                            <TabsContent value="instant" className="space-y-2 mt-2 overflow-y-auto flex-1 min-h-0 pr-1">
                                {/* Current Location */}
                                <div className="flex items-center gap-2 p-2 bg-success/10 rounded-lg border border-success/20">
                                    <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-success shrink-0" />
                                    <div className="flex-1 min-w-0"> {/* min-w-0 required for truncate to work in flex */}
                                        <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Pickup</p>
                                        <p className="font-medium text-sm truncate">{pickupAddress}</p>
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
                                        className="h-10 sm:h-12 text-sm"
                                    />
                                </div>

                                {/* Vehicle Type Selection */}
                                <div>
                                    <p className="text-xs sm:text-sm font-medium mb-2">Select Vehicle</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        <Button
                                            variant={vehicleType === 'bike' ? 'default' : 'outline'}
                                            className="flex-col h-auto py-2 sm:py-3 px-1"
                                            onClick={() => setVehicleType('bike')}
                                        >
                                            <Bike className="w-4 h-4 sm:w-5 sm:h-5 mb-1" />
                                            <span className="text-[10px] sm:text-xs">Bike</span>
                                        </Button>
                                        <Button
                                            variant={vehicleType === 'auto' ? 'default' : 'outline'}
                                            className="flex-col h-auto py-2 sm:py-3 px-1"
                                            onClick={() => setVehicleType('auto')}
                                        >
                                            <Users className="w-4 h-4 sm:w-5 sm:h-5 mb-1" />
                                            <span className="text-[10px] sm:text-xs">Auto</span>
                                        </Button>
                                        <Button
                                            variant={vehicleType === 'car' ? 'default' : 'outline'}
                                            className="flex-col h-auto py-2 sm:py-3 px-1"
                                            onClick={() => setVehicleType('car')}
                                        >
                                            <Car className="w-4 h-4 sm:w-5 sm:h-5 mb-1" />
                                            <span className="text-[10px] sm:text-xs">Car</span>
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

                                {/* PromoCodeInput - standard block element */}
                                <div className="w-full">
                                    <PromoCodeInput
                                        onPromoApplied={handlePromoApplied}
                                        onPromoRemoved={handlePromoRemoved}
                                    />
                                </div>


                                {/* Ride Preferences - Compact */}
                                <div className="py-1">
                                    <RidePreferences
                                        showSaveButton={false}
                                        onPreferencesChange={setPreferences}
                                        className="border-0 shadow-none p-0"
                                        inline={true} // Force inline if supported or styling needs adjustment
                                    />
                                </div>

                                {/* Colleague Carpooling Toggle */}
                                {user?.organization && (
                                    <div className="flex items-center justify-between p-2.5 bg-primary/5 rounded-lg border border-primary/10">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="w-4 h-4 text-primary" />
                                            <div>
                                                <Label htmlFor="org-toggle" className="font-medium text-xs sm:text-sm">Ride with Colleagues</Label>
                                                <p className="text-[10px] text-muted-foreground">Only matching with drivers from {user.organization}</p>
                                            </div>
                                        </div>
                                        <Switch
                                            id="org-toggle"
                                            checked={organizationOnly}
                                            onCheckedChange={setOrganizationOnly}
                                            className="scale-90"
                                        />
                                    </div>
                                )}

                                {/* Book Button */}
                                <Button
                                    size="lg"
                                    className="w-full h-10 sm:h-12 text-sm sm:text-base mt-2"
                                    onClick={handleConfirmBooking}
                                    disabled={!destination || !destinationCoords || loading}
                                >
                                    {loading ? 'Calculating...' : (fareEstimate ? `Book for ${fareEstimate.totalFare}` : 'Find Rides')}
                                </Button>

                                {fareEstimate && (
                                    <button 
                                        onClick={() => setShowFareBreakdown(true)}
                                        className="mt-2 text-xs text-muted-foreground hover:text-primary flex items-center justify-center gap-1 w-full"
                                    >
                                        <Info className="w-3 h-3" />
                                        View Fare Breakdown
                                    </button>
                                )}
                            </TabsContent>

                            <TabsContent value="scheduled" className="space-y-2 mt-2 overflow-y-auto flex-1 min-h-0 pr-1">
                                {/* Current Location */}
                                <div className="flex items-center gap-2 p-2 bg-success/10 rounded-lg border border-success/20">
                                    <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-success shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Pickup</p>
                                        <p className="font-medium text-sm truncate">{pickupAddress}</p>
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
                                        className="h-10 sm:h-12 text-sm"
                                    />
                                </div>

                                {/* Date Selection */}
                                <div>
                                    <Label className="text-xs sm:text-sm font-medium mb-2 block">Select Date</Label>
                                    <Calendar
                                        mode="single"
                                        selected={selectedDate}
                                        onSelect={setSelectedDate}
                                        disabled={(date) => {
                                            const today = new Date();
                                            today.setHours(0, 0, 0, 0);
                                            const maxDate = new Date();
                                            maxDate.setDate(maxDate.getDate() + 7); // Max 7 days in advance
                                            return date < today || date > maxDate;
                                        }}
                                        className="rounded-md border w-full"
                                    />
                                </div>

                                {/* Time Selection */}
                                {selectedDate && (
                                    <div>
                                        <Label className="text-xs sm:text-sm font-medium mb-2 block flex items-center gap-2">
                                            <Clock className="w-4 h-4" />
                                            Select Time
                                        </Label>
                                        <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 border rounded-md">
                                            {generateTimeSlots().map((time) => {
                                                const [hours, minutes] = time.split(':');
                                                const testDateTime = new Date(selectedDate);
                                                testDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

                                                const minTime = new Date();
                                                minTime.setMinutes(minTime.getMinutes() + 30);

                                                const isDisabled = testDateTime < minTime;

                                                return (
                                                    <Button
                                                        key={time}
                                                        variant={selectedTime === time ? 'default' : 'outline'}
                                                        size="sm"
                                                        onClick={() => setSelectedTime(time)}
                                                        disabled={isDisabled}
                                                        className="text-xs"
                                                    >
                                                        {time}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {selectedDate && selectedTime && !scheduledDateTime && (
                                    <p className="text-xs text-destructive text-center">
                                        Please select a time at least 30 minutes from now
                                    </p>
                                )}

                                {/* Vehicle Type Selection */}
                                <div>
                                    <p className="text-xs sm:text-sm font-medium mb-2">Select Vehicle</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        <Button
                                            variant={vehicleType === 'bike' ? 'default' : 'outline'}
                                            className="flex-col h-auto py-2 sm:py-3 px-1"
                                            onClick={() => setVehicleType('bike')}
                                        >
                                            <Bike className="w-4 h-4 sm:w-5 sm:h-5 mb-1" />
                                            <span className="text-[10px] sm:text-xs">Bike</span>
                                        </Button>
                                        <Button
                                            variant={vehicleType === 'auto' ? 'default' : 'outline'}
                                            className="flex-col h-auto py-2 sm:py-3 px-1"
                                            onClick={() => setVehicleType('auto')}
                                        >
                                            <Users className="w-4 h-4 sm:w-5 sm:h-5 mb-1" />
                                            <span className="text-[10px] sm:text-xs">Auto</span>
                                        </Button>
                                        <Button
                                            variant={vehicleType === 'car' ? 'default' : 'outline'}
                                            className="flex-col h-auto py-2 sm:py-3 px-1"
                                            onClick={() => setVehicleType('car')}
                                        >
                                            <Car className="w-4 h-4 sm:w-5 sm:h-5 mb-1" />
                                            <span className="text-[10px] sm:text-xs">Car</span>
                                        </Button>
                                    </div>
                                </div>

                                {/* Fare Estimate */}
                                {distanceKm > 0 && (
                                    <FareEstimator
                                        vehicleType={vehicleType}
                                        distanceKm={distanceKm}
                                        durationMinutes={durationMinutes}
                                        onFareCalculated={setFareEstimate}
                                    />
                                )}

                                {/* Ride Preferences */}
                                <div className="py-1">
                                    <RidePreferences
                                        showSaveButton={false}
                                        onPreferencesChange={setPreferences}
                                        inline
                                        className="py-1"
                                    />
                                </div>

                                {/* Colleague Carpooling Toggle for Scheduled */}
                                {user?.organization && (
                                    <div className="flex items-center justify-between p-2.5 bg-primary/5 rounded-lg border border-primary/10 mb-2">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="w-4 h-4 text-primary" />
                                            <div>
                                                <Label htmlFor="org-toggle-sched" className="font-medium text-xs sm:text-sm">Ride with Colleagues</Label>
                                                <p className="text-[10px] text-muted-foreground">Only matching with drivers from {user.organization}</p>
                                            </div>
                                        </div>
                                        <Switch
                                            id="org-toggle-sched"
                                            checked={organizationOnly}
                                            onCheckedChange={setOrganizationOnly}
                                            className="scale-90"
                                        />
                                    </div>
                                )}

                                {/* Book Button */}
                                <Button
                                    size="lg"
                                    className="w-full h-10 sm:h-12 text-sm sm:text-base mt-2"
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

            <FareBreakdownModal
                isOpen={showFareBreakdown}
                onClose={() => setShowFareBreakdown(false)}
                fare={fareEstimate}
            />
        </>
    );
}
