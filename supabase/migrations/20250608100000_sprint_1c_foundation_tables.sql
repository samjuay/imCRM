-- Sprint 1C: CRM Foundation Tables
-- Multi-tenant: every business table includes company_id

-- ---------------------------------------------------------------------------
-- Helper: resolve authenticated user's company_id
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_auth_user_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- ---------------------------------------------------------------------------
-- Helper: resolve authenticated user's role
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::TEXT
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- ---------------------------------------------------------------------------
-- Updated-at trigger function
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 1. PROJECTS
-- ---------------------------------------------------------------------------
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_name TEXT NOT NULL,
  developer_name TEXT,
  location TEXT,
  city TEXT,
  state TEXT,
  project_type TEXT,
  launch_date DATE,
  possession_date DATE,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_company_id ON public.projects(company_id);
CREATE INDEX idx_projects_status ON public.projects(company_id, status);

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. PROJECT CONFIGURATIONS
-- ---------------------------------------------------------------------------
CREATE TABLE public.project_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  configuration_name TEXT NOT NULL,
  carpet_area NUMERIC(12, 2),
  saleable_area NUMERIC(12, 2),
  starting_price NUMERIC(14, 2),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_configurations_company_id ON public.project_configurations(company_id);
CREATE INDEX idx_project_configurations_project_id ON public.project_configurations(project_id);

CREATE TRIGGER trg_project_configurations_updated_at
  BEFORE UPDATE ON public.project_configurations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. PROJECT INVENTORY
-- ---------------------------------------------------------------------------
CREATE TABLE public.project_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  configuration_id UUID NOT NULL REFERENCES public.project_configurations(id) ON DELETE CASCADE,
  available_units INTEGER NOT NULL DEFAULT 0 CHECK (available_units >= 0),
  min_price NUMERIC(14, 2),
  max_price NUMERIC(14, 2),
  inventory_status TEXT NOT NULL DEFAULT 'available'
    CHECK (inventory_status IN ('available', 'limited', 'sold_out')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_inventory_company_id ON public.project_inventory(company_id);
CREATE INDEX idx_project_inventory_project_id ON public.project_inventory(project_id);
CREATE INDEX idx_project_inventory_configuration_id ON public.project_inventory(configuration_id);

CREATE TRIGGER trg_project_inventory_updated_at
  BEFORE UPDATE ON public.project_inventory
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. LEAD SOURCES
-- ---------------------------------------------------------------------------
CREATE TABLE public.lead_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  source_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, source_name)
);

CREATE INDEX idx_lead_sources_company_id ON public.lead_sources(company_id);

-- ---------------------------------------------------------------------------
-- 5. LEAD STATUSES
-- ---------------------------------------------------------------------------
CREATE TABLE public.lead_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  status_name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, status_name)
);

CREATE INDEX idx_lead_statuses_company_id ON public.lead_statuses(company_id);
CREATE INDEX idx_lead_statuses_display_order ON public.lead_statuses(company_id, display_order);

-- ---------------------------------------------------------------------------
-- 6. FOLLOWUP TYPES
-- ---------------------------------------------------------------------------
CREATE TABLE public.followup_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, type_name)
);

CREATE INDEX idx_followup_types_company_id ON public.followup_types(company_id);

-- ---------------------------------------------------------------------------
-- 7. ROLE PERMISSIONS (global — keyed by role, not company)
-- ---------------------------------------------------------------------------
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN (
    'super_admin',
    'company_admin',
    'team_leader',
    'sales_executive'
  )),
  module_name TEXT NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT false,
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (role, module_name)
);

CREATE INDEX idx_role_permissions_role ON public.role_permissions(role);

-- ---------------------------------------------------------------------------
-- Seed function: default master data per company
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.seed_company_master_data(p_company_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.lead_sources (company_id, source_name, is_active)
  VALUES
    (p_company_id, 'Meta Ads',      true),
    (p_company_id, 'Google Ads',    true),
    (p_company_id, '99acres',       true),
    (p_company_id, 'MagicBricks',   true),
    (p_company_id, 'Housing',       true),
    (p_company_id, 'Website',       true),
    (p_company_id, 'Reference',     true),
    (p_company_id, 'Walk In',       true),
    (p_company_id, 'CSV Import',    true),
    (p_company_id, 'Manual Entry',  true)
  ON CONFLICT (company_id, source_name) DO NOTHING;

  INSERT INTO public.lead_statuses (company_id, status_name, display_order, is_active)
  VALUES
    (p_company_id, 'Fresh',              1,  true),
    (p_company_id, 'Contacted',          2,  true),
    (p_company_id, 'Follow Up',          3,  true),
    (p_company_id, 'Site Visit Planned', 4,  true),
    (p_company_id, 'Site Visit Done',    5,  true),
    (p_company_id, 'Interested',         6,  true),
    (p_company_id, 'Booked',             7,  true),
    (p_company_id, 'Lost',               8,  true),
    (p_company_id, 'Not Interested',     9,  true)
  ON CONFLICT (company_id, status_name) DO NOTHING;

  INSERT INTO public.followup_types (company_id, type_name, is_active)
  VALUES
    (p_company_id, 'Call',       true),
    (p_company_id, 'WhatsApp',   true),
    (p_company_id, 'Meeting',    true),
    (p_company_id, 'Site Visit', true),
    (p_company_id, 'Email',      true)
  ON CONFLICT (company_id, type_name) DO NOTHING;
END;
$$;