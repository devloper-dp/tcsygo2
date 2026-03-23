import React, { useState, useEffect } from 'react';
import { View, Switch, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import Slider from '@react-native-community/slider';
import { useTheme } from '@/contexts/ThemeContext';
 
export interface RidePreference {
    ac_preferred: boolean;
    music_allowed: boolean;
    pet_friendly: boolean;
    luggage_capacity: number;
}
 
interface RidePreferencesProps {
    preferences?: RidePreference;
    onPreferencesChange?: (preferences: RidePreference) => void;
    showSaveButton?: boolean;
    userId?: string;
    style?: any;
}
 
export function RidePreferences({
    preferences: externalPreferences,
    onPreferencesChange,
    showSaveButton = true,
    userId,
    style,
}: RidePreferencesProps) {
    const { isDark } = useTheme();
    const [internalPreferences, setInternalPreferences] = useState<RidePreference>(
        externalPreferences || {
            ac_preferred: true,
            music_allowed: true,
            pet_friendly: false,
            luggage_capacity: 1,
        }
    );
    const [loading, setLoading] = useState(false);
 
    useEffect(() => {
        if (externalPreferences) {
            setInternalPreferences(externalPreferences);
        }
    }, [externalPreferences]);
 
    useEffect(() => {
        if (userId) {
            loadPreferences();
        }
    }, [userId]);
 
    const loadPreferences = async () => {
        try {
            const { data, error } = await supabase
                .from('ride_preferences')
                .select('*')
                .eq('user_id', userId)
                .single();
 
            if (data && !error) {
                const loadedPrefs = {
                    ac_preferred: data.ac_preferred,
                    music_allowed: data.music_allowed,
                    pet_friendly: data.pet_friendly,
                    luggage_capacity: data.luggage_capacity,
                };
                setInternalPreferences(loadedPrefs);
                onPreferencesChange?.(loadedPrefs);
            }
        } catch (error) {
            console.error('Error loading preferences:', error);
        }
    };
 
    const handlePreferenceChange = (key: keyof RidePreference, value: boolean | number) => {
        const newPreferences = { ...internalPreferences, [key]: value };
        setInternalPreferences(newPreferences);
        onPreferencesChange?.(newPreferences);
    };
 
    const savePreferences = async () => {
        if (!userId) return;
 
        setLoading(true);
        try {
            const { error } = await supabase
                .from('ride_preferences')
                .upsert({
                    user_id: userId,
                    ac_preferred: internalPreferences.ac_preferred,
                    music_allowed: internalPreferences.music_allowed,
                    pet_friendly: internalPreferences.pet_friendly,
                    updated_at: new Date().toISOString(),
                });
 
            if (error) throw error;
            alert('Preferences saved successfully!');
        } catch (error: any) {
            alert('Failed to save preferences: ' + error.message);
        } finally {
            setLoading(false);
        }
    };
 
    return (
        <Card className="p-10 bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-2xl shadow-slate-200/50 dark:shadow-none" style={style}>
            <Text className="text-2xl font-black text-slate-900 dark:text-white mb-10 tracking-tighter uppercase">Tactical Prefs</Text>
 
            {/* AC Preference */}
            <View className="flex-row justify-between items-center mb-6 bg-slate-50 dark:bg-slate-950 p-6 rounded-[28px] border border-slate-100 dark:border-slate-800/50">
                <View className="flex-row items-center gap-5 flex-1">
                    <View className="w-14 h-14 rounded-2xl bg-blue-500/10 justify-center items-center shadow-sm">
                        <Ionicons name="snow-outline" size={26} color={isDark ? "#60a5fa" : "#3b82f6"} />
                    </View>
                    <View>
                        <Text className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">AC Module</Text>
                        <Text className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mt-1">Prefer Thermal Control</Text>
                    </View>
                </View>
                <Switch
                    value={internalPreferences.ac_preferred}
                    onValueChange={(val) => handlePreferenceChange('ac_preferred', val)}
                    trackColor={{ false: isDark ? '#1e293b' : '#e2e8f0', true: '#3b82f6' }}
                    thumbColor="white"
                    ios_backgroundColor={isDark ? '#1e293b' : '#e2e8f0'}
                />
            </View>
 
            {/* Music Preference */}
            <View className="flex-row justify-between items-center mb-6 bg-slate-50 dark:bg-slate-950 p-6 rounded-[28px] border border-slate-100 dark:border-slate-800/50">
                <View className="flex-row items-center gap-5 flex-1">
                    <View className="w-14 h-14 rounded-2xl bg-indigo-500/10 justify-center items-center shadow-sm">
                        <Ionicons name="musical-notes-outline" size={26} color={isDark ? "#818cf8" : "#6366f1"} />
                    </View>
                    <View>
                        <Text className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Acoustics</Text>
                        <Text className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mt-1">Allow Sonic Output</Text>
                    </View>
                </View>
                <Switch
                    value={internalPreferences.music_allowed}
                    onValueChange={(val) => handlePreferenceChange('music_allowed', val)}
                    trackColor={{ false: isDark ? '#1e293b' : '#e2e8f0', true: '#6366f1' }}
                    thumbColor="white"
                    ios_backgroundColor={isDark ? '#1e293b' : '#e2e8f0'}
                />
            </View>
 
            {/* Pet Friendly */}
            <View className="flex-row justify-between items-center mb-10 bg-slate-50 dark:bg-slate-950 p-6 rounded-[28px] border border-slate-100 dark:border-slate-800/50">
                <View className="flex-row items-center gap-5 flex-1">
                    <View className="w-14 h-14 rounded-2xl bg-amber-500/10 justify-center items-center shadow-sm">
                        <Ionicons name="paw-outline" size={26} color={isDark ? "#fbbf24" : "#f59e0b"} />
                    </View>
                    <View>
                        <Text className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">K9 Unit</Text>
                        <Text className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mt-1">Traveling with Bio-Units</Text>
                    </View>
                </View>
                <Switch
                    value={internalPreferences.pet_friendly}
                    onValueChange={(val) => handlePreferenceChange('pet_friendly', val)}
                    trackColor={{ false: isDark ? '#1e293b' : '#e2e8f0', true: '#f59e0b' }}
                    thumbColor="white"
                    ios_backgroundColor={isDark ? '#1e293b' : '#e2e8f0'}
                />
            </View>
 
            {/* Luggage Capacity */}
            <View className="bg-slate-50 dark:bg-slate-950 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800/50 mb-10 shadow-sm">
                <View className="flex-row items-center gap-5 mb-8">
                    <View className="w-14 h-14 rounded-2xl bg-slate-500/10 justify-center items-center shadow-sm">
                        <Ionicons name="briefcase-outline" size={26} color={isDark ? "#94a3b8" : "#64748b"} />
                    </View>
                    <View>
                        <Text className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Cargo Load</Text>
                        <Text className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-1">{internalPreferences.luggage_capacity} Units Selected</Text>
                    </View>
                </View>
                <Slider
                    style={{ width: '100%', height: 40 }}
                    minimumValue={0}
                    maximumValue={5}
                    step={1}
                    value={internalPreferences.luggage_capacity}
                    onValueChange={(val: number) => handlePreferenceChange('luggage_capacity', val)}
                    minimumTrackTintColor={isDark ? "#3b82f6" : "#2563eb"}
                    maximumTrackTintColor={isDark ? "#1e293b" : "#f1f5f9"}
                    thumbTintColor={isDark ? "#ffffff" : "#3b82f6"}
                />
                <View className="flex-row justify-between px-2 mt-2">
                    <Text className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">MIN CARGO</Text>
                    <Text className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">MAX RANGE</Text>
                </View>
            </View>
 
            {showSaveButton && (
                <TouchableOpacity
                    className={`h-20 rounded-[32px] items-center justify-center shadow-2xl shadow-black/10 transition-all ${loading ? 'bg-slate-200 dark:bg-slate-800 opacity-50 shadow-none' : 'bg-slate-900 dark:bg-white active:opacity-95'}`}
                    onPress={savePreferences}
                    disabled={loading}
                >
                    <Text className="text-white dark:text-slate-900 font-black text-xl uppercase tracking-[4px]">
                        {loading ? 'SYNCING...' : 'SAVE CONFIG'}
                    </Text>
                </TouchableOpacity>
            )}
        </Card>
    );
}
