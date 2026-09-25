/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { LeadRemark } from '../types';
import { getSupabase } from './supabaseClient';

const REMARKS_STORE_PATH = path.join(process.cwd(), 'lead_remarks_store.json');

// Canonical in-memory cache of lead_id -> immutable LeadRemark[]
let remarksCache: Record<string, LeadRemark[]> = {};
let isReconciliationRunning = false;

const SYSTEM_PHRASES = [
  'bulk importing logging workflow',
  'lead creation lock',
  'lead assigned on creation',
  'automated import followup log trigger',
  'scheduled during dashboard',
  'completed automatically during status change',
  'site visit completed automatically due to status change',
  'site visit cancelled automatically due to status change',
  'booking completed. amount:'
];

const SYSTEM_EVENT_NAMES = [
  'status changed',
  'follow-up scheduled',
  'followup scheduled',
  'follow-up completed',
  'followup completed',
  'site visit scheduled',
  'site visit completed',
  'site visit cancelled',
  'remarks added',
  'lead created',
  'lead assigned'
];

/**
 * Extract clean, authentic user remark text from raw status transition remarks or notes.
 * Strips out system prefixes like "Outcome: ... | Remarks: " or "Remarks: ".
 * Returns null if the remark only contains automated system event strings or is empty.
 */
export function extractCleanUserRemark(rawRemark: string | null | undefined): string | null {
  if (!rawRemark) return null;
  const raw = String(rawRemark).trim();
  if (!raw) return null;

  const lower = raw.toLowerCase();
  if (SYSTEM_PHRASES.some(p => lower.includes(p))) {
    return null;
  }

  // Handle "Outcome: ... | Remarks: <text>"
  if (raw.includes(' | Remarks: ')) {
    const text = raw.split(' | Remarks: ').slice(1).join(' | Remarks: ').trim();
    if (!text) return null;
    if (SYSTEM_PHRASES.some(p => text.toLowerCase().includes(p))) return null;
    return text;
  }

  // Handle "Remarks: <text>"
  if (/^Remarks:\s*/i.test(raw)) {
    const text = raw.replace(/^Remarks:\s*/i, '').trim();
    if (!text) return null;
    if (SYSTEM_PHRASES.some(p => text.toLowerCase().includes(p))) return null;
    return text;
  }

  // Handle pure outcome without custom remarks e.g. "Outcome: Warm Follow-up Callback"
  if (/^Outcome:\s*[^|]*$/i.test(raw)) {
    return null;
  }

  // Handle pure system event utterances
  if (SYSTEM_EVENT_NAMES.includes(lower)) {
    return null;
  }

  return raw;
}

function initLocalCache() {
  try {
    if (fs.existsSync(REMARKS_STORE_PATH)) {
      const data = fs.readFileSync(REMARKS_STORE_PATH, 'utf8');
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        remarksCache = parsed;
        console.log(`[Lead Remarks Store] Initialized local cache mirror with ${Object.keys(remarksCache).length} leads.`);
      }
    }
  } catch (error: any) {
    console.warn('[Lead Remarks Store] Warning reading local cache file (will rebuild from Supabase):', error.message);
    remarksCache = {};
  }
}

function saveLocalCache() {
  try {
    fs.writeFileSync(REMARKS_STORE_PATH, JSON.stringify(remarksCache, null, 2), 'utf8');
  } catch (error: any) {
    // Non-fatal, as public.lead_remarks in Supabase is the primary durable store
    console.warn('[Lead Remarks Store] Warning writing local cache mirror:', error.message);
  }
}

/**
 * Canonical Reconciliation:
 * 1. Paginates and loads all records from public.lead_remarks (primary source of truth).
 * 2. Checks public.lead_status_updates for any historical remarks that were not yet backfilled.
 * 3. Saves local mirror cache.
 * 4. Strictly idempotent - never creates duplicates.
 */
