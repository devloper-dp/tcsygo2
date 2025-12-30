import React, { useState } from 'react';
import { View, Text, Alert, ScrollView } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';

interface EditTripModalProps {
    isOpen: boolean;
    onClose: () => void;
    trip: any;
}

export function EditTripModal({ isOpen, onClose, trip }: EditTripModalProps) {
    const queryClient = useQueryClient();

    // Initialize state with trip details
    // Note: trip structure might differ slightly (snake_case vs camelCase), checking usage in TripDetailsScreen it seems to be snake_case from DB
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
            <DialogContent className="w-[90%] max-w-lg">
                <DialogHeader>
                    <DialogTitle>Edit Trip Details</DialogTitle>
                </DialogHeader>

                <ScrollView className="space-y-4 py-4">
                    <View className="space-y-2 mb-4">
                        <Label>Price per Seat (₹)</Label>
                        <Input
                            keyboardType="numeric"
                            value={price}
                            onChangeText={setPrice}
                            placeholder="Price"
                        />
                    </View>

                    <View className="space-y-2 mb-4">
                        <Label>Available Seats</Label>
                        <Input
                            keyboardType="numeric"
                            value={seats}
                            onChangeText={setSeats}
                            placeholder="Seats"
                        />
                    </View>

                    <View className="space-y-2">
                        <Label className="mb-2">Preferences</Label>

                        <View className="flex-row items-center space-x-2 mb-2 gap-2">
                            <Checkbox
                                checked={preferences.smoking}
                                onCheckedChange={(checked) =>
                                    setPreferences((prev: any) => ({ ...prev, smoking: checked }))
                                }
                            />
                            <Text>Smoking</Text>
                        </View>

                        <View className="flex-row items-center space-x-2 mb-2 gap-2">
                            <Checkbox
                                checked={preferences.pets}
                                onCheckedChange={(checked) =>
                                    setPreferences((prev: any) => ({ ...prev, pets: checked }))
                                }
                            />
                            <Text>Pets</Text>
                        </View>

                        <View className="flex-row items-center space-x-2 gap-2">
                            <Checkbox
                                checked={preferences.music}
                                onCheckedChange={(checked) =>
                                    setPreferences((prev: any) => ({ ...prev, music: checked }))
                                }
                            />
                            <Text>Music</Text>
                        </View>
                    </View>
                </ScrollView>

                <DialogFooter>
                    <View className="flex-row justify-end gap-2 mt-4">
                        <Button variant="outline" onPress={onClose} disabled={updateTripMutation.isPending}>
                            <Text>Cancel</Text>
                        </Button>
                        <Button onPress={handleSave} disabled={updateTripMutation.isPending}>
                            <Text className="text-white">{updateTripMutation.isPending ? 'Saving...' : 'Save Changes'}</Text>
                        </Button>
                    </View>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
