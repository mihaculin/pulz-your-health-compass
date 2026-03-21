import { useEffect, useState } from "react";
import { LegalModal } from "./LegalModal";
import { useLanguage } from "@/contexts/LanguageContext";

const COOKIE_KEY = "pulz_cookie_consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const { t } = useLanguage();

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
            {t("cookie.notice")}{" "}
            <button
              onClick={() => setPolicyOpen(true)}
              className="underline font-medium"
              style={{ color: "#2D7D6F" }}
            >
              {t("cookie.cookiePolicy")}
            </button>
          </p>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => accept("essential")}
              className="px-4 py-2 rounded-xl text-sm font-medium border transition-colors hover:bg-gray-50"
              style={{ borderColor: "#D1D5DB", color: "#374151" }}
            >
              {t("cookie.essentialOnly")}
            </button>
            <button
              onClick={() => accept("all")}
              className="px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: "#2D7D6F" }}
            >
              {t("cookie.acceptAll")}
            </button>
          </div>
        </div>
      </div>

      <LegalModal isOpen={policyOpen} onClose={() => setPolicyOpen(false)} title={t("cookie.modalTitle")}>
        <section>
          <h3 className="font-semibold text-gray-800 mb-1">{t("cookie.essentialTitle")}</h3>
          <p>{t("cookie.essentialDesc")}</p>
        </section>
        <section>
          <h3 className="font-semibold text-gray-800 mb-1">{t("cookie.functionalTitle")}</h3>
          <p>{t("cookie.functionalDesc")}</p>
        </section>
        <section>
          <h3 className="font-semibold text-gray-800 mb-1">{t("cookie.analyticsTitle")}</h3>
          <p>{t("cookie.analyticsDesc")}</p>
        </section>
        <section>
          <h3 className="font-semibold text-gray-800 mb-1">{t("cookie.neverDoTitle")}</h3>
          <p>{t("cookie.neverDoDesc")}</p>
        </section>
      </LegalModal>
    </>
  );
}
