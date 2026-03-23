import { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, Switch, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Slider from '@react-native-community/slider';
import { useTheme } from '@/contexts/ThemeContext';
 
export interface RidePreference {
    ac_preferred: boolean;
    music_allowed: boolean;
    pet_friendly: boolean;
    luggage_capacity: number;
}
 
export default function RidePreferencesScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { theme, isDark, colors } = useTheme();
    const [preferences, setPreferences] = useState<RidePreference>({
        ac_preferred: true,
        music_allowed: true,
        pet_friendly: false,
        luggage_capacity: 1,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
 
    useEffect(() => {
        if (user) {
            loadPreferences();
        }
    }, [user]);
 
    const loadPreferences = async () => {
        try {
            const { data, error } = await supabase
                .from('ride_preferences')
                .select('*')
                .eq('user_id', user?.id)
                .single();
 
            if (data && !error) {
                setPreferences({
                    ac_preferred: data.ac_preferred,
                    music_allowed: data.music_allowed,
                    pet_friendly: data.pet_friendly,
                    luggage_capacity: data.luggage_capacity,
                });
            }
        } catch (error) {
            console.error('Error loading preferences:', error);
        } finally {
            setLoading(false);
        }
    };
 
    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('ride_preferences')
                .upsert({
                    user_id: user.id,
                    ac_preferred: preferences.ac_preferred,
                    music_allowed: preferences.music_allowed,
                    pet_friendly: preferences.pet_friendly,
                    luggage_capacity: preferences.luggage_capacity,
                    updated_at: new Date().toISOString(),
                });
 
            if (error) throw error;
            Alert.alert("Success", "Ride preferences saved!");
        } catch (error: any) {
            Alert.alert("Error", error.message);
        } finally {
            setSaving(false);
        }
    };
 
    const updatePreference = (key: keyof RidePreference, value: boolean | number) => {
        setPreferences(prev => ({ ...prev, [key]: value }));
    };
 
    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-white dark:bg-slate-950 justify-center items-center">
                <ActivityIndicator size="large" color={isDark ? "#ffffff" : "#3b82f6"} />
            </SafeAreaView>
        );
    }
 
    return (
        <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            
            {/* Header */}
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm z-10">
                <TouchableOpacity 
                    onPress={() => router.back()} 
                    className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-900 items-center justify-center active:bg-slate-100 dark:active:bg-slate-800"
                >
                    <Ionicons name="arrow-back" size={24} color={isDark ? "#f8fafc" : "#1e293b"} />
                </TouchableOpacity>
                <Text className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Ride Preferences</Text>
                <View className="w-10" />
            </View>
 
            <ScrollView 
                contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            >
                <Card className="p-6 bg-white dark:bg-slate-900 rounded-[32px] mb-6 shadow-sm border border-slate-100/60 dark:border-slate-800">
                    <Text className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6 px-1">Comfort & Environment</Text>
 
                    {/* AC Preference */}
                    <View className="flex-row items-center justify-between py-4 border-b border-slate-50 dark:border-slate-800/50">
                        <View className="flex-row items-center gap-4">
                            <View className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 justify-center items-center">
                                <Ionicons name="snow" size={24} color={isDark ? "#60a5fa" : "#3b82f6"} strokeWidth={2.5} />
                            </View>
                            <View>
                                <Text className="text-base font-bold text-slate-800 dark:text-slate-200 tracking-tight">Air Conditioning</Text>
                                <Text className="text-xs font-medium text-slate-400 dark:text-slate-500">Prefer AC vehicles</Text>
                            </View>
                        </View>
                        <Switch
                            value={preferences.ac_preferred}
                            onValueChange={(val) => updatePreference('ac_preferred', val)}
                            trackColor={{ false: isDark ? "#1e293b" : "#e2e8f0", true: "#3b82f6" }}
                            thumbColor={"#ffffff"}
                        />
                    </View>
 
                    {/* Music Preference */}
                    <View className="flex-row items-center justify-between py-4 border-b border-slate-50 dark:border-slate-800/50">
                        <View className="flex-row items-center gap-4">
                            <View className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/20 justify-center items-center">
                                <Ionicons name="musical-notes" size={24} color={isDark ? "#a78bfa" : "#9333ea"} />
                            </View>
                            <View>
                                <Text className="text-base font-bold text-slate-800 dark:text-slate-200 tracking-tight">Music</Text>
                                <Text className="text-xs font-medium text-slate-400 dark:text-slate-500">Allow music during ride</Text>
                            </View>
                        </View>
                        <Switch
                            value={preferences.music_allowed}
                            onValueChange={(val) => updatePreference('music_allowed', val)}
                            trackColor={{ false: isDark ? "#1e293b" : "#e2e8f0", true: "#9333ea" }}
                            thumbColor={"#ffffff"}
                        />
                    </View>
 
                    {/* Pets Preference */}
                    <View className="flex-row items-center justify-between py-4">
                        <View className="flex-row items-center gap-4">
                            <View className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-900/20 justify-center items-center">
                                <Ionicons name="paw" size={24} color={isDark ? "#fb923c" : "#f97316"} />
                            </View>
                            <View>
                                <Text className="text-base font-bold text-slate-800 dark:text-slate-200 tracking-tight">Pet Friendly</Text>
                                <Text className="text-xs font-medium text-slate-400 dark:text-slate-500">Traveling with pets</Text>
                            </View>
                        </View>
                        <Switch
                            value={preferences.pet_friendly}
                            onValueChange={(val) => updatePreference('pet_friendly', val)}
                            trackColor={{ false: isDark ? "#1e293b" : "#e2e8f0", true: "#f97316" }}
                            thumbColor={"#ffffff"}
                        />
                    </View>
                </Card>
 
                <Card className="p-6 bg-white dark:bg-slate-900 rounded-[32px] mb-8 shadow-sm border border-slate-100/60 dark:border-slate-800">
                    <Text className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6 px-1">Capacity</Text>
 
                    {/* Luggage Capacity */}
                    <View className="gap-6">
                        <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center gap-4">
                                <View className="w-12 h-12 rounded-2xl bg-green-50 dark:bg-green-900/20 justify-center items-center">
                                    <Ionicons name="briefcase" size={24} color={isDark ? "#4ade80" : "#16a34a"} />
                                </View>
                                <View>
                                    <Text className="text-base font-bold text-slate-800 dark:text-slate-200 tracking-tight">Luggage</Text>
                                    <Text className="text-xs font-medium text-slate-400 dark:text-slate-500">Number of bags</Text>
                                </View>
                            </View>
                            <View className="bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-700">
                                <Text className="font-black text-lg text-slate-900 dark:text-white uppercase tracking-tighter">{preferences.luggage_capacity}</Text>
                            </View>
                        </View>
 
                        <View className="px-2 mt-2">
                            <Slider
                                value={preferences.luggage_capacity}
                                onValueChange={(val) => updatePreference('luggage_capacity', Math.floor(val))}
                                maximumValue={5}
                                minimumValue={0}
                                step={1}
                                thumbTintColor={isDark ? "#ffffff" : "#16a34a"}
                                minimumTrackTintColor={isDark ? "#4ade80" : "#16a34a"}
                                maximumTrackTintColor={isDark ? "#1e293b" : "#e2e8f0"}
                            />
                            <View className="flex-row justify-between mt-3 px-1">
                                <Text className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">None</Text>
                                <Text className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Small</Text>
                                <Text className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Med</Text>
                                <Text className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Large</Text>
                            </View>
                        </View>
                    </View>
                </Card>
 
                <Button
                    onPress={handleSave}
                    disabled={saving}
                    className="h-16 bg-slate-900 dark:bg-white rounded-[24px] shadow-xl shadow-slate-900/10 dark:shadow-none"
                >
                    {saving ? (
                        <ActivityIndicator color={isDark ? "#0f172a" : "#fff"} />
                    ) : (
                        <Text className="text-white dark:text-slate-900 font-black uppercase tracking-widest text-base">Save Preferences</Text>
                    )}
                </Button>
            </ScrollView>
        </SafeAreaView>
    );
}
