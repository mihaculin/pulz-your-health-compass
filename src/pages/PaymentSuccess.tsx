import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";

const UNLOCKED = [
  { icon: "🍎", label: "Apple Watch sync" },
  { icon: "🔔", label: "Notificări inteligente" },
  { icon: "📊", label: "Progress complet" },
];

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshProfile } = useApp();
  const [done, setDone] = useState(false);

  const today = new Date().toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" });

  useEffect(() => {
    if (!user) return;

    const activate = async () => {
      await supabase.from("client_profiles").update({
        subscription_tier: "premium",
        subscription_status: "active",
        subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }).eq("id", user.id);

      await supabase.from("payment_events").insert({
        user_id: user.id,
        event_type: "subscription_started",
        amount_cents: 999,
        currency: "eur",
        plan: "premium",
        status: "success",
      });

      refreshProfile();
      setDone(true);
    };

    activate();
  }, [user, refreshProfile]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-12"
      style={{ background: "radial-gradient(ellipse at center, #E8F8F7 0%, #ffffff 70%)" }}
    >
      <div className="w-full max-w-md text-center space-y-8">

        {/* Animated checkmark */}
        <div className="flex justify-center">
          <div style={{ position: "relative", width: 96, height: 96 }}>
            <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
              <circle
                cx="48" cy="48" r="44"
                fill="#b3ecec"
                style={{ animation: "circleExpand 0.4s cubic-bezier(0.16,1,0.3,1) both" }}
              />
              <path
                d="M28 48L42 62L68 36"
                stroke="#2D7D6F"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                style={{
                  strokeDasharray: 60,
                  strokeDashoffset: 0,
                  animation: "drawCheck 0.6s 0.3s ease-out both",
                }}
              />
            </svg>
          </div>
        </div>

        {/* Text */}
        <div
          className="space-y-2"
          style={{ animation: "fadeInUp 0.5s 0.6s ease-out both", opacity: 0 }}
        >
          <h1
            style={{ fontFamily: "Fraunces, serif", fontSize: 28, fontWeight: 700, color: "#2D7D6F", fontStyle: "italic" }}
          >
            PULZ Premium activat! 💚
          </h1>
          <p style={{ color: "#6B7280", fontSize: 16 }}>
            Bine ai venit în experiența completă PULZ.
          </p>
        </div>

        <div className="border-t border-border/30" />

        {/* Unlocked features */}
        <div
          className="grid grid-cols-3 gap-3"
          style={{ animation: "fadeInUp 0.5s 0.8s ease-out both", opacity: 0 }}
        >
          {UNLOCKED.map((item) => (
            <div
              key={item.label}
              className="flex flex-col items-center gap-2 rounded-xl py-4 px-2"
              style={{ backgroundColor: "#E8F8F7" }}
            >
              <span style={{ fontSize: 22 }}>{item.icon}</span>
              <p className="text-xs font-medium text-center leading-tight" style={{ color: "#1A4040" }}>
                {item.label}
              </p>
            </div>
          ))}
        </div>

        <div style={{ animation: "fadeInUp 0.5s 1s ease-out both", opacity: 0 }}>
          <p
            className="text-xs mb-6"
            style={{ fontFamily: "DM Mono, monospace", color: "#6B7280" }}
          >
            Abonament activ din: {today}
          </p>

          <button
            onClick={() => navigate("/dashboard")}
            className="inline-block px-10 py-3.5 rounded-2xl text-sm font-medium text-white transition-colors active:scale-[0.98]"
            style={{ backgroundColor: done ? "#2D7D6F" : "#4A9E8E", maxWidth: 320, width: "100%" }}
          >
            Mergi la dashboard →
          </button>
        </div>
      </div>

      <style>{`
        @keyframes circleExpand {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes drawCheck {
          from { stroke-dashoffset: 60; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
