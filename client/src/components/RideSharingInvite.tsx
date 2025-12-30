import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Users, Mail, Phone, Send, X, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Invitee {
    id: string;
    name: string;
    contact: string;
    status: 'pending' | 'accepted' | 'declined';
}

interface RideSharingInviteProps {
    tripId: string;
    totalFare: number;
    onInvitesSent?: (invitees: Invitee[]) => void;
}

export function RideSharingInvite({ tripId, totalFare, onInvitesSent }: RideSharingInviteProps) {
    const { toast } = useToast();
    const { user } = useAuth();
    const [invitees, setInvitees] = useState<Invitee[]>([]);
    const [name, setName] = useState('');
    const [contact, setContact] = useState('');
    const [message, setMessage] = useState('Join me for a ride! Let\'s split the fare.');

    const sendInvitesMutation = useMutation({
        mutationFn: async () => {
            const invitePromises = invitees.map(async (invitee) => {
                const { data, error } = await supabase
                    .from('ride_sharing_invites')
                    .insert({
                        trip_id: tripId,
                        inviter_id: user?.id,
                        invitee_name: invitee.name,
                        invitee_contact: invitee.contact,
                        message: message,
                        status: 'pending',
                    })
                    .select()
                    .single();

                if (error) throw error;
                return data;
            });

            return Promise.all(invitePromises);
        },
        onSuccess: () => {
            toast({
                title: 'Invites Sent!',
                description: `${invitees.length} invitation(s) sent successfully.`,
            });
            onInvitesSent?.(invitees);
        },
        onError: () => {
            toast({
                title: 'Error',
                description: 'Failed to send invites. Please try again.',
                variant: 'destructive',
            });
        },
    });

    const addInvitee = () => {
        if (!name || !contact) return;

        const newInvitee: Invitee = {
            id: Date.now().toString(),
            name,
            contact,
            status: 'pending',
        };

        setInvitees([...invitees, newInvitee]);
        setName('');
        setContact('');
    };

    const removeInvitee = (id: string) => {
        setInvitees(invitees.filter((inv) => inv.id !== id));
    };

    const splitFare = totalFare / (invitees.length + 1);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Invite Colleagues to Share Ride
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            placeholder="Colleague name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="contact">Email or Phone</Label>
                        <Input
                            id="contact"
                            placeholder="email@example.com or +91..."
                            value={contact}
                            onChange={(e) => setContact(e.target.value)}
                        />
                    </div>
                </div>

                <Button onClick={addInvitee} variant="outline" className="w-full">
                    Add Invitee
                </Button>

                {invitees.length > 0 && (
                    <div className="space-y-2">
                        <Label>Invitees ({invitees.length})</Label>
                        <div className="space-y-2">
                            {invitees.map((invitee) => (
                                <div
                                    key={invitee.id}
                                    className="flex items-center justify-between p-2 border rounded-lg"
                                >
                                    <div>
                                        <p className="font-medium">{invitee.name}</p>
                                        <p className="text-sm text-muted-foreground">{invitee.contact}</p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeInvitee(invitee.id)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <Label htmlFor="message">Custom Message</Label>
                    <Textarea
                        id="message"
                        placeholder="Add a personal message..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={3}
                    />
                </div>

                {invitees.length > 0 && (
                    <Card className="bg-accent">
                        <CardContent className="p-4">
                            <div className="space-y-2">
                                <p className="text-sm font-medium">Fare Split</p>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm">Per Person:</span>
                                    <span className="text-lg font-bold">
                                        ₹{splitFare.toFixed(2)}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Total: ₹{totalFare} ÷ {invitees.length + 1} people
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Button
                    onClick={() => sendInvitesMutation.mutate()}
                    disabled={invitees.length === 0 || sendInvitesMutation.isPending}
                    className="w-full"
                >
                    <Send className="h-4 w-4 mr-2" />
                    Send {invitees.length} Invite{invitees.length !== 1 ? 's' : ''}
                </Button>
            </CardContent>
        </Card>
    );
}
