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

export function MobileFilters({ visible, onClose, filters, onApply }: MobileFiltersProps) {
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
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="close" size={24} color="#000" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle} className="font-semibold">
                        Filters
                    </Text>
                    <TouchableOpacity onPress={handleReset}>
                        <Text style={styles.resetText} className="text-primary">
                            Reset
                        </Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Price Range */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle} className="font-semibold">
                            Price Range
                        </Text>
                        <View style={styles.priceInputs}>
                            <View style={styles.priceInput}>
                                <Text style={styles.label} className="text-gray-600">
                                    Min (₹)
                                </Text>
                                <View style={styles.input}>
                                    <Text>{localFilters.minPrice || 0}</Text>
                                </View>
                            </View>
                            <View style={styles.priceInput}>
                                <Text style={styles.label} className="text-gray-600">
                                    Max (₹)
                                </Text>
                                <View style={styles.input}>
                                    <Text>{localFilters.maxPrice || 1000}</Text>
                                </View>
                            </View>
                        </View>
                        <Slider
                            style={styles.slider}
                            minimumValue={0}
                            maximumValue={1000}
                            step={50}
                            value={localFilters.minPrice || 0}
                            onValueChange={(value) => setLocalFilters({ ...localFilters, minPrice: value })}
                            minimumTrackTintColor="#3b82f6"
                            maximumTrackTintColor="#d1d5db"
                        />
                    </View>

                    {/* Minimum Seats */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle} className="font-semibold">
                            Minimum Seats: {localFilters.minSeats || 1}
                        </Text>
                        <Slider
                            style={styles.slider}
                            minimumValue={1}
                            maximumValue={7}
                            step={1}
                            value={localFilters.minSeats || 1}
                            onValueChange={(value) => setLocalFilters({ ...localFilters, minSeats: value })}
                            minimumTrackTintColor="#3b82f6"
                            maximumTrackTintColor="#d1d5db"
                        />
                    </View>

                    {/* Preferences */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle} className="font-semibold">
                            Preferences
                        </Text>
                        <View style={styles.preferences}>
                            <TouchableOpacity
                                style={styles.preferenceItem}
                                onPress={() => togglePreference('smoking')}
                            >
                                <View style={styles.preferenceLeft}>
                                    <Ionicons
                                        name={localFilters.preferences?.smoking ? 'checkmark-circle' : 'ellipse-outline'}
                                        size={24}
                                        color={localFilters.preferences?.smoking ? '#3b82f6' : '#9ca3af'}
                                    />
                                    <Text style={styles.preferenceText}>Smoking Allowed</Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.preferenceItem}
                                onPress={() => togglePreference('pets')}
                            >
                                <View style={styles.preferenceLeft}>
                                    <Ionicons
                                        name={localFilters.preferences?.pets ? 'checkmark-circle' : 'ellipse-outline'}
                                        size={24}
                                        color={localFilters.preferences?.pets ? '#3b82f6' : '#9ca3af'}
                                    />
                                    <Text style={styles.preferenceText}>Pets Allowed</Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.preferenceItem}
                                onPress={() => togglePreference('music')}
                            >
                                <View style={styles.preferenceLeft}>
                                    <Ionicons
                                        name={localFilters.preferences?.music ? 'checkmark-circle' : 'ellipse-outline'}
                                        size={24}
                                        color={localFilters.preferences?.music ? '#3b82f6' : '#9ca3af'}
                                    />
                                    <Text style={styles.preferenceText}>Music Allowed</Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.preferenceItem}
                                onPress={() => togglePreference('luggage')}
                            >
                                <View style={styles.preferenceLeft}>
                                    <Ionicons
                                        name={localFilters.preferences?.luggage ? 'checkmark-circle' : 'ellipse-outline'}
                                        size={24}
                                        color={localFilters.preferences?.luggage ? '#3b82f6' : '#9ca3af'}
                                    />
                                    <Text style={styles.preferenceText}>Extra Luggage</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Sort By */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle} className="font-semibold">
                            Sort By
                        </Text>
                        <View style={styles.sortOptions}>
                            {(['price', 'departure', 'duration', 'rating'] as const).map((option) => (
                                <TouchableOpacity
                                    key={option}
                                    style={[
                                        styles.sortOption,
                                        localFilters.sortBy === option && styles.sortOptionActive,
                                    ]}
                                    onPress={() => setLocalFilters({ ...localFilters, sortBy: option })}
                                >
                                    <Text
                                        style={[
                                            styles.sortOptionText,
                                            localFilters.sortBy === option && styles.sortOptionTextActive,
                                        ]}
                                        className={localFilters.sortBy === option ? 'font-semibold' : ''}
                                    >
                                        {option.charAt(0).toUpperCase() + option.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </ScrollView>

                <View style={styles.footer}>
                    <Button onPress={handleApply} className="flex-1">
                        <Text className="text-white font-medium">Apply Filters</Text>
                    </Button>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    headerTitle: {
        fontSize: 18,
    },
    resetText: {
        fontSize: 14,
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
    },
    section: {
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    sectionTitle: {
        fontSize: 16,
        marginBottom: 16,
    },
    priceInputs: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    priceInput: {
        flex: 1,
    },
    label: {
        fontSize: 12,
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 12,
        backgroundColor: '#f9fafb',
    },
    slider: {
        width: '100%',
        height: 40,
    },
    preferences: {
        gap: 16,
    },
    preferenceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    preferenceLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    preferenceText: {
        fontSize: 14,
    },
    sortOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    sortOption: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#d1d5db',
        backgroundColor: '#ffffff',
    },
    sortOptionActive: {
        backgroundColor: '#3b82f6',
        borderColor: '#3b82f6',
    },
    sortOptionText: {
        fontSize: 14,
        color: '#374151',
    },
    sortOptionTextActive: {
        color: '#ffffff',
    },
    footer: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
});
