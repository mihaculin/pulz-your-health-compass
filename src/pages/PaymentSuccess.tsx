import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { refreshProfile } = useApp();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId || !user) {
      setStatus("error");
      return;
    }

    const verify = async () => {
      try {
        const { error } = await supabase.functions.invoke("verify-payment", {
          body: { sessionId, userId: user.id },
        });
        if (error) throw error;
        refreshProfile();
        setStatus("success");
      } catch {
        setStatus("error");
      }
    };

    verify();
  }, [user, searchParams, refreshProfile]);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: "#E8F8F7" }}
    >
      <div className="max-w-md w-full text-center space-y-6">
        {status === "loading" && (
          <>
            <div className="w-20 h-20 mx-auto rounded-full bg-white/60 animate-pulse" />
            <p className="text-muted-foreground">Se confirmă plata…</p>
          </>
        )}

        {status === "success" && (
          <>
            {/* Animated checkmark */}
            <div className="flex items-center justify-center">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "#4CAF7D", animation: "scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both" }}
              >
                <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
                  <path
                    d="M10 22L18 30L34 14"
                    stroke="white"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ animation: "drawCheck 0.4s 0.3s ease-out both" }}
                  />
                </svg>
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-heading font-bold" style={{ color: "#1A4040", fontFamily: "Fraunces, serif" }}>
                Bine ai venit în PULZ Premium! 💚
              </h1>
              <p style={{ color: "#6B7280" }}>Abonamentul tău este activ.</p>
            </div>

            <button
              onClick={() => navigate("/dashboard")}
              className="inline-block px-8 py-3.5 rounded-2xl text-sm font-medium text-white transition-colors active:scale-[0.98]"
              style={{ backgroundColor: "#2D7D6F" }}
            >
              Mergi la dashboard →
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <div
              className="w-24 h-24 mx-auto rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#FEE2E2" }}
            >
              <span className="text-4xl">⚠️</span>
            </div>
            <h1 className="text-2xl font-heading font-bold" style={{ color: "#1A4040" }}>
              Ceva nu a mers bine
            </h1>
            <p style={{ color: "#6B7280" }}>
              Dacă ai fost debitat, contactează-ne. Altfel, încearcă din nou.
            </p>
            <button
              onClick={() => navigate("/pricing")}
              className="px-6 py-3 rounded-2xl text-sm font-medium text-white"
              style={{ backgroundColor: "#2D7D6F" }}
            >
              Înapoi la planuri
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes scaleIn {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes drawCheck {
          from { stroke-dasharray: 0 60; }
          to { stroke-dasharray: 60 0; }
        }
      `}</style>
    </div>
  );
}
