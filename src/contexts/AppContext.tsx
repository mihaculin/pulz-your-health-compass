import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { applyThemeById } from "@/lib/theme";
import type { Tables } from "@/integrations/supabase/types";

export interface PersonalisationSettings {
  theme: string;
  accentColor: string;
  messageTone: string;
  message1: string;
  message2: string;
  message3: string;
  crisisContactName: string;
  crisisContactPhone: string;
  vibrationPattern: string;
  vibrationIntensity: number;
  soundEnabled: boolean;
  soundType: string;
  soundVolume: number;
  language: string;
  quietHoursStart: string;
  quietHoursEnd: string;
}

const DEFAULT_PERSONALISATION: PersonalisationSettings = {
  theme: "aqua-bloom",
  accentColor: "#b3ecec",
  messageTone: "warm",
  message1: "Take a slow breath. You're safe right now.",
  message2: "Let's pause together. One breath at a time.",
  message3: "You got through it. That took strength.",
  crisisContactName: "",
  crisisContactPhone: "",
  vibrationPattern: "gentle",
  vibrationIntensity: 3,
  soundEnabled: false,
  soundType: "Soft chime",
  soundVolume: 50,
  language: "English",
  quietHoursStart: "22:00",
  quietHoursEnd: "08:00",
};

interface AppContextType {
  fullName: string;
  initials: string;
  joinedWeeksAgo: number;
  intakeSurveyCompleted: boolean;
  appLoading: boolean;
  hasDevice: boolean;
  personalisation: PersonalisationSettings;
  dateOfBirth: string | null;
  primaryConcerns: string[];
  riskLevel: "Calm" | "Elevated" | "Trigger Risk";
  updatePersonalisation: (patch: Partial<PersonalisationSettings>) => Promise<void>;
  markIntakeSurveyCompleted: () => Promise<void>;
  setRiskLevel: (level: "Calm" | "Elevated" | "Trigger Risk") => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function rowToPersonalisation(row: Tables<"personalisation_settings">): PersonalisationSettings {
  return {
    theme: row.theme ?? "aqua-bloom",
    accentColor: row.accent_color ?? "#b3ecec",
    messageTone: row.message_tone ?? "warm",
    message1: row.intervention_message_1 ?? "Take a slow breath. You're safe right now.",
    message2: row.intervention_message_2 ?? "Let's pause together. One breath at a time.",
    message3: row.intervention_message_3 ?? "You got through it. That took strength.",
    crisisContactName: row.crisis_contact_name ?? "",
    crisisContactPhone: row.crisis_contact_phone ?? "",
    vibrationPattern: row.vibration_pattern ?? "gentle",
    vibrationIntensity: row.vibration_intensity ?? 3,
    soundEnabled: row.sound_enabled ?? false,
    soundType: row.sound_type ?? "Soft chime",
    soundVolume: row.sound_volume ?? 50,
    language: row.language ?? "English",
    quietHoursStart: row.quiet_hours_start ?? "22:00",
    quietHoursEnd: row.quiet_hours_end ?? "08:00",
  };
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function weeksAgo(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / (7 * 24 * 60 * 60 * 1000));
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, role } = useAuth();
  const [appLoading, setAppLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [joinedAt, setJoinedAt] = useState(new Date().toISOString());
  const [intakeSurveyCompleted, setIntakeSurveyCompleted] = useState(false);
  const [personalisation, setPersonalisation] = useState<PersonalisationSettings>(DEFAULT_PERSONALISATION);
  const [psId, setPsId] = useState<string | null>(null);
  const [riskLevel, setRiskLevel] = useState<"Calm" | "Elevated" | "Trigger Risk">("Calm");
  const [hasDevice, setHasDevice] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState<string | null>(null);
  const [primaryConcerns, setPrimaryConcerns] = useState<string[]>([]);
  const prevUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      prevUserId.current = null;
      setAppLoading(false);
      setFullName("");
      setIntakeSurveyCompleted(false);
      setPersonalisation(DEFAULT_PERSONALISATION);
      setPsId(null);
      setHasDevice(false);
      setDateOfBirth(null);
      setPrimaryConcerns([]);
      return;
    }

