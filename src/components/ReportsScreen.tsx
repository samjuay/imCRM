import React, { useState, useEffect } from 'react';
import { useAppStore } from '../lib/store';
import { 
  BarChart3, Calendar, CheckSquare, ClipboardList, TrendingUp, 
  Users, DollarSign, ArrowDownWideNarrow, Percent, MapPin, Clock,
  PhoneCall, PhoneIncoming, Compass, CheckCircle2, Search, ExternalLink,
  ChevronRight, RefreshCw
} from 'lucide-react';
import EmptyState from './EmptyState';
import SkeletonLoader from './SkeletonLoader';
import BottomDrawer from './BottomDrawer';

export default function ReportsScreen() {
  const { 
    activeUser, 
    setActiveLeadId, 
    setActiveTab 
  } = useAppStore();

  const [preset, setPreset] = useState<'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom'>('this_month');
  const [reportData, setReportData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Custom date range state
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Drill-down drawer state
  const [selectedKpi, setSelectedKpi] = useState<string | null>(null);
  const [drawerTitle, setDrawerTitle] = useState('');
  const [kpiLeads, setKpiLeads] = useState<any[]>([]);
  const [loadingKpiLeads, setLoadingKpiLeads] = useState(false);
  const [drawerSearchQuery, setDrawerSearchQuery] = useState('');

  // Fetch report data
  const getReports = async () => {
    if (!activeUser) return;
    setLoading(true);
    try {
      let url = `/api/reports?preset=${preset}&userId=${activeUser.id}&companyId=${activeUser.company_id}`;
      if (preset === 'custom') {
        url += `&start=${customStartDate}&end=${customEndDate}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const body = await res.json();
        setReportData(body);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getReports();
  }, [preset, customStartDate, customEndDate, activeUser]);

  // Handle KPI card click -> opens drill-down drawer
  const handleKpiClick = (kpiKey: string, title: string) => {
    setSelectedKpi(kpiKey);
    setDrawerTitle(title);
    setDrawerSearchQuery('');
    
    // Fetch directly from cached/loaded report data in state - 100% synchronous & instant!
    const cachedLeads = reportData?.kpiLeads?.[kpiKey] || reportData?.report?.kpiLeads?.[kpiKey] || [];
    setKpiLeads(cachedLeads);
  };

  // Handle team member click -> drill down on their leads
  const handleMemberClick = (member: any) => {
    const allKpiLeads = reportData?.kpiLeads || reportData?.report?.kpiLeads || {};
    const uniqueLeadsMap = new Map<string, any>();
    
    Object.values(allKpiLeads).forEach((leadsList: any) => {
      if (Array.isArray(leadsList)) {
        leadsList.forEach((lead: any) => {
          if (lead && lead.assigned_to === member.id) {
            uniqueLeadsMap.set(lead.id, lead);
          }
        });
      }
    });
    
    const memberLeads = Array.from(uniqueLeadsMap.values());
    setKpiLeads(memberLeads);
    setSelectedKpi(`member_${member.id}`);
    setDrawerTitle(`${member.fullName}'s Leads`);
    setDrawerSearchQuery('');
  };

  // Helper to determine performance health
  const getPerformanceHealth = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    if (score >= 60) return { label: 'Good', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
    if (score >= 40) return { label: 'Average', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    if (score >= 20) return { label: 'Needs Attention', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' };
    return { label: 'Critical', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' };
  };

  // Helper to determine forecast status
  const getForecastStatus = (estimatedValueAtEnd: number, score: number) => {
    if (score >= 100) return { label: 'Target Achieved', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    if (estimatedValueAtEnd >= 100) return { label: 'Ahead of Target', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    if (estimatedValueAtEnd >= 80) return { label: 'On Track', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
    if (estimatedValueAtEnd >= 50) return { label: 'Slightly Behind', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    return { label: 'Critical', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' };
  };

  // Helper to compute remaining days in the month
  const getRemainingDays = () => {
    const today = new Date();
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const diffTime = endOfMonth.getTime() - today.getTime();
    const remainingDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
    return remainingDays;
  };

  if (loading || !reportData) {
    return (
      <div className="space-y-6">
        <SkeletonLoader type="stats" />
      </div>
    );
  }

  // Calculate Conversion ratios
  const conversionRate = reportData.totals.leads > 0 
    ? ((reportData.totals.bookingsDone / reportData.totals.leads) * 100).toFixed(1) 
    : '0';

  const siteVisitRatio = reportData.totals.siteVisitsScheduled > 0 
    ? ((reportData.totals.siteVisitsVisited / reportData.totals.siteVisitsScheduled) * 100).toFixed(0) 
    : '0';

  const signupConversionRatios = {
    contacted: reportData.totals.leads > 0 ? ((reportData.funnel.contacted / reportData.totals.leads) * 100).toFixed(0) : '0',
    siteVisited: reportData.totals.leads > 0 ? ((reportData.funnel.siteVisitVisited / reportData.totals.leads) * 100).toFixed(0) : '0',
    booked: reportData.totals.leads > 0 ? ((reportData.funnel.booked / reportData.totals.leads) * 100).toFixed(0) : '0'
  };

  const summary = reportData.report.summary || {};

  // Define KPI Cards details
  const kpiCardsConfig = [
    {
      key: 'calls_attempted',
      title: 'Calls Attempted',
      value: summary.callsAttempted || 0,
      description: 'Total ringing & dialout attempts recorded',
      icon: PhoneCall,
      colorClass: 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100/50',
      iconBg: 'bg-indigo-100 text-indigo-700'
    },
    {
      key: 'calls_connected',
      title: 'Calls Connected',
      value: summary.callsConnected || 0,
      description: 'Answered conversations & requirement profiles',
      icon: PhoneIncoming,
      colorClass: 'bg-sky-50 text-sky-700 border-sky-100 hover:bg-sky-100/50',
      iconBg: 'bg-sky-100 text-sky-700'
    },
    {
      key: 'followups_planned',
      title: 'Followups Planned',
      value: summary.followupsPlanned || 0,
      description: 'Scheduled callback appointments & updates',
      icon: Clock,
      colorClass: 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100/50',
      iconBg: 'bg-amber-100 text-amber-700'
    },
    {
      key: 'followups_completed',
      title: 'Followups Completed',
      value: summary.followupsCompleted || 0,
      description: 'Logged callback results & warm nurturing',
      icon: CheckCircle2,
      colorClass: 'bg-green-50 text-green-700 border-green-100 hover:bg-green-100/50',
      iconBg: 'bg-green-100 text-green-700'
    },
    {
      key: 'site_visits_planned',
      title: 'Site Visits Planned',
      value: summary.siteVisitsPlanned || 0,
      description: 'Site tours scheduled with interested buyers',
      icon: MapPin,
      colorClass: 'bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100/50',
      iconBg: 'bg-purple-100 text-purple-700'
    },
    {
      key: 'site_visits_completed',
      title: 'Site Visits Completed',
      value: summary.siteVisitsCompleted || 0,
      description: 'Actual physical site walks completed',
      icon: Compass,
      colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100/50',
      iconBg: 'bg-emerald-100 text-emerald-700'
    },
    {
      key: 'bookings',
      title: 'Bookings',
      value: summary.bookings || 0,
      description: 'Tokens collected & apartment units booked',
      icon: DollarSign,
      colorClass: 'bg-teal-50 text-teal-700 border-teal-100 hover:bg-teal-100/50',
      iconBg: 'bg-teal-100 text-teal-700'
    }
  ];

  // Filter lead list inside drawer
  const filteredKpiLeads = kpiLeads.filter(lead => {
    if (!lead) return false;
    const query = drawerSearchQuery.toLowerCase();
    const name = (lead.full_name || '').toLowerCase();
    const phone = (lead.phone || '').toLowerCase();
    const city = (lead.city || '').toLowerCase();
    const loc = (lead.location || '').toLowerCase();
    return name.includes(query) || phone.includes(query) || city.includes(query) || loc.includes(query);
  });

  // --- PHASE 3: LIVE KPI & TARGET CALCULATIONS ---
  const isTL = reportData?.report?.kpiJustification?.role === 'team_leader';
  const numMembers = isTL ? (reportData?.report?.kpiJustification?.teamMembers?.length || 4) : 1;

  // Standard targets based on role size
  const targetMonthlySalary = reportData?.report?.kpiJustification?.monthlySalaryTarget || (isTL ? 100000 : 50000);
  const targetSalesValue = isTL ? 40000000 : 10000000; // 4 Crore for TL team vs 1 Crore for single SE
  const targetVisitsCompleted = 15 * numMembers;
  const targetVisitsPlanned = 20 * numMembers;
  const targetBookings = 2 * numMembers;

  const scoreValue = reportData?.report?.kpiJustification?.score || 0;
  const remainingKPIValue = reportData?.report?.kpiJustification?.remainingKPI || (100 - scoreValue);

  // Current performance values from KPI justification
  const currentVisitsCompleted = reportData?.report?.kpiJustification?.visitsCompleted || 0;
  const currentVisitsPlanned = reportData?.report?.kpiJustification?.visitsPlanned || 0;
  const currentBookings = reportData?.report?.kpiJustification?.bookingsCount || 0;
  const currentRevenue = reportData?.report?.kpiJustification?.revenueGenerated || 0;

  // Remaining effort required
  const remainingVisitsCompleted = Math.max(0, targetVisitsCompleted - currentVisitsCompleted);
  const remainingVisitsPlanned = Math.max(0, targetVisitsPlanned - currentVisitsPlanned);
  const remainingBookings = Math.max(0, targetBookings - currentBookings);
  const remainingSalesValue = Math.max(0, targetSalesValue - currentRevenue);

  // Forecast pacing
  const estimatedValueAtEnd = reportData?.report?.kpiJustification?.estimatedValueAtEnd || scoreValue;
  const forecastStatus = getForecastStatus(estimatedValueAtEnd, scoreValue);
  const likelyDate = reportData?.report?.kpiJustification?.estimatedDate || 'End of Month';

  // Suggested daily efforts
  const remainingDays = getRemainingDays();
  const dailyPlanned = Math.max(1, Math.ceil(remainingVisitsPlanned / remainingDays));
  const dailyCompleted = Math.max(1, Math.ceil(remainingVisitsCompleted / remainingDays));
  
  // Total calls connected monthly target: 150 per SE
  const targetCallsConnected = 150 * numMembers;
  const currentCallsConnected = reportData?.report?.summary?.callsConnected || 0;
  const remainingCallsConnected = Math.max(0, targetCallsConnected - currentCallsConnected);
  const dailyConnected = Math.max(5, Math.ceil(remainingCallsConnected / remainingDays));

  // Total calls attempted monthly target: 350 per SE
  const targetCallsAttempted = 350 * numMembers;
  const currentCallsAttempted = reportData?.report?.summary?.callsAttempted || 0;
  const remainingCallsAttempted = Math.max(0, targetCallsAttempted - currentCallsAttempted);
  const dailyAttempted = Math.max(10, Math.ceil(remainingCallsAttempted / remainingDays));

  return (
    <div className="flex flex-col select-none pb-28 text-left space-y-6" id="reports_screen">
      
      {/* 1. PRESET TIMEFRAME SELECTOR */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100 shadow-inner w-full md:w-auto">
          {(['today', 'yesterday', 'this_week', 'this_month', 'custom'] as const).map((time) => (
            <button
              key={time}
              onClick={() => setPreset(time)}
              className={`flex-1 md:flex-none px-4 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all ${
                preset === time 
                  ? 'bg-[#0B1F33] text-[#C9A24D] shadow-md' 
                  : 'text-slate-500 hover:text-[#0B1F33]'
              }`}
            >
              {time.replace('_', ' ')}
            </button>
          ))}
        </div>

        <button 
          onClick={getReports}
          className="neu-button flex items-center space-x-2 border border-slate-200 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sync Reports</span>
        </button>
      </div>

      {/* Custom range selector */}
      {preset === 'custom' && (
        <div className="p-4 bg-white border border-slate-200 rounded-3xl flex flex-col sm:flex-row gap-4 items-end shadow-sm animate-fade-in">
          <div className="space-y-1 w-full sm:w-auto">
            <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Report Start Date
            </label>
            <input 
              type="date" 
              value={customStartDate} 
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="w-full sm:w-44 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-400 focus:outline-none bg-slate-50 text-slate-800 font-medium"
            />
          </div>
          <div className="space-y-1 w-full sm:w-auto">
            <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Report End Date
            </label>
            <input 
              type="date" 
              value={customEndDate} 
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="w-full sm:w-44 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-400 focus:outline-none bg-slate-50 text-slate-800 font-medium"
            />
          </div>
        </div>
      )}

      {/* 2. CORE PERFORMANCE METRICS BANNER GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Metric A: Total Leads pipeline */}
        <div className="neu-flat p-5 bg-white border border-slate-200 flex flex-col justify-between h-32 rounded-[24px]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-display">Active Leads Volume</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-display font-bold text-slate-950 tracking-tight block">
              {reportData.totals.leads}
            </span>
            <span className="text-[9px] uppercase font-bold text-slate-400 font-display mt-0.5 block">Total Leads In Scope</span>
          </div>
        </div>

        {/* Metric B: Revenue booked (Page 19 total price formula) */}
        <div className="neu-flat p-5 bg-white border border-slate-200 flex flex-col justify-between h-32 rounded-[24px]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-display">Estimated Sales Value</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-display font-bold text-emerald-600 tracking-tight block">
              ₹{(reportData.totals.totalRevenueEstimate / 10000000).toFixed(2)} Cr
            </span>
            <span className="text-[9px] uppercase font-bold text-slate-400 font-display mt-0.5 block">Based on Booked Units</span>
          </div>
        </div>
      </div>

      {/* KPI JUSTIFICATION BOARD */}
      {reportData?.report?.kpiJustification && (
        <div className="bg-slate-900 text-slate-100 rounded-[28px] p-6 border border-slate-800 shadow-xl space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-md text-[10px] font-bold uppercase tracking-wider">
                  Internal KPI Justification
                </span>
                <span className="text-xs text-slate-400 font-medium">({preset === 'custom' ? 'Selected Range' : preset.replace('_', ' ')})</span>
              </div>
              <h2 className="text-lg font-bold font-display text-white mt-1">
                {isTL ? 'Team Performance Audit' : 'Salary & Target Justification'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Pacing Score:</span>
              <span className={`px-3 py-1 border rounded-full text-xs font-bold font-mono ${getPerformanceHealth(scoreValue).color}`}>
                {reportData.report.kpiJustification.performanceRank}
              </span>
            </div>
          </div>

          {/* SECTION 1: LIVE TARGET PROGRESS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Target Card with basic and sales targets */}
            <div className="bg-slate-950/50 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">
                  {isTL ? 'Team Salary Target' : 'Monthly Salary Target'}
                </span>
                <p className="text-2xl font-display font-bold text-white mt-1">
                  ₹{targetMonthlySalary.toLocaleString('en-IN')} / Mo
                </p>
              </div>
              
              <div className="space-y-3 border-t border-slate-800/80 pt-4">
                <div>
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono">Achievement %</span>
                  <p className="text-lg font-bold text-yellow-500 font-mono mt-0.5">
                    {scoreValue}%
                  </p>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono">Remaining KPI %</span>
                  <p className="text-lg font-bold text-slate-300 font-mono mt-0.5">
                    {remainingKPIValue}%
                  </p>
                </div>
              </div>
            </div>

            {/* Live Target Progress & Remaining Work Dashboard */}
            <div className="bg-slate-950/50 p-5 rounded-2xl border border-slate-800 lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-display flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-yellow-500" />
                  <span>Live Target Progress (Remaining Work)</span>
                </h4>
                <span className="text-[9px] text-slate-500 font-mono font-bold uppercase">Auto-Calculated</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex flex-col justify-between">
                  <span className="text-[9px] text-slate-400 font-bold uppercase font-mono">Site Visits Done</span>
                  <div className="my-2">
                    <p className="text-lg font-bold text-white leading-none">{currentVisitsCompleted} / {targetVisitsCompleted}</p>
                    <div className="w-full bg-slate-800 h-1 rounded-full mt-1.5 overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, (currentVisitsCompleted / targetVisitsCompleted) * 100)}%` }} />
                    </div>
                  </div>
                  <span className="text-[9px] text-slate-500 font-semibold font-mono">Remaining Req: <strong className="text-emerald-400">{remainingVisitsCompleted}</strong></span>
                </div>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex flex-col justify-between">
                  <span className="text-[9px] text-slate-400 font-bold uppercase font-mono">Site Visits Planned</span>
                  <div className="my-2">
                    <p className="text-lg font-bold text-white leading-none">{currentVisitsPlanned} / {targetVisitsPlanned}</p>
                    <div className="w-full bg-slate-800 h-1 rounded-full mt-1.5 overflow-hidden">
                      <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${Math.min(100, (currentVisitsPlanned / targetVisitsPlanned) * 100)}%` }} />
                    </div>
                  </div>
                  <span className="text-[9px] text-slate-500 font-semibold font-mono">Remaining Req: <strong className="text-indigo-400">{remainingVisitsPlanned}</strong></span>
                </div>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex flex-col justify-between">
                  <span className="text-[9px] text-slate-400 font-bold uppercase font-mono">Bookings Done</span>
                  <div className="my-2">
                    <p className="text-lg font-bold text-white leading-none">{currentBookings} / {targetBookings}</p>
                    <div className="w-full bg-slate-800 h-1 rounded-full mt-1.5 overflow-hidden">
                      <div className="bg-yellow-500 h-full rounded-full" style={{ width: `${Math.min(100, (currentBookings / targetBookings) * 100)}%` }} />
                    </div>
                  </div>
                  <span className="text-[9px] text-slate-500 font-semibold font-mono">Remaining Req: <strong className="text-yellow-400">{remainingBookings}</strong></span>
                </div>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex flex-col justify-between">
                  <span className="text-[9px] text-slate-400 font-bold uppercase font-mono">Sales Value</span>
                  <div className="my-2">
                    <p className="text-xs font-bold text-white truncate leading-none">₹{(currentRevenue / 10000000).toFixed(2)} Cr</p>
                    <span className="text-[9px] text-slate-500">Target: ₹{(targetSalesValue / 10000000).toFixed(2)} Cr</span>
                  </div>
                  <span className="text-[9px] text-slate-500 font-semibold font-mono truncate">Remaining: <strong className="text-yellow-500">₹{(remainingSalesValue / 100000).toFixed(0)}L</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2 & 3: TARGET FORECAST & DAILY REQUIRED WORK */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pacing Forecast Card */}
            <div className="bg-slate-950/50 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-3">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-display flex items-center gap-2">
                  <Compass className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Pacing Target Forecast</span>
                </h4>
                <span className={`px-2 py-0.5 border rounded text-[9px] font-bold font-mono uppercase ${forecastStatus.color}`}>
                  {forecastStatus.label}
                </span>
              </div>

              <div className="py-2 space-y-3">
                <div>
                  <span className="text-[9px] text-slate-500 font-bold uppercase font-mono">Likely Completion Date</span>
                  <p className="text-base font-bold text-white mt-1">
                    {likelyDate}
                  </p>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 font-bold uppercase font-mono">Projected Monthly Score</span>
                  <p className="text-sm font-semibold text-slate-300 mt-1">
                    {Math.round(estimatedValueAtEnd)}% (Based on actual daily productivity)
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-800/80 pt-3">
                <p className="text-[10px] text-yellow-500/90 font-medium italic">
                  "{reportData.report.kpiJustification.motivationalStatus}"
                </p>
              </div>
            </div>

            {/* Daily Required Work */}
            <div className="bg-slate-950/50 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-3">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-display flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-[#C9A24D]" />
                  <span>Today's Suggested Target</span>
                </h4>
                <span className="text-[9px] text-slate-500 font-mono font-bold uppercase">Dynamic Adjust</span>
              </div>

              <div className="py-2 grid grid-cols-2 gap-3 text-xs">
                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 flex flex-col justify-center">
                  <span className="text-slate-400 font-medium text-[10px] uppercase font-mono">Site Visits Planned</span>
                  <span className="text-sm font-bold text-indigo-400 mt-1">• {dailyPlanned} Planned</span>
                </div>
                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 flex flex-col justify-center">
                  <span className="text-slate-400 font-medium text-[10px] uppercase font-mono">Site Visits Done</span>
                  <span className="text-sm font-bold text-emerald-400 mt-1">• {dailyCompleted} Completed</span>
                </div>
                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 flex flex-col justify-center">
                  <span className="text-slate-400 font-medium text-[10px] uppercase font-mono">Calls Connected</span>
                  <span className="text-sm font-bold text-sky-400 mt-1">• {dailyConnected} Connected</span>
                </div>
                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 flex flex-col justify-center">
                  <span className="text-slate-400 font-medium text-[10px] uppercase font-mono">Calls Attempted</span>
                  <span className="text-sm font-bold text-purple-400 mt-1">• {dailyAttempted} Attempted</span>
                </div>
              </div>

              <div className="border-t border-slate-800/80 pt-2 text-[10px] text-slate-500 text-center font-mono">
                Paced for remaining {remainingDays} days of active month
              </div>
            </div>
          </div>

          {/* SECTION 4: KPI CALCULATION BREAKDOWN */}
          <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-800/80 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-display flex items-center gap-2">
                <ClipboardList className="w-3.5 h-3.5 text-yellow-500" />
                <span>KPI Score Breakdown (Exact Calculation)</span>
              </h4>
              <span className="text-[9px] text-slate-500 font-mono font-bold uppercase">Weightages Applied</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {reportData.report.kpiJustification.details?.map((detail: any, idx: number) => (
                <div key={idx} className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex flex-col justify-between space-y-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 shrink-0" />
                    <span className="text-slate-300 font-medium">{detail.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] pl-3 font-mono">
                    <span className="text-slate-500">Value: <strong className="text-slate-300">{detail.value}</strong></span>
                    <span className="text-amber-500 font-bold">+{detail.contribution}%</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 flex flex-col sm:flex-row justify-between items-center gap-2 text-[11px] font-mono text-slate-400">
              <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center sm:justify-start">
                <span>• Completed Site Visit Weight: <strong>6.5% each</strong></span>
              </div>
              <div className="text-sm font-bold text-white flex items-center gap-1.5 border-t sm:border-t-0 border-slate-800 pt-2 sm:pt-0">
                <span>Total KPI Score</span>
                <span className="text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">={scoreValue}%</span>
              </div>
            </div>
          </div>

          {/* SECTION 5: TEAM LEADER VIEW */}
          {isTL && reportData.report.kpiJustification.teamMembers?.length > 0 && (
            <div className="space-y-4 border-t border-slate-800/80 pt-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-display">
                    Sales Executives Performance Under Your Team
                  </h3>
                </div>
                <span className="text-[10px] text-slate-400 font-semibold font-mono uppercase bg-slate-950/60 px-2.5 py-1 rounded border border-slate-800">
                  Click a card to instantly drill down their leads
                </span>
              </div>

              {/* Team Aggregates Mini Panel */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 bg-slate-950/30 rounded-2xl border border-slate-800/60 text-center">
                <div>
                  <span className="text-[9px] text-slate-500 font-bold uppercase font-mono">Team Monthly Target</span>
                  <p className="text-sm font-bold text-white mt-0.5">₹{targetMonthlySalary.toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 font-bold uppercase font-mono">Team Achievement %</span>
                  <p className="text-sm font-bold text-yellow-500 mt-0.5">{scoreValue}%</p>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 font-bold uppercase font-mono">Combined SV Planned</span>
                  <p className="text-sm font-bold text-indigo-400 mt-0.5">{currentVisitsPlanned}</p>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 font-bold uppercase font-mono">Combined SV Done</span>
                  <p className="text-sm font-bold text-emerald-400 mt-0.5">{currentVisitsCompleted}</p>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <span className="text-[9px] text-slate-500 font-bold uppercase font-mono">Combined Bookings</span>
                  <p className="text-sm font-bold text-amber-500 mt-0.5">{currentBookings} (₹{(currentRevenue / 10000000).toFixed(2)} Cr)</p>
                </div>
              </div>

              {/* Member Card Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {reportData.report.kpiJustification.teamMembers.map((member: any) => {
                  const mHealth = getPerformanceHealth(member.score);
                  return (
                    <div 
                      key={member.id} 
                      onClick={() => handleMemberClick(member)}
                      className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-3 hover:border-slate-600 transition-all cursor-pointer group"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          {member.avatarUrl ? (
                            <img src={member.avatarUrl} alt={member.fullName} className="w-8 h-8 rounded-full border border-slate-700" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 text-[10px] font-bold text-slate-300 font-display">
                              {member.fullName.charAt(0)}
                            </div>
                          )}
                          <div>
                            <h5 className="text-xs font-bold text-white group-hover:text-yellow-400 transition-colors">{member.fullName}</h5>
                            <span className={`inline-block text-[8px] font-bold px-1.5 py-0.5 rounded uppercase mt-0.5 ${mHealth.color}`}>
                              {mHealth.label}
                            </span>
                          </div>
                        </div>
                        <span className="text-sm font-bold font-mono text-yellow-500">{member.score}% KPI</span>
                      </div>

                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${Math.min(member.score, 100)}%` }} />
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-400 bg-slate-950/50 p-2 rounded-xl border border-slate-800/80 text-center font-mono">
                        <div>
                          <span className="text-slate-500 text-[8px] block uppercase">SV Planned</span>
                          <strong className="text-white text-xs">{member.visitsPlanned}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[8px] block uppercase">SV Done</span>
                          <strong className="text-emerald-400 text-xs">{member.visitsCompleted}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[8px] block uppercase">Bookings</span>
                          <strong className="text-yellow-500 text-xs">{member.bookingsCount}</strong>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[9px] text-slate-500 italic">
                        <span>"{member.motivationalStatus}"</span>
                        <span className="text-[8px] uppercase tracking-wider text-indigo-400 font-bold group-hover:underline">Drill leads →</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. DYNAMIC KPI ENGINE CARDS */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-[#C9A24D]" />
          <h3 className="text-xs font-bold text-[#0B1F33] uppercase tracking-wider font-display">
            Activity Tracking KPIs (Click to drill down leads)
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCardsConfig.map((card) => {
            const IconComponent = card.icon;
            return (
              <div 
                key={card.key}
                onClick={() => handleKpiClick(card.key, card.title)}
                className={`neu-flat p-4 bg-white border rounded-[24px] cursor-pointer transition-all hover:scale-[1.01] flex flex-col justify-between h-36 ${card.colorClass}`}
                style={{ contentVisibility: 'auto' }}
              >
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold uppercase tracking-wider font-display block leading-tight max-w-[80%]">
                    {card.title}
                  </span>
                  <div className={`p-1.5 rounded-lg border ${card.iconBg}`}>
                    <IconComponent className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div>
                  <span className="text-3xl font-display font-bold tracking-tight block">
                    {card.value}
                  </span>
                  <span className="text-[9px] font-medium text-slate-400 mt-1 block leading-normal">
                    {card.description}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. VISUAL CONVERSION FUNNEL (Page 19 stages) */}
      <div className="rounded-[24px] neu-flat bg-white p-5 border border-slate-200 space-y-4">
        <h3 className="text-xs font-bold text-[#0B1F33] uppercase tracking-wider font-display flex items-center space-x-1.5">
          <ArrowDownWideNarrow className="w-4 h-4 text-[#C9A24D]" />
          <span>Real Estate Conversion Funnel</span>
        </h3>

        <div className="space-y-4 pt-2 text-xs">
          {/* Stage 1: Registered */}
          <div className="space-y-1">
            <div className="flex justify-between font-semibold">
              <span className="text-slate-800">1. Registered Leads</span>
              <span className="text-slate-900 font-mono">{reportData.totals.leads} leads</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-slate-900" style={{ width: '100%' }} />
            </div>
          </div>

          {/* Stage 2: Contacted / Engaged */}
          <div className="space-y-1">
            <div className="flex justify-between font-semibold">
              <span className="text-slate-800">2. Contacted & Engaged</span>
              <span className="text-slate-600 font-mono">{reportData.funnel.contacted} ({signupConversionRatios.contacted}%)</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500" style={{ width: `${signupConversionRatios.contacted}%` }} />
            </div>
          </div>

          {/* Stage 3: Site visit walked */}
          <div className="space-y-1">
            <div className="flex justify-between font-semibold">
              <span className="text-slate-800">3. Site Tour Walked-In</span>
              <span className="text-slate-600 font-mono">{reportData.funnel.siteVisitVisited} ({signupConversionRatios.siteVisited}%)</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500" style={{ width: `${signupConversionRatios.siteVisited}%` }} />
            </div>
          </div>

          {/* Stage 4: Unit Booked */}
          <div className="space-y-1">
            <div className="flex justify-between font-semibold">
              <span className="text-slate-800">4. Blocked & Final Bookings</span>
              <span className="text-emerald-600 font-mono">{reportData.funnel.booked} ({signupConversionRatios.booked}%)</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${signupConversionRatios.booked}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* 5. PERFORMANCE RATIOS AND SITE TOURS (Page 19) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Site Tour conversion ratio scale */}
        <div className="neu-flat p-5 bg-white border border-slate-200 rounded-[24px] space-y-2.5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-display">Tours host ratio</p>
          <div className="flex justify-between items-end">
            <span className="text-3xl font-bold text-blue-600 font-display">{siteVisitRatio}%</span>
            <MapPin className="w-6 h-6 text-blue-400 shrink-0 mb-1" />
          </div>
          <p className="text-[10px] text-slate-500 leading-normal font-sans">
            Completed site tour walks against scheduled bookings in this range.
          </p>
        </div>

        {/* Sales ratio scale */}
        <div className="neu-flat p-5 bg-white border border-slate-200 rounded-[24px] space-y-2.5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-display">Total Booking Ratio</p>
          <div className="flex justify-between items-end">
            <span className="text-3xl font-bold text-emerald-600 font-display">{conversionRate}%</span>
            <TrendingUp className="w-6 h-6 text-emerald-400 shrink-0 mb-1" />
          </div>
          <p className="text-[10px] text-slate-500 leading-normal font-sans">
            Overall lead conversion score across selected preset time frames.
          </p>
        </div>
      </div>

      {/* DRILL-DOWN DRAWER DETAIL */}
      <BottomDrawer
        isOpen={selectedKpi !== null}
        onClose={() => setSelectedKpi(null)}
        title={`${drawerTitle} Leads`}
      >
        <div className="space-y-4">
          {/* Quick search input */}
          <div className="relative">
            <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Filter leads in this KPI by name, phone, or location..."
              value={drawerSearchQuery}
              onChange={(e) => setDrawerSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium placeholder-slate-400 text-slate-900"
            />
          </div>

          {loadingKpiLeads ? (
            <div className="p-12 flex flex-col items-center justify-center space-y-2">
              <div className="w-6 h-6 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Loading drill-down leads...</p>
            </div>
          ) : filteredKpiLeads.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No matching leads found for this KPI with current filter search.
            </div>
          ) : (
            <div className="space-y-2 max-h-[50vh] overflow-y-auto custom-scroll pr-1 pb-4">
              {filteredKpiLeads.map((lead: any) => (
                <div 
                  key={lead.id}
                  className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-3 hover:bg-slate-100/50 transition-colors"
                >
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{lead.full_name}</h4>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{lead.phone}</p>
                    <div className="flex gap-2 mt-1">
                      {lead.city && (
                        <span className="text-[9px] font-semibold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                          {lead.city}
                        </span>
                      )}
                      {lead.status && (
                        <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
                          {lead.status}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedKpi(null);
                      setActiveLeadId(lead.id);
                      setActiveTab('leads');
                    }}
                    className="self-end sm:self-auto flex items-center space-x-1 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-800 text-slate-700 hover:text-slate-900 font-bold text-[10px] rounded-xl transition-all cursor-pointer"
                  >
                    <span>Inspect Profile</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </BottomDrawer>

    </div>
  );
}
