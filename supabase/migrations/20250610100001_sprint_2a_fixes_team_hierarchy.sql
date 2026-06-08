-- Corrective migration: users.team_leader_id + teams.team_leader_id (idempotent)

-- ---------------------------------------------------------------------------
-- 1. users.team_leader_id (Sales Executive -> Team Leader)
-- ---------------------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS team_leader_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_team_leader_id_fkey'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_team_leader_id_fkey
      FOREIGN KEY (team_leader_id)
      REFERENCES public.users(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_team_leader_id
  ON public.users(team_leader_id);

-- ---------------------------------------------------------------------------
-- 2. teams.team_leader_id (ensure column exists if teams table predates it)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, team_name)
);

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS team_leader_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'teams_team_leader_id_fkey'
      AND conrelid = 'public.teams'::regclass
  ) THEN
    ALTER TABLE public.teams
      ADD CONSTRAINT teams_team_leader_id_fkey
      FOREIGN KEY (team_leader_id)
      REFERENCES public.users(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_teams_company_id ON public.teams(company_id);
CREATE INDEX IF NOT EXISTS idx_teams_leader_id ON public.teams(team_leader_id);

DROP TRIGGER IF EXISTS trg_teams_updated_at ON public.teams;
CREATE TRIGGER trg_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Safe backfill: teams.team_leader_id from existing team_leader users
-- ---------------------------------------------------------------------------
UPDATE public.teams t
SET team_leader_id = u.id
FROM public.users u
WHERE t.team_leader_id IS NULL
  AND u.team_id = t.id
  AND u.role = 'team_leader'
  AND u.company_id = t.company_id
  AND u.status <> 'disabled'
  AND u.id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. Safe backfill: users.team_leader_id for sales executives via team
-- ---------------------------------------------------------------------------
UPDATE public.users se
SET team_leader_id = t.team_leader_id
FROM public.teams t
WHERE se.team_leader_id IS NULL
  AND se.team_id = t.id
  AND se.role = 'sales_executive'
  AND t.team_leader_id IS NOT NULL
  AND se.id <> t.team_leader_id;

-- ---------------------------------------------------------------------------
-- 5. teams RLS (idempotent)
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