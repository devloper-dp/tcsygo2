import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Building2, Save, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface OrganizationSettingsProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export function OrganizationSettings({ isOpen, onOpenChange }: OrganizationSettingsProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [organization, setOrganization] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user?.organization) {
            setOrganization(user.organization);
        }
    }, [user]);

    const handleSave = async () => {
        if (!user) return;
        setLoading(true);

        try {
            const { error } = await supabase
                .from('users')
                .update({ organization: organization.trim() })
                .eq('id', user.id);

            if (error) throw error;

            toast({
                title: 'Success',
                description: 'Organization updated successfully',
            });
            setIsEditing(false);
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-primary" />
                        Corporate Carpooling
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Join your organization's carpool network to ride with verified colleagues.
                    </p>

                    {isEditing ? (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="org-name">Organization Name</Label>
                                <Input
                                    id="org-name"
                                    placeholder="e.g. TCS, Google, etc."
                                    value={organization}
                                    onChange={(e) => setOrganization(e.target.value)}
                                />
                                <p className="text-[10px] text-muted-foreground">
                                    Use your official company name to match with colleagues.
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={handleSave} disabled={loading} className="flex-1 gap-2">
                                    <Save className="w-4 h-4" />
                                    {loading ? 'Saving...' : 'Save Settings'}
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        setIsEditing(false);
                                        setOrganization(user?.organization || '');
                                    }}
                                    className="gap-2"
                                >
                                    <X className="w-4 h-4" />
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                            {organization ? (
                                <div className="flex items-center justify-between">
                                    <span className="font-medium">{organization}</span>
                                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                                        Verified
                                    </span>
                                </div>
                            ) : (
                                <p className="text-sm text-center text-muted-foreground py-2">
                                    No organization set. Add one to enable colleague filtering.
                                </p>
                            )}
                        </div>
                    )}

                    {!isEditing && (
                        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="w-full">
                            Edit Organization
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
