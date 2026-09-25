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

function initStore() {
  try {
    if (fs.existsSync(REMARKS_STORE_PATH)) {
      const data = fs.readFileSync(REMARKS_STORE_PATH, 'utf8');
      const parsed = JSON.parse(data);
      
      // Auto-migrate legacy format { [leadId]: string } to { [leadId]: LeadRemark[] }
      const migrated: Record<string, LeadRemark[]> = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === 'string') {
          if (value.trim()) {
            migrated[key] = [{
              id: crypto.randomUUID(),
              lead_id: key,
              remark_text: value.trim(),
              created_at: new Date().toISOString(),
              created_by_name: 'Initial Note',
              source: 'legacy_import'
            }];
          } else {
            migrated[key] = [];
          }
        } else if (Array.isArray(value)) {
          migrated[key] = value as LeadRemark[];
        }
      }
      remarksCache = migrated;
      console.log(`[Lead Remarks Store] Initialized immutable remark history for ${Object.keys(remarksCache).length} leads.`);
    } else {
      fs.writeFileSync(REMARKS_STORE_PATH, JSON.stringify({}), 'utf8');
      console.log('[Lead Remarks Store] Initialized empty persistent remarks store.');
    }
  } catch (error: any) {
    console.error('[Lead Remarks Store] Error initializing store:', error.message);
    remarksCache = {};
  }
}

function saveStore() {
  try {
    fs.writeFileSync(REMARKS_STORE_PATH, JSON.stringify(remarksCache, null, 2), 'utf8');
  } catch (error: any) {
    console.error('[Lead Remarks Store] Error saving remarks store:', error.message);
  }
}

initStore();

/**
 * Append a new immutable remark to a lead's history.
 * Every remark entered by a user remains permanently associated with that lead.
 * No lifecycle action may overwrite or delete a previous remark.
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

  const remark: LeadRemark = {
    id: crypto.randomUUID(),
    lead_id: leadId,
    remark_text: text,
    created_at: remarkData.created_at || new Date().toISOString(),
    created_by: remarkData.created_by,
    created_by_name: remarkData.created_by_name,
    source: remarkData.source || 'status_transition',
    status_at_creation: remarkData.status_at_creation,
    outcome_at_creation: remarkData.outcome_at_creation
  };

  if (!remarksCache[leadId]) {
    remarksCache[leadId] = [];
  }

  // Append new record (maintaining immutable history)
  remarksCache[leadId].push(remark);
  saveStore();

  console.log(`[Lead Remarks Store] Appended immutable remark for lead ${leadId} by ${remark.created_by_name || 'Agent'}: "${text.substring(0, 30)}..."`);

  // Attempt async write to Supabase table if it exists
  try {
    const supabase = getSupabase();
    await supabase.from('lead_remarks').insert([remark]);
  } catch (err: any) {
    // Expected if schema migration is pending
  }

  return remark;
}

/**
 * Get all immutable remarks for a lead, sorted newest first.
 */
export function getLeadRemarks(leadId: string): LeadRemark[] {
  if (!leadId || !remarksCache[leadId]) return [];
  return [...remarksCache[leadId]].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
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
    saveStore();
  }
  try {
    const supabase = getSupabase();
    supabase.from('lead_remarks').delete().eq('lead_id', leadId).then(() => {});
  } catch (err) {}
}
