/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FileText, Plus, Send, AlertCircle, Clock, UserCheck } from 'lucide-react';
import { LeadRemark } from '../types';
import { useAppStore } from '../lib/store';

interface LeadRemarksCardProps {
  leadId: string;
  remarks?: LeadRemark[];
  compact?: boolean;
}

function formatRemarkDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const datePart = d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    const timePart = d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    return `${datePart} • ${timePart}`;
  } catch {
    return isoString;
  }
}

export const LeadRemarksCard: React.FC<LeadRemarksCardProps> = ({
  leadId,
  remarks = [],
  compact = false
}) => {
  const { addLeadRemark } = useAppStore();
  const [newRemarkText, setNewRemarkText] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Sort immutable entries strictly newest first (top) to older (bottom)
  const sortedRemarks = [...remarks].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const handleAppendRemark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRemarkText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await addLeadRemark(leadId, newRemarkText.trim());
      if (res.success) {
        setNewRemarkText('');
        setShowAddForm(false);
      } else {
        setErrorMessage(res.error || 'Failed to append remark.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred while saving remark.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`rounded-[24px] bg-white border border-slate-200 shadow-sm text-left ${compact ? 'p-4 space-y-3' : 'p-5 space-y-4'}`}>
      {/* Header with Title and Add Button */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2">
          <FileText className="w-4 h-4 text-premium-gold" />
          <h3 className="text-xs font-bold text-premium-gold uppercase tracking-wider font-display">
            Lead Remark History
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
            {sortedRemarks.length} {sortedRemarks.length === 1 ? 'Entry' : 'Entries'}
          </span>
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-[10px] font-bold text-[#0B1F33] hover:text-premium-gold flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
            title="Append a new remark"
          >
            <Plus className="w-3 h-3" />
            <span>{showAddForm ? 'Cancel' : 'Add Remark'}</span>
          </button>
        </div>
      </div>

      {/* Optional Inline Append Form */}
      {showAddForm && (
        <form onSubmit={handleAppendRemark} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Append New Remark</span>
            <span className="text-[9px] text-slate-400">Permanently saved & immutable</span>
          </div>
          <textarea
            value={newRemarkText}
            onChange={(e) => setNewRemarkText(e.target.value)}
            placeholder="Enter client remark, feedback, preference or constraint..."
            rows={2}
            className="w-full p-2.5 text-xs text-primary-navy placeholder-slate-400 bg-white border border-slate-250 rounded-xl focus:outline-none focus:border-premium-gold transition-all resize-none"
            autoFocus
            required
          />
          {errorMessage && (
            <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {errorMessage}
            </p>
          )}
          <div className="flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={() => { setShowAddForm(false); setNewRemarkText(''); setErrorMessage(''); }}
              disabled={isSubmitting}
              className="px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-lg cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !newRemarkText.trim()}
              className="px-3 py-1 text-[11px] font-bold text-white bg-primary-navy hover:bg-[#1E293B] rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3 h-3" />
              <span>{isSubmitting ? 'Saving...' : 'Commit Remark'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Historical Entries Stack (Newest at TOP, Older BELOW) */}
      <div className={`space-y-3 ${compact ? 'max-h-[300px]' : 'max-h-[420px]'} overflow-y-auto custom-scroll pr-1`}>
        {sortedRemarks.length === 0 ? (
          <div className="text-center py-6 px-4 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
            <FileText className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
            <p className="text-xs font-semibold text-slate-500">No remarks recorded yet</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Every remark entered during status transitions or direct logs will appear here in immutable chronological order.
            </p>
          </div>
        ) : (
          sortedRemarks.map((remark) => (
            <div
              key={remark.id}
              className="p-3.5 bg-slate-50 hover:bg-slate-50/80 rounded-2xl border border-slate-200 space-y-2 transition-colors text-left"
            >
              {/* Header badge */}
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md uppercase tracking-wider font-display inline-flex items-center gap-1">
                  Remark Added
                </span>
                {remark.status_at_creation && (
                  <span className="text-[9px] text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md font-medium">
                    Status: {remark.status_at_creation}
                  </span>
                )}
              </div>

              {/* Exact unmutated remark text */}
              <p className="text-xs text-slate-800 leading-relaxed font-normal whitespace-pre-wrap break-words">
                {remark.remark_text}
              </p>

              {/* Immutable metadata footer: timestamp and author */}
              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1.5 border-t border-slate-200/70 font-mono">
                <span className="flex items-center gap-1 text-slate-500">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {formatRemarkDate(remark.created_at)}
                </span>
                <span className="flex items-center gap-1 font-semibold text-primary-navy">
                  <UserCheck className="w-3 h-3 text-slate-400" />
                  By: {remark.created_by_name || 'Agent'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
