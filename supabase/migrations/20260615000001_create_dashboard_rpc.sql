-- Dashboard RPC functions for lead-centric activity dashboard
-- Source of truth: lead_followups, lead_site_visits only
-- lead_status_updates is audit/history only - NOT used for dashboard categorization

-- Helper: get scoped user IDs for current user's company
-- Reuses existing auth context

CREATE OR REPLACE FUNCTION public.get_leads_dashboard_state(
  p_company_id uuid,
  p_scoped_user_ids uuid[],
  p_status_id uuid DEFAULT NULL,
  p_lead_source_id uuid DEFAULT NULL,
  p_assigned_user_id uuid DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_page int DEFAULT 1,
  p_page_size int DEFAULT 50
)
RETURNS TABLE (
  lead_id uuid,
  full_name text,
  phone text,
  email text,
  status_id uuid,
  status_name text,
  lead_source_id uuid,
  source_name text,
  assigned_user_id uuid,
  assigned_user_name text,
  latest_followup_date timestamptz,
  latest_site_visit_date timestamptz,
  category text,
  total_count bigint
) LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH scoped_leads AS (
    SELECT 
      l.id as lead_id,
      l.full_name,
      l.phone,
      l.email,
      l.status_id,
      ls.status_name,
      l.lead_source_id,
      lsrc.source_name,
      l.assigned_user_id,
      au.full_name as assigned_user_name,
      -- LATEST pending followup (by created_at = latest scheduling decision)
      (
        SELECT f.followup_date
        FROM lead_followups f
        WHERE f.lead_id = l.id
          AND f.status = 'pending'
        ORDER BY f.created_at DESC
        LIMIT 1
      ) as latest_followup_date,
      -- LATEST planned/rescheduled site visit (by created_at = latest scheduling decision)
      (
        SELECT sv.visit_date
        FROM lead_site_visits sv
        WHERE sv.lead_id = l.id
          AND sv.visit_status IN ('planned', 'rescheduled')
        ORDER BY sv.created_at DESC
        LIMIT 1
      ) as latest_site_visit_date
    FROM leads l
    JOIN lead_statuses ls ON l.status_id = ls.id
    LEFT JOIN lead_sources lsrc ON l.lead_source_id = lsrc.id
    LEFT JOIN users au ON l.assigned_user_id = au.id
    WHERE l.company_id = p_company_id
      AND (p_scoped_user_ids IS NULL OR l.assigned_user_id = ANY(p_scoped_user_ids))
      AND (p_status_id IS NULL OR l.status_id = p_status_id)
      AND (p_lead_source_id IS NULL OR l.lead_source_id = p_lead_source_id)
      AND (p_assigned_user_id IS NULL OR l.assigned_user_id = p_assigned_user_id)
      AND (p_search IS NULL OR l.full_name ILIKE '%' || p_search || '%' OR l.phone ILIKE '%' || p_search || '%')
  ),
  categorized AS (
    SELECT *,
      CASE
        WHEN latest_followup_date IS NOT NULL 
             AND latest_followup_date < CURRENT_DATE THEN 'overdue'
        WHEN latest_followup_date IS NOT NULL 
             AND latest_followup_date = CURRENT_DATE THEN 'due_today'
        WHEN latest_site_visit_date IS NOT NULL 
             AND latest_site_visit_date = CURRENT_DATE THEN 'site_visit_today'
        WHEN latest_followup_date IS NOT NULL 
             AND latest_followup_date > CURRENT_DATE 
             AND latest_followup_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'upcoming_followup'
        WHEN latest_site_visit_date IS NOT NULL 
             AND latest_site_visit_date > CURRENT_DATE 
             AND latest_site_visit_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'upcoming_site_visit'
        ELSE 'no_action'
      END as category,
      CASE
        WHEN latest_followup_date IS NOT NULL 
             AND latest_followup_date < CURRENT_DATE THEN 1
        WHEN latest_followup_date IS NOT NULL 
             AND latest_followup_date = CURRENT_DATE THEN 2
        WHEN latest_site_visit_date IS NOT NULL 
             AND latest_site_visit_date = CURRENT_DATE THEN 3
        WHEN latest_followup_date IS NOT NULL 
             AND latest_followup_date > CURRENT_DATE 
             AND latest_followup_date <= CURRENT_DATE + INTERVAL '7 days' THEN 4
        WHEN latest_site_visit_date IS NOT NULL 
             AND latest_site_visit_date > CURRENT_DATE 
             AND latest_site_visit_date <= CURRENT_DATE + INTERVAL '7 days' THEN 5
        ELSE 6
      END as priority
    FROM scoped_leads
  ),
  paginated AS (
    SELECT *,
      COUNT(*) OVER() as total_count
    FROM categorized
    WHERE p_category IS NULL OR category = p_category
    ORDER BY priority,
             CASE WHEN category IN ('overdue','due_today','upcoming_followup') THEN latest_followup_date END NULLS LAST,
             CASE WHEN category IN ('site_visit_today','upcoming_site_visit') THEN latest_site_visit_date END NULLS LAST
    LIMIT p_page_size OFFSET (p_page - 1) * p_page_size
  )
  SELECT 
    lead_id, full_name, phone, email, status_id, status_name,
    lead_source_id, source_name, assigned_user_id, assigned_user_name,
    latest_followup_date, latest_site_visit_date, category, total_count
  FROM paginated;
