import { useState, useEffect } from 'react';
import { View, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Input } from './ui/input';
import { Text } from './ui/text';
import { MapPin } from 'lucide-react-native';
import { Coordinates } from '@/lib/maps';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
 
interface LocationAutocompleteProps {
    value: string;
    onChange: (value: string, coords?: Coordinates) => void;
    placeholder?: string;
    className?: string;
    placeholderTextColor?: string;
    showIcon?: boolean;
}
 
interface Suggestion {
    place_id: string;
    display_name: string;
    lat: string;
    lon: string;
}
 
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'TCSYGO-Carpooling-App';
 
export function LocationAutocomplete({
    value,
    onChange,
    placeholder = 'Enter location',
    className,
    placeholderTextColor,
    showIcon = true
}: LocationAutocompleteProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const { hScale, vScale, spacing, fontSize } = useResponsive();
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
 
    useEffect(() => {
        let isMounted = true;
        if (!value || value.length < 3) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }
 
        const timer = setTimeout(async () => {
            try {
                // Add "India" to improve results for Indian addresses
                const searchQuery = value.includes('India') ? value : `${value}, India`;
 
                const response = await fetch(
                    `${NOMINATIM_BASE}/search?` +
                    `q=${encodeURIComponent(searchQuery)}` +
                    `&format=json` +
                    `&limit=5` +
                    `&countrycodes=in`, // Restrict to India
                    {
                        headers: { 'User-Agent': USER_AGENT }
                    }
                );
 
                if (!response.ok) throw new Error('Network response was not ok');
 
                const data = await response.json();
                if (isMounted) {
                    setSuggestions(data || []);
                    setShowSuggestions(true);
                }
            } catch (error) {
                console.error('Error fetching suggestions:', error);
            }
        }, 300);
 
        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [value]);
 
    const handleSelectSuggestion = (suggestion: Suggestion) => {
        onChange(suggestion.display_name, {
            lat: parseFloat(suggestion.lat),
            lng: parseFloat(suggestion.lon)
        });
        setSuggestions([]);
        setShowSuggestions(false);
    };
 
    return (
        <View className={`${className || ''}`} style={{ zIndex: 100, position: 'relative' }}>
            <View className="relative">
                {showIcon && (
                    <View 
                        style={{ position: 'absolute', left: hScale(14), top: vScale(12), zIndex: 10 }}
                    >
                        <MapPin size={hScale(18)} color={isDark ? "#475569" : "#94a3b8"} />
                    </View>
                )}
                <Input
                    value={value}
                    onChangeText={(text) => onChange(text)}
                    placeholder={placeholder}
                    placeholderTextColor={placeholderTextColor || (isDark ? "#475569" : "#94a3b8")}
                    style={{ 
                        paddingLeft: showIcon ? hScale(44) : hScale(16), 
                        height: vScale(48),
                        borderRadius: hScale(16)
                    }}
                    className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white shadow-sm"
                />
            </View>
 
            {showSuggestions && suggestions.length > 0 && (
                <View 
                    style={{ 
                        position: 'absolute', 
                        top: vScale(52), 
                        left: 0, 
                        right: 0, 
                        borderRadius: hScale(16),
                        zIndex: 50,
                        elevation: 5
                    }}
                    className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden"
                >
                    <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: vScale(240) }}>
                        {suggestions.map((suggestion, index) => (
                            <TouchableOpacity
                                key={suggestion.place_id}
                                onPress={() => handleSelectSuggestion(suggestion)}
                                style={{ paddingHorizontal: spacing.xl, paddingVertical: vScale(16) }}
                                className={`flex-row items-center gap-3 active:bg-slate-50 dark:active:bg-slate-800/50 ${index !== suggestions.length - 1 ? 'border-b border-slate-50 dark:border-slate-800' : ''}`}
                            >
                                <View style={{ padding: hScale(8), borderRadius: hScale(20) }} className="bg-slate-50 dark:bg-slate-800">
                                    <MapPin size={hScale(14)} color={isDark ? "#60a5fa" : "#3b82f6"} />
                                </View>
                                <Text style={{ fontSize: fontSize.sm }} className="font-medium text-slate-600 dark:text-slate-300 flex-1 leading-5" numberOfLines={2}>
                                    {suggestion.display_name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}
        </View>
    );
}
 
const styles = StyleSheet.create({});
