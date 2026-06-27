/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useAppStore } from './lib/store';
import AppHeader from './components/AppHeader';
import BottomNavigation from './components/BottomNavigation';
import SidebarNavigation from './components/SidebarNavigation';
import DashboardScreen from './components/DashboardScreen';
import LeadsScreen from './components/LeadsScreen';
import ProjectsScreen from './components/ProjectsScreen';
import ColdCallingScreen from './components/ColdCallingScreen';
import ReportsScreen from './components/ReportsScreen';
import LeadSourcesScreen from './components/LeadSourcesScreen';
import SkeletonLoader from './components/SkeletonLoader';
import LoginScreen from './components/LoginScreen';
import { Building2 } from 'lucide-react';

export default function App() {
  const { 
    activeUser, 
    activeTab, 
    checkSession, 
    darkMode 
  } = useAppStore();

  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await checkSession();
      } catch (e) {
        console.error("Session bootstrap failed", e);
      } finally {
        setIsInitializing(false);
      }
    };
    bootstrap();
  }, []);

  const renderActiveTabScreen = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardScreen />;
      case 'leads':
        return <LeadsScreen />;
      case 'cold-calling':
        return <ColdCallingScreen />;
      case 'projects':
        return <ProjectsScreen />;
      case 'reports':
        return <ReportsScreen />;
      case 'lead-sources':
        return <LeadSourcesScreen />;
      default:
        return <DashboardScreen />;
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-[#0B1F33] rounded-3xl flex items-center justify-center text-white mb-4 shadow-xl">
          <Building2 className="w-8 h-8 text-premium-gold stroke-[2.5]" />
        </div>
        <h3 className="text-sm font-display font-semibold text-[#0B1F33] uppercase tracking-wider mb-2">Syncing ImCRM realty system...</h3>
        <SkeletonLoader type="profile" />
      </div>
    );
  }

  if (!activeUser) {
    return (
      <div className={`min-h-screen w-full flex items-center justify-center select-none font-sans ${darkMode ? 'bg-[#0B121C]' : 'bg-[#F1F5F9]'}`}>
        <LoginScreen />
      </div>
    );
  }

  return (
    <div className={`min-h-screen w-full flex text-slate-800 font-sans overflow-hidden ${darkMode ? 'bg-[#0B121C] text-slate-100 dark-mode-container' : 'bg-[#F1F5F9]'}`}>
      
      {/* Tablet & Desktop Sidebar (Visible on screens >= 1280px) */}
      <div className="hidden xl:flex shrink-0">
        <SidebarNavigation />
      </div>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Header App sticky panel */}
        <AppHeader />

        {/* Primary Scrollable Workspace viewport containing respective system tabs */}
        <main className="flex-1 overflow-y-auto px-4 md:px-8 pt-6 pb-28 xl:pb-10 custom-scroll bg-[#F1F5F9] relative">
          <div className="w-full max-w-[1600px] mx-auto">
            {renderActiveTabScreen()}
          </div>
        </main>

        {/* Bottom Floating Pill Navigation (Visible ONLY on mobile/tablet < 1280px) */}
        <div className="xl:hidden">
          <BottomNavigation />
        </div>
      </div>
    </div>
  );
}
