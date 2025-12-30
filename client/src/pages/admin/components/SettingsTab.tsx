
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { SystemSettings, insertSystemSettingsSchema } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Settings, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';

export function SettingsTab() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const { data: settings, isLoading } = useQuery<SystemSettings[]>({
        queryKey: ['admin-settings'],
        queryFn: async () => {
            const { data, error } = await supabase.from('system_settings').select('*');
            if (error) {
                // Handle case where table might not exist yet gracefully or return empty
                console.error("Error fetching settings:", error);
                return [];
            }
            return data as SystemSettings[];
        }
    });

    const currentSettings = settings?.[0]; // Assuming single row

    const form = useForm({
        resolver: zodResolver(insertSystemSettingsSchema),
        defaultValues: {
            platformFeePercentage: '10',
            maintenanceMode: false,
            supportEmail: '',
            supportPhone: ''
        },
        values: currentSettings ? {
            platformFeePercentage: currentSettings.platformFeePercentage,
            maintenanceMode: currentSettings.maintenanceMode,
            supportEmail: currentSettings.supportEmail || '',
            supportPhone: currentSettings.supportPhone || ''
        } : undefined
    });

    const mutation = useMutation({
        mutationFn: async (values: any) => {
            if (currentSettings?.id) {
                const { error } = await supabase
                    .from('system_settings')
                    .update(values)
                    .eq('id', currentSettings.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('system_settings')
                    .insert(values);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
            toast({ title: "Success", description: "Settings updated successfully" });
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    });

    function onSubmit(values: any) {
        mutation.mutate(values);
    }

    if (isLoading) return <div>Loading settings...</div>;

    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        System Configuration
                    </CardTitle>
                    <CardDescription>
                        Manage global platform settings and configurations.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="platformFeePercentage"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Platform Fee (%)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="10" {...field} />
                                            </FormControl>
                                            <FormDescription>
                                                Percentage taken from each trip payment.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="maintenanceMode"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-base">
                                                    Maintenance Mode
                                                </FormLabel>
                                                <FormDescription>
                                                    Disable all new bookings and user actions.
                                                </FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="supportEmail"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Support Email</FormLabel>
                                            <FormControl>
                                                <Input placeholder="support@example.com" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="supportPhone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Support Phone</FormLabel>
                                            <FormControl>
                                                <Input placeholder="+91..." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="flex justify-end">
                                <Button type="submit" disabled={mutation.isPending} className="gap-2">
                                    <Save className="w-4 h-4" />
                                    Save Changes
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
