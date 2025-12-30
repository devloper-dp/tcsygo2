import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import Slider from '@react-native-community/slider';
// import { useToast } from '@/hooks/use-toast'; // Mobile toast hook todo

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
    const { t } = useTranslation();
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
                    luggage_capacity: internalPreferences.luggage_capacity,
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
        <Card style={[styles.container, style]}>
            <Text style={styles.title}>Ride Preferences</Text>

            {/* AC Preference */}
            <View style={styles.row}>
                <View style={styles.labelContainer}>
                    <View style={styles.iconBox}>
                        <Ionicons name="snow-outline" size={20} color="#3b82f6" />
                    </View>
                    <View>
                        <Text style={styles.label}>AC Ride</Text>
                        <Text style={styles.subLabel}>Prefer AC vehicles</Text>
                    </View>
                </View>
                <Switch
                    value={internalPreferences.ac_preferred}
                    onValueChange={(val) => handlePreferenceChange('ac_preferred', val)}
                    trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                    thumbColor={internalPreferences.ac_preferred ? '#3b82f6' : '#f4f3f4'}
                />
            </View>

            {/* Music Preference */}
            <View style={styles.row}>
                <View style={styles.labelContainer}>
                    <View style={styles.iconBox}>
                        <Ionicons name="musical-notes-outline" size={20} color="#3b82f6" />
                    </View>
                    <View>
                        <Text style={styles.label}>Music</Text>
                        <Text style={styles.subLabel}>Allow music during ride</Text>
                    </View>
                </View>
                <Switch
                    value={internalPreferences.music_allowed}
                    onValueChange={(val) => handlePreferenceChange('music_allowed', val)}
                    trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                    thumbColor={internalPreferences.music_allowed ? '#3b82f6' : '#f4f3f4'}
                />
            </View>

            {/* Pet Friendly */}
            <View style={styles.row}>
                <View style={styles.labelContainer}>
                    <View style={styles.iconBox}>
                        <Ionicons name="paw-outline" size={20} color="#3b82f6" />
                    </View>
                    <View>
                        <Text style={styles.label}>Pet Friendly</Text>
                        <Text style={styles.subLabel}>Traveling with pets</Text>
                    </View>
                </View>
                <Switch
                    value={internalPreferences.pet_friendly}
                    onValueChange={(val) => handlePreferenceChange('pet_friendly', val)}
                    trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                    thumbColor={internalPreferences.pet_friendly ? '#3b82f6' : '#f4f3f4'}
                />
            </View>

            {/* Luggage Capacity */}
            <View style={styles.sliderContainer}>
                <View style={styles.labelContainer}>
                    <View style={styles.iconBox}>
                        <Ionicons name="briefcase-outline" size={20} color="#3b82f6" />
                    </View>
                    <View>
                        <Text style={styles.label}>Luggage</Text>
                        <Text style={styles.subLabel}>Number of bags: {internalPreferences.luggage_capacity}</Text>
                    </View>
                </View>
                <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={5}
                    step={1}
                    value={internalPreferences.luggage_capacity}
                    onValueChange={(val: number) => handlePreferenceChange('luggage_capacity', val)}
                    minimumTrackTintColor="#3b82f6"
                    maximumTrackTintColor="#d1d5db"
                    thumbTintColor="#3b82f6"
                />
                <View style={styles.sliderLabels}>
                    <Text style={styles.sliderLabelText}>None</Text>
                    <Text style={styles.sliderLabelText}>Max (5)</Text>
                </View>
            </View>

            {showSaveButton && (
                <TouchableOpacity
                    style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                    onPress={savePreferences}
                    disabled={loading}
                >
                    <Text style={styles.saveButtonText}>
                        {loading ? 'Saving...' : 'Save Preferences'}
                    </Text>
                </TouchableOpacity>
            )}
        </Card>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: 'white',
        borderRadius: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#1f2937',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    label: {
        fontSize: 16,
        fontWeight: '500',
        color: '#374151',
    },
    subLabel: {
        fontSize: 12,
        color: '#6b7280',
    },
    sliderContainer: {
        marginBottom: 24,
    },
    slider: {
        width: '100%',
        height: 40,
        marginTop: 8,
    },
    sliderLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    sliderLabelText: {
        fontSize: 12,
        color: '#9ca3af',
    },
    saveButton: {
        backgroundColor: '#3b82f6',
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    saveButtonDisabled: {
        opacity: 0.7,
    },
    saveButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
    },
});
