
-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('client', 'specialist');

-- Create user roles table (security best practice - separate from profiles)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Profiles table (shared for all users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  preferred_language TEXT DEFAULT 'en',
  theme_preference TEXT DEFAULT 'aqua_bloom',
  consent_given BOOLEAN DEFAULT FALSE,
  consent_timestamp TIMESTAMPTZ,
  notification_preferences JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Specialists can view client profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'specialist'));

-- Client profiles
CREATE TABLE public.client_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  date_of_birth DATE,
  gender TEXT,
  height_cm NUMERIC,
  weight_kg NUMERIC,
  primary_concerns TEXT[],
  co_occurring_conditions TEXT[],
  medications TEXT,
  eating_disorder_history_years INTEGER,
  menstrual_cycle_tracking BOOLEAN DEFAULT FALSE,
  assigned_specialist_id UUID REFERENCES auth.users(id),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  intake_survey_completed BOOLEAN DEFAULT FALSE,
  intake_survey_responses JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own client profile" ON public.client_profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Clients can update own client profile" ON public.client_profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Clients can insert own client profile" ON public.client_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Specialists can view assigned client profiles" ON public.client_profiles
  FOR SELECT USING (
    public.has_role(auth.uid(), 'specialist')
    AND assigned_specialist_id = auth.uid()
  );

-- Specialist profiles
CREATE TABLE public.specialist_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  specialty TEXT[],
  license_number TEXT,
  institution TEXT,
  bio TEXT,
  client_ids UUID[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.specialist_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Specialists can view own profile" ON public.specialist_profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Specialists can update own profile" ON public.specialist_profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Specialists can insert own profile" ON public.specialist_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Clients can view their assigned specialist" ON public.specialist_profiles
  FOR SELECT USING (auth.uid() = ANY(client_ids));

-- Device connections
CREATE TABLE public.device_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_type TEXT NOT NULL,
  source_platform TEXT,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expiry TIMESTAMPTZ,
  last_sync TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  scopes_granted TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.device_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own devices" ON public.device_connections
  FOR ALL USING (auth.uid() = user_id);

-- Sensor samples
CREATE TABLE public.sensor_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_type TEXT,
  source_platform TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  heart_rate NUMERIC,
  resting_heart_rate NUMERIC,
  hrv_sdnn NUMERIC,
  ibi_ms NUMERIC,
  respiration_rate NUMERIC,
  spo2 NUMERIC,
  skin_temperature_delta NUMERIC,
  stress_score NUMERIC,
  body_battery NUMERIC,
  steps INTEGER,
  activity_state TEXT,
  sleep_state TEXT,
  gyro_event TEXT,
  confidence TEXT,
  raw_payload_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sensor_samples ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own sensor data" ON public.sensor_samples
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Specialists can view client sensor data" ON public.sensor_samples
  FOR SELECT USING (
    public.has_role(auth.uid(), 'specialist')
    AND EXISTS (
      SELECT 1 FROM public.client_profiles
      WHERE client_profiles.id = sensor_samples.user_id
      AND client_profiles.assigned_specialist_id = auth.uid()
    )
  );
CREATE INDEX idx_sensor_samples_user_time ON public.sensor_samples (user_id, timestamp DESC);

-- Baseline profiles
CREATE TABLE public.baseline_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  window_days INTEGER,
  daypart TEXT,
  hr_mean NUMERIC,
  hr_std NUMERIC,
  hrv_mean NUMERIC,
  hrv_std NUMERIC,
  stress_mean NUMERIC,
  stress_std NUMERIC,
  rhr_mean NUMERIC,
  rhr_std NUMERIC,
  last_calculated TIMESTAMPTZ
);
ALTER TABLE public.baseline_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own baselines" ON public.baseline_profiles
  FOR ALL USING (auth.uid() = user_id);

-- Intervention events (created before risk_windows due to FK)
CREATE TABLE public.intervention_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  risk_window_id UUID,
  sent_at TIMESTAMPTZ,
  channel TEXT,
  intervention_type TEXT,
  message_text TEXT,
  vibration_pattern TEXT,
  user_opened BOOLEAN DEFAULT FALSE,
  user_response TEXT,
  follow_up_sent_at TIMESTAMPTZ,
  follow_up_response TEXT,
  helpful BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.intervention_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own interventions" ON public.intervention_events
  FOR ALL USING (auth.uid() = user_id);

-- Risk windows
CREATE TABLE public.risk_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  urge_risk_score NUMERIC,
  binge_risk_score NUMERIC,
  purge_risk_score NUMERIC,
  confidence_level TEXT,
  confidence_score NUMERIC,
  dominant_drivers TEXT[],
  recommended_action TEXT,
  intervention_sent BOOLEAN DEFAULT FALSE,
  intervention_id UUID REFERENCES public.intervention_events(id),
  confirmed_by_user BOOLEAN,
  user_feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.risk_windows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own risk windows" ON public.risk_windows
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Specialists can view client risk windows" ON public.risk_windows
  FOR SELECT USING (
    public.has_role(auth.uid(), 'specialist')
    AND EXISTS (
      SELECT 1 FROM public.client_profiles
      WHERE client_profiles.id = risk_windows.user_id
      AND client_profiles.assigned_specialist_id = auth.uid()
    )
  );
