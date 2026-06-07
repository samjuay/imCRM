-- Sprint 1C: Row Level Security Policies
-- Rule: users access only records belonging to their company

-- ---------------------------------------------------------------------------
-- PROJECTS
-- ---------------------------------------------------------------------------
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_select_company"
  ON public.projects FOR SELECT TO authenticated
  USING (company_id = public.get_auth_user_company_id());

CREATE POLICY "projects_insert_company"
  ON public.projects FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_auth_user_company_id());

CREATE POLICY "projects_update_company"
  ON public.projects FOR UPDATE TO authenticated
  USING (company_id = public.get_auth_user_company_id())
  WITH CHECK (company_id = public.get_auth_user_company_id());

CREATE POLICY "projects_delete_company"
  ON public.projects FOR DELETE TO authenticated
  USING (company_id = public.get_auth_user_company_id());

-- ---------------------------------------------------------------------------
-- PROJECT CONFIGURATIONS
-- ---------------------------------------------------------------------------
ALTER TABLE public.project_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_configurations_select_company"
  ON public.project_configurations FOR SELECT TO authenticated
  USING (company_id = public.get_auth_user_company_id());

CREATE POLICY "project_configurations_insert_company"
  ON public.project_configurations FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_auth_user_company_id());

CREATE POLICY "project_configurations_update_company"
  ON public.project_configurations FOR UPDATE TO authenticated
  USING (company_id = public.get_auth_user_company_id())
  WITH CHECK (company_id = public.get_auth_user_company_id());

CREATE POLICY "project_configurations_delete_company"
  ON public.project_configurations FOR DELETE TO authenticated
  USING (company_id = public.get_auth_user_company_id());

-- ---------------------------------------------------------------------------
-- PROJECT INVENTORY
-- ---------------------------------------------------------------------------
ALTER TABLE public.project_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_inventory_select_company"
  ON public.project_inventory FOR SELECT TO authenticated
  USING (company_id = public.get_auth_user_company_id());

CREATE POLICY "project_inventory_insert_company"
  ON public.project_inventory FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_auth_user_company_id());

CREATE POLICY "project_inventory_update_company"
  ON public.project_inventory FOR UPDATE TO authenticated
  USING (company_id = public.get_auth_user_company_id())
  WITH CHECK (company_id = public.get_auth_user_company_id());

CREATE POLICY "project_inventory_delete_company"
  ON public.project_inventory FOR DELETE TO authenticated
  USING (company_id = public.get_auth_user_company_id());

-- ---------------------------------------------------------------------------
-- LEAD SOURCES
-- ---------------------------------------------------------------------------
ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lead_sources_select_company"
  ON public.lead_sources FOR SELECT TO authenticated
  USING (company_id = public.get_auth_user_company_id());

CREATE POLICY "lead_sources_insert_company"
  ON public.lead_sources FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_auth_user_company_id());

CREATE POLICY "lead_sources_update_company"
  ON public.lead_sources FOR UPDATE TO authenticated
  USING (company_id = public.get_auth_user_company_id())
  WITH CHECK (company_id = public.get_auth_user_company_id());

CREATE POLICY "lead_sources_delete_company"
  ON public.lead_sources FOR DELETE TO authenticated
  USING (company_id = public.get_auth_user_company_id());

-- ---------------------------------------------------------------------------
-- LEAD STATUSES
-- ---------------------------------------------------------------------------
ALTER TABLE public.lead_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lead_statuses_select_company"
  ON public.lead_statuses FOR SELECT TO authenticated
  USING (company_id = public.get_auth_user_company_id());

CREATE POLICY "lead_statuses_insert_company"
  ON public.lead_statuses FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_auth_user_company_id());

CREATE POLICY "lead_statuses_update_company"
  ON public.lead_statuses FOR UPDATE TO authenticated
  USING (company_id = public.get_auth_user_company_id())
  WITH CHECK (company_id = public.get_auth_user_company_id());

CREATE POLICY "lead_statuses_delete_company"
  ON public.lead_statuses FOR DELETE TO authenticated
  USING (company_id = public.get_auth_user_company_id());

-- ---------------------------------------------------------------------------
-- FOLLOWUP TYPES
-- ---------------------------------------------------------------------------
ALTER TABLE public.followup_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "followup_types_select_company"
  ON public.followup_types FOR SELECT TO authenticated
  USING (company_id = public.get_auth_user_company_id());

CREATE POLICY "followup_types_insert_company"
  ON public.followup_types FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_auth_user_company_id());

CREATE POLICY "followup_types_update_company"
  ON public.followup_types FOR UPDATE TO authenticated
  USING (company_id = public.get_auth_user_company_id())
  WITH CHECK (company_id = public.get_auth_user_company_id());

CREATE POLICY "followup_types_delete_company"
  ON public.followup_types FOR DELETE TO authenticated
  USING (company_id = public.get_auth_user_company_id());

-- ---------------------------------------------------------------------------
-- ROLE PERMISSIONS (global — readable by authenticated users for their role)
-- ---------------------------------------------------------------------------
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "role_permissions_select_own_role"
  ON public.role_permissions FOR SELECT TO authenticated
  USING (role = public.get_auth_user_role());