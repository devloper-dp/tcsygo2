import { supabase } from './supabase';
import { db } from '../db';
import { users, drivers, trips, bookings, payments } from '@shared/schema';
import { count, sql, eq, and, gte } from 'drizzle-orm';

export class AdminService {
  async getSystemStats() {
    const useLocalDb = !process.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL.includes('placeholder');
    
    if (useLocalDb) {
      const [totalUsers] = await db.select({ count: count() }).from(users);
      const [totalDrivers] = await db.select({ count: count() }).from(drivers);
      const [totalTrips] = await db.select({ count: count() }).from(trips);
      const [totalBookings] = await db.select({ count: count() }).from(bookings);
      
      const [revenueResult] = await db
        .select({ total: sql<number>`COALESCE(SUM(${payments.platformFee}), 0)` })
        .from(payments)
        .where(eq(payments.status, 'success'));

      const [pendingDrivers] = await db
        .select({ count: count() })
        .from(drivers)
        .where(eq(drivers.verificationStatus, 'pending'));

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [activeUsers] = await db
        .select({ count: count() })
        .from(users)
        .where(gte(users.updatedAt, thirtyDaysAgo));

      return {
        totalUsers: totalUsers?.count || 0,
        totalDrivers: totalDrivers?.count || 0,
        totalTrips: totalTrips?.count || 0,
        totalBookings: totalBookings?.count || 0,
        totalRevenue: revenueResult?.total || 0,
        pendingVerifications: pendingDrivers?.count || 0,
        activeUsersLast30Days: activeUsers?.count || 0,
      };
    } else {
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      const { count: totalDrivers } = await supabase
        .from('drivers')
        .select('*', { count: 'exact', head: true });

      const { count: totalTrips } = await supabase
        .from('trips')
        .select('*', { count: 'exact', head: true });

      const { count: totalBookings } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true });

      const { data: revenueData } = await supabase
        .from('payments')
        .select('platform_fee')
        .eq('status', 'success');

      const totalRevenue = revenueData?.reduce(
        (sum, p) => sum + parseFloat(p.platform_fee || '0'),
        0
      ) || 0;

      const { count: pendingVerifications } = await supabase
        .from('drivers')
        .select('*', { count: 'exact', head: true })
        .eq('verification_status', 'pending');

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { count: activeUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('updated_at', thirtyDaysAgo.toISOString());

      return {
        totalUsers: totalUsers || 0,
        totalDrivers: totalDrivers || 0,
        totalTrips: totalTrips || 0,
        totalBookings: totalBookings || 0,
        totalRevenue,
        pendingVerifications: pendingVerifications || 0,
        activeUsersLast30Days: activeUsers || 0,
      };
    }
  }

  async getAllBookings(limit: number = 50, offset: number = 0) {
    const useLocalDb = !process.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL.includes('placeholder');
    
    if (useLocalDb) {
      const allBookings = await db.query.bookings.findMany({
        limit,
        offset,
        with: {
          trip: {
            with: {
              driver: {
                with: {
                  user: true
                }
              }
            }
          }
        },
        orderBy: (bookings, { desc }) => [desc(bookings.createdAt)]
      });

      return allBookings;
    } else {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          trip:trips(*,
            driver:drivers(*,
              user:users(*)
            )
          ),
          passenger:users(*)
        `)
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return data || [];
    }
  }

  async getAllPayments(limit: number = 50, offset: number = 0) {
    const useLocalDb = !process.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL.includes('placeholder');
    
    if (useLocalDb) {
      const allPayments = await db.query.payments.findMany({
        limit,
        offset,
        with: {
          booking: {
            with: {
              trip: true,
              passenger: true
            }
          }
        },
        orderBy: (payments, { desc }) => [desc(payments.createdAt)]
      });

      return allPayments;
    } else {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          booking:bookings(*,
            trip:trips(*),
            passenger:users(*)
          )
        `)
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return data || [];
    }
  }

  async getRecentActivity(days: number = 7) {
    const useLocalDb = !process.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL.includes('placeholder');
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    if (useLocalDb) {
      const recentTrips = await db
        .select({ count: count() })
        .from(trips)
        .where(gte(trips.createdAt, startDate));

      const recentBookings = await db
        .select({ count: count() })
        .from(bookings)
        .where(gte(bookings.createdAt, startDate));

      const recentUsers = await db
        .select({ count: count() })
        .from(users)
        .where(gte(users.createdAt, startDate));

      return {
        newTrips: recentTrips[0]?.count || 0,
        newBookings: recentBookings[0]?.count || 0,
        newUsers: recentUsers[0]?.count || 0,
      };
    } else {
      const { count: newTrips } = await supabase
        .from('trips')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString());

      const { count: newBookings } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString());

      const { count: newUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString());

      return {
        newTrips: newTrips || 0,
        newBookings: newBookings || 0,
        newUsers: newUsers || 0,
      };
    }
  }
}

export const adminService = new AdminService();
