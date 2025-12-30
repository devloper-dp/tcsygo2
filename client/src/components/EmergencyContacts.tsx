import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Trash2, Phone, Mail, Edit2, CheckCircle2, AlertCircle } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';

interface EmergencyContact {
    id: string;
    name: string;
    phone: string;
    email?: string;
    relationship: string;
    is_primary?: boolean;
    auto_notify?: boolean;
}

interface EmergencyContactsProps {
    contacts: EmergencyContact[];
    onAdd?: (contact: Omit<EmergencyContact, 'id'>) => void;
    onEdit?: (contact: EmergencyContact) => void;
    onRemove?: (id: string) => void;
    maxContacts?: number;
    className?: string;
}

export function EmergencyContacts({
    contacts,
    onAdd,
    onEdit,
    onRemove,
    maxContacts = 3,
    className = '',
}: EmergencyContactsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [relationship, setRelationship] = useState('');
    const [isPrimary, setIsPrimary] = useState(false);
    const [autoNotify, setAutoNotify] = useState(true);

    const { toast } = useToast();

    const resetForm = () => {
        setName('');
        setPhone('');
        setEmail('');
        setRelationship('');
        setIsPrimary(false);
        setAutoNotify(true);
        setEditingId(null);
    };

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (!open) resetForm();
    };

    const handleEditClick = (contact: EmergencyContact) => {
        setEditingId(contact.id);
        setName(contact.name);
        setPhone(contact.phone);
        setEmail(contact.email || '');
        setRelationship(contact.relationship || '');
        setIsPrimary(!!contact.is_primary);
        setAutoNotify(contact.auto_notify !== false); // Default true
        setIsOpen(true);
    };

    const handleSubmit = () => {
        if (!name || !phone) {
            toast({
                title: 'Error',
                description: 'Name and phone are required',
                variant: 'destructive',
            });
            return;
        }

        if (!editingId && contacts.length >= maxContacts) {
            toast({
                title: 'Limit Reached',
                description: `You can only add up to ${maxContacts} emergency contacts`,
                variant: 'destructive',
            });
            return;
        }

        const contactData = {
            name,
            phone,
            email: email || undefined,
            relationship,
            is_primary: isPrimary,
            auto_notify: autoNotify
        };

        if (editingId && onEdit) {
            onEdit({ ...contactData, id: editingId });
        } else if (onAdd) {
            onAdd(contactData);
        }

        setIsOpen(false);
        resetForm();
    };

    return (
        <div className={className}>
            <Card className="p-4">
                <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-lg">Emergency Contacts</h3>
                            <p className="text-sm text-muted-foreground">
                                These contacts will be notified in case of emergency
                            </p>
                        </div>
                        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
                            <DialogTrigger asChild>
                                <Button
                                    size="sm"
                                    disabled={!editingId && contacts.length >= maxContacts}
                                    onClick={() => resetForm()}
                                >
                                    <UserPlus className="w-4 h-4 mr-2" />
                                    Add Contact
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>{editingId ? 'Edit Contact' : 'Add Emergency Contact'}</DialogTitle>
                                    <DialogDescription>
                                        {editingId ? 'Update contact details' : 'Add a trusted contact who will be notified during emergencies'}
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Name *</Label>
                                        <Input
                                            id="name"
                                            placeholder="John Doe"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone Number *</Label>
                                        <Input
                                            id="phone"
                                            type="tel"
                                            placeholder="+91 98765 43210"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email (Optional)</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="john@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="relationship">Relationship</Label>
                                        <Input
                                            id="relationship"
                                            placeholder="e.g., Spouse, Parent, Friend"
                                            value={relationship}
                                            onChange={(e) => setRelationship(e.target.value)}
                                        />
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="isPrimary"
                                            checked={isPrimary}
                                            onCheckedChange={(checked) => setIsPrimary(checked as boolean)}
                                        />
                                        <Label htmlFor="isPrimary">Set as primary contact</Label>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="autoNotify"
                                            checked={autoNotify}
                                            onCheckedChange={(checked) => setAutoNotify(checked as boolean)}
                                        />
                                        <Label htmlFor="autoNotify">Auto-notify duringSOS</Label>
                                    </div>

                                    <DialogFooter>
                                        <Button
                                            variant="outline"
                                            onClick={() => setIsOpen(false)}
                                        >
                                            Cancel
                                        </Button>
                                        <Button onClick={handleSubmit}>
                                            {editingId ? 'Save Changes' : 'Add Contact'}
                                        </Button>
                                    </DialogFooter>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {/* Contacts List */}
                    {contacts.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <p className="mb-2">No emergency contacts added</p>
                            <p className="text-sm">
                                Add contacts to enhance your safety during rides
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {contacts.map((contact) => (
                                <Card key={contact.id} className="p-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="font-semibold">{contact.name}</p>
                                                {contact.relationship && (
                                                    <Badge variant="outline" className="text-xs">
                                                        {contact.relationship}
                                                    </Badge>
                                                )}
                                                {contact.is_primary && (
                                                    <Badge className="text-xs bg-primary/10 text-primary hover:bg-primary/20 border-0">
                                                        Primary
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Phone className="w-3 h-3" />
                                                    <span>{contact.phone}</span>
                                                </div>
                                                {contact.email && (
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <Mail className="w-3 h-3" />
                                                        <span>{contact.email}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2 pt-1">
                                                    {contact.auto_notify !== false ? (
                                                        <div className="flex items-center gap-1 text-xs text-green-600">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            Auto-notify
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                            <AlertCircle className="w-3 h-3" />
                                                            Manual only
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleEditClick(contact)}
                                                className="h-8 w-8 p-0"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onRemove?.(contact.id)}
                                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}

                    {contacts.length < maxContacts && contacts.length > 0 && (
                        <p className="text-xs text-muted-foreground text-center">
                            You can add {maxContacts - contacts.length} more contact
                            {maxContacts - contacts.length !== 1 ? 's' : ''}
                        </p>
                    )}
                </div>
            </Card>
        </div>
    );
}
