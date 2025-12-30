import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Home, Briefcase, Heart, MapPin, Plus, Edit2, Trash2, X } from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { MapService } from '@/services/MapService';
import { logger } from '@/services/LoggerService';

interface SavedPlace {
    id: string;
    user_id: string;
    place_type: 'home' | 'work' | 'favorite';
    label: string;
    address: string;
    latitude: number;
    longitude: number;
    created_at: string;
}

export default function SavedPlacesScreen() {
    const { user } = useAuth();
    const [places, setPlaces] = useState<SavedPlace[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingPlace, setEditingPlace] = useState<SavedPlace | null>(null);

    useEffect(() => {
        if (user) {
            loadSavedPlaces();
        }
    }, [user]);

    const loadSavedPlaces = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('saved_places')
                .select('*')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPlaces(data || []);
        } catch (error: any) {
            logger.error('Error loading saved places:', error);
            Alert.alert('Error', 'Failed to load saved places');
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePlace = async (placeId: string) => {
        Alert.alert(
            'Delete Place',
            'Are you sure you want to delete this saved place?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('saved_places')
                                .delete()
                                .eq('id', placeId);

                            if (error) throw error;
                            await loadSavedPlaces();
                            Alert.alert('Success', 'Place deleted successfully');
                        } catch (error: any) {
                            logger.error('Error deleting place:', error);
                            Alert.alert('Error', 'Failed to delete place');
                        }
                    },
                },
            ]
        );
    };

    const getPlaceIcon = (type: string) => {
        switch (type) {
            case 'home':
                return <Home size={24} color="#6366f1" />;
            case 'work':
                return <Briefcase size={24} color="#8b5cf6" />;
            case 'favorite':
                return <Heart size={24} color="#ef4444" fill="#ef4444" />;
            default:
                return <MapPin size={24} color="#6b7280" />;
        }
    };

    const getPlaceTypeLabel = (type: string): string => {
        switch (type) {
            case 'home':
                return 'Home';
            case 'work':
                return 'Work';
            case 'favorite':
                return 'Favorite';
            default:
                return 'Place';
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366f1" />
                    <Text style={styles.loadingText}>Loading saved places...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <X size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Saved Places</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content}>
                {/* Quick Add Buttons */}
                <View style={styles.quickAddContainer}>
                    <Text style={styles.sectionTitle}>Quick Add</Text>
                    <View style={styles.quickAddButtons}>
                        <TouchableOpacity
                            style={styles.quickAddButton}
                            onPress={() => {
                                setEditingPlace({
                                    id: '',
                                    user_id: user?.id || '',
                                    place_type: 'home',
                                    label: 'Home',
                                    address: '',
                                    latitude: 0,
                                    longitude: 0,
                                    created_at: new Date().toISOString(),
                                });
                                setShowAddModal(true);
                            }}
                        >
                            <Home size={20} color="#6366f1" />
                            <Text style={styles.quickAddText}>Add Home</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.quickAddButton}
                            onPress={() => {
                                setEditingPlace({
                                    id: '',
                                    user_id: user?.id || '',
                                    place_type: 'work',
                                    label: 'Work',
                                    address: '',
                                    latitude: 0,
                                    longitude: 0,
                                    created_at: new Date().toISOString(),
                                });
                                setShowAddModal(true);
                            }}
                        >
                            <Briefcase size={20} color="#8b5cf6" />
                            <Text style={styles.quickAddText}>Add Work</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.quickAddButton}
                            onPress={() => {
                                setEditingPlace({
                                    id: '',
                                    user_id: user?.id || '',
                                    place_type: 'favorite',
                                    label: 'Favorite Place',
                                    address: '',
                                    latitude: 0,
                                    longitude: 0,
                                    created_at: new Date().toISOString(),
                                });
                                setShowAddModal(true);
                            }}
                        >
                            <Heart size={20} color="#ef4444" />
                            <Text style={styles.quickAddText}>Add Favorite</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Saved Places List */}
                <View style={styles.placesContainer}>
                    <Text style={styles.sectionTitle}>Your Places</Text>
                    {places.length === 0 ? (
                        <View style={styles.emptyState}>
                            <MapPin size={48} color="#d1d5db" />
                            <Text style={styles.emptyText}>No saved places yet</Text>
                            <Text style={styles.emptySubtext}>
                                Add your frequently visited places for quick access
                            </Text>
                        </View>
                    ) : (
                        places.map((place) => (
                            <View key={place.id} style={styles.placeCard}>
                                <View style={styles.placeIcon}>{getPlaceIcon(place.place_type)}</View>
                                <View style={styles.placeInfo}>
                                    <Text style={styles.placeLabel}>{place.label}</Text>
                                    <Text style={styles.placeAddress} numberOfLines={2}>
                                        {place.address}
                                    </Text>
                                    <Text style={styles.placeType}>
                                        {getPlaceTypeLabel(place.place_type)}
                                    </Text>
                                </View>
                                <View style={styles.placeActions}>
                                    <TouchableOpacity
                                        style={styles.actionButton}
                                        onPress={() => {
                                            setEditingPlace(place);
                                            setShowAddModal(true);
                                        }}
                                    >
                                        <Edit2 size={18} color="#6366f1" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.actionButton}
                                        onPress={() => handleDeletePlace(place.id)}
                                    >
                                        <Trash2 size={18} color="#ef4444" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>

            {/* Add/Edit Modal */}
            {showAddModal && editingPlace && (
                <AddPlaceModal
                    place={editingPlace}
                    onClose={() => {
                        setShowAddModal(false);
                        setEditingPlace(null);
                    }}
                    onSave={async () => {
                        setShowAddModal(false);
                        setEditingPlace(null);
                        await loadSavedPlaces();
                    }}
                />
            )}
        </SafeAreaView>
    );
}

// Add Place Modal Component
const AddPlaceModal: React.FC<{
    place: SavedPlace;
    onClose: () => void;
    onSave: () => void;
}> = ({ place, onClose, onSave }) => {
    const [label, setLabel] = useState(place.label);
    const [address, setAddress] = useState(place.address);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(
        place.id ? { lat: place.latitude, lng: place.longitude } : null
    );
    const [loading, setLoading] = useState(false);

    const handleAddressChange = async (text: string) => {
        setAddress(text);
        if (text.length > 2) {
            const results = await MapService.getPlaceAutocomplete(text);
            setSuggestions(results);
        } else {
            setSuggestions([]);
        }
    };

    const handleSelectSuggestion = async (suggestion: any) => {
        setAddress(suggestion.description);
        setSuggestions([]);
        setLoading(true);
        try {
            const details = await MapService.getPlaceDetails(suggestion.placeId);
            if (details) {
                setSelectedCoords(details.coordinates);
                setAddress(details.address);
            }
        } catch (error) {
            logger.error('Error getting place details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!label.trim() || !address.trim()) {
            Alert.alert('Error', 'Please enter both label and address');
            return;
        }

        try {
            setLoading(true);

            let coordinates = selectedCoords;

            // If coordinates not set via selection, try geocoding
            if (!coordinates) {
                coordinates = await MapService.geocode(address);
            }

            if (!coordinates) {
                Alert.alert('Error', 'Could not find the address. Please try again.');
                return;
            }

            const placeData = {
                user_id: place.user_id,
                place_type: place.place_type,
                label: label.trim(),
                address: address.trim(),
                latitude: coordinates.lat,
                longitude: coordinates.lng,
            };

            if (place.id) {
                // Update existing place
                const { error } = await supabase
                    .from('saved_places')
                    .update(placeData)
                    .eq('id', place.id);

                if (error) throw error;
            } else {
                // Create new place
                const { error } = await supabase.from('saved_places').insert(placeData);

                if (error) throw error;
            }

            Alert.alert('Success', 'Place saved successfully');
            onSave();
        } catch (error: any) {
            logger.error('Error saving place:', error);
            Alert.alert('Error', 'Failed to save place');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>
                        {place.id ? 'Edit Place' : 'Add Place'}
                    </Text>
                    <TouchableOpacity onPress={onClose}>
                        <X size={24} color="#6b7280" />
                    </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                    <Text style={styles.inputLabel}>Label</Text>
                    <TextInput
                        style={styles.input}
                        value={label}
                        onChangeText={setLabel}
                        placeholder="e.g., Home, Office, Gym"
                        placeholderTextColor="#9ca3af"
                    />

                    <Text style={styles.inputLabel}>Address</Text>
                    <View style={styles.addressInputContainer}>
                        <TextInput
                            style={[styles.input, styles.textArea, suggestions.length > 0 && styles.inputWithSuggestions]}
                            value={address}
                            onChangeText={handleAddressChange}
                            placeholder="Search for address"
                            placeholderTextColor="#9ca3af"
                            multiline
                            numberOfLines={3}
                        />
                        {suggestions.length > 0 && (
                            <View style={styles.suggestionsContainer}>
                                <ScrollView keyboardShouldPersistTaps="handled" style={styles.suggestionsList}>
                                    {suggestions.map((item, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={styles.suggestionItem}
                                            onPress={() => handleSelectSuggestion(item)}
                                        >
                                            <MapPin size={16} color="#6b7280" style={styles.suggestionIcon} />
                                            <View>
                                                <Text style={styles.suggestionMainText}>{item.mainText}</Text>
                                                <Text style={styles.suggestionSecondaryText}>{item.secondaryText}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}
                    </View>
                </View>

                <View style={styles.modalFooter}>
                    <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.saveButton, (loading || (!selectedCoords && address.length < 5)) && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        disabled={loading || (!selectedCoords && address.length < 5)}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.saveButtonText}>Save</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#6b7280',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1f2937',
    },
    content: {
        flex: 1,
    },
    quickAddContainer: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 12,
    },
    quickAddButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    quickAddButton: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        backgroundColor: '#f9fafb',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#e5e7eb',
        gap: 8,
    },
    quickAddText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#4b5563',
    },
    placesContainer: {
        padding: 16,
        paddingTop: 0,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6b7280',
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#9ca3af',
        marginTop: 8,
        textAlign: 'center',
        paddingHorizontal: 32,
    },
    placeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#f9fafb',
        borderRadius: 12,
        marginBottom: 12,
    },
    placeIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    placeInfo: {
        flex: 1,
    },
    placeLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 4,
    },
    placeAddress: {
        fontSize: 13,
        color: '#6b7280',
        marginBottom: 4,
    },
    placeType: {
        fontSize: 11,
        color: '#9ca3af',
        textTransform: 'uppercase',
        fontWeight: '600',
    },
    placeActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    modalContent: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1f2937',
    },
    modalBody: {
        padding: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4b5563',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: '#1f2937',
        marginBottom: 16,
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    modalFooter: {
        flexDirection: 'row',
        gap: 12,
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    cancelButton: {
        flex: 1,
        padding: 14,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#e5e7eb',
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#6b7280',
    },
    saveButton: {
        flex: 1,
        padding: 14,
        borderRadius: 8,
        backgroundColor: '#6366f1',
        alignItems: 'center',
    },
    saveButtonDisabled: {
        backgroundColor: '#9ca3af',
    },
    saveButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
    },
    addressInputContainer: {
        position: 'relative',
        zIndex: 10,
    },
    inputWithSuggestions: {
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
    },
    suggestionsContainer: {
        position: 'absolute',
        top: 80, // Height of textArea
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderTopWidth: 0,
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
        maxHeight: 200,
        zIndex: 1000,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    suggestionsList: {
        flex: 1,
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    suggestionIcon: {
        marginRight: 10,
    },
    suggestionMainText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
    },
    suggestionSecondaryText: {
        fontSize: 12,
        color: '#6b7280',
    },
});
