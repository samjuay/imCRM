/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../lib/store';
import { UserRole, LeadStatus, SiteVisitStatus } from '../types';
import { 
  AlertCircle, AlertTriangle, Calendar, CalendarRange, MapPin, 
  PhoneOff, PhoneCall, Search, ClipboardList, CheckCircle2, Navigation, MessageSquare,
  User, ExternalLink
} from 'lucide-react';
import BottomDrawer from './BottomDrawer';
import EmptyState from './EmptyState';
import SkeletonLoader from './SkeletonLoader';

const STATUS_OUTCOMES: Record<LeadStatus, string[]> = {
  [LeadStatus.NEW]: ['Fresh Lead Allocated', 'Details Shared on WhatsApp'],
  [LeadStatus.ATTEMPTED]: ['No Answer / Busy', 'Ringing No Response', 'Switch Off', 'Callback Requested'],
  [LeadStatus.CONNECTED]: ['Introduction Spoke to Client', 'Requirements Profiled', 'Callback Scheduled'],
  [LeadStatus.FOLLOWUP_SCHEDULED]: ['Warm Follow-up Callback', 'Details Shared', 'Rescheduled Call'],
  [LeadStatus.INTERESTED]: ['Walk-In Tour Scheduled', 'Pricing Finalization', 'Brochures Shared'],
  [LeadStatus.SITE_VISIT_SCHEDULED]: ['Confirmed Tour Details', 'Awaiting Client Walk-In'],
  [LeadStatus.SITE_VISIT_DONE]: ['Property Checked / Liked', 'Price Negotiation Initiated', 'No Show Feedback', 'Awaiting Action'],
  [LeadStatus.NEGOTIATION]: ['Discount Offered', 'Payment Terms Shared', 'Finalizing Booking details'],
  [LeadStatus.BOOKING_DONE]: ['Token Received', 'App Form Signed', 'Unit Block Confirmed'],
  [LeadStatus.NOT_INTERESTED]: ['High Budget Mismatch', 'Location Not Suitable', 'Junk Spam Lead'],
  [LeadStatus.LOST]: ['Lost to Competition', 'Indefinite Postponement'],
  [LeadStatus.INVALID]: ['Wrong Number / Not Reachable', 'Duplicate Lead Profile']
};

const LOST_REASONS = [
  'Out of Budget',
  'Location Disliked',
  'Purchased Competitor Project',
  'Lost Contact / No Response',
  'Purchase Postponed',
  'Other'
];

const INVALID_REASONS = [
  'Wrong Number / Not Reachable',
  'Duplicate Profile',
  'Fake Lead / Junk Details',
  'Agent / Broker Outreach',
  'Other'
];

