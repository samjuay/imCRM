/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../lib/store';
import { 
  BarChart3, Calendar, CheckSquare, ClipboardList, TrendingUp, 
  Users, DollarSign, ArrowDownWideNarrow, Percent, MapPin, Clock
} from 'lucide-react';
import EmptyState from './EmptyState';
import SkeletonLoader from './SkeletonLoader';

export default function ReportsScreen() {
  const { activeUser, stats, fetchStats } = useAppStore();
  const [preset, setPreset] = useState<'today' | 'this_week' | 'this_month' | 'all_time'>('this_month');
  const [reportData, setReportData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Load report data from backend matching current preset
  useEffect(() => {
    async function getReports() {
      if (!activeUser) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/reports?preset=${preset}&userId=${activeUser.id}`);
        if (res.ok) {
          const body = await res.json();
          setReportData(body);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    getReports();
  }, [preset, activeUser]);

  if (loading || !reportData) return <SkeletonLoader type="stats" />;

  // Calculate Conversions ratios
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

  return (
    <div className="flex flex-col select-none pb-28 text-left space-y-5">
      
      {/* 1. PRESET TIMEFRAME SELECTOR */}
      <div className="flex bg-white p-1 rounded-2xl border border-border-color shadow-sm">
        {(['today', 'this_week', 'this_month', 'all_time'] as const).map((time) => (
          <button
            key={time}
            onClick={() => setPreset(time)}
            className={`flex-1 py-2 text-center text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all ${
              preset === time ? 'bg-primary-navy text-white shadow' : 'text-text-secondary hover:text-primary-navy'
            }`}
          >
            {time.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* 2. CORE PERFORMANCE METRICS BANNER GRID */}
      <div className="grid grid-cols-2 gap-4">
        {/* Metric A: Total Leads pipeline */}
        <div className="neu-flat p-4 bg-white border flex flex-col justify-between h-28 rounded-[24px]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider font-display">Leads pipeline</span>
            <div className="p-1 px-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <span className="text-xl font-display font-black text-primary-navy tracking-tight block">
              {reportData.totals.leads}
            </span>
            <span className="text-[9px] uppercase font-bold text-slate-500 font-display mt-0.5 block">Active Leads</span>
          </div>
        </div>

        {/* Metric B: Revenue booked (Page 19 total price formula) */}
        <div className="neu-flat p-4 bg-white border flex flex-col justify-between h-28 rounded-[24px]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider font-display">Revenue value</span>
            <div className="p-1 px-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <span className="text-xl font-display font-black text-emerald-600 tracking-tight block">
              ₹{(reportData.totals.totalRevenueEstimate / 10000000).toFixed(1)} Cr
            </span>
            <span className="text-[9px] uppercase font-bold text-slate-500 font-display mt-0.5 block">Booked Values</span>
          </div>
        </div>
      </div>

      {/* 3. VISUAL CONVERSION FUNNEL (Page 19 stages) */}
      <div className="rounded-[24px] neu-flat bg-white p-5 border space-y-4">
        <h3 className="text-xs font-bold text-premium-gold uppercase tracking-wider font-display flex items-center space-x-1.5">
          <ArrowDownWideNarrow className="w-4 h-4" />
          <span>SaaS Sales Conversion Funnel</span>
        </h3>

        <div className="space-y-3 pt-2 text-xs">
          {/* Stage 1: Registered */}
          <div className="space-y-1">
            <div className="flex justify-between font-semibold">
              <span className="text-primary-navy">1. Registered Leads</span>
              <span className="text-primary-navy font-mono">{reportData.totals.leads} leads</span>
            </div>
            <div className="w-full h-2.5 bg-input-bg rounded-full overflow-hidden">
              <div className="h-full bg-primary-navy" style={{ width: '100%' }} />
            </div>
          </div>

          {/* Stage 2: Contacted / Engaged */}
          <div className="space-y-1">
            <div className="flex justify-between font-semibold">
              <span className="text-primary-navy">2. Contacted & Engaged</span>
              <span className="text-text-secondary font-mono">{reportData.funnel.contacted} ({signupConversionRatios.contacted}%)</span>
            </div>
            <div className="w-full h-2.5 bg-input-bg rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500" style={{ width: `${signupConversionRatios.contacted}%` }} />
            </div>
          </div>

          {/* Stage 3: Site visit walked */}
          <div className="space-y-1">
            <div className="flex justify-between font-semibold">
              <span className="text-primary-navy">3. Site Tour Walked-In</span>
              <span className="text-text-secondary font-mono">{reportData.funnel.siteVisitVisited} ({signupConversionRatios.siteVisited}%)</span>
            </div>
            <div className="w-full h-2.5 bg-input-bg rounded-full overflow-hidden">
              <div className="h-full bg-blue-500" style={{ width: `${signupConversionRatios.siteVisited}%` }} />
            </div>
          </div>

          {/* Stage 4: Unit Booked */}
          <div className="space-y-1">
            <div className="flex justify-between font-semibold">
              <span className="text-primary-navy">4. Blocked & Final Bookings</span>
              <span className="text-emerald-600 font-mono">{reportData.funnel.booked} ({signupConversionRatios.booked}%)</span>
            </div>
            <div className="w-full h-2.5 bg-input-bg rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${signupConversionRatios.booked}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* 4. PERFORMANCE RATIOS AND SITE TOURS (Page 19) */}
      <div className="grid grid-cols-2 gap-4">
        {/* Site Tour conversion ratio scale */}
        <div className="neu-flat p-4 bg-white border rounded-[24px] space-y-2.5">
          <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block font-display">Tours host ratio</p>
          <div className="flex justify-between items-end">
            <span className="text-2xl font-black text-blue-600 font-display">{siteVisitRatio}%</span>
            <MapPin className="w-5 h-5 text-blue-400 shrink-0 mb-1" />
          </div>
          <p className="text-[9px] text-text-secondary leading-normal">
            Completed site tour walks against scheduled bookings.
          </p>
        </div>

        {/* Sales ratio scale */}
        <div className="neu-flat p-4 bg-white border rounded-[24px] space-y-2.5">
          <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block font-display">Total Booking Ratio</p>
          <div className="flex justify-between items-end">
            <span className="text-2xl font-black text-emerald-600 font-display">{conversionRate}%</span>
            <TrendingUp className="w-5 h-5 text-emerald-400 shrink-0 mb-1" />
          </div>
          <p className="text-[9px] text-text-secondary leading-normal">
            Overall lead conversion score across selected preset time.
          </p>
        </div>
      </div>

    </div>
  );
}
