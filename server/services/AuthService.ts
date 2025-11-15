import { supabase } from './supabase';
import { userService } from './UserService';
import { eventBus } from './EventBus';
import crypto from 'crypto';

export class AuthService {
  private useSupabase() {
    return process.env.VITE_SUPABASE_URL && !process.env.VITE_SUPABASE_URL.includes('placeholder');
  }

  async signUpWithEmail(email: string, password: string, fullName: string) {
    if (!this.useSupabase()) {
      const userId = crypto.randomUUID();
      const user = await userService.createUser({
        id: userId,
        email,
        fullName,
        role: 'passenger',
      });
      
      return {
        user: {
          id: user.id,
          email: user.email,
          user_metadata: { full_name: fullName }
        },
        session: {
          access_token: `dev-token-${userId}`,
          user: { id: userId, email }
        }
      };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        }
      }
    });

    if (error) throw new Error(error.message);

    if (data.user) {
      await userService.createUser({
        id: data.user.id,
        email: data.user.email!,
        fullName,
        role: 'passenger',
      });
      eventBus.emit('user:created', data.user.id);
    }

    return data;
  }

  async signInWithEmail(email: string, password: string) {
    if (!this.useSupabase()) {
      const user = await userService.getUserByEmail(email);
      if (!user) {
        throw new Error('User not found');
      }
      
      return {
        user: {
          id: user.id,
          email: user.email,
          user_metadata: { full_name: user.fullName, role: user.role }
        },
        session: {
          access_token: `dev-token-${user.id}`,
          user: { id: user.id, email: user.email }
        }
      };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw new Error(error.message);
    return data;
  }

  async signOut() {
    if (!this.useSupabase()) {
      return { success: true };
    }

    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  }

  async sendOTP(phone: string) {
    if (!this.useSupabase()) {
      throw new Error('OTP authentication requires Supabase configuration');
    }

    const { data, error } = await supabase.auth.signInWithOtp({
      phone,
    });

    if (error) throw new Error(error.message);
    return data;
  }

  async verifyOTP(phone: string, token: string) {
    if (!this.useSupabase()) {
      throw new Error('OTP authentication requires Supabase configuration');
    }

    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });

    if (error) throw new Error(error.message);
    return data;
  }

  async getCurrentUser() {
    if (!this.useSupabase()) {
      throw new Error('This endpoint requires authentication configuration');
    }

    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) throw new Error(error.message);
    return user;
  }

  async refreshSession() {
    if (!this.useSupabase()) {
      throw new Error('Session refresh requires Supabase configuration');
    }

    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) throw new Error(error.message);
    return data;
  }

  async verifyJWT(token: string) {
    if (!this.useSupabase()) {
      if (token.startsWith('dev-token-')) {
        const userId = token.replace('dev-token-', '');
        return { user: { id: userId }, error: null };
      }
      return { user: null, error: { message: 'Invalid token' } };
    }

    return supabase.auth.getUser(token);
  }
}

export const authService = new AuthService();
