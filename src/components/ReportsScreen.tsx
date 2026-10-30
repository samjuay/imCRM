import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../lib/store';
import { UserRole } from '../types';
import { 
  PhoneCall, 
  PhoneIncoming, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  UserCheck, 
  Compass, 
  MapPin, 
  DollarSign, 
  HelpCircle,
  TrendingUp,
  RotateCcw,
  UserPlus,
  Users,
  ChevronDown
} from 'lucide-react';

type DatePreset = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom';

interface ColdCallingReport {
  attempted: number;
  connected: number;
  followupRequired: number;
  interested: number;
  notInterested: number;
  wrongNumber: number;
  convertedToLead: number;
  totalCallsDone: number;
}

interface LeadFollowupsReport {
  newLeadsAdded: number;
  attempted: number;
  connected: number;
  followupScheduled: number;
  interested: number;
  siteVisitScheduled: number;
  siteVisitDone: number;
  bookingDone: number;
  notInterested: number;
  lost: number;
  totalCallsDone: number;
}

interface ReportResponse {
  preset: string;
  interval: {
    startCal: string;
    endCal: string;
    startUtc: string;
    endExclusiveUtc: string;
    timezone: string;
  };
  coldCallingReport: ColdCallingReport;
  leadFollowupsReport: LeadFollowupsReport;
  scope?: string;
  targetUser?: {
    id: string;
    full_name: string;
    role: string;
  } | null;
  filterUserId?: string;
}

