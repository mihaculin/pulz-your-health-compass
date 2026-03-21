import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<{ error: Error | null; needsEmailConfirmation?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        localStorage.removeItem("pulz_pending_confirmation");
        localStorage.removeItem("pulz_pending_email");
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        localStorage.removeItem("pulz_pending_confirmation");
        localStorage.removeItem("pulz_pending_email");
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) return { error };

    if (data.user) {
      const { error: profileErr } = await supabase
        .from("profiles")
        .upsert({ user_id: data.user.id, full_name: fullName }, { onConflict: "user_id" });
      if (profileErr) console.error("[signUp] profiles upsert", profileErr);

      const { error: cpErr } = await supabase
        .from("client_profiles")
        .upsert({ id: data.user.id }, { onConflict: "id" });
      if (cpErr) console.error("[signUp] client_profiles upsert", cpErr);
    }

    if (!data.session) {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        const msg = signInError.message.toLowerCase();
        if (msg.includes("email not confirmed") || msg.includes("confirm")) {
          return { error: null, needsEmailConfirmation: true };
        }
        return { error: signInError as Error };
      }
    }

    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    if (user) {
      localStorage.removeItem(`pulz_profile_v1_${user.id}`);
    }
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    localStorage.removeItem("pulz_onboarding_completed");
    localStorage.removeItem("pulz_pending_confirmation");
    localStorage.removeItem("pulz_pending_email");
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
