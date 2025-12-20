import { supabase } from './supabase';
import { db } from '../db';
import { sosAlerts, InsertSOSAlert, SOSAlert } from '@shared/schema';
import { eventBus } from './EventBus';
import { eq } from 'drizzle-orm';

export class SOSService {
    private useSupabase() {
        return process.env.VITE_SUPABASE_URL && !process.env.VITE_SUPABASE_URL.includes('placeholder');
    }

    async triggerSOS(alertData: InsertSOSAlert): Promise<SOSAlert> {
        const { tripId, reporterId, lat, lng } = alertData;

        let alert: SOSAlert;

        if (this.useSupabase()) {
            const { data, error } = await supabase
                .from('sos_alerts')
                .insert({
                    trip_id: tripId,
                    reporter_id: reporterId,
                    lat,
                    lng,
                    status: 'triggered'
                })
                .select()
                .single();

            if (error) throw new Error(error.message);
            alert = data;
        } else {
            const [newAlert] = await db
                .insert(sosAlerts)
                .values({
                    tripId,
                    reporterId,
                    lat,
                    lng,
                    status: 'triggered'
                })
                .returning();

            alert = newAlert;
        }

        // Emit critical event
        eventBus.emit('sos:triggered', alert);

        // In a real app, this would trigger SMS/Email notifications via external providers
        console.error(`[EMERGENCY] SOS Triggered for trip ${tripId} by user ${reporterId} at ${lat}, ${lng}`);

        return alert;
    }

    async getTripAlerts(tripId: string): Promise<SOSAlert[]> {
        if (this.useSupabase()) {
            const { data, error } = await supabase
                .from('sos_alerts')
                .select(`
          *,
          reporter:users(*)
        `)
                .eq('trip_id', tripId)
                .order('created_at', { ascending: false });

            if (error) throw new Error(error.message);
            return data || [];
        } else {
            const results = await db.query.sosAlerts.findMany({
                where: eq(sosAlerts.tripId, tripId),
                with: {
                    reporter: true
                },
                orderBy: (alerts, { desc }) => [desc(alerts.createdAt)]
            });

            return results as SOSAlert[];
        }
    }

    async getAllAlerts(): Promise<SOSAlert[]> {
        if (this.useSupabase()) {
            const { data, error } = await supabase
                .from('sos_alerts')
                .select(`
                    *,
                    reporter:users(*)
                `)
                .order('created_at', { ascending: false });

            if (error) throw new Error(error.message);
            return data || [];
        } else {
            const results = await db.query.sosAlerts.findMany({
                with: {
                    reporter: true
                },
                orderBy: (alerts, { desc }) => [desc(alerts.createdAt)]
            });
            return results as SOSAlert[];
        }
    }
}

export const sosService = new SOSService();
