import { supabase } from './supabase';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { eventBus } from './EventBus';
import type { InsertUser, User } from '@shared/schema';

export class UserService {
  async createUser(userData: InsertUser): Promise<User> {
    const useLocalDb = !process.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL.includes('placeholder');
    
    if (useLocalDb) {
      const [user] = await db
        .insert(users)
        .values(userData as any)
        .returning();
      
      eventBus.emit('user:created', user.id);
      return user;
    } else {
      const { data, error } = await supabase
        .from('users')
        .insert(userData)
        .select()
        .single();

      if (error) throw new Error(error.message);
      
      eventBus.emit('user:created', data.id);
      return data;
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    const useLocalDb = !process.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL.includes('placeholder');
    
    if (useLocalDb) {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));
      
      return user || null;
    } else {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw new Error(error.message);
      }

      return data;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const useLocalDb = !process.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL.includes('placeholder');
    
    if (useLocalDb) {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));
      
      return user || null;
    } else {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw new Error(error.message);
      }

      return data;
    }
  }

  async updateUserProfile(userId: string, updates: Partial<User>): Promise<User> {
    const useLocalDb = !process.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL.includes('placeholder');
    
    if (useLocalDb) {
      const [user] = await db
        .update(users)
        .set({ ...updates, updatedAt: new Date() } as any)
        .where(eq(users.id, userId))
        .returning();
      
      if (!user) throw new Error('User not found');
      
      eventBus.emit('user:updated', userId);
      return user;
    } else {
      const { data, error } = await supabase
        .from('users')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      
      eventBus.emit('user:updated', userId);
      return data;
    }
  }

  async switchRole(userId: string, newRole: string): Promise<void> {
    await this.updateUserProfile(userId, { role: newRole });
    eventBus.emit('user:role_changed', { userId, newRole });
  }

  async uploadProfilePhoto(userId: string, photoUrl: string): Promise<void> {
    await this.updateUserProfile(userId, { profilePhoto: photoUrl });
  }

  async updateVerificationStatus(userId: string, status: string): Promise<void> {
    await this.updateUserProfile(userId, { verificationStatus: status });
    eventBus.emit('user:verification_updated', { userId, status });
  }

  async getAllUsers(limit: number = 50, offset: number = 0): Promise<User[]> {
    const useLocalDb = !process.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL.includes('placeholder');
    
    if (useLocalDb) {
      const allUsers = await db
        .select()
        .from(users)
        .limit(limit)
        .offset(offset);
      
      return allUsers;
    } else {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .range(offset, offset + limit - 1);

      if (error) throw new Error(error.message);
      return data || [];
    }
  }

  async searchUsers(query: string): Promise<User[]> {
    const useLocalDb = !process.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL.includes('placeholder');
    
    if (useLocalDb) {
      return [];
    } else {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(20);

      if (error) throw new Error(error.message);
      return data || [];
    }
  }
}

export const userService = new UserService();
