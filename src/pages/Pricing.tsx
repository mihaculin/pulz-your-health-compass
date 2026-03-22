import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, X as XIcon, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const FREE_FEATURES = [
  { label: "Journal nelimitat", included: true },
  { label: "Tabel Fairburn zilnic", included: true },
  { label: "Progress 7 zile", included: true },
  { label: "Language RO/EN", included: true },
  { label: "Conectare Apple Watch", included: false },
  { label: "Notificații inteligente", included: false },
  { label: "Personalizare completă", included: false },
  { label: "Export date", included: false },
];

const PREMIUM_FEATURES = [
  { label: "Tot din Free", included: true },
  { label: "Conectare iPhone + Apple Watch", included: true },
  { label: "Notificații cu sunet personalizat", included: true },
  { label: "Progress nelimitat + insights", included: true },
  { label: "Personalizare teme și mesaje", included: true },
  { label: "Export CSV", included: true },
  { label: "Pattern detection", included: true },
];

const CLINIC_FEATURES = [
  { label: "Tot din Premium", included: true },
  { label: "Rapoarte clinice PDF", included: true },
  { label: "Suport prioritar 24h", included: true },
  { label: "Viitoare: dashboard specialist", included: true },
];

function FeatureRow({ label, included }: { label: string; included: boolean }) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      {included ? (
        <Check size={15} className="shrink-0 mt-0.5" style={{ color: "#4CAF7D" }} />
      ) : (
        <XIcon size={15} className="shrink-0 mt-0.5" style={{ color: "#E5E7EB" }} />
      )}
      <span className="text-sm" style={{ color: included ? "#374151" : "#9CA3AF" }}>{label}</span>
    </div>
  );
}

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPremium, isClinic } = useSubscription();
  const { toast } = useToast();
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [loading, setLoading] = useState<string | null>(null);

  const handleUpgrade = async (plan: "premium" | "clinic") => {
    if (!user) {
      navigate("/signin");
      return;
    }
    setLoading(plan);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { plan, userId: user.id, userEmail: user.email, billingPeriod: billing },
      });
      if (error || !data?.url) throw new Error(error?.message ?? "No checkout URL returned");
      window.location.href = data.url;
    } catch {
      toast({ description: "Could not start checkout. Try again.", className: "bg-white border-l-2 border-l-red-300" });
      setLoading(null);
    }
  };

  const premiumPrice = billing === "monthly" ? "€9.99" : "€8.33";
  const clinicPrice = billing === "monthly" ? "€24.99" : "€20.83";
  const premiumAnnual = "€99.90";
  const clinicAnnual = "€249.90";

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F9FAFB" }}>
      {/* Header */}
      <div className="max-w-5xl mx-auto px-6 pt-8 pb-2 flex items-center justify-between">
        <button
          onClick={() => navigate(user ? "/dashboard" : "/")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} />
          {user ? "Înapoi la aplicație" : "Înapoi"}
        </button>
        <span className="text-xl font-heading font-bold text-primary">PULZ</span>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        {/* Title */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl lg:text-4xl font-heading font-bold" style={{ color: "#1A4040" }}>
            Prețuri simple și corecte
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Alege planul potrivit pentru tine. Poți anula oricând.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-1 bg-white rounded-xl border border-border p-1 mt-4">
            <button
              onClick={() => setBilling("monthly")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${billing === "monthly" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              Lunar
            </button>
            <button
              onClick={() => setBilling("annual")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${billing === "annual" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              Anual
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: billing === "annual" ? "rgba(255,255,255,0.25)" : "#b3ecec", color: billing === "annual" ? "#fff" : "#1A4040" }}>
                -17%
              </span>
            </button>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid md:grid-cols-3 gap-6 items-stretch">

          {/* FREE */}
          <div className="bg-white rounded-2xl p-6 flex flex-col" style={{ border: "1px solid #E5E7EB" }}>
            <div className="mb-5">
              <h2 className="font-heading text-[22px] font-bold mb-3" style={{ color: "#1A4040" }}>Free</h2>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-mono font-bold" style={{ color: "#1A4040" }}>€0</span>
                <span className="text-muted-foreground text-sm mb-1">/lună</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Mereu gratuit</p>
            </div>

            <div className="border-t border-border/50 pt-4 mb-6 space-y-0.5 flex-1">
              {FREE_FEATURES.map((f) => <FeatureRow key={f.label} {...f} />)}
            </div>

            <button
              onClick={() => navigate(user ? "/dashboard" : "/signup")}
              className="w-full py-3 rounded-xl text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors active:scale-[0.98]"
            >
              {user ? "Planul tău curent" : "Începe gratuit"}
            </button>
          </div>

          {/* PREMIUM */}
          <div className="bg-white rounded-2xl p-6 flex flex-col relative" style={{ border: "2px solid #2D7D6F" }}>
            <div
              className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold"
              style={{ backgroundColor: "#b3ecec", color: "#2D7D6F" }}
            >
              Cel mai popular
            </div>

            <div className="mb-5">
              <h2 className="font-heading text-[22px] font-bold mb-3" style={{ color: "#1A4040" }}>Premium</h2>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-mono font-bold" style={{ color: "#1A4040" }}>{premiumPrice}</span>
                <span className="text-muted-foreground text-sm mb-1">/lună</span>
              </div>
              {billing === "annual" && (
                <p className="text-xs text-muted-foreground mt-1">sau {premiumAnnual}/an — 2 luni gratuit</p>
              )}
              {billing === "monthly" && (
                <p className="text-xs text-muted-foreground mt-1">sau {premiumAnnual}/an — 2 luni gratuit</p>
              )}
            </div>

            <div className="border-t border-border/50 pt-4 mb-6 space-y-0.5 flex-1">
              {PREMIUM_FEATURES.map((f) => <FeatureRow key={f.label} {...f} />)}
            </div>

            {isPremium && !isClinic ? (
              <div className="w-full py-3 rounded-xl text-sm font-medium text-center" style={{ backgroundColor: "#E8F8F7", color: "#2D7D6F" }}>
                Planul tău curent ✓
              </div>
            ) : (
              <button
                onClick={() => handleUpgrade("premium")}
                disabled={loading === "premium"}
                className="w-full py-3 rounded-xl text-sm font-medium text-white transition-colors active:scale-[0.98]"
                style={{ backgroundColor: "#2D7D6F", opacity: loading === "premium" ? 0.7 : 1 }}
              >
                {loading === "premium" ? "Se încarcă…" : "Începe Premium →"}
              </button>
            )}
          </div>

          {/* CLINIC */}
          <div className="bg-white rounded-2xl p-6 flex flex-col" style={{ border: "1px solid #D7C9DB" }}>
            <div className="mb-5">
              <h2 className="font-heading text-[22px] font-bold mb-3" style={{ color: "#1A4040" }}>Clinic</h2>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-mono font-bold" style={{ color: "#1A4040" }}>{clinicPrice}</span>
                <span className="text-muted-foreground text-sm mb-1">/lună</span>
              </div>
              {billing === "annual" && (
                <p className="text-xs text-muted-foreground mt-1">sau {clinicAnnual}/an — 2 luni gratuit</p>
              )}
              {billing === "monthly" && (
                <p className="text-xs text-muted-foreground mt-1">sau {clinicAnnual}/an — 2 luni gratuit</p>
              )}
            </div>

            <div className="border-t border-border/50 pt-4 mb-6 space-y-0.5 flex-1">
              {CLINIC_FEATURES.map((f) => <FeatureRow key={f.label} {...f} />)}
            </div>

            {isClinic ? (
              <div className="w-full py-3 rounded-xl text-sm font-medium text-center" style={{ backgroundColor: "#F4EEF7", color: "#7B5E8A" }}>
                Planul tău curent ✓
              </div>
            ) : (
              <button
                onClick={() => handleUpgrade("clinic")}
                disabled={loading === "clinic"}
                className="w-full py-3 rounded-xl text-sm font-medium border-2 transition-colors active:scale-[0.98]"
                style={{ borderColor: "#D7C9DB", color: "#7B5E8A", opacity: loading === "clinic" ? 0.7 : 1 }}
              >
                {loading === "clinic" ? "Se încarcă…" : "Începe Clinic →"}
              </button>
            )}
          </div>
        </div>

        {/* DEV test card info */}
        {import.meta.env.DEV && (
          <div
            className="rounded-2xl p-4 text-sm flex items-start gap-3"
            style={{ backgroundColor: "#FFFBEB", border: "1px solid #FCD34D" }}
          >
            <span className="text-lg">🧪</span>
            <div>
              <p className="font-medium text-amber-800 mb-0.5">Test mode — Stripe test cards</p>
              <p className="text-amber-700 font-mono text-xs">4242 4242 4242 4242 · Orice dată viitoare · Orice CVC</p>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground pb-8">
          Prețurile sunt afișate fără TVA. Poți anula abonamentul oricând din Setări.
        </p>
      </div>
    </div>
  );
}
