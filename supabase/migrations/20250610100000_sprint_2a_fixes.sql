-- Sprint 2A Fixes: Site visit workflow, followup outcomes, teams, user management

-- ---------------------------------------------------------------------------
-- 1. Site visit status workflow
-- ---------------------------------------------------------------------------
ALTER TABLE public.lead_site_visits
  DROP CONSTRAINT IF EXISTS lead_site_visits_visit_status_check;

UPDATE public.lead_site_visits
SET visit_status = 'done'
WHERE visit_status = 'completed';

ALTER TABLE public.lead_site_visits
  ADD CONSTRAINT lead_site_visits_visit_status_check
  CHECK (visit_status IN ('planned', 'done', 'cancelled', 'rescheduled'));

-- ---------------------------------------------------------------------------
-- 2. Followup outcome tracking
-- ---------------------------------------------------------------------------
ALTER TABLE public.lead_followups
  ADD COLUMN IF NOT EXISTS outcome TEXT;

ALTER TABLE public.lead_followups
  DROP CONSTRAINT IF EXISTS lead_followups_outcome_check;

ALTER TABLE public.lead_followups
  ADD CONSTRAINT lead_followups_outcome_check
  CHECK (outcome IS NULL OR outcome IN (
    'pending',
    'connected',
    'no_response',
    'interested',
    'not_interested',
    'rescheduled',
    'cancelled'
  ));

UPDATE public.lead_followups
SET outcome = 'pending'
WHERE outcome IS NULL;

-- ---------------------------------------------------------------------------
-- 3. Teams table (hierarchy support)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  team_leader_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, team_name)
);

CREATE INDEX IF NOT EXISTS idx_teams_company_id ON public.teams(company_id);
CREATE INDEX IF NOT EXISTS idx_teams_leader_id ON public.teams(team_leader_id);

DROP TRIGGER IF EXISTS trg_teams_updated_at ON public.teams;
CREATE TRIGGER trg_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Users: ensure mobile column usable for phone field
-- ---------------------------------------------------------------------------
-- public.users.mobile already exists from Sprint 1B

-- ---------------------------------------------------------------------------
-- 5. Teams RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teams_select_company" ON public.teams;
CREATE POLICY "teams_select_company"
  ON public.teams FOR SELECT TO authenticated
  USING (company_id = public.get_auth_user_company_id());

DROP POLICY IF EXISTS "teams_insert_admin" ON public.teams;
CREATE POLICY "teams_insert_admin"
  ON public.teams FOR INSERT TO authenticated
  WITH CHECK (
    company_id = public.get_auth_user_company_id()
    AND public.get_auth_user_role() IN ('super_admin', 'company_admin')
  );

DROP POLICY IF EXISTS "teams_update_admin" ON public.teams;
CREATE POLICY "teams_update_admin"
  ON public.teams FOR UPDATE TO authenticated
  USING (
    company_id = public.get_auth_user_company_id()
    AND public.get_auth_user_role() IN ('super_admin', 'company_admin')
  )
  WITH CHECK (company_id = public.get_auth_user_company_id());

-- ---------------------------------------------------------------------------
-- 6. Users: company admin can create team members
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "users_insert_admin" ON public.users;
CREATE POLICY "users_insert_admin"
  ON public.users FOR INSERT TO authenticated
  WITH CHECK (
    company_id = public.get_auth_user_company_id()
    AND public.get_auth_user_role() IN ('super_admin', 'company_admin')
    AND role IN ('team_leader', 'sales_executive')
  );

DROP POLICY IF EXISTS "users_update_admin" ON public.users;
CREATE POLICY "users_update_admin"
  ON public.users FOR UPDATE TO authenticated
  USING (
    company_id = public.get_auth_user_company_id()
    AND public.get_auth_user_role() IN ('super_admin', 'company_admin')
  )
  WITH CHECK (company_id = public.get_auth_user_company_id());