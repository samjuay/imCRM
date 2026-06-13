-- Phase 2: fetch the complete lead detail bundle in one request.
-- SECURITY INVOKER preserves underlying RLS. The explicit role predicate below
-- additionally preserves the application's stricter lead-detail scope.

CREATE OR REPLACE FUNCTION public.get_lead_detail_bundle(p_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lead public.leads%ROWTYPE;
  v_current_user_id uuid;
  v_current_company_id uuid;
  v_current_role text;
  v_allowed boolean;
  v_lead_json jsonb;
  v_notes jsonb;
  v_followups jsonb;
  v_site_visits jsonb;
  v_status_updates jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  v_current_user_id := public.get_auth_user_id();
  v_current_company_id := public.get_auth_user_company_id();
  v_current_role := public.get_auth_user_role();

  SELECT l.*
  INTO v_lead
  FROM public.leads l
  WHERE l.id = p_lead_id
    AND l.company_id = v_current_company_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_allowed := CASE v_current_role
    WHEN 'super_admin' THEN true
    WHEN 'company_admin' THEN true
    WHEN 'sales_executive' THEN
      v_lead.assigned_user_id = v_current_user_id
    WHEN 'team_leader' THEN
      v_lead.assigned_user_id = v_current_user_id
      OR EXISTS (
        SELECT 1
        FROM public.users assignee
        WHERE assignee.id = v_lead.assigned_user_id
          AND assignee.company_id = v_current_company_id
          AND assignee.status <> 'disabled'
          AND assignee.team_leader_id = v_current_user_id
      )
    ELSE false
  END;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'id', l.id,
    'company_id', l.company_id,
    'assigned_user_id', l.assigned_user_id,
    'lead_source_id', l.lead_source_id,
    'full_name', l.full_name,
    'phone', l.phone,
    'email', l.email,
    'budget', l.budget,
    'location', l.location,
    'requirement', l.requirement,
    'status_id', l.status_id,
    'remarks', l.remarks,
    'created_by', l.created_by,
    'created_at', l.created_at,
    'updated_at', l.updated_at,
    'source_name', source.source_name,
    'status_name', status.status_name,
    'assigned_user_name', assigned_user.full_name,
    'created_by_name', creator.full_name
  )
  INTO v_lead_json
  FROM public.leads l
  JOIN public.lead_sources source ON source.id = l.lead_source_id
  JOIN public.lead_statuses status ON status.id = l.status_id
  LEFT JOIN public.users assigned_user ON assigned_user.id = l.assigned_user_id
  JOIN public.users creator ON creator.id = l.created_by
  WHERE l.id = v_lead.id
    AND l.company_id = v_current_company_id;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', note.id,
        'lead_id', note.lead_id,
        'company_id', note.company_id,
        'note', note.note,
        'created_by', note.created_by,
        'created_at', note.created_at,
        'created_by_name', creator.full_name
      )
      ORDER BY note.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_notes
  FROM public.lead_notes note
  LEFT JOIN public.users creator ON creator.id = note.created_by
  WHERE note.lead_id = v_lead.id
    AND note.company_id = v_current_company_id;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', followup.id,
        'lead_id', followup.lead_id,
        'company_id', followup.company_id,
        'followup_type_id', followup.followup_type_id,
        'followup_date', followup.followup_date,
        'remarks', followup.remarks,
        'status', followup.status,
        'outcome', followup.outcome,
        'created_by', followup.created_by,
        'created_at', followup.created_at,
        'followup_type_name', followup_type.type_name,
        'created_by_name', creator.full_name
      )
      ORDER BY followup.followup_date DESC
    ),
    '[]'::jsonb
  )
  INTO v_followups
  FROM public.lead_followups followup
  LEFT JOIN public.followup_types followup_type
    ON followup_type.id = followup.followup_type_id
  LEFT JOIN public.users creator ON creator.id = followup.created_by
  WHERE followup.lead_id = v_lead.id
    AND followup.company_id = v_current_company_id;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', visit.id,
        'lead_id', visit.lead_id,
        'company_id', visit.company_id,
        'visit_date', visit.visit_date,
        'project_id', visit.project_id,
        'remarks', visit.remarks,
        'visit_status', visit.visit_status,
        'created_by', visit.created_by,
        'created_at', visit.created_at,
        'project_name', project.project_name,
        'created_by_name', creator.full_name
      )
      ORDER BY visit.visit_date DESC
    ),
    '[]'::jsonb
  )
  INTO v_site_visits
  FROM public.lead_site_visits visit
  LEFT JOIN public.projects project ON project.id = visit.project_id
  LEFT JOIN public.users creator ON creator.id = visit.created_by
  WHERE visit.lead_id = v_lead.id
    AND visit.company_id = v_current_company_id;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', update_row.id,
        'lead_id', update_row.lead_id,
        'company_id', update_row.company_id,
        'previous_status', update_row.previous_status,
        'new_status', update_row.new_status,
        'outcome', update_row.outcome,
        'remark', update_row.remark,
        'next_followup_date', update_row.next_followup_date,
        'project_id', update_row.project_id,
        'project_name', project.project_name,
        'visit_date', update_row.visit_date,
        'created_by', update_row.created_by,
        'created_at', update_row.created_at,
        'created_by_name', creator.full_name,
        'previous_assigned_user_id', update_row.previous_assigned_user_id,
        'new_assigned_user_id', update_row.new_assigned_user_id,
        'assigned_by_user_id', update_row.assigned_by_user_id,
        'assignment_reason', update_row.assignment_reason,
        'previous_assigned_user_name', previous_assigned.full_name,
        'new_assigned_user_name', new_assigned.full_name,
        'assigned_by_user_name', assigner.full_name
      )
      ORDER BY update_row.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_status_updates
  FROM public.lead_status_updates update_row
  LEFT JOIN public.projects project ON project.id = update_row.project_id
  LEFT JOIN public.users creator ON creator.id = update_row.created_by
  LEFT JOIN public.users previous_assigned
    ON previous_assigned.id = update_row.previous_assigned_user_id
  LEFT JOIN public.users new_assigned
    ON new_assigned.id = update_row.new_assigned_user_id
  LEFT JOIN public.users assigner ON assigner.id = update_row.assigned_by_user_id
  WHERE update_row.lead_id = v_lead.id
    AND update_row.company_id = v_current_company_id;

  RETURN jsonb_build_object(
    'lead', v_lead_json,
    'notes', v_notes,
    'followups', v_followups,
    'siteVisits', v_site_visits,
    'statusUpdates', v_status_updates
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_lead_detail_bundle(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_lead_detail_bundle(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_lead_detail_bundle(uuid) TO authenticated;
