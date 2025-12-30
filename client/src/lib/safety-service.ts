import { supabase } from './supabase';
import { Coordinates } from './maps';

export interface SafetyCheckin {
    id: string;
    trip_id: string;
    user_id: string;
    status: 'safe' | 'help_needed' | 'missed';
    location_lat: number;
    location_lng: number;
    notes?: string;
    created_at: string;
}

export interface EmergencyContact {
    id: string;
    user_id: string;
    name: string;
    phone: string;
    relationship: string;
    is_primary: boolean;
    created_at: string;
}

export interface EmergencyAlert {
    id: string;
    trip_id?: string;
    user_id: string;
    type: 'sos' | 'missed_checkin' | 'geofence_breach' | 'manual';
    location_lat: number;
    location_lng: number;
    status: 'active' | 'resolved' | 'false_alarm';
    notes?: string;
    contacts_notified: string[];
    created_at: string;
    resolved_at?: string;
}

export interface SafetySettings {
    user_id: string;
    enable_checkins: boolean;
    checkin_interval: number; // minutes
    enable_geofencing: boolean;
    enable_sos: boolean;
    share_live_location: boolean;
    auto_notify_emergency: boolean;
    missed_checkin_threshold: number;
    created_at?: string;
    updated_at?: string;
}

/**
 * Get emergency contacts for a user
 */
export async function getEmergencyContacts(): Promise<EmergencyContact[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('is_primary', { ascending: false });

    if (error) throw error;
    return data || [];
}

/**
 * Add emergency contact
 */
export async function addEmergencyContact(contact: {
    name: string;
    phone: string;
    relationship: string;
    isPrimary?: boolean;
}): Promise<EmergencyContact> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // If setting as primary, unset other primary contacts
    if (contact.isPrimary) {
        await supabase
            .from('emergency_contacts')
            .update({ is_primary: false })
            .eq('user_id', user.id);
    }

    const { data, error } = await supabase
        .from('emergency_contacts')
        .insert({
            user_id: user.id,
            name: contact.name,
            phone: contact.phone,
            relationship: contact.relationship,
            is_primary: contact.isPrimary || false,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Update emergency contact
 */
export async function updateEmergencyContact(
    id: string,
    updates: Partial<EmergencyContact>
): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // If setting as primary, unset other primary contacts
    if (updates.is_primary) {
        await supabase
            .from('emergency_contacts')
            .update({ is_primary: false })
            .eq('user_id', user.id)
            .neq('id', id);
    }

    const { error } = await supabase
        .from('emergency_contacts')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) throw error;
}

/**
 * Delete emergency contact
 */
export async function deleteEmergencyContact(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
        .from('emergency_contacts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) throw error;
}

/**
 * Get safety settings for a user
 */
export async function getSafetySettings(): Promise<SafetySettings> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
        .from('safety_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (error || !data) {
        // Return default settings if none exist
        return {
            user_id: user.id,
            enable_checkins: true,
            checkin_interval: 10,
            enable_geofencing: true,
            enable_sos: true,
            share_live_location: true,
            auto_notify_emergency: true,
            missed_checkin_threshold: 2,
        };
    }

    return data;
}

/**
 * Update safety settings
 */
export async function updateSafetySettings(
    settings: Partial<SafetySettings>
): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
        .from('safety_settings')
        .upsert({
            user_id: user.id,
            ...settings,
            updated_at: new Date().toISOString(),
        });

    if (error) throw error;
}

/**
 * Share trip status with emergency contacts
 */
export async function shareTripStatus(
    tripId: string,
    contactIds: string[]
): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    for (const contactId of contactIds) {
        await supabase
            .from('trip_shares')
            .insert({
                trip_id: tripId,
                shared_by: user.id,
                shared_with: contactId,
                shared_at: new Date().toISOString(),
            });
    }
}

/**
 * Get trip shares
 */
export async function getTripShares(tripId: string): Promise<any[]> {
    const { data, error } = await supabase
        .from('trip_shares')
        .select(`
            *,
            emergency_contact:emergency_contacts(*)
        `)
        .eq('trip_id', tripId);

    if (error) throw error;
    return data || [];
}

/**
 * Get emergency alerts for a user
 */
export async function getEmergencyAlerts(): Promise<EmergencyAlert[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('emergency_alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

/**
 * Resolve emergency alert
 */
export async function resolveEmergencyAlert(
    alertId: string,
    resolution: 'resolved' | 'false_alarm'
): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
        .from('emergency_alerts')
        .update({
            status: resolution,
            resolved_at: new Date().toISOString(),
        })
        .eq('id', alertId)
        .eq('user_id', user.id);

    if (error) throw error;
}

/**
 * Trigger an SOS alert for a trip
 */
export async function triggerSOS(
    tripId: string,
    location: Coordinates
): Promise<{ success: boolean; message: string }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Get emergency contacts
        const contacts = await getEmergencyContacts();
        const contactsNotified = contacts.map(c => c.id);

        // Create emergency alert
        const { error: alertError } = await supabase
            .from('emergency_alerts')
            .insert({
                trip_id: tripId,
                user_id: user.id,
                type: 'sos',
                location_lat: location.lat,
                location_lng: location.lng,
                status: 'active',
                notes: 'SOS button pressed by user',
                contacts_notified: contactsNotified,
            });

        if (alertError) throw alertError;

        // Also create a high-priority check-in
        await createSafetyCheckin(tripId, 'help_needed', location, 'SOS Triggered');

        // Notify emergency contacts (in real app, send SMS/email)
        await notifyEmergencyContacts(contacts, {
            type: 'sos',
            location,
            tripId,
            notes: 'SOS button pressed - immediate assistance needed',
        });

        return { success: true, message: 'SOS Alert triggered. Emergency contacts notified.' };
    } catch (error: any) {
        console.error('SOS Error:', error);
        return { success: false, message: error.message || 'Failed to trigger SOS' };
    }
}

/**
 * Notify emergency contacts
 */
async function notifyEmergencyContacts(
    contacts: EmergencyContact[],
    alert: {
        type: string;
        location: Coordinates;
        tripId?: string;
        notes?: string;
    }
): Promise<void> {
    for (const contact of contacts) {
        // Create notification record
        await supabase
            .from('emergency_notifications')
            .insert({
                contact_id: contact.id,
                alert_type: alert.type,
                location_lat: alert.location.lat,
                location_lng: alert.location.lng,
                message: `Emergency alert: ${alert.type}. Location: ${alert.location.lat}, ${alert.location.lng}`,
                sent_at: new Date().toISOString(),
            });

        // In a real implementation, you would send SMS/email here
        console.log(`Emergency notification sent to ${contact.name} at ${contact.phone}`);
    }
}

/**
 * Create a safety check-in
 */
export async function createSafetyCheckin(
    tripId: string,
    status: 'safe' | 'help_needed' | 'missed',
    location: Coordinates,
    notes?: string
): Promise<SafetyCheckin | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('safety_checkins')
        .insert({
            trip_id: tripId,
            user_id: user.id,
            status,
            location_lat: location.lat,
            location_lng: location.lng,
            notes
        })
        .select()
        .single();

    if (error) {
        console.error('Check-in Error:', error);
        return null;
    }

    return data;
}

/**
 * Get check-ins for a trip
 */
export async function getTripCheckins(tripId: string): Promise<SafetyCheckin[]> {
    const { data, error } = await supabase
        .from('safety_checkins')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });

    if (error) return [];
    return data || [];
}
