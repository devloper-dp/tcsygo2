
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PromoCode, insertPromoCodeSchema } from '@shared/schema';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Ticket, Plus, Trash2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

export function PromoCodesTab() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const { data: promoCodes, isLoading } = useQuery<PromoCode[]>({
        queryKey: ['admin-promocodes'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('promo_codes')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as PromoCode[];
        }
    });

    const form = useForm({
        resolver: zodResolver(insertPromoCodeSchema),
        defaultValues: {
            code: '',
            discountType: 'percentage',
            discountValue: '',
            maxUses: undefined, // Optional
            validFrom: new Date().toISOString().split('T')[0],
            validUntil: '',
            isActive: true
        }
    });

    const createMutation = useMutation({
        mutationFn: async (values: any) => {
            // Convert discountValue to string if it's not already
            const formattedValues = {
                ...values,
                discountValue: values.discountValue.toString(),
                // Ensure optional fields are handled correctly
                maxUses: values.maxUses ? parseInt(values.maxUses) : null
            };
            const { error } = await supabase.from('promo_codes').insert(formattedValues);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-promocodes'] });
            setIsDialogOpen(false);
            form.reset();
            toast({ title: "Success", description: "Promo code created successfully" });
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('promo_codes').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-promocodes'] });
            toast({ title: "Success", description: "Promo code deleted" });
        }
    });

    function onSubmit(values: any) {
        createMutation.mutate(values);
    }

    return (
        <Card>
            <div className="p-6 border-b flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Ticket className="w-5 h-5 text-primary" />
                    Promo Codes
                </h2>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="w-4 h-4" />
                            Create New
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Create Promo Code</DialogTitle>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="code"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Code</FormLabel>
                                            <FormControl>
                                                <Input placeholder="SUMMER2025" {...field} className="uppercase" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="discountType"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Type</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select type" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                                                        <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="discountValue"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Value</FormLabel>
                                                <FormControl>
                                                    <Input type="number" placeholder="10" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="validFrom"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Valid From</FormLabel>
                                                <FormControl>
                                                    <Input type="date" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="validUntil"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Valid Until</FormLabel>
                                                <FormControl>
                                                    <Input type="date" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="maxUses"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Max Uses (Optional)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    placeholder="100"
                                                    {...field}
                                                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <DialogFooter>
                                    <Button type="submit" disabled={createMutation.isPending}>
                                        {createMutation.isPending ? 'Creating...' : 'Create Promo Code'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>
            <div className="p-6">
                {isLoading ? (
                    <div className="text-center py-12">Loading promo codes...</div>
                ) : promoCodes && promoCodes.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Discount</TableHead>
                                <TableHead>Uses</TableHead>
                                <TableHead>Valid Until</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {promoCodes.map((promo) => (
                                <TableRow key={promo.id}>
                                    <TableCell className="font-medium font-mono">{promo.code}</TableCell>
                                    <TableCell>
                                        {promo.discountType === 'percentage' ? `${promo.discountValue}%` : `₹${promo.discountValue}`}
                                    </TableCell>
                                    <TableCell>
                                        {promo.currentUses} / {promo.maxUses || '∞'}
                                    </TableCell>
                                    <TableCell>
                                        {promo.validUntil && !isNaN(new Date(promo.validUntil).getTime())
                                            ? format(new Date(promo.validUntil), 'MMM d, yyyy')
                                            : '-'
                                        }
                                    </TableCell>
                                    <TableCell>
                                        <div className={`text-xs px-2 py-1 rounded-full w-fit ${promo.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {promo.isActive ? 'Active' : 'Inactive'}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="text-destructive hover:text-destructive/90"
                                            onClick={() => {
                                                if (confirm('Are you sure you want to delete this promo code?')) {
                                                    deleteMutation.mutate(promo.id);
                                                }
                                            }}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="text-center py-12">
                        <Ticket className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                        <p className="text-muted-foreground">No promo codes found</p>
                    </div>
                )}
            </div>
        </Card>
    );
}
