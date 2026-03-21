import { useLanguage } from "@/contexts/LanguageContext";

export function ClinicalDisclaimer() {
  const { t } = useLanguage();
  return (
    <p
      className="text-center w-full px-4 py-3"
      style={{ fontSize: "11px", color: "#9CA3AF", lineHeight: 1.5 }}
    >
      {t("clinical.disclaimer")}
    </p>
  );
}
