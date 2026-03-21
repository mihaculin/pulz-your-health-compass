import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, ChevronLeft, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { THEMES } from "@/lib/theme";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import translations from "@/translations";

const TOTAL_STEPS = 6;

type HeightUnit = "cm" | "ft";
type WeightUnit = "kg" | "lbs";
type Tone = "gentle" | "direct" | "clinical";

interface OnboardingData {
  dob: string;
  height: string;
  heightUnit: HeightUnit;
  weight: string;
  weightUnit: WeightUnit;
  cycleTracking: boolean | null;
  foodConcerns: string[];
  emotionSliders: Record<string, number>;
  triggers: string[];
  conditions: string[];
  otherCondition: string;
  specialistCode: string;
  theme: string;
  tone: Tone;
  crisisName: string;
  crisisPhone: string;
  safetyAgreed: boolean;
}

const DEFAULT: OnboardingData = {
  dob: "",
  height: "",
  heightUnit: "cm",
  weight: "",
  weightUnit: "kg",
  cycleTracking: null,
  foodConcerns: [],
  emotionSliders: { Anxiety: 3, Stress: 3, "Low mood": 3, Irritability: 3 },
  triggers: [],
  conditions: [],
  otherCondition: "",
  specialistCode: "",
  theme: "aqua-bloom",
  tone: "gentle",
  crisisName: "",
  crisisPhone: "",
  safetyAgreed: false,
};

const FOOD_CONCERNS = ["Binge eating", "Restrictive eating", "Emotional eating", "Purging behaviours", "Overeating", "Food anxiety", "Body image concerns", "None of the above"];
const TRIGGERS = ["Work stress", "Relationships", "Loneliness", "Financial stress", "Health concerns", "Body image", "Social situations", "Other"];
const CONDITIONS = ["Diabetes", "PCOS", "IBS / digestive issues", "Thyroid condition", "Chronic pain", "Mental health diagnosis", "None", "Other"];
const TONE_PREVIEWS: Record<Tone, string> = {
  gentle: "Hey, I noticed your heart rate went up a little — that's okay. Let's take a breath together. 💚",
  direct: "Heart rate spike detected at 14:32. Suggested action: 4-7-8 breathing for 2 minutes.",
  clinical: "Physiological marker elevated. Cortisol pattern consistent with acute stressor. Recommend structured relaxation protocol.",
};

