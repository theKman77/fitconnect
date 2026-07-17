import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, isBackendConfigured } from '@/lib/supabase';
import { demoProfile } from '@/data/seed';
import type { Profile } from '@/types/domain';

interface AuthValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
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
}

const AuthContext = createContext<AuthValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

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
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) setProfile(data as Profile);
    setLoading(false);
  }

  const value: AuthValue = useMemo(
    () => ({
      session,
      profile: isBackendConfigured ? profile : demoProfileState,
      loading,
      isDemo: !isBackendConfigured,

      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message };
      },

      async signUp(email, password, fullName) {
        const { data, error } = await supabase.auth.signUp({
          email,
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
        if (!session) return;
        const { data } = await supabase
          .from('profiles')
          .update(patch)
          .eq('id', session.user.id)
          .select()
          .single();
        if (data) setProfile(data as Profile);
      },

      async refreshProfile() {
        if (isBackendConfigured && session) await loadProfile(session.user.id);
      },
    }),
    [session, profile, loading, demoProfileState],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
