import { useQuery, useMutation } from '@tanstack/react-query';
import { EmergencyContacts } from '@/components/EmergencyContacts';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface EmergencyContact {
    id: string;
    name: string;
    phone: string;
    email?: string;
    relationship: string;
    is_primary?: boolean;
    auto_notify?: boolean;
}

export function EmergencyContactsWrapper() {
    const { user } = useAuth();
    const { toast } = useToast();

    // Fetch emergency contacts
    const { data: contacts = [] } = useQuery<EmergencyContact[]>({
        queryKey: ['emergency-contacts', user?.id],
        queryFn: async () => {
            if (!user) return [];

            const { data, error } = await supabase
                .from('emergency_contacts')
                .select('*')
                .eq('user_id', user.id)
                .order('is_primary', { ascending: false }) // Show primary first
                .order('created_at', { ascending: true });

            if (error) throw error;
            return data || [];
        },
        enabled: !!user,
    });

    // Add contact mutation
    const addMutation = useMutation({
        mutationFn: async (contact: Omit<EmergencyContact, 'id'>) => {
            if (!user) throw new Error('User not authenticated');

            const { data, error } = await supabase
                .from('emergency_contacts')
                .insert({
                    user_id: user.id,
                    ...contact
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['emergency-contacts', user?.id] });
            toast({
                title: 'Contact Added',
                description: 'Emergency contact has been added successfully',
            });
        },
        onError: (error: any) => {
            toast({
                title: 'Error',
                description: error.message || 'Failed to add contact',
                variant: 'destructive',
            });
        },
    });

    // Edit contact mutation
    const editMutation = useMutation({
        mutationFn: async (contact: EmergencyContact) => {
            const { error } = await supabase
                .from('emergency_contacts')
                .update({
                    name: contact.name,
                    phone: contact.phone,
                    email: contact.email,
                    relationship: contact.relationship,
                    is_primary: contact.is_primary,
                    auto_notify: contact.auto_notify
                })
                .eq('id', contact.id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['emergency-contacts', user?.id] });
            toast({
                title: 'Contact Updated',
                description: 'Emergency contact details updated',
            });
        },
        onError: (error: any) => {
            toast({
                title: 'Error',
                description: error.message || 'Failed to update contact',
                variant: 'destructive',
            });
        },
    });

    // Remove contact mutation
    const removeMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('emergency_contacts')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['emergency-contacts', user?.id] });
            toast({
                title: 'Contact Removed',
                description: 'Emergency contact has been removed',
            });
        },
        onError: (error: any) => {
            toast({
                title: 'Error',
                description: error.message || 'Failed to remove contact',
                variant: 'destructive',
            });
        },
    });

    return (
        <EmergencyContacts
            contacts={contacts}
            onAdd={(contact) => addMutation.mutate(contact)}
            onEdit={(contact) => editMutation.mutate(contact)}
            onRemove={(id) => removeMutation.mutate(id)}
            maxContacts={5}
        />
    );
}