$$;

-- Count function for dashboard card badges
CREATE OR REPLACE FUNCTION public.count_leads_dashboard_state(
  p_company_id uuid,
  p_scoped_user_ids uuid[],
  p_status_id uuid DEFAULT NULL,
  p_lead_source_id uuid DEFAULT NULL,
  p_assigned_user_id uuid DEFAULT NULL,
  p_search text DEFAULT NULL
)
RETURNS TABLE (
  category text,
  count bigint
) LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH scoped_leads AS (
    SELECT 
      l.id as lead_id,
      -- LATEST pending followup (by created_at = latest scheduling decision)
      (
        SELECT f.followup_date
        FROM lead_followups f
        WHERE f.lead_id = l.id
          AND f.status = 'pending'
        ORDER BY f.created_at DESC
        LIMIT 1
      ) as latest_followup_date,
      -- LATEST planned/rescheduled site visit (by created_at = latest scheduling decision)
      (
        SELECT sv.visit_date
        FROM lead_site_visits sv
        WHERE sv.lead_id = l.id
          AND sv.visit_status IN ('planned', 'rescheduled')
        ORDER BY sv.created_at DESC
        LIMIT 1
      ) as latest_site_visit_date
    FROM leads l
    WHERE l.company_id = p_company_id
      AND (p_scoped_user_ids IS NULL OR l.assigned_user_id = ANY(p_scoped_user_ids))
      AND (p_status_id IS NULL OR l.status_id = p_status_id)
      AND (p_lead_source_id IS NULL OR l.lead_source_id = p_lead_source_id)
      AND (p_assigned_user_id IS NULL OR l.assigned_user_id = p_assigned_user_id)
      AND (p_search IS NULL OR l.full_name ILIKE '%' || p_search || '%' OR l.phone ILIKE '%' || p_search || '%')
  ),
  categorized AS (
    SELECT *,
      CASE
        WHEN latest_followup_date IS NOT NULL 
             AND latest_followup_date < CURRENT_DATE THEN 'overdue'
        WHEN latest_followup_date IS NOT NULL 
             AND latest_followup_date = CURRENT_DATE THEN 'due_today'
        WHEN latest_site_visit_date IS NOT NULL 
             AND latest_site_visit_date = CURRENT_DATE THEN 'site_visit_today'
        WHEN latest_followup_date IS NOT NULL 
             AND latest_followup_date > CURRENT_DATE 
             AND latest_followup_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'upcoming_followup'
        WHEN latest_site_visit_date IS NOT NULL 
             AND latest_site_visit_date > CURRENT_DATE 
             AND latest_site_visit_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'upcoming_site_visit'
        ELSE 'no_action'
      END as category
    FROM scoped_leads
  )
  SELECT category, COUNT(DISTINCT lead_id) as count
  FROM categorized
  GROUP BY category
  ORDER BY 
    CASE category
      WHEN 'overdue' THEN 1
      WHEN 'due_today' THEN 2
      WHEN 'site_visit_today' THEN 3
      WHEN 'upcoming_followup' THEN 4
      WHEN 'upcoming_site_visit' THEN 5
      ELSE 6
    END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_leads_dashboard_state TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_leads_dashboard_state TO authenticated;