ALTER TABLE public.intervention_events
  ADD CONSTRAINT fk_intervention_risk_window
  FOREIGN KEY (risk_window_id) REFERENCES public.risk_windows(id);
CREATE INDEX idx_risk_windows_user_time ON public.risk_windows (user_id, started_at DESC);

-- Self reports
CREATE TABLE public.self_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  urge_level INTEGER,
  binge_occurred BOOLEAN,
  purge_occurred BOOLEAN,
  overeating_occurred BOOLEAN,
  meal_skipped BOOLEAN,
  anxiety_level INTEGER,
  shame_level INTEGER,
  loneliness_level INTEGER,
  emotional_state TEXT[],
  triggers TEXT[],
  notes TEXT,
  location_context TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.self_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own self reports" ON public.self_reports
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Specialists can view client self reports" ON public.self_reports
  FOR SELECT USING (
    public.has_role(auth.uid(), 'specialist')
    AND EXISTS (
      SELECT 1 FROM public.client_profiles
      WHERE client_profiles.id = self_reports.user_id
      AND client_profiles.assigned_specialist_id = auth.uid()
    )
  );

-- Episode labels
CREATE TABLE public.episode_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  risk_window_id UUID REFERENCES public.risk_windows(id),
  labeled_at TIMESTAMPTZ DEFAULT now(),
  label TEXT,
  labeled_by TEXT,
  notes TEXT
);
ALTER TABLE public.episode_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own episode labels" ON public.episode_labels
  FOR ALL USING (auth.uid() = user_id);

-- Safety alerts
CREATE TABLE public.safety_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  triggered_at TIMESTAMPTZ DEFAULT now(),
  trigger_type TEXT,
  message_shown TEXT,
  cta_clicked TEXT,
  emergency_contact_notified BOOLEAN DEFAULT FALSE,
  resolved BOOLEAN DEFAULT FALSE
);
ALTER TABLE public.safety_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own safety alerts" ON public.safety_alerts
  FOR ALL USING (auth.uid() = user_id);

-- Consent records
CREATE TABLE public.consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT,
  consent_text_version TEXT,
  given_at TIMESTAMPTZ DEFAULT now(),
  ip_address TEXT,
  revoked_at TIMESTAMPTZ
);
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own consent records" ON public.consent_records
  FOR ALL USING (auth.uid() = user_id);

-- Specialist sessions
CREATE TABLE public.specialist_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  specialist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  status TEXT DEFAULT 'scheduled',
  session_type TEXT,
  notes TEXT,
  next_session_at TIMESTAMPTZ,
  goals_discussed TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.specialist_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Specialists can manage own sessions" ON public.specialist_sessions
  FOR ALL USING (auth.uid() = specialist_id);
CREATE POLICY "Clients can view own sessions" ON public.specialist_sessions
  FOR SELECT USING (auth.uid() = client_id);

-- Specialist notes
CREATE TABLE public.specialist_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  specialist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  written_at TIMESTAMPTZ DEFAULT now(),
  note_text TEXT,
  note_type TEXT,
  visible_to_client BOOLEAN DEFAULT FALSE,
  week_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.specialist_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Specialists can manage own notes" ON public.specialist_notes
  FOR ALL USING (auth.uid() = specialist_id);
CREATE POLICY "Clients can view visible notes" ON public.specialist_notes
  FOR SELECT USING (auth.uid() = client_id AND visible_to_client = TRUE);

-- Personalisation settings
CREATE TABLE public.personalisation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'aqua_bloom',
  accent_color TEXT DEFAULT '#b3ecec',
  message_tone TEXT DEFAULT 'warm_nurturing',
  intervention_message_1 TEXT DEFAULT 'Take a slow breath. You''re safe right now.',
  intervention_message_2 TEXT DEFAULT 'Let''s pause together. One breath at a time.',
  intervention_message_3 TEXT DEFAULT 'You got through it. That took strength.',
  vibration_pattern TEXT DEFAULT 'gentle_pulse',
  vibration_intensity INTEGER DEFAULT 3,
  sound_enabled BOOLEAN DEFAULT FALSE,
  sound_type TEXT DEFAULT 'soft_chime',
  sound_volume INTEGER DEFAULT 50,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '08:00',
  language TEXT DEFAULT 'en',
  hide_exercise_metrics BOOLEAN DEFAULT FALSE,
  crisis_contact_name TEXT,
  crisis_contact_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.personalisation_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own personalisation" ON public.personalisation_settings
  FOR ALL USING (auth.uid() = user_id);

-- Auto-create profile + personalisation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));

  INSERT INTO public.personalisation_settings (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_client_profiles_updated_at BEFORE UPDATE ON public.client_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_specialist_profiles_updated_at BEFORE UPDATE ON public.specialist_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_personalisation_updated_at BEFORE UPDATE ON public.personalisation_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
