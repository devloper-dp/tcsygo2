import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
    Navigation,
    CornerUpRight,
    CornerUpLeft,
    ArrowUp,
    MapPin,
    Flag,
    Volume2,
    VolumeX,
} from 'lucide-react';
import { formatDistance } from '@/lib/geofence';
import { useTranslation } from 'react-i18next';

interface NavigationStep {
    instruction: string;
    distance: number; // in meters
    type: 'straight' | 'left' | 'right' | 'destination';
}

interface TurnByTurnNavigationProps {
    steps: NavigationStep[];
    currentStepIndex?: number;
    totalDistance: number;
    remainingDistance: number;
    className?: string;
    enableVoice?: boolean;
}

export function TurnByTurnNavigation({
    steps,
    currentStepIndex = 0,
    totalDistance,
    remainingDistance,
    className = '',
    enableVoice = true,
}: TurnByTurnNavigationProps) {
    const { i18n } = useTranslation();
    const [voiceEnabled, setVoiceEnabled] = useState(enableVoice);
    const [lastAnnouncedStep, setLastAnnouncedStep] = useState(-1);
    const [voiceSupported, setVoiceSupported] = useState(false);

    useEffect(() => {
        // Check if speech synthesis is supported
        setVoiceSupported('speechSynthesis' in window);
    }, []);

    const speakInstruction = (instruction: string, distance: number) => {
        if (!voiceEnabled || !voiceSupported) return;

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance();

        // Format the announcement
        const distanceText = distance < 100
            ? `in ${Math.round(distance)} meters`
            : `in ${Math.round(distance / 100) * 100} meters`;

        utterance.text = `${instruction} ${distanceText}`;
        utterance.lang = i18n.language === 'hi' ? 'hi-IN' : i18n.language === 'mr' ? 'mr-IN' : 'en-US';
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;

        window.speechSynthesis.speak(utterance);
    };

    // Announce navigation steps based on distance
    useEffect(() => {
        if (!steps[currentStepIndex]) return;

        const currentStep = steps[currentStepIndex];
        const distance = currentStep.distance;

        // Announce at 500m, 200m, 100m, and 50m
        const shouldAnnounce =
            (distance <= 500 && distance > 450 && lastAnnouncedStep !== currentStepIndex) ||
            (distance <= 200 && distance > 150 && lastAnnouncedStep !== currentStepIndex) ||
            (distance <= 100 && distance > 75 && lastAnnouncedStep !== currentStepIndex) ||
            (distance <= 50 && lastAnnouncedStep !== currentStepIndex);

        if (shouldAnnounce) {
            speakInstruction(currentStep.instruction, distance);
            setLastAnnouncedStep(currentStepIndex);
        }
    }, [currentStepIndex, steps, voiceEnabled]);

    const getStepIcon = (type: NavigationStep['type']) => {
        switch (type) {
            case 'left':
                return CornerUpLeft;
            case 'right':
                return CornerUpRight;
            case 'destination':
                return Flag;
            default:
                return ArrowUp;
        }
    };

    const currentStep = steps[currentStepIndex];
    const Icon = currentStep ? getStepIcon(currentStep.type) : Navigation;

    return (
        <Card className={`p-4 ${className}`}>
            <div className="space-y-4">
                {/* Voice Control */}
                {voiceSupported && (
                    <div className="flex items-center justify-between pb-2 border-b">
                        <div className="flex items-center gap-2">
                            {voiceEnabled ? (
                                <Volume2 className="w-4 h-4 text-primary" />
                            ) : (
                                <VolumeX className="w-4 h-4 text-muted-foreground" />
                            )}
                            <Label htmlFor="voice-nav" className="text-sm">
                                Voice Navigation
                            </Label>
                        </div>
                        <Switch
                            id="voice-nav"
                            checked={voiceEnabled}
                            onCheckedChange={setVoiceEnabled}
                        />
                    </div>
                )}

                {/* Current Step - Large Display */}
                {currentStep && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Navigation className="w-4 h-4 text-primary" />
                            <span className="text-sm font-semibold">Next Turn</span>
                        </div>

                        <div className="flex items-start gap-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                                <Icon className="w-6 h-6 text-primary-foreground" />
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold text-lg mb-1">
                                    {currentStep.instruction}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    in {formatDistance(currentStep.distance)}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Progress */}
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                            {formatDistance(remainingDistance)} remaining
                        </span>
                    </div>
                    <Badge variant="outline">
                        Step {currentStepIndex + 1} of {steps.length}
                    </Badge>
                </div>

                {/* All Steps */}
                <div className="space-y-2">
                    <p className="text-sm font-semibold">Route Overview</p>
                    <ScrollArea className="h-48">
                        <div className="space-y-2 pr-4">
                            {steps.map((step, index) => {
                                const StepIcon = getStepIcon(step.type);
                                const isCurrent = index === currentStepIndex;
                                const isPast = index < currentStepIndex;

                                return (
                                    <div
                                        key={index}
                                        className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${isCurrent
                                            ? 'bg-primary/10 border border-primary/20'
                                            : isPast
                                                ? 'opacity-50'
                                                : 'hover:bg-muted'
                                            }`}
                                    >
                                        <div
                                            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isCurrent
                                                ? 'bg-primary text-primary-foreground'
                                                : isPast
                                                    ? 'bg-success text-success-foreground'
                                                    : 'bg-muted'
                                                }`}
                                        >
                                            <StepIcon className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p
                                                className={`text-sm ${isCurrent ? 'font-semibold' : ''
                                                    }`}
                                            >
                                                {step.instruction}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatDistance(step.distance)}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea>
                </div>
            </div>
        </Card>
    );
}

