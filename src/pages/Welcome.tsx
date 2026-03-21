import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Welcome() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) navigate("/dashboard", { replace: true });
    };
    check();
  }, [navigate]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{
        background: "radial-gradient(ellipse at center, hsl(var(--color-aqua)) 0%, hsl(var(--color-lavender-mist)) 70%, hsl(var(--background)) 100%)",
      }}
    >
      <div className="text-center max-w-md space-y-8 slide-up">
        <h1 className="text-5xl font-heading font-semibold" style={{ color: "hsl(var(--primary))" }}>
          PULZ
        </h1>
        <p className="text-lg italic font-heading text-muted-foreground">
          {t("welcome.tagline")}
        </p>

        <div className="flex flex-col gap-3 w-full max-w-xs mx-auto pt-4">
          <button
            onClick={() => navigate("/signup")}
            className="w-full py-3 rounded-2xl font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ backgroundColor: "hsl(var(--primary))" }}
          >
            {t("welcome.createAccount")}
          </button>
          <button
            onClick={() => navigate("/signin")}
            className="w-full py-3 rounded-2xl font-medium border-2 transition-all hover:bg-muted/50 active:scale-[0.98]"
            style={{ borderColor: "hsl(var(--primary))", color: "hsl(var(--primary))" }}
          >
            {t("welcome.signIn")}
          </button>
        </div>

        <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed pt-4">
          {t("welcome.disclaimer")}
        </p>
      </div>
    </div>
  );
}
