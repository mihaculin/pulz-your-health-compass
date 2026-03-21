import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    const pending = localStorage.getItem("pulz_pending_confirmation");
    const pendingEmail = localStorage.getItem("pulz_pending_email");
    if (pending === "true" && pendingEmail) {
      setEmail(pendingEmail);
      toast({
        title: t("signIn.checkEmail"),
        description: "Confirm your email, then sign in.",
      });
    }
  }, [toast, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const { error } = await signIn(email, password);
    setSubmitting(false);

    if (error) {
      toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
      return;
    }

    localStorage.removeItem("pulz_pending_confirmation");
    localStorage.removeItem("pulz_pending_email");

    navigate("/dashboard");
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("signIn.checkEmail"), description: t("signIn.resetLinkSent") });
      setResetMode(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "hsl(var(--background))" }}>
      <div className="w-full max-w-md space-y-6 slide-up">
        <button onClick={() => (resetMode ? setResetMode(false) : navigate("/"))} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={16} /> {t("common.back")}
        </button>

        <h1 className="text-2xl font-heading font-semibold" style={{ color: "hsl(var(--primary))" }}>
          {resetMode ? t("signIn.resetTitle") : t("signIn.title")}
        </h1>

        <form onSubmit={resetMode ? handleReset : handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("signIn.email")}</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("signIn.emailPlaceholder")} required />
          </div>

          {!resetMode && (
            <div className="space-y-2">
              <Label htmlFor="password">{t("signIn.password")}</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("signIn.passwordPlaceholder")} required />
            </div>
          )}

          {!resetMode && (
            <button type="button" onClick={() => setResetMode(true)} className="text-sm text-muted-foreground hover:underline">
              {t("signIn.forgotPassword")}
            </button>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-2xl font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
            style={{ backgroundColor: "hsl(var(--primary))" }}
          >
            {submitting
              ? (resetMode ? t("signIn.sending") : t("signIn.signingIn"))
              : resetMode ? t("signIn.sendResetLink") : t("signIn.signIn")}
          </button>

          {!resetMode && (
            <p className="text-center text-sm text-muted-foreground">
              {t("signIn.newToPulz")} <Link to="/signup" className="underline" style={{ color: "hsl(var(--primary))" }}>{t("signIn.createAccount")}</Link>
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
