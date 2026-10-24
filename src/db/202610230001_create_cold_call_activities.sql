-- Migration: 202610230001_create_cold_call_activities.sql
-- Safe, idempotent creation of immutable activity log for cold calling outcomes & conversions
-- Enforces tenant isolation, idempotency key constraint, conflict-safe inserts, and defensive historical backfill

CREATE TABLE IF NOT EXISTS public.cold_call_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cold_data_id UUID REFERENCES public.cold_data(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    call_outcome VARCHAR(64) NOT NULL,
    notes TEXT,
    idempotency_key VARCHAR(128) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Ensure unique constraint exists if table already existed prior to migration
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.cold_call_activities'::regclass 
          AND conname = 'cold_call_activities_idempotency_key_key'
    ) THEN
        ALTER TABLE public.cold_call_activities 
            ADD CONSTRAINT cold_call_activities_idempotency_key_key UNIQUE (idempotency_key);
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        NULL;
    WHEN undefined_table THEN
        NULL;
END $$;

-- Indexes for fast date range, company-scoped, and idempotency queries
CREATE INDEX IF NOT EXISTS idx_cold_call_activities_company_created
    ON public.cold_call_activities (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cold_call_activities_user_created
    ON public.cold_call_activities (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cold_call_activities_cold_data_id
    ON public.cold_call_activities (cold_data_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cold_call_activities_idempotency
    ON public.cold_call_activities (idempotency_key)
    WHERE idempotency_key IS NOT NULL;

-- Enable Row-Level Security
ALTER TABLE public.cold_call_activities ENABLE ROW LEVEL SECURITY;

-- Grants for Supabase PostgREST roles
GRANT ALL ON public.cold_call_activities TO authenticated;
GRANT ALL ON public.cold_call_activities TO service_role;

-- Enforce multi-tenant company isolation matching CRM authorization model
DO $$
BEGIN
    DROP POLICY IF EXISTS cold_call_activities_company_access ON public.cold_call_activities;
    DROP POLICY IF EXISTS policy_cold_call_activities_access ON public.cold_call_activities;

    CREATE POLICY policy_cold_call_activities_access ON public.cold_call_activities
        FOR ALL
        TO authenticated
        USING (
            (get_current_user_role() = 'company_admin' AND company_id = get_current_user_company_id()) OR
            (get_current_user_role() = 'team_leader' AND user_id IN (SELECT id FROM profiles WHERE team_id = get_current_user_team_id())) OR
            (user_id = auth.uid())
        )
        WITH CHECK (
            company_id = get_current_user_company_id()
        );
END $$;

-- 1. Idempotently backfill conversion events from actual lead creation timestamps
-- Uses DISTINCT ON (c.id) to eliminate join fan-out when multiple leads reference the same cold contact.
-- Selects earliest lead creation timestamp (l.created_at ASC) as the genuine conversion moment.
-- Protected by ON CONFLICT (idempotency_key) DO NOTHING to allow safe reruns without duplicate failures.
INSERT INTO public.cold_call_activities (
    cold_data_id, 
    company_id, 
    user_id, 
    call_outcome, 
    notes, 
    idempotency_key, 
    created_at
)
SELECT DISTINCT ON (c.id)
    c.id,
    c.company_id,
    c.assigned_to,
    c.status,
    c.notes,
    'backfill_conv_' || c.id::text AS idempotency_key,
    l.created_at
FROM public.cold_data c
JOIN public.leads l ON l.converted_from_cold_id = c.id
WHERE c.status = 'Converted To Lead'
  AND l.created_at IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM public.cold_call_activities cca 
      WHERE (cca.cold_data_id = c.id AND cca.call_outcome IN ('Converted To Lead', 'CONVERTED_TO_LEAD'))
         OR cca.idempotency_key = 'backfill_conv_' || c.id::text
  )
ORDER BY c.id, l.created_at ASC
ON CONFLICT (idempotency_key) DO NOTHING;

-- 2. Idempotently backfill non-conversion call outcomes only where a defensible updated_at timestamp exists
-- Records with missing timestamps or in 'New' / 'Converted To Lead' are strictly excluded rather than fabricating 'now()'.
-- Protected by ON CONFLICT (idempotency_key) DO NOTHING to allow safe reruns without duplicate failures.
INSERT INTO public.cold_call_activities (
    cold_data_id, 
    company_id, 
    user_id, 
    call_outcome, 
    notes, 
    idempotency_key, 
    created_at
)
SELECT 
    c.id,
    c.company_id,
    c.assigned_to,
    c.status,
    c.notes,
    'backfill_call_' || c.id::text AS idempotency_key,
    c.updated_at
FROM public.cold_data c
WHERE c.status IS NOT NULL 
  AND c.status NOT IN ('New', 'Converted To Lead')
  AND c.updated_at IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM public.cold_call_activities cca 
      WHERE cca.cold_data_id = c.id 
         OR cca.idempotency_key = 'backfill_call_' || c.id::text
  )
ON CONFLICT (idempotency_key) DO NOTHING;
