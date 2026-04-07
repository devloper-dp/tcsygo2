import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Map, Marker, Polyline } from '../components/Map';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { LocationAutocomplete } from '@/components/LocationAutocomplete';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { MapService, Coordinates } from '@/services/MapService';
import { Switch, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
 
// Simple label component
const Label = ({ children }: { children: string }) => {
    const { fontSize } = useResponsive();
    return (
        <Text style={{ fontSize: fontSize.xs }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-[2px] mb-3 ml-1">{children}</Text>
    );
};
 
const CreateTripScreen = () => {
    const router = useRouter();
    const { user } = useAuth();
    const { isDark } = useTheme();
    const { hScale, vScale, mScale, spacing, fontSize } = useResponsive();
    const { toast } = require('@/components/ui/toast').useToast();
 
    const [pickup, setPickup] = useState('');
    const [pickupCoords, setPickupCoords] = useState<Coordinates>();
    const [drop, setDrop] = useState('');
    const [dropCoords, setDropCoords] = useState<Coordinates>();
 
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
 
    const [waypoints, setWaypoints] = useState<{ id: string; location: string; coords: Coordinates }[]>([]);
    const [seats, setSeats] = useState('4');
    const [price, setPrice] = useState('');
    const [preferences, setPreferences] = useState({
        smoking: false,
        pets: false,
        music: true,
        vehicleType: 'car' as 'car' | 'auto' | 'bike'
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
                Alert.alert("Driver Profile Required", "Deploy as a driver before initializing transit missions.", [
                    { text: "Enlist Now", onPress: () => router.push('/become-driver') }
                ]);
            } else if (driverProfile.verification_status !== 'verified') {
                Alert.alert("Verification Pending", "Your credentials are under review by central command. Mission deployment disabled.", [
                    { text: "Status Feed", onPress: () => router.push('/become-driver') },
                    { text: "Abort", style: "cancel", onPress: () => router.back() }
                ]);
                toast({
                    title: "Verification Pending",
                    description: "Your credentials are under review by central command. Mission deployment disabled.",
                    variant: "destructive"
                });
            }
        }
    }, [isLoadingDriver, driverProfile]);
 
    const calculateRoute = async () => {
        if (!pickupCoords || !dropCoords) return;

        try {
            const { RideService } = await import('@/services/RideService');
            const surge = await RideService.getSurgeMultiplier();
            
            const route = await MapService.getRoute(
                pickupCoords,
                dropCoords,
                waypoints.filter(w => w.coords.lat !== 0).map(w => w.coords)
            );
            setRouteInfo({
                distance: route.distance, 
                duration: route.duration, 
                route: route.geometry
            });

            if (!price || price === '0') {
                const { calculateFare } = await import('@/lib/fareCalculator');
                const fare = calculateFare(preferences.vehicleType, route.distance, route.duration, surge.multiplier);
                setPrice(fare.totalFare.toString());
            }
        } catch (error) {
            console.error('Error calculating route:', error);
        }
    };
 
    useEffect(() => {
        if (pickupCoords && dropCoords) {
            calculateRoute();
        }
    }, [pickupCoords, dropCoords, waypoints, preferences.vehicleType]);
 
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
            toast({
                title: 'Mission Published',
                description: 'Your mission profile has been broadcasted to the terminal.',
            });
            router.replace('/driver/trips' as any);
        },
        onError: (error: any) => {
            toast({
                title: 'Transmission Error',
                description: error.message || 'Failed to sync mission profile',
                variant: 'destructive',
            });
        }
    });
 
    const addWaypoint = () => {
        setWaypoints([...waypoints, { id: Math.random().toString(36).substr(2, 9), location: '', coords: { lat: 0, lng: 0 } }]);
    };
 
    const removeWaypoint = (id: string) => {
        setWaypoints(waypoints.filter(w => w.id !== id));
    };
 
    const updateWaypoint = (id: string, location: string, coords?: Coordinates) => {
        setWaypoints(waypoints.map(w =>
            w.id === id ? { ...w, location, coords: coords || w.coords } : w
        ));
    };
 
    const handleSubmit = () => {
        if (!driverProfile) {
            router.push('/become-driver');
            return;
        }
 
        if (!pickup || !drop || !price || !pickupCoords || !dropCoords) {
            Alert.alert('Configuration Error', 'Please complete all required deployment parameters.');
            return;
        }
 
        const tripData = {
            driver_id: driverProfile.id,
            pickup_location: pickup,
            pickup_lat: pickupCoords.lat.toString(),
            pickup_lng: pickupCoords.lng.toString(),
            drop_location: drop,
            drop_lat: dropCoords.lat.toString(),
            drop_lng: dropCoords.lng.toString(),
            departure_time: date.toISOString(),
            distance: (routeInfo?.distance || 0).toString(),
            duration: routeInfo?.duration || 0,
            price_per_seat: parseFloat(price),
            available_seats: parseInt(seats),
            total_seats: parseInt(seats),
            status: 'upcoming',
            route: routeInfo?.route || [],
            preferences: {
                ...preferences,
                waypoints: waypoints.map(w => ({ location: w.location, lat: w.coords.lat, lng: w.coords.lng }))
            },
            base_price: parseFloat(price),
            surge_multiplier: 1.0
        };
 
        createTripMutation.mutate(tripData);
    };
 
    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-slate-950" edges={['top']}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            
            <View style={{ paddingHorizontal: spacing.xl, paddingVertical: vScale(20), borderBottomWidth: 1 }} className="flex-row items-center justify-between bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 shadow-sm z-30">
                <TouchableOpacity 
                    onPress={() => router.back()} 
                    style={{ width: hScale(48), height: hScale(48), borderWidth: 1 }}
                    className="rounded-full bg-slate-50 dark:bg-slate-900 items-center justify-center border-slate-100 dark:border-slate-800"
                >
                    <Ionicons name="arrow-back" size={hScale(24)} color={isDark ? "#f8fafc" : "#1e293b"} />
                </TouchableOpacity>
                <Text style={{ fontSize: fontSize.xl }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">New Mission</Text>
                <View style={{ width: hScale(48) }} />
            </View>
 
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                <View style={{ height: vScale(256) }} className="bg-slate-100 dark:bg-slate-900 relative">
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
                        {waypoints.map((w, i) => (
                            w.coords.lat !== 0 && (
                                <Marker
                                    key={w.id}
                                    coordinate={{ latitude: w.coords.lat, longitude: w.coords.lng }}
                                    title={`Stop ${i + 1}`}
                                    pinColor="blue"
                                />
                            )
                        ))}
                        {routeInfo && routeInfo.route && routeInfo.route.length > 0 && (
                            <Polyline
                                coordinates={routeInfo.route.map(coord => ({ latitude: coord.lat, longitude: coord.lng }))}
                                strokeColor={isDark ? "#60a5fa" : "#3b82f6"}
                                strokeWidth={4}
                            />
                        )}
                    </Map>
                </View>
 
                <View style={{ padding: spacing.xl, gap: spacing.xxl, paddingBottom: vScale(128) }}>
                    <Card style={{ padding: spacing.xxl, borderRadius: hScale(40), marginTop: vScale(-40) }} className="bg-white dark:bg-slate-900 shadow-xl border-slate-100 dark:border-slate-800 overflow-visible">
                        <View style={{ gap: spacing.sm, marginBottom: spacing.xxl }} className="flex-row items-center">
                            <View style={{ width: hScale(40), height: hScale(40) }} className="rounded-xl bg-blue-50 dark:bg-blue-900/20 items-center justify-center">
                                <Ionicons name="location" size={hScale(22)} color="#3b82f6" />
                            </View>
                            <Text style={{ fontSize: fontSize.lg }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">Route Mapping</Text>
                        </View>
 
                        <View style={{ gap: spacing.lg }}>
                            <View className="z-50 relative">
                                <Label>Source Terminal</Label>
                                <LocationAutocomplete
                                    placeholder="Origin point..."
                                    value={pickup}
                                    onChange={(val, coords) => {
                                        setPickup(val);
                                        if (coords) setPickupCoords(coords);
                                    }}
                                    placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
                                />
                            </View>
 
                            {waypoints.map((waypoint, index) => (
                                <View key={waypoint.id} className="relative z-40">
                                    <View style={{ marginBottom: spacing.xs }} className="flex-row justify-between items-center">
                                        <Label>{`Auxiliary Stop ${index + 1}`}</Label>
                                        <TouchableOpacity onPress={() => removeWaypoint(waypoint.id)} style={{ width: hScale(24), height: hScale(24), marginBottom: spacing.sm }} className="items-center justify-center">
                                            <Ionicons name="close-circle" size={hScale(20)} color="#ef4444" />
                                        </TouchableOpacity>
                                    </View>
                                    <LocationAutocomplete
                                        placeholder="Add mission stop..."
                                        value={waypoint.location}
                                        onChange={(val, coords) => updateWaypoint(waypoint.id, val, coords)}
                                        placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
                                    />
                                </View>
                            ))}
 
                            <TouchableOpacity
                                onPress={addWaypoint}
                                style={{ paddingVertical: vScale(16), borderRadius: hScale(16), borderWidth: 1 }}
                                className="flex-row items-center justify-center bg-slate-50 dark:bg-slate-950/20 border-dashed border-slate-200 dark:border-slate-800"
                            >
                                <Ionicons name="add" size={hScale(20)} color={isDark ? "#475569" : "#64748b"} />
                                <Text style={{ fontSize: hScale(10), marginLeft: spacing.sm }} className="text-slate-500 dark:text-slate-500 font-black uppercase tracking-widest">Append Stop</Text>
                            </TouchableOpacity>
 
                            <View className="z-30 relative">
                                <Label>Destination Terminal</Label>
                                <LocationAutocomplete
                                    placeholder="Arrival point..."
                                    value={drop}
                                    onChange={(val, coords) => {
                                        setDrop(val);
                                        if (coords) setDropCoords(coords);
                                    }}
                                    placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
                                />
                            </View>
 
                            {routeInfo && (
                                <View style={{ gap: spacing.lg, padding: spacing.xl, borderRadius: hScale(24), borderWidth: 1 }} className="flex-row items-center bg-blue-50 dark:bg-blue-900/10 border-blue-100/50 dark:border-blue-900/30">
                                    <View style={{ width: hScale(48), height: hScale(48) }} className="bg-blue-600 dark:bg-blue-500 rounded-2xl items-center justify-center shadow-lg shadow-blue-500/20">
                                        <Ionicons name="navigate" size={hScale(24)} color="white" />
                                    </View>
                                    <View className="flex-1">
                                        <Text style={{ fontSize: fontSize.lg }} className="font-black text-slate-900 dark:text-white tracking-tighter uppercase">
                                            {routeInfo.distance.toFixed(1)} KM • {routeInfo.duration} MIN
                                        </Text>
                                        <Text style={{ fontSize: hScale(10) }} className="font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Optimized Trajectory</Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    </Card>
 
                    <Card style={{ padding: spacing.xxl, borderRadius: hScale(40), borderWidth: 1 }} className="bg-white dark:bg-slate-900 shadow-xl border-slate-100 dark:border-slate-800">
                        <View style={{ gap: spacing.sm, marginBottom: spacing.xxl }} className="flex-row items-center">
                            <View style={{ width: hScale(40), height: hScale(40) }} className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 items-center justify-center">
                                <Ionicons name="calendar-outline" size={hScale(22)} color="#10b981" />
                            </View>
                            <Text style={{ fontSize: fontSize.lg }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">Temporal Windows</Text>
                        </View>
                        <View style={{ gap: spacing.lg }} className="flex-row">
                            <View className="flex-1">
                                <Label>Date</Label>
                                <TouchableOpacity
                                    onPress={() => setShowDatePicker(true)}
                                    style={{ paddingHorizontal: spacing.lg, paddingVertical: vScale(16), borderRadius: hScale(16), borderWidth: 1 }}
                                    className="bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 flex-row items-center justify-between"
                                >
                                    <Text style={{ fontSize: fontSize.sm }} className="font-bold text-slate-900 dark:text-white uppercase tracking-tight">{date.toLocaleDateString()}</Text>
                                    <Ionicons name="calendar" size={hScale(16)} color={isDark ? "#334155" : "#cbd5e1"} />
                                </TouchableOpacity>
                            </View>
                            <View className="flex-1">
                                <Label>Time</Label>
                                <TouchableOpacity
                                    onPress={() => setShowTimePicker(true)}
                                    style={{ paddingHorizontal: spacing.lg, paddingVertical: vScale(16), borderRadius: hScale(16), borderWidth: 1 }}
                                    className="bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 flex-row items-center justify-between"
                                >
                                    <Text style={{ fontSize: fontSize.sm }} className="font-bold text-slate-900 dark:text-white uppercase tracking-tight">{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                    <Ionicons name="time" size={hScale(16)} color={isDark ? "#334155" : "#cbd5e1"} />
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
 
                    <Card style={{ padding: spacing.xxl, borderRadius: hScale(40), borderWidth: 1 }} className="bg-white dark:bg-slate-900 shadow-xl border-slate-100 dark:border-slate-800">
                        <View style={{ gap: spacing.sm, marginBottom: spacing.xxl }} className="flex-row items-center">
                            <View style={{ width: hScale(40), height: hScale(40) }} className="rounded-xl bg-amber-50 dark:bg-amber-900/20 items-center justify-center">
                                <Ionicons name="car-outline" size={hScale(22)} color="#f59e0b" />
                            </View>
                            <Text style={{ fontSize: fontSize.lg }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">Tech Specs</Text>
                        </View>
                        <Label>Vehicle Configuration</Label>
                        <View style={{ gap: spacing.sm, marginTop: spacing.xs, marginBottom: spacing.xxl }} className="flex-row">
                            {(['car', 'auto', 'bike'] as const).map((type) => (
                                <TouchableOpacity
                                    key={type}
                                    onPress={() => {
                                        const seatsMap = { car: '4', auto: '3', bike: '1' };
                                        setPreferences({ ...preferences, vehicleType: type });
                                        setSeats(seatsMap[type]);
                                    }}
                                    style={{ paddingVertical: vScale(16), borderRadius: hScale(16), borderWidth: 2 }}
                                    className={`flex-1 items-center transition-all ${preferences.vehicleType === type 
                                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 shadow-lg shadow-blue-500/10' 
                                        : 'border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-900'}`}
                                >
                                    <Ionicons
                                        name={type === 'car' ? 'car' : type === 'auto' ? 'car-sport' : 'bicycle'}
                                        size={hScale(28)}
                                        color={preferences.vehicleType === type ? (isDark ? '#60a5fa' : '#2563eb') : (isDark ? '#334155' : '#cbd5e1')}
                                    />
                                    <Text style={{ fontSize: hScale(9), marginTop: spacing.sm }} className={`font-black uppercase tracking-widest ${preferences.vehicleType === type ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}>{type}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        
                        <View style={{ gap: spacing.xl }} className="flex-row">
                            <View className="flex-1">
                                <Label>Compensation (₹)</Label>
                                <Input
                                    placeholder="500"
                                    keyboardType="numeric"
                                    value={price}
                                    onChangeText={setPrice}
                                    style={{ height: vScale(56), borderRadius: hScale(16), borderWidth: 1 }}
                                    className="bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-base font-black tracking-widest text-slate-900 dark:text-white shadow-inner"
                                />
                            </View>
                            <View className="flex-1">
                                <Label>Capacity</Label>
                                <Input
                                    placeholder="4"
                                    keyboardType="numeric"
                                    value={seats}
                                    onChangeText={setSeats}
                                    style={{ height: vScale(56), borderRadius: hScale(16), borderWidth: 1 }}
                                    className="bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-base font-black tracking-widest text-slate-900 dark:text-white shadow-inner"
                                />
                            </View>
                        </View>
                    </Card>
 
                    <Card style={{ padding: spacing.xxl, borderRadius: hScale(40), borderWidth: 1 }} className="bg-white dark:bg-slate-900 shadow-xl border-slate-100 dark:border-slate-800">
                        <View style={{ gap: spacing.sm, marginBottom: spacing.xxl }} className="flex-row items-center">
                            <View style={{ width: hScale(40), height: hScale(40) }} className="rounded-xl bg-purple-50 dark:bg-purple-900/20 items-center justify-center">
                                <Ionicons name="settings-outline" size={hScale(22)} color="#8b5cf6" />
                            </View>
                            <Text style={{ fontSize: fontSize.lg }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">Operational Limits</Text>
                        </View>
                        <View style={{ gap: spacing.lg }}>
                            {[
                                { id: 'smoking', label: 'Incendiaries Allowed', desc: 'Permit smoking during mission' },
                                { id: 'pets', label: 'Biological Assets', desc: 'Permit animal transport' },
                                { id: 'music', label: 'Sonic Comms', desc: 'Live audio feed active' }
                            ].map((pref) => (
                                <View key={pref.id} className="flex-row justify-between items-center">
                                    <View style={{ flex: 1, marginRight: spacing.lg }}>
                                        <Text style={{ fontSize: fontSize.sm }} className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{pref.label}</Text>
                                        <Text style={{ fontSize: hScale(10), marginTop: spacing.xs }} className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">{pref.desc}</Text>
                                    </View>
                                    <Switch
                                        value={(preferences as any)[pref.id]}
                                        onValueChange={(val) => setPreferences({ ...preferences, [pref.id]: val })}
                                        trackColor={{ false: isDark ? '#1e293b' : '#e2e8f0', true: '#3b82f6' }}
                                        thumbColor={Platform.OS === 'android' ? '#ffffff' : undefined}
                                    />
                                </View>
                            ))}
                        </View>
                    </Card>
 
                    <TouchableOpacity
                        onPress={handleSubmit}
                        activeOpacity={0.9}
                        disabled={createTripMutation.isPending}
                        style={{ height: vScale(80), borderRadius: hScale(32) }}
                        className={`bg-slate-900 dark:bg-white items-center justify-center shadow-2xl shadow-slate-900/30 mb-10 overflow-hidden ${createTripMutation.isPending ? 'opacity-50' : ''}`}
                    >
                        <Text style={{ fontSize: fontSize.xl }} className="text-white dark:text-slate-900 font-black uppercase tracking-[4px]">
                            {createTripMutation.isPending ? 'TRANSMITTING...' : 'INITIALIZE MISSION'}
                        </Text>
                        <View style={{ height: vScale(4) }} className="absolute bottom-0 left-0 right-0 bg-blue-600/30" />
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};
 
export default CreateTripScreen;
