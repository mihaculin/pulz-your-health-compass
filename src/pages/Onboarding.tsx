import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, ChevronLeft, Check, Watch, Activity, Heart, Smartphone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { THEMES } from "@/lib/theme";

const TOTAL_STEPS = 7;

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
  connectedDevice: string | null;
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
  connectedDevice: null,
  theme: "aqua-bloom",
  tone: "gentle",
  crisisName: "",
  crisisPhone: "",
  safetyAgreed: false,
};

const FOOD_CONCERNS = ["Binge eating", "Restrictive eating", "Emotional eating", "Purging behaviours", "Overeating", "Food anxiety", "Body image concerns", "None of the above"];
const TRIGGERS = ["Work stress", "Relationships", "Loneliness", "Financial stress", "Health concerns", "Body image", "Social situations", "Other"];
const CONDITIONS = ["Diabetes", "PCOS", "IBS / digestive issues", "Thyroid condition", "Chronic pain", "Mental health diagnosis", "None", "Other"];
const DEVICES = [
  { id: "apple_watch", label: "Apple Watch", icon: Watch, color: "#1C1C1E" },
  { id: "garmin", label: "Garmin", icon: Activity, color: "#006E51" },
  { id: "fitbit", label: "Fitbit", icon: Heart, color: "#00B0B9" },
  { id: "samsung", label: "Samsung Health", icon: Smartphone, color: "#1428A0" },
];
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

function SliderRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between"><span className="text-sm font-medium">{label}</span><span className="text-xs font-mono text-muted-foreground">{value}/10</span></div>
      <input type="range" min={1} max={10} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full h-2 rounded-full appearance-none cursor-pointer" style={{ accentColor: "#b3ecec" }} />
      <div className="flex justify-between text-[10px] text-muted-foreground"><span>Rarely</span><span>Often</span></div>
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
  const { updatePersonalisation, markIntakeSurveyCompleted } = useApp();
  const navigate = useNavigate();

  const update = <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) =>
    setData((prev) => ({ ...prev, [key]: value }));

  const toggle = (key: "foodConcerns" | "triggers" | "conditions", item: string) =>
    setData((prev) => ({ ...prev, [key]: prev[key].includes(item) ? prev[key].filter((x) => x !== item) : [...prev[key], item] }));

  const canAdvance = () => {
    if (step === 1) return data.dob !== "" && data.height !== "" && data.weight !== "";
    if (step === 2) return data.foodConcerns.length > 0;
    if (step === 7) return data.safetyAgreed;
    return true;
  };

  const saveStep = async (s: number) => {
    if (!user) return;
    try {
      if (s === 1) {
        await supabase.from("client_profiles").update({
          date_of_birth: data.dob || null,
          height_cm: toCm(data.height, data.heightUnit),
          weight_kg: toKg(data.weight, data.weightUnit),
          menstrual_cycle_tracking: data.cycleTracking,
        }).eq("id", user.id);
      }
      if (s === 2) {
        await supabase.from("client_profiles").update({ primary_concerns: data.foodConcerns }).eq("id", user.id);
      }
      if (s === 3) {
        const existing = await supabase.from("client_profiles").select("intake_survey_responses").eq("id", user.id).maybeSingle();
        const prev = (existing.data?.intake_survey_responses as Record<string, unknown>) ?? {};
        await supabase.from("client_profiles").update({
          intake_survey_responses: { ...prev, emotional_patterns: data.emotionSliders, triggers: data.triggers },
        }).eq("id", user.id);
      }
      if (s === 4) {
        const existing = await supabase.from("client_profiles").select("intake_survey_responses").eq("id", user.id).maybeSingle();
        const prev = (existing.data?.intake_survey_responses as Record<string, unknown>) ?? {};
        await supabase.from("client_profiles").update({
          co_occurring_conditions: data.conditions,
          intake_survey_responses: {
            ...prev,
            specialist_code: data.specialistCode,
            other_condition: data.otherCondition || null,
          },
        }).eq("id", user.id);
      }
      if (s === 5 && data.connectedDevice) {
        await supabase.from("device_connections").insert({
          user_id: user.id,
          device_type: data.connectedDevice,
          source_platform: data.connectedDevice,
          is_active: true,
        });
      }
      if (s === 6) {
        await updatePersonalisation({ theme: data.theme, messageTone: data.tone });
      }
    } catch {
      /* silent — don't block user */
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
      navigate("/dashboard");
    }
  };

  const stepLabels = ["About you", "Food relationship", "Emotional patterns", "Physical health", "Connect device", "Personalise", "Safety setup"];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "hsl(var(--background))" }}>
      <div className="w-full max-w-lg mx-auto flex flex-col flex-1 px-6 py-8">
        <div className="space-y-3 mb-8">
          <div className="flex items-center justify-between">
            <span className="text-xl font-heading font-semibold" style={{ color: "hsl(var(--primary))" }}>PULZ</span>
            <p className="text-xs text-muted-foreground">Step {step} of {TOTAL_STEPS} — <span className="font-medium text-foreground">{stepLabels[step - 1]}</span></p>
          </div>
          <ProgressBar step={step} />
        </div>

        <div className="flex-1 slide-up" key={step}>
          {step === 1 && <Step1 data={data} update={update} />}
          {step === 2 && <Step2 data={data} toggle={toggle} />}
          {step === 3 && <Step3 data={data} update={update} toggle={toggle} />}
          {step === 4 && <Step4 data={data} update={update} toggle={toggle} />}
          {step === 5 && <Step5 data={data} update={update} />}
          {step === 6 && <Step6 data={data} update={update} />}
          {step === 7 && <Step7 data={data} update={update} />}
        </div>

        <div className="flex items-center justify-between pt-8 mt-auto">
          {step > 1 ? (
            <button onClick={() => setStep((s) => s - 1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft size={16} /> Back
            </button>
          ) : <div />}
          <button onClick={next} disabled={!canAdvance() || saving}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl font-medium text-sm text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
            style={{ backgroundColor: "hsl(var(--primary))" }}>
            {saving ? "Saving…" : step === TOTAL_STEPS ? "Finish" : "Continue"}
            {!saving && step < TOTAL_STEPS && <ChevronRight size={16} />}
            {!saving && step === TOTAL_STEPS && <Check size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}

function Step1({ data, update }: { data: OnboardingData; update: <K extends keyof OnboardingData>(k: K, v: OnboardingData[K]) => void }) {
  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-heading font-semibold mb-1">About you</h2><p className="text-sm text-muted-foreground">This helps PULZ personalise your health insights.</p></div>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Date of birth</label>
          <input type="date" value={data.dob} onChange={(e) => update("dob", e.target.value)} className="w-full px-4 py-3 rounded-2xl border text-sm bg-card focus:outline-none" style={{ borderColor: "hsl(var(--border))" }} />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between"><label className="text-sm font-medium">Height</label><UnitToggle value={data.heightUnit} options={["cm", "ft"]} onChange={(v) => update("heightUnit", v as HeightUnit)} /></div>
          <input type="number" value={data.height} onChange={(e) => update("height", e.target.value)} placeholder={data.heightUnit === "cm" ? "e.g. 165" : "e.g. 5.5"} className="w-full px-4 py-3 rounded-2xl border text-sm bg-card focus:outline-none" style={{ borderColor: "hsl(var(--border))" }} />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between"><label className="text-sm font-medium">Weight</label><UnitToggle value={data.weightUnit} options={["kg", "lbs"]} onChange={(v) => update("weightUnit", v as WeightUnit)} /></div>
          <input type="number" value={data.weight} onChange={(e) => update("weight", e.target.value)} placeholder={data.weightUnit === "kg" ? "e.g. 62" : "e.g. 137"} className="w-full px-4 py-3 rounded-2xl border text-sm bg-card focus:outline-none" style={{ borderColor: "hsl(var(--border))" }} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Cycle tracking</label>
          <p className="text-xs text-muted-foreground">Would you like PULZ to factor in your menstrual cycle?</p>
          <div className="flex gap-3">
            {[{ label: "Yes, please", value: true }, { label: "No thanks", value: false }].map(({ label, value }) => (
              <button key={label} type="button" onClick={() => update("cycleTracking", value)} className="flex-1 py-3 rounded-2xl text-sm font-medium border-2 transition-all"
                style={data.cycleTracking === value ? { backgroundColor: "#b3ecec", borderColor: "#b3ecec", color: "#1A4040" } : { backgroundColor: "transparent", borderColor: "hsl(var(--border))" }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Step2({ data, toggle }: { data: OnboardingData; toggle: (k: "foodConcerns" | "triggers" | "conditions", item: string) => void }) {
  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-heading font-semibold mb-1">Your relationship with food</h2><p className="text-sm text-muted-foreground">Select all that feel relevant. There's no wrong answer.</p></div>
      <div className="flex flex-wrap gap-2">{FOOD_CONCERNS.map((c) => <Chip key={c} label={c} selected={data.foodConcerns.includes(c)} onToggle={() => toggle("foodConcerns", c)} />)}</div>
      <div className="rounded-2xl p-4 text-sm text-muted-foreground" style={{ backgroundColor: "hsl(var(--color-lavender-mist))", borderLeft: "3px solid hsl(var(--color-lavender))" }}>
        Your answers shape the insights PULZ surfaces — not labels. You can update these any time in Settings.
      </div>
    </div>
  );
}

function Step3({ data, update, toggle }: { data: OnboardingData; update: <K extends keyof OnboardingData>(k: K, v: OnboardingData[K]) => void; toggle: (k: "foodConcerns" | "triggers" | "conditions", item: string) => void }) {
  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-heading font-semibold mb-1">Emotional patterns</h2><p className="text-sm text-muted-foreground">How often do you experience the following?</p></div>
      <div className="space-y-5">
        {Object.entries(data.emotionSliders).map(([label, value]) => (
          <SliderRow key={label} label={label} value={value} onChange={(v) => update("emotionSliders", { ...data.emotionSliders, [label]: v })} />
        ))}
      </div>
      <div className="space-y-3">
        <label className="text-sm font-medium block">Common triggers</label>
        <div className="flex flex-wrap gap-2">{TRIGGERS.map((t) => <Chip key={t} label={t} selected={data.triggers.includes(t)} onToggle={() => toggle("triggers", t)} />)}</div>
      </div>
    </div>
  );
}

function Step4({ data, update, toggle }: { data: OnboardingData; update: <K extends keyof OnboardingData>(k: K, v: OnboardingData[K]) => void; toggle: (k: "foodConcerns" | "triggers" | "conditions", item: string) => void }) {
  const otherSelected = data.conditions.includes("Other");
  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-heading font-semibold mb-1">Physical health</h2><p className="text-sm text-muted-foreground">Helps PULZ contextualise your physiological patterns.</p></div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Do any of these apply to you?</label>
        <div className="grid grid-cols-2 gap-2">
          {CONDITIONS.map((c) => (
            <button key={c} type="button" onClick={() => toggle("conditions", c)} className="flex items-center gap-2.5 px-4 py-3 rounded-2xl border-2 text-sm text-left transition-all"
              style={data.conditions.includes(c) ? { backgroundColor: "#b3ecec", borderColor: "#b3ecec", color: "#1A4040" } : { backgroundColor: "transparent", borderColor: "hsl(var(--border))" }}>
              {data.conditions.includes(c) && <Check size={14} className="shrink-0" />}{c}
            </button>
          ))}
        </div>
        {otherSelected && (
          <input
            type="text"
            value={data.otherCondition}
            onChange={(e) => update("otherCondition", e.target.value)}
            placeholder="Please describe your condition…"
            autoFocus
            className="w-full px-4 py-3 rounded-2xl border text-sm bg-card focus:outline-none transition-all"
            style={{ borderColor: "#b3ecec" }}
          />
        )}
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Specialist code <span className="text-muted-foreground font-normal">(optional)</span></label>
        <p className="text-xs text-muted-foreground">If your therapist or dietitian gave you a code, enter it here.</p>
        <input type="text" value={data.specialistCode} onChange={(e) => update("specialistCode", e.target.value)} placeholder="e.g. DR-SMITH-4291" className="w-full px-4 py-3 rounded-2xl border text-sm bg-card font-mono focus:outline-none" style={{ borderColor: "hsl(var(--border))" }} />
      </div>
    </div>
  );
}

function Step5({ data, update }: { data: OnboardingData; update: <K extends keyof OnboardingData>(k: K, v: OnboardingData[K]) => void }) {
  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-heading font-semibold mb-1">Connect a device</h2><p className="text-sm text-muted-foreground">PULZ uses real-time biometric data to detect stress and impulse patterns.</p></div>
      <div className="grid grid-cols-2 gap-3">
        {DEVICES.map(({ id, label, icon: Icon, color }) => {
          const selected = data.connectedDevice === id;
          return (
            <button key={id} type="button" onClick={() => update("connectedDevice", selected ? null : id)}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all hover:shadow-md active:scale-[0.97]"
              style={selected ? { backgroundColor: "#b3ecec", borderColor: "#b3ecec" } : { backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}>
              <div className="p-3 rounded-xl" style={{ backgroundColor: selected ? "rgba(255,255,255,0.5)" : `${color}18` }}>
                <Icon size={24} style={{ color: selected ? "#1A4040" : color }} />
              </div>
              <span className="text-sm font-medium" style={{ color: selected ? "#1A4040" : "hsl(var(--foreground))" }}>{label}</span>
              {selected && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.6)", color: "#1A4040" }}>Connected</span>}
            </button>
          );
        })}
      </div>
      <button type="button" onClick={() => update("connectedDevice", null)} className="w-full py-3 rounded-2xl text-sm text-muted-foreground border border-dashed transition-colors hover:text-foreground" style={{ borderColor: "hsl(var(--border))" }}>
        Skip for now — I'll connect later
      </button>
    </div>
  );
}

function Step6({ data, update }: { data: OnboardingData; update: <K extends keyof OnboardingData>(k: K, v: OnboardingData[K]) => void }) {
  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-heading font-semibold mb-1">Personalise your PULZ</h2><p className="text-sm text-muted-foreground">Make it feel like yours.</p></div>
      <div className="space-y-3">
        <label className="text-sm font-medium">Colour theme</label>
        <div className="grid grid-cols-2 gap-3">
          {THEMES.map((t) => (
            <button key={t.id} type="button" onClick={() => update("theme", t.id)}
              className="rounded-xl overflow-hidden transition-all active:scale-[0.97]"
              style={data.theme === t.id ? { outline: "3px solid hsl(var(--primary))", outlineOffset: "2px" } : { outline: "1px solid hsl(var(--border))" }}>
              <div className="h-16 w-full" style={{ background: `linear-gradient(135deg, ${t.aqua}, ${t.lavender})` }} />
              <div className="p-2.5 text-left flex items-center justify-between">
                <div><p className="text-sm font-medium">{t.name}</p><p className="text-xs text-muted-foreground">{t.sub}</p></div>
                {data.theme === t.id && <Check size={14} className="text-primary shrink-0" />}
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <label className="text-sm font-medium">Communication tone</label>
        <div className="space-y-2">
          {(["gentle", "direct", "clinical"] as Tone[]).map((t) => (
            <button key={t} type="button" onClick={() => update("tone", t)}
              className="w-full flex items-start gap-3 px-4 py-3.5 rounded-2xl border-2 text-left transition-all"
              style={data.tone === t ? { backgroundColor: "#b3ecec", borderColor: "#b3ecec" } : { backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}>
              <div className="w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center" style={{ borderColor: data.tone === t ? "#1A4040" : "hsl(var(--border))" }}>
                {data.tone === t && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#1A4040" }} />}
              </div>
              <p className="text-sm font-medium capitalize" style={{ color: data.tone === t ? "#1A4040" : "hsl(var(--foreground))" }}>{t}</p>
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Preview</label>
        <div className="rounded-2xl p-4 text-sm leading-relaxed" style={{ backgroundColor: "hsl(var(--color-aqua-mist))", color: "#1A4040" }}>
          "{TONE_PREVIEWS[data.tone]}"
        </div>
      </div>
    </div>
  );
}

function Step7({ data, update }: { data: OnboardingData; update: <K extends keyof OnboardingData>(k: K, v: OnboardingData[K]) => void }) {
  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-heading font-semibold mb-1">Safety setup</h2><p className="text-sm text-muted-foreground">Optional, but recommended. You can change this any time.</p></div>
      <div className="rounded-2xl p-4 text-sm" style={{ backgroundColor: "hsl(var(--color-lavender-mist))", borderLeft: "3px solid hsl(var(--color-lavender))" }}>
        If PULZ detects a high-distress pattern, it can prompt you to reach out to someone you trust.
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Crisis contact name <span className="text-muted-foreground font-normal">(optional)</span></label>
          <input type="text" value={data.crisisName} onChange={(e) => update("crisisName", e.target.value)} placeholder="e.g. Mum, Dr. Ionescu" className="w-full px-4 py-3 rounded-2xl border text-sm bg-card focus:outline-none" style={{ borderColor: "hsl(var(--border))" }} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Phone number <span className="text-muted-foreground font-normal">(optional)</span></label>
          <input type="tel" value={data.crisisPhone} onChange={(e) => update("crisisPhone", e.target.value)} placeholder="e.g. +40 712 345 678" className="w-full px-4 py-3 rounded-2xl border text-sm bg-card font-mono focus:outline-none" style={{ borderColor: "hsl(var(--border))" }} />
        </div>
      </div>
      <label className="flex items-start gap-3 cursor-pointer">
        <div className="w-5 h-5 rounded-md border-2 shrink-0 mt-0.5 flex items-center justify-center transition-colors"
          style={data.safetyAgreed ? { backgroundColor: "#b3ecec", borderColor: "#b3ecec" } : { backgroundColor: "transparent", borderColor: "hsl(var(--border))" }}
          onClick={() => update("safetyAgreed", !data.safetyAgreed)}>
          {data.safetyAgreed && <Check size={12} color="#1A4040" />}
        </div>
        <span className="text-sm text-muted-foreground leading-relaxed">
          I understand PULZ is a wellness support tool, not a medical device or crisis service. In an emergency I will contact emergency services or a qualified professional.
        </span>
      </label>
    </div>
  );
}
