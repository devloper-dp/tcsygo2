import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { Map, Marker } from './Map';
import * as Location from 'expo-location';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

export function HomeMap() {
    const { isDark } = useTheme();
    const router = useRouter();
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const { data: drivers } = useQuery({
        queryKey: ['live-drivers-map'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('live_locations')
                .select('*, driver:drivers(*, user:users(*))')
                .limit(50);
            if (error) throw error;
            return data;
        },
        refetchInterval: 10000,
    });

    useEffect(() => {
        (async () => {
            try {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setErrorMsg('Permission to access location was denied');
                    setLoading(false);
                    return;
                }

                let location = await Location.getCurrentPositionAsync({});
                setLocation(location);
            } catch (error) {
                setErrorMsg('Could not fetch location');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const centerOnUser = async () => {
        setLoading(true);
        try {
            let location = await Location.getCurrentPositionAsync({});
            setLocation(location);
        } catch (error) {
            Alert.alert('Error', 'Could not refresh location');
        } finally {
            setLoading(false);
        }
    };

    if (loading && !location) {
        return (
            <View className="h-64 justify-center items-center bg-slate-50 dark:bg-slate-900 rounded-3xl mx-4 mb-8 border border-slate-100 dark:border-slate-800">
                <ActivityIndicator size="small" color={isDark ? "#ffffff" : "#3b82f6"} />
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-4">Initializing Map...</Text>
            </View>
        );
    }

    const initialRegion = location ? {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    } : {
        latitude: 12.9716,
        longitude: 77.5946,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
    };

    return (
        <View className="mb-8">
            <View className="flex-row justify-between items-center mb-4 px-4 overflow-hidden">
                <Text className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">Tactical Grid</Text>
                {errorMsg && <Text className="text-[10px] font-black text-red-500 uppercase tracking-widest">{errorMsg}</Text>}
            </View>

            <View className="h-72 bg-slate-100 dark:bg-slate-950 rounded-[40px] overflow-hidden mx-4 relative border border-slate-100 dark:border-slate-800 shadow-2xl">
                <Map
                    className="flex-1"
                    initialRegion={initialRegion}
                    region={location ? {
                        ...initialRegion,
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                    } : undefined}
                >
                    {location && (
                        <Marker
                            coordinate={{
                                latitude: location.coords.latitude,
                                longitude: location.coords.longitude,
                            }}
                        >
                            <View className="w-10 h-10 rounded-full bg-blue-500/20 items-center justify-center">
                                <View className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white dark:border-slate-900" />
                            </View>
                        </Marker>
                    )}

                    {drivers?.filter(d => d.lat && d.lng).map((driver) => (
                        <Marker
                            key={driver.id}
                            coordinate={{
                                latitude: parseFloat(driver.lat),
                                longitude: parseFloat(driver.lng),
                            }}
                        >
                            <View className="bg-slate-900 dark:bg-white p-2.5 rounded-full border-2 border-white dark:border-slate-900 shadow-lg">
                                <Ionicons name="car" size={16} color={isDark ? "#0f172a" : "#ffffff"} />
                            </View>
                        </Marker>
                    ))}
                </Map>

                <TouchableOpacity
                    className="absolute right-6 bottom-6 bg-white dark:bg-slate-900 w-14 h-14 rounded-3xl justify-center items-center shadow-2xl border border-slate-100 dark:border-slate-800 active:opacity-90"
                    onPress={centerOnUser}
                >
                    <Ionicons name="locate" size={24} color={isDark ? "#ffffff" : "#3b82f6"} />
                </TouchableOpacity>

                <View className="absolute top-6 left-6 right-6">
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3">
                        <TouchableOpacity
                            onPress={() => router.push('/search')}
                            className="flex-row items-center bg-white/90 dark:bg-slate-900/90 py-3 px-5 rounded-2xl gap-2.5 border border-slate-100 dark:border-slate-800 shadow-sm"
                        >
                            <Ionicons name="options-outline" size={16} color={isDark ? "#ffffff" : "#1f2937"} />
                            <Text className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Filters</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="bg-white/90 dark:bg-slate-900/90 py-3 px-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm"
                        >
                            <Text className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Price: Entry Level</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </View>
    );
}