export default function ReportsScreen() {
  const { activeUser, users, fetchUsers } = useAppStore();

  const [preset, setPreset] = useState<DatePreset>('today');
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [reportData, setReportData] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load company/team users on mount if not already populated
  useEffect(() => {
    if (!users || users.length === 0) {
      fetchUsers();
    }
  }, [users, fetchUsers]);

  const isAdmin = activeUser?.role === UserRole.COMPANY_ADMIN;
  const isTeamLeader = activeUser?.role === UserRole.TEAM_LEADER;
  const canSelectUser = isAdmin || isTeamLeader;

  // Compute authorized user options based on caller role & permissions
  const authorizedUsers = useMemo(() => {
    if (!activeUser || !users) return [];
    if (isAdmin) {
      // Company Admin sees all active users in their company
      return users.filter(u => u.company_id === activeUser.company_id && u.is_active !== false);
    }
    if (isTeamLeader) {
      // Team Leader sees users belonging to their team plus themselves
      return users.filter(u => 
        u.company_id === activeUser.company_id && 
        (u.team_id === activeUser.team_id || u.id === activeUser.id) &&
        u.is_active !== false
      );
    }
    return [];
  }, [activeUser, users, isAdmin, isTeamLeader]);

  const formatRole = (role?: string) => {
    if (!role) return '';
    if (role === UserRole.COMPANY_ADMIN) return 'Admin';
    if (role === UserRole.TEAM_LEADER) return 'Team Leader';
    if (role === UserRole.SALES_EXECUTIVE) return 'Sales Exec';
    return role;
  };

  const selectedScopeLabel = useMemo(() => {
    if (!activeUser) return '';
    if (!canSelectUser) {
      return `My Performance (${activeUser.full_name})`;
    }
    if (selectedUserId === 'all') {
      return isAdmin 
        ? 'Company Consolidated (All Users)' 
        : 'Team Consolidated (All Team Members)';
    }
    const target = authorizedUsers.find(u => u.id === selectedUserId);
    return target 
      ? `Individual: ${target.full_name} (${formatRole(target.role)})`
      : 'Individual User';
  }, [activeUser, canSelectUser, selectedUserId, isAdmin, authorizedUsers]);

  const getTodayKolkata = () => {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  };

  // Custom date range state (defaults to today in Asia/Kolkata)
  const [customStartDate, setCustomStartDate] = useState(getTodayKolkata);
  const [customEndDate, setCustomEndDate] = useState(getTodayKolkata);

  const fetchReports = async () => {
    if (!activeUser) return;
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('imcrm_user_token') || activeUser.id;
      let url = `/api/reports?preset=${preset}`;
      
      // Pass requested user filter if caller has permission; Sales Executives default to themselves
      if (canSelectUser && selectedUserId) {
        url += `&userId=${encodeURIComponent(selectedUserId)}`;
      } else {
        url += `&userId=${encodeURIComponent(activeUser.id)}`;
      }

      if (preset === 'custom') {
        url += `&start=${encodeURIComponent(customStartDate)}&end=${encodeURIComponent(customEndDate)}`;
      }

      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('You do not have permission to view reports for the requested user or scope.');
        }
        throw new Error(`Failed to load reports (Status: ${res.status})`);
      }
      const data: ReportResponse = await res.json();
      setReportData(data);
    } catch (err: any) {
      console.error('[Performance Reports Error]:', err);
      setError(err.message || 'An error occurred while loading activity reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [preset, customStartDate, customEndDate, activeUser, selectedUserId]);

  // Format date interval for header display
  const formatDateLabel = () => {
    if (!reportData?.interval) return '';
    const { startCal, endCal } = reportData.interval;
    if (startCal === endCal) {
      return new Date(startCal + 'T12:00:00+05:30').toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Kolkata'
      });
    }
    const startFmt = new Date(startCal + 'T12:00:00+05:30').toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      timeZone: 'Asia/Kolkata'
    });
    const endFmt = new Date(endCal + 'T12:00:00+05:30').toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata'
    });
    return `${startFmt} – ${endFmt}`;
  };

  return (
    <div className="flex flex-col select-none pb-28 text-left space-y-6 w-full max-w-7xl mx-auto" id="reports_screen">
      
      {/* 1. TOP BAR: DATE FILTERS ONLY */}
      <header className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold font-display text-slate-900 tracking-tight">
              Performance Reports
            </h1>
            {selectedScopeLabel && (
              <span className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full border ${
                selectedUserId === 'all'
                  ? 'bg-slate-100 text-slate-700 border-slate-200'
                  : 'bg-indigo-50 text-indigo-700 border-indigo-200'
              }`}>
                {selectedScopeLabel}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 font-medium flex-wrap">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Real-time activity metrics</span>
            {reportData?.interval && (
              <>
                <span className="text-slate-300">•</span>
                <span className="font-mono text-slate-600 font-semibold">{formatDateLabel()}</span>
                <span className="text-slate-400 font-normal">(IST)</span>
              </>
            )}
          </p>
        </div>

        {/* Preset Timeframe Selector */}
        <nav 
          aria-label="Report Date Range"
          className="flex bg-slate-100/90 p-1 rounded-xl sm:rounded-2xl border border-slate-200/80 w-full md:w-auto overflow-x-auto"
        >
          {([
            { key: 'today', label: 'Today' },
            { key: 'yesterday', label: 'Yesterday' },
            { key: 'this_week', label: 'This Week' },
            { key: 'this_month', label: 'This Month' },
            { key: 'custom', label: 'Custom' }
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setPreset(key)}
              className={`flex-1 md:flex-none min-h-[44px] px-3.5 sm:px-4 py-2.5 text-center text-xs font-semibold rounded-lg sm:rounded-xl transition-all whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-[#0B1F33] ${
                preset === key 
                  ? 'bg-[#0B1F33] text-white shadow-sm' 
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      {/* 2. USER SELECTOR BAR (For Company Admin & Team Leader) */}
      {canSelectUser && (
        <section 
          aria-label="Report For User Selector"
          className="bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 animate-fade-in"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100/80 rounded-xl text-slate-700">
              <Users className="w-4 h-4 text-slate-700" />
            </div>
            <div>
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 block">
                Report For
              </span>
              <span className="text-xs font-semibold text-slate-800">
                {selectedScopeLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <label htmlFor="report_user_select" className="sr-only">Select User</label>
              <select
                id="report_user_select"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full min-h-[42px] pl-3.5 pr-8 py-2 text-xs font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0B1F33] focus:border-transparent focus:outline-none bg-slate-50 text-slate-900 cursor-pointer appearance-none transition-all shadow-xs"
              >
                <option value="all">
                  {isAdmin ? 'All Users (Company Consolidated)' : 'All Team Members (Consolidated)'}
                </option>
                {authorizedUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({formatRole(u.role)})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-500">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>

            {selectedUserId !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedUserId('all')}
                title="Reset to Consolidated View"
                className="min-h-[42px] px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all whitespace-nowrap"
              >
                Reset
              </button>
            )}
          </div>
        </section>
      )}

      {/* Custom Date Range Picker (Single-column mobile friendly) */}
      {preset === 'custom' && (
        <section 
          aria-label="Custom Date Range Selector"
          className="p-4 sm:p-5 bg-white border border-slate-200 rounded-2xl sm:rounded-3xl shadow-sm animate-fade-in"
        >
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-end">
            <div className="space-y-1.5 flex-1">
              <label 
                htmlFor="custom_start_date"
                className="text-[11px] uppercase font-bold text-slate-600 flex items-center gap-1.5"
              >
                <Calendar className="w-4 h-4 text-slate-500" />
                <span>Start Date</span>
              </label>
              <input 
                id="custom_start_date"
                type="date" 
                value={customStartDate} 
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0B1F33] focus:border-transparent focus:outline-none bg-slate-50 text-slate-900 font-medium"
              />
            </div>

            <div className="space-y-1.5 flex-1">
              <label 
                htmlFor="custom_end_date"
                className="text-[11px] uppercase font-bold text-slate-600 flex items-center gap-1.5"
              >
                <Calendar className="w-4 h-4 text-slate-500" />
                <span>End Date</span>
              </label>
              <input 
                id="custom_end_date"
                type="date" 
                value={customEndDate} 
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0B1F33] focus:border-transparent focus:outline-none bg-slate-50 text-slate-900 font-medium"
              />
            </div>
          </div>
          {customStartDate > customEndDate && (
            <div className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Start date is after End date. The date interval will be normalized automatically.</span>
            </div>
          )}
        </section>
      )}

      {/* ERROR STATE */}
      {error && !loading && (
        <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-rose-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
          <button
            type="button"
            onClick={fetchReports}
            className="min-h-[44px] px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* LOADING SKELETON */}
      {loading && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 animate-pulse">
            <div className="h-6 bg-slate-200 rounded-md w-48" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-24 bg-slate-100 rounded-2xl" />
              ))}
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 animate-pulse">
            <div className="h-6 bg-slate-200 rounded-md w-48" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {Array.from({ length: 11 }).map((_, i) => (
                <div key={i} className="h-24 bg-slate-100 rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT: STRICTLY TWO SECTIONS */}
      {!loading && reportData && (
        <main className="space-y-6">
          
          {/* ======================================================== */}
          {/* SECTION ONE: COLD CALLING REPORT */}
          {/* ======================================================== */}
          <section 
            aria-labelledby="cold_calling_report_title"
            className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h2 
                  id="cold_calling_report_title"
                  className="text-lg font-bold font-display text-slate-900 flex items-center gap-2"
                >
                  <span className="p-2 rounded-xl bg-sky-50 text-sky-700 border border-sky-100">
                    <PhoneCall className="w-4 h-4" />
                  </span>
                  <span>Cold Calling Report</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Direct call outcomes and conversions logged from the Cold Calling pipeline
                </p>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 self-start sm:self-auto">
                <span className="text-slate-400 font-normal">Total Calls:</span>
                <span className="font-mono text-slate-900 font-bold text-sm">
                  {reportData.coldCallingReport.totalCallsDone}
                </span>
              </div>
            </div>

            {/* Cold Calling Metrics Grid (Responsive Cards) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              
              {/* 1. Attempted */}
              <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 hover:bg-white hover:shadow-sm transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Attempted</span>
                  <PhoneCall className="w-4 h-4 text-amber-500" />
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900">
                    {reportData.coldCallingReport.attempted}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">No answer / ringing</p>
                </div>
              </div>

              {/* 2. Connected */}
              <div className="p-4 rounded-2xl border border-emerald-100 bg-emerald-50/30 hover:bg-white hover:shadow-sm transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between text-emerald-700">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Connected</span>
                  <PhoneIncoming className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-bold font-mono text-emerald-700">
                    {reportData.coldCallingReport.connected}
                  </span>
                  <p className="text-[10px] text-emerald-600/70 mt-0.5">Spoke to client</p>
                </div>
              </div>

              {/* 3. Follow-up Required */}
              <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 hover:bg-white hover:shadow-sm transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Follow-up Required</span>
                  <Clock className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900">
                    {reportData.coldCallingReport.followupRequired}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">Callback needed</p>
                </div>
              </div>

              {/* 4. Interested */}
              <div className="p-4 rounded-2xl border border-blue-100 bg-blue-50/30 hover:bg-white hover:shadow-sm transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between text-blue-700">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Interested</span>
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-bold font-mono text-blue-700">
                    {reportData.coldCallingReport.interested}
                  </span>
                  <p className="text-[10px] text-blue-600/70 mt-0.5">Prospect interest noted</p>
                </div>
              </div>

              {/* 5. Not Interested */}
              <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 hover:bg-white hover:shadow-sm transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Not Interested</span>
                  <XCircle className="w-4 h-4 text-rose-500" />
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900">
                    {reportData.coldCallingReport.notInterested}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">Rejected / not interested</p>
                </div>
              </div>

              {/* 6. Wrong Number */}
              <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 hover:bg-white hover:shadow-sm transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Wrong Number</span>
                  <HelpCircle className="w-4 h-4 text-slate-400" />
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900">
                    {reportData.coldCallingReport.wrongNumber}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">Invalid contact number</p>
                </div>
              </div>

              {/* 7. Converted to Lead */}
              <div className="p-4 rounded-2xl border border-purple-100 bg-purple-50/40 hover:bg-white hover:shadow-sm transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between text-purple-700">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Converted to Lead</span>
                  <UserCheck className="w-4 h-4 text-purple-600" />
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-bold font-mono text-purple-700">
                    {reportData.coldCallingReport.convertedToLead}
                  </span>
                  <p className="text-[10px] text-purple-600/70 mt-0.5">Promoted to active lead</p>
                </div>
              </div>

              {/* 8. Total Calls Done */}
              <div className="p-4 rounded-2xl border border-[#0B1F33]/20 bg-[#0B1F33] text-white flex flex-col justify-between shadow-sm">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#C9A24D]">Total Calls Done</span>
                  <TrendingUp className="w-4 h-4 text-[#C9A24D]" />
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-bold font-mono text-white">
                    {reportData.coldCallingReport.totalCallsDone}
                  </span>
                  <p className="text-[10px] text-slate-300 mt-0.5">All qualifying call attempts</p>
                </div>
              </div>

            </div>
          </section>

          {/* ======================================================== */}
          {/* SECTION TWO: LEAD FOLLOWUPS */}
          {/* ======================================================== */}
          <section 
            aria-labelledby="lead_followups_report_title"
            className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h2 
                  id="lead_followups_report_title"
                  className="text-lg font-bold font-display text-slate-900 flex items-center gap-2"
                >
                  <span className="p-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100">
                    <Clock className="w-4 h-4" />
                  </span>
                  <span>Lead Followups</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Follow-up calls, client interactions, site visits, and milestone achievements for leads
                  <span className="text-slate-300 mx-1.5">•</span>
                  <span>New leads attributed to creator (<code className="font-mono text-[11px] text-slate-600">created_by</code>)</span>
                </p>
              </div>

              <div 
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 self-start sm:self-auto"
                title="Total logged client interactions & outcomes across all follow-up stages (not independently verified telephone calls)"
              >
                <span className="text-slate-400 font-normal">Total Calls:</span>
                <span className="font-mono text-slate-900 font-bold text-sm">
                  {reportData.leadFollowupsReport.totalCallsDone}
                </span>
              </div>
            </div>

            {/* Lead Followups Metrics Grid (Responsive Cards) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
              
              {/* 1. New Leads Added */}
              <div className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/40 hover:bg-white hover:shadow-sm transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between text-indigo-700">
                  <span className="text-[11px] font-bold uppercase tracking-wider">New Leads Added</span>
                  <UserPlus className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-bold font-mono text-indigo-700">
                    {reportData.leadFollowupsReport.newLeadsAdded}
                  </span>
                  <p className="text-[10px] text-indigo-600/70 mt-0.5" title="Lead records created during interval, attributed to creator (created_by)">
                    Created in interval (by creator)
                  </p>
                </div>
              </div>

              {/* 2. Attempted */}
              <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 hover:bg-white hover:shadow-sm transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Attempted</span>
                  <PhoneCall className="w-4 h-4 text-amber-500" />
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900">
                    {reportData.leadFollowupsReport.attempted}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">Ringing / busy / no reply</p>
                </div>
              </div>

              {/* 3. Connected */}
              <div className="p-4 rounded-2xl border border-emerald-100 bg-emerald-50/30 hover:bg-white hover:shadow-sm transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between text-emerald-700">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Connected</span>
                  <PhoneIncoming className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-bold font-mono text-emerald-700">
                    {reportData.leadFollowupsReport.connected}
                  </span>
                  <p className="text-[10px] text-emerald-600/70 mt-0.5">Conversation held</p>
                </div>
              </div>

              {/* 4. Follow-up Scheduled */}
              <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 hover:bg-white hover:shadow-sm transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Follow-up Scheduled</span>
                  <Clock className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900">
                    {reportData.leadFollowupsReport.followupScheduled}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">Scheduled callback</p>
                </div>
              </div>

              {/* 5. Interested */}
              <div className="p-4 rounded-2xl border border-blue-100 bg-blue-50/30 hover:bg-white hover:shadow-sm transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between text-blue-700">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Interested</span>
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-bold font-mono text-blue-700">
                    {reportData.leadFollowupsReport.interested}
                  </span>
                  <p className="text-[10px] text-blue-600/70 mt-0.5">Active buyer interest</p>
                </div>
              </div>

              {/* 6. Site Visit Scheduled */}
              <div className="p-4 rounded-2xl border border-purple-100 bg-purple-50/30 hover:bg-white hover:shadow-sm transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between text-purple-700">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Site Visit Scheduled</span>
                  <MapPin className="w-4 h-4 text-purple-600" />
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-bold font-mono text-purple-700">
                    {reportData.leadFollowupsReport.siteVisitScheduled}
                  </span>
                  <p className="text-[10px] text-purple-600/70 mt-0.5">Tour booked</p>
                </div>
              </div>

              {/* 7. Site Visit Done */}
              <div className="p-4 rounded-2xl border border-teal-100 bg-teal-50/30 hover:bg-white hover:shadow-sm transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between text-teal-700">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Site Visit Done</span>
                  <Compass className="w-4 h-4 text-teal-600" />
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-bold font-mono text-teal-700">
                    {reportData.leadFollowupsReport.siteVisitDone}
                  </span>
                  <p className="text-[10px] text-teal-600/70 mt-0.5">Physical visit completed</p>
                </div>
              </div>

              {/* 8. Booking Done */}
              <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/40 hover:bg-white hover:shadow-sm transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between text-amber-800">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Booking Done</span>
                  <DollarSign className="w-4 h-4 text-amber-600" />
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-bold font-mono text-amber-800">
                    {reportData.leadFollowupsReport.bookingDone}
                  </span>
                  <p className="text-[10px] text-amber-700/70 mt-0.5">Unit reserved / token paid</p>
                </div>
              </div>

              {/* 9. Not Interested */}
              <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 hover:bg-white hover:shadow-sm transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Not Interested</span>
                  <XCircle className="w-4 h-4 text-rose-500" />
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900">
                    {reportData.leadFollowupsReport.notInterested}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">Client declined</p>
                </div>
              </div>

              {/* 10. Lost */}
              <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 hover:bg-white hover:shadow-sm transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Lost</span>
                  <XCircle className="w-4 h-4 text-slate-400" />
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900">
                    {reportData.leadFollowupsReport.lost}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">Lost to competitor / budget</p>
                </div>
              </div>

              {/* 11. Total Calls Done */}
              <div className="p-4 rounded-2xl border border-[#0B1F33]/20 bg-[#0B1F33] text-white flex flex-col justify-between shadow-sm">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#C9A24D]">Total Calls Done</span>
                  <TrendingUp className="w-4 h-4 text-[#C9A24D]" />
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-bold font-mono text-white">
                    {reportData.leadFollowupsReport.totalCallsDone}
                  </span>
                  <p className="text-[10px] text-slate-300 mt-0.5" title="Logged client interactions/outcomes across all follow-up stages, not independently verified telephone calls">
                    Logged client interactions/outcomes
                  </p>
                </div>
              </div>

            </div>
          </section>

        </main>
      )}

    </div>
  );
}
