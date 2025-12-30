import { useState, useEffect } from 'react';
import { View, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Input } from './ui/input';
import { Text } from './ui/text';
import { MapPin } from 'lucide-react-native';
import { Coordinates } from '@/lib/maps';

interface LocationAutocompleteProps {
    value: string;
    onChange: (value: string, coords?: Coordinates) => void;
    placeholder?: string;
    className?: string;
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
    className
}: LocationAutocompleteProps) {
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    useEffect(() => {
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
                const data = await response.json();
                setSuggestions(data || []);
                setShowSuggestions(true);
            } catch (error) {
                console.error('Error fetching suggestions:', error);
            }
        }, 300);

        return () => clearTimeout(timer);
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
        <View className={`relative z-50 ${className || ''}`} style={{ zIndex: 100 }}>
            <View className="relative">
                <View className="absolute left-3 top-3 z-10">
                    <MapPin size={20} className="text-gray-500" color="gray" />
                </View>
                <Input
                    value={value}
                    onChangeText={(text) => onChange(text)}
                    placeholder={placeholder}
                    className="pl-10"
                />
            </View>

            {showSuggestions && suggestions.length > 0 && (
                <View className="absolute top-12 left-0 right-0 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg overflow-hidden z-50 elevation-5">
                    <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 200 }}>
                        {suggestions.map((suggestion) => (
                            <TouchableOpacity
                                key={suggestion.place_id}
                                onPress={() => handleSelectSuggestion(suggestion)}
                                className="flex-row items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-800 active:bg-gray-50 dark:active:bg-gray-900"
                            >
                                <MapPin size={16} className="text-gray-400" color="gray" />
                                <Text className="text-sm flex-1" numberOfLines={2}>{suggestion.display_name}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}
        </View>
    );
}
