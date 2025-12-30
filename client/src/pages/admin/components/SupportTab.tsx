
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { SupportTicket } from '@shared/schema';
import { mapSupportTicket } from '@/lib/mapper';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Mail, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SupportTab() {
    const { data: tickets } = useQuery<SupportTicket[]>({
        queryKey: ['admin-support-tickets'],
        queryFn: async (): Promise<SupportTicket[]> => {
            const { data, error } = await supabase
                .from('support_tickets')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return (data || []).map(mapSupportTicket);
        }
    });

    return (
        <Card>
            <div className="p-6 border-b flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Support Tickets
                </h2>
            </div>
            <div className="p-6">
                {tickets && tickets.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>User / Contact</TableHead>
                                <TableHead>Message</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tickets.map((ticket) => (
                                <TableRow key={ticket.id}>
                                    <TableCell>{new Date(ticket.createdAt).toLocaleDateString()}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium flex items-center gap-1">
                                                <User className="w-3 h-3 text-muted-foreground" />
                                                {ticket.name}
                                            </span>
                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Mail className="w-3 h-3" />
                                                {ticket.email}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="max-w-md truncate" title={ticket.message}>
                                        {ticket.message}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={ticket.status === 'resolved' ? 'secondary' : 'default'}>
                                            {ticket.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button size="sm" variant="outline" disabled>
                                            View
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="text-center py-12">
                        <MessageSquare className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                        <p className="text-muted-foreground">No support tickets found</p>
                    </div>
                )}
            </div>
        </Card>
    );
}
