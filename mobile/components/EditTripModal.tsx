import React, { useState } from 'react';
import { View, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
 
interface EditTripModalProps {
    isOpen: boolean;
    onClose: () => void;
    trip: any;
}
 
export function EditTripModal({ isOpen, onClose, trip }: EditTripModalProps) {
    const queryClient = useQueryClient();
    const { theme, isDark } = useTheme();
    const { hScale, vScale, spacing } = useResponsive();
 
    // Initialize state with trip details
    const [price, setPrice] = useState(trip?.price_per_seat?.toString() || '');
    const [seats, setSeats] = useState(trip?.available_seats?.toString() || '');
    const [preferences, setPreferences] = useState(trip?.preferences || {
        smoking: false,
        pets: false,
        music: false,
    });
 
    const updateTripMutation = useMutation({
        mutationFn: async () => {
            const { error } = await supabase
                .from('trips')
                .update({
                    price_per_seat: parseFloat(price),
                    available_seats: parseInt(seats),
                    preferences: preferences,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', trip.id);
 
            if (error) throw error;
        },
        onSuccess: () => {
            Alert.alert('Success', 'Trip details updated successfully');
            queryClient.invalidateQueries({ queryKey: ['trip', trip.id] });
            onClose();
        },
        onError: (error: any) => {
            Alert.alert('Error', error.message || 'Failed to update trip.');
        },
    });
 
    const handleSave = () => {
        if (!price || !seats) {
            Alert.alert('Error', 'Please fill all fields');
            return;
        }
        updateTripMutation.mutate();
    };
 
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent style={{ width: '90%', maxWidth: hScale(512), borderRadius: hScale(32), padding: hScale(32) }} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <DialogHeader style={{ marginBottom: vScale(24) }}>
                    <DialogTitle style={{ fontSize: hScale(24) }} className="font-black text-slate-900 dark:text-white">Edit Trip Details</DialogTitle>
                </DialogHeader>
 
                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={{ marginBottom: vScale(24) }}>
                        <Label style={{ fontSize: hScale(10), marginBottom: vScale(12), marginLeft: hScale(4) }} className="font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">Price per Seat (₹)</Label>
                        <Input
                            keyboardType="numeric"
                            value={price}
                            onChangeText={setPrice}
                            placeholder="e.g. 250"
                            placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
                            style={{ height: vScale(56), borderRadius: hScale(16), paddingHorizontal: hScale(20), fontSize: hScale(14) }}
                            className="bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 font-bold text-slate-900 dark:text-white"
                        />
                    </View>
 
                    <View style={{ marginBottom: vScale(24) }}>
                        <Label style={{ fontSize: hScale(10), marginBottom: vScale(12), marginLeft: hScale(4) }} className="font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">Available Seats</Label>
                        <Input
                            keyboardType="numeric"
                            value={seats}
                            onChangeText={setSeats}
                            placeholder="e.g. 3"
                            placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
                            style={{ height: vScale(56), borderRadius: hScale(16), paddingHorizontal: hScale(20), fontSize: hScale(14) }}
                            className="bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 font-bold text-slate-900 dark:text-white"
                        />
                    </View>
 
                    <View style={{ marginBottom: vScale(32) }}>
                        <Label style={{ fontSize: hScale(10), marginBottom: vScale(16), marginLeft: hScale(4) }} className="font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">Preferences</Label>
 
                        <View style={{ gap: vScale(16) }}>
                            {[
                                { key: 'smoking', label: 'Smoking Allowed' },
                                { key: 'pets', label: 'Pets Allowed' },
                                { key: 'music', label: 'Music Allowed' },
                            ].map((pref) => (
                                <TouchableOpacity 
                                    key={pref.key}
                                    activeOpacity={0.7}
                                    onPress={() => setPreferences((prev: any) => ({ ...prev, [pref.key]: !prev[pref.key] }))}
                                    style={{ padding: hScale(16), borderRadius: hScale(16), borderWidth: 1 }}
                                    className={`flex-row items-center justify-between ${
                                        preferences[pref.key] 
                                            ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20' 
                                            : 'bg-slate-50 dark:bg-slate-800/20 border-slate-50 dark:border-slate-800/50'
                                    }`}
                                >
                                    <Text style={{ fontSize: hScale(14) }} className={`font-bold ${preferences[pref.key] ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}`}>
                                        {pref.label}
                                    </Text>
                                    <Checkbox
                                        checked={preferences[pref.key]}
                                        onCheckedChange={(checked) =>
                                            setPreferences((prev: any) => ({ ...prev, [pref.key]: checked }))
                                        }
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </ScrollView>
 
                <DialogFooter style={{ marginTop: vScale(16) }}>
                    <View style={{ flexDirection: 'row', gap: hScale(16), width: '100%' }}>
                        <TouchableOpacity 
                            style={{ flex: 1, height: vScale(56), borderRadius: hScale(16) }}
                            className="bg-slate-100 dark:bg-slate-800 items-center justify-center" 
                            onPress={onClose}
                        >
                            <Text style={{ fontSize: hScale(14) }} className="text-slate-500 dark:text-slate-400 font-bold">Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={{ flex: 1, height: vScale(56), borderRadius: hScale(16) }}
                            className="bg-blue-600 active:bg-blue-700 items-center justify-center shadow-lg shadow-blue-500/20"
                            onPress={handleSave}
                            disabled={updateTripMutation.isPending}
                        >
                            <Text style={{ fontSize: hScale(14) }} className="text-white font-bold">
                                {updateTripMutation.isPending ? 'Saving...' : 'Save Changes'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
