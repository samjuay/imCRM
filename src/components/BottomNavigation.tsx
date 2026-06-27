/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useAppStore } from '../lib/store';
import { LayoutDashboard, Users, Building, BarChart3, PhoneCall } from 'lucide-react';

export default function BottomNavigation() {
  const { activeTab, setActiveTab, activeLeadId, activeProjectId } = useAppStore();

  const navItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'leads', label: 'Leads', icon: Users },
    { id: 'projects', label: 'Projects', icon: Building },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'cold-calling', label: 'Cold Calling', icon: PhoneCall },
  ] as const;

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-[92%] h-16 max-w-md z-30 select-none px-4">
      <nav className="neu-navbar flex items-center justify-between px-2 py-1.5 w-full h-full">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id && !activeLeadId && !activeProjectId;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl relative transition-all active:scale-90 ${
                isActive 
                  ? 'bg-premium-gold text-white font-bold font-display shadow-lg' 
                  : 'text-white/60 hover:text-white'
              }`}
              id={`nav-tab-${item.id}`}
            >
              <Icon className={`w-4 h-4 transition-transform ${isActive ? 'scale-110 text-white' : 'text-white/70'}`} />
              <span className="text-[8px] tracking-tight mt-0.5 leading-none font-display uppercase font-semibold">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
