-- Migration to support structured Site Reviews and Surveys
-- Paste this script into your Supabase SQL editor.

alter table public.site_reviews
  add column if not exists survey_responses jsonb;
