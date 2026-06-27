/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;
let supabaseAdminInstance: SupabaseClient | null = null;

/**
 * Lazy initializer for Supabase client.
 * Prevents application crash on startup if keys are not yet configured.
 */
export function getSupabase(): SupabaseClient {
  // If we are on the server/connected side and have service_role, automatically promote getSupabase to admin client
  // to avoid RLS policy blocks on complex nested inserts/queries, while relying on explicit program schema scoping.
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || (import.meta as any).env?.VITE_SUPABASE_SERVICE_ROLE_KEY;
  if (serviceRoleKey) {
    return getSupabaseAdmin();
  }

  if (!supabaseInstance) {
    const supabaseUrl = process.env.SUPABASE_URL || (import.meta as any).env?.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

    console.log('[Login Audit] Initializing Supabase client instance...');
    console.log(`[Login Audit] SUPABASE_URL: ${supabaseUrl ? 'LOADED SUCCESSFULLY (' + supabaseUrl.substring(0, 15) + '...)' : 'MISSING'}`);
    console.log(`[Login Audit] SUPABASE_ANON_KEY: ${supabaseAnonKey ? 'LOADED SUCCESSFULLY (' + supabaseAnonKey.substring(0, 10) + '...)' : 'MISSING'}`);

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        'Supabase URL and Anon Key are required environment variables to run in connected mode. ' +
        'Please add SUPABASE_URL and SUPABASE_ANON_KEY to your environment/secrets.'
      );
    }
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
    console.log('[Login Audit] Supabase client instance successfully created.');
  }
  return supabaseInstance;
}

/**
 * Lazy initializer for Supabase Admin client with service_role privileges.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdminInstance) {
    const supabaseUrl = process.env.SUPABASE_URL || (import.meta as any).env?.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || (import.meta as any).env?.VITE_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.warn('getSupabaseAdmin was called but SUPABASE_SERVICE_ROLE_KEY is missing. Using the default client fallback.');
      return getSupabase();
    }
    
    supabaseAdminInstance = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    console.log('[Login Audit] Supabase admin instance successfully created using service_role key.');
  }
  return supabaseAdminInstance;
}

/**
 * Dynamic helper functions to interact with Supabase tables
 * mapped to the ImCRM current database schema.
 */
export const supabaseDb = {
  // --- Companies ---
  getCompanies: async () => {
    const { data, error } = await getSupabase()
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  
  createCompany: async (company: any) => {
    const { data, error } = await getSupabase()
      .from('companies')
      .insert([company])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // --- Users (Profiles) ---
  getUsers: async (companyId?: string) => {
    let query = getSupabase().from('profiles').select('*');
    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    const { data, error } = await query.order('full_name');
    if (error) throw error;
    return data;
  },

  createUser: async (user: any) => {
    const { data, error } = await getSupabase()
      .from('profiles')
      .insert([user])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // --- Leads ---
  getLeads: async (filters?: { companyId?: string; assignedTo?: string; status?: string }) => {
    let query = getSupabase().from('leads').select('*');
    if (filters?.companyId) query = query.eq('company_id', filters.companyId);
    if (filters?.assignedTo) query = query.eq('assigned_to', filters.assignedTo);
    if (filters?.status) query = query.eq('status', filters.status);
    
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  createLead: async (lead: any) => {
    const { data, error } = await getSupabase()
      .from('leads')
      .insert([lead])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  updateLead: async (leadId: string, updates: any) => {
    const { data, error } = await getSupabase()
      .from('leads')
      .update(updates)
      .eq('id', leadId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  bulkUpdateLeadsStatus: async (leadIds: string[], targetStatus: string) => {
    const { data, error } = await getSupabase()
      .from('leads')
      .update({ status: targetStatus, updated_at: new Date().toISOString() })
      .in('id', leadIds)
      .select();
    if (error) throw error;
    return data;
  },

  bulkReassignLeads: async (leadIds: string[], targetUserId: string) => {
    const { data, error } = await getSupabase()
      .from('leads')
      .update({ assigned_to: targetUserId, updated_at: new Date().toISOString() })
      .in('id', leadIds)
      .select();
    if (error) throw error;
    return data;
  },

  // --- Followups ---
  getFollowups: async (filters?: { companyId?: string; userId?: string; completed?: boolean }) => {
    let query = getSupabase().from('followups').select('*');
    if (filters?.companyId) query = query.eq('company_id', filters.companyId);
    if (filters?.userId) query = query.eq('user_id', filters.userId);
    if (filters?.completed !== undefined) query = query.eq('completed', filters.completed);
    
    const { data, error } = await query.order('scheduled_at', { ascending: true });
    if (error) throw error;
    return data;
  },

  createFollowup: async (followup: any) => {
    const { data, error } = await getSupabase()
      .from('followups')
      .insert([followup])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  completeFollowup: async (followupId: string, completionData: { outcome_notes?: string; completed_at?: string }) => {
    const { data, error } = await getSupabase()
      .from('followups')
      .update({
        completed: true,
        completed_at: completionData.completed_at || new Date().toISOString(),
        outcome_notes: completionData.outcome_notes
      })
      .eq('id', followupId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // --- Projects ---
  getProjects: async (companyId?: string) => {
    let query = getSupabase().from('projects').select('*');
    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    const { data, error } = await query.order('name');
    if (error) throw error;
    return data;
  },

  createProject: async (project: any) => {
    const { data, error } = await getSupabase()
      .from('projects')
      .insert([project])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  bulkImportProjects: async (projects: any[]) => {
    const { data, error } = await getSupabase()
      .from('projects')
      .insert(projects)
      .select();
    if (error) throw error;
    return data;
  },

  // --- Project Configurations ---
  getProjectConfigurations: async (projectId?: string) => {
    let query = getSupabase().from('project_configurations').select('*');
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    const { data, error } = await query.order('name');
    if (error) throw error;
    return data;
  },

  updateProjectConfiguration: async (configId: string, updates: any) => {
    const { data, error } = await getSupabase()
      .from('project_configurations')
      .update(updates)
      .eq('id', configId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // --- Teams ---
  getTeams: async (companyId?: string) => {
    let query = getSupabase().from('teams').select('*');
    if (companyId) query = query.eq('company_id', companyId);
    const { data, error } = await query.order('created_at');
    if (error) throw error;
    return data;
  },

  // --- Lead Sources ---
  getLeadSources: async (companyId?: string) => {
    let query = getSupabase().from('lead_sources').select('*');
    if (companyId) query = query.eq('company_id', companyId);
    const { data, error } = await query.order('name');
    if (error) throw error;
    return data;
  },

  // --- Site Visits ---
  getSiteVisits: async (companyId?: string) => {
    let query = getSupabase().from('site_visits').select('*');
    if (companyId) query = query.eq('company_id', companyId);
    const { data, error } = await query.order('scheduled_date', { ascending: true });
    if (error) throw error;
    return data;
  },

  createSiteVisit: async (visit: any) => {
    const { data, error } = await getSupabase()
      .from('site_visits')
      .insert([visit])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  updateSiteVisitStatus: async (visitId: string, updates: any) => {
    const { data, error } = await getSupabase()
      .from('site_visits')
      .update(updates)
      .eq('id', visitId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};
