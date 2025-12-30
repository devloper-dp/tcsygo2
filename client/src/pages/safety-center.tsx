import { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Shield,
    Phone,
    Users,
    Lock,
    AlertTriangle,
    CheckCircle,
    ChevronRight,
    MapPin,
    AlertCircle,
    Bell
} from 'lucide-react';
import { SafetyCheckIn } from '@/components/SafetyCheckIn';
import { SafetyTips } from '@/components/SafetyTips';
import { DriverVerification } from '@/components/DriverVerification';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Navbar } from '@/components/Navbar';

export default function SafetyCenter() {
    const [, navigate] = useLocation();
    const { user } = useAuth();
    const [selectedCategory, setSelectedCategory] = useState<'all' | 'monitoring' | 'support' | 'tips'>('all');

    // Fetch active trip to show context-aware safety features
    const { data: activeTrip } = useQuery({
        queryKey: ['active-ride-request', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('trips')
                .select('*')
                .or(`passenger_id.eq.${user?.id},driver_id.eq.${user?.id}`)
                .eq('status', 'ongoing')
                .limit(1)
                .maybeSingle();

            if (error) throw error;
            return data;
        },
        enabled: !!user
    });

    const safetyFeatures = [
        {
            title: 'Trusted Contacts',
            description: 'Share your ride status automatically with family and friends.',
            icon: Users,
            action: () => navigate('/profile'),
            status: 'Setup Required'
        },
        {
            title: 'Emergency SOS',
            description: 'Quickly alert our safety team and local authorities in an emergency.',
            icon: AlertTriangle,
            action: () => { },
            critical: true
        },
        {
            title: 'Ride Check',
            description: 'We monitor your ride for unexpected stops or deviations.',
            icon: MapPin,
            status: 'Active'
        },
        {
            title: 'Driver Verification',
            description: 'Check driver photo and vehicle details before you board.',
            icon: CheckCircle,
            status: 'Standard'
        }
    ];

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <main className="container mx-auto px-6 py-8 md:py-12 max-w-4xl">
                <header className="mb-10 text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 border-2 border-primary/20">
                        <Shield className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-3xl font-display font-bold mb-2">Safety Center</h1>
                    <p className="text-muted-foreground">Your safety is our top priority. Access all safety tools here.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card className="md:col-span-2 shadow-sm border-primary/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Lock className="w-5 h-5 text-primary" />
                                Safety Monitoring
                            </CardTitle>
                            <CardDescription>Real-time protection features during your rides.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {activeTrip ? (
                                <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                                            <span className="font-semibold text-sm">Active Trip Monitored</span>
                                        </div>
                                        <Badge variant="secondary">Ride ID: {activeTrip.id.substring(0, 8)}</Badge>
                                    </div>
                                    <SafetyCheckIn tripId={activeTrip.id} isActive={true} className="shadow-none border-0 p-0" />
                                </div>
                            ) : (
                                <div className="p-6 text-center border-2 border-dashed rounded-xl grayscale opacity-60">
                                    <Shield className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                                    <p className="text-sm font-medium">No active trip monitoring</p>
                                    <p className="text-xs text-muted-foreground">Safety features will activate once you start a ride.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-destructive/10 bg-destructive/5">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-destructive">
                                <AlertCircle className="w-5 h-5" />
                                Emergency
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Button
                                variant="destructive"
                                className="w-full h-16 text-lg font-bold gap-2 animate-pulse"
                                onClick={() => window.open('tel:100')}
                            >
                                <Phone className="w-6 h-6" />
                                CALL 100
                            </Button>
                            <p className="text-xs text-center text-muted-foreground">
                                Only use in case of real emergency. Our team will be notified immediately.
                            </p>
                            <Button variant="outline" className="w-full border-destructive/20 hover:bg-destructive/5">
                                Notify Safety Team
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Bell className="w-5 h-5 text-primary" />
                        Safety Features & Settings
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {safetyFeatures.map((feature, idx) => (
                            <Card key={idx} className="hover:shadow-md transition-shadow cursor-pointer border-muted/60" onClick={feature.action}>
                                <CardContent className="p-5 flex items-start gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${feature.critical ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                                        <feature.icon className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className="font-semibold block truncate">{feature.title}</h4>
                                            {feature.status && (
                                                <Badge variant={feature.status === 'Active' ? 'default' : 'outline'} className={`text-[10px] h-5 ${feature.status === 'Active' ? 'bg-success text-success-foreground hover:bg-success/80' : ''}`}>
                                                    {feature.status}
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground line-clamp-2">{feature.description}</p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 self-center" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                <Separator className="my-10" />

                <div className="space-y-6">
                    <h2 className="text-xl font-bold">Safety Tips & Guidance</h2>
                    <SafetyTips />
                </div>

                <Card className="mt-10 bg-primary text-primary-foreground">
                    <CardContent className="p-8 text-center sm:text-left flex flex-col sm:flex-row items-center gap-6">
                        <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center">
                            <Shield className="w-10 h-10" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xl font-bold mb-2">Ride Insurance Covered</h3>
                            <p className="text-primary-foreground/80 text-sm"> Every trip on TCSYGO is insured. We provide coverage for accidents and medical emergencies during your journey.</p>
                        </div>
                        <Button variant="secondary" size="lg" className="shrink-0">
                            Learn More
                        </Button>
                    </CardContent>
                </Card>
            </main>

            <footer className="mt-20 border-t py-12 bg-muted/30">
                <div className="container mx-auto px-6 text-center">
                    <p className="text-sm text-muted-foreground mb-4">
                        TCSYGO Safety Team is available 24/7 to assist you.
                    </p>
                    <div className="flex justify-center gap-6">
                        <a href="#" className="text-primary text-sm hover:underline">Safety Policy</a>
                        <a href="#" className="text-primary text-sm hover:underline">Terms of Service</a>
                        <a href="#" className="text-primary text-sm hover:underline">Privacy Policy</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
