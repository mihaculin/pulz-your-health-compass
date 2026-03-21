import { useEffect, useState } from "react";
import { LegalModal } from "./LegalModal";

const COOKIE_KEY = "pulz_cookie_consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(COOKIE_KEY)) setVisible(true);
  }, []);

  const accept = (type: "all" | "essential") => {
    localStorage.setItem(COOKIE_KEY, type);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4">
        <div
          className="bg-white rounded-xl shadow-xl px-5 py-4 max-w-4xl mx-auto flex flex-wrap items-center gap-4"
          style={{ borderTop: "2px solid #b3ecec" }}
        >
          <p className="text-sm text-gray-600 flex-1 min-w-[220px]">
            PULZ uses cookies to keep you signed in and personalize your experience. We never sell your data.{" "}
            <button
              onClick={() => setPolicyOpen(true)}
              className="underline font-medium"
              style={{ color: "#2D7D6F" }}
            >
              Cookie policy
            </button>
          </p>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => accept("essential")}
              className="px-4 py-2 rounded-xl text-sm font-medium border transition-colors hover:bg-gray-50"
              style={{ borderColor: "#D1D5DB", color: "#374151" }}
            >
              Essential only
            </button>
            <button
              onClick={() => accept("all")}
              className="px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: "#2D7D6F" }}
            >
              Accept all
            </button>
          </div>
        </div>
      </div>

      <LegalModal isOpen={policyOpen} onClose={() => setPolicyOpen(false)} title="Cookie Policy">
        <section>
          <h3 className="font-semibold text-gray-800 mb-1">Essential cookies</h3>
          <p>Required for authentication and session management. These cannot be disabled and are always active.</p>
        </section>
        <section>
          <h3 className="font-semibold text-gray-800 mb-1">Functional cookies</h3>
          <p>Remember your preferences such as theme, language, and notification settings to personalise your experience.</p>
        </section>
        <section>
          <h3 className="font-semibold text-gray-800 mb-1">Analytics cookies</h3>
          <p>Help us understand how PULZ is used so we can improve the experience. All data is anonymised and never linked to your identity.</p>
        </section>
        <section>
          <h3 className="font-semibold text-gray-800 mb-1">What we never do</h3>
          <p>We do not use advertising cookies, tracking pixels, or sell any data to third parties. Ever.</p>
        </section>
      </LegalModal>
    </>
  );
}
