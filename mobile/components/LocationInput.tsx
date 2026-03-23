import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LocationAutocomplete } from './LocationAutocomplete';
import { Coordinates } from '@/lib/maps';
import { useTheme } from '@/contexts/ThemeContext';
 
interface LocationInputProps {
    label?: string; // Optional now, mostly for accessibility
    value: string;
    onChange: (value: string, coords?: Coordinates) => void;
    placeholder: string;
    iconColor?: string;
    isPickup?: boolean;
}
 
export function LocationInput({
    value,
    onChange,
    placeholder,
    isPickup = false
}: LocationInputProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
 
    return (
        <View className="flex-row items-center bg-transparent">
            <View 
                className={`w-8 h-8 rounded-xl justify-center items-center ml-2 ${
                    isPickup 
                        ? 'bg-emerald-50 dark:bg-emerald-900/20' 
                        : 'bg-rose-50 dark:bg-rose-900/20'
                }`}
            >
                <View 
                    className={`w-2.5 h-2.5 rounded-full ${
                        isPickup ? 'bg-emerald-500' : 'bg-rose-500'
                    }`} 
                />
            </View>
            <View className="flex-1 py-3 px-3">
                <LocationAutocomplete
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    showIcon={false}
                    className="bg-transparent border-0 p-0"
                    placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
                />
            </View>
        </View>
    );
}
 
const styles = StyleSheet.create({});
