import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, isBackendConfigured } from '@/lib/supabase';
import { registerForPush } from '@/lib/push';
import { demoProfile } from '@/data/seed';
import type { Profile } from '@/types/domain';

interface AuthValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  authError: string | null;
  isDemo: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<{ error?: string; needsConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ error?: string }>;
  updatePassword: (password: string) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Demo mode: no backend yet -> behave as a signed-in demo client so the whole
  // app is explorable. Onboarding is skippable via the quiz screen.
  const [demoProfileState, setDemoProfileState] = useState<Profile>({ ...demoProfile, onboarded: false });

  useEffect(() => {
    if (!isBackendConfigured) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadProfile(data.session.user.id);
      else setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) loadProfile(s.user.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function loadProfile(userId: string) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error) {
      setAuthError('Your account is signed in, but its profile could not be loaded.');
      setLoading(false);
      return;
    }
    setAuthError(null);
    if (data) {
      setProfile(data as Profile);
      // Register this device for push (safe no-op on web/simulator).
      registerForPush(userId);
    }
    setLoading(false);
  }

  const value: AuthValue = useMemo(
    () => ({
      session,
      profile: isBackendConfigured ? profile : demoProfileState,
      loading,
      authError,
      isDemo: !isBackendConfigured,

      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        return { error: error?.message };
      },

      async signUp(email, password, fullName) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName } },
        });
        // No session after a successful sign-up means the project requires
        // email confirmation before the first sign-in.
        return { error: error?.message, needsConfirmation: !error && !data.session };
      },

      async signOut() {
        if (isBackendConfigured) await supabase.auth.signOut();
        else setDemoProfileState({ ...demoProfile, onboarded: false });
      },

      async updateProfile(patch) {
        if (!isBackendConfigured) {
          setDemoProfileState((p) => ({ ...p, ...patch }));
          return;
        }
        if (!session) throw new Error('Sign in before updating your profile.');
        const { data, error } = await supabase
          .from('profiles')
          .update(patch)
          .eq('id', session.user.id)
          .select()
          .single();
        if (error) throw error;
        if (data) setProfile(data as Profile);
      },

      async refreshProfile() {
        if (isBackendConfigured && session) await loadProfile(session.user.id);
      },

      async sendPasswordReset(email) {
        const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined;
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
        return { error: error?.message };
      },

      async updatePassword(password) {
        const { error } = await supabase.auth.updateUser({ password });
        return { error: error?.message };
      },
    }),
    [session, profile, loading, authError, demoProfileState],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
