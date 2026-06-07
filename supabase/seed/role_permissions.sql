-- Sprint 1C: Default role permissions (global, not company-scoped)
-- Run once after migrations. Safe to re-run (uses ON CONFLICT).

INSERT INTO public.role_permissions (role, module_name, can_view, can_create, can_edit, can_delete)
VALUES
  -- super_admin: full platform access
  ('super_admin', 'dashboard',     true, true, true, true),
  ('super_admin', 'projects',      true, true, true, true),
  ('super_admin', 'leads',         true, true, true, true),
  ('super_admin', 'followups',     true, true, true, true),
  ('super_admin', 'site_visits',   true, true, true, true),
  ('super_admin', 'reports',       true, true, true, true),
  ('super_admin', 'users',         true, true, true, true),
  ('super_admin', 'teams',         true, true, true, true),
  ('super_admin', 'master_data',   true, true, true, true),
  ('super_admin', 'permissions',   true, true, true, true),

  -- company_admin: full company access
  ('company_admin', 'dashboard',     true, true, true, true),
  ('company_admin', 'projects',      true, true, true, true),
  ('company_admin', 'leads',         true, true, true, true),
  ('company_admin', 'followups',     true, true, true, true),
  ('company_admin', 'site_visits',   true, true, true, true),
  ('company_admin', 'reports',       true, true, true, true),
  ('company_admin', 'users',         true, true, true, true),
  ('company_admin', 'teams',         true, true, true, true),
  ('company_admin', 'master_data',   true, true, true, true),
  ('company_admin', 'permissions',   true, true, false, false),

  -- team_leader: limited management access
  ('team_leader', 'dashboard',     true, false, false, false),
  ('team_leader', 'projects',      true, false, false, false),
  ('team_leader', 'leads',         true, true,  true,  true),
  ('team_leader', 'followups',     true, true,  true,  true),
  ('team_leader', 'site_visits',   true, true,  true,  true),
  ('team_leader', 'reports',       true, false, false, false),
  ('team_leader', 'users',         true, false, false, false),
  ('team_leader', 'teams',         true, false, false, false),
  ('team_leader', 'master_data',   true, false, false, false),
  ('team_leader', 'permissions',   false, false, false, false),

  -- sales_executive: own data access
  ('sales_executive', 'dashboard',     true, false, false, false),
  ('sales_executive', 'projects',      true, false, false, false),
  ('sales_executive', 'leads',         true, true,  true,  false),
  ('sales_executive', 'followups',     true, true,  true,  false),
  ('sales_executive', 'site_visits',   true, true,  true,  false),
  ('sales_executive', 'reports',       true, false, false, false),
  ('sales_executive', 'users',         false, false, false, false),
  ('sales_executive', 'teams',         false, false, false, false),
  ('sales_executive', 'master_data',   true, false, false, false),
  ('sales_executive', 'permissions',   false, false, false, false)
ON CONFLICT (role, module_name) DO UPDATE SET
  can_view   = EXCLUDED.can_view,
  can_create = EXCLUDED.can_create,
  can_edit   = EXCLUDED.can_edit,
  can_delete = EXCLUDED.can_delete;