export async function reconcileWithSupabase(): Promise<void> {
  if (isReconciliationRunning) return;
  isReconciliationRunning = true;

  try {
    const supabase = getSupabase();

    // 1. Fetch user profiles for author name resolution
    const { data: profiles } = await supabase.from('profiles').select('id, full_name');
    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name]));

    const freshCache: Record<string, LeadRemark[]> = {};
    const existingRemarkIds = new Set<string>();

    // 2. Load all authoritative records directly from public.lead_remarks using pagination
    let fromRemarks = 0;
    const batchSize = 1000;
    while (true) {
      const { data: dbRemarks, error: remarksErr } = await supabase
        .from('lead_remarks')
        .select('*')
        .order('created_at', { ascending: false })
        .range(fromRemarks, fromRemarks + batchSize - 1);

      if (remarksErr) {
        console.error('[Lead Remarks Store] Error reading public.lead_remarks from Supabase:', remarksErr.message);
        break;
      }
      if (!dbRemarks || dbRemarks.length === 0) break;

      for (const r of dbRemarks) {
        existingRemarkIds.add(r.id);
        if (!freshCache[r.lead_id]) {
          freshCache[r.lead_id] = [];
        }
        freshCache[r.lead_id].push({
          id: r.id,
          lead_id: r.lead_id,
          remark_text: r.remark_text,
          created_at: r.created_at,
          created_by: r.created_by,
          created_by_name: r.created_by_name || profileMap.get(r.created_by) || 'Agent',
          source: r.source || 'direct_entry',
          status_at_creation: r.status_at_creation,
          outcome_at_creation: r.outcome_at_creation
        });
      }

      if (dbRemarks.length < batchSize) break;
      fromRemarks += batchSize;
    }

    // 3. Historical backfill check: inspect lead_status_updates for any remarks missing from public.lead_remarks
    try {
      let fromStatus = 0;
      const statusBatchSize = 1000;
      const backfillRows: any[] = [];

      while (true) {
        const { data: statusUpdates, error: statusErr } = await supabase
          .from('lead_status_updates')
          .select('*')
          .order('created_at', { ascending: false })
          .range(fromStatus, fromStatus + statusBatchSize - 1);

        if (statusErr || !statusUpdates || statusUpdates.length === 0) break;

        for (const u of statusUpdates) {
          if (!existingRemarkIds.has(u.id)) {
            const cleanText = extractCleanUserRemark(u.remark);
            if (cleanText) {
              const authorName = profileMap.get(u.user_id) || 'Agent';
              const newRecord = {
                id: u.id,
                lead_id: u.lead_id,
                remark_text: cleanText,
                created_at: u.created_at,
                created_by: u.user_id,
                created_by_name: authorName,
                source: 'status_transition',
                status_at_creation: u.new_status,
                outcome_at_creation: u.outcome || null
              };
              backfillRows.push(newRecord);
              existingRemarkIds.add(u.id);

              if (!freshCache[u.lead_id]) freshCache[u.lead_id] = [];
              freshCache[u.lead_id].push(newRecord);
            }
          }
        }

        if (statusUpdates.length < statusBatchSize) break;
        fromStatus += statusBatchSize;
      }

      if (backfillRows.length > 0) {
        console.log(`[Lead Remarks Store] Backfilling ${backfillRows.length} historical remarks into public.lead_remarks...`);
        // Insert backfill rows in batches
        for (let i = 0; i < backfillRows.length; i += 100) {
          const slice = backfillRows.slice(i, i + 100);
          await supabase.from('lead_remarks').insert(slice);
        }
      }
    } catch (backfillErr: any) {
      console.warn('[Lead Remarks Store] Historical backfill check notice:', backfillErr.message);
    }

    // 4. Sort all cached lead remark arrays newest-first
    for (const leadId of Object.keys(freshCache)) {
      freshCache[leadId].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    remarksCache = freshCache;
    saveLocalCache();
    console.log(`[Lead Remarks Store] Synchronized with public.lead_remarks: ${existingRemarkIds.size} total remarks across ${Object.keys(remarksCache).length} leads.`);
  } catch (err: any) {
    console.error('[Lead Remarks Store] Error during Supabase remarks reconciliation:', err.message);
  } finally {
    isReconciliationRunning = false;
  }
}

// Initial sync on module load
initLocalCache();
reconcileWithSupabase().catch((e) => console.error('[Lead Remarks Store] Boot reconciliation error:', e));

/**
 * Append a new immutable remark to a lead's history.
 * Inserts directly into public.lead_remarks in Supabase (the canonical database source of truth).
 * Does NOT require or depend on lead_status_updates.
 * Strictly append-only: never overwrites or mutates any prior remark.
 */
