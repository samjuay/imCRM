-- Sprint 3B: Lead Assignment (additive only)
-- Adds columns for assignment audit trail to lead_status_updates
-- Creates RPC function for atomic bulk assignment (relies on PostgreSQL function execution transaction semantics; no manual BEGIN/COMMIT/ROLLBACK)

ALTER TABLE public.lead_status_updates
  ADD COLUMN IF NOT EXISTS previous_assigned_user_id UUID
    REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.lead_status_updates
  ADD COLUMN IF NOT EXISTS new_assigned_user_id UUID
    REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.lead_status_updates
  ADD COLUMN IF NOT EXISTS assigned_by_user_id UUID
    REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE public.lead_status_updates
  ADD COLUMN IF NOT EXISTS assignment_reason TEXT;

-- RPC function for bulk assignment. All operations in one function call = one transaction.
-- Any failure rolls back the entire batch (all-or-nothing).
-- Uses existing can_access_lead for verification (no modification to the function).
CREATE OR REPLACE FUNCTION public.bulk_assign_leads(
  p_lead_ids uuid[],
  p_new_assigned_user_id uuid,
  p_assigned_by_user_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lead_id uuid;
  prev_assigned uuid;
  current_status_name text;
  lead_company_id uuid;
BEGIN
  FOREACH lead_id IN ARRAY p_lead_ids LOOP
    -- Verify the caller can access this lead using existing logic
    SELECT l.assigned_user_id, l.created_by, l.company_id
    INTO prev_assigned, lead_company_id  -- note: created_by for can_access
    FROM public.leads l
    WHERE l.id = lead_id;

    IF NOT public.can_access_lead(prev_assigned, (SELECT created_by FROM public.leads WHERE id = lead_id)) THEN
      RAISE EXCEPTION 'Access denied to lead % for current user', lead_id;
    END IF;

    -- Get current status name for the audit log (preserves existing status update pattern)
    SELECT ls.status_name INTO current_status_name
    FROM public.leads l
    JOIN public.lead_statuses ls ON ls.id = l.status_id
    WHERE l.id = lead_id;

    -- Perform the assignment
    UPDATE public.leads
    SET assigned_user_id = p_new_assigned_user_id
    WHERE id = lead_id;

    -- Create audit record in existing table (reuses lead_status_updates for assignment logging)
    INSERT INTO public.lead_status_updates (
      lead_id,
      previous_assigned_user_id,
      new_assigned_user_id,
      assigned_by_user_id,
      assignment_reason,
      previous_status,
      new_status,
      created_by,
      company_id
    ) VALUES (
      lead_id,
      prev_assigned,
      p_new_assigned_user_id,
      p_assigned_by_user_id,
      p_reason,
      current_status_name,
      'Assigned',
      p_assigned_by_user_id,
      lead_company_id
    );
  END LOOP;
END;
$$;

-- Allow authenticated users to call the RPC (RLS on underlying tables still applies inside via checks)
GRANT EXECUTE ON FUNCTION public.bulk_assign_leads(uuid[], uuid, uuid, text) TO authenticated;

-- Note: assignment_reason is optional (NULL allowed). Max length 500 enforced in frontend only.