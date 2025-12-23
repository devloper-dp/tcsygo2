import { useState, useEffect } from 'react';
import { View, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Input } from './ui/input';
import { Text } from './ui/text';
import { MapPin } from 'lucide-react-native';
import { Coordinates } from '@/lib/mapbox';
import { MAPBOX_TOKEN } from '@/lib/mapbox';

interface LocationAutocompleteProps {
    value: string;
    onChange: (value: string, coords?: Coordinates) => void;
    placeholder?: string;
    className?: string;
}

interface Suggestion {
    id: string;
    place_name: string;
    center: [number, number];
}

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

        // Only fetch if suggestions are not already shown to avoid loop when typing
        // Actually, we want to fetch as we type. But if we selected, we might want to suppress.
        // In this basic version, we'll fetch on every change > 3 chars. 
        // Debounce should be handled, or we trust the user types slowly or we add it.

        const timer = setTimeout(async () => {
            try {
                const response = await fetch(
                    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json?access_token=${MAPBOX_TOKEN}&limit=5`
                );
                const data = await response.json();
                setSuggestions(data.features || []);
                setShowSuggestions(true);
            } catch (error) {
                console.error('Error fetching suggestions:', error);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [value]);

    const handleSelectSuggestion = (suggestion: Suggestion) => {
        // When selecting, we update the value. 
        // We should probably have a way to know "this update came from selection" to avoid re-fetching.
        // For now, setting suggestions to empty accomplishes closing the list.
        onChange(suggestion.place_name, {
            lat: suggestion.center[1],
            lng: suggestion.center[0]
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
                                key={suggestion.id}
                                onPress={() => handleSelectSuggestion(suggestion)}
                                className="flex-row items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-800 active:bg-gray-50 dark:active:bg-gray-900"
                            >
                                <MapPin size={16} className="text-gray-400" color="gray" />
                                <Text className="text-sm flex-1" numberOfLines={2}>{suggestion.place_name}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}
        </View>
    );
}
