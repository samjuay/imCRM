-- Phase 3: Lead Source Management
-- Add archiving, updated_at, partial unique index, and admin-only RLS

-- 1. Add archived_at and updated_at columns
ALTER TABLE public.lead_sources 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 2. Add updated_at trigger
DROP TRIGGER IF EXISTS trg_lead_sources_updated_at ON public.lead_sources;
CREATE TRIGGER trg_lead_sources_updated_at
  BEFORE UPDATE ON public.lead_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Replace unique constraint with partial unique index (active only)
-- Drop existing unique constraint
ALTER TABLE public.lead_sources 
DROP CONSTRAINT IF EXISTS lead_sources_company_id_source_name_key;

-- Partial unique index: only enforce uniqueness for non-archived sources
-- Case-insensitive, trimmed comparison
CREATE UNIQUE INDEX IF NOT EXISTS lead_sources_company_id_source_name_active
ON public.lead_sources (company_id, lower(trim(source_name)))
WHERE archived_at IS NULL;

-- 4. Hardening RLS: Restrict write operations to admin roles only
-- Drop existing write policies
DROP POLICY IF EXISTS "lead_sources_insert_company" ON public.lead_sources;
DROP POLICY IF EXISTS "lead_sources_update_company" ON public.lead_sources;
DROP POLICY IF EXISTS "lead_sources_delete_company" ON public.lead_sources;

-- Admin-only INSERT
CREATE POLICY "lead_sources_insert_admin"
  ON public.lead_sources FOR INSERT TO authenticated
  WITH CHECK (
    company_id = public.get_auth_user_company_id()
    AND public.get_auth_user_role() IN ('super_admin', 'company_admin')
  );

-- Admin-only UPDATE
CREATE POLICY "lead_sources_update_admin"
  ON public.lead_sources FOR UPDATE TO authenticated
  USING (
    company_id = public.get_auth_user_company_id()
    AND public.get_auth_user_role() IN ('super_admin', 'company_admin')
  )
  WITH CHECK (
    company_id = public.get_auth_user_company_id()
    AND public.get_auth_user_role() IN ('super_admin', 'company_admin')
  );

-- Admin-only ARCHIVE (using UPDATE to set archived_at)
-- No separate DELETE policy needed - we use UPDATE to archive
-- The UPDATE policy above covers archiving

-- Optional: Allow admins to unarchive (set archived_at back to NULL)
-- This is covered by the UPDATE policy above

-- 5. Add index for archived_at queries
CREATE INDEX IF NOT EXISTS idx_lead_sources_archived_at 
ON public.lead_sources (archived_at) WHERE archived_at IS NOT NULL;

-- 6. Add index for active sources queries
CREATE INDEX IF NOT EXISTS idx_lead_sources_active 
ON public.lead_sources (company_id, is_active) WHERE archived_at IS NULL;

-- 7. Grant execute permissions for auth helper functions (already exist)
-- get_auth_user_role() already exists from foundation tables