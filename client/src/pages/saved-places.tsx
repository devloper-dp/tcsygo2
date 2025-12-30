import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Navbar } from '@/components/Navbar';
import { LocationAutocomplete } from '@/components/LocationAutocomplete';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';
import { MapPin, Home, Briefcase, Star, Plus, Trash2, Edit2 } from 'lucide-react';
import { Coordinates } from '@/lib/maps';

interface SavedPlace {
    id: string;
    userId: string;
    label: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    icon: string;
    createdAt: string;
}

export default function SavedPlaces() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [editingPlace, setEditingPlace] = useState<SavedPlace | null>(null);

    const [formData, setFormData] = useState({
        label: 'Home',
        name: '',
        address: '',
        coords: null as Coordinates | null,
    });

    // Fetch saved places
    const { data: places, isLoading } = useQuery<SavedPlace[]>({
        queryKey: ['saved-places', user?.id],
        queryFn: async () => {
            if (!user) return [];

            const { data, error } = await supabase
                .from('saved_places')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return data.map(p => ({
                id: p.id,
                userId: p.user_id,
                label: p.label,
                name: p.name,
                address: p.address,
                lat: parseFloat(p.lat),
                lng: parseFloat(p.lng),
                icon: p.icon || 'MapPin',
                createdAt: p.created_at
            }));
        },
        enabled: !!user,
    });

    // Add/Update place mutation
    const savePlaceMutation = useMutation({
        mutationFn: async (place: Partial<SavedPlace>) => {
            if (!user || !formData.coords) throw new Error('Missing data');

            const placeData = {
                user_id: user.id,
                label: formData.label,
                name: formData.name,
                address: formData.address,
                lat: formData.coords.lat,
                lng: formData.coords.lng,
                icon: getIconForLabel(formData.label),
            };

            if (editingPlace) {
                const { data, error } = await supabase
                    .from('saved_places')
                    .update(placeData)
                    .eq('id', editingPlace.id)
                    .select()
                    .single();

                if (error) throw error;
                return data;
            } else {
                const { data, error } = await supabase
                    .from('saved_places')
                    .insert(placeData)
                    .select()
                    .single();

                if (error) throw error;
                return data;
            }
        },
        onSuccess: () => {
            toast({
                title: editingPlace ? 'Place updated' : 'Place saved',
                description: `${formData.name} has been ${editingPlace ? 'updated' : 'added'} to your saved places`,
            });
            queryClient.invalidateQueries({ queryKey: ['saved-places'] });
            resetForm();
        },
        onError: (error: any) => {
            toast({
                title: 'Failed to save place',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    // Delete place mutation
    const deletePlaceMutation = useMutation({
        mutationFn: async (placeId: string) => {
            const { error } = await supabase
                .from('saved_places')
                .delete()
                .eq('id', placeId);

            if (error) throw error;
        },
        onSuccess: () => {
            toast({
                title: 'Place deleted',
                description: 'Saved place has been removed',
            });
            queryClient.invalidateQueries({ queryKey: ['saved-places'] });
        },
        onError: (error: any) => {
            toast({
                title: 'Failed to delete place',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    const getIconForLabel = (label: string) => {
        const icons: Record<string, string> = {
            'Home': 'Home',
            'Work': 'Briefcase',
            'Favorite': 'Star',
            'Custom': 'MapPin',
        };
        return icons[label] || 'MapPin';
    };

    const getIconComponent = (iconName: string) => {
        const icons: Record<string, any> = {
            'Home': Home,
            'Briefcase': Briefcase,
            'Star': Star,
            'MapPin': MapPin,
        };
        const Icon = icons[iconName] || MapPin;
        return <Icon className="w-5 h-5" />;
    };

    const resetForm = () => {
        setFormData({
            label: 'Home',
            name: '',
            address: '',
            coords: null,
        });
        setEditingPlace(null);
        setShowAddDialog(false);
    };

    const handleEdit = (place: SavedPlace) => {
        setEditingPlace(place);
        setFormData({
            label: place.label,
            name: place.name,
            address: place.address,
            coords: { lat: place.lat, lng: place.lng },
        });
        setShowAddDialog(true);
    };

    const handleSave = () => {
        if (!formData.name || !formData.address || !formData.coords) {
            toast({
                title: 'Missing information',
                description: 'Please fill in all fields',
                variant: 'destructive',
            });
            return;
        }

        savePlaceMutation.mutate({});
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading saved places...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <div className="container mx-auto px-6 py-8 max-w-4xl">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold">Saved Places</h1>
                        <p className="text-muted-foreground mt-1">Quick access to your favorite locations</p>
                    </div>
                    <Button onClick={() => setShowAddDialog(true)} className="gap-2">
                        <Plus className="w-4 h-4" />
                        Add Place
                    </Button>
                </div>

                {places && places.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {places.map(place => (
                            <Card key={place.id} className="p-6 hover-elevate">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${place.label === 'Home' ? 'bg-primary/10 text-primary' :
                                                place.label === 'Work' ? 'bg-warning/10 text-warning' :
                                                    place.label === 'Favorite' ? 'bg-success/10 text-success' :
                                                        'bg-muted text-muted-foreground'
                                            }`}>
                                            {getIconComponent(place.icon)}
                                        </div>
                                        <div>
                                            <div className="text-xs text-muted-foreground uppercase tracking-wide">{place.label}</div>
                                            <h3 className="font-semibold text-lg">{place.name}</h3>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2 mb-4">
                                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                    <p className="text-sm text-muted-foreground">{place.address}</p>
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => handleEdit(place)}
                                    >
                                        <Edit2 className="w-3 h-3 mr-1" />
                                        Edit
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                        onClick={() => deletePlaceMutation.mutate(place.id)}
                                        disabled={deletePlaceMutation.isPending}
                                    >
                                        <Trash2 className="w-3 h-3 mr-1" />
                                        Delete
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card className="p-12 text-center">
                        <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-xl font-semibold mb-2">No saved places yet</h3>
                        <p className="text-muted-foreground mb-6">
                            Save your frequently visited locations for quick booking
                        </p>
                        <Button onClick={() => setShowAddDialog(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Your First Place
                        </Button>
                    </Card>
                )}
            </div>

            {/* Add/Edit Place Dialog */}
            <Dialog open={showAddDialog} onOpenChange={(open) => !open && resetForm()}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingPlace ? 'Edit Place' : 'Add New Place'}</DialogTitle>
                        <DialogDescription>
                            Save a location for quick access when booking rides
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div>
                            <Label htmlFor="label">Label</Label>
                            <Select value={formData.label} onValueChange={(value) => setFormData({ ...formData, label: value })}>
                                <SelectTrigger className="mt-2">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Home">
                                        <div className="flex items-center gap-2">
                                            <Home className="w-4 h-4" />
                                            Home
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="Work">
                                        <div className="flex items-center gap-2">
                                            <Briefcase className="w-4 h-4" />
                                            Work
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="Favorite">
                                        <div className="flex items-center gap-2">
                                            <Star className="w-4 h-4" />
                                            Favorite
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="Custom">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4" />
                                            Custom
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="name">Place Name</Label>
                            <Input
                                id="name"
                                placeholder="e.g., My Home, Office, Gym"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="mt-2"
                            />
                        </div>

                        <div>
                            <Label htmlFor="address">Address</Label>
                            <LocationAutocomplete
                                value={formData.address}
                                onChange={(val, coords) => {
                                    setFormData({ ...formData, address: val, coords: coords || null });
                                }}
                                placeholder="Search for location"
                                className="mt-2"
                            />
                        </div>

                        <Button
                            className="w-full"
                            size="lg"
                            onClick={handleSave}
                            disabled={savePlaceMutation.isPending}
                        >
                            {savePlaceMutation.isPending ? 'Saving...' : editingPlace ? 'Update Place' : 'Save Place'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
