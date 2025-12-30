import { supabase } from './supabase';
import type {
    QueryFilter,
    QueryOptions,
    PaginatedResult,
} from '@/types/supabase-types';

/**
 * Database Service
 * Centralized service for all Supabase database operations
 * Provides type-safe CRUD operations with error handling
 */

export class DatabaseService {
    /**
     * Generic query builder for any table
     */
    static async query<T>(
        table: string,
        options: QueryOptions<T> = {}
    ): Promise<{ data: T[] | null; error: any; count?: number }> {
        try {
            let query = supabase.from(table).select(options.select || '*', {
                count: 'exact',
            });

            // Apply filters
            if (options.filters && options.filters.length > 0) {
                options.filters.forEach((filter) => {
                    const column = String(filter.column);
                    switch (filter.operator) {
                        case 'eq':
                            query = query.eq(column, filter.value);
                            break;
                        case 'neq':
                            query = query.neq(column, filter.value);
                            break;
                        case 'gt':
                            query = query.gt(column, filter.value);
                            break;
                        case 'gte':
                            query = query.gte(column, filter.value);
                            break;
                        case 'lt':
                            query = query.lt(column, filter.value);
                            break;
                        case 'lte':
                            query = query.lte(column, filter.value);
                            break;
                        case 'like':
                            query = query.like(column, filter.value);
                            break;
                        case 'ilike':
                            query = query.ilike(column, filter.value);
                            break;
                        case 'in':
                            query = query.in(column, filter.value);
                            break;
                        case 'is':
                            query = query.is(column, filter.value);
                            break;
                    }
                });
            }

            // Apply ordering
            if (options.orderBy) {
                query = query.order(String(options.orderBy.column), {
                    ascending: options.orderBy.ascending ?? true,
                });
            }

            // Apply pagination
            if (options.limit) {
                query = query.limit(options.limit);
            }
            if (options.offset) {
                query = query.range(
                    options.offset,
                    options.offset + (options.limit || 10) - 1
                );
            }

            const { data, error, count } = await query;

            return { data: data as T[], error, count: count || 0 };
        } catch (error) {
            console.error(`Database query error on ${table}:`, error);
            return { data: null, error };
        }
    }

    /**
     * Get paginated results
     */
    static async queryPaginated<T>(
        table: string,
        page: number = 1,
        pageSize: number = 10,
        options: Omit<QueryOptions<T>, 'limit' | 'offset'> = {}
    ): Promise<PaginatedResult<T>> {
        const offset = (page - 1) * pageSize;
        const { data, error, count } = await this.query<T>(table, {
            ...options,
            limit: pageSize,
            offset,
        });

        if (error || !data) {
            return {
                data: [],
                count: 0,
                page,
                pageSize,
                totalPages: 0,
            };
        }

        return {
            data,
            count: count || 0,
            page,
            pageSize,
            totalPages: Math.ceil((count || 0) / pageSize),
        };
    }

    /**
     * Get a single record by ID
     */
    static async getById<T>(
        table: string,
        id: string
    ): Promise<{ data: T | null; error: any }> {
        try {
            const { data, error } = await supabase
                .from(table)
                .select('*')
                .eq('id', id)
                .single();

            return { data: data as T, error };
        } catch (error) {
            console.error(`Error fetching ${table} by ID:`, error);
            return { data: null, error };
        }
    }

    /**
     * Insert a new record
     */
    static async insert<T>(
        table: string,
        record: Partial<T>
    ): Promise<{ data: T | null; error: any }> {
        try {
            const { data, error } = await supabase
                .from(table)
                .insert(record)
                .select()
                .single();

            if (error) {
                console.error(`Error inserting into ${table}:`, error);
            }

            return { data: data as T, error };
        } catch (error) {
            console.error(`Insert error on ${table}:`, error);
            return { data: null, error };
        }
    }

    /**
     * Insert multiple records
     */
    static async insertMany<T>(
        table: string,
        records: Partial<T>[]
    ): Promise<{ data: T[] | null; error: any }> {
        try {
            const { data, error } = await supabase
                .from(table)
                .insert(records)
                .select();

            if (error) {
                console.error(`Error inserting multiple into ${table}:`, error);
            }

            return { data: data as T[], error };
        } catch (error) {
            console.error(`Batch insert error on ${table}:`, error);
            return { data: null, error };
        }
    }

