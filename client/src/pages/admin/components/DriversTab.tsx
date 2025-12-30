
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Driver, User } from '@shared/schema';
import { mapDriver, mapUser } from '@/lib/mapper';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, X, Car, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function DriversTab() {
    const queryClient = useQueryClient();

    const { data: pendingDrivers } = useQuery<(Driver & { user: User })[]>({
        queryKey: ['admin-drivers-pending'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('drivers')
                .select('*, user:users(*)')
                .eq('verification_status', 'pending');

            if (error) throw error;
            return (data || []).map((d: any) => ({
                ...mapDriver(d),
                user: d.user ? mapUser(d.user) : null
            })) as (Driver & { user: User })[];
        }
    });

    const { data: allDrivers } = useQuery<(Driver & { user: User })[]>({
        queryKey: ['admin-drivers-all'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('drivers')
                .select('*, user:users(*)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return (data || []).map((d: any) => ({
                ...mapDriver(d),
                user: d.user ? mapUser(d.user) : null
            })) as (Driver & { user: User })[];
        }
    });

    const verifyDriverMutation = useMutation({
        mutationFn: async ({ driverId, status }: { driverId: string; status: 'verified' | 'rejected' }) => {
            const { error } = await supabase
                .from('drivers')
                .update({ verification_status: status })
                .eq('id', driverId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-drivers-pending'] });
            queryClient.invalidateQueries({ queryKey: ['admin-drivers-all'] });
            queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
        }
    });

    return (
        <Card className="p-6">
            <Tabs defaultValue="pending">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-primary" />
                        Driver Management
                    </h2>
                    <TabsList>
                        <TabsTrigger value="pending">Pending Verifications</TabsTrigger>
                        <TabsTrigger value="all">All Drivers</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="pending">
                    {pendingDrivers && pendingDrivers.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Driver</TableHead>
                                    <TableHead>License</TableHead>
                                    <TableHead>Vehicle</TableHead>
                                    <TableHead>Applied</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pendingDrivers.map((driver) => (
                                    <TableRow key={driver.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="w-10 h-10">
                                                    <AvatarImage src={driver.user?.profilePhoto || undefined} />
                                                    <AvatarFallback>{driver.user?.fullName?.charAt(0) || 'D'}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="font-medium">{driver.user?.fullName || 'Unknown Driver'}</div>
                                                    <div className="text-sm text-muted-foreground">{driver.user?.email || 'No email'}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{driver.licenseNumber}</TableCell>
                                        <TableCell>
                                            {driver.vehicleMake} {driver.vehicleModel} ({driver.vehicleYear})
                                        </TableCell>
                                        <TableCell>{new Date(driver.createdAt).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="gap-1"
                                                    onClick={() => verifyDriverMutation.mutate({ driverId: driver.id, status: 'verified' })}
                                                    disabled={verifyDriverMutation.isPending}
                                                >
                                                    <Check className="w-3 h-3" />
                                                    Approve
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="gap-1 text-destructive"
                                                    onClick={() => verifyDriverMutation.mutate({ driverId: driver.id, status: 'rejected' })}
                                                    disabled={verifyDriverMutation.isPending}
                                                >
                                                    <X className="w-3 h-3" />
                                                    Reject
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-12">
                            <Car className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">No pending verifications</p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="all">
                    {allDrivers && allDrivers.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Driver</TableHead>
                                    <TableHead>Rating</TableHead>
                                    <TableHead>Trips</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Joined</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {allDrivers.map((driver) => (
                                    <TableRow key={driver.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="w-10 h-10">
                                                    <AvatarImage src={driver.user?.profilePhoto || undefined} />
                                                    <AvatarFallback>{driver.user?.fullName?.charAt(0) || 'D'}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="font-medium">{driver.user?.fullName || 'Unknown Driver'}</div>
                                                    <div className="text-sm text-muted-foreground">{driver.user?.email || 'No email'}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{driver.rating} ★</TableCell>
                                        <TableCell>{driver.totalTrips}</TableCell>
                                        <TableCell>
                                            <Badge variant={driver.verificationStatus === 'verified' ? 'default' : 'secondary'}>
                                                {driver.verificationStatus}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{new Date(driver.createdAt).toLocaleDateString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-12">
                            <Car className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">No drivers found</p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </Card>
    );
}
