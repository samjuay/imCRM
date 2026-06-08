-- Sprint 2A: Leads Core Module Tables

-- ---------------------------------------------------------------------------
-- Helper: resolve authenticated user's public.users id
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_auth_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- ---------------------------------------------------------------------------
-- Helper: role-based lead access (sales_executive = own data only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_access_lead(
  p_assigned_user_id UUID,
  p_created_by UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.get_auth_user_role() IN ('super_admin', 'company_admin', 'team_leader')
      THEN true
    WHEN public.get_auth_user_role() = 'sales_executive'
      THEN p_assigned_user_id = public.get_auth_user_id()
        OR p_created_by = public.get_auth_user_id()
    ELSE false
  END;
$$;

-- ---------------------------------------------------------------------------
-- 1. LEADS
-- ---------------------------------------------------------------------------
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  assigned_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  lead_source_id UUID NOT NULL REFERENCES public.lead_sources(id) ON DELETE RESTRICT,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  budget NUMERIC(14, 2),
  location TEXT,
  requirement TEXT,
  status_id UUID NOT NULL REFERENCES public.lead_statuses(id) ON DELETE RESTRICT,
  remarks TEXT,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_company_id ON public.leads(company_id);
CREATE INDEX idx_leads_phone ON public.leads(company_id, phone);
CREATE INDEX idx_leads_status_id ON public.leads(company_id, status_id);
CREATE INDEX idx_leads_assigned_user_id ON public.leads(company_id, assigned_user_id);
CREATE INDEX idx_leads_created_at ON public.leads(company_id, created_at DESC);

CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. LEAD NOTES
-- ---------------------------------------------------------------------------
CREATE TABLE public.lead_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_notes_lead_id ON public.lead_notes(lead_id);
CREATE INDEX idx_lead_notes_company_id ON public.lead_notes(company_id);

-- ---------------------------------------------------------------------------
-- 3. LEAD FOLLOWUPS
-- ---------------------------------------------------------------------------
CREATE TABLE public.lead_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  followup_type_id UUID NOT NULL REFERENCES public.followup_types(id) ON DELETE RESTRICT,
  followup_date TIMESTAMPTZ NOT NULL,
  remarks TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_followups_lead_id ON public.lead_followups(lead_id);
CREATE INDEX idx_lead_followups_company_id ON public.lead_followups(company_id);
CREATE INDEX idx_lead_followups_date ON public.lead_followups(company_id, followup_date);

-- ---------------------------------------------------------------------------
-- 4. LEAD SITE VISITS
-- ---------------------------------------------------------------------------
CREATE TABLE public.lead_site_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  visit_date TIMESTAMPTZ NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  remarks TEXT,
  visit_status TEXT NOT NULL DEFAULT 'planned'
    CHECK (visit_status IN ('planned', 'completed', 'cancelled')),
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_site_visits_lead_id ON public.lead_site_visits(lead_id);
CREATE INDEX idx_lead_site_visits_company_id ON public.lead_site_visits(company_id);
CREATE INDEX idx_lead_site_visits_date ON public.lead_site_visits(company_id, visit_date);

-- ---------------------------------------------------------------------------
-- Users: allow company members to list colleagues (for assignee dropdown)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'users_select_company'
  ) THEN
    CREATE POLICY "users_select_company"
      ON public.users FOR SELECT TO authenticated
      USING (company_id = public.get_auth_user_company_id());
  END IF;
END $$;