/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getSupabase } from './supabaseClient';
import { Activity } from '../types';

const STORE_PATH = path.join(process.cwd(), 'activities_store.json');

// Memory cache of activities to optimize reads
let activitiesCache: Activity[] = [];

// Initialize activities cache from the local JSON file
function initStore() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const data = fs.readFileSync(STORE_PATH, 'utf8');
      activitiesCache = JSON.parse(data);
      console.log(`[Activity Engine] Loaded ${activitiesCache.length} activities from local store.`);
    } else {
      fs.writeFileSync(STORE_PATH, JSON.stringify([]), 'utf8');
      console.log('[Activity Engine] Initialized empty activities local store.');
    }
  } catch (error: any) {
    console.error('[Activity Engine] Error initializing local activities store:', error.message);
  }
}

// Save the cache to the JSON file
function saveStore() {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(activitiesCache, null, 2), 'utf8');
  } catch (error: any) {
    console.error('[Activity Engine] Error saving activities to local store:', error.message);
  }
}

// Initialize on load
initStore();

/**
 * Fetch the team ID of a user from profiles table
 */
async function getUserTeamId(userId: string): Promise<string | undefined> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('profiles')
      .select('team_id')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[Activity Engine] Failed to fetch team_id for user:', userId, error.message);
      return undefined;
    }
    return data?.team_id || undefined;
  } catch (err: any) {
    console.warn('[Activity Engine] Error fetching team_id for user:', userId, err.message);
    return undefined;
  }
}

/**
 * Track a new immutable activity.
 * Always inserts a new activity into both local JSON file and Supabase.
 */
export async function trackActivity(data: {
  company_id: string;
  lead_id: string;
  user_id: string;
  activity_type: string;
  previous_status?: string;
  new_status?: string;
  created_by?: string;
  notes?: string;
}): Promise<Activity> {
  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();
  
  // Try to resolve team ID for the user
  const team_id = await getUserTeamId(data.user_id);

  const activity: Activity = {
    id,
    company_id: data.company_id,
    lead_id: data.lead_id,
    user_id: data.user_id,
    team_id,
    activity_type: data.activity_type,
    previous_status: data.previous_status,
    new_status: data.new_status,
    created_at,
    created_by: data.created_by || data.user_id,
    notes: data.notes
  };

  // 1. Save to local memory and file backup
  activitiesCache.push(activity);
  saveStore();
  console.log(`[Activity Engine] Logged activity "${activity.activity_type}" locally for lead: ${activity.lead_id}`);

  // 2. Try to save to Supabase asynchronously
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('activities').insert([activity]);
    if (error) {
      console.warn('[Activity Engine] Supabase write deferred or failed (this is expected if schema migration is pending):', error.message);
    } else {
      console.log('[Activity Engine] Supabase write succeeded.');
    }
  } catch (err: any) {
    console.warn('[Activity Engine] Exception during Supabase write (ignored):', err.message);
  }

  return activity;
}

/**
 * Retrieve activities filtered by criteria
 */
export async function getActivities(filters?: {
  companyId?: string;
  userId?: string;
  leadId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<Activity[]> {
  // Always read from local store first to ensure 100% data consistency and availability
  let results = [...activitiesCache];

  if (filters?.companyId) {
    results = results.filter(a => a.company_id === filters.companyId);
  }
  if (filters?.userId) {
    results = results.filter(a => a.user_id === filters.userId);
  }
  if (filters?.leadId) {
    results = results.filter(a => a.lead_id === filters.leadId);
  }
  if (filters?.startDate) {
    const start = new Date(filters.startDate).getTime();
    results = results.filter(a => new Date(a.created_at).getTime() >= start);
  }
  if (filters?.endDate) {
    const end = new Date(filters.endDate).getTime();
    results = results.filter(a => new Date(a.created_at).getTime() <= end);
  }

  return results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
