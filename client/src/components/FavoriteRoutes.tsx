import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LocationAutocomplete } from '@/components/LocationAutocomplete';
import { Star, MapPin, Navigation, Plus, Trash2, Edit } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Coordinates } from '@/lib/maps';

interface FavoriteRoute {
    id: string;
    name: string;
    pickup_location: string;
    pickup_lat: number;
    pickup_lng: number;
    drop_location: string;
    drop_lat: number;
    drop_lng: number;
}

export function FavoriteRoutes() {
    const [, navigate] = useLocation();
    const { user } = useAuth();
    const { toast } = useToast();
    const [routes, setRoutes] = useState<FavoriteRoute[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [editingRoute, setEditingRoute] = useState<FavoriteRoute | null>(null);

    // Form state
    const [routeName, setRouteName] = useState('');
    const [pickup, setPickup] = useState('');
    const [pickupCoords, setPickupCoords] = useState<Coordinates | null>(null);
    const [drop, setDrop] = useState('');
    const [dropCoords, setDropCoords] = useState<Coordinates | null>(null);

    useEffect(() => {
        if (user) {
            fetchFavoriteRoutes();
        }
    }, [user]);

    const fetchFavoriteRoutes = async () => {
        if (!user) return;

        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('favorite_routes')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRoutes(data || []);
        } catch (error) {
            console.error('Error fetching favorite routes:', error);
            toast({
                title: 'Error',
                description: 'Failed to load favorite routes',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveRoute = async () => {
        if (!user || !routeName || !pickup || !drop || !pickupCoords || !dropCoords) {
            toast({
                title: 'Missing information',
                description: 'Please fill in all fields',
                variant: 'destructive',
            });
            return;
        }

        try {
            if (editingRoute) {
                // Update existing route
                const { error } = await supabase
                    .from('favorite_routes')
                    .update({
                        name: routeName,
                        pickup_location: pickup,
                        pickup_lat: pickupCoords.lat,
                        pickup_lng: pickupCoords.lng,
                        drop_location: drop,
                        drop_lat: dropCoords.lat,
                        drop_lng: dropCoords.lng,
                    })
                    .eq('id', editingRoute.id);

                if (error) throw error;

                toast({
                    title: 'Success',
                    description: 'Favorite route updated',
                });
            } else {
                // Create new route
                const { error } = await supabase
                    .from('favorite_routes')
                    .insert({
                        user_id: user.id,
                        name: routeName,
                        pickup_location: pickup,
                        pickup_lat: pickupCoords.lat,
                        pickup_lng: pickupCoords.lng,
                        drop_location: drop,
                        drop_lat: dropCoords.lat,
                        drop_lng: dropCoords.lng,
                    });

                if (error) throw error;

                toast({
                    title: 'Success',
                    description: 'Favorite route added',
                });
            }

            // Reset form and close dialog
            resetForm();
            setShowAddDialog(false);
            fetchFavoriteRoutes();
        } catch (error) {
            console.error('Error saving favorite route:', error);
            toast({
                title: 'Error',
                description: 'Failed to save favorite route',
                variant: 'destructive',
            });
        }
    };

    const handleDeleteRoute = async (routeId: string) => {
        try {
            const { error } = await supabase
                .from('favorite_routes')
                .delete()
                .eq('id', routeId);

            if (error) throw error;

            toast({
                title: 'Success',
                description: 'Favorite route deleted',
            });

            fetchFavoriteRoutes();
        } catch (error) {
            console.error('Error deleting favorite route:', error);
            toast({
                title: 'Error',
                description: 'Failed to delete favorite route',
                variant: 'destructive',
            });
        }
    };

    const handleEditRoute = (route: FavoriteRoute) => {
        setEditingRoute(route);
        setRouteName(route.name);
        setPickup(route.pickup_location);
        setPickupCoords({ lat: route.pickup_lat, lng: route.pickup_lng });
        setDrop(route.drop_location);
        setDropCoords({ lat: route.drop_lat, lng: route.drop_lng });
        setShowAddDialog(true);
    };

    const handleBookRoute = (route: FavoriteRoute) => {
        const params = new URLSearchParams({
            pickup: route.pickup_location,
            drop: route.drop_location,
            pickupLat: route.pickup_lat.toString(),
            pickupLng: route.pickup_lng.toString(),
            dropLat: route.drop_lat.toString(),
            dropLng: route.drop_lng.toString(),
        });

        navigate(`/search?${params.toString()}`);
    };

    const resetForm = () => {
        setRouteName('');
        setPickup('');
        setPickupCoords(null);
        setDrop('');
        setDropCoords(null);
        setEditingRoute(null);
    };

    if (!user || loading) {
        return null;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Star className="w-6 h-6 text-warning fill-warning" />
                    Favorite Routes
                </h2>
                <Dialog open={showAddDialog} onOpenChange={(open) => {
                    setShowAddDialog(open);
                    if (!open) resetForm();
                }}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="gap-2">
                            <Plus className="w-4 h-4" />
                            Add Route
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>
                                {editingRoute ? 'Edit Favorite Route' : 'Add Favorite Route'}
                            </DialogTitle>
                            <DialogDescription>
                                Save your frequently used routes for quick booking.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div>
                                <Label htmlFor="route-name">Route Name</Label>
                                <Input
                                    id="route-name"
                                    placeholder="e.g., Home to Office"
                                    value={routeName}
                                    onChange={(e) => setRouteName(e.target.value)}
                                />
                            </div>
                            <div>
                                <Label>Pickup Location</Label>
                                <LocationAutocomplete
                                    value={pickup}
                                    onChange={(val, coords) => {
                                        setPickup(val);
                                        setPickupCoords(coords || null);
                                    }}
                                    placeholder="Enter pickup location"
                                />
                            </div>
                            <div>
                                <Label>Drop Location</Label>
                                <LocationAutocomplete
                                    value={drop}
                                    onChange={(val, coords) => {
                                        setDrop(val);
                                        setDropCoords(coords || null);
                                    }}
                                    placeholder="Enter drop location"
                                />
                            </div>
                            <Button onClick={handleSaveRoute} className="w-full">
                                {editingRoute ? 'Update Route' : 'Save Route'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {routes.length === 0 ? (
                <Card className="p-8 text-center">
                    <Star className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">No favorite routes yet</p>
                    <Button onClick={() => setShowAddDialog(true)} variant="outline">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Your First Route
                    </Button>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {routes.map((route) => (
                        <Card
                            key={route.id}
                            className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => handleBookRoute(route)}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <Star className="w-4 h-4 text-warning fill-warning" />
                                    {route.name}
                                </h3>
                                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => handleEditRoute(route)}
                                    >
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive"
                                        onClick={() => handleDeleteRoute(route.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-2 text-sm text-muted-foreground">
                                <div className="flex items-start gap-2">
                                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-success" />
                                    <span className="truncate">{route.pickup_location}</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <Navigation className="w-4 h-4 mt-0.5 flex-shrink-0 text-destructive" />
                                    <span className="truncate">{route.drop_location}</span>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
