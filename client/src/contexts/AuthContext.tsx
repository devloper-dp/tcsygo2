import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { User, UserRole } from '@shared/schema';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { mapUser } from '@/lib/mapper';

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


  const userRef = useRef<User | null>(null);
  const fetchingUserIdRef = useRef<string | null>(null);
  const fetchPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    // Single source of truth for initial session and auth changes
    let isMounted = true;

    const initializeAuth = async () => {
      console.log('Auth: Initializing...');
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (session?.user) {
          console.log('Auth: Session found on init', { id: session.user.id, email: session.user.email });
          setSupabaseUser(session.user);
          await fetchUserProfile(session.user.id, session.access_token);
        } else {
          console.log('Auth: No initial session');
          setLoading(false);
        }
      } catch (err) {
        console.error('Auth: Init failed', err);
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      console.log(`Auth: state changed [Event: ${event}]`, session ? { user: session.user.id } : 'No session');

      setSupabaseUser(session?.user ?? null);

      if (session?.user) {
        // Only fetch if we don't have it or it's different and NOT already fetching
        if (userRef.current?.id !== session.user.id) {
          console.log('Auth: Transition to new user, fetching profile...', session.user.id);
          await fetchUserProfile(session.user.id, session.access_token);
        } else {
          // Already have the user, ensure we're not stuck in loading
          setLoading(false);
        }
      } else {
        if (userRef.current) {
          console.log('Auth: No session, clearing user state');
          setUser(null);
          userRef.current = null;
        }
        setLoading(false);
      }
    });

    // Safety timeout: If initialization takes too long, force loading to false
    // Safety timeout: If initialization takes too long, force loading to false
    const initTimeout = setTimeout(() => {
      setLoading(currentLoading => {
        if (isMounted && currentLoading) {
          console.warn('Auth: Initialization safety timeout reached');
          return false;
        }
        return currentLoading;
      });
    }, 10000); // 10 seconds for initial load

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      clearTimeout(initTimeout);
    };
  }, []);

  // Safety net: If user is present but loading is stuck at true, set loading to false
  useEffect(() => {
    if (user && loading) {
      console.log('Auth: Safety net - user present but loading stuck, fixing...');
      setLoading(false);
    }
  }, [user, loading]);

  async function fetchUserProfile(userId: string, accessToken?: string): Promise<void> {

    // Deduplication
    if (fetchingUserIdRef.current === userId && fetchPromiseRef.current) {
      console.log('Auth: Profile fetch already in progress, joining existing request for', userId);
      return fetchPromiseRef.current;
    }

    console.log('Auth: Fetching profile for userId:', userId);
    fetchingUserIdRef.current = userId;

    const fetchTask = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
          console.error('Auth: Missing Supabase environment variables');
          return;
        }

        let token = accessToken;
        if (!token) {
          // Get fresh session for the token if not provided
          const { data: { session } } = await supabase.auth.getSession();
          token = session?.access_token;
        }

        if (!token) {
          console.warn('Auth: No session token available for profile fetch');
          return;
        }

        // Setup abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500); // 2.5s timeout to ensure fallback triggers fast

        try {
          // Direct REST API call to avoid SDK timeouts
          const response = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${userId}&select=*`, {
            headers: {
              'apikey': supabaseAnonKey,
              'Authorization': `Bearer ${token}`
            },
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const text = await response.text();
            throw new Error(`Profile fetch failed: ${response.status} ${text}`);
          }

          const json = await response.json();
          const data = json?.[0];

          if (data) {
            console.log('Auth: User profile fetched successfully via Direct Fetch', { id: data.id, role: data.role });
            const mappedUser = mapUser(data);
            setUser(mappedUser);
            userRef.current = mappedUser;
          } else {
            console.warn('Auth: No profile data found for user', userId);
          }
        } catch (fetchError: any) {
          if (fetchError.name === 'AbortError') {
            console.error('Auth: Profile fetch timed out');
          } else {
            console.error('Auth: Profile fetch error', fetchError);
          }
        }

      } catch (error: any) {
        console.error('Auth: Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    const promise = fetchTask().finally(() => {
      // Clear refs if we are still the current fetcher
      if (fetchingUserIdRef.current === userId) {
        fetchingUserIdRef.current = null;
        fetchPromiseRef.current = null;
      }
    });

    fetchPromiseRef.current = promise;
    return promise;
  }

  async function signIn(email: string, password: string) {
    console.log('Auth: Attempting signIn for', email);
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Auth: signIn failed', error.message);
        throw error;
      }

      console.log('Auth: signIn successful');

      // Explicitly fetch profile and wait for it before continuing
      // Explicitly fetch profile and wait for it before continuing, BUT with a timeout limit
      if (data.session?.user) {
        const userId = data.session.user.id;
        // Create a promise race: fetch vs timeout to ensure we don't hang indefinitely 
        // even without the fallback logic, strict timeout from fetchUserProfile should handle it,
        // but keeping a safety race at signIn level is still good practice or I can simplify it too?
        // User asked to remove "Race Condition Prevention ... fetchInProgress".
        // I will simplify to just await fetchUserProfile.
        await fetchUserProfile(userId, data.session.access_token);
      }

      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
    } catch (error: any) {
      setLoading(false);
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
        if (data.session) {
          console.log('Auth: signUp session found, fetching profile...');
          // Profile is created by DB trigger, we just need to fetch it or wait for fetchUserProfile
          await fetchUserProfile(data.user.id, data.session.access_token);
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
      await supabase.auth.signOut();
      console.log('Auth: signOut successful, redirecting to login');
      window.location.href = '/login';
    } catch (e) {
      console.error('Auth: signOut error', e);
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
      if (updates.phone) {
        dbUpdates.phone = updates.phone;
        // delete dbUpdates.phone; // phone is already correct key? No, mapUser uses phone. wait.
        // Schema: phone. DB: phone (from mapUser "phone: data.phone"). 
        // Wait, mapUser says: phone: data.phone. 
        // Let's check Schema.ts lines 41-61. User interface has phone.
        // Supabase DB columns are snake_case usually.
        // Let's check mapUser again.
        // mapUser line 9: phone: data.phone.
        // Ah, if the DB column is `phone`, then `dbUpdates.phone = updates.phone` is correct.
        // And we should delete the camelCase one if it was different, but here key is same.
        // However, updates comes from Partial<User>, which has `phone`.
        // dbUpdates is `any = { ...updates }`.
        // so dbUpdates has `phone`.
        // If DB column is `phone`, we don't need to do anything for phone if keys match.
        // BUT, `fullName` maps to `full_name`.
        // `profilePhoto` maps to `profile_photo`.
        // `verificationStatus` maps to `verification_status`.
        // `bio` maps to `bio` (mapUser line 12: bio: data.bio).
        // `phone` maps to `phone` (mapUser line 9: phone: data.phone).
        // So for bio and phone, we actually DON'T need to rename them if the input object `updates` already has them as `bio` and `phone` AND the DB expects `bio` and `phone`.
        // Wait, `dbUpdates` starts as a copy of `updates`.
        // If `updates` has `phone`, `dbUpdates` has `phone`.
        // If DB column IS `phone`, then we are good.
        // If DB column is `phone_number`, then we need to rename.
        // mapUser: `phone: data.phone`. This implies DB column is `phone`.
        // mapUser: `bio: data.bio`. This implies DB column is `bio`.
        // So actually, I don't need to add special handling for phone and bio IF they are already correct.
        // BUT, I should check if `updates` contains them and if they need to be preserved.
        // The existing code does `const dbUpdates: any = { ...updates };`
        // Then it renames `fullName` -> `full_name` and deletes `fullName`.
        // If I pass `phone` in `updates`, `dbUpdates` has `phone`.
        // So if DB column is `phone`, it works automatically.
        // So why did I think I need to change AuthContext?
        // Because I wanted to be SURE.
        // Let's verify `mapUser` again in `file:///e:/Downloads/TCSYGO2/client/src/lib/mapper.ts`
        // Line 9: `phone: data.phone,`
        // Line 12: `bio: data.bio,`
        // So yes, DB columns are `phone` and `bio`.
        // So `AuthContext.tsx` actually supports `phone` and `bio` implicitly because `dbUpdates` spreads `updates`.
        // Wait, `updateProfile` in `AuthContext` takes `updates: Partial<User>`.
        // `User` has `phone` and `bio`.
        // So if I call `updateProfile({ phone: '...' })`, `dbUpdates` will have `phone`.
        // And it will be sent to Supabase.
        // So `AuthContext.tsx` MIGHT NOT need changes for `phone` and `bio`.
        // EXCEPT if there are explicitly blocked or filtered fields? No.
        // Wait, look at line 263: `const dbUpdates: any = { ...updates };`
        // It copies everything.
        // Then it renames the ones that mismatch.
        // So `phone` and `bio` are ALREADY supported?
        // Let's re-read `AuthContext.tsx`.
        // Lines 263-275 handle renames.
        // Then line 279: `.update(dbUpdates)`
        // So yes, it should work.
        // BUT, `User` interface in `schema.ts`:
        // 46:   phone?: string | null;
        // 49:   bio?: string | null;
        // So if I pass `phone` and `bio`, they go through.
        // So maybe I don't need to touch `AuthContext.tsx`?
        // Let's double check if I missed something.
        // Does `User` have `phone`? Yes.
        // Does `mapUser` map `phone` to `phone`? Yes.
        // So Supabase has `phone`.
        // So `AuthContext` is fine?
        // Let's verifying `Profile.tsx` logic again.
        // `Profile.tsx` uses `updateProfileMutation`.
        // It calls `supabase.from('users').update(...)`.
        // I want to change it to `useAuth().updateProfile(...)`.
        // So if `AuthContext` already works, I just need to update `Profile.tsx`.
        //
        // WAIT.
        // In `Profile.tsx`:
        // line 112: `full_name: data.fullName,`
        // line 113: `phone: data.phone,`
        // line 114: `bio: data.bio`
        //
        // If I switch to `updateProfile`, I will pass `{ fullName, phone, bio }`.
        // `AuthContext` will:
        // 1. `dbUpdates = { fullName, phone, bio }`
        // 2. `dbUpdates.full_name = fullName`, `delete fullName` -> `{ full_name, phone, bio }`
        // 3. `update(dbUpdates)` -> updates `full_name`, `phone`, `bio`.
        //
        // This seems correct.
        //
        // However, I previously thought I needed to update `AuthContext`.
        // Maybe I just wanted to be explicit?
        // Or maybe I am paranoid.
        //
        // Actually, looking at `AuthContext.tsx` again.
        // It does NOT explicitly filter out unknown fields.
        // `const dbUpdates: any = { ...updates };`
        // So if `updates` has 'foo', it will send 'foo' to Supabase, which might error if column doesn't exist.
        // But `Partial<User>` ensures we only pass User fields.
        // `User` has `createdAt`, `updatedAt`, `id`, `email`, `role`, etc.
        // If we accidentally pass those, we might try to update them.
        // `updateProfile` takes `Partial<User>`.
        //
        // So, if I proceed with modifying `Profile.tsx` ONLY, it should work IF my assumption about `phone` and `bio` column names is correct.
        // `mapUser` is the strong evidence.
        //
        // Let's just double check `mapUser` output again.
        // `Step Id: 13`.
        // Line 9: `phone: data.phone`
        // Line 12: `bio: data.bio`
        //
        // Yes.
        //
        // So `AuthContext.tsx` logic:
        // `if (updates.fullName)` ...
        // It does NOT check for `phone` or `bio`, so they are passed as is.
        // Which is `phone` and `bio`.
        // Which matches DB columns.
        //
        // IMPLEMENTATION DECISION:
        // I will SKIP updating `AuthContext.tsx` because it already supports `phone` and `bio` via strict copying.
        // I will ONLY refactor `Profile.tsx`.

        // WAIT! I wrote in the plan "Update updateProfile function to include conditional checks mapping phone and bio to their DB counterparts (if different) or just passing them through."
        // And "AuthContext.ts updateProfile handles fullName, profilePhoto, verificationStatus. It does NOT handle phone or bio!"
        // I was wrong in the analysis that it *needs* handling if the names result in same keys.
        // BUT, explicit handling is cleaner if we want to support mapping.
        // But since mapping is 1:1, it works.
        //
        // HOWEVER, `Profile.tsx` `handleSaveProfile` uses `updateProfileMutation`.
        // It calls `mutate({ fullName, phone, bio })`.
        // If I change to `auth.updateProfile({ fullName, phone, bio })`, it works.
        //
        // So I will proceed to **ONLY** update `Profile.tsx`.
        //
        // Correction: I should update the task list to reflect this discovery.
        //
        // NO, actually, let's look at `AuthContext.tsx` closely.
        // It imports `User` from `@shared/schema`.
        // `User` has `phone` and `bio`.
        // `updateProfile` takes `Partial<User>`.
        //
        // If I want to be safe, I can just proceed with `Profile.tsx`.
        //
        // But wait, `delete dbUpdates.fullName`.
        // If I pass `phone` and `bio`, they stay in `dbUpdates`.
        // So `dbUpdates` will have `phone` and `bio`.
        // Using `...updates` copies them.
        // So they are present.
        //
        // OK, I'm confident.
        // I will update `Profile.tsx`.
        // I will also verify `AuthContext` just to be absolutely sure by reading it again?
        // I already read it.
        //
        // Let's modify `Profile.tsx`.

        // I'll start with replacing `updateProfileMutation` with a simple function that uses `updateProfile`.
        // And `uploadPhotoMutation` too.

        // One detail: `Profile.tsx` handles errors and toasts. `AuthContext.updateProfile` ALSO handles toasts (success and error)?
        // Let's check `AuthContext.tsx`.
        // Line 287: `toast({ title: "Profile updated", ... })`
        // Line 292: `toast({ title: "Update failed", ... })`
        //
        // `Profile.tsx` `updateProfileMutation`:
        // onSuccess: `toast({ title: 'Profile updated' ... })`
        // onError: `toast({ title: 'Update failed' ... })`
        //
        // So `AuthContext` duplicates the toast.
        // If I call `auth.updateProfile`, it will show toast.
        // So in `Profile.tsx`, I should REMOVE the local toasts to avoid duplicates.
        //
        // Also `AuthContext.updateProfile` throws error after toast.
        // So `Profile.tsx` needs to catch it?
        // `AuthContext` line 297: `throw error`.
        // So yes.
        //
        // Plan for `Profile.tsx`:
        // 1. Remove `updateProfileMutation` and `uploadPhotoMutation`.
        // 2. Implement `handleSaveProfile` using `updateProfile`.
        // 3. Implement `handlePhotoUpload` using `updateProfile`.
        //
        // Wait, `AuthContext` expects `profilePhoto` URL string.
        // `Profile.tsx` `uploadPhotoMutation` handles the **upload to storage**.
        // `AuthContext.updateProfile` only updates the user record in DB.
        // It does NOT handle file upload.
        //
        // So `Profile.tsx` MUST keep the upload logic.
        // But instead of `supabase.from('users').update(...)`, it should call `updateProfile({ profilePhoto: publicUrl })`.
        //
        // Correct.

        // Let's start editing `Profile.tsx`. I'll use `multi_replace_file_content` to handle both mutations removal and replacement.

        // I will update the task list first to remove the subtask "Update updateProfile to support phone and bio" since it's unnecessary.

        dbUpdates.phone = updates.phone;
        delete dbUpdates.phone;
      }

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
        await fetchUserProfile(data.session.user.id, data.session.access_token);
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
