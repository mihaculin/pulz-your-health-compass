import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      // Supabase exchanges the OAuth token from the URL automatically.
      // We just need to read the resulting session.
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        navigate("/", { replace: true });
        return;
      }

      const userId = session.user.id;

      // Check whether this user already has a role
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (!roleRow) {
        // First-time OAuth sign-in — default to "client" and start onboarding.
        // Ensure display name is populated from OAuth provider metadata.
        const fullName = session.user.user_metadata?.full_name
          ?? session.user.user_metadata?.name
          ?? "";

        await Promise.all([
          supabase.from("user_roles").upsert({ user_id: userId, role: "client" }, { onConflict: "user_id" }),
          supabase.from("profiles").upsert({ user_id: userId, full_name: fullName }, { onConflict: "user_id" }),
          supabase.from("client_profiles").upsert({ id: userId }, { onConflict: "id" }),
        ]);

        navigate("/onboarding", { replace: true });
        return;
      }

      if (roleRow.role === "specialist") {
        navigate("/specialist/dashboard", { replace: true });
        return;
      }

      // Client — check whether onboarding is complete
      const { data: cp } = await supabase
        .from("client_profiles")
        .select("intake_survey_completed")
        .eq("id", userId)
        .maybeSingle();

      if (cp?.intake_survey_completed) {
        navigate("/dashboard", { replace: true });
      } else {
        // Ensure row exists before sending to onboarding
        await supabase.from("client_profiles").upsert({ id: userId }, { onConflict: "id" });
        navigate("/onboarding", { replace: true });
      }
    };

    run();
  }, [navigate]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4"
      style={{ background: "hsl(var(--background))" }}
    >
      <span
        className="text-2xl font-heading font-semibold"
        style={{ color: "hsl(var(--primary))" }}
      >
        PULZ
      </span>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: "#b3ecec",
              animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
      <p className="text-sm text-muted-foreground mt-1">Signing you in…</p>
    </div>
  );
}
