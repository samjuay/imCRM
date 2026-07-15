import React, { useState, useEffect } from 'react';
import { useAppStore } from '../lib/store';
import { motion } from 'motion/react';
import { 
  History, Search, Calendar, ChevronRight, User, ArrowRight, Info, ClipboardList, PhoneCall, AlertCircle, RefreshCw
} from 'lucide-react';
import { Activity, getInitials } from '../types';

export default function ActivityHistoryScreen() {
  const { 
    activities, 
    fetchActivities, 
    isLoadingActivities,
    setActiveLeadId,
    setActiveTab,
    users,
    fetchUsers
  } = useAppStore();

  const [preset, setPreset] = useState<'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom'>('this_week');
  const [searchQuery, setSearchQuery] = useState('');
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const getDatesForPreset = (p: typeof preset) => {
    const today = new Date();
    let startStr = today.toISOString().split('T')[0];
    let endStr = startStr;

    if (p === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      startStr = yesterday.toISOString().split('T')[0];
      endStr = startStr;
    } else if (p === 'this_week') {
      const distance = today.getDay() === 0 ? -6 : 1 - today.getDay();
      const monday = new Date(today.setDate(today.getDate() + distance));
      const sunday = new Date(monday.setDate(monday.getDate() + 6));
      startStr = monday.toISOString().split('T')[0];
      endStr = sunday.toISOString().split('T')[0];
    } else if (p === 'this_month') {
      startStr = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      endStr = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    } else if (p === 'custom') {
      startStr = customStartDate;
      endStr = customEndDate;
    }

    return { start: startStr, end: endStr };
  };

  useEffect(() => {
    const { start, end } = getDatesForPreset(preset);
    fetchActivities({
      startDate: start,
      endDate: end
    });
  }, [preset, customStartDate, customEndDate]);

  const handleRefresh = () => {
    const { start, end } = getDatesForPreset(preset);
    fetchActivities({
      startDate: start,
      endDate: end
    });
  };

  // Helper to resolve user names
  const getUserName = (userId: string) => {
    const u = users.find(u => u.id === userId);
    return u ? u.full_name : 'System/Automation';
  };

  // Helper to format date
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '';
    }
  };

  const getBadgeColors = (type: string) => {
    switch (type) {
      case 'Status Changed':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Lead Created':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'Followup Added':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Followup Completed':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'Site Visit Scheduled':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Site Visit Completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  // Filter activities client-side based on search query
  const filteredActivities = activities.filter(act => {
    const query = searchQuery.toLowerCase();
    const actNotes = (act.notes || '').toLowerCase();
    const actType = (act.activity_type || '').toLowerCase();
    const creatorName = getUserName(act.user_id).toLowerCase();
    const prevStatus = (act.previous_status || '').toLowerCase();
    const newStatus = (act.new_status || '').toLowerCase();
    
    return actNotes.includes(query) || 
           actType.includes(query) || 
           creatorName.includes(query) ||
           prevStatus.includes(query) ||
           newStatus.includes(query);
  });

  const handleLeadClick = (leadId: string) => {
    setActiveLeadId(leadId);
    setActiveTab('leads');
  };

  return (
    <div className="space-y-6" id="activity_history_screen">
      {/* Header Panel */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 mb-1 bg-slate-900 text-[#C9A24D] rounded-xl">
              <History className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-display font-medium text-slate-900 tracking-tight">System Activity Audit Trail</h1>
          </div>
          <p className="text-slate-500 text-sm">Review absolute logs of status transitions, followups, site-visit planning, and team accomplishments.</p>
        </div>

        <button 
          onClick={handleRefresh}
          className="neu-button flex items-center space-x-2 border border-slate-200 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingActivities ? 'animate-spin' : ''}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Date & Filter Toolbar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Preset Chips */}
          <div className="flex flex-wrap gap-2">
            {(['today', 'yesterday', 'this_week', 'this_month', 'custom'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPreset(p)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  preset === p 
                    ? 'bg-[#0B1F33] text-[#C9A24D] border border-slate-900 shadow-sm' 
                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                } capitalize`}
              >
                {p === 'this_week' ? 'This Week' : p === 'this_month' ? 'This Month' : p === 'custom' ? 'Custom dates' : p}
              </button>
            ))}
          </div>

          {/* Search Inputs */}
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search logs & notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-400 bg-slate-50 text-slate-900"
            />
          </div>
        </div>

        {/* Custom date range picker */}
        {preset === 'custom' && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col sm:flex-row gap-4 items-end"
          >
            <div className="space-y-1 w-full sm:w-auto">
              <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Start Date
              </label>
              <input 
                type="date" 
                value={customStartDate} 
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full sm:w-44 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-400 focus:outline-none bg-white text-slate-800 font-medium"
              />
            </div>
            <div className="space-y-1 w-full sm:w-auto">
              <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                End Date
              </label>
              <input 
                type="date" 
                value={customEndDate} 
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full sm:w-44 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-400 focus:outline-none bg-white text-slate-800 font-medium"
              />
            </div>
          </motion.div>
        )}
      </div>

      {/* Main Logs Table / View */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoadingActivities ? (
          <div className="p-16 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-2 border-[#0B1F33] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-400 font-medium font-display uppercase tracking-wider">Syncing activity timeline records...</p>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="p-16 text-center max-w-sm mx-auto space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 mx-auto">
              <History className="w-6 h-6 stroke-[1.5]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-900">No activity logs found</h3>
              <p className="text-xs text-slate-500">There are no activities matching your current filters or query range in this window.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-[10px] uppercase tracking-wider font-bold text-slate-500">
                  <th className="py-4 px-6">Timestamp</th>
                  <th className="py-4 px-6">Activity Type</th>
                  <th className="py-4 px-6">Lead Connection</th>
                  <th className="py-4 px-6">Performed By</th>
                  <th className="py-4 px-6">Action details & status transition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredActivities.map((act) => (
                  <tr key={act.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Timestamp column */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{formatTime(act.created_at)}</div>
                      <div className="text-[10px] text-slate-400 font-medium">{formatDate(act.created_at)}</div>
                    </td>

                    {/* Badge type column */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${getBadgeColors(act.activity_type)}`}>
                        {act.activity_type}
                      </span>
                    </td>

                    {/* Lead reference with click handler */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      <button 
                        onClick={() => handleLeadClick(act.lead_id)}
                        className="group flex items-center space-x-1 text-slate-700 hover:text-slate-900 font-semibold focus:outline-none cursor-pointer"
                      >
                        <span className="underline decoration-slate-300 group-hover:decoration-slate-800 transition-colors">
                          View Lead Profile
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </td>

                    {/* Performed by user */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center text-white text-[9px] font-bold">
                          {getInitials(getUserName(act.user_id))}
                        </div>
                        <span className="font-medium text-slate-800">{getUserName(act.user_id)}</span>
                      </div>
                    </td>

                    {/* Detailed Notes / Status transition details */}
                    <td className="py-4 px-6">
                      <div className="space-y-1 max-w-md">
                        {act.activity_type === 'Status Changed' && act.new_status && (
                          <div className="flex items-center space-x-1.5 text-slate-600 font-medium mb-1">
                            <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] text-slate-500 line-through">
                              {act.previous_status || 'New'}
                            </span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span className="px-1.5 py-0.5 bg-green-50 text-green-700 border border-green-100 rounded text-[10px] font-bold">
                              {act.new_status}
                            </span>
                          </div>
                        )}
                        <p className="text-slate-600 leading-relaxed font-sans">{act.notes || <span className="text-slate-400 italic">No notes provided</span>}</p>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
