import React from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { RefreshCcw, MapPin, Plus, Settings } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/contexts/ThemeContext';
 
interface QuickActionProps {
    onAction: (action: string) => void;
    recentRide?: {
        destination: string;
        time: string;
    };
    savedPlaces?: Array<{ id: string, name: string, icon: string, lat?: number, lng?: number }>;
}
 
export function QuickActions({ onAction, recentRide, savedPlaces = [] }: QuickActionProps) {
    const { isDark } = useTheme();
 
    return (
        <View>
            <Text className="text-lg font-black text-slate-900 dark:text-white mb-6 px-1 uppercase tracking-tighter">Tactical Presets</Text>
 
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 24, gap: 16 }}>
                {/* Repeat Last Ride */}
                {recentRide && (
                    <TouchableOpacity
                        className="bg-blue-600 dark:bg-blue-600 p-6 rounded-[32px] w-52 h-40 justify-between shadow-2xl shadow-blue-500/30"
                        onPress={() => onAction('repeat_ride')}
                        activeOpacity={0.9}
                    >
                        <View className="w-12 h-12 rounded-2xl bg-white/20 items-center justify-center">
                            <RefreshCcw size={22} color="#fff" />
                        </View>
                        <View>
                            <Text className="text-white font-black text-[10px] uppercase tracking-widest mb-1">Last Extraction</Text>
                            <Text className="text-white font-bold text-base leading-tight" numberOfLines={2}>
                                {recentRide.destination}
                            </Text>
                        </View>
                    </TouchableOpacity>
                )}
 
                {/* Saved Places */}
                {savedPlaces.map(place => (
                    <TouchableOpacity
                        key={place.id}
                        className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-[32px] w-52 h-40 justify-between shadow-soft dark:shadow-none"
                        onPress={() => onAction(`place_${place.id}`)}
                        activeOpacity={0.7}
                    >
                        <View className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 items-center justify-center border border-slate-100 dark:border-slate-700">
                            <MapPin size={22} color={isDark ? "#60a5fa" : "#2563eb"} />
                        </View>
                        <View>
                            <Text className="text-slate-400 dark:text-slate-500 font-black text-[10px] uppercase tracking-widest mb-1">{place.name}</Text>
                            <Text className="text-blue-600 dark:text-blue-400 font-black text-sm uppercase tracking-tight">Deploy Now</Text>
                        </View>
                    </TouchableOpacity>
                ))}
 
                {/* Add Place */}
                <TouchableOpacity
                    className="bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 border-dashed p-6 rounded-[32px] w-40 h-40 justify-center items-center gap-3"
                    onPress={() => onAction('add_place')}
                    activeOpacity={0.7}
                >
                    <View className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 items-center justify-center">
                        <Plus size={24} color={isDark ? "#94a3b8" : "#64748b"} />
                    </View>
                    <Text className="text-slate-400 dark:text-slate-500 font-black text-[10px] uppercase tracking-widest text-center">Add Station</Text>
                </TouchableOpacity>
 
                {/* Ride Preferences */}
                <TouchableOpacity
                    className="bg-slate-900 dark:bg-white p-6 rounded-[32px] w-52 h-40 justify-between shadow-2xl shadow-black/20"
                    onPress={() => onAction('preferences')}
                    activeOpacity={0.9}
                >
                    <View className="w-12 h-12 rounded-2xl bg-white/10 dark:bg-slate-100 items-center justify-center">
                        <Settings size={22} color={isDark ? "#0f172a" : "#fff"} />
                    </View>
                    <View>
                        <Text className={`font-black text-[10px] uppercase tracking-widest mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Configuration</Text>
                        <Text className={`font-black text-sm uppercase tracking-tight ${isDark ? 'text-slate-900' : 'text-white'}`}>Tactical Prefs</Text>
                    </View>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}