    if (prevUserId.current === user.id) return;
    prevUserId.current = user.id;

    const load = async () => {
      setAppLoading(true);

      const [profileRes, psRes, cpRes, deviceRes] = await Promise.all([
        supabase.from("profiles").select("full_name, created_at").eq("user_id", user.id).maybeSingle(),
        supabase.from("personalisation_settings").select("*").eq("user_id", user.id).maybeSingle(),
        role === "client"
          ? supabase
              .from("client_profiles")
              .select("intake_survey_completed, date_of_birth, primary_concerns")
              .eq("id", user.id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        supabase.from("device_connections").select("id").eq("user_id", user.id).eq("is_active", true).limit(1).maybeSingle(),
      ]);
      setHasDevice(!!deviceRes.data);

      if (profileRes.data) {
        setFullName(profileRes.data.full_name ?? "");
        setJoinedAt(profileRes.data.created_at);
      }

      const localOnboardingDone = localStorage.getItem("pulz_onboarding_completed") === "true";

      if (role === "specialist") {
        setIntakeSurveyCompleted(true);
        setDateOfBirth(null);
        setPrimaryConcerns([]);
      } else {
        const dbCompleted = cpRes.data?.intake_survey_completed ?? false;
        const completed = dbCompleted || localOnboardingDone;
        setIntakeSurveyCompleted(completed);
        if (completed && !dbCompleted) {
          await supabase
            .from("client_profiles")
            .update({ intake_survey_completed: true, onboarding_completed: true })
            .eq("id", user.id);
        }
        setDateOfBirth(cpRes.data?.date_of_birth ?? null);
        setPrimaryConcerns(cpRes.data?.primary_concerns ?? []);
      }

      if (psRes.data) {
        const ps = rowToPersonalisation(psRes.data);
        setPsId(psRes.data.id);
        setPersonalisation(ps);
        applyThemeById(ps.theme, ps.accentColor);
      }

      setAppLoading(false);
    };

    load();
  }, [user, role]);

  const updatePersonalisation = async (patch: Partial<PersonalisationSettings>) => {
    const next = { ...personalisation, ...patch };
    setPersonalisation(next);

    if (patch.theme !== undefined || patch.accentColor !== undefined) {
      applyThemeById(next.theme, next.accentColor);
    }

    if (!user) return;

    const payload = {
      user_id: user.id,
      theme: next.theme,
      accent_color: next.accentColor,
      message_tone: next.messageTone,
      intervention_message_1: next.message1,
      intervention_message_2: next.message2,
      intervention_message_3: next.message3,
      crisis_contact_name: next.crisisContactName,
      crisis_contact_phone: next.crisisContactPhone,
      vibration_pattern: next.vibrationPattern,
      vibration_intensity: next.vibrationIntensity,
      sound_enabled: next.soundEnabled,
      sound_type: next.soundType,
      sound_volume: next.soundVolume,
      language: next.language,
      quiet_hours_start: next.quietHoursStart,
      quiet_hours_end: next.quietHoursEnd,
      updated_at: new Date().toISOString(),
    };

    if (psId) {
      await supabase.from("personalisation_settings").update(payload).eq("id", psId);
    } else {
      const { data } = await supabase
        .from("personalisation_settings")
        .insert(payload)
        .select("id")
        .single();
      if (data) setPsId(data.id);
    }
  };

  const markIntakeSurveyCompleted = async () => {
    setIntakeSurveyCompleted(true);
    localStorage.setItem("pulz_onboarding_completed", "true");
    if (!user) return;
    await supabase
      .from("client_profiles")
      .update({ intake_survey_completed: true, onboarding_completed: true })
      .eq("id", user.id);
  };

  const initials = getInitials(fullName || "U");
  const joinedWeeksAgo = weeksAgo(joinedAt);

  return (
    <AppContext.Provider
      value={{
        fullName,
        initials,
        joinedWeeksAgo,
        intakeSurveyCompleted,
        appLoading,
        hasDevice,
        personalisation,
        dateOfBirth,
        primaryConcerns,
        riskLevel,
        updatePersonalisation,
        markIntakeSurveyCompleted,
        setRiskLevel,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
