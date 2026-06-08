-- Sprint 2A: Leads Module RLS Policies

-- ---------------------------------------------------------------------------
-- LEADS
-- ---------------------------------------------------------------------------
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leads_select_company"
  ON public.leads FOR SELECT TO authenticated
  USING (
    company_id = public.get_auth_user_company_id()
    AND public.can_access_lead(assigned_user_id, created_by)
  );

CREATE POLICY "leads_insert_company"
  ON public.leads FOR INSERT TO authenticated
  WITH CHECK (
    company_id = public.get_auth_user_company_id()
    AND created_by = public.get_auth_user_id()
  );

CREATE POLICY "leads_update_company"
  ON public.leads FOR UPDATE TO authenticated
  USING (
    company_id = public.get_auth_user_company_id()
    AND public.can_access_lead(assigned_user_id, created_by)
  )
  WITH CHECK (
    company_id = public.get_auth_user_company_id()
  );

CREATE POLICY "leads_delete_company"
  ON public.leads FOR DELETE TO authenticated
  USING (
    company_id = public.get_auth_user_company_id()
    AND public.can_access_lead(assigned_user_id, created_by)
    AND public.get_auth_user_role() IN ('super_admin', 'company_admin', 'team_leader')
  );

-- ---------------------------------------------------------------------------
-- LEAD NOTES
-- ---------------------------------------------------------------------------
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lead_notes_select"
  ON public.lead_notes FOR SELECT TO authenticated
  USING (
    company_id = public.get_auth_user_company_id()
    AND EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_notes.lead_id
        AND l.company_id = lead_notes.company_id
        AND public.can_access_lead(l.assigned_user_id, l.created_by)
    )
  );

CREATE POLICY "lead_notes_insert"
  ON public.lead_notes FOR INSERT TO authenticated
  WITH CHECK (
    company_id = public.get_auth_user_company_id()
    AND created_by = public.get_auth_user_id()
    AND EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_notes.lead_id
        AND l.company_id = lead_notes.company_id
        AND public.can_access_lead(l.assigned_user_id, l.created_by)
    )
  );

CREATE POLICY "lead_notes_delete"
  ON public.lead_notes FOR DELETE TO authenticated
  USING (
    company_id = public.get_auth_user_company_id()
    AND EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_notes.lead_id
        AND l.company_id = lead_notes.company_id
        AND public.can_access_lead(l.assigned_user_id, l.created_by)
    )
  );

-- ---------------------------------------------------------------------------
-- LEAD FOLLOWUPS
-- ---------------------------------------------------------------------------
ALTER TABLE public.lead_followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lead_followups_select"
  ON public.lead_followups FOR SELECT TO authenticated
  USING (
    company_id = public.get_auth_user_company_id()
    AND EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_followups.lead_id
        AND l.company_id = lead_followups.company_id
        AND public.can_access_lead(l.assigned_user_id, l.created_by)
    )
  );

CREATE POLICY "lead_followups_insert"
  ON public.lead_followups FOR INSERT TO authenticated
  WITH CHECK (
    company_id = public.get_auth_user_company_id()
    AND created_by = public.get_auth_user_id()
    AND EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_followups.lead_id
        AND l.company_id = lead_followups.company_id
        AND public.can_access_lead(l.assigned_user_id, l.created_by)
    )
  );

CREATE POLICY "lead_followups_update"
  ON public.lead_followups FOR UPDATE TO authenticated
  USING (
    company_id = public.get_auth_user_company_id()
    AND EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_followups.lead_id
        AND l.company_id = lead_followups.company_id
        AND public.can_access_lead(l.assigned_user_id, l.created_by)
    )
  )
  WITH CHECK (company_id = public.get_auth_user_company_id());

-- ---------------------------------------------------------------------------
-- LEAD SITE VISITS
-- ---------------------------------------------------------------------------
ALTER TABLE public.lead_site_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lead_site_visits_select"
  ON public.lead_site_visits FOR SELECT TO authenticated
  USING (
    company_id = public.get_auth_user_company_id()
    AND EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_site_visits.lead_id
        AND l.company_id = lead_site_visits.company_id
        AND public.can_access_lead(l.assigned_user_id, l.created_by)
    )
  );

CREATE POLICY "lead_site_visits_insert"
  ON public.lead_site_visits FOR INSERT TO authenticated
  WITH CHECK (
    company_id = public.get_auth_user_company_id()
    AND created_by = public.get_auth_user_id()
    AND EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_site_visits.lead_id
        AND l.company_id = lead_site_visits.company_id
        AND public.can_access_lead(l.assigned_user_id, l.created_by)
    )
  );

CREATE POLICY "lead_site_visits_update"
  ON public.lead_site_visits FOR UPDATE TO authenticated
  USING (
    company_id = public.get_auth_user_company_id()
    AND EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_site_visits.lead_id
        AND l.company_id = lead_site_visits.company_id
        AND public.can_access_lead(l.assigned_user_id, l.created_by)
    )
  )
  WITH CHECK (company_id = public.get_auth_user_company_id());