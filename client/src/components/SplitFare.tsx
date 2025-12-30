import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Users, UserPlus, Check, X, Mail, Phone, DollarSign, Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface SplitFareParticipant {
    id: string;
    name?: string;
    email: string;
    phone?: string;
    amount: number;
    status: 'pending' | 'paid' | 'declined';
}

interface SplitFareProps {
    bookingId: string;
    totalAmount: number;
    className?: string;
    iconOnly?: boolean;
}

export function SplitFare({ bookingId, totalAmount, className = '', iconOnly = false }: SplitFareProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [participants, setParticipants] = useState<SplitFareParticipant[]>([]);
    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadParticipants();
        }
    }, [isOpen, bookingId]);

    const loadParticipants = async () => {
        try {
            const { data, error } = await supabase
                .from('split_fare_requests')
                .select('*')
                .eq('booking_id', bookingId);

            if (error) throw error;

            if (data && data.length > 0) {
                setParticipants(
                    data.map((p) => ({
                        id: p.id,
                        name: p.participant_name,
                        email: p.participant_email,
                        amount: parseFloat(p.amount),
                        status: p.status,
                    }))
                );
            }
        } catch (error) {
            console.error('Error loading participants:', error);
        }
    };

    const addParticipant = () => {
        if (!newEmail || !newEmail.includes('@')) {
            toast({
                title: 'Invalid contact',
                description: 'Please enter a valid email address',
                variant: 'destructive',
            });
            return;
        }

        const newParticipant: SplitFareParticipant = {
            id: `temp-${Date.now()}`,
            name: newName || newEmail.split('@')[0],
            email: newEmail,
            amount: 0,
            status: 'pending',
        };

        const updated = [...participants, newParticipant];
        setParticipants(updated);
        setNewName('');
        setNewEmail('');
        calculateSplit(updated);
    };

    const removeParticipant = (id: string) => {
        const updated = participants.filter((p) => p.id !== id);
        setParticipants(updated);
        calculateSplit(updated);
    };

    const calculateSplit = (parts: SplitFareParticipant[]) => {
        if (splitType === 'equal') {
            const amountPerPerson = totalAmount / (parts.length + 1); // +1 for the user
            const updated = parts.map((p) => ({ ...p, amount: amountPerPerson }));
            setParticipants(updated);
        }
    };

    useEffect(() => {
        calculateSplit(participants);
    }, [splitType]);

    const updateParticipantAmount = (id: string, amount: number) => {
        const updated = participants.map((p) =>
            p.id === id ? { ...p, amount } : p
        );
        setParticipants(updated);
    };

    const sendSplitRequests = async () => {
        if (!user) return;

        setLoading(true);
        try {
            const requests = participants.map((p) => ({
                booking_id: bookingId,
                requester_id: user.id,
                participant_name: p.name,
                participant_email: p.email,
                amount: p.amount,
                status: 'pending',
            }));

            const { error } = await supabase
                .from('split_fare_requests')
                .insert(requests);

            if (error) throw error;

            toast({
                title: 'Requests Sent!',
                description: `Sent payment requests to ${participants.length} friends.`,
            });

            setIsOpen(false);
        } catch (error: any) {
            toast({
                title: 'Failed to send requests',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const totalParticipantsAmount = participants.reduce((sum, p) => sum + p.amount, 0);
    const yourAmount = totalAmount - totalParticipantsAmount;
    const isValid = yourAmount >= 0 && participants.length > 0;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className={className} size={iconOnly ? "icon" : "default"}>
                    <Users className={`w-4 h-4 ${iconOnly ? '' : 'mr-2'}`} />
                    {!iconOnly && "Split Fare"}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" />
                        Split Ride Cost
                    </DialogTitle>
                    <DialogDescription>
                        Divide the fare between yourself and others.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Summary Card */}
                    <Card className="p-4 bg-primary/5 border-primary/20 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-muted-foreground uppercase font-bold">Total Fare</p>
                            <p className="text-2xl font-black text-primary">₹{totalAmount.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground uppercase font-bold">Your Share</p>
                            <p className="text-xl font-bold text-foreground">₹{yourAmount.toFixed(2)}</p>
                        </div>
                    </Card>

                    {/* Split Mode Toggle */}
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2">
                            <Badge variant={splitType === 'equal' ? 'default' : 'outline'}>
                                {splitType === 'equal' ? 'Equal' : 'Custom'}
                            </Badge>
                            <span className="text-sm font-medium">Split Mode</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Label htmlFor="split-mode" className="text-xs">Custom</Label>
                            <Switch
                                id="split-mode"
                                checked={splitType === 'custom'}
                                onCheckedChange={(checked) => setSplitType(checked ? 'custom' : 'equal')}
                            />
                        </div>
                    </div>

                    {/* Add Friend Form */}
                    <div className="space-y-3">
                        <Label className="text-xs font-bold uppercase text-muted-foreground">Add People</Label>
                        <div className="grid grid-cols-1 gap-2">
                            <Input
                                placeholder="Friend's Name (Optional)"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="h-9"
                            />
                            <div className="flex gap-2">
                                <Input
                                    type="email"
                                    placeholder="friend@email.com"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && addParticipant()}
                                    className="h-9"
                                />
                                <Button onClick={addParticipant} size="sm" className="h-9 gap-1">
                                    <Plus className="w-4 h-4" />
                                    Add
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* People List */}
                    <div className="space-y-2">
                        {participants.length > 0 ? (
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {participants.map((p) => (
                                    <div
                                        key={p.id}
                                        className="flex items-center gap-3 p-3 bg-card border rounded-xl shadow-sm animate-in fade-in slide-in-from-bottom-2"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                            {p.name?.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold truncate">{p.name}</p>
                                            <p className="text-[10px] text-muted-foreground truncate">{p.email}</p>
                                        </div>

                                        {splitType === 'custom' ? (
                                            <div className="relative w-24">
                                                <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                                                <Input
                                                    type="number"
                                                    value={p.amount}
                                                    onChange={(e) => updateParticipantAmount(p.id, parseFloat(e.target.value) || 0)}
                                                    className="h-8 pl-6 text-right pr-2 text-sm"
                                                    min="0"
                                                />
                                            </div>
                                        ) : (
                                            <Badge variant="secondary" className="font-bold">
                                                ₹{p.amount.toFixed(0)}
                                            </Badge>
                                        )}

                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => removeParticipant(p.id)}
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6 border-2 border-dashed rounded-xl border-muted">
                                <p className="text-xs text-muted-foreground">No friends added yet to split with.</p>
                            </div>
                        )}
                    </div>

                    <Separator />

                    {/* Action Button */}
                    <Button
                        onClick={sendSplitRequests}
                        disabled={!isValid || loading}
                        className="w-full h-11 gap-2 shadow-lg"
                        size="lg"
                    >
                        {loading ? 'Sending...' : (
                            <>
                                <Send className="w-4 h-4" />
                                Send {participants.length} Request{participants.length !== 1 ? 's' : ''}
                            </>
                        )}
                    </Button>

                    {!isValid && participants.length > 0 && (
                        <p className="text-[10px] text-destructive text-center font-medium">
                            Split amount exceeds total fare. Please adjust shares.
                        </p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Minimal Plus component if not imported
function Plus(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M5 12h14" />
            <path d="M12 5v14" />
        </svg>
    )
}
