-- Phase 3: Fix role_permissions RLS
-- role_permissions is a global configuration table containing permission definitions.
-- It should be readable by all authenticated users without RLS restrictions.
-- The previous policy (role = get_auth_user_role()) caused zero rows to be returned
-- during auth bootstrap due to timing/context mismatches.

ALTER TABLE public.role_permissions DISABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.role_permissions TO authenticated;

COMMENT ON TABLE public.role_permissions IS
'Global role permission definitions. Readable by all authenticated users. No RLS because table contains only application permission metadata.';