function toCm(val: string, unit: HeightUnit): number | null {
  const n = parseFloat(val);
  if (isNaN(n)) return null;
  return unit === "cm" ? n : n * 30.48;
}
function toKg(val: string, unit: WeightUnit): number | null {
  const n = parseFloat(val);
  if (isNaN(n)) return null;
  return unit === "kg" ? n : n * 0.453592;
}

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="w-full h-1 rounded-full" style={{ backgroundColor: "hsl(var(--color-aqua-mist))" }}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(step / TOTAL_STEPS) * 100}%`, backgroundColor: "#b3ecec" }} />
    </div>
  );
}

function Chip({ label, selected, onToggle }: { label: string; selected: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className="px-4 py-2.5 rounded-2xl text-sm font-medium border-2 transition-all active:scale-95"
      style={selected ? { backgroundColor: "#b3ecec", borderColor: "#b3ecec", color: "#1A4040" } : { backgroundColor: "transparent", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}>
      {label}
    </button>
  );
}

type Tf = (key: string) => string;

function SliderRow({ label, value, onChange, rarely, often }: { label: string; value: number; onChange: (v: number) => void; rarely: string; often: string }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between"><span className="text-sm font-medium">{label}</span><span className="text-xs font-mono text-muted-foreground">{value}/10</span></div>
      <input type="range" min={1} max={10} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full h-2 rounded-full appearance-none cursor-pointer" style={{ accentColor: "#b3ecec" }} />
      <div className="flex justify-between text-[10px] text-muted-foreground"><span>{rarely}</span><span>{often}</span></div>
    </div>
  );
}

function UnitToggle({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: "hsl(var(--border))" }}>
      {options.map((opt) => (
        <button key={opt} type="button" onClick={() => onChange(opt)} className="px-3 py-1.5 text-xs font-medium transition-all"
          style={value === opt ? { backgroundColor: "#b3ecec", color: "#1A4040" } : { backgroundColor: "transparent", color: "hsl(var(--muted-foreground))" }}>
          {opt}
        </button>
      ))}
    </div>
  );
}

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(DEFAULT);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { updatePersonalisation, markIntakeSurveyCompleted, refreshProfile } = useApp();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, language } = useLanguage();

  const stepLabels = translations[language].onboarding.stepLabels as readonly string[];

  const update = <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) =>
    setData((prev) => ({ ...prev, [key]: value }));

  const toggle = (key: "foodConcerns" | "triggers" | "conditions", item: string) =>
    setData((prev) => ({ ...prev, [key]: prev[key].includes(item) ? prev[key].filter((x) => x !== item) : [...prev[key], item] }));

  const canAdvance = () => {
    if (step === 1) return data.dob.length === 10 && data.height !== "" && data.weight !== "";
    if (step === 2) return data.foodConcerns.length > 0;
    if (step === 6) return data.safetyAgreed;
    return true;
  };

  const saveStep = async (s: number) => {
    if (!user) return;

    if (s === 1) {
      const { error } = await supabase.from("client_profiles").upsert({
        id: user.id,
        date_of_birth: data.dob.length === 10
          ? `${data.dob.slice(6)}-${data.dob.slice(3, 5)}-${data.dob.slice(0, 2)}`
          : null,
        height_cm: toCm(data.height, data.heightUnit),
        weight_kg: toKg(data.weight, data.weightUnit),
      }, { onConflict: "id" });
      if (error) { console.error("[onboarding step 1]", error); toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    }

    if (s === 2) {
      const { error } = await supabase.from("client_profiles").upsert({
        id: user.id,
        primary_concerns: data.foodConcerns,
      }, { onConflict: "id" });
      if (error) { console.error("[onboarding step 2]", error); toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    }

    if (s === 3) {
      const { data: existing } = await supabase.from("client_profiles").select("intake_survey_responses").eq("id", user.id).maybeSingle();
      const prev = (existing?.intake_survey_responses as Record<string, unknown>) ?? {};
      const { error } = await supabase.from("client_profiles").upsert({
        id: user.id,
        intake_survey_responses: { ...prev, emotional_patterns: data.emotionSliders, triggers: data.triggers },
      }, { onConflict: "id" });
      if (error) { console.error("[onboarding step 3]", error); toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    }

    if (s === 4) {
      const { data: existing } = await supabase.from("client_profiles").select("intake_survey_responses").eq("id", user.id).maybeSingle();
      const prev = (existing?.intake_survey_responses as Record<string, unknown>) ?? {};
      const { error } = await supabase.from("client_profiles").upsert({
        id: user.id,
        co_occurring_conditions: data.conditions,
        intake_survey_responses: {
          ...prev,
          specialist_code: data.specialistCode || null,
          other_condition: data.otherCondition || null,
        },
      }, { onConflict: "id" });
      if (error) { console.error("[onboarding step 4]", error); toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    }

    if (s === 5) {
      await updatePersonalisation({ theme: data.theme, messageTone: data.tone });
    }
  };

  const next = async () => {
    setSaving(true);
    await saveStep(step);
    setSaving(false);
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
    } else {
      await updatePersonalisation({ crisisContactName: data.crisisName, crisisContactPhone: data.crisisPhone });
      await markIntakeSurveyCompleted();
      refreshProfile();
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "hsl(var(--background))" }}>
      <div className="w-full max-w-lg mx-auto flex flex-col flex-1 px-6 py-8">
        <div className="space-y-3 mb-8">
          <div className="flex items-center justify-between">
            <span className="text-xl font-heading font-semibold" style={{ color: "hsl(var(--primary))" }}>PULZ</span>
            <p className="text-xs text-muted-foreground">{t("onboarding.stepOf")} {step} {t("onboarding.of")} {TOTAL_STEPS} — <span className="font-medium text-foreground">{stepLabels[step - 1]}</span></p>
          </div>
          <ProgressBar step={step} />
        </div>

        <div className="flex-1 slide-up" key={step}>
          {step === 1 && <Step1 data={data} update={update} t={t} />}
          {step === 2 && <Step2 data={data} toggle={toggle} t={t} />}
          {step === 3 && <Step3 data={data} update={update} toggle={toggle} t={t} />}
          {step === 4 && <Step4 data={data} update={update} toggle={toggle} t={t} />}
          {step === 5 && <Step6 data={data} update={update} t={t} />}
          {step === 6 && <Step7 data={data} update={update} t={t} />}
        </div>

        <div className="flex items-center justify-between pt-8 mt-auto">
          {step > 1 ? (
            <button onClick={() => setStep((s) => s - 1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft size={16} /> {t("common.back")}
            </button>
          ) : <div />}
          <button onClick={next} disabled={!canAdvance() || saving}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl font-medium text-sm text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
            style={{ backgroundColor: "hsl(var(--primary))" }}>
            {saving ? t("onboarding.saving") : step === TOTAL_STEPS ? t("common.finish") : t("common.continue")}
            {!saving && step < TOTAL_STEPS && <ChevronRight size={16} />}
            {!saving && step === TOTAL_STEPS && <Check size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}

function Step1({ data, update, t }: { data: OnboardingData; update: <K extends keyof OnboardingData>(k: K, v: OnboardingData[K]) => void; t: Tf }) {
  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-heading font-semibold mb-1">{t("onboarding.step1Title")}</h2><p className="text-sm text-muted-foreground">{t("onboarding.step1Desc")}</p></div>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("onboarding.dateOfBirth")}</label>
          <input
            type="text"
            value={data.dob}
            onChange={(e) => {
              let v = e.target.value.replace(/[^\d/]/g, "");
              if (v.length === 2 && data.dob.length === 1) v += "/";
              if (v.length === 5 && data.dob.length === 4) v += "/";
              if (v.length <= 10) update("dob", v);
            }}
            placeholder="DD/MM/YYYY"
            maxLength={10}
            className="w-full px-4 py-3 rounded-2xl border text-sm bg-card font-mono focus:outline-none"
            style={{ borderColor: "hsl(var(--border))" }}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between"><label className="text-sm font-medium">{t("onboarding.height")}</label><UnitToggle value={data.heightUnit} options={["cm", "ft"]} onChange={(v) => update("heightUnit", v as HeightUnit)} /></div>
          <input type="number" value={data.height} onChange={(e) => update("height", e.target.value)} placeholder={data.heightUnit === "cm" ? "e.g. 165" : "e.g. 5.5"} className="w-full px-4 py-3 rounded-2xl border text-sm bg-card focus:outline-none" style={{ borderColor: "hsl(var(--border))" }} />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between"><label className="text-sm font-medium">{t("onboarding.weight")}</label><UnitToggle value={data.weightUnit} options={["kg", "lbs"]} onChange={(v) => update("weightUnit", v as WeightUnit)} /></div>
          <input type="number" value={data.weight} onChange={(e) => update("weight", e.target.value)} placeholder={data.weightUnit === "kg" ? "e.g. 62" : "e.g. 137"} className="w-full px-4 py-3 rounded-2xl border text-sm bg-card focus:outline-none" style={{ borderColor: "hsl(var(--border))" }} />
        </div>
      </div>
    </div>
  );
}

function Step2({ data, toggle, t }: { data: OnboardingData; toggle: (k: "foodConcerns" | "triggers" | "conditions", item: string) => void; t: Tf }) {
  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-heading font-semibold mb-1">{t("onboarding.step2Title")}</h2><p className="text-sm text-muted-foreground">{t("onboarding.step2Desc")}</p></div>
      <div className="flex flex-wrap gap-2">{FOOD_CONCERNS.map((c) => <Chip key={c} label={c} selected={data.foodConcerns.includes(c)} onToggle={() => toggle("foodConcerns", c)} />)}</div>
      <div className="rounded-2xl p-4 text-sm text-muted-foreground" style={{ backgroundColor: "hsl(var(--color-lavender-mist))", borderLeft: "3px solid hsl(var(--color-lavender))" }}>
        {t("onboarding.foodInfo")}
      </div>
    </div>
  );
}

function Step3({ data, update, toggle, t }: { data: OnboardingData; update: <K extends keyof OnboardingData>(k: K, v: OnboardingData[K]) => void; toggle: (k: "foodConcerns" | "triggers" | "conditions", item: string) => void; t: Tf }) {
  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-heading font-semibold mb-1">{t("onboarding.step3Title")}</h2><p className="text-sm text-muted-foreground">{t("onboarding.step3Desc")}</p></div>
      <div className="space-y-5">
        {Object.entries(data.emotionSliders).map(([label, value]) => (
          <SliderRow key={label} label={label} value={value} rarely={t("onboarding.rarely")} often={t("onboarding.often")} onChange={(v) => update("emotionSliders", { ...data.emotionSliders, [label]: v })} />
        ))}
      </div>
      <div className="space-y-3">
        <label className="text-sm font-medium block">{t("onboarding.commonTriggers")}</label>
        <div className="flex flex-wrap gap-2">{TRIGGERS.map((tr) => <Chip key={tr} label={tr} selected={data.triggers.includes(tr)} onToggle={() => toggle("triggers", tr)} />)}</div>
      </div>
    </div>
  );
}

function Step4({ data, update, toggle, t }: { data: OnboardingData; update: <K extends keyof OnboardingData>(k: K, v: OnboardingData[K]) => void; toggle: (k: "foodConcerns" | "triggers" | "conditions", item: string) => void; t: Tf }) {
  const otherSelected = data.conditions.includes("Other");
  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-heading font-semibold mb-1">{t("onboarding.step4Title")}</h2><p className="text-sm text-muted-foreground">{t("onboarding.step4Desc")}</p></div>
      <div className="space-y-2">
        <label className="text-sm font-medium">{t("onboarding.doAnyApply")}</label>
        <div className="grid grid-cols-2 gap-2">
          {CONDITIONS.map((c) => (
            <button key={c} type="button" onClick={() => toggle("conditions", c)} className="flex items-center gap-2.5 px-4 py-3 rounded-2xl border-2 text-sm text-left transition-all"
              style={data.conditions.includes(c) ? { backgroundColor: "#b3ecec", borderColor: "#b3ecec", color: "#1A4040" } : { backgroundColor: "transparent", borderColor: "hsl(var(--border))" }}>
              {data.conditions.includes(c) && <Check size={14} className="shrink-0" />}{c}
            </button>
          ))}
        </div>
        {otherSelected && (
          <input type="text" value={data.otherCondition} onChange={(e) => update("otherCondition", e.target.value)} placeholder={t("onboarding.describeCondition")} autoFocus className="w-full px-4 py-3 rounded-2xl border text-sm bg-card focus:outline-none transition-all" style={{ borderColor: "#b3ecec" }} />
        )}
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">{t("onboarding.specialistCode")} <span className="text-muted-foreground font-normal">{t("common.optional")}</span></label>
        <p className="text-xs text-muted-foreground">{t("onboarding.specialistCodeDesc")}</p>
        <input type="text" value={data.specialistCode} onChange={(e) => update("specialistCode", e.target.value)} placeholder={t("onboarding.specialistCodePlaceholder")} className="w-full px-4 py-3 rounded-2xl border text-sm bg-card font-mono focus:outline-none" style={{ borderColor: "hsl(var(--border))" }} />
      </div>
    </div>
  );
}

function Step6({ data, update, t }: { data: OnboardingData; update: <K extends keyof OnboardingData>(k: K, v: OnboardingData[K]) => void; t: Tf }) {
  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-heading font-semibold mb-1">{t("onboarding.step6Title")}</h2><p className="text-sm text-muted-foreground">{t("onboarding.step6Desc")}</p></div>
      <div className="space-y-3">
        <label className="text-sm font-medium">{t("onboarding.colorTheme")}</label>
        <div className="grid grid-cols-2 gap-3">
          {THEMES.map((th) => (
            <button key={th.id} type="button" onClick={() => update("theme", th.id)}
              className="rounded-xl overflow-hidden transition-all active:scale-[0.97]"
              style={data.theme === th.id ? { outline: "3px solid hsl(var(--primary))", outlineOffset: "2px" } : { outline: "1px solid hsl(var(--border))" }}>
              <div className="h-16 w-full" style={{ background: `linear-gradient(135deg, ${th.aqua}, ${th.lavender})` }} />
              <div className="p-2.5 text-left flex items-center justify-between">
                <div><p className="text-sm font-medium">{th.name}</p><p className="text-xs text-muted-foreground">{th.sub}</p></div>
                {data.theme === th.id && <Check size={14} className="text-primary shrink-0" />}
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <label className="text-sm font-medium">{t("onboarding.communicationTone")}</label>
        <div className="space-y-2">
          {(["gentle", "direct", "clinical"] as Tone[]).map((tone) => (
            <button key={tone} type="button" onClick={() => update("tone", tone)}
              className="w-full flex items-start gap-3 px-4 py-3.5 rounded-2xl border-2 text-left transition-all"
              style={data.tone === tone ? { backgroundColor: "#b3ecec", borderColor: "#b3ecec" } : { backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}>
              <div className="w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center" style={{ borderColor: data.tone === tone ? "#1A4040" : "hsl(var(--border))" }}>
                {data.tone === tone && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#1A4040" }} />}
              </div>
              <p className="text-sm font-medium capitalize" style={{ color: data.tone === tone ? "#1A4040" : "hsl(var(--foreground))" }}>{tone}</p>
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">{t("onboarding.preview")}</label>
        <div className="rounded-2xl p-4 text-sm leading-relaxed" style={{ backgroundColor: "hsl(var(--color-aqua-mist))", color: "#1A4040" }}>
          "{TONE_PREVIEWS[data.tone]}"
        </div>
      </div>
    </div>
  );
}

function Step7({ data, update, t }: { data: OnboardingData; update: <K extends keyof OnboardingData>(k: K, v: OnboardingData[K]) => void; t: Tf }) {
  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-heading font-semibold mb-1">{t("onboarding.step7Title")}</h2><p className="text-sm text-muted-foreground">{t("onboarding.step7Desc")}</p></div>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("onboarding.crisisContactName")} <span className="text-muted-foreground font-normal">{t("common.optional")}</span></label>
          <input type="text" value={data.crisisName} onChange={(e) => update("crisisName", e.target.value)} placeholder={t("onboarding.crisisNamePlaceholder")} className="w-full px-4 py-3 rounded-2xl border text-sm bg-card focus:outline-none" style={{ borderColor: "hsl(var(--border))" }} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("onboarding.phoneNumber")} <span className="text-muted-foreground font-normal">{t("common.optional")}</span></label>
          <input type="tel" value={data.crisisPhone} onChange={(e) => update("crisisPhone", e.target.value)} placeholder={t("onboarding.crisisPhonePlaceholder")} className="w-full px-4 py-3 rounded-2xl border text-sm bg-card font-mono focus:outline-none" style={{ borderColor: "hsl(var(--border))" }} />
        </div>
      </div>
      <label className="flex items-start gap-3 cursor-pointer">
        <div className="w-5 h-5 rounded-md border-2 shrink-0 mt-0.5 flex items-center justify-center transition-colors"
          style={data.safetyAgreed ? { backgroundColor: "#b3ecec", borderColor: "#b3ecec" } : { backgroundColor: "transparent", borderColor: "hsl(var(--border))" }}
          onClick={() => update("safetyAgreed", !data.safetyAgreed)}>
          {data.safetyAgreed && <Check size={12} color="#1A4040" />}
        </div>
        <span className="text-sm text-muted-foreground leading-relaxed">
          {t("onboarding.safetyAgreement")}
        </span>
      </label>
    </div>
  );
}
