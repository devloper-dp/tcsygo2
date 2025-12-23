import { createContext, useContext, useEffect, useState } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { User, UserRole } from '@shared/schema';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  supabaseUser: SupabaseUser | null;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        // Only fetch if we don't have it or it's different
        if (!user || user.id !== session.user.id) {
          await fetchUserProfile(session.user.id);
        }
      } else {
        setUser(null);
        setLoading(false); // Ensure loading is false on logout
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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

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
        if (data.session) {
          const newUser: User = {
            id: data.user.id,
            email: email,
            fullName: fullName,
            role: UserRole.PASSENGER,
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
              description: "Your account was created but we couldn't set up your profile. Please update it in settings.",
              variant: "warning" as any,
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
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (e) {
      console.error(e);
    }
  }

  async function updateProfile(updates: Partial<User>) {
    if (!user) throw new Error('No user logged in');

    try {
      const dbUpdates: any = { ...updates };
      if (updates.fullName) {
        dbUpdates.full_name = updates.fullName;
        delete dbUpdates.fullName;
      }
      if (updates.profilePhoto) {
        dbUpdates.profile_photo = updates.profilePhoto;
        delete dbUpdates.profilePhoto;
      }
      if (updates.verificationStatus) {
        dbUpdates.verification_status = updates.verificationStatus;
        delete dbUpdates.verificationStatus;
      }

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
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

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
    supabaseUser,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    resetPassword,
    updatePassword,
    refreshSession,
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
