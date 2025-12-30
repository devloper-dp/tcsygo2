import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import { TripWithDriver } from '@shared/schema';

interface EditTripModalProps {
    isOpen: boolean;
    onClose: () => void;
    trip: TripWithDriver;
}

export function EditTripModal({ isOpen, onClose, trip }: EditTripModalProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Initialize state with trip details
    const [price, setPrice] = useState(trip.pricePerSeat.toString());
    const [seats, setSeats] = useState(trip.availableSeats.toString());
    const [departureTime, setDepartureTime] = useState(
        new Date(trip.departureTime).toISOString().slice(0, 16)
    );
    // Preferences
    const [preferences, setPreferences] = useState(trip.preferences || {
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
                    departure_time: new Date(departureTime).toISOString(),
                    preferences: preferences,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', trip.id);

            if (error) throw error;
        },
        onSuccess: () => {
            toast({
                title: 'Trip Updated',
                description: 'Your trip details have been updated successfully.',
            });
            queryClient.invalidateQueries({ queryKey: ['trip', trip.id] });
            onClose();
        },
        onError: (error: any) => {
            toast({
                title: 'Update Failed',
                description: error.message || 'Failed to update trip.',
                variant: 'destructive',
            });
        },
    });

    const handleSave = () => {
        if (!price || !seats || !departureTime) {
            toast({ title: 'Please fill all fields', variant: 'destructive' });
            return;
        }
        updateTripMutation.mutate();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Trip Details</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="price">Price per Seat (₹)</Label>
                            <Input
                                id="price"
                                type="number"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="seats">Available Seats</Label>
                            <Input
                                id="seats"
                                type="number"
                                min="1"
                                max="6"
                                value={seats}
                                onChange={(e) => setSeats(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="time">Departure Time</Label>
                        <Input
                            id="time"
                            type="datetime-local"
                            value={departureTime}
                            onChange={(e) => setDepartureTime(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Preferences</Label>
                        <div className="flex gap-4">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="smoking"
                                    checked={preferences.smoking}
                                    onCheckedChange={(checked) =>
                                        setPreferences((prev: any) => ({ ...prev, smoking: checked }))
                                    }
                                />
                                <label htmlFor="smoking" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Smoking
                                </label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="pets"
                                    checked={preferences.pets}
                                    onCheckedChange={(checked) =>
                                        setPreferences((prev: any) => ({ ...prev, pets: checked }))
                                    }
                                />
                                <label htmlFor="pets" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Pets
                                </label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="music"
                                    checked={preferences.music}
                                    onCheckedChange={(checked) =>
                                        setPreferences((prev: any) => ({ ...prev, music: checked }))
                                    }
                                />
                                <label htmlFor="music" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Music
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={updateTripMutation.isPending}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={updateTripMutation.isPending}>
                        {updateTripMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
