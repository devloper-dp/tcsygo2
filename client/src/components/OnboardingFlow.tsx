import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MapPin, Zap, Shield, Bell, Check, Wallet } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface OnboardingFlowProps {
    isOpen: boolean;
    onComplete: () => void;
}

const onboardingSteps = [
    {
        title: 'Welcome to TCSYGO!',
        description: 'Your trusted ride-sharing platform in Indore',
        icon: Zap,
        content: 'Share rides, save money, and reduce your carbon footprint. Join thousands of travelers making smarter commute choices every day.',
    },
    {
        title: 'Quick & Easy Booking',
        description: 'Book rides in seconds',
        icon: MapPin,
        content: 'Use Quick Book for instant rides or search for scheduled trips. Choose from bikes, autos, or cars based on your preference.',
    },
    {
        title: 'Safe & Secure',
        description: 'Your safety is our priority',
        icon: Shield,
        content: 'All drivers are verified. Track your ride in real-time, share trip details with family, and use SOS in emergencies.',
    },
    {
        title: 'Seamless Payments',
        description: 'Wallet & Auto-pay',
        icon: Wallet,
        content: 'Enjoy hassle-free payments with our integrated wallet. Enable Auto-pay to automatically settle fares after your ride completes.',
    },
    {
        title: 'Stay Updated',
        description: 'Never miss important updates',
        icon: Bell,
        content: 'Get notifications for booking confirmations, driver arrivals, and exclusive offers. Enable notifications for the best experience.',
    },
];

export function OnboardingFlow({ isOpen, onComplete }: OnboardingFlowProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [notificationsGranted, setNotificationsGranted] = useState(false);
    const { user } = useAuth();

    const currentStepData = onboardingSteps[currentStep];
    const Icon = currentStepData.icon;
    const isLastStep = currentStep === onboardingSteps.length - 1;

    const handleNext = () => {
        if (isLastStep) {
            // Save onboarding completion to localStorage
            localStorage.setItem('tcsygo-onboarding-complete', 'true');
            onComplete();
        } else {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleSkip = () => {
        localStorage.setItem('tcsygo-onboarding-complete', 'true');
        onComplete();
    };

    const requestNotificationPermission = async () => {
        if ('Notification' in window) {
            try {
                const permission = await Notification.requestPermission();
                setNotificationsGranted(permission === 'granted');
                if (permission === 'granted') {
                    // Show a test notification
                    new Notification('TCSYGO Notifications Enabled!', {
                        body: 'You\'ll now receive updates about your rides',
                        icon: '/logo.png',
                    });
                }
            } catch (error) {
                console.error('Error requesting notification permission:', error);
            }
        }
    };

    useEffect(() => {
        if (isLastStep && 'Notification' in window) {
            setNotificationsGranted(Notification.permission === 'granted');
        }
    }, [currentStep, isLastStep]);

    return (
        <Dialog open={isOpen} onOpenChange={() => { }}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="sr-only">Welcome to TCSYGO</DialogTitle>
                    <DialogDescription className="sr-only">
                        Complete the onboarding steps to get started with the application.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-6">
                    {/* Progress Indicator */}
                    <div className="flex justify-center gap-2 mb-8">
                        {onboardingSteps.map((_, index) => (
                            <div
                                key={index}
                                className={`h-2 rounded-full transition-all ${index === currentStep
                                    ? 'w-8 bg-primary'
                                    : index < currentStep
                                        ? 'w-2 bg-primary/50'
                                        : 'w-2 bg-muted'
                                    }`}
                            />
                        ))}
                    </div>

                    {/* Icon */}
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                        <Icon className="w-10 h-10 text-primary" />
                    </div>

                    {/* Content */}
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold mb-2">{currentStepData.title}</h2>
                        <p className="text-sm text-muted-foreground mb-4">{currentStepData.description}</p>
                        <p className="text-muted-foreground">{currentStepData.content}</p>
                    </div>

                    {/* Notification Permission (Last Step) */}
                    {isLastStep && (
                        <Card className="p-4 mb-6 bg-primary/5 border-primary/20">
                            <div className="flex items-start gap-3">
                                <Bell className="w-5 h-5 text-primary mt-0.5" />
                                <div className="flex-1">
                                    <h4 className="font-medium mb-1">Enable Notifications</h4>
                                    <p className="text-sm text-muted-foreground mb-3">
                                        Get real-time updates about your bookings and rides
                                    </p>
                                    {notificationsGranted ? (
                                        <div className="flex items-center gap-2 text-success">
                                            <Check className="w-4 h-4" />
                                            <span className="text-sm font-medium">Notifications Enabled</span>
                                        </div>
                                    ) : (
                                        <Button
                                            size="sm"
                                            onClick={requestNotificationPermission}
                                            className="w-full"
                                        >
                                            Enable Notifications
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                        {!isLastStep && (
                            <Button
                                variant="ghost"
                                onClick={handleSkip}
                                className="flex-1"
                            >
                                Skip
                            </Button>
                        )}
                        <Button
                            onClick={handleNext}
                            className="flex-1"
                        >
                            {isLastStep ? 'Get Started' : 'Next'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Hook to check if onboarding should be shown
export function useOnboarding() {
    const [showOnboarding, setShowOnboarding] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
        if (user) {
            const completed = localStorage.getItem('tcsygo-onboarding-complete');
            if (!completed) {
                // Show onboarding after a short delay
                setTimeout(() => setShowOnboarding(true), 1000);
            }
        }
    }, [user]);

    return {
        showOnboarding,
        setShowOnboarding,
    };
}
