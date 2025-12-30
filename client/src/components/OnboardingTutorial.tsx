import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, ArrowRight, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface OnboardingTutorialProps {
    open: boolean;
    onComplete: () => void;
}

const ONBOARDING_STEPS = [
    {
        title: 'Welcome to TCSYGO! 🚗',
        description: 'Your trusted ride-sharing platform for Indore',
        content: 'Book rides instantly or schedule them for later. Choose from bikes, autos, or cars based on your needs.',
        icon: '🚗',
    },
    {
        title: 'Quick Book Feature ⚡',
        description: 'Get a ride in seconds',
        content: 'Use the Quick Book button on the home page to instantly find nearby drivers. Just enter your destination and we\'ll match you with the nearest available driver.',
        icon: '⚡',
    },
    {
        title: 'Safety First 🛡️',
        description: 'Your safety is our priority',
        content: 'Add emergency contacts, share your ride status with loved ones, and use safety check-ins during your trip. We\'re here to keep you safe.',
        icon: '🛡️',
    },
    {
        title: 'Wallet & Payments 💰',
        description: 'Seamless payment experience',
        content: 'Add money to your wallet for quick payments. Use UPI, cards, or cash. Enable auto-pay for hassle-free rides.',
        icon: '💰',
    },
    {
        title: 'Ride Preferences 🎵',
        description: 'Customize your ride experience',
        content: 'Set your preferences for AC, music, pets, and luggage. Save your favorite places for quick booking.',
        icon: '🎵',
    },
];

export function OnboardingTutorial({ open, onComplete }: OnboardingTutorialProps) {
    const { user } = useAuth();
    const [currentStep, setCurrentStep] = useState(0);

    const handleNext = () => {
        if (currentStep < ONBOARDING_STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleComplete();
        }
    };

    const handleSkip = () => {
        handleComplete();
    };

    const handleComplete = async () => {
        // Mark onboarding as complete in user preferences
        if (user) {
            try {
                await supabase
                    .from('users')
                    .update({ onboarding_completed: true })
                    .eq('id', user.id);
            } catch (error) {
                console.error('Failed to update onboarding status:', error);
            }
        }
        onComplete();
    };

    const step = ONBOARDING_STEPS[currentStep];
    const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;

    return (
        <Dialog open={open} onOpenChange={() => { }}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-2xl">{step.icon}</DialogTitle>
                        <DialogDescription className="sr-only">
                            Step {currentStep + 1}: {step.title}
                        </DialogDescription>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleSkip}
                            className="h-8 w-8"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Progress Bar */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>Step {currentStep + 1} of {ONBOARDING_STEPS.length}</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                    </div>

                    {/* Step Content */}
                    <div className="text-center space-y-4 py-6">
                        <div className="text-6xl mb-4">{step.icon}</div>
                        <h3 className="text-2xl font-bold">{step.title}</h3>
                        <p className="text-lg text-muted-foreground">{step.description}</p>
                        <p className="text-sm text-muted-foreground leading-relaxed px-4">
                            {step.content}
                        </p>
                    </div>

                    {/* Step Indicators */}
                    <div className="flex items-center justify-center gap-2">
                        {ONBOARDING_STEPS.map((_, index) => (
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

                    {/* Navigation Buttons */}
                    <div className="flex items-center gap-3 pt-4">
                        {currentStep > 0 && (
                            <Button
                                variant="outline"
                                onClick={() => setCurrentStep(currentStep - 1)}
                                className="flex-1"
                            >
                                Back
                            </Button>
                        )}
                        <Button
                            onClick={handleNext}
                            className="flex-1"
                            size="lg"
                        >
                            {currentStep === ONBOARDING_STEPS.length - 1 ? (
                                <>
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Get Started
                                </>
                            ) : (
                                <>
                                    Next
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Skip Button */}
                    {currentStep < ONBOARDING_STEPS.length - 1 && (
                        <div className="text-center">
                            <Button
                                variant="ghost"
                                onClick={handleSkip}
                                className="text-muted-foreground"
                            >
                                Skip Tutorial
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
