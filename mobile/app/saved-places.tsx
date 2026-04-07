import React, { useState, useEffect } from 'react';
import {
    View,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Home, Briefcase, Heart, MapPin, Plus, Edit2, Trash2, X, Navigation } from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { MapService } from '@/services/MapService';
import { logger } from '@/services/LoggerService';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/contexts/ThemeContext';
import { Card } from '@/components/ui/card';
import { useResponsive } from '@/hooks/useResponsive';
 
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
    const { theme, isDark } = useTheme();
    const { hScale, vScale, spacing, fontSize } = useResponsive();
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
            'Remove this location from your secure terminal?',
            [
                { text: 'Abort', style: 'cancel' },
                {
                    text: 'Confirm Deletion',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('saved_places')
                                .delete()
                                .eq('id', placeId);
 
                            if (error) throw error;
                            await loadSavedPlaces();
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
        const iconSize = hScale(22);
        switch (type) {
            case 'home':
                return <Home size={iconSize} color="#3b82f6" />;
            case 'work':
                return <Briefcase size={iconSize} color="#818cf8" />;
            case 'favorite':
                return <Heart size={iconSize} color="#ef4444" fill="#ef4444" />;
            default:
                return <MapPin size={iconSize} color="#94a3b8" />;
        }
    };
 
    const getPlaceTypeLabel = (type: string): string => {
        switch (type) {
            case 'home': return 'RESIDENCE';
            case 'work': return 'HQ / OFFICE';
            case 'favorite': return 'PRIORITY';
            default: return 'LOCATION';
        }
    };
 
    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-white dark:bg-slate-950">
                <View style={{ padding: spacing.xxl }} className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color={isDark ? "#ffffff" : "#3b82f6"} />
                    <Text style={{ fontSize: hScale(10), marginTop: vScale(24) }} className="font-black text-slate-400 dark:text-slate-600 uppercase tracking-[2px]">Syncing Saved Coordinates...</Text>
                </View>
            </SafeAreaView>
        );
    }
 
    return (
        <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={['top']}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            
            <View style={{ paddingHorizontal: spacing.xl, paddingVertical: vScale(20), borderBottomWidth: 1 }} className="flex-row items-center justify-between bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 shadow-sm z-30">
                <TouchableOpacity 
                    onPress={() => router.back()} 
                    style={{ width: hScale(48), height: hScale(48), borderRadius: hScale(24), borderWidth: 1 }}
                    className="bg-slate-50 dark:bg-slate-900 items-center justify-center border border-slate-100 dark:border-slate-800"
                >
                    <X size={hScale(24)} color={isDark ? "#f8fafc" : "#1e293b"} />
                </TouchableOpacity>
                <Text style={{ fontSize: fontSize.xl }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">Terminals</Text>
                <View style={{ width: hScale(48) }} />
            </View>
 
            <ScrollView 
                className="flex-1" 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding: spacing.xl, paddingBottom: vScale(100) }}
            >
                {/* Quick Add Buttons */}
                <View style={{ marginBottom: vScale(40) }}>
                    <Text style={{ fontSize: hScale(10), marginBottom: vScale(24), paddingHorizontal: spacing.xs }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-[2px]">Rapid Access Assignment</Text>
                    <View style={{ flexDirection: 'row', gap: spacing.lg }}>
                        {[
                            { type: 'home', icon: Home, color: '#3b82f6', label: 'ADD HOME' },
                            { type: 'work', icon: Briefcase, color: '#818cf8', label: 'ADD WORK' },
                            { type: 'favorite', icon: Heart, color: '#ef4444', label: 'ADD FAV' }
                        ].map((item: any) => (
                            <TouchableOpacity
                                key={item.type}
                                style={{ padding: spacing.xl, borderRadius: hScale(24), borderWidth: 1 }}
                                className="flex-1 items-center justify-center bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm active:bg-slate-50 dark:active:bg-slate-800"
                                onPress={() => {
                                    setEditingPlace({
                                        id: '',
                                        user_id: user?.id || '',
                                        place_type: item.type,
                                        label: item.type.charAt(0).toUpperCase() + item.type.slice(1),
                                        address: '',
                                        latitude: 0,
                                        longitude: 0,
                                        created_at: new Date().toISOString(),
                                    });
                                    setShowAddModal(true);
                                }}
                            >
                                <View 
                                    style={{ width: hScale(48), height: hScale(48), borderRadius: hScale(12), marginBottom: vScale(12), backgroundColor: isDark ? `${item.color}20` : `${item.color}10` }}
                                    className="items-center justify-center"
                                >
                                    <item.icon size={hScale(20)} color={item.color} fill={item.type === 'favorite' ? item.color : 'transparent'} />
                                </View>
                                <Text style={{ fontSize: hScale(9) }} className="font-black text-slate-500 dark:text-slate-400 text-center tracking-widest uppercase">{item.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
 
                {/* Saved Places List */}
                <View>
                    <Text style={{ fontSize: hScale(10), marginBottom: vScale(24), paddingHorizontal: spacing.xs }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-[2px]">Secure Map Index</Text>
                    {places.length === 0 ? (
                        <View style={{ paddingVertical: vScale(80) }} className="items-center justify-center opacity-30">
                            <Navigation size={hScale(64)} color={isDark ? "#334155" : "#cbd5e1"} strokeWidth={1} />
                            <Text style={{ fontSize: fontSize.xl, marginTop: vScale(32) }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">Terminal Empty</Text>
                            <Text style={{ fontSize: hScale(10), marginTop: vScale(12), lineHeight: vScale(16), paddingHorizontal: spacing.xxl }} className="font-medium text-slate-500 dark:text-slate-500 text-center tracking-widest uppercase">
                                Assign frequently used coordinates for optimized navigation.
                            </Text>
                        </View>
                    ) : (
                        places.map((place) => (
                            <Card key={place.id} style={{ padding: spacing.xl, borderRadius: hScale(32), marginBottom: vScale(16), borderWidth: 1 }} className="flex-row items-center bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm">
                                <View style={{ width: hScale(56), height: hScale(56), borderRadius: hScale(16), marginRight: spacing.xl }} className="bg-slate-50 dark:bg-slate-800 items-center justify-center shadow-inner">
                                    {getPlaceIcon(place.place_type)}
                                </View>
                                <View className="flex-1">
                                    <Text style={{ fontSize: fontSize.base, marginBottom: vScale(4) }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">{place.label}</Text>
                                    <Text style={{ fontSize: hScale(10), marginBottom: vScale(8), lineHeight: vScale(16) }} className="font-medium text-slate-500 dark:text-slate-500 uppercase tracking-tight" numberOfLines={2}>
                                        {place.address}
                                    </Text>
                                    <View style={{ paddingHorizontal: spacing.sm, paddingVertical: vScale(2), borderRadius: hScale(6) }} className="self-start bg-slate-100 dark:bg-slate-800">
                                        <Text style={{ fontSize: hScale(8) }} className="text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest">
                                            {getPlaceTypeLabel(place.place_type)}
                                        </Text>
                                    </View>
                                </View>
                                <View style={{ flexDirection: 'row', gap: spacing.md, marginLeft: spacing.xl }}>
                                    <TouchableOpacity
                                        style={{ width: hScale(40), height: hScale(40), borderRadius: hScale(12), borderWidth: 1 }}
                                        className="bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 items-center justify-center active:bg-slate-100"
                                        onPress={() => {
                                            setEditingPlace(place);
                                            setShowAddModal(true);
                                        }}
                                    >
                                        <Edit2 size={hScale(16)} color={isDark ? "#475569" : "#64748b"} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={{ width: hScale(40), height: hScale(40), borderRadius: hScale(12), borderWidth: 1 }}
                                        className="bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30 items-center justify-center"
                                        onPress={() => handleDeletePlace(place.id)}
                                    >
                                        <Trash2 size={hScale(16)} color="#ef4444" />
                                    </TouchableOpacity>
                                </View>
                            </Card>
                        ))
                    )}
                </View>
            </ScrollView>
 
            {/* Add/Edit Modal */}
            {showAddModal && editingPlace && (
                <AddPlaceModal
                    place={editingPlace}
                    isDark={isDark}
                    onClose={() => {
                        setShowAddModal(false);
                        setEditingPlace(null);
                    }}
                    onSave={async () => {
                        setShowAddModal(false);
                        setEditingPlace(null);
                        await loadSavedPlaces();
                    }}
                    useResponsiveHook={useResponsive}
                />
            )}
        </SafeAreaView>
    );
}
 
import { LocationAutocomplete } from '@/components/LocationAutocomplete';

const AddPlaceModal: React.FC<{
    place: any;
    isDark: boolean;
    onClose: () => void;
    onSave: () => Promise<void>;
    useResponsiveHook: typeof useResponsive;
}> = ({ place, isDark, onClose, onSave, useResponsiveHook }) => {
    const { toast } = require('@/components/ui/toast').useToast();
    const { hScale, vScale, spacing, fontSize } = useResponsiveHook();
    const [label, setLabel] = useState(place.label);
    const [address, setAddress] = useState(place.address);
    const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(
        place.id ? { lat: place.latitude, lng: place.longitude } : null
    );
    const [loading, setLoading] = useState(false);
 
    const handleSave = async () => {
        if (!label.trim() || !address.trim()) {
            toast({
                title: 'Error',
                description: 'Please enter both identification and coordinates',
                variant: 'destructive',
            });
            return;
        }
 
        try {
            setLoading(true);
            let coordinates = selectedCoords;
            if (!coordinates) {
                coordinates = await MapService.geocode(address);
            }
 
            if (!coordinates) {
                toast({ title: 'Error', description: 'Terminal unreachable. Please verify address.', variant: 'destructive' });
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
                const { error } = await supabase
                    .from('saved_places')
                    .update(placeData)
                    .eq('id', place.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('saved_places').insert(placeData);
                if (error) throw error;
            }
 
            onSave();
        } catch (error: any) {
            logger.error('Error saving place:', error);
            toast({ title: 'Error', description: 'Execution failed. Failed to save coordinates.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };
 
    return (
        <View style={{ padding: spacing.xl }} className="absolute inset-0 bg-slate-900/40 dark:bg-black/80 justify-center items-center z-50">
            <View style={{ borderRadius: hScale(32), borderWidth: 1 }} className="w-full bg-white dark:bg-slate-900 overflow-hidden border-slate-100 dark:border-slate-800 shadow-2xl">
                <View style={{ paddingHorizontal: spacing.xxl, paddingVertical: vScale(24), borderBottomWidth: 1 }} className="flex-row items-center justify-between border-slate-50 dark:border-slate-800/50">
                    <Text style={{ fontSize: fontSize.xl }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                        {place.id ? 'Edit Assignment' : 'New Assignment'}
                    </Text>
                    <TouchableOpacity onPress={onClose} style={{ width: hScale(40), height: hScale(40), borderRadius: hScale(20) }} className="items-center justify-center bg-slate-50 dark:bg-slate-800">
                        <X size={hScale(20)} color={isDark ? "#475569" : "#64748b"} />
                    </TouchableOpacity>
                </View>
 
                <View style={{ padding: spacing.xxl }}>
                    <Text style={{ fontSize: hScale(10), marginBottom: vScale(12), marginLeft: spacing.xs }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Terminal ID</Text>
                    <TextInput
                        style={{ paddingHorizontal: spacing.xl, paddingVertical: vScale(16), borderRadius: hScale(16), fontSize: fontSize.base, marginBottom: vScale(24), borderWidth: 1 }}
                        className="bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white uppercase tracking-tight shadow-inner"
                        value={label}
                        onChangeText={setLabel}
                        placeholder="e.g. MISSION HQ"
                        placeholderTextColor={isDark ? "#334155" : "#94a3b8"}
                    />
 
                    <Text style={{ fontSize: hScale(10), marginBottom: vScale(12), marginLeft: spacing.xs }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Coordinates</Text>
                    <View style={{ gap: spacing.sm }} className="z-50">
                        <LocationAutocomplete
                            placeholder="Search terminal grid..."
                            value={address}
                            onChange={(val, coords) => {
                                setAddress(val);
                                if (coords) setSelectedCoords(coords);
                            }}
                            placeholderTextColor={isDark ? "#334155" : "#94a3b8"}
                        />
                    </View>
                </View>
 
                <View style={{ flexDirection: 'row', gap: spacing.lg, padding: spacing.xxl, borderTopWidth: 1 }} className="bg-slate-50 dark:bg-slate-950/20 border-slate-50 dark:border-slate-800">
                    <TouchableOpacity 
                        style={{ paddingVertical: vScale(20), borderRadius: hScale(16), borderWidth: 1 }}
                        className="flex-1 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 items-center" 
                        onPress={onClose}
                    >
                        <Text style={{ fontSize: fontSize.xs }} className="font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">Abort</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={{ paddingVertical: vScale(20), borderRadius: hScale(16) }}
                        className={`flex-1 bg-slate-900 dark:bg-white items-center shadow-lg ${(loading || (!selectedCoords && address.length < 5)) ? 'opacity-30' : ''}`}
                        onPress={handleSave}
                        disabled={loading || (!selectedCoords && address.length < 5)}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color={isDark ? "#000" : "#fff"} />
                        ) : (
                            <Text style={{ fontSize: fontSize.xs }} className="text-xs font-black text-white dark:text-slate-900 uppercase tracking-widest">Initiate</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};
