/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../lib/store';
import { UserRole, LeadStatus, SiteVisitStatus, Lead } from '../types';
import { 
  Sparkles, Phone, PhoneCall, Calendar, Target, Award, AlertTriangle, 
  MessageSquare, TrendingUp, RefreshCw, ChevronRight, CheckCircle2, 
  User, Play, Clock, ArrowRight, ShieldAlert, Plus, Send, Check, 
  X, Info, PhoneOff, MapPin, DollarSign, ExternalLink
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, 
  BarChart, Bar, Cell 
} from 'recharts';

export default function AICoachScreen() {
  const { 
    activeUser, 
    completeFollowup, 
    scheduleFollowup, 
    updateSiteVisitStatus, 
    updateLeadStatus,
    projects,
    fetchProjects,
    setActiveLeadId,
    setActiveTab,
    darkMode
  } = useAppStore();

  const [isLoading, setIsLoading] = useState(true);
  const [lastSynced, setLastSynced] = useState<string>('');
  
  // Data States
  const [todayReport, setTodayReport] = useState<any>(null);
  const [monthReport, setMonthReport] = useState<any>(null);
  const [yesterdayReport, setYesterdayReport] = useState<any>(null);
  const [weekReport, setWeekReport] = useState<any>(null);
  
  const [overdueLeads, setOverdueLeads] = useState<any[]>([]);
  const [noFollowupLeads, setNoFollowupLeads] = useState<any[]>([]);
  const [dueTodayLeads, setDueTodayLeads] = useState<any[]>([]);
  const [visitsTodayLeads, setVisitsTodayLeads] = useState<any[]>([]);
  
  // Interactive action modal/form states
  const [activeActionLead, setActiveActionLead] = useState<any | null>(null);
  const [actionType, setActionType] = useState<'reschedule' | 'feedback' | 'schedule_interested' | 'status_update' | null>(null);
  const [activeActionVisit, setActiveActionVisit] = useState<any | null>(null);
  
  // Form fields
  const [followupDate, setFollowupDate] = useState('');
  const [followupNotes, setFollowupNotes] = useState('');
  const [visitStatus, setVisitStatus] = useState<'visited' | 'cancelled'>('visited');
  const [visitFeedback, setVisitFeedback] = useState('');
  
  // Status Update fields (copied from dashboard for perfect DB compatibility)
  const [newStatusValue, setNewStatusValue] = useState<string>('');
  const [statusChangeNotes, setStatusChangeNotes] = useState<string>('');
  const [quickOutcome, setQuickOutcome] = useState<string>('');
  const [quickLostReason, setQuickLostReason] = useState<string>('');
  const [quickInvalidReason, setQuickInvalidReason] = useState<string>('');
  const [quickBookingVal, setQuickBookingVal] = useState<string>('75000');
  
  const [quickVisitProjectId, setQuickVisitProjectId] = useState<string>('');
  const [quickVisitDate, setQuickVisitDate] = useState<string>('');
  const [quickVisitTime, setQuickVisitTime] = useState<string>('12:00');
  const [quickVisitVisitors, setQuickVisitVisitors] = useState<string>('1');
  const [quickVisitTransport, setQuickVisitTransport] = useState<boolean>(false);

  const STATUS_OUTCOMES: Record<string, string[]> = {
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

  const loadCoachData = async (showLoading = true) => {
    if (!activeUser) return;
    if (showLoading) setIsLoading(true);
    
    try {
      const uId = activeUser.id;
      const compId = activeUser.company_id;
      const role = activeUser.role;

      const [
        todayReportRes, 
        monthReportRes, 
        yesterdayReportRes,
        weekReportRes,
        overdueRes, 
        noFollowupRes, 
        dueTodayRes, 
        visitsTodayRes
      ] = await Promise.all([
        fetch(`/api/reports?preset=today&userId=${uId}&companyId=${compId}`),
        fetch(`/api/reports?preset=this_month&userId=${uId}&companyId=${compId}`),
        fetch(`/api/reports?preset=yesterday&userId=${uId}&companyId=${compId}`),
        fetch(`/api/reports?preset=this_week&userId=${uId}&companyId=${compId}`),
        fetch(`/api/dashboard/card-leads?cardId=overdueFollowups&userId=${uId}&role=${role}&companyId=${compId}`),
        fetch(`/api/dashboard/card-leads?cardId=leadsWithoutFollowup&userId=${uId}&role=${role}&companyId=${compId}`),
        fetch(`/api/dashboard/card-leads?cardId=followupsDueToday&userId=${uId}&role=${role}&companyId=${compId}`),
        fetch(`/api/dashboard/card-leads?cardId=siteVisitsToday&userId=${uId}&role=${role}&companyId=${compId}`)
      ]);

      if (todayReportRes.ok) setTodayReport(await todayReportRes.json());
      if (monthReportRes.ok) setMonthReport(await monthReportRes.json());
      if (yesterdayReportRes.ok) setYesterdayReport(await yesterdayReportRes.json());
      if (weekReportRes.ok) setWeekReport(await weekReportRes.json());
      
      if (overdueRes.ok) setOverdueLeads((await overdueRes.json()).list || []);
      if (noFollowupRes.ok) setNoFollowupLeads((await noFollowupRes.json()).list || []);
      if (dueTodayRes.ok) setDueTodayLeads((await dueTodayRes.json()).list || []);
      if (visitsTodayRes.ok) setVisitsTodayLeads((await visitsTodayRes.json()).list || []);

      setLastSynced(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (e) {
      console.error("AI Coach data loading error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCoachData();
    fetchProjects();
  }, [activeUser]);

  if (!activeUser) return null;

  // --- KPI & SUGGESTIONS TARGET PACING CALCULATIONS ---
  const isTL = activeUser.role === UserRole.TEAM_LEADER || activeUser.role === UserRole.COMPANY_ADMIN;
  const numMembers = isTL ? (monthReport?.report?.kpiJustification?.teamMembers?.length || 4) : 1;

  // Monthly values from kpiJustification
  const kpiScore = monthReport?.report?.kpiJustification?.score || 0;
  const currentVisitsCompleted = monthReport?.report?.kpiJustification?.visitsCompleted || 0;
  const currentVisitsPlanned = monthReport?.report?.kpiJustification?.visitsPlanned || 0;
  const currentBookings = monthReport?.report?.kpiJustification?.bookingsCount || 0;
  const currentRevenue = monthReport?.report?.kpiJustification?.revenueGenerated || 0;

  const targetVisitsCompleted = 15 * numMembers;
  const targetVisitsPlanned = 20 * numMembers;
  
  const remainingVisitsCompleted = Math.max(0, targetVisitsCompleted - currentVisitsCompleted);
  const remainingVisitsPlanned = Math.max(0, targetVisitsPlanned - currentVisitsPlanned);

  const getRemainingDays = () => {
    const date = new Date();
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const currentDay = date.getDate();
    return Math.max(1, lastDay - currentDay + 1);
  };
  const remainingDays = getRemainingDays();

  // Suggested daily efforts (Monthly targets broken down)
  const dailyPlannedTarget = Math.max(1, Math.ceil(remainingVisitsPlanned / remainingDays));
  const dailyCompletedTarget = Math.max(1, Math.ceil(remainingVisitsCompleted / remainingDays));

  const targetCallsConnected = 150 * numMembers;
  const currentCallsConnected = monthReport?.report?.summary?.callsConnected || 0;
  const remainingCallsConnected = Math.max(0, targetCallsConnected - currentCallsConnected);
  const dailyConnectedTarget = Math.max(5, Math.ceil(remainingCallsConnected / remainingDays));

  const targetCallsAttempted = 350 * numMembers;
  const currentCallsAttempted = monthReport?.report?.summary?.callsAttempted || 0;
  const remainingCallsAttempted = Math.max(0, targetCallsAttempted - currentCallsAttempted);
  const dailyAttemptedTarget = Math.max(10, Math.ceil(remainingCallsAttempted / remainingDays));

  // Actual values achieved today (from preset=today report summary)
  const actualAttemptedToday = todayReport?.report?.summary?.callsAttempted || 0;
  const actualConnectedToday = todayReport?.report?.summary?.callsConnected || 0;
  const actualPlannedToday = todayReport?.report?.summary?.siteVisitsPlanned || 0;
  const actualCompletedToday = todayReport?.report?.summary?.siteVisitsCompleted || 0;
  const actualBookingsToday = todayReport?.report?.summary?.bookings || 0;

  // --- DYNAMIC AI LEADS (PRIORITY LISTING) ---
  const computeUrgencyLeads = () => {
    const mergedMap = new Map<string, any>();

    overdueLeads.forEach(item => {
      const id = item.lead_id || item.id;
      if (!id) return;
      mergedMap.set(id, {
        ...item,
        id,
        leadName: item.leadName || item.full_name || 'Prospect',
        isOverdue: true,
        urgency: 50
      });
    });

    noFollowupLeads.forEach(item => {
      const id = item.id || item.lead_id;
      if (!id) return;
      if (mergedMap.has(id)) {
        const existing = mergedMap.get(id);
        existing.isNoFollowup = true;
        existing.urgency += 40;
      } else {
        mergedMap.set(id, {
          ...item,
          id,
          leadName: item.full_name || item.leadName || 'Prospect',
          isNoFollowup: true,
          urgency: 40
        });
      }
    });

    dueTodayLeads.forEach(item => {
      const id = item.lead_id || item.id;
      if (!id) return;
      if (mergedMap.has(id)) {
        const existing = mergedMap.get(id);
        existing.isDueToday = true;
        existing.urgency += 15;
      } else {
        mergedMap.set(id, {
          ...item,
          id,
          leadName: item.leadName || item.full_name || 'Prospect',
          isDueToday: true,
          urgency: 15
        });
      }
    });

    // Score based on other parameters
    const finalLeads = Array.from(mergedMap.values()).map(lead => {
      let score = lead.urgency;
      if (lead.status === 'Interested' || lead.leadStatus === 'Interested') {
        score += 30;
      }
      const budgetMax = lead.budget_max || lead.budgetMax || 0;
      if (budgetMax >= 10000000) { // >= 1 Crore
        score += 20;
      }
      return {
        ...lead,
        finalScore: score
      };
    });

    // Sort descending by final score
    return finalLeads.sort((a, b) => b.finalScore - a.finalScore);
  };

  const priorityLeads = computeUrgencyLeads();

  // --- DAILY PRODUCTIVITY SCORE & BADGE ---
  const calculateDailyProductivityScore = () => {
    // 1 Call Attempted = 1pt (max 15pts)
    // 1 Call Connected = 2.5pts (max 25pts)
    // 1 Site Visit Planned = 15pts (max 15pts)
    // 1 Site Visit Completed = 25pts (max 25pts)
    // 1 Booking Logged = 20pts (max 20pts)
    const callsAttemptedPts = Math.min(15, actualAttemptedToday * 1);
    const callsConnectedPts = Math.min(25, actualConnectedToday * 2.5);
    const siteVisitsPlannedPts = Math.min(15, actualPlannedToday * 15);
    const siteVisitsCompletedPts = Math.min(25, actualCompletedToday * 25);
    const bookingsPts = Math.min(20, actualBookingsToday * 20);

    const totalScore = Math.min(100, Math.round(callsAttemptedPts + callsConnectedPts + siteVisitsPlannedPts + siteVisitsCompletedPts + bookingsPts));
    
    let badge = 'Bronze';
    let badgeColor = 'bg-amber-100 text-amber-800 border-amber-300';
    let message = 'Keep pushing! Completing a few more calls will lift your momentum.';

    if (totalScore >= 80) {
      badge = 'Gold';
      badgeColor = 'bg-yellow-100 text-yellow-800 border-yellow-300';
      message = 'Sensational productivity! You have locked in the Gold status for today. Keep this fire burning!';
    } else if (totalScore >= 40) {
      badge = 'Silver';
      badgeColor = 'bg-slate-100 text-slate-800 border-slate-300';
      message = 'Excellent progress! Just a few more completed activities to achieve Gold badge status.';
    }

    return {
      score: totalScore,
      badge,
      badgeColor,
      message,
      breakdown: {
        attempted: callsAttemptedPts,
        connected: callsConnectedPts,
        planned: siteVisitsPlannedPts,
        completed: siteVisitsCompletedPts,
        bookings: bookingsPts
      }
    };
  };

  const productivity = calculateDailyProductivityScore();

  // --- TODAY'S MISSION REMAINING CHECKS ---
  const missionItems = [
    { label: 'Calls Attempted', actual: actualAttemptedToday, target: dailyAttemptedTarget, color: 'text-purple-600 bg-purple-50 border-purple-100' },
    { label: 'Calls Connected', actual: actualConnectedToday, target: dailyConnectedTarget, color: 'text-sky-600 bg-sky-50 border-sky-100' },
    { label: 'Site Visits Planned', actual: actualPlannedToday, target: dailyPlannedTarget, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
    { label: 'Site Visits Completed', actual: actualCompletedToday, target: dailyCompletedTarget, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    { label: 'Bookings Logged', actual: actualBookingsToday, target: Math.max(1, isTL ? numMembers : 1), color: 'text-amber-600 bg-amber-50 border-amber-100' }
  ];

  // --- DAILY AI ADVICE RULES ---
  const getAiCoachingAdvice = () => {
    if (overdueLeads.length > 0) {
      return `You currently have ${overdueLeads.length} overdue callbacks. Reaching out to these hot prospects immediately is the most direct path to boosting conversion and avoiding lead decay.`;
    }
    if (actualAttemptedToday < 10) {
      return `Your outreach velocity is currently lower than recommended. Initiate at least 15 outbound calls now to build an active sales pipeline for the week.`;
    }
    if (visitsTodayLeads.some(v => v.status === 'visited' && !v.feedback)) {
      return `Great work completing physical tours today! Be sure to log client feedback immediately on the completed site visits to initiate contract negotiations.`;
    }
    if (productivity.score >= 80) {
      return `Phenomenal output! You've secured the Gold Daily Badge. Focus on cementing your relationship with interested leads and maintaining this stellar performance.`;
    }
    return `Consistent progress is key. Prioritize profiling requirements for connected leads to secure high-intent walkthroughs this weekend.`;
  };

  // --- PERFORMANCE TREND CHART DATA ---
  const getTrendData = () => {
    const todayScore = productivity.score;
    
    // Fallback/standard scores calculated based on activities in other presets
    const getScoreFromSummary = (summary: any) => {
      if (!summary) return 20;
      const att = summary.callsAttempted || 0;
      const conn = summary.callsConnected || 0;
      const plan = summary.siteVisitsPlanned || 0;
      const comp = summary.siteVisitsCompleted || 0;
      const bks = summary.bookings || 0;
      return Math.min(100, Math.round(Math.min(15, att) + Math.min(25, conn * 2.5) + Math.min(15, plan * 15) + Math.min(25, comp * 25) + Math.min(20, bks * 20)));
    };

    const yesterdayScore = getScoreFromSummary(yesterdayReport?.report?.summary) || 45;
    const weekScore = getScoreFromSummary(weekReport?.report?.summary) || 60;
    const monthScore = getScoreFromSummary(monthReport?.report?.summary) || 75;

    return [
      { name: 'Yesterday', Score: yesterdayScore },
      { name: 'Today', Score: todayScore },
      { name: 'This Week (Avg)', Score: weekScore },
      { name: 'This Month (Avg)', Score: monthScore }
    ];
  };

  const trendData = getTrendData();

  // --- SMART NOTIFICATION TICKER ITEMS ---
  const getTickerAlerts = () => {
    const alerts: string[] = [];
    if (overdueLeads.length > 0) {
      const topLead = overdueLeads[0];
      alerts.push(`CRITICAL: Followup with ${topLead.leadName || topLead.full_name || 'Client'} is overdue! Action needed immediately.`);
    }
    visitsTodayLeads.forEach(v => {
      if (v.status === 'scheduled' || v.status === 'confirmed') {
        alerts.push(`ALERT: Site visit scheduled with ${v.leadName || 'Client'} today at ${v.scheduled_time || 'scheduled hour'}!`);
      }
    });
    noFollowupLeads.slice(0, 2).forEach(l => {
      alerts.push(`REMINDER: ${l.full_name} is in status ${l.status} with no callback scheduled.`);
    });
    if (alerts.length === 0) {
      alerts.push("AI Coach Audit: Workspace in pristine shape. All callbacks fully synchronised!");
    }
    return alerts;
  };

  const tickerAlerts = getTickerAlerts();

  // --- MISSED OPPORTUNITIES ---
  const missedOpps = [
    ...overdueLeads.slice(0, 3).map(f => ({
      id: f.id,
      leadId: f.lead_id,
      leadName: f.leadName || f.full_name || 'Prospect',
      type: 'Overdue Followup',
      detail: `Missed callback scheduled at ${new Date(f.scheduled_at).toLocaleDateString('en-IN', {day:'2-digit', month: 'short', hour:'2-digit', minute:'2-digit'})}`,
      actionText: 'Reschedule Call',
      actionType: 'reschedule' as const,
      payload: f
    })),
    ...visitsTodayLeads.filter(v => v.status === 'scheduled' && v.scheduled_date < new Date().toISOString().split('T')[0]).slice(0, 3).map(v => ({
      id: v.id,
      leadId: v.lead_id,
      leadName: v.leadName || 'Prospect',
      type: 'Pending Tour Feedback',
      detail: `Site walkthrough completed but feedback is blank`,
      actionText: 'Log Feedback',
      actionType: 'feedback' as const,
      payload: v
    })),
    ...noFollowupLeads.filter(l => l.status === 'Interested').slice(0, 3).map(l => ({
      id: l.id,
      leadId: l.id,
      leadName: l.full_name || 'Prospect',
      type: 'Interested - No Callback',
      detail: `Marked Interested with no scheduled follow-up callback`,
      actionText: 'Schedule Call',
      actionType: 'schedule_interested' as const,
      payload: l
    }))
  ];

  // --- INLINE ACTION HANDLERS ---
  const openActionForm = (opp: any) => {
    setActiveActionLead(opp.payload);
    setActionType(opp.actionType);
    
    // Defaults
    if (opp.actionType === 'reschedule' || opp.actionType === 'schedule_interested') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(11, 0, 0, 0);
      setFollowupDate(tomorrow.toISOString().slice(0, 16));
      setFollowupNotes('');
    } else if (opp.actionType === 'feedback') {
      setActiveActionVisit(opp.payload);
      setVisitStatus('visited');
      setVisitFeedback('');
    }
  };

  const handleFollowupSubmit = async () => {
    if (!activeActionLead || !followupDate) return;
    const leadId = activeActionLead.lead_id || activeActionLead.id;
    const ok = await scheduleFollowup(leadId, {
      scheduled_at: followupDate,
      type: 'Call',
      notes: followupNotes || 'Scheduled by AI Performance Coach suggestions'
    });
    if (ok) {
      // If it was overdue, let's mark the overdue one completed
      if (actionType === 'reschedule' && activeActionLead.id) {
        await completeFollowup(activeActionLead.id, `Rescheduled to ${followupDate}. notes: ${followupNotes}`);
      }
      setActiveActionLead(null);
      setActionType(null);
      loadCoachData(false);
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!activeActionVisit || !visitFeedback) return;
    const ok = await updateSiteVisitStatus(activeActionVisit.id, visitStatus, visitFeedback);
    if (ok) {
      setActiveActionLead(null);
      setActiveActionVisit(null);
      setActionType(null);
      loadCoachData(false);
    }
  };

  const handleStatusUpdateSubmit = async () => {
    if (!activeActionLead) return;
    const leadId = activeActionLead.lead_id || activeActionLead.id || activeActionLead.leadId;
    if (!leadId) return;

    const status = newStatusValue;
    const outcome = quickOutcome;
    const lostReason = quickLostReason;
    const invalidReason = quickInvalidReason;
    const notes = statusChangeNotes;
    const bookingAmount = Number(quickBookingVal) || 0;

    if (!status || !outcome || !notes.trim()) {
      alert('Please fill out all mandatory fields.');
      return;
    }

    let richNotes = `Outcome: ${outcome}`;
    if (status === LeadStatus.LOST && lostReason) {
      richNotes += ` | Lost Reason: ${lostReason}`;
    } else if (status === LeadStatus.INVALID && invalidReason) {
      richNotes += ` | Invalid Reason: ${invalidReason}`;
    }
    richNotes += ` | Remarks: ${notes.trim()}`;

    let followupPayload = undefined;
    const isExempted = [
      LeadStatus.NEW, LeadStatus.NOT_INTERESTED, LeadStatus.LOST,
      LeadStatus.BOOKING_DONE, LeadStatus.INVALID
    ].includes(status as LeadStatus);

    if (!isExempted && status !== LeadStatus.SITE_VISIT_SCHEDULED) {
      followupPayload = {
        scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        type: 'Call',
        notes: `Scheduled during AI Coach status transition.`
      };
    }

    let visitPayload = undefined;
    if (status === LeadStatus.SITE_VISIT_SCHEDULED) {
      if (!quickVisitProjectId || !quickVisitDate) {
        alert('Site visit details are mandatory.');
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

    const ok = await updateLeadStatus(
      leadId,
      status,
      richNotes,
      bookingAmount,
      followupPayload,
      visitPayload
    );

    if (ok) {
      setActiveActionLead(null);
      setActionType(null);
      loadCoachData(false);
    } else {
      alert('Transition failed. Please check inputs.');
    }
  };

  return (
    <div className="flex flex-col space-y-6 pb-28 text-left animate-fade-in" id="ai_performance_coach_screen">
      
      {/* 1. HEADER BANNER */}
      <div className={`p-6 rounded-[24px] border border-border-color relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 ${darkMode ? 'bg-gradient-to-br from-[#101B2B] to-[#0D1622]' : 'bg-white shadow-sm'}`}>
        <div className="space-y-1.5 relative z-10">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-amber-50 rounded-xl border border-amber-200">
              <Sparkles className="w-4 h-4 text-premium-gold" />
            </div>
            <span className="text-[10px] uppercase font-bold text-premium-gold tracking-wider font-display">Active Copilot</span>
          </div>
          <h2 className="text-xl font-display font-bold text-primary-navy tracking-tight">
            Greetings, {activeUser.full_name}!
          </h2>
          <p className="text-xs text-text-secondary max-w-xl leading-relaxed">
            Your real-time AI Productivity Coach. We are auditing your actual activity metrics against monthly suggested targets to maximize your daily close rate.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0 relative z-10">
          {lastSynced && (
            <span className="text-[10px] font-mono text-text-secondary bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              Last synced: {lastSynced}
            </span>
          )}
          <button
            onClick={() => loadCoachData(true)}
            className="neu-button p-2 px-4 flex items-center space-x-2 text-xs font-bold uppercase tracking-wider active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* 2. ALERT TICKER PANEL */}
      <div className="bg-amber-50/50 border border-amber-100 p-3.5 rounded-2xl flex items-center space-x-3 overflow-hidden">
        <div className="flex items-center space-x-1 text-premium-gold shrink-0 bg-white border border-amber-200 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide">
          <Clock className="w-3.5 h-3.5 animate-pulse" />
          <span>Live Ticker</span>
        </div>
        <div className="flex-1 overflow-hidden relative">
          <div className="animate-marquee whitespace-nowrap text-xs font-medium text-amber-800">
            {tickerAlerts.map((alert, idx) => (
              <span key={idx} className="mr-12 inline-block">
                • {alert}
              </span>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-[24px] h-64 border border-slate-200 animate-pulse flex items-center justify-center">
              <span className="text-xs text-slate-400 font-medium">Calibrating daily metrics engine...</span>
            </div>
          </div>
          <div className="bg-white p-6 rounded-[24px] h-96 border border-slate-200 animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          
          {/* LEFT & CENTER COLUMN (COACH DASHBOARD AND VISUALIZATIONS) */}
          <div className="xl:col-span-2 space-y-6">
            
            {/* A. TODAY'S MISSION CARD */}
            <div className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm text-left space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-display font-bold text-slate-900 text-sm">Today&apos;s Active Mission</h3>
                  <p className="text-xs text-slate-500">Dynamic targets recalibrated from monthly suggested performance standards.</p>
                </div>
                <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold uppercase tracking-wider text-[9px] rounded-lg border border-indigo-100">Pacing suggestions</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {missionItems.map((item, idx) => {
                  const percent = Math.min(100, Math.round((item.actual / item.target) * 100));
                  const isDone = item.actual >= item.target;
                  return (
                    <div key={idx} className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between h-32 relative overflow-hidden">
                      <div className="flex justify-between items-start">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase ${item.color}`}>
                          {item.label}
                        </span>
                        {isDone ? (
                          <div className="p-1 bg-emerald-100 text-emerald-700 rounded-full">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        ) : (
                          <span className="text-[10px] font-mono font-bold text-slate-400">
                            {item.actual}/{item.target}
                          </span>
                        )}
                      </div>

                      <div className="mt-4">
                        <span className="text-xl font-display font-black text-slate-900">{item.actual}</span>
                        <span className="text-xs text-slate-400 font-mono"> / {item.target}</span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-2">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${isDone ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Remaining statement */}
              <div className="p-3 bg-slate-50 rounded-xl flex items-center space-x-2 border border-slate-100">
                <Info className="w-4 h-4 text-indigo-600 shrink-0" />
                <p className="text-xs text-slate-600 leading-normal">
                  Remaining actions for 100% mission achievement: {' '}
                  <span className="font-bold text-slate-900">
                    {Math.max(0, dailyAttemptedTarget - actualAttemptedToday)} Calls to attempt, {' '}
                    {Math.max(0, dailyConnectedTarget - actualConnectedToday)} Connections to lock, and {' '}
                    {Math.max(0, dailyCompletedTarget - actualCompletedToday)} Site visits to close.
                  </span>
                </p>
              </div>
            </div>

            {/* B. DAILY PRODUCTIVITY SCORE & ADVICE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* circular productivity score */}
              <div className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm text-left flex flex-col justify-between space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="font-display font-bold text-slate-900 text-sm">Productivity Score</h3>
                  <p className="text-xs text-slate-500 font-medium">Overall visual quality score of your actual actions logged today.</p>
                </div>

                <div className="flex items-center justify-center space-x-6 py-2">
                  <div className="relative flex items-center justify-center w-28 h-28">
                    {/* SVG Circular Progress */}
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="56"
                        cy="56"
                        r="48"
                        stroke="#f1f5f9"
                        strokeWidth="10"
                        fill="transparent"
                      />
                      <circle
                        cx="56"
                        cy="56"
                        r="48"
                        stroke="#C9A24D"
                        strokeWidth="10"
                        fill="transparent"
                        strokeDasharray={301.6}
                        strokeDashoffset={301.6 - (301.6 * productivity.score) / 100}
                        strokeLinecap="round"
                        className="transition-all duration-700"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-3xl font-display font-black text-slate-900">{productivity.score}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Pts</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className={`px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider ${productivity.badgeColor}`}>
                      {productivity.badge} Badge
                    </span>
                    <div className="text-[11px] text-slate-500 leading-relaxed font-medium">
                      {productivity.message}
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 grid grid-cols-5 gap-1 text-[9px] text-slate-500 font-mono uppercase text-center font-bold">
                  <div>
                    <span>Attempt</span>
                    <div className="text-xs font-black text-slate-800 mt-1">{productivity.breakdown.attempted}</div>
                  </div>
                  <div>
                    <span>Connect</span>
                    <div className="text-xs font-black text-slate-800 mt-1">{productivity.breakdown.connected}</div>
                  </div>
                  <div>
                    <span>Planned</span>
                    <div className="text-xs font-black text-slate-800 mt-1">{productivity.breakdown.planned}</div>
                  </div>
                  <div>
                    <span>Visited</span>
                    <div className="text-xs font-black text-slate-800 mt-1">{productivity.breakdown.completed}</div>
                  </div>
                  <div>
                    <span>Booked</span>
                    <div className="text-xs font-black text-slate-800 mt-1">{productivity.breakdown.bookings}</div>
                  </div>
                </div>
              </div>

              {/* daily advice suggesting dynamic notes */}
              <div className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm text-left flex flex-col justify-between space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="font-display font-bold text-slate-900 text-sm">AI Performance Advisor</h3>
                  <p className="text-xs text-slate-500">Intelligent, customized strategy suggested by your copilot.</p>
                </div>

                <div className="flex-1 flex items-start space-x-4 bg-amber-50/40 p-4 rounded-2xl border border-dashed border-amber-200/80">
                  <div className="p-2.5 bg-white border border-amber-150 rounded-xl text-premium-gold shrink-0">
                    <Sparkles className="w-5 h-5 animate-spin duration-3000" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-premium-gold uppercase tracking-wider block">Contextual Suggestion</span>
                    <p className="text-[11px] text-amber-900 font-medium leading-relaxed italic">
                      &ldquo;{getAiCoachingAdvice()}&rdquo;
                    </p>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 font-mono text-center">
                  *Dynamic suggestions updated with every lead update or phone call.
                </div>
              </div>

            </div>

            {/* C. PERFORMANCE TREND micro-charts */}
            <div className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm text-left space-y-4">
              <div>
                <h3 className="font-display font-bold text-slate-900 text-sm">Performance Velocity Trend</h3>
                <p className="text-xs text-slate-500 font-medium">Compare your overall quality-adjusted daily scores against key historical aggregates.</p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#C9A24D" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#C9A24D" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0B1F33', borderColor: '#1e293b', borderRadius: '12px' }}
                      labelStyle={{ color: '#ffffff', fontWeight: 'bold', fontSize: '12px' }}
                      itemStyle={{ color: '#C9A24D', fontSize: '12px' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="Score" 
                      stroke="#C9A24D" 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill="url(#trendGrad)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* D. TEAM LEADER SPECIFIC HEALTH (IF TL OR ADMIN) */}
            {isTL && (
              <div className="bg-[#0B1F33] text-white rounded-[24px] p-6 shadow-md text-left space-y-4 border border-[#1a3554]">
                <div className="flex justify-between items-center border-b border-white/10 pb-3">
                  <div>
                    <h3 className="font-display font-bold text-white text-sm flex items-center space-x-2">
                      <Target className="w-4 h-4 text-premium-gold" />
                      <span>Team Leader Command Coach</span>
                    </h3>
                    <p className="text-xs text-slate-300 font-medium">Real-time team synchronization and activity gap analysis.</p>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-500/10 text-premium-gold border border-amber-500/20 rounded-md text-[9px] font-mono font-bold uppercase tracking-widest">Supervisor View</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Team Health Score</span>
                    <span className="text-2xl font-display font-black text-white mt-1 block">
                      {Math.round((monthReport?.report?.kpiJustification?.teamMembers?.reduce((acc: number, cur: any) => acc + (cur.score || 0), 0) || 0) / (monthReport?.report?.kpiJustification?.teamMembers?.length || 1))}%
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold mt-1 inline-block">Normal standard maintained</span>
                  </div>

                  <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Top Performer Today</span>
                    <span className="text-sm font-bold text-premium-gold truncate mt-2 block">
                      {monthReport?.report?.kpiJustification?.teamMembers?.sort((a: any, b: any) => b.score - a.score)?.[0]?.fullName || 'N/A'}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono block mt-1">
                      Score: {monthReport?.report?.kpiJustification?.teamMembers?.sort((a: any, b: any) => b.score - a.score)?.[0]?.score || 0}%
                    </span>
                  </div>

                  <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Inactive Members</span>
                    <span className="text-2xl font-display font-black text-rose-400 mt-1 block">
                      {monthReport?.report?.kpiJustification?.teamMembers?.filter((m: any) => m.score === 0)?.length || 0}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-1">Zero activity logged today</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-850 flex items-start space-x-3 text-xs leading-relaxed">
                  <Info className="w-4 h-4 text-premium-gold shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-[#C9A24D] uppercase tracking-wider text-[9px] block">Leader Advice</span>
                    <span className="text-slate-300">
                      Top members are leading on completed physical tours. Schedule a rapid 5-minute huddle with inactive members to assist them in following up on warm, interested prospects before day-end.
                    </span>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* RIGHT COLUMN (DYNAMIC PRIORITY LEADS & MISSED OPPORTUNITIES) */}
          <div className="space-y-6">
            
            {/* 1. DYNAMIC PRIORITY LEADS SECTION */}
            <div className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm text-left space-y-4">
              <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                <div>
                  <h3 className="font-display font-bold text-slate-900 text-sm">AI Priority Leads</h3>
                  <p className="text-xs text-slate-500 font-medium">Smart sorted contacts needing direct touch.</p>
                </div>
                <span className="text-[9px] font-mono font-bold bg-amber-50 text-premium-gold px-2 py-0.5 rounded-lg border border-amber-200 uppercase">Urgency Score</span>
              </div>

              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1 custom-scroll">
                {priorityLeads.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400 font-medium">
                    All clear! No current leads match the high urgency scoring thresholds.
                  </div>
                ) : (
                  priorityLeads.slice(0, 10).map((lead, idx) => (
                    <div key={idx} className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl space-y-2.5 hover:shadow-sm transition-all duration-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 flex items-center space-x-1">
                            <span>{lead.leadName}</span>
                            {lead.budget_max >= 10000000 && (
                              <span className="text-[8px] bg-amber-100 text-amber-800 font-bold px-1 rounded">H-BUDG</span>
                            )}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                            {lead.phone} {lead.alternate_phone ? `| ${lead.alternate_phone}` : ''}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 bg-[#0B1F33] text-white text-[10px] font-mono font-bold rounded-lg shadow-sm">
                          {lead.finalScore} pts
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-slate-500 border-t border-slate-200/50 pt-2 bg-slate-100/40 p-1.5 rounded-lg">
                        <span>Status: <span className="font-bold text-slate-800">{lead.leadStatus || lead.status}</span></span>
                        {lead.city && <span>City: <span className="font-bold text-slate-800">{lead.city}</span></span>}
                      </div>

                      <div className="flex space-x-2 pt-1">
                        <a 
                          href={`tel:${lead.phone}`}
                          className="flex-1 h-8 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-[10px] uppercase tracking-wider flex items-center justify-center space-x-1 shadow-sm"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Call</span>
                        </a>
                        <button
                          onClick={() => {
                            setActiveActionLead(lead);
                            setActionType('status_update');
                            setNewStatusValue(lead.leadStatus || lead.status || LeadStatus.NEW);
                            setQuickOutcome('');
                            setQuickLostReason('');
                            setQuickInvalidReason('');
                            setStatusChangeNotes('');
                            setQuickVisitProjectId('');
                            setQuickVisitDate('');
                          }}
                          className="flex-1 h-8 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg text-[10px] uppercase tracking-wider hover:bg-slate-50 flex items-center justify-center space-x-1"
                        >
                          <Play className="w-3 h-3 text-premium-gold" />
                          <span>Status</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 2. MISSED OPPORTUNITIES AND INLINE ACTIONS */}
            <div className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm text-left space-y-4">
              <div>
                <h3 className="font-display font-bold text-slate-900 text-sm">Critical Gaps Detected</h3>
                <p className="text-xs text-slate-500 font-medium">Missed outreach and action gaps that damage closing potential.</p>
              </div>

              <div className="space-y-3">
                {missedOpps.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400 font-medium">
                    Perfect score! No active compliance or process gaps detected.
                  </div>
                ) : (
                  missedOpps.map((opp, idx) => (
                    <div key={idx} className="p-3 bg-rose-50/40 border border-rose-100 rounded-2xl flex flex-col justify-between space-y-2 text-left">
                      <div className="flex justify-between items-start">
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-bold text-rose-700 uppercase tracking-wider font-mono bg-rose-100/60 px-1.5 py-0.5 rounded">
                            {opp.type}
                          </span>
                          <h4 className="text-xs font-bold text-slate-900 mt-1">{opp.leadName}</h4>
                        </div>
                      </div>

                      <p className="text-[10.5px] text-slate-500 font-medium leading-normal italic">
                        &ldquo;{opp.detail}&rdquo;
                      </p>

                      <button
                        onClick={() => openActionForm(opp)}
                        className="h-8 w-full bg-rose-950/10 hover:bg-rose-950/20 text-rose-800 font-bold border border-rose-200 rounded-xl text-[10px] uppercase tracking-wider flex items-center justify-center space-x-1 active:scale-95 transition-all"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>{opp.actionText}</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* --- INLINE FORM MODAL/DRAWER OVERLAY --- */}
      {actionType && activeActionLead && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in select-none">
          <div className="bg-white w-full max-w-md rounded-[28px] border border-slate-150 p-6 space-y-4 shadow-2xl animate-scale-up text-left text-xs text-slate-800">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-premium-gold uppercase tracking-wider block font-display">Interactive AI Assistant</span>
                <h3 className="text-sm font-bold text-[#0B1F33] mt-1">
                  {actionType === 'reschedule' && 'Reschedule callback'}
                  {actionType === 'schedule_interested' && 'Schedule interested callback'}
                  {actionType === 'feedback' && 'Log physical tour feedback'}
                  {actionType === 'status_update' && `Update profile status: ${activeActionLead.leadName || activeActionLead.full_name}`}
                </h3>
              </div>
              <button 
                onClick={() => {
                  setActionType(null);
                  setActiveActionLead(null);
                  setActiveActionVisit(null);
                }}
                className="p-1 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* FORM BODY FOR RESCHEDULES */}
            {(actionType === 'reschedule' || actionType === 'schedule_interested') && (
              <div className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Select callback date-time *</label>
                  <input
                    type="datetime-local"
                    value={followupDate}
                    onChange={(e) => setFollowupDate(e.target.value)}
                    className="w-full h-11 px-3 border border-slate-200 bg-slate-50 text-xs font-semibold rounded-xl focus:outline-none focus:border-premium-gold"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Agenda remarks / Notes *</label>
                  <textarea
                    value={followupNotes}
                    onChange={(e) => setFollowupNotes(e.target.value)}
                    placeholder="e.g. Schedule price discussion and share project walkthrough brochure..."
                    className="w-full p-3 h-24 text-xs font-semibold border border-slate-200 bg-slate-50 rounded-xl focus:outline-none focus:border-premium-gold"
                    required
                  />
                </div>
                <button
                  onClick={handleFollowupSubmit}
                  disabled={!followupDate || !followupNotes.trim()}
                  className="h-11 w-full bg-[#0B1F33] hover:bg-[#15304b] text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center space-x-2 disabled:opacity-55"
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>Schedule Call</span>
                </button>
              </div>
            )}

            {/* FORM BODY FOR TOUR FEEDBACK */}
            {actionType === 'feedback' && activeActionVisit && (
              <div className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Tour Completion status *</label>
                  <select
                    value={visitStatus}
                    onChange={(e) => setVisitStatus(e.target.value as any)}
                    className="w-full h-11 px-3 border border-slate-200 bg-slate-50 text-xs font-bold uppercase rounded-xl"
                  >
                    <option value="visited">Visited Successfully</option>
                    <option value="cancelled">No-Show / Cancelled</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Consumer detailed feedback *</label>
                  <textarea
                    value={visitFeedback}
                    onChange={(e) => setVisitFeedback(e.target.value)}
                    placeholder="e.g. Customer loved the 3BHK corner layout. Negotiation initiated on overall parking discount..."
                    className="w-full p-3 h-24 text-xs font-semibold border border-slate-200 bg-slate-50 rounded-xl focus:outline-none focus:border-premium-gold"
                    required
                  />
                </div>
                <button
                  onClick={handleFeedbackSubmit}
                  disabled={!visitFeedback.trim()}
                  className="h-11 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center space-x-2 disabled:opacity-55"
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>Log Visit Outcome</span>
                </button>
              </div>
            )}

            {/* FORM BODY FOR UNFIFIED STATUS TRANSITION */}
            {actionType === 'status_update' && (
              <div className="space-y-3.5 max-h-[75vh] overflow-y-auto pr-1 custom-scroll text-left">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Target Lead Status</label>
                  <select
                    value={newStatusValue}
                    onChange={(e) => {
                      const st = e.target.value;
                      setNewStatusValue(st);
                      const outcomes = STATUS_OUTCOMES[st] || [];
                      setQuickOutcome(outcomes[0] || '');
                      setQuickLostReason('');
                      setQuickInvalidReason('');
                    }}
                    className="w-full h-10 px-3 border border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-primary-navy rounded-xl focus:outline-none"
                  >
                    {Object.values(LeadStatus).map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                {STATUS_OUTCOMES[newStatusValue] && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Status Outcome *</label>
                    <select
                      value={quickOutcome}
                      onChange={(e) => setQuickOutcome(e.target.value)}
                      className="w-full h-10 px-3 border border-slate-200 bg-slate-50 text-xs font-semibold text-primary-navy rounded-xl focus:outline-none"
                      required
                    >
                      <option value="">Select Outcome...</option>
                      {(STATUS_OUTCOMES[newStatusValue] || []).map(oct => (
                        <option key={oct} value={oct}>{oct}</option>
                      ))}
                    </select>
                  </div>
                )}

                {newStatusValue === LeadStatus.LOST && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Lost Reason *</label>
                    <select
                      value={quickLostReason}
                      onChange={(e) => setQuickLostReason(e.target.value)}
                      className="w-full h-10 px-3 border border-slate-200 bg-slate-50 text-xs font-semibold text-primary-navy rounded-xl focus:outline-none"
                      required
                    >
                      <option value="">Select Lost Reason...</option>
                      {['Out of Budget', 'Location Disliked', 'Purchased Competitor Project', 'Lost Contact / No Response', 'Purchase Postponed', 'Other'].map(lr => (
                        <option key={lr} value={lr}>{lr}</option>
                      ))}
                    </select>
                  </div>
                )}

                {newStatusValue === LeadStatus.INVALID && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Invalid Reason *</label>
                    <select
                      value={quickInvalidReason}
                      onChange={(e) => setQuickInvalidReason(e.target.value)}
                      className="w-full h-10 px-3 border border-slate-200 bg-slate-50 text-xs font-semibold text-primary-navy rounded-xl focus:outline-none"
                      required
                    >
                      <option value="">Select Invalid Reason...</option>
                      {['Wrong Number / Not Reachable', 'Duplicate Profile', 'Fake Lead / Junk Details', 'Agent / Broker Outreach', 'Other'].map(ir => (
                        <option key={ir} value={ir}>{ir}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Remarks / Conversation summary *</label>
                  <textarea
                    value={statusChangeNotes}
                    onChange={(e) => setStatusChangeNotes(e.target.value)}
                    placeholder="Provide professional outcome audit trail text (required)..."
                    className="w-full p-2.5 h-16 text-xs text-primary-navy font-medium placeholder-slate-400 border border-slate-200 bg-slate-50 rounded-xl outline-none"
                    required
                  />
                </div>

                {newStatusValue === LeadStatus.SITE_VISIT_SCHEDULED && (
                  <div className="p-3 bg-blue-50 border border-blue-150 rounded-2xl space-y-2 text-left">
                    <p className="text-[9px] font-bold text-blue-800 uppercase tracking-wider">Schedule Property Site Tour *</p>
                    
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
                          className="w-full h-9 px-2 text-[10px] border border-blue-150 bg-white text-primary-navy rounded-lg"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 block">Tour Time *</label>
                        <input
                          type="time"
                          value={quickVisitTime}
                          onChange={(e) => setQuickVisitTime(e.target.value)}
                          className="w-full h-9 px-2 text-[10px] border border-blue-150 bg-white text-primary-navy rounded-lg"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleStatusUpdateSubmit}
                  disabled={!newStatusValue || !statusChangeNotes.trim() || !quickOutcome}
                  className="h-11 w-full bg-[#0B1F33] hover:bg-[#15304b] text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center space-x-2 disabled:opacity-55"
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>Update Profile Status</span>
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}

// Compact CheckSquare icon fallback
function CheckSquare(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
