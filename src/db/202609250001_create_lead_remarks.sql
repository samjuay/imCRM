-- =================================================================
-- Migration: 202609250001_create_lead_remarks.sql
-- Description: Create dedicated immutable append-only lead_remarks table
-- =================================================================

-- Table: lead_remarks
CREATE TABLE IF NOT EXISTS public.lead_remarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  remark_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by_name TEXT,
  source TEXT NOT NULL DEFAULT 'direct_entry',
  status_at_creation TEXT,
  outcome_at_creation TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lead_remarks_lead_id ON public.lead_remarks(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_remarks_created_at ON public.lead_remarks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_remarks_created_by ON public.lead_remarks(created_by);

-- Enable Row Level Security (RLS)
ALTER TABLE public.lead_remarks ENABLE ROW LEVEL SECURITY;

-- Select Policy: Authenticated users can view remarks
DROP POLICY IF EXISTS policy_lead_remarks_select ON public.lead_remarks;
CREATE POLICY policy_lead_remarks_select ON public.lead_remarks
  FOR SELECT TO authenticated
  USING (true);

-- Insert Policy: Authenticated users can append remarks
DROP POLICY IF EXISTS policy_lead_remarks_insert ON public.lead_remarks;
CREATE POLICY policy_lead_remarks_insert ON public.lead_remarks
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Service role bypass policy (implicit in Supabase, but explicit for clarity)
DROP POLICY IF EXISTS policy_lead_remarks_all_service ON public.lead_remarks;
CREATE POLICY policy_lead_remarks_all_service ON public.lead_remarks
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Seed lead_remarks from existing historical lead_status_updates (idempotent)
INSERT INTO public.lead_remarks (
  id,
  lead_id,
  remark_text,
  created_at,
  created_by,
  created_by_name,
  source,
  status_at_creation,
  outcome_at_creation
)
SELECT 
  lsu.id,
  lsu.lead_id,
  CASE 
    WHEN lsu.remark LIKE '% | Remarks: %' THEN 
      TRIM(SUBSTRING(lsu.remark FROM POSITION(' | Remarks: ' IN lsu.remark) + 12))
    WHEN lsu.remark LIKE 'Remarks: %' THEN 
      TRIM(SUBSTRING(lsu.remark FROM 10))
    ELSE 
      TRIM(lsu.remark)
  END AS remark_text,
  lsu.created_at,
  lsu.user_id AS created_by,
  p.full_name AS created_by_name,
  'status_transition' AS source,
  lsu.new_status AS status_at_creation,
  NULLIF(lsu.outcome, '') AS outcome_at_creation
FROM public.lead_status_updates lsu
LEFT JOIN public.profiles p ON lsu.user_id = p.id
WHERE lsu.remark IS NOT NULL
  AND TRIM(lsu.remark) <> ''
  AND lsu.remark NOT ILIKE '%bulk importing logging workflow%'
  AND lsu.remark NOT ILIKE '%lead creation lock%'
  AND lsu.remark NOT ILIKE '%lead assigned on creation%'
  AND lsu.remark NOT ILIKE '%automated import followup log trigger%'
  AND lsu.remark NOT ILIKE '%completed automatically during status change%'
  AND NOT (lsu.remark ILIKE 'Outcome: %' AND lsu.remark NOT ILIKE '%Remarks:%')
ON CONFLICT (id) DO NOTHING;
