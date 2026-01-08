CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: assignment_completions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assignment_completions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assignment_id text NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: custom_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.custom_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    due_at timestamp with time zone,
    course_name text,
    description text,
    links text,
    priority text DEFAULT 'medium'::text,
    completed boolean DEFAULT false NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    type text DEFAULT 'assignment'::text NOT NULL,
    CONSTRAINT custom_assignments_type_check CHECK ((type = ANY (ARRAY['assignment'::text, 'event'::text])))
);


--
-- Name: google_calendar_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.google_calendar_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    access_token text NOT NULL,
    refresh_token text,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: assignment_completions assignment_completions_assignment_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_completions
    ADD CONSTRAINT assignment_completions_assignment_id_key UNIQUE (assignment_id);


--
-- Name: assignment_completions assignment_completions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_completions
    ADD CONSTRAINT assignment_completions_pkey PRIMARY KEY (id);


--
-- Name: custom_assignments custom_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_assignments
    ADD CONSTRAINT custom_assignments_pkey PRIMARY KEY (id);


--
-- Name: google_calendar_tokens google_calendar_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_calendar_tokens
    ADD CONSTRAINT google_calendar_tokens_pkey PRIMARY KEY (id);


--
-- Name: google_calendar_tokens google_calendar_tokens_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_calendar_tokens
    ADD CONSTRAINT google_calendar_tokens_user_id_key UNIQUE (user_id);


--
-- Name: assignment_completions update_assignment_completions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_assignment_completions_updated_at BEFORE UPDATE ON public.assignment_completions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: custom_assignments update_custom_assignments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_custom_assignments_updated_at BEFORE UPDATE ON public.custom_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: google_calendar_tokens update_google_calendar_tokens_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_google_calendar_tokens_updated_at BEFORE UPDATE ON public.google_calendar_tokens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: custom_assignments custom_assignments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_assignments
    ADD CONSTRAINT custom_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: assignment_completions Anyone can create completions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can create completions" ON public.assignment_completions FOR INSERT WITH CHECK (true);


--
-- Name: assignment_completions Anyone can update completions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update completions" ON public.assignment_completions FOR UPDATE USING (true);


--
-- Name: assignment_completions Anyone can view completions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view completions" ON public.assignment_completions FOR SELECT USING (true);


--
-- Name: custom_assignments Users can create their own custom assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own custom assignments" ON public.custom_assignments FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: custom_assignments Users can delete their own custom assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own custom assignments" ON public.custom_assignments FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: google_calendar_tokens Users can delete their own tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own tokens" ON public.google_calendar_tokens FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: google_calendar_tokens Users can insert their own tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own tokens" ON public.google_calendar_tokens FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: custom_assignments Users can update their own custom assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own custom assignments" ON public.custom_assignments FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: google_calendar_tokens Users can update their own tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own tokens" ON public.google_calendar_tokens FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: custom_assignments Users can view their own custom assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own custom assignments" ON public.custom_assignments FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: google_calendar_tokens Users can view their own tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own tokens" ON public.google_calendar_tokens FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: assignment_completions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assignment_completions ENABLE ROW LEVEL SECURITY;

--
-- Name: custom_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.custom_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: google_calendar_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.google_calendar_tokens ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;