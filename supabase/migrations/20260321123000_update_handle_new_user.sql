-- Extend handle_new_user to persist consent metadata and create base rows
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  consent_given boolean;
  terms_agreed boolean;
BEGIN
  consent_given := (NEW.raw_user_meta_data->>'consent_given')::boolean;
  terms_agreed := (NEW.raw_user_meta_data->>'terms_agreed')::boolean;

  INSERT INTO public.profiles (user_id, full_name, consent_given, consent_timestamp)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    consent_given,
    CASE WHEN consent_given THEN now() ELSE NULL END
  );

  INSERT INTO public.personalisation_settings (user_id)
  VALUES (NEW.id);

  INSERT INTO public.client_profiles (id)
  VALUES (NEW.id);

  IF consent_given THEN
    INSERT INTO public.consent_records (user_id, consent_type, consent_text_version, given_at)
    VALUES (NEW.id, 'data_consent', 'v1', now());
  END IF;

  IF terms_agreed THEN
    INSERT INTO public.consent_records (user_id, consent_type, consent_text_version, given_at)
    VALUES (NEW.id, 'terms_and_privacy', 'v1', now());
  END IF;

  RETURN NEW;
END;
$$;
