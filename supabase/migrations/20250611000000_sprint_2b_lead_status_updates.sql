-- Sprint 2B: Structured status update activity log for Lead Details workflow
-- This table stores every transition performed via the new "Status Update" tab.
-- Follows the exact same scoping + RLS patterns as lead_notes.
-- Existing lead_followups and lead_site_visits tables are untouched.

CREATE TABLE public.lead_status_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  outcome TEXT,
  remark TEXT,
  next_followup_date TIMESTAMPTZ,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  visit_date TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_status_updates_lead_id ON public.lead_status_updates(lead_id);
CREATE INDEX idx_lead_status_updates_company_id ON public.lead_status_updates(company_id);
CREATE INDEX idx_lead_status_updates_created_at ON public.lead_status_updates(company_id, created_at DESC);

-- RLS (modeled directly on lead_notes policies, including can_access_lead for sales executives)
ALTER TABLE public.lead_status_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lead_status_updates_select"
  ON public.lead_status_updates FOR SELECT TO authenticated
  USING (
    company_id = public.get_auth_user_company_id()
    AND EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_status_updates.lead_id
        AND l.company_id = lead_status_updates.company_id
        AND public.can_access_lead(l.assigned_user_id, l.created_by)
    )
  );

CREATE POLICY "lead_status_updates_insert"
  ON public.lead_status_updates FOR INSERT TO authenticated
  WITH CHECK (
    company_id = public.get_auth_user_company_id()
    AND created_by = public.get_auth_user_id()
    AND EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_status_updates.lead_id
        AND l.company_id = lead_status_updates.company_id
        AND public.can_access_lead(l.assigned_user_id, l.created_by)
    )
  );

-- Logs are append-only (no UPDATE/DELETE policies by design).
