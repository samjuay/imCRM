/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useAppStore } from '../lib/store';
import { LayoutDashboard, Users, Building, BarChart3, PhoneCall, LogOut, ShieldCheck, ListPlus } from 'lucide-react';
import { UserRole, getInitials } from '../types';
import ImCrmLogo from './ImCrmLogo';

export default function SidebarNavigation() {
  const { activeTab, setActiveTab, activeUser, logout, activeLeadId, activeProjectId } = useAppStore();

  const navItems = [
    { id: 'dashboard', label: 'Home Dashboard', icon: LayoutDashboard, desc: 'Performance stats & action' },
    { id: 'leads', label: 'Leads Pipeline', icon: Users, desc: 'Real estate leads list' },
    { id: 'projects', label: 'Project Inventory', icon: Building, desc: 'Physical towers & units' },
    { id: 'reports', label: 'Performance Reports', icon: BarChart3, desc: 'Team & company audits' },
    { id: 'cold-calling', label: 'Cold Calling', icon: PhoneCall, desc: 'Unassigned call pools' },
    { id: 'lead-sources', label: 'Lead Sources', icon: ListPlus, desc: 'Campaign acquisition channels' },
  ];

  const currentRoleLabel = (role: string) => {
    switch (role) {
      case UserRole.COMPANY_ADMIN: return 'Company Admin';
      case UserRole.TEAM_LEADER: return 'Team Leader';
      case UserRole.SALES_EXECUTIVE: return 'Sales Executive';
      default: return role;
    }
  };

  return (
    <aside className="w-72 bg-[#0B1F33] text-white flex flex-col h-screen sticky top-0 border-r border-[#1e293b]/50 select-none">
      {/* Brand & Identity */}
      <div className="p-5 border-b border-border-color/10 shrink-0">
        <ImCrmLogo size="sm" layout="horizontal" showText={true} />
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scroll">
        <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400 px-3 mb-3">
          Workspace Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id && !activeLeadId && !activeProjectId;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-2xl transition-all text-left group cursor-pointer ${
                isActive 
                  ? 'bg-premium-gold text-white font-bold shadow-md' 
                  : 'text-slate-300 hover:bg-[#15304b] hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-105 duration-200 ${isActive ? 'text-white' : 'text-[#C9A24D]'}`} />
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold block leading-none">{item.label}</span>
                <span className={`text-[9px] block mt-0.5 leading-none transition-colors ${isActive ? 'text-white/80' : 'text-slate-400 group-hover:text-slate-300'}`}>
                  {item.desc}
                </span>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Profile & Security Footing */}
      {activeUser && (
        <div className="p-4 border-t border-border-color/10 bg-[#071626] shrink-0 space-y-4">
          <div className="flex items-center space-x-3 p-1 rounded-xl">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-premium-gold bg-[#0B1521] flex items-center justify-center shrink-0">
              {activeUser.avatar_url ? (
                <img 
                  src={activeUser.avatar_url} 
                  alt={activeUser.full_name} 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="text-xs font-bold text-premium-gold">
                  {getInitials(activeUser.full_name)}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate leading-tight">{activeUser.full_name}</p>
              <div className="flex items-center space-x-1 mt-1">
                <ShieldCheck className="w-3 h-3 text-[#C9A24D]" />
                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wider font-display">
                  {currentRoleLabel(activeUser.role)}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full h-10 bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-300 border border-red-900/40 text-center rounded-xl text-xs font-bold uppercase tracking-wider active:scale-[0.98] transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Workspace</span>
          </button>
        </div>
      )}
    </aside>
  );
}
