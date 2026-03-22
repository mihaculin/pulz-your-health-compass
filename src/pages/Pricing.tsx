import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, X as XIcon, Lock, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";

const FREE_FEATURES = [
  { label: "Journal nelimitat", included: true },
  { label: "Tabel Fairburn zilnic", included: true },
  { label: "Progress ultimele 7 zile", included: true },
  { label: "Română / Engleză", included: true },
  { label: "Apple Watch sync", included: false },
  { label: "Notificații inteligente", included: false },
  { label: "Progress complet + insights", included: false },
  { label: "Export date CSV", included: false },
  { label: "Personalizare completă", included: false },
];

const PREMIUM_FEATURES = [
  { label: "Tot ce e în Free" },
  { label: "Conectare iPhone + Apple Watch" },
  { label: "Notificații cu sunet personalizat" },
  { label: "Progress complet + pattern insights" },
  { label: "Export date CSV" },
  { label: "Personalizare teme și mesaje" },
  { label: "Suport prioritar" },
];

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  const monthlyPrice = billing === "monthly" ? "€9.99" : "€6.58";

  const handleStartPremium = () => {
    navigate(`/checkout?plan=premium&billing=${billing}`);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F9FAFB" }}>
      {/* Header bar */}
      <div className="max-w-4xl mx-auto px-6 pt-7 flex items-center justify-between">
        <button
          onClick={() => navigate(user ? "/dashboard" : "/")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={15} />
          {user ? "Înapoi" : "Acasă"}
        </button>
        <span className="text-lg font-heading font-bold text-primary">PULZ</span>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-10">
        {/* Title */}
        <div className="text-center space-y-2">
          <h1
            className="font-heading font-bold"
            style={{ fontSize: 32, color: "#1A1F2E", fontFamily: "Fraunces, serif" }}
          >
            Alege planul tău
          </h1>
          <p style={{ color: "#6B7280", fontSize: 15 }}>
            Începe gratuit. Upgradează când ești pregătită.
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-2 gap-6 items-stretch">

          {/* FREE */}
          <div
            className="flex flex-col"
            style={{ backgroundColor: "#fff", border: "1px solid #E8EAED", borderRadius: 20, padding: 32 }}
          >
            <div className="mb-6">
              <p style={{ fontSize: 14, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500 }}>
                Free
              </p>
              <div className="flex items-end gap-1 mt-2">
                <span style={{ fontFamily: "DM Mono, monospace", fontSize: 48, fontWeight: 700, color: "#1A1F2E", lineHeight: 1 }}>
                  €0
                </span>
                <span style={{ fontSize: 14, color: "#6B7280", marginBottom: 6 }}>/lună</span>
              </div>
            </div>

            <div className="border-t border-border/40 pt-5 mb-6 flex-1 space-y-2.5">
              {FREE_FEATURES.map((f) => (
                <div key={f.label} className="flex items-center gap-2.5">
                  {f.included ? (
                    <Check size={15} style={{ color: "#4CAF7D", flexShrink: 0 }} />
                  ) : (
                    <XIcon size={15} style={{ color: "#D1D5DB", flexShrink: 0 }} />
                  )}
                  <span
                    style={{
                      fontSize: 14,
                      color: f.included ? "#374151" : "#9CA3AF",
                      textDecoration: f.included ? "none" : "none",
                    }}
                  >
                    {f.label}
                  </span>
                </div>
              ))}
            </div>

            <button
              disabled
              className="w-full py-3 rounded-xl text-sm font-medium"
              style={{ backgroundColor: "#F3F4F6", color: "#9CA3AF", cursor: "default" }}
            >
              {isPremium ? "Planul de bază" : "Planul tău curent"}
            </button>
          </div>

          {/* PREMIUM */}
          <div
            className="flex flex-col relative"
            style={{ backgroundColor: "#fff", border: "2px solid #2D7D6F", borderRadius: 20, padding: 32 }}
          >
            {/* Badge */}
            <div
              className="absolute left-1/2 -translate-x-1/2"
              style={{ top: -14, backgroundColor: "#b3ecec", color: "#2D7D6F", fontSize: 11, fontWeight: 600, padding: "3px 12px", borderRadius: 100 }}
            >
              Cel mai popular
            </div>

            <div className="mb-6">
              <p style={{ fontSize: 14, color: "#2D7D6F", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500 }}>
                Premium
              </p>
              <div className="flex items-end gap-1 mt-2">
                <span style={{ fontFamily: "DM Mono, monospace", fontSize: 48, fontWeight: 700, color: "#1A1F2E", lineHeight: 1 }}>
                  {monthlyPrice}
                </span>
                <span style={{ fontSize: 14, color: "#6B7280", marginBottom: 6 }}>/lună</span>
              </div>
              {billing === "annual" ? (
                <p style={{ fontSize: 12, color: "#4CAF7D", marginTop: 4 }}>
                  €79/an —{" "}
                  <span style={{ textDecoration: "line-through", color: "#9CA3AF" }}>€9.99</span> economie 2 luni
                </p>
              ) : (
                <p style={{ fontSize: 12, color: "#4CAF7D", marginTop: 4 }}>sau €79/an — 2 luni gratuit</p>
              )}
            </div>

            <div className="border-t border-border/40 pt-5 mb-6 flex-1 space-y-2.5">
              {PREMIUM_FEATURES.map((f) => (
                <div key={f.label} className="flex items-center gap-2.5">
                  <Check size={15} style={{ color: "#4CAF7D", flexShrink: 0 }} />
                  <span style={{ fontSize: 14, color: "#374151" }}>{f.label}</span>
                </div>
              ))}
            </div>

            {/* Billing toggle */}
            <div className="flex items-center gap-1 p-1 rounded-xl mb-4" style={{ backgroundColor: "#F3F4F6" }}>
              {(["monthly", "annual"] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => setBilling(b)}
                  className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
                  style={
                    billing === b
                      ? { backgroundColor: "#fff", color: "#1A1F2E", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }
                      : { color: "#6B7280" }
                  }
                >
                  {b === "monthly" ? "Lunar" : "Anual"}
                </button>
              ))}
            </div>

            {isPremium ? (
              <div
                className="w-full py-3.5 rounded-xl text-sm font-medium text-center"
                style={{ backgroundColor: "#E8F8F7", color: "#2D7D6F" }}
              >
                Planul tău curent ✓
              </div>
            ) : (
              <button
                onClick={handleStartPremium}
                className="w-full rounded-xl text-sm font-medium text-white transition-colors active:scale-[0.98]"
                style={{ backgroundColor: "#2D7D6F", height: 48 }}
              >
                Începe Premium →
              </button>
            )}
          </div>
        </div>

        {/* Footer trust line */}
        <div className="flex flex-col items-center gap-2 pb-6">
          <div className="flex items-center gap-2 text-sm" style={{ color: "#6B7280" }}>
            <Lock size={14} />
            <span>Plată securizată prin Stripe. Anulezi oricând.</span>
          </div>
          <p className="text-xs" style={{ color: "#9CA3AF" }}>Acceptăm: Visa · Mastercard · Apple Pay</p>
        </div>
      </div>
    </div>
  );
}
