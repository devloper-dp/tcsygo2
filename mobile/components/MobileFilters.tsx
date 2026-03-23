import { useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

interface FilterOptions {
    minPrice?: number;
    maxPrice?: number;
    minSeats?: number;
    departureTimeStart?: string;
    departureTimeEnd?: string;
    preferences?: {
        smoking?: boolean;
        pets?: boolean;
        music?: boolean;
        luggage?: boolean;
    };
    sortBy?: 'price' | 'departure' | 'duration' | 'rating';
    sortOrder?: 'asc' | 'desc';
}

interface MobileFiltersProps {
    visible: boolean;
    onClose: () => void;
    filters: FilterOptions;
    onApply: (filters: FilterOptions) => void;
}

import { useTheme } from '@/contexts/ThemeContext';

export function MobileFilters({ visible, onClose, filters, onApply }: MobileFiltersProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [localFilters, setLocalFilters] = useState<FilterOptions>(filters);

    const handleApply = () => {
        onApply(localFilters);
        onClose();
    };

    const handleReset = () => {
        setLocalFilters({
            sortBy: 'departure',
            sortOrder: 'asc',
        });
    };

    const togglePreference = (key: keyof NonNullable<FilterOptions['preferences']>) => {
        setLocalFilters({
            ...localFilters,
            preferences: {
                ...localFilters.preferences,
                [key]: !localFilters.preferences?.[key],
            },
        });
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-white dark:bg-slate-900">
                <View className="flex-row items-center justify-between px-4 py-4 border-b border-slate-100 dark:border-slate-800">
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="close" size={24} color={isDark ? "#f8fafc" : "#0f172a"} />
                    </TouchableOpacity>
                    <Text className="text-lg font-bold text-slate-900 dark:text-white">
                        Filters
                    </Text>
                    <TouchableOpacity onPress={handleReset}>
                        <Text className="text-sm font-bold text-primary dark:text-blue-400">
                            Reset
                        </Text>
                    </TouchableOpacity>
                </View>

                <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
                    {/* Price Range */}
                    <View className="py-5 border-b border-slate-50 dark:border-slate-800">
                        <Text className="text-base font-bold text-slate-900 dark:text-white mb-4">
                            Price Range
                        </Text>
                        <View className="flex-row gap-3 mb-4">
                            <View className="flex-1">
                                <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                    Min (₹)
                                </Text>
                                <View className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-800">
                                    <Text className="text-slate-900 dark:text-white font-medium">{localFilters.minPrice || 0}</Text>
                                </View>
                            </View>
                            <View className="flex-1">
                                <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                    Max (₹)
                                </Text>
                                <View className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-800">
                                    <Text className="text-slate-900 dark:text-white font-medium">{localFilters.maxPrice || 1000}</Text>
                                </View>
                            </View>
                        </View>
                        <Slider
                            style={{ width: '100%', height: 40 }}
                            minimumValue={0}
                            maximumValue={1000}
                            step={50}
                            value={localFilters.minPrice || 0}
                            onValueChange={(value) => setLocalFilters({ ...localFilters, minPrice: value })}
                            minimumTrackTintColor="#3b82f6"
                            maximumTrackTintColor={isDark ? "#334155" : "#d1d5db"}
                        />
                    </View>

                    {/* Minimum Seats */}
                    <View className="py-5 border-b border-slate-50 dark:border-slate-800">
                        <Text className="text-base font-bold text-slate-900 dark:text-white mb-4">
                            Minimum Seats: {localFilters.minSeats || 1}
                        </Text>
                        <Slider
                            style={{ width: '100%', height: 40 }}
                            minimumValue={1}
                            maximumValue={7}
                            step={1}
                            value={localFilters.minSeats || 1}
                            onValueChange={(value) => setLocalFilters({ ...localFilters, minSeats: value })}
                            minimumTrackTintColor="#3b82f6"
                            maximumTrackTintColor={isDark ? "#334155" : "#d1d5db"}
                        />
                    </View>

                    {/* Preferences */}
                    <View className="py-5 border-b border-slate-50 dark:border-slate-800">
                        <Text className="text-base font-bold text-slate-900 dark:text-white mb-4">
                            Preferences
                        </Text>
                        <View className="gap-4">
                            {[
                                { key: 'smoking', label: 'Smoking Allowed' },
                                { key: 'pets', label: 'Pets Allowed' },
                                { key: 'music', label: 'Music Allowed' },
                                { key: 'luggage', label: 'Extra Luggage' },
                            ].map((pref) => (
                                <TouchableOpacity
                                    key={pref.key}
                                    className="flex-row items-center justify-between"
                                    onPress={() => togglePreference(pref.key as any)}
                                >
                                    <View className="flex-row items-center gap-3">
                                        <Ionicons
                                            name={localFilters.preferences?.[pref.key as keyof NonNullable<FilterOptions['preferences']>] ? 'checkmark-circle' : 'ellipse-outline'}
                                            size={24}
                                            color={localFilters.preferences?.[pref.key as keyof NonNullable<FilterOptions['preferences']>] ? '#3b82f6' : (isDark ? '#475569' : '#9ca3af')}
                                        />
                                        <Text className="text-sm font-medium text-slate-700 dark:text-slate-300">{pref.label}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Sort By */}
                    <View className="py-5">
                        <Text className="text-base font-bold text-slate-900 dark:text-white mb-4">
                            Sort By
                        </Text>
                        <View className="flex-row flex-wrap gap-2">
                            {(['price', 'departure', 'duration', 'rating'] as const).map((option) => (
                                <TouchableOpacity
                                    key={option}
                                    className={`px-4 py-2 rounded-full border ${
                                        localFilters.sortBy === option 
                                            ? 'bg-primary dark:bg-blue-600 border-primary dark:border-blue-600' 
                                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                    }`}
                                    onPress={() => setLocalFilters({ ...localFilters, sortBy: option })}
                                >
                                    <Text
                                        className={`text-sm ${
                                            localFilters.sortBy === option 
                                                ? 'text-white font-bold' 
                                                : 'text-slate-600 dark:text-slate-400 font-medium'
                                        }`}
                                    >
                                        {option.charAt(0).toUpperCase() + option.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </ScrollView>

                <View className="p-4 border-t border-slate-100 dark:border-slate-800">
                    <Button onPress={handleApply} className="w-full h-12 rounded-xl">
                        <Text className="text-white font-bold text-base">Apply Filters</Text>
                    </Button>
                </View>
            </View>
        </Modal>
    );
}
