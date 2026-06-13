-- Phase 3.5: Performance indexes for leads list query
-- Optimizes the common query pattern:
-- WHERE company_id = ? AND (status_id = ?) AND (lead_source_id = ?) AND (assigned_user_id = ?)
-- ORDER BY created_at DESC

-- Composite index for filtered list queries with ordering
CREATE INDEX IF NOT EXISTS idx_leads_list_filtered
ON public.leads (company_id, status_id, lead_source_id, assigned_user_id, created_at DESC);

-- Composite index for unfiltered list queries with ordering (most common case)
CREATE INDEX IF NOT EXISTS idx_leads_list_base
ON public.leads (company_id, created_at DESC);

-- Index for search by name/phone (partial index for non-null values)
CREATE INDEX IF NOT EXISTS idx_leads_search_name
ON public.leads (company_id, full_name) WHERE full_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_search_phone
ON public.leads (company_id, phone) WHERE phone IS NOT NULL;