export default function DashboardScreen() {
  const { 
    activeUser, 
    stats, 
    fetchStats, 
    leads, 
    fetchLeads,
    completeFollowup,
    updateSiteVisitStatus,
    scheduleFollowup,
    updateLeadStatus,
    offlineMode,
    projects,
    fetchProjects,
    setActiveTab,
    darkMode,
    activeDrawerCard,
    setActiveDrawerCard,
    setActiveLeadId
  } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const [drawerDataList, setDrawerDataList] = useState<any[]>([]);
  const [isLoadingDrawer, setIsLoadingDrawer] = useState(false);

  // Mark followup done states
  const [completingFollowupId, setCompletingFollowupId] = useState<string | null>(null);
  const [outcomeNotes, setOutcomeNotes] = useState('');

  // Site visit feedback details
  const [completingVisitId, setCompletingVisitId] = useState<string | null>(null);
  const [visitFeedback, setVisitFeedback] = useState('');

  // Inline dynamic lead status update states
  const [selectedLeadForStatusUpdate, setSelectedLeadForStatusUpdate] = useState<any | null>(null);
  const [newStatusValue, setNewStatusValue] = useState<string>('');
  const [statusChangeNotes, setStatusChangeNotes] = useState<string>('');
  const [quickBookingVal, setQuickBookingVal] = useState<string>('75000');
  const [quickFollowupDate, setQuickFollowupDate] = useState<string>('');
  const [quickOutcome, setQuickOutcome] = useState<string>('');
  const [quickLostReason, setQuickLostReason] = useState<string>('');
  const [quickInvalidReason, setQuickInvalidReason] = useState<string>('');
  
  const [quickVisitProjectId, setQuickVisitProjectId] = useState<string>('');
  const [quickVisitDate, setQuickVisitDate] = useState<string>('');
  const [quickVisitTime, setQuickVisitTime] = useState<string>('12:00');
  const [quickVisitVisitors, setQuickVisitVisitors] = useState<string>('1');
  const [quickVisitTransport, setQuickVisitTransport] = useState<boolean>(false);

  useEffect(() => {
    fetchStats();
    fetchProjects();
  }, [activeUser]);

  if (!activeUser) return <SkeletonLoader type="stats" />;

  const userRole = activeUser.role;

  // Rules from Page 10 for Dashboard Role Visibility
  const showSiteVisits = true;

  const smartCards = [
    {
      id: 'leadsWithoutFollowup',
      title: 'Leads Without Followup',
      description: 'Active leads with no scheduled callback',
      count: stats?.leadsWithoutFollowup ?? 0,
      icon: PhoneOff,
      colorClass: 'text-danger bg-red-50 border-red-100',
      visible: true
    },
    {
      id: 'followupsDueToday',
      title: 'Followups Due Today',
      description: 'Call scheduled for today',
      count: stats?.followupsDueToday ?? 0,
      icon: AlertCircle,
      colorClass: 'text-warning bg-amber-50 border-amber-100',
      visible: true
    },
    {
      id: 'overdueFollowups',
      title: 'Overdue Followups',
      description: 'Missed scheduled callbacks',
      count: stats?.overdueFollowups ?? 0,
      icon: AlertTriangle,
      colorClass: 'text-rose-600 bg-rose-50 border-rose-100',
      visible: true
    },
    {
      id: 'upcomingFollowups',
      title: 'Upcoming Followups',
      description: 'Follow-ups in the next 7 days',
      count: stats?.upcomingFollowups ?? 0,
      icon: CalendarRange,
      colorClass: 'text-primary-navy bg-slate-50 border-slate-100',
      visible: true
    },
    {
      id: 'siteVisitsToday',
      title: 'Site Visits Today',
      description: 'Physical property tours today',
      count: stats?.siteVisitsToday ?? 0,
      icon: MapPin,
      colorClass: 'text-info bg-blue-50 border-blue-100',
      visible: showSiteVisits
    },
    {
      id: 'upcomingSiteVisits',
      title: 'Upcoming Site Visits',
      description: 'Project site visits next 7 days',
      count: stats?.upcomingSiteVisits ?? 0,
      icon: Calendar,
      colorClass: 'text-premium-gold bg-amber-50/50 border-amber-100/50',
      visible: showSiteVisits
    }
  ];

  const handleCardClick = async (cardId: string) => {
    setActiveDrawerCard(cardId);
    setIsLoadingDrawer(true);
    setSearchQuery('');
    
    try {
      const companyId = activeUser.company_id;
      const uId = activeUser.id;
      const res = await fetch(`/api/dashboard/card-leads?cardId=${cardId}&userId=${uId}&role=${userRole}&companyId=${companyId}`);
      if (res.ok) {
        const body = await res.json();
        setDrawerDataList(body.list || []);
      } else {
        setDrawerDataList([]);
      }
    } catch (e) {
      console.error("Dashboard card detail loading error:", e);
      setDrawerDataList([]);
    } finally {
      setIsLoadingDrawer(false);
    }
  };

  useEffect(() => {
    if (activeDrawerCard) {
      handleCardClick(activeDrawerCard);
    }
  }, [activeUser]);

  const getFilteredDrawerList = () => {
    let list = [...drawerDataList];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      list = list.filter(item => {
        const name = (item.full_name || item.leadName || '').toLowerCase();
        const phone = (item.phone || item.leadPhone || '').toLowerCase();
        return name.includes(query) || phone.includes(query);
      });
    }

    if (sortBy === 'name') {
      list.sort((a,b) => {
        const nameA = (a.full_name || a.leadName || '').toLowerCase();
        const nameB = (b.full_name || b.leadName || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
    } else {
      // Date sort (by schedule time or creation timestamp)
      list.sort((a,b) => {
        const dateA = a.scheduled_at || a.scheduled_date || a.created_at || '';
        const dateB = b.scheduled_at || b.scheduled_date || b.created_at || '';
        return new Date(dateA).getTime() - new Date(dateB).getTime();
      });
    }

    return list;
  };

  const executeCall = (phoneNum: string) => {
    window.location.href = `tel:${phoneNum}`;
  };

  const executeWhatsApp = (phoneNum: string, message = 'Hello from ImCRM') => {
    const formatted = phoneNum.replace(/\D/g, '');
    window.location.href = `https://wa.me/${formatted}?text=${encodeURIComponent(message)}`;
  };

  const submitMarkFollowupDone = async () => {
    if (!completingFollowupId) return;
    const ok = await completeFollowup(completingFollowupId, outcomeNotes || 'Follow-up call completed successfully.');
    if (ok) {
      setCompletingFollowupId(null);
      setOutcomeNotes('');
      fetchStats();
      if (activeDrawerCard) handleCardClick(activeDrawerCard);
    }
  };

  const submitVisitVisited = async () => {
    if (!completingVisitId) return;
    const ok = await updateSiteVisitStatus(completingVisitId, SiteVisitStatus.VISITED, visitFeedback || 'Completed with positive review.');
    if (ok) {
      setCompletingVisitId(null);
      setVisitFeedback('');
      fetchStats();
      if (activeDrawerCard) handleCardClick(activeDrawerCard);
    }
  };

  const submitVisitCancel = async (id: string) => {
    const ok = await updateSiteVisitStatus(id, SiteVisitStatus.CANCELLED, 'Visit cancelled by consumer.');
    if (ok) {
      fetchStats();
      if (activeDrawerCard) handleCardClick(activeDrawerCard);
    }
  };

  const submitLeaderboardStatus = async () => {
    if (!selectedLeadForStatusUpdate) return;
    
    // In followups and site visits, selectedLeadForStatusUpdate.lead_id is the actual lead's ID.
    // In lead cards, selectedLeadForStatusUpdate.id is the lead's ID.
    const leadId = selectedLeadForStatusUpdate.lead_id || selectedLeadForStatusUpdate.id || selectedLeadForStatusUpdate.leadId;
    if (!leadId) return;

    const status = newStatusValue;
    const outcome = quickOutcome;
    const lostReason = quickLostReason;
    const invalidReason = quickInvalidReason;
    const notes = statusChangeNotes;
    const bookingAmount = Number(quickBookingVal) || 0;

    if (!status) {
      alert('Please select a target status.');
      return;
    }
    if (!outcome) {
      alert('Outcome selection is mandatory.');
      return;
    }
    if (status === LeadStatus.LOST && !lostReason) {
      alert('Please specify lost reason.');
      return;
    }
    if (status === LeadStatus.INVALID && !invalidReason) {
      alert('Please specify invalid reason.');
      return;
    }
    if (!notes.trim()) {
      alert('Status transition notes are mandatory.');
      return;
    }

    // Build unified rich transition notes for DB compatibility
    let richNotes = `Outcome: ${outcome}`;
    if (status === LeadStatus.LOST && lostReason) {
      richNotes += ` | Lost Reason: ${lostReason}`;
    } else if (status === LeadStatus.INVALID && invalidReason) {
      richNotes += ` | Invalid Reason: ${invalidReason}`;
    }
    richNotes += ` | Remarks: ${notes.trim()}`;

    // Exempted statuses: NEW, NOT_INTERESTED, LOST, booking done (won), INVALID
    const isExempted = [
      LeadStatus.NEW,
      LeadStatus.NOT_INTERESTED,
      LeadStatus.LOST,
      LeadStatus.BOOKING_DONE,
      LeadStatus.INVALID
    ].includes(status as LeadStatus);

    let followupPayload = undefined;
    if (!isExempted && status !== LeadStatus.SITE_VISIT_SCHEDULED) {
      if (!quickFollowupDate) {
        alert('Please select a valid follow-up date and time. CRM purpose requires a future follow-up for this status.');
        return;
      }
      followupPayload = {
        scheduled_at: quickFollowupDate,
        type: 'Call',
        notes: `Scheduled during dashboard ${status} status update.`
      };
    }

    let visitPayload = undefined;
    if (status === LeadStatus.SITE_VISIT_SCHEDULED) {
      if (!quickVisitProjectId || !quickVisitDate) {
        alert('Site visit Project interest and scheduled date are mandatory.');
        return;
      }
      visitPayload = {
        project_id: quickVisitProjectId,
        scheduled_date: quickVisitDate,
        scheduled_time: quickVisitTime,
        visitors_count: Number(quickVisitVisitors) || 1,
        transport_arranged: quickVisitTransport
      };
    }

    if (status === LeadStatus.BOOKING_DONE) {
      if (bookingAmount <= 0) {
        alert('Please enter a valid positive down-payment booking amount.');
        return;
      }
    }

    const ok = await updateLeadStatus(
      leadId,
      status,
      richNotes,
      bookingAmount,
      followupPayload,
      visitPayload
    );

    if (ok) {
      setSelectedLeadForStatusUpdate(null);
      setStatusChangeNotes('');
      setQuickOutcome('');
      setQuickLostReason('');
      setQuickInvalidReason('');
      setQuickFollowupDate('');
      setQuickVisitProjectId('');
      setQuickVisitDate('');
      setQuickVisitTime('12:00');
      setQuickVisitVisitors('1');
      setQuickVisitTransport(false);
      
      fetchStats();
      if (activeDrawerCard) handleCardClick(activeDrawerCard);
    } else {
      alert('Transition failed. Please check mandatory fields.');
    }
  };

  const filteredList = getFilteredDrawerList();

  return (
    <div className="flex flex-col space-y-5 select-none scroll-smooth pb-28">
      {/* Daily Performance Pitch banner */}
      <div className={`rounded-[24px] neu-flat p-5 flex items-center justify-between border border-border-color relative overflow-hidden ${darkMode ? 'bg-gradient-to-br from-[#101B2B] to-[#0D1622]' : 'bg-gradient-to-br from-white to-slate-50'}`}>
        <div className="space-y-1 relative z-10">
          <p className="text-[10px] uppercase font-bold text-premium-gold tracking-widest font-display">Command Center</p>
          <h2 className="text-base font-display font-bold text-primary-navy tracking-tight">
            Greetings, {activeUser.full_name}!
          </h2>
          <p className="text-[11px] text-text-secondary pr-6 leading-normal">
            Your task force is fully synched. Touch any smart metrics card to coordinate today&apos;s field work.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 text-slate-100 opacity-20 -mr-4 pointer-events-none">
          <ClipboardList className="w-32 h-32" />
        </div>
      </div>

      {/* Admin Diagnostics Panel (Phase 6 Database Visibility) */}
      {userRole === UserRole.COMPANY_ADMIN && (
        <div className="bg-white border border-slate-200 p-6 rounded-[24px] shadow-sm space-y-4" id="admin_diagnostics_panel">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h3 className="font-display font-medium text-slate-900 text-sm">Enterprise Diagnostics Panel</h3>
              <p className="text-xs text-slate-500">Real-time database records volume & directory shortcuts.</p>
            </div>
            <span className="px-2 py-1 bg-violet-50 text-violet-700 text-[10px] font-bold uppercase rounded-lg">Systems Connected</span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div 
              onClick={() => { setActiveTab('leads'); }}
              className="p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-slate-100 transition-colors cursor-pointer group"
            >
              <div className="text-[10px] font-bold text-slate-400 uppercase">Total Leads</div>
              <div className="text-2xl font-display font-medium text-slate-900 mt-1">{stats?.totalLeads ?? 0}</div>
              <span className="text-[9px] text-violet-600 font-bold group-hover:underline mt-2 inline-block">Go to Pipeline &rarr;</span>
            </div>

            <div 
              onClick={() => { setActiveTab('reports'); }}
              className="p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-slate-100 transition-colors cursor-pointer group"
            >
              <div className="text-[10px] font-bold text-slate-400 uppercase">Total Users</div>
              <div className="text-2xl font-display font-medium text-slate-900 mt-1">{stats?.totalUsers ?? 0}</div>
              <span className="text-[9px] text-violet-600 font-bold group-hover:underline mt-2 inline-block">Manage Personnel &rarr;</span>
            </div>

            <div 
              onClick={() => { setActiveTab('reports'); }}
              className="p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-slate-100 transition-colors cursor-pointer group"
            >
              <div className="text-[10px] font-bold text-slate-400 uppercase">Total Teams</div>
              <div className="text-2xl font-display font-medium text-slate-900 mt-1">{stats?.totalTeams ?? 0}</div>
              <span className="text-[9px] text-violet-600 font-bold group-hover:underline mt-2 inline-block">View Team Reports &rarr;</span>
            </div>

            <div 
              onClick={() => { setActiveTab('lead-sources'); }}
              className="p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-slate-100 transition-colors cursor-pointer group"
            >
              <div className="text-[10px] font-bold text-slate-400 uppercase font-display">Active Sources</div>
              <div className="text-2xl font-display font-medium text-slate-900 mt-1">{stats?.totalLeadSources ?? 0}</div>
              <span className="text-[9px] text-violet-600 font-bold group-hover:underline mt-2 inline-block">Configure Channels &rarr;</span>
            </div>
          </div>
        </div>
      )}

      {/* Smart Cards Grid - Desktop 4 per row, Mobile original stack */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-premium-gold uppercase tracking-wider font-display">Daily Operational KPIs</h3>
        
        {/* MOBILE STAGING VIEW (Preserved exactly as requested) */}
        <div className="space-y-4 xl:hidden">
          {smartCards.find(card => card.id === 'leadsWithoutFollowup' && card.visible) && (() => {
            const card = smartCards.find(c => c.id === 'leadsWithoutFollowup')!;
            const CardIcon = card.icon;
            return (
              <div
                key={card.id}
                onClick={() => handleCardClick(card.id)}
                className="neu-card neu-raised w-full p-4 flex flex-col justify-between cursor-pointer border border-border-color/60 hover:-translate-y-0.5 hover:shadow-md transition-all rounded-[24px] active:scale-[0.98] text-left bg-white relative overflow-hidden"
                id={`mobile-smart-card-${card.id}`}
              >
                <div className="flex items-center space-x-3.5">
                  <div className={`p-2.5 rounded-2xl border ${card.colorClass} flex items-center justify-center shadow-sm`}>
                    <CardIcon className="w-5 h-5" />
                  </div>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-3xl font-display font-black text-primary-navy tracking-tight leading-none">
                      {card.count}
                    </span>
                    <span className="text-xs font-bold text-danger/80 tracking-wide font-mono uppercase bg-red-50 px-1.5 py-0.5 rounded-md">
                      Action Needed
                    </span>
                  </div>
                </div>
                <div className="mt-3.5 border-t border-border-color/40 pt-2.5">
                  <span className="text-[11px] font-bold text-primary-navy leading-none uppercase tracking-wider font-display block">
                    {card.title}
                  </span>
                  <p className="text-[10.5px] text-text-secondary mt-1 leading-normal font-medium">
                    {card.description}
                  </p>
                </div>
              </div>
            );
          })()}

          <div className="grid grid-cols-2 gap-4">
            {smartCards.filter(card => card.visible && card.id !== 'leadsWithoutFollowup').map((card) => {
              const CardIcon = card.icon;
              return (
                <div
                  key={card.id}
                  onClick={() => handleCardClick(card.id)}
                  className="neu-card neu-raised h-36 p-4 flex flex-col justify-between cursor-pointer border border-border-color/60 hover:-translate-y-1 hover:shadow-lg transition-all rounded-[24px] active:scale-95 text-left bg-white"
                  id={`mobile-sub-smart-card-${card.id}`}
                >
                  <div className="flex justify-between items-start">
                    <div className={`p-2 rounded-xl border ${card.colorClass}`}>
                      <CardIcon className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <span className="text-2xl font-display font-black text-primary-navy tracking-tight block">
                      {card.count}
                    </span>
                    <span className="text-[10px] font-bold text-text-secondary leading-none uppercase tracking-wide font-display mt-0.5 block">
                      {card.title}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* DESKTOP STAGING VIEW (Precisely 4 KPI cards per row) */}
        <div className="hidden xl:grid grid-cols-4 gap-5">
          {smartCards.filter(card => card.visible).map((card) => {
            const CardIcon = card.icon;
            return (
              <div
                key={card.id}
                onClick={() => handleCardClick(card.id)}
                className="neu-flat p-5 bg-white border border-slate-200 hover:-translate-y-1 hover:shadow-lg transition-all rounded-3xl cursor-pointer text-left flex flex-col justify-between h-40"
                id={`desktop-smart-card-${card.id}`}
              >
                <div className="flex justify-between items-start">
                  <div className={`p-3 rounded-2xl border ${card.colorClass} shadow-sm`}>
                    <CardIcon className="w-5 h-5" />
                  </div>
                  {card.id === 'leadsWithoutFollowup' && card.count > 0 && (
                    <span className="text-[8px] font-mono font-bold tracking-wider uppercase bg-red-50 text-red-600 px-2 py-0.5 rounded-full border border-red-200">
                      Action Needed
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-3xl font-display font-black text-primary-navy tracking-tight block">
                    {card.count}
                  </span>
                  <span className="text-[11px] font-bold text-[#0B1F33] uppercase tracking-wide font-display mt-1 block">
                    {card.title}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-tight select-none">
                    {card.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DESKTOP ONLY: Responsive Analytics Sections & Full Width Reports */}
      <div className="hidden xl:grid grid-cols-3 gap-6 mt-6">
        <div className="col-span-2 bg-white rounded-3xl border border-slate-200/80 p-6 text-left space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-xs font-bold text-premium-gold uppercase tracking-wider font-display">Workspace Analytics Audit</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Physical tour closures and callback compliance over current preset cycle.</p>
            </div>
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#0B1F33]/5 text-[#0B1F33] font-mono">Live Sync</span>
          </div>

          <div className="grid grid-cols-3 gap-4 py-2">
            <div className="p-4 rounded-2xl bg-teal-50/40 border border-teal-100">
              <span className="text-[9px] text-[#0B1F33]/60 uppercase font-bold font-display block">Total Leads Allocated</span>
              <span className="text-xl font-black text-primary-navy mt-1 block">{stats?.totalLeads ?? 0}</span>
            </div>
            <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-100">
              <span className="text-[9px] text-[#0B1F33]/60 uppercase font-bold font-display block">Overdue Task Backlog</span>
              <span className="text-xl font-black text-rose-600 mt-1 block">{stats?.overdueFollowups ?? 0}</span>
            </div>
            <div className="p-4 rounded-2xl bg-blue-50/40 border border-blue-100">
              <span className="text-[9px] text-[#0B1F33]/60 uppercase font-bold font-display block">Site Visits Today</span>
              <span className="text-xl font-black text-info mt-1 block">{stats?.siteVisitsToday ?? 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 text-left flex flex-col justify-between">
          <div className="pb-3 border-b border-slate-100">
            <h4 className="text-xs font-bold text-[#0B1F33] uppercase tracking-wider font-display">System Integrity Check</h4>
            <p className="text-[10px] text-slate-400 mt-0.5">Production compliance verified.</p>
          </div>
          <div className="py-2 space-y-2">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500 font-medium">Network Status:</span>
              <span className="font-bold text-emerald-600">Connected</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500 font-medium">Session State:</span>
              <span className="font-bold text-primary-navy font-display uppercase tracking-wide">Secured</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500 font-medium">Database Persistence:</span>
              <span className="font-bold text-premium-gold font-mono text-[10px]">SUPABASE LIVE</span>
            </div>
          </div>
          <div className="text-[9px] text-slate-400 border-t border-slate-100 pt-2 uppercase tracking-wide text-center">
            Security Gate Compliance Active
          </div>
        </div>
      </div>

      {/* Bottom Drawer detailed sheet */}
      <BottomDrawer
        isOpen={activeDrawerCard !== null}
        onClose={() => {
          setActiveDrawerCard(null);
          setCompletingFollowupId(null);
          setCompletingVisitId(null);
        }}
        title={smartCards.find(c => c.id === activeDrawerCard)?.title || "Dashboard Detailed Views"}
      >
        <div className="space-y-4">
          {/* Quick filter & search header inside bottomsheet */}
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search by contact name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-9 pr-4 neu-inset text-xs text-primary-navy font-medium placeholder-text-secondary rounded-xl bg-input-bg border border-border-color"
                id="drawer-search-input"
              />
              <Search className="absolute left-3 top-3 w-4 h-4 text-text-secondary" />
            </div>

            {/* Sort toggles */}
            <button
              onClick={() => setSortBy(sortBy === 'date' ? 'name' : 'date')}
              className="neu-button h-11 px-3 text-[10px] uppercase font-bold tracking-wider active:scale-90 flex items-center space-x-1"
              id="drawer-sort-toggle"
            >
              <span>Sort: {sortBy}</span>
            </button>
          </div>

          {/* Loader */}
          {isLoadingDrawer ? (
            <SkeletonLoader type="list" count={3} />
          ) : (
            <div className="space-y-3 pb-8 max-h-[50vh] overflow-y-auto custom-scroll pr-1">
              {filteredList.length === 0 ? (
                <EmptyState 
                  title="No Matching Records" 
                  description="All clear! No current listings matched the selected filter query." 
                />
              ) : (
                filteredList.map((item: any, idx) => {
                  const phoneNum = item.phone || item.leadPhone || '';
                  const relativeTitle = item.full_name || item.leadName || 'Anonymous';
                  const isFollowup = !!item.scheduled_at;
                  const targetLeadId = item.lead_id || item.id;
                  
                  return (
                    <div 
                      key={item.id || idx} 
                      className="neu-flat p-4 bg-white border border-border-color flex flex-col space-y-3 animate-fade-in"
                    >
                      {/* Name & Badge details */}
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 
                            onClick={() => {
                              if (targetLeadId) {
                                setActiveLeadId(targetLeadId);
                                setActiveTab('leads');
                              }
                            }}
                            className="text-xs font-bold text-primary-navy tracking-tight hover:text-premium-gold hover:underline cursor-pointer transition-colors flex items-center space-x-1"
                          >
                            <span>{relativeTitle}</span>
                            <ExternalLink className="w-3 h-3 text-text-secondary inline" />
                          </h4>
                          <span className="text-[10px] text-text-secondary mt-0.5 block font-mono">
                            {phoneNum}
                          </span>
                        </div>

                        {/* Status/Time badge */}
                        <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                          isFollowup ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-blue-50 text-blue-600 border border-blue-200'
                        }`}>
                          {isFollowup ? item.type : item.status}
                        </span>
                      </div>

                      {/* Details block */}
                      <p className="text-[11px] text-text-secondary leading-normal bg-input-bg/40 p-2.5 rounded-xl border border-dashed border-border-color/60">
                        {isFollowup 
                          ? `Schedule: ${new Date(item.scheduled_at).toLocaleDateString('en-IN', {day:'2-digit', month: 'short', hour:'2-digit', minute:'2-digit'})}. Agenda: ${item.notes || 'N/A'}`
                          : `Lead City: ${item.city || 'Delhi/NCR'}. Budget range: ₹${((item.budget_min || 0)/100000).toFixed(0)}L to ₹${((item.budget_max || 10000000)/100000).toFixed(0)}L`
                        }
                      </p>

                      {completingVisitId === item.id && (
                        <div className="p-3 bg-blue-50/50 rounded-2xl border border-blue-200 space-y-2 animate-fade-in">
                          <label className="text-[10px] font-bold text-info uppercase tracking-wide">Enter Site Visit Feedback:</label>
                          <textarea
                            value={visitFeedback}
                            onChange={(e) => setVisitFeedback(e.target.value)}
                            placeholder="e.g. Customer loved unit layout. Block hold requested next week."
                            className="w-full p-2 text-xs h-16 neu-inset rounded-xl bg-white border-border-color"
                          />
                          <div className="flex justify-end space-x-2">
                            <button 
                              onClick={() => setCompletingVisitId(null)}
                              className="px-3 py-1 text-[10px] uppercase font-bold text-text-secondary"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={submitVisitVisited}
                              className="px-3 py-1 bg-info text-white font-bold rounded-lg text-[10px] uppercase shadow-sm"
                            >
                              Log Visit Done
                            </button>
                          </div>
                        </div>
                      )}

                      {selectedLeadForStatusUpdate?.id === item.id && (
                        <div className="p-3 bg-slate-50 rounded-2xl border border-border-color space-y-3 animate-fade-in text-left text-xs">
                          <div>
                            <span className="text-[10px] font-bold text-premium-gold uppercase tracking-wider block font-display">Unified Status Transition</span>
                            <p className="text-[9px] text-text-secondary leading-normal">Configure the status, outcomes, and mandatory callback dates for this lead.</p>
                          </div>

                          {/* Target Lead Status select */}
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Target Lead Status</label>
                            <select
                              value={newStatusValue}
                              onChange={(e) => {
                                const st = e.target.value as LeadStatus;
                                setNewStatusValue(st);
                                const outcomes = STATUS_OUTCOMES[st] || [];
                                setQuickOutcome(outcomes[0] || '');
                                setQuickLostReason('');
                                setQuickInvalidReason('');
                              }}
                              className="w-full h-10 px-3 border border-border-color bg-white text-xs font-bold uppercase tracking-wider text-primary-navy rounded-xl focus:outline-none"
                            >
                              {Object.values(LeadStatus).map(st => (
                                <option key={st} value={st}>{st}</option>
                              ))}
                            </select>
                          </div>

                          {/* Dependent Outcome select */}
                          {STATUS_OUTCOMES[newStatusValue as LeadStatus] && (
                            <div className="space-y-1 animate-fade-in">
                              <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Status Outcome *</label>
                              <select
                                value={quickOutcome}
                                onChange={(e) => setQuickOutcome(e.target.value)}
                                className="w-full h-10 px-3 border border-border-color bg-white text-xs font-semibold text-primary-navy rounded-xl focus:outline-none"
                                required
                              >
                                <option value="">Select Outcome...</option>
                                {(STATUS_OUTCOMES[newStatusValue as LeadStatus] || []).map(oct => (
                                  <option key={oct} value={oct}>{oct}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* Lost Reason Select */}
                          {newStatusValue === LeadStatus.LOST && (
                            <div className="space-y-1 animate-fade-in">
                              <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Lost Reason *</label>
                              <select
                                value={quickLostReason}
                                onChange={(e) => setQuickLostReason(e.target.value)}
                                className="w-full h-10 px-3 border border-border-color bg-white text-xs font-semibold text-primary-navy rounded-xl focus:outline-none"
                                required
                              >
                                <option value="">Select Lost Reason...</option>
                                {LOST_REASONS.map(lr => (
                                  <option key={lr} value={lr}>{lr}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* Invalid Reason Select */}
                          {newStatusValue === LeadStatus.INVALID && (
                            <div className="space-y-1 animate-fade-in">
                              <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Invalid Reason *</label>
                              <select
                                value={quickInvalidReason}
                                onChange={(e) => setQuickInvalidReason(e.target.value)}
                                className="w-full h-10 px-3 border border-border-color bg-white text-xs font-semibold text-primary-navy rounded-xl focus:outline-none"
                                required
                              >
                                <option value="">Select Invalid Reason...</option>
                                {INVALID_REASONS.map(ir => (
                                  <option key={ir} value={ir}>{ir}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* Mandatory Remarks Textarea */}
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Remarks / Conversation summary *</label>
                            <textarea
                              value={statusChangeNotes}
                              onChange={(e) => setStatusChangeNotes(e.target.value)}
                              placeholder="Provide professional outcome audit trail text (required)..."
                              className="w-full p-2.5 h-16 text-xs text-primary-navy font-medium placeholder-slate-400 border border-border-color bg-white rounded-xl outline-none"
                              required
                            />
                          </div>

                          {/* Mandatory followup section */}
                          {![
                            LeadStatus.NEW,
                            LeadStatus.NOT_INTERESTED,
                            LeadStatus.LOST,
                            LeadStatus.BOOKING_DONE,
                            LeadStatus.INVALID
                          ].includes(newStatusValue as LeadStatus) && newStatusValue !== LeadStatus.SITE_VISIT_SCHEDULED && (
                            <div className="p-2.5 bg-amber-50/50 rounded-2xl border border-amber-200 space-y-2 animate-fade-in text-left">
                              <p className="text-[9px] font-bold text-amber-800 uppercase tracking-wider">Required Outcome: Schedule Mandatory Follow-up *</p>
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-500 block">Scheduled Date-Time *</label>
                                <input
                                  type="datetime-local"
                                  value={quickFollowupDate}
                                  onChange={(e) => setQuickFollowupDate(e.target.value)}
                                  className="w-full h-9 px-2 text-[10px] border border-amber-200 bg-white text-primary-navy rounded-lg"
                                  required
                                />
                              </div>
                            </div>
                          )}

                          {/* Mandatory site visit section */}
                          {newStatusValue === LeadStatus.SITE_VISIT_SCHEDULED && (
                            <div className="p-2.5 bg-blue-50/50 rounded-2xl border border-blue-200 space-y-2.5 animate-fade-in text-left">
                              <p className="text-[9px] font-bold text-blue-800 uppercase tracking-wider">Required Outcome: Schedule Property Site Tour *</p>
                              
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-500 block font-display">Project Interest *</label>
                                <select
                                  value={quickVisitProjectId}
                                  onChange={(e) => setQuickVisitProjectId(e.target.value)}
                                  className="w-full h-9 px-2 text-[10px] border border-blue-150 bg-white text-primary-navy rounded-lg"
                                  required
                                >
                                  <option value="">Select Project...</option>
                                  {projects.map(proj => (
                                    <option key={proj.id} value={proj.id}>{proj.name} ({proj.builder_name})</option>
                                  ))}
                                </select>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold text-slate-500 block">Tour Date *</label>
                                  <input
                                    type="date"
                                    value={quickVisitDate}
                                    onChange={(e) => setQuickVisitDate(e.target.value)}
                                    className="w-full h-9 px-2 text-[10px] border border-blue-150 bg-white text-primary-navy rounded-lg font-mono"
                                    required
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold text-slate-500 block">Tour Time *</label>
                                  <input
                                    type="time"
                                    value={quickVisitTime}
                                    onChange={(e) => setQuickVisitTime(e.target.value)}
                                    className="w-full h-9 px-2 text-[10px] border border-blue-150 bg-white text-primary-navy rounded-lg font-mono"
                                    required
                                  />
                                </div>
                              </div>

                              <div className="flex items-center space-x-3 pt-1">
                                <div className="flex items-center space-x-1">
                                  <input
                                    type="checkbox"
                                    id="quick-visit-cab"
                                    checked={quickVisitTransport}
                                    onChange={(e) => setQuickVisitTransport(e.target.checked)}
                                    className="w-3.5 h-3.5 rounded text-primary-navy border-gray-300"
                                  />
                                  <label htmlFor="quick-visit-cab" className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">Agency Cab</label>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Capital Booking value */}
                          {newStatusValue === LeadStatus.BOOKING_DONE && (
                            <div className="space-y-1 p-2.5 bg-teal-50/50 rounded-2xl border border-teal-205">
                              <label className="text-[9px] font-bold text-teal-800 uppercase tracking-wider block">Booking Capital Amount (₹) *</label>
                              <input
                                type="number"
                                value={quickBookingVal}
                                onChange={(e) => setQuickBookingVal(e.target.value)}
                                className="w-full h-9 px-3 border border-teal-200 bg-white rounded-xl text-xs font-mono font-bold"
                                required
                              />
                            </div>
                          )}

                          <div className="flex justify-end space-x-2 pt-1 border-t border-border-color/40">
                            <button 
                              onClick={() => {
                                setSelectedLeadForStatusUpdate(null);
                                setStatusChangeNotes('');
                              }}
                              className="px-3 py-1 text-[10px] uppercase font-bold text-text-secondary"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={submitLeaderboardStatus}
                              className="px-3.5 py-1.5 bg-primary-navy text-white font-bold rounded-lg text-[10px] uppercase shadow-sm cursor-pointer border-none"
                            >
                              Save Status
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Action Triggers Grid */}
                      <div className="flex justify-end items-center space-x-2 border-t border-border-color/40 pt-2.5">
                        <button 
                          onClick={() => executeCall(phoneNum)}
                          className="w-9 h-9 flex items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 active:scale-90 transition-transform"
                          title="Dial Call"
                        >
                          <PhoneCall className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => executeWhatsApp(phoneNum)}
                          className="w-9 h-9 flex items-center justify-center rounded-xl bg-green-50 text-green-600 border border-green-200 active:scale-90 transition-transform"
                          title="Message WhatsApp"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            if (targetLeadId) {
                              setActiveLeadId(targetLeadId);
                              setActiveTab('leads');
                            }
                          }}
                          className="neu-button px-3.5 py-1.5 text-[10px] uppercase text-premium-gold border-premium-gold/30 font-semibold focus:outline-none flex items-center space-x-1 cursor-pointer"
                        >
                          <User className="w-3.5 h-3.5" />
                          <span>View Details</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedLeadForStatusUpdate(item);
                            const currentStatus = item.status || item.leadStatus || LeadStatus.NEW;
                            setNewStatusValue(currentStatus);
                            const initialOutcomes = STATUS_OUTCOMES[currentStatus as LeadStatus] || [];
                            setQuickOutcome(initialOutcomes[0] || '');
                          }}
                          className="neu-button px-3.5 py-1.5 text-[10px] uppercase text-primary-navy border-primary-navy/30 font-semibold focus:outline-none flex items-center space-x-1"
                        >
                          <ClipboardList className="w-3.5 h-3.5" />
                          <span>Update Status</span>
                        </button>

                        {!isFollowup && item.scheduled_date && !completingVisitId && item.status !== SiteVisitStatus.VISITED && (
                          <>
                            <button 
                              onClick={() => setCompletingVisitId(item.id)}
                              className="neu-button px-3 py-1.5 text-[10px] uppercase text-info border-info/30 font-semibold focus:outline-none flex items-center space-x-1"
                            >
                              <Navigation className="w-3.5 h-3.5" />
                              <span>Log Visited</span>
                            </button>
                            <button 
                              onClick={() => submitVisitCancel(item.id)}
                              className="px-2 py-1.5 text-[10px] uppercase text-danger font-semibold flex items-center space-x-1"
                            >
                              <span>Cancel</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </BottomDrawer>
    </div>
  );
}
