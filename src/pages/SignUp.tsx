import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { User, ClipboardList, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LegalModal, TermsContent, PrivacyContent } from "@/components/LegalModal";

type SelectedRole = "client" | "specialist" | null;

export default function SignUp() {
  const [step, setStep] = useState<"role" | "details">("role");
  const [selectedRole, setSelectedRole] = useState<SelectedRole>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [consent, setConsent] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const pending = localStorage.getItem("pulz_pending_confirmation");
    if (pending === "true") {
      navigate("/signin", { replace: true });
    }
  }, [navigate]);

  const handleRoleSelect = (role: SelectedRole) => {
    setSelectedRole(role);
    setStep("details");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole || !consent || !termsAgreed) return;
    setSubmitting(true);

    const { error, needsEmailConfirmation } = await signUp(email, password, fullName, selectedRole);
    setSubmitting(false);

    if (error) {
      toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
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

    if (selectedRole === "client") {
      navigate("/onboarding");
    } else {
      navigate("/specialist/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "hsl(var(--background))" }}>
      <div className="w-full max-w-md space-y-6 slide-up">
        <button onClick={() => (step === "details" ? setStep("role") : navigate("/"))} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={16} /> Back
        </button>

        <h1 className="text-2xl font-heading font-semibold" style={{ color: "hsl(var(--primary))" }}>
          Create your PULZ account
        </h1>

        {step === "role" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">How will you use PULZ?</p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { role: "client" as const, icon: User, title: "I'm here for myself", desc: "Track patterns & get support" },
                { role: "specialist" as const, icon: ClipboardList, title: "I'm a specialist", desc: "Support your clients" },
              ].map(({ role, icon: Icon, title, desc }) => (
                <button
                  key={role}
                  onClick={() => handleRoleSelect(role)}
                  className={`p-6 rounded-2xl border-2 text-left transition-all hover:shadow-md ${
                    selectedRole === role ? "border-primary bg-[hsl(var(--color-aqua-mist))]" : "border-border"
                  }`}
                >
                  <Icon size={28} className="mb-3" style={{ color: "hsl(var(--primary))" }} />
                  <p className="font-medium text-sm">{title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "details" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" required minLength={6} />
            </div>

            <label className="flex items-start gap-3 text-sm cursor-pointer">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 rounded shrink-0" />
              <span className="text-muted-foreground leading-relaxed">
                I understand PULZ is a wellness tool, not a medical device. I consent to my data being processed for personalized insights.
              </span>
            </label>

            <label className="flex items-start gap-3 text-sm cursor-pointer">
              <input type="checkbox" checked={termsAgreed} onChange={(e) => setTermsAgreed(e.target.checked)} className="mt-0.5 rounded shrink-0" />
              <span className="text-muted-foreground leading-relaxed">
                I have read and agree to the{" "}
                <button
                  type="button"
                  onClick={() => setTermsOpen(true)}
                  className="underline font-medium"
                  style={{ color: "hsl(var(--primary))" }}
                >
                  Terms of Service
                </button>
                {" "}and{" "}
                <button
                  type="button"
                  onClick={() => setPrivacyOpen(true)}
                  className="underline font-medium"
                  style={{ color: "hsl(var(--primary))" }}
                >
                  Privacy Policy
                </button>
              </span>
            </label>

            <button
              type="submit"
              disabled={!consent || !termsAgreed || submitting}
              className="w-full py-3 rounded-2xl font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              style={{ backgroundColor: "hsl(var(--primary))" }}
            >
              {submitting ? "Creating account…" : "Create account"}
            </button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account? <Link to="/signin" className="underline" style={{ color: "hsl(var(--primary))" }}>Sign in</Link>
            </p>
          </form>
        )}
      </div>

      <LegalModal isOpen={termsOpen} onClose={() => setTermsOpen(false)} title="Terms of Service">
        <TermsContent />
      </LegalModal>

      <LegalModal isOpen={privacyOpen} onClose={() => setPrivacyOpen(false)} title="Privacy Policy">
        <PrivacyContent />
      </LegalModal>
    </div>
  );
}