    /**
     * Update a record by ID
     */
    static async update<T>(
        table: string,
        id: string,
        updates: Partial<T>
    ): Promise<{ data: T | null; error: any }> {
        try {
            const { data, error } = await supabase
                .from(table)
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                console.error(`Error updating ${table}:`, error);
            }

            return { data: data as T, error };
        } catch (error) {
            console.error(`Update error on ${table}:`, error);
            return { data: null, error };
        }
    }

    /**
     * Update multiple records with filters
     */
    static async updateMany<T>(
        table: string,
        filters: QueryFilter<T>[],
        updates: Partial<T>
    ): Promise<{ data: T[] | null; error: any }> {
        try {
            let query = supabase.from(table).update(updates);

            // Apply filters
            filters.forEach((filter) => {
                const column = String(filter.column);
                query = query.eq(column, filter.value);
            });

            const { data, error } = await query.select();

            if (error) {
                console.error(`Error updating multiple in ${table}:`, error);
            }

            return { data: data as T[], error };
        } catch (error) {
            console.error(`Batch update error on ${table}:`, error);
            return { data: null, error };
        }
    }

    /**
     * Delete a record by ID
     */
    static async delete(
        table: string,
        id: string
    ): Promise<{ success: boolean; error: any }> {
        try {
            const { error } = await supabase.from(table).delete().eq('id', id);

            if (error) {
                console.error(`Error deleting from ${table}:`, error);
                return { success: false, error };
            }

            return { success: true, error: null };
        } catch (error) {
            console.error(`Delete error on ${table}:`, error);
            return { success: false, error };
        }
    }

    /**
     * Delete multiple records with filters
     */
    static async deleteMany<T>(
        table: string,
        filters: QueryFilter<T>[]
    ): Promise<{ success: boolean; error: any }> {
        try {
            let query = supabase.from(table).delete();

            // Apply filters
            filters.forEach((filter) => {
                const column = String(filter.column);
                query = query.eq(column, filter.value);
            });

            const { error } = await query;

            if (error) {
                console.error(`Error deleting multiple from ${table}:`, error);
                return { success: false, error };
            }

            return { success: true, error: null };
        } catch (error) {
            console.error(`Batch delete error on ${table}:`, error);
            return { success: false, error };
        }
    }

    /**
     * Upsert (insert or update) a record
     */
    static async upsert<T>(
        table: string,
        record: Partial<T>,
        onConflict?: string
    ): Promise<{ data: T | null; error: any }> {
        try {
            const { data, error } = await supabase
                .from(table)
                .upsert(record, { onConflict })
                .select()
                .single();

            if (error) {
                console.error(`Error upserting into ${table}:`, error);
            }

            return { data: data as T, error };
        } catch (error) {
            console.error(`Upsert error on ${table}:`, error);
            return { data: null, error };
        }
    }

    /**
     * Count records with optional filters
     */
    static async count<T>(
        table: string,
        filters?: QueryFilter<T>[]
    ): Promise<{ count: number; error: any }> {
        try {
            let query = supabase.from(table).select('*', { count: 'exact', head: true });

            // Apply filters
            if (filters && filters.length > 0) {
                filters.forEach((filter) => {
                    const column = String(filter.column);
                    query = query.eq(column, filter.value);
                });
            }

            const { count, error } = await query;

            return { count: count || 0, error };
        } catch (error) {
            console.error(`Count error on ${table}:`, error);
            return { count: 0, error };
        }
    }

    /**
     * Check if a record exists
     */
    static async exists<T>(
        table: string,
        filters: QueryFilter<T>[]
    ): Promise<boolean> {
        const { count } = await this.count(table, filters);
        return count > 0;
    }

    /**
     * Execute a raw SQL query (use with caution)
     */
    static async executeRaw(sql: string, params?: any[]): Promise<any> {
        try {
            const { data, error } = await supabase.rpc('execute_sql', {
                query: sql,
                params,
            });

            if (error) {
                console.error('Raw SQL execution error:', error);
                return { data: null, error };
            }

            return { data, error: null };
        } catch (error) {
            console.error('Raw SQL error:', error);
            return { data: null, error };
        }
    }
}

// ============================================================================
// Convenience methods for specific tables
// ============================================================================

