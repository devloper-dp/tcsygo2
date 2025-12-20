import { createContext, useContext, useEffect, useState } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { User } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  supabaseUser: SupabaseUser | null; // Keeping strictly for compatibility type-wise, but might be mocked or null in local dev
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, phone?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      // Check if we have a token
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setLoading(false);
        return;
      }

      // Try to fetch current user
      const res = await apiRequest('GET', '/api/auth/me');
      const userData = await res.json();

      // The API returns the Supabase user object structure under 'user' key or directly?
      // AuthService.getCurrentUser() returns the User object from Supabase (or mock).
      // Mock: { id, email, user_metadata, ... }
      // Real: { id, email, user_metadata, ... }

      // However, we also need the DB user profile.
      // Usually /api/auth/me returns the supabase user.

      if (userData) {
        setSupabaseUser(userData as SupabaseUser);
        // Now fetch full profile
        await fetchUserProfile(userData.id);
      } else {
        throw new Error("No user data");
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Clear invalid token
      localStorage.removeItem('auth_token');
      setLoading(false);
    }
  }

  async function fetchUserProfile(userId: string) {
    try {
      const res = await apiRequest('GET', `/api/users/${userId}`);
      const profile = await res.json();
      setUser(profile);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    try {
      const res = await apiRequest('POST', '/api/auth/login', { email, password });
      const data = await res.json();

      // Expecting { user, session }
      if (data.session?.access_token) {
        localStorage.setItem('auth_token', data.session.access_token);
        setSupabaseUser(data.user);
        await fetchUserProfile(data.user.id);
        toast({
          title: "Welcome back!",
          description: "You have successfully signed in.",
        });
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Please check your credentials",
        variant: "destructive",
      });
      throw error;
    }
  }

  async function signUp(email: string, password: string, fullName: string, phone?: string) {
    try {
      const res = await apiRequest('POST', '/api/auth/signup', {
        email,
        password,
        fullName
      });
      const data = await res.json();

      if (data.session?.access_token) {
        localStorage.setItem('auth_token', data.session.access_token);
        setSupabaseUser(data.user);

        // Profile is already created by the endpoint, but let's fetch it to be sure and set state
        await fetchUserProfile(data.user.id);

        toast({
          title: "Account created",
          description: "Welcome to TripSync!",
        });
      }
    } catch (error: any) {
      toast({
        title: "Signup failed",
        description: error.message || "Could not create account",
        variant: "destructive",
      });
      throw error;
    }
  }

  async function signOut() {
    try {
      await apiRequest('POST', '/api/auth/logout');
    } catch (e) {
      // Ignore
    }
    localStorage.removeItem('auth_token');
    setUser(null);
    setSupabaseUser(null);
    window.location.href = '/login';
  }

  async function updateProfile(updates: Partial<User>) {
    if (!user) throw new Error('No user logged in');

    try {
      const res = await apiRequest('PUT', `/api/users/${user.id}`, updates);
      const updatedUser = await res.json();
      setUser(updatedUser);
      toast({
        title: "Profile updated",
        description: "Your changes have been saved.",
      });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  }

  const value = {
    user,
    supabaseUser,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
