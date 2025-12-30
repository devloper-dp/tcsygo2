import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/toast';
import { mapUser } from '@/lib/mapper';

// Replicating shared/schema types since we can't import directly
export const UserRole = {
  PASSENGER: "passenger",
  DRIVER: "driver",
  BOTH: "both"
} as const;

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  profilePhoto?: string | null;
  role: string;
  bio?: string | null;
  verificationStatus?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, phone?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Auth: Initial session check completed', session ? { user: session.user.id, email: session.user.email } : 'No active session');
      setSession(session);
      if (session?.user) {
        console.log('Auth: Session found, fetching profile for', session.user.id);
        fetchUserProfile(session.user.id);
      } else {
        console.log('Auth: No session found, setting loading to false');
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`Auth: state changed [Event: ${event}]`, session ? { user: session.user.id } : 'No session');
      setSession(session);
      if (session?.user) {
        if (!user || user.id !== session.user.id) {
          console.log('Auth: New user or session, fetching profile...', session.user.id);
          fetchUserProfile(session.user.id);
        }
      } else {
        console.log('Auth: No session, clearing user state');
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchUserProfile(userId: string) {
    console.log('Auth: Fetching profile for userId:', userId);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Auth: Error fetching user profile:', error);
        // Don't throw here, just let user be null or partial?
        // Maybe set user to minimal info from session?
      } else {
        console.log('Auth: User profile fetched successfully', data ? { id: data.id, role: data.role } : 'No data');
        setUser(mapUser(data));
      }
    } catch (error) {
      console.error('Auth: Unexpected error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    console.log('Auth: Attempting signIn for', email);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error('Auth: signIn failed', error.message);
        throw error;
      }

      console.log('Auth: signIn successful');
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
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
    console.log('Auth: Attempting signUp for', email, { fullName, phone });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone
          }
        }
      });

      if (error) {
        console.error('Auth: signUp failed', error.message);
        throw error;
      }

      console.log('Auth: signUp successful', { userId: data.user?.id });
      if (data.user) {
        // If session exists (no email confirmation required), create profile
        if (data.session) {
          console.log('Auth: signUp session found, fetching profile...');
          // Profile is created by DB trigger
          await fetchUserProfile(data.user.id);
        }

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
    console.log('Auth: Attempting signOut');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Auth: signOut error', error);
        throw error;
      }
      console.log('Auth: signOut successful');
      setUser(null);
    } catch (e) {
      console.error('Auth: signOut exception', e);
    }
  }

  async function updateProfile(updates: Partial<User>) {
    if (!user) throw new Error('No user logged in');

    try {
      const dbUpdates: any = { ...updates };
      // Map camelCase to snake_case for DB
      if (updates.fullName) {
        dbUpdates.full_name = updates.fullName;
        delete dbUpdates.fullName;
      }
      if (updates.profilePhoto) {
        dbUpdates.profile_photo = updates.profilePhoto;
        delete dbUpdates.profilePhoto;
      }
      // verification_status etc. if needed

      const { data, error } = await supabase
        .from('users')
        .update(dbUpdates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      setUser(mapUser(data));
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

  async function resetPassword(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);

      if (error) throw error;

      toast({
        title: "Password reset email sent",
        description: "Check your email for the reset link.",
      });
    } catch (error: any) {
      toast({
        title: "Password reset failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  }

  async function updatePassword(newPassword: string) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Password update failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  }

  async function refreshSession() {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;

      if (data.session?.user) {
        await fetchUserProfile(data.session.user.id);
      }
    } catch (error: any) {
      console.error('Session refresh failed:', error);
      // Optionally sign out if refresh fails
      await signOut();
    }
  }

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    resetPassword,
    updatePassword,
    refreshSession
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
