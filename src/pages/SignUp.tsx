import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LegalModal, TermsContent, PrivacyContent } from "@/components/LegalModal";
import { useLanguage } from "@/contexts/LanguageContext";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [consent, setConsent] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    const pending = localStorage.getItem("pulz_pending_confirmation");
    if (pending === "true") {
      navigate("/signin", { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent || !termsAgreed) return;
    setSubmitting(true);

    const { error, needsEmailConfirmation } = await signUp(email, password, fullName);
    setSubmitting(false);

    if (error) {
      if (error.message.toLowerCase().includes("already registered") || error.message.toLowerCase().includes("already been registered")) {
        setAlreadyRegistered(true);
      } else {
        toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
      }
      return;
    }

    if (needsEmailConfirmation) {
      localStorage.setItem("pulz_pending_confirmation", "true");
      localStorage.setItem("pulz_pending_email", email);
      toast({
        title: "Check your email",
        description: "Confirm your email to finish setup, then sign in.",
      });
      navigate("/signin");
      return;
    }

    toast({ title: "Welcome to PULZ 💚", description: "Your account has been created." });
    navigate("/onboarding");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "hsl(var(--background))" }}>
      <div className="w-full max-w-md space-y-6 slide-up">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={16} /> {t("common.back")}
        </button>

        <h1 className="text-2xl font-heading font-semibold" style={{ color: "hsl(var(--primary))" }}>
          {t("signUp.title")}
        </h1>

        {alreadyRegistered && (
          <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: "#FFF9E6", border: "1px solid #FCD34D" }}>
            <p className="text-sm font-medium" style={{ color: "#B45309" }}>Looks like you already have an account!</p>
            <button
              onClick={() => navigate("/signin")}
              className="text-sm font-medium underline"
              style={{ color: "hsl(var(--primary))" }}
            >
              Sign in instead →
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">{t("signUp.fullName")}</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t("signUp.namePlaceholder")} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("signUp.emailPlaceholder")} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("signIn.password")}</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("signUp.passwordPlaceholder")} required minLength={6} />
          </div>

          <label className="flex items-start gap-3 text-sm cursor-pointer">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 rounded shrink-0" />
            <span className="text-muted-foreground leading-relaxed">
              {t("signUp.consentText")}
            </span>
          </label>

          <label className="flex items-start gap-3 text-sm cursor-pointer">
            <input type="checkbox" checked={termsAgreed} onChange={(e) => setTermsAgreed(e.target.checked)} className="mt-0.5 rounded shrink-0" />
            <span className="text-muted-foreground leading-relaxed">
              {t("signUp.termsAgreePrefix")}{" "}
              <button
                type="button"
                onClick={() => setTermsOpen(true)}
                className="underline font-medium"
                style={{ color: "hsl(var(--primary))" }}
              >
                {t("signUp.termsLink")}
              </button>
              {" "}{t("signUp.and")}{" "}
              <button
                type="button"
                onClick={() => setPrivacyOpen(true)}
                className="underline font-medium"
                style={{ color: "hsl(var(--primary))" }}
              >
                {t("signUp.privacyLink")}
              </button>
            </span>
          </label>

          <button
            type="submit"
            disabled={!consent || !termsAgreed || submitting}
            className="w-full py-3 rounded-2xl font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
            style={{ backgroundColor: "hsl(var(--primary))" }}
          >
            {submitting ? t("signUp.creating") : t("signUp.createAccount")}
          </button>

          <p className="text-center text-sm text-muted-foreground">
            {t("signUp.alreadyHave")} <Link to="/signin" className="underline" style={{ color: "hsl(var(--primary))" }}>{t("signIn.signIn")}</Link>
          </p>
        </form>
      </div>

      <LegalModal isOpen={termsOpen} onClose={() => setTermsOpen(false)} title={t("signUp.termsLink")}>
        <TermsContent />
      </LegalModal>

      <LegalModal isOpen={privacyOpen} onClose={() => setPrivacyOpen(false)} title={t("signUp.privacyLink")}>
        <PrivacyContent />
      </LegalModal>
    </div>
  );
}
