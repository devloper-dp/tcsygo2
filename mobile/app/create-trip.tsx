import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons'; // Or Lucide
import { Map, Marker, Polyline } from '../components/Map';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { LocationAutocomplete } from '@/components/LocationAutocomplete';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input'; // Assuming this exists or using TextInput with styles
import { Text } from '@/components/ui/text';
import { MapService, Coordinates } from '@/services/MapService';
import { Switch, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

// Simple label component if not in UI lib
const Label = ({ children }: { children: string }) => (
    <Text className="text-sm font-medium text-gray-700 mb-1.5">{children}</Text>
);

const CreateTripScreen = () => {
    const router = useRouter();
    const { user } = useAuth();

    const [pickup, setPickup] = useState('');
    const [pickupCoords, setPickupCoords] = useState<Coordinates>();
    const [drop, setDrop] = useState('');
    const [dropCoords, setDropCoords] = useState<Coordinates>();

    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    const [seats, setSeats] = useState('4');
    const [price, setPrice] = useState('');
    const [preferences, setPreferences] = useState({
        smoking: false,
        pets: false,
        music: true
    });

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            const currentDate = new Date(date);
            currentDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
            setDate(currentDate);
        }
    };

    const onTimeChange = (event: any, selectedTime?: Date) => {
        setShowTimePicker(false);
        if (selectedTime) {
            const currentDate = new Date(date);
            currentDate.setHours(selectedTime.getHours(), selectedTime.getMinutes());
            setDate(currentDate);
        }
    };

    const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number; route: Coordinates[] }>();

    // Check driver profile
    const { data: driverProfile, isLoading: isLoadingDriver } = useQuery<any>({
        queryKey: ['my-driver-profile', user?.id],
        queryFn: async () => {
            if (!user) return null;
            const { data, error } = await supabase
                .from('drivers')
                .select('*')
                .eq('user_id', user.id)
                .single();
            if (error) return null;
            return data;
        },
        enabled: !!user,
    });

    useEffect(() => {
        if (!isLoadingDriver) {
            if (!driverProfile) {
                Alert.alert("Driver Profile Required", "You need to complete driver onboarding before posting trips.", [
                    { text: "OK", onPress: () => router.push('/become-driver') }
                ]);
            } else if (driverProfile.verification_status !== 'verified') {
                Alert.alert("Verification Pending", "Your driver profile is still under review. You cannot create trips yet.", [
                    { text: "Check Status", onPress: () => router.push('/become-driver') },
                    { text: "Cancel", style: "cancel", onPress: () => router.back() }
                ]);
            }
        }
    }, [isLoadingDriver, driverProfile]);

    const calculateRoute = async () => {
        if (!pickupCoords || !dropCoords) return;

        try {
            const route = await MapService.getRoute(pickupCoords, dropCoords);
            setRouteInfo({
                distance: route.distance / 1000, // meters to km
                duration: Math.round(route.duration / 60), // seconds to minutes
                route: route.geometry
            });

            if (!price) {
                const estimatedPrice = Math.round((route.distance / 1000) * 8);
                setPrice(estimatedPrice.toString());
            }
        } catch (error) {
            console.error('Error calculating route:', error);
        }
    };

    useEffect(() => {
        if (pickupCoords && dropCoords) {
            calculateRoute();
        }
    }, [pickupCoords, dropCoords]);

    const createTripMutation = useMutation({
        mutationFn: async (tripData: any) => {
            const { data, error } = await supabase
                .from('trips')
                .insert([tripData])
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            Alert.alert('Success', 'Trip created successfully!');
            router.replace('/(tabs)/my-trips' as any); // Assuming my-trips tab exists or route
        },
        onError: (error: any) => {
            Alert.alert('Error', error.message || 'Failed to create trip');
        }
    });

    const handleSubmit = () => {
        if (!driverProfile) {
            router.push('/become-driver');
            return;
        }

        if (!pickup || !drop || !price || !pickupCoords || !dropCoords) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        const departureDateTime = date.toISOString();

        const tripData = {
            driver_id: driverProfile.id, // Use driver profile ID
            pickup_location: pickup,
            pickup_lat: pickupCoords.lat.toString(),
            pickup_lng: pickupCoords.lng.toString(),
            drop_location: drop,
            drop_lat: dropCoords.lat.toString(),
            drop_lng: dropCoords.lng.toString(),
            departure_time: departureDateTime,
            distance: routeInfo?.distance || 0,
            duration: routeInfo?.duration || 0,
            price_per_seat: parseFloat(price),
            available_seats: parseInt(seats),
            total_seats: parseInt(seats),
            status: 'upcoming',
            route: routeInfo?.route || [],
            preferences
        };

        createTripMutation.mutate(tripData);
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }} edges={['top']}>
            <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
                <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text variant="h3" className="font-bold flex-1 text-center">Create a Trip</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView className="flex-1">
                <View className="h-48 bg-gray-100 relative">
                    <Map
                        style={StyleSheet.absoluteFillObject}
                        initialRegion={{
                            latitude: pickupCoords?.lat || 28.6139,
                            longitude: pickupCoords?.lng || 77.2090,
                            latitudeDelta: 0.1,
                            longitudeDelta: 0.1,
                        }}
                    >
                        {pickupCoords && <Marker coordinate={{ latitude: pickupCoords.lat, longitude: pickupCoords.lng }} title="Pickup" pinColor="green" />}
                        {dropCoords && <Marker coordinate={{ latitude: dropCoords.lat, longitude: dropCoords.lng }} title="Drop" pinColor="red" />}
                        {routeInfo && routeInfo.route && routeInfo.route.length > 0 && (
                            <Polyline
                                coordinates={routeInfo.route.map(coord => ({ latitude: coord.lat, longitude: coord.lng }))}
                                strokeColor="#3b82f6"
                                strokeWidth={4}
                            />
                        )}
                    </Map>
                </View>

                <View className="p-4 gap-6 pb-10">
                    <Card className="p-4">
                        <Text variant="h3" className="text-lg font-semibold mb-4 flex-row items-center gap-2">
                            <Ionicons name="location" size={20} color="#3b82f6" /> Route Details
                        </Text>

                        <View className="gap-4">
                            <View className="z-20 relative">
                                <Label>Pickup Location</Label>
                                <LocationAutocomplete
                                    placeholder="Where are you starting?"
                                    value={pickup}
                                    onChange={(val, coords) => {
                                        setPickup(val);
                                        if (coords) setPickupCoords(coords);
                                    }}
                                />
                            </View>

                            <View className="z-10 relative">
                                <Label>Drop Location</Label>
                                <LocationAutocomplete
                                    placeholder="Where are you going?"
                                    value={drop}
                                    onChange={(val, coords) => {
                                        setDrop(val);
                                        if (coords) setDropCoords(coords);
                                    }}
                                />
                            </View>

                            {routeInfo && (
                                <View className="flex-row items-center gap-3 p-3 bg-blue-50 rounded-lg">
                                    <Ionicons name="navigate-circle" size={24} color="#3b82f6" />
                                    <View>
                                        <Text className="font-medium text-blue-900">
                                            {routeInfo.distance.toFixed(1)} km • {routeInfo.duration} min
                                        </Text>
                                        <Text className="text-xs text-blue-700">Estimated route</Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    </Card>

                    <Card className="p-4">
                        <Text variant="h3" className="text-lg font-semibold mb-4">Schedule</Text>
                        <View className="flex-row gap-4">
                            <View className="flex-1">
                                <Label>Date</Label>
                                <TouchableOpacity
                                    onPress={() => setShowDatePicker(true)}
                                    className="border border-gray-300 rounded-lg p-3 bg-white"
                                >
                                    <Text>{date.toLocaleDateString()}</Text>
                                </TouchableOpacity>
                            </View>
                            <View className="flex-1">
                                <Label>Time</Label>
                                <TouchableOpacity
                                    onPress={() => setShowTimePicker(true)}
                                    className="border border-gray-300 rounded-lg p-3 bg-white"
                                >
                                    <Text>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {(showDatePicker || (Platform.OS === 'ios' && showDatePicker)) && (
                            <DateTimePicker
                                value={date}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={onDateChange}
                                minimumDate={new Date()}
                            />
                        )}

                        {(showTimePicker || (Platform.OS === 'ios' && showTimePicker)) && (
                            <DateTimePicker
                                value={date}
                                mode="time"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={onTimeChange}
                            />
                        )}
                    </Card>

                    <Card className="p-4">
                        <Text variant="h3" className="text-lg font-semibold mb-4">Details</Text>
                        <View className="flex-row gap-4">
                            <View className="flex-1">
                                <Label>Price (₹)</Label>
                                <Input
                                    placeholder="500"
                                    keyboardType="numeric"
                                    value={price}
                                    onChangeText={setPrice}
                                />
                            </View>
                            <View className="flex-1">
                                <Label>Seats</Label>
                                <Input
                                    placeholder="4"
                                    keyboardType="numeric"
                                    value={seats}
                                    onChangeText={setSeats}
                                />
                            </View>
                        </View>
                    </Card>

                    <Card className="p-4">
                        <Text variant="h3" className="text-lg font-semibold mb-4">Preferences</Text>
                        <View className="gap-4">
                            <View className="flex-row justify-between items-center">
                                <View>
                                    <Text className="font-medium">Smoking allowed</Text>
                                    <Text className="text-gray-500 text-xs">Passengers can smoke</Text>
                                </View>
                                <Switch
                                    value={preferences.smoking}
                                    onValueChange={(val) => setPreferences({ ...preferences, smoking: val })}
                                    trackColor={{ false: '#e5e7eb', true: '#3b82f6' }}
                                />
                            </View>
                            <View className="flex-row justify-between items-center">
                                <View>
                                    <Text className="font-medium">Pets allowed</Text>
                                    <Text className="text-gray-500 text-xs">Passengers can bring pets</Text>
                                </View>
                                <Switch
                                    value={preferences.pets}
                                    onValueChange={(val) => setPreferences({ ...preferences, pets: val })}
                                    trackColor={{ false: '#e5e7eb', true: '#3b82f6' }}
                                />
                            </View>
                            <View className="flex-row justify-between items-center">
                                <View>
                                    <Text className="font-medium">Music allowed</Text>
                                    <Text className="text-gray-500 text-xs">Music during trip</Text>
                                </View>
                                <Switch
                                    value={preferences.music}
                                    onValueChange={(val) => setPreferences({ ...preferences, music: val })}
                                    trackColor={{ false: '#e5e7eb', true: '#3b82f6' }}
                                />
                            </View>
                        </View>
                    </Card>

                    <Button
                        onPress={handleSubmit}
                        size="lg"
                        disabled={createTripMutation.isPending}
                        className="mb-8"
                    >
                        {createTripMutation.isPending ? 'Publishing...' : 'Publish Trip'}
                    </Button>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default CreateTripScreen;