export async function addLeadRemark(
  leadId: string,
  remarkData: {
    remark_text: string;
    created_by?: string;
    created_by_name?: string;
    source?: string;
    status_at_creation?: string;
    outcome_at_creation?: string;
    created_at?: string;
  }
): Promise<LeadRemark> {
  if (!leadId) throw new Error('Lead ID is required to append remark.');
  const text = (remarkData.remark_text || '').trim();
  if (!text) throw new Error('Remark text cannot be empty.');

  const remarkId = crypto.randomUUID();
  const createdAt = remarkData.created_at || new Date().toISOString();
  const authorName = remarkData.created_by_name || 'Agent';

  const newRemark: LeadRemark = {
    id: remarkId,
    lead_id: leadId,
    remark_text: text,
    created_at: createdAt,
    created_by: remarkData.created_by || null,
    created_by_name: authorName,
    source: remarkData.source || 'direct_entry',
    status_at_creation: remarkData.status_at_creation || null,
    outcome_at_creation: remarkData.outcome_at_creation || null
  };

  // 1. Authoritative write: insert directly into public.lead_remarks in Supabase
  const supabase = getSupabase();
  const { data: dbData, error: insertError } = await supabase
    .from('lead_remarks')
    .insert([newRemark])
    .select()
    .single();

  if (insertError) {
    console.error(`[Lead Remarks Store] Failed to insert into public.lead_remarks for lead ${leadId}:`, insertError.message);
    throw new Error(`Failed to persist remark to Supabase: ${insertError.message}`);
  }

  const persistedRemark: LeadRemark = dbData || newRemark;

  // 2. Update memory cache mirror (prepend and maintain newest-first)
  if (!remarksCache[leadId]) {
    remarksCache[leadId] = [];
  }
  remarksCache[leadId].unshift(persistedRemark);
  remarksCache[leadId].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  saveLocalCache();

  console.log(`[Lead Remarks Store] Successfully persisted remark into public.lead_remarks for lead ${leadId} by ${persistedRemark.created_by_name}: "${text.substring(0, 30)}..."`);

  return persistedRemark;
}

/**
 * Get all immutable remarks for a lead synchronously from in-memory cache, sorted newest-first.
 */
export function getLeadRemarks(leadId: string): LeadRemark[] {
  if (!leadId || !remarksCache[leadId]) return [];
  return [...remarksCache[leadId]].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

/**
 * Asynchronously get all immutable remarks for a lead directly from public.lead_remarks in Supabase.
 * Ensures the database is the primary source of truth, even after server restarts or local cache deletion.
 */
export async function getLeadRemarksAsync(leadId: string): Promise<LeadRemark[]> {
  if (!leadId) return [];

  try {
    const supabase = getSupabase();
    const { data: dbRemarks, error } = await supabase
      .from('lead_remarks')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (!error && dbRemarks) {
      remarksCache[leadId] = dbRemarks;
      saveLocalCache();
      return dbRemarks;
    }
  } catch (err: any) {
    console.warn(`[Lead Remarks Store] Query to public.lead_remarks failed for lead ${leadId}, falling back to cache:`, err.message);
  }

  return getLeadRemarks(leadId);
}

/**
 * Get latest remark text as a summary string (for list views / backward compat).
 */
export function getLatestLeadRemarkText(leadId: string): string {
  const remarks = getLeadRemarks(leadId);
  return remarks[0]?.remark_text || '';
}

/**
 * Batch get lead remarks for multiple lead IDs.
 */
export function getBatchLeadRemarks(leadIds: string[]): Record<string, LeadRemark[]> {
  const result: Record<string, LeadRemark[]> = {};
  for (const id of leadIds) {
    result[id] = getLeadRemarks(id);
  }
  return result;
}

/**
 * Clean up remarks ONLY when a lead is permanently deleted from the CRM.
 */
export function deleteLeadRemarks(leadId: string): void {
  if (!leadId) return;
  if (remarksCache[leadId] !== undefined) {
    delete remarksCache[leadId];
    saveLocalCache();
  }
  try {
    const supabase = getSupabase();
    supabase.from('lead_remarks').delete().eq('lead_id', leadId).then(() => {});
  } catch (err) {}
}
