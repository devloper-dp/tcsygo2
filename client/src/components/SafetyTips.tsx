import { Card } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Shield, Eye, Phone, MapPin, UserCheck, AlertCircle } from 'lucide-react';

const safetyTips = [
    {
        icon: Eye,
        title: 'Verify Driver Details',
        description: 'Always check the driver\'s photo, name, and vehicle number before getting in.',
        color: 'text-primary',
    },
    {
        icon: Phone,
        title: 'Share Trip Details',
        description: 'Share your live location and trip details with friends or family.',
        color: 'text-success',
    },
    {
        icon: MapPin,
        title: 'Track Your Route',
        description: 'Keep an eye on the route and ensure the driver is following the correct path.',
        color: 'text-warning',
    },
    {
        icon: UserCheck,
        title: 'Sit in the Back Seat',
        description: 'For safety, always sit in the back seat during solo rides.',
        color: 'text-primary',
    },
    {
        icon: AlertCircle,
        title: 'Trust Your Instincts',
        description: 'If something feels wrong, don\'t hesitate to use the SOS button or call emergency services.',
        color: 'text-destructive',
    },
    {
        icon: Shield,
        title: 'Emergency Contacts',
        description: 'Keep emergency contacts updated in your profile for quick access.',
        color: 'text-primary',
    },
];

interface SafetyTipsProps {
    className?: string;
}

export function SafetyTips({ className = '' }: SafetyTipsProps) {
    return (
        <Card className={`p-6 ${className}`}>
            <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-lg">Safety Tips</h3>
            </div>

            <Carousel className="w-full">
                <CarouselContent>
                    {safetyTips.map((tip, index) => {
                        const Icon = tip.icon;
                        return (
                            <CarouselItem key={index}>
                                <Card className="p-6 bg-card/50">
                                    <div className="flex flex-col items-center text-center space-y-4">
                                        <div className={`w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center ${tip.color}`}>
                                            <Icon className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-lg mb-2">{tip.title}</h4>
                                            <p className="text-sm text-muted-foreground">{tip.description}</p>
                                        </div>
                                    </div>
                                </Card>
                            </CarouselItem>
                        );
                    })}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
            </Carousel>

            <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-xs text-center text-muted-foreground">
                    <Shield className="w-3 h-3 inline mr-1" />
                    Your safety is our priority. For emergencies, call <strong>100</strong> or use the SOS button.
                </p>
            </div>
        </Card>
    );
}
