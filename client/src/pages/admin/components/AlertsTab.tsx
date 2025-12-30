
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabase';
import { EmergencyAlert } from '@shared/schema';
import { mapEmergencyAlert } from '@/lib/mapper';
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
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, MapPin, Shield } from 'lucide-react';

export function AlertsTab() {
    const [, navigate] = useLocation();

    const { data: allAlerts } = useQuery<EmergencyAlert[]>({
        queryKey: ['admin-emergency-alerts'],
        queryFn: async (): Promise<EmergencyAlert[]> => {
            const { data, error } = await supabase
                .from('emergency_alerts')
                .select('*, user:users(*)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return (data || []).map(mapEmergencyAlert);
        }
    });

    return (
        <Card>
            <div className="p-6 border-b flex items-center justify-between">
                <h2 className="text-lg font-semibold text-destructive flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Emergency Alerts
                </h2>
            </div>
            <div className="p-6">
                {allAlerts && allAlerts.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Time</TableHead>
                                <TableHead>Reporter</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead>Trip ID</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {allAlerts.map((alert: EmergencyAlert) => (
                                <TableRow key={alert.id} className="bg-destructive/5">
                                    <TableCell>{new Date(alert.createdAt).toLocaleString()}</TableCell>
                                    <TableCell>
                                        <div className="font-medium">{alert.user?.fullName || 'Unknown'}</div>
                                        <div className="text-xs text-muted-foreground">{alert.user?.phone || '-'}</div>
                                    </TableCell>
                                    <TableCell>
                                        <a
                                            href={`https://www.google.com/maps?q=${alert.lat},${alert.lng}`}
                                            target="_blank"
                                            className="text-primary hover:underline flex items-center gap-1"
                                        >
                                            <MapPin className="w-3 h-3" />
                                            Map
                                        </a>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">{alert.tripId.slice(0, 8)}...</TableCell>
                                    <TableCell>
                                        <Badge variant={alert.status === 'triggered' ? 'destructive' : 'outline'}>
                                            {alert.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button size="sm" variant="outline" onClick={() => navigate(`/track/${alert.tripId}`)}>
                                            Track Trip
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="text-center py-12">
                        <Shield className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                        <p className="text-muted-foreground">No active SOS alerts</p>
                    </div>
                )}
            </div>
        </Card>
    );
}
