import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/toast';

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
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        if (!user || user.id !== session.user.id) {
          fetchUserProfile(session.user.id);
        }
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchUserProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        // Don't throw here, just let user be null or partial?
        // Maybe set user to minimal info from session?
      } else {
        setUser(data);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

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

      if (error) throw error;

      if (data.user) {
        // If session exists (no email confirmation required), create profile
        if (data.session) {
          const newUser: User = {
            id: data.user.id,
            email: email,
            fullName: fullName,
            role: 'passenger',
            phone: phone || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          const dbUser = {
            id: newUser.id,
            email: newUser.email,
            full_name: newUser.fullName,
            role: newUser.role,
            phone: newUser.phone,
            verification_status: 'pending',
          };

          const { error: profileError } = await supabase.from('users').upsert(dbUser);
          if (profileError) {
            console.error("Profile creation failed:", profileError);
            toast({
              title: "Profile setup incomplete",
              description: "Account created, but profile setup failed. Please update in settings.",
              variant: "destructive",
            });
          } else {
            setUser(newUser);
          }
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
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
    } catch (e) {
      console.error(e);
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

      const updatedUser: User = {
        ...user,
        ...updates
      };

      if (data) {
        // Update with actual returned data if specific fields changed
        updatedUser.fullName = data.full_name;
        updatedUser.profilePhoto = data.profile_photo;
      }

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
