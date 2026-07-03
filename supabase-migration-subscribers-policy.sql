-- Migration: Allow admin role to read all push subscriptions
CREATE POLICY "Admin read all push subscriptions" ON push_subscriptions
  FOR SELECT
  USING ((((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text));
