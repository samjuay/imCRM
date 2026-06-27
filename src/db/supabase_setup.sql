-- ==========================================
-- ImCRM Supabase Production Setup Script
-- ==========================================
-- This script configures:
-- 1. Insertion of the initial tenant Company.

-- 2. ESTABLISH FIRST RESILIENT CORPORATE ENTITY
-- Insert an operational corporate workspace profile.
-- Keep the ID constant or dynamic to match.
INSERT INTO public.companies (id, name, is_active, created_at, updated_at)
VALUES (
  '99999999-9999-9999-9999-999999999999',
  'Primary Operations',
  TRUE,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

