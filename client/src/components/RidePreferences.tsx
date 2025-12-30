import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wind, Music, PawPrint, Package, Save, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export interface RidePreference {
    ac_preferred: boolean;
    music_allowed: boolean;
    pet_friendly: boolean;
    luggage_capacity: number;
}

interface RidePreferencesProps {
    preferences?: RidePreference;
    onPreferencesChange?: (preferences: RidePreference) => void;
    showSaveButton?: boolean;
    inline?: boolean;
    className?: string;
}

export function RidePreferences({
    preferences: externalPreferences,
    onPreferencesChange,
    showSaveButton = true,
    inline = false,
    className = '',
}: RidePreferencesProps) {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { toast } = useToast();
    const [internalPreferences, setInternalPreferences] = useState<RidePreference>(
        externalPreferences || {
            ac_preferred: true,
            music_allowed: true,
            pet_friendly: false,
            luggage_capacity: 1,
        }
    );
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);

    // Sync with external preferences if provided
    useEffect(() => {
        if (externalPreferences) {
            setInternalPreferences(externalPreferences);
        }
    }, [externalPreferences]);

    // Load saved preferences
    useEffect(() => {
        if (user) {
            loadPreferences();
        }
    }, [user]);

    const loadPreferences = async () => {
        try {
            const { data, error } = await supabase
                .from('ride_preferences')
                .select('*')
                .eq('user_id', user?.id)
                .single();

            if (data && !error) {
                const loadedPrefs = {
                    ac_preferred: data.ac_preferred,
                    music_allowed: data.music_allowed,
                    pet_friendly: data.pet_friendly,
                    luggage_capacity: data.luggage_capacity,
                };
                setInternalPreferences(loadedPrefs);
                onPreferencesChange?.(loadedPrefs);
            }
        } catch (error) {
            console.error('Error loading preferences:', error);
        }
    };

    const handlePreferenceChange = (key: keyof RidePreference, value: boolean | number) => {
        const newPreferences = { ...internalPreferences, [key]: value };
        setInternalPreferences(newPreferences);
        onPreferencesChange?.(newPreferences);
        setSaved(false);
    };

    const savePreferences = async () => {
        if (!user) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('ride_preferences')
                .upsert({
                    user_id: user.id,
                    ac_preferred: internalPreferences.ac_preferred,
                    music_allowed: internalPreferences.music_allowed,
                    pet_friendly: internalPreferences.pet_friendly,
                    luggage_capacity: internalPreferences.luggage_capacity,
                    updated_at: new Date().toISOString(),
                });

            if (error) throw error;

            setSaved(true);
            toast({
                title: t('common.success'),
                description: 'Your ride preferences have been updated',
            });

            setTimeout(() => setSaved(false), 3000);
        } catch (error: any) {
            toast({
                title: 'Failed to save preferences',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const content = (
        <div className="space-y-6">
            {!inline && (
                <div>
                    <h3 className="text-lg font-semibold mb-1">{t('preferences.title')}</h3>
                    <p className="text-sm text-muted-foreground">
                        Customize your ride experience
                    </p>
                </div>
            )}

            {/* AC Preference */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Wind className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <Label htmlFor="ac-preference" className="text-base font-medium">
                            {t('preferences.ac')}
                        </Label>
                        {!inline && (
                            <p className="text-sm text-muted-foreground">
                                Prefer AC vehicles
                            </p>
                        )}
                    </div>
                </div>
                <Switch
                    id="ac-preference"
                    checked={internalPreferences.ac_preferred}
                    onCheckedChange={(checked) =>
                        handlePreferenceChange('ac_preferred', checked)
                    }
                />
            </div>

            {/* Music Preference */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Music className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <Label htmlFor="music-preference" className="text-base font-medium">
                            {t('preferences.music')}
                        </Label>
                        {!inline && (
                            <p className="text-sm text-muted-foreground">
                                Allow music during ride
                            </p>
                        )}
                    </div>
                </div>
                <Switch
                    id="music-preference"
                    checked={internalPreferences.music_allowed}
                    onCheckedChange={(checked) =>
                        handlePreferenceChange('music_allowed', checked)
                    }
                />
            </div>

            {/* Pet Friendly */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <PawPrint className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <Label htmlFor="pet-preference" className="text-base font-medium">
                            {t('preferences.pets')}
                        </Label>
                        {!inline && (
                            <p className="text-sm text-muted-foreground">
                                Traveling with pets
                            </p>
                        )}
                    </div>
                </div>
                <Switch
                    id="pet-preference"
                    checked={internalPreferences.pet_friendly}
                    onCheckedChange={(checked) =>
                        handlePreferenceChange('pet_friendly', checked)
                    }
                />
            </div>

            {/* Luggage Capacity */}
            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Package className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                        <Label className="text-base font-medium">
                            {t('preferences.luggage')}
                        </Label>
                        {!inline && (
                            <p className="text-sm text-muted-foreground">
                                Number of bags: {internalPreferences.luggage_capacity}
                            </p>
                        )}
                    </div>
                    <Badge variant="outline" className="text-base font-semibold">
                        {internalPreferences.luggage_capacity}
                    </Badge>
                </div>
                <Slider
                    value={[internalPreferences.luggage_capacity]}
                    onValueChange={([value]) =>
                        handlePreferenceChange('luggage_capacity', value)
                    }
                    min={0}
                    max={5}
                    step={1}
                    className="w-full"
                />
                {!inline && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>None</span>
                        <span>Small</span>
                        <span>Medium</span>
                        <span>Large</span>
                    </div>
                )}
            </div>

            {/* Save Button */}
            {showSaveButton && !inline && (
                <Button
                    onClick={savePreferences}
                    disabled={loading || saved}
                    className="w-full"
                    size="lg"
                >
                    {saved ? (
                        <>
                            <Check className="w-4 h-4 mr-2" />
                            Saved
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4 mr-2" />
                            {loading ? t('common.loading') : t('common.save')}
                        </>
                    )}
                </Button>
            )}
        </div>
    );

    if (inline) {
        return <div className={className}>{content}</div>;
    }

    return (
        <Card className={`p-6 ${className}`}>
            {content}
        </Card>
    );
}
