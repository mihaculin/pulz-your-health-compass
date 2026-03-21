import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "client" | "specialist" | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: "client" | "specialist"
  ) => Promise<{ error: Error | null; needsEmailConfirmation?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    setRole((data?.role as AppRole) ?? null);
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          localStorage.removeItem("pulz_pending_confirmation");
          localStorage.removeItem("pulz_pending_email");
          // Use setTimeout to avoid Supabase deadlock
          setTimeout(() => fetchRole(session.user.id), 0);
        } else {
          setRole(null);
        }
        setLoading(false);
      }
    );

    // THEN check existing session (with refresh fallback)
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      let nextSession = session ?? null;

      if (!nextSession) {
        const { data: refreshData } = await supabase.auth.refreshSession();
        nextSession = refreshData.session ?? null;
      }

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (nextSession?.user) {
        localStorage.removeItem("pulz_pending_confirmation");
        localStorage.removeItem("pulz_pending_email");
        fetchRole(nextSession.user.id);
      }
      setLoading(false);
    };

    init();

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, selectedRole: "client" | "specialist") => {
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
      // Insert role
      await supabase.from("user_roles").insert({
        user_id: data.user.id,
        role: selectedRole,
      });

      // Update profile name (row created by DB trigger on auth.users)
      const { error: profileErr } = await supabase
        .from("profiles")
        .upsert({ user_id: data.user.id, full_name: fullName }, { onConflict: "user_id" });
      if (profileErr) console.error("[signUp] profiles upsert", profileErr);

      // Create role-specific profile
      if (selectedRole === "client") {
        const { error: cpErr } = await supabase
          .from("client_profiles")
          .upsert({ id: data.user.id }, { onConflict: "id" });
        if (cpErr) console.error("[signUp] client_profiles upsert", cpErr);
      } else {
        const { error: spErr } = await supabase
          .from("specialist_profiles")
          .upsert({ id: data.user.id }, { onConflict: "id" });
        if (spErr) console.error("[signUp] specialist_profiles upsert", spErr);
      }

      setRole(selectedRole);
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
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    localStorage.removeItem("pulz_onboarding_completed");
    localStorage.removeItem("pulz_pending_confirmation");
    localStorage.removeItem("pulz_pending_email");
  };

  return (
    <AuthContext.Provider value={{ user, session, role, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
