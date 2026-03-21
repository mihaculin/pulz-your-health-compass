import { supabase } from "@/integrations/supabase/client";

const TRIGGERS = ["Work stress", "Loneliness", "Fatigue", "Boredom", "Conflict", "Body image", "Social event", "Other"];
const EMOTIONS = ["Anxious", "Lonely", "Bored", "Stressed", "Tired", "Angry", "Empty", "Overwhelmed", "Ashamed", "Sad", "Calm"];
const HOURS = [7, 9, 12, 14, 17, 19, 21];

export async function seedTestData(userId: string): Promise<void> {
  const reports = [];
  const now = new Date();

  for (let day = 13; day >= 0; day--) {
    const base = new Date(now);
    base.setDate(base.getDate() - day);

    const entriesPerDay = 2 + Math.floor(Math.random() * 3);
    const dayBaseMood = 4 + Math.sin(day * 0.8) * 3;

    const usedHours = new Set<number>();
    for (let e = 0; e < entriesPerDay; e++) {
      let hour = HOURS[Math.floor(Math.random() * HOURS.length)];
      while (usedHours.has(hour)) hour = HOURS[Math.floor(Math.random() * HOURS.length)];
      usedHours.add(hour);

      const ts = new Date(base);
      ts.setHours(hour, Math.floor(Math.random() * 60), 0, 0);

      const urge = Math.min(10, Math.max(1, Math.round(dayBaseMood + (Math.random() - 0.5) * 4)));
      const numTriggers = 1 + Math.floor(Math.random() * 2);
      const numEmotions = 1 + Math.floor(Math.random() * 3);

      const shuffledTriggers = [...TRIGGERS].sort(() => Math.random() - 0.5).slice(0, numTriggers);
      const shuffledEmotions = [...EMOTIONS].sort(() => Math.random() - 0.5).slice(0, numEmotions);

      reports.push({
        user_id: userId,
        timestamp: ts.toISOString(),
        urge_level: urge,
        triggers: shuffledTriggers,
        emotional_state: shuffledEmotions,
        binge_occurred: urge >= 8 && Math.random() > 0.6,
        purge_occurred: urge >= 9 && Math.random() > 0.75,
        overeating_occurred: urge >= 6 && Math.random() > 0.5,
        meal_skipped: urge >= 5 && Math.random() > 0.6,
        anxiety_level: Math.min(10, Math.round(urge * 0.8 + Math.random() * 2)),
        shame_level: Math.min(10, Math.round(urge * 0.6 + Math.random() * 2)),
        loneliness_level: Math.min(10, Math.round(urge * 0.5 + Math.random() * 3)),
        notes: null,
      });
    }
  }

  await supabase.from("self_reports").insert(reports);
}
