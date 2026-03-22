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
  browserNotificationsEnabled: boolean;
  notificationDuration: 3 | 5 | 10;
  notificationPosition: "top-right" | "bottom-right" | "top-center";
  inAppAlertsEnabled: boolean;
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
  soundType: "chime",
  soundVolume: 50,
  language: "English",
  browserNotificationsEnabled: false,
  notificationDuration: 5 as 3 | 5 | 10,
  notificationPosition: "bottom-right" as "top-right" | "bottom-right" | "top-center",
  inAppAlertsEnabled: true,
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
  heightCm: number | null;
  weightKg: number | null;
  conditions: string[];
  specialistCode: string | null;
  surveyTriggers: string[];
  riskLevel: "Calm" | "Elevated" | "Trigger Risk";
  subscriptionTier: "free" | "premium" | "clinic";
  subscriptionStatus: "active" | "inactive" | "cancelled" | "past_due";
  subscriptionEndDate: string | null;
  updatePersonalisation: (patch: Partial<PersonalisationSettings>) => Promise<void>;
  markIntakeSurveyCompleted: () => Promise<void>;
  setRiskLevel: (level: "Calm" | "Elevated" | "Trigger Risk") => void;
  refreshProfile: () => void;
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
    soundType: row.sound_type ?? "chime",
    soundVolume: row.sound_volume ?? 50,
    language: row.language ?? "English",
    browserNotificationsEnabled: false,
    notificationDuration: 5 as 3 | 5 | 10,
    notificationPosition: "bottom-right" as "top-right" | "bottom-right" | "top-center",
    inAppAlertsEnabled: true,
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
  const { user } = useAuth();
  const [appLoading, setAppLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [joinedAt, setJoinedAt] = useState(new Date().toISOString());
  const [intakeSurveyCompleted, setIntakeSurveyCompleted] = useState(false);
  const [personalisation, setPersonalisation] = useState<PersonalisationSettings>(DEFAULT_PERSONALISATION);
  const [psId, setPsId] = useState<string | null>(null);
  const [riskLevel, setRiskLevel] = useState<"Calm" | "Elevated" | "Trigger Risk">("Calm");
  const [hasDevice, setHasDevice] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [dateOfBirth, setDateOfBirth] = useState<string | null>(null);
  const [primaryConcerns, setPrimaryConcerns] = useState<string[]>([]);
  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [conditions, setConditions] = useState<string[]>([]);
  const [specialistCode, setSpecialistCode] = useState<string | null>(null);
  const [surveyTriggers, setSurveyTriggers] = useState<string[]>([]);
  const [subscriptionTier, setSubscriptionTier] = useState<"free" | "premium" | "clinic">("free");
  const [subscriptionStatus, setSubscriptionStatus] = useState<"active" | "inactive" | "cancelled" | "past_due">("inactive");
  const [subscriptionEndDate, setSubscriptionEndDate] = useState<string | null>(null);
  const lastFetchKey = useRef<string | null>(null);

  const refreshProfile = () => {
    lastFetchKey.current = null;
    setRefreshTick((t) => t + 1);
  };

  useEffect(() => {
    if (!user) {
      lastFetchKey.current = null;
      setAppLoading(false);
      setFullName("");
      setIntakeSurveyCompleted(false);
      setPersonalisation(DEFAULT_PERSONALISATION);
      setPsId(null);
      setHasDevice(false);
      setDateOfBirth(null);
      setPrimaryConcerns([]);
      setHeightCm(null);
      setWeightKg(null);
      setConditions([]);
      setSpecialistCode(null);
      setSurveyTriggers([]);
      setSubscriptionTier("free");
      setSubscriptionStatus("inactive");
      setSubscriptionEndDate(null);
      return;
    }

    const fetchKey = `${user.id}:${refreshTick}`;
    if (lastFetchKey.current === fetchKey) return;
    lastFetchKey.current = fetchKey;

    // ── Instant hydration from localStorage cache ──────────────────────────
    const CACHE_KEY = `pulz_profile_v1_${user.id}`;
    const cached = (() => {
      try { return JSON.parse(localStorage.getItem(CACHE_KEY) ?? "null"); }
      catch { return null; }
    })();
    if (cached) {
      setFullName(cached.fullName ?? "");
      setJoinedAt(cached.joinedAt ?? new Date().toISOString());
      setIntakeSurveyCompleted(cached.intakeSurveyCompleted ?? false);
      setPersonalisation(cached.personalisation ?? DEFAULT_PERSONALISATION);
      setPsId(cached.psId ?? null);
      setHasDevice(cached.hasDevice ?? false);
      setDateOfBirth(cached.dateOfBirth ?? null);
      setPrimaryConcerns(cached.primaryConcerns ?? []);
      setHeightCm(cached.heightCm ?? null);
      setWeightKg(cached.weightKg ?? null);
      setConditions(cached.conditions ?? []);
      setSpecialistCode(cached.specialistCode ?? null);
      setSurveyTriggers(cached.surveyTriggers ?? []);
      setSubscriptionTier(cached.subscriptionTier ?? "free");
      setSubscriptionStatus(cached.subscriptionStatus ?? "inactive");
      setSubscriptionEndDate(cached.subscriptionEndDate ?? null);
      if (cached.personalisation) {
        applyThemeById(cached.personalisation.theme, cached.personalisation.accentColor);
      }
      setAppLoading(false); // instant — no flash
    }

    const load = async () => {
      if (!cached) setAppLoading(true);

      const [profileRes, psRes, cpRes, deviceRes] = await Promise.all([
        supabase.from("profiles").select("full_name, created_at").eq("user_id", user.id).maybeSingle(),
        supabase.from("personalisation_settings").select("*").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("client_profiles")
          .select("intake_survey_completed, date_of_birth, primary_concerns, height_cm, weight_kg, co_occurring_conditions, intake_survey_responses, subscription_tier, subscription_status, subscription_end_date")
          .eq("id", user.id)
          .maybeSingle(),
        supabase.from("device_connections").select("id").eq("user_id", user.id).eq("is_active", true).limit(1).maybeSingle(),
      ]);
      setHasDevice(!!deviceRes.data);

      console.log("[AppContext] client_profiles data:", cpRes.data);
      console.log("[AppContext] client_profiles error:", cpRes.error);
      console.log("[AppContext] personalisation_settings data:", psRes.data);
      console.log("[AppContext] personalisation_settings error:", psRes.error);

      if (profileRes.data) {
        setFullName(profileRes.data.full_name ?? "");
        setJoinedAt(profileRes.data.created_at);
      }

      const localOnboardingDone = localStorage.getItem(`pulz_onboarding_${user.id}`) === "true";

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
      setHeightCm((cpRes.data as any)?.height_cm ?? null);
      setWeightKg((cpRes.data as any)?.weight_kg ?? null);
      setConditions((cpRes.data as any)?.co_occurring_conditions ?? []);
      const isr = (cpRes.data as any)?.intake_survey_responses;
      setSpecialistCode(isr?.specialist_code ?? null);
      setSurveyTriggers(isr?.triggers ?? []);
      const nextSubTier = ((cpRes.data as any)?.subscription_tier ?? "free") as "free" | "premium" | "clinic";
      const nextSubStatus = ((cpRes.data as any)?.subscription_status ?? "inactive") as "active" | "inactive" | "cancelled" | "past_due";
      const nextSubEnd = (cpRes.data as any)?.subscription_end_date ?? null;
      setSubscriptionTier(nextSubTier);
      setSubscriptionStatus(nextSubStatus);
      setSubscriptionEndDate(nextSubEnd);

      let nextPs = personalisation;
      let nextPsId = psId;
      if (psRes.data) {
        nextPs = rowToPersonalisation(psRes.data);
        nextPsId = psRes.data.id;
        setPsId(nextPsId);
        applyThemeById(nextPs.theme, nextPs.accentColor);
      }

      const webNotif = (() => {
        try { return JSON.parse(localStorage.getItem(WEB_NOTIF_KEY(user.id)) ?? "null"); }
        catch { return null; }
      })();
      if (webNotif) {
        nextPs = { ...nextPs, ...webNotif };
      }
      setPersonalisation(nextPs);

      // ── Write fresh data to localStorage cache ─────────────────────────
      const nextName = profileRes.data?.full_name ?? fullName;
      const nextJoinedAt = profileRes.data?.created_at ?? joinedAt;
      const localOnboardingDone2 = localStorage.getItem(`pulz_onboarding_${user.id}`) === "true";
      const nextCompleted = (cpRes.data?.intake_survey_completed ?? false) || localOnboardingDone2;
      const nextHasDevice = !!deviceRes.data;
      const nextDob = cpRes.data?.date_of_birth ?? null;
      const nextConcerns = cpRes.data?.primary_concerns ?? [];
      const nextHeight = (cpRes.data as any)?.height_cm ?? null;
      const nextWeight = (cpRes.data as any)?.weight_kg ?? null;
      const nextConds = (cpRes.data as any)?.co_occurring_conditions ?? [];
      const nextIsr = (cpRes.data as any)?.intake_survey_responses;
      const nextCode = nextIsr?.specialist_code ?? null;
      const nextTriggers = nextIsr?.triggers ?? [];

      localStorage.setItem(CACHE_KEY, JSON.stringify({
        fullName: nextName,
        joinedAt: nextJoinedAt,
        intakeSurveyCompleted: nextCompleted,
        personalisation: nextPs,
        psId: nextPsId,
        hasDevice: nextHasDevice,
        dateOfBirth: nextDob,
        primaryConcerns: nextConcerns,
        heightCm: nextHeight,
        weightKg: nextWeight,
        conditions: nextConds,
        specialistCode: nextCode,
        surveyTriggers: nextTriggers,
        subscriptionTier: nextSubTier,
        subscriptionStatus: nextSubStatus,
        subscriptionEndDate: nextSubEnd,
      }));

      setAppLoading(false);
    };

    load();
  }, [user, refreshTick]);

  const WEB_NOTIF_KEY = (uid: string) => `pulz_web_notif_${uid}`;

  const updatePersonalisation = async (patch: Partial<PersonalisationSettings>) => {
    const next = { ...personalisation, ...patch };
    setPersonalisation(next);

    if (patch.theme !== undefined || patch.accentColor !== undefined) {
      applyThemeById(next.theme, next.accentColor);
    }

    if (!user) return;

    if (
      "browserNotificationsEnabled" in patch ||
      "notificationDuration" in patch ||
      "notificationPosition" in patch ||
      "inAppAlertsEnabled" in patch
    ) {
      localStorage.setItem(
        WEB_NOTIF_KEY(user.id),
        JSON.stringify({
          browserNotificationsEnabled: next.browserNotificationsEnabled,
          notificationDuration: next.notificationDuration,
          notificationPosition: next.notificationPosition,
          inAppAlertsEnabled: next.inAppAlertsEnabled,
        })
      );
    }

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
    if (!user) return;
    localStorage.setItem(`pulz_onboarding_${user.id}`, "true");
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
        heightCm,
        weightKg,
        conditions,
        specialistCode,
        surveyTriggers,
        riskLevel,
        subscriptionTier,
        subscriptionStatus,
        subscriptionEndDate,
        updatePersonalisation,
        markIntakeSurveyCompleted,
        setRiskLevel,
        refreshProfile,
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