export const db = {
    // Users
    users: {
        getById: (id: string) => DatabaseService.getById('users', id),
        getByEmail: async (email: string) => {
            const { data } = await DatabaseService.query('users', {
                filters: [{ column: 'email', operator: 'eq', value: email }],
            });
            return data?.[0] || null;
        },
        create: (user: any) => DatabaseService.insert('users', user),
        update: (id: string, updates: any) => DatabaseService.update('users', id, updates),
        delete: (id: string) => DatabaseService.delete('users', id),
    },

    // Drivers
    drivers: {
        getById: (id: string) => DatabaseService.getById('drivers', id),
        getByUserId: async (userId: string) => {
            const { data } = await DatabaseService.query('drivers', {
                filters: [{ column: 'user_id', operator: 'eq', value: userId }],
            });
            return data?.[0] || null;
        },
        create: (driver: any) => DatabaseService.insert('drivers', driver),
        update: (id: string, updates: any) => DatabaseService.update('drivers', id, updates),
        getPending: () =>
            DatabaseService.query('drivers', {
                filters: [{ column: 'verification_status', operator: 'eq', value: 'pending' }],
            }),
    },

    // Trips
    trips: {
        getById: (id: string) => DatabaseService.getById('trips', id),
        getByDriver: (driverId: string) =>
            DatabaseService.query('trips', {
                filters: [{ column: 'driver_id', operator: 'eq', value: driverId }],
                orderBy: { column: 'departure_time', ascending: false },
            }),
        getActive: () =>
            DatabaseService.query('trips', {
                filters: [{ column: 'status', operator: 'in', value: ['scheduled', 'in_progress'] }],
            }),
        create: (trip: any) => DatabaseService.insert('trips', trip),
        update: (id: string, updates: any) => DatabaseService.update('trips', id, updates),
        delete: (id: string) => DatabaseService.delete('trips', id),
    },

    // Bookings
    bookings: {
        getById: (id: string) => DatabaseService.getById('bookings', id),
        getByPassenger: (passengerId: string) =>
            DatabaseService.query('bookings', {
                filters: [{ column: 'passenger_id', operator: 'eq', value: passengerId }],
                orderBy: { column: 'created_at', ascending: false },
            }),
        getByTrip: (tripId: string) =>
            DatabaseService.query('bookings', {
                filters: [{ column: 'trip_id', operator: 'eq', value: tripId }],
            }),
        create: (booking: any) => DatabaseService.insert('bookings', booking),
        update: (id: string, updates: any) => DatabaseService.update('bookings', id, updates),
    },

    // Wallets
    wallets: {
        getByUserId: async (userId: string) => {
            const { data } = await DatabaseService.query('wallets', {
                filters: [{ column: 'user_id', operator: 'eq', value: userId }],
            });
            return data?.[0] || null;
        },
        create: (wallet: any) => DatabaseService.insert('wallets', wallet),
        update: (id: string, updates: any) => DatabaseService.update('wallets', id, updates),
    },

    // Notifications
    notifications: {
        getByUserId: (userId: string, unreadOnly = false) => {
            const filters: any[] = [{ column: 'user_id', operator: 'eq', value: userId }];
            if (unreadOnly) {
                filters.push({ column: 'is_read', operator: 'eq', value: false });
            }
            return DatabaseService.query('notifications', {
                filters,
                orderBy: { column: 'created_at', ascending: false },
            });
        },
        create: (notification: any) => DatabaseService.insert('notifications', notification),
        markAsRead: (id: string) =>
            DatabaseService.update('notifications', id, { is_read: true }),
        markAllAsRead: (userId: string) =>
            DatabaseService.updateMany('notifications', [
                { column: 'user_id', operator: 'eq', value: userId } as any,
            ], { is_read: true }),
    },

    // Saved Places
    savedPlaces: {
        getByUserId: (userId: string) =>
            DatabaseService.query('saved_places', {
                filters: [{ column: 'user_id', operator: 'eq', value: userId }],
            }),
        create: (place: any) => DatabaseService.insert('saved_places', place),
        update: (id: string, updates: any) => DatabaseService.update('saved_places', id, updates),
        delete: (id: string) => DatabaseService.delete('saved_places', id),
    },

    // Emergency Contacts
    emergencyContacts: {
        getByUserId: (userId: string) =>
            DatabaseService.query('emergency_contacts', {
                filters: [{ column: 'user_id', operator: 'eq', value: userId }],
            }),
        create: (contact: any) => DatabaseService.insert('emergency_contacts', contact),
        update: (id: string, updates: any) =>
            DatabaseService.update('emergency_contacts', id, updates),
        delete: (id: string) => DatabaseService.delete('emergency_contacts', id),
    },
};
