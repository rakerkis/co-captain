-- Add unique constraint to user_id for google_calendar_tokens
ALTER TABLE public.google_calendar_tokens
ADD CONSTRAINT google_calendar_tokens_user_id_key UNIQUE (user_id);