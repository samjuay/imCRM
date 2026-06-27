/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../lib/store';
import { ArrowLeft, Bell, Key, Menu, ShieldCheck, UserCheck, UserPlus, X, Sun, Moon } from 'lucide-react';
import { UserRole, getInitials } from '../types';
import ImCrmLogo from './ImCrmLogo';

export default function AppHeader() {
  const { 
    activeUser, 
    activeTab, 
    setActiveTab,
    activeLeadId,
    setActiveLeadId,
    activeProjectId,
    setActiveProjectId,
    stats,
    darkMode,
    toggleDarkMode,
    logout,
    createUser,
    updateAvatar
  } = useAppStore();

  const [isOpenDropdown, setIsOpenDropdown] = useState(false);
  const [isOpenNotifications, setIsOpenNotifications] = useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        const success = await updateAvatar(base64);
        if (!success) {
          alert('Failed to update profile picture.');
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // User Creator States
  const [isOpenCreateUser, setIsOpenCreateUser] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('password');
  const [role, setRole] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !phone.trim() || !password.trim() || !role) {
      setCreateError('Please complete all form fields.');
      return;
    }
    setCreateError(null);
    setCreateSuccess(null);
    setIsSubmitting(true);

    try {
      const result = await createUser({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password: password.trim(),
        role
      });

      if (result.success) {
        setCreateSuccess(`Successfully created user ${result.user?.full_name}!`);
        setFullName('');
        setEmail('');
        setPhone('');
        setPassword('password');
        setTimeout(() => {
          setIsOpenCreateUser(false);
          setCreateSuccess(null);
        }, 2200);
      } else {
        setCreateError(result.error || 'Failed to create user.');
      }
    } catch (err: any) {
      setCreateError(err.message || 'Operation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (activeLeadId) {
      setActiveLeadId(null);
    } else if (activeProjectId) {
      setActiveProjectId(null);
    }
  };

  const getScreenTitle = () => {
    if (activeLeadId) return "Lead Details";
    if (activeProjectId) return "Project Inventory";
    
    switch (activeTab) {
      case 'dashboard': return 'ImCRM';
      case 'leads': return 'Leads System';
      case 'cold-calling': return 'Cold Calling Pipeline';
      case 'projects': return 'Projects';
      case 'reports': return 'Performance Reports';
      default: return 'ImCRM';
    }
  };

  const currentRoleLabel = (role: string) => {
    switch (role) {
      case UserRole.COMPANY_ADMIN: return 'Company Admin';
      case UserRole.TEAM_LEADER: return 'Team Leader';
      case UserRole.SALES_EXECUTIVE: return 'Sales Executive';
      default: return role;
    }
  };

  const activeUserAlerts = stats ? (stats.followupsDueToday + stats.overdueFollowups) : 0;

  return (
    <header className="sticky top-0 w-full h-16 flex items-center justify-between px-5 bg-white border-b border-border-color/60 z-40 select-none">
      {/* Left section: Hamburger / Back button */}
      <div className="flex items-center space-x-2">
        {(activeLeadId || activeProjectId) ? (
          <button 
            onClick={handleBack}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-input-bg active:scale-95 transition-transform border border-border-color"
            id="header-back-btn"
          >
            <ArrowLeft className="w-5 h-5 text-primary-navy" />
          </button>
        ) : (
          <div className="w-10 h-10 flex items-center justify-center rounded-full bg-[#0B1F33] shadow-inner overflow-hidden">
            <ImCrmLogo size="xs" showText={false} className="translate-y-0.5" />
          </div>
        )}
      </div>

      {/* Center: Title / Logo */}
      <div className="text-center flex-1">
        <h1 className="text-base font-display font-semibold tracking-tight text-primary-navy uppercase">
          {getScreenTitle()}
        </h1>
      </div>

      {/* Right section: Icons + Avatar */}
      <div className="flex items-center space-x-2 relative">
        {/* Dark Mode Toggle */}
        <button 
          onClick={toggleDarkMode}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-input-bg hover:bg-border-color/25 transition-colors border border-border-color/60 text-text-secondary"
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          id="dark-mode-toggle-btn"
        >
          {darkMode ? (
            <Sun className="w-4.5 h-4.5 text-warning fill-warning" />
          ) : (
            <Moon className="w-4.5 h-4.5 text-primary-navy fill-primary-navy" />
          )}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={() => setIsOpenNotifications(!isOpenNotifications)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-input-bg hover:bg-border-color/25 transition-colors border border-border-color/60"
            id="notifications-bell"
          >
            <Bell className="w-5 h-5 text-text-secondary" />
            {activeUserAlerts > 0 && (
              <span className="absolute top-1 right-1 w-4.5 h-4.5 bg-danger rounded-full flex items-center justify-center text-[9px] font-bold text-white border-2 border-white animate-bounce">
                {activeUserAlerts}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {isOpenNotifications && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl border border-border-color shadow-lg p-4 z-50 text-left animate-fade-in">
              <div className="flex justify-between items-center mb-2 pb-2 border-b border-border-color/50">
                <span className="text-xs font-semibold text-primary-navy">Action Center Alerts</span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-input-bg text-text-secondary">Today</span>
              </div>
              <div className="space-y-3 max-h-56 overflow-y-auto custom-scroll text-xs">
                {stats && stats.followupsDueToday > 0 ? (
                  <div className="flex items-start space-x-2 p-2 rounded-lg bg-warning/10 border-l-4 border-warning">
                    <div className="flex-1">
                      <p className="font-semibold text-primary-navy">Follow-ups Due Today</p>
                      <p className="text-[10px] text-text-secondary">You have {stats.followupsDueToday} followups scheduled for today.</p>
                    </div>
                  </div>
                ) : null}

                {stats && stats.overdueFollowups > 0 ? (
                  <div className="flex items-start space-x-2 p-2 rounded-lg bg-danger/10 border-l-4 border-danger">
                    <div className="flex-1">
                      <p className="font-semibold text-primary-navy">Overdue Task Alert!</p>
                      <p className="text-[10px] text-text-secondary">You missed {stats.overdueFollowups} scheduled lead callbacks.</p>
                    </div>
                  </div>
                ) : null}

                {stats && stats.siteVisitsToday > 0 ? (
                  <div className="flex items-start space-x-2 p-2 rounded-lg bg-info/10 border-l-4 border-info">
                    <div className="flex-1">
                      <p className="font-semibold text-primary-navy">Site Visits Today</p>
                      <p className="text-[10px] text-text-secondary">You are hosting {stats.siteVisitsToday} physical project tours today.</p>
                    </div>
                  </div>
                ) : null}

                {(!stats || (stats.followupsDueToday === 0 && stats.overdueFollowups === 0 && stats.siteVisitsToday === 0)) && (
                  <p className="text-center py-4 text-text-secondary text-[11px]">All clear! No current tasks require escalation.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile User avatar swapper */}
        <div className="relative">
          <button 
            onClick={() => setIsOpenDropdown(!isOpenDropdown)}
            className={`w-10 h-10 rounded-full overflow-hidden border-2 border-premium-gold shadow cursor-pointer active:scale-90 transition-transform flex items-center justify-center ${activeUser?.avatar_url ? 'bg-input-bg' : 'bg-black'}`}
            id="profile-dropdown-btn"
          >
            {activeUser?.avatar_url ? (
              <img 
                src={activeUser.avatar_url} 
                alt={activeUser.full_name} 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="text-xs font-semibold text-premium-gold font-display uppercase">
                {getInitials(activeUser?.full_name)}
              </span>
            )}
          </button>

          {/* User Profile & Log Out dropdown */}
          {isOpenDropdown && (
            <div className="absolute right-0 mt-2 w-60 bg-white rounded-3xl border border-border-color shadow-xl p-4.5 z-50 animate-fade-in text-left">
              <div className="mb-3 flex items-center space-x-2.5">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  title="Click to change profile picture"
                  className={`group relative w-10 h-10 rounded-full overflow-hidden border border-premium-gold flex items-center justify-center shrink-0 cursor-pointer hover:border-white transition-all shadow-md ${activeUser?.avatar_url ? 'bg-slate-100' : 'bg-black'}`}
                >
                  {activeUser?.avatar_url ? (
                    <img 
                      src={activeUser.avatar_url} 
                      alt={activeUser.full_name} 
                      className="w-full h-full object-cover group-hover:opacity-75 transition-opacity" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="text-[10px] font-bold text-premium-gold group-hover:opacity-35 transition-opacity">
                      {getInitials(activeUser?.full_name)}
                    </span>
                  )}
                  {/* Hover Change Camera Overlay */}
                  <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[7px] text-white font-extrabold uppercase tracking-wider text-center leading-none">Change</span>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-primary-navy truncate">{activeUser?.full_name}</p>
                  <p className="text-[9px] text-text-secondary truncate">{activeUser?.email}</p>
                </div>
              </div>

              {/* Hidden File Input */}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleAvatarChange} 
                accept="image/*" 
                className="hidden" 
              />

              <div className="h-[1px] bg-border-color/60 mb-3" />

              {activeUser && [UserRole.COMPANY_ADMIN, UserRole.TEAM_LEADER].includes(activeUser.role) && (
                <>
                  <button
                    onClick={() => {
                      setIsOpenDropdown(false);
                      setFullName('');
                      setEmail('');
                      setPhone('');
                      setPassword('password');
                      const defaultRole = activeUser.role === UserRole.COMPANY_ADMIN 
                        ? UserRole.TEAM_LEADER 
                        : UserRole.SALES_EXECUTIVE;
                      setRole(defaultRole);
                      setCreateError(null);
                      setCreateSuccess(null);
                      setIsOpenCreateUser(true);
                    }}
                    className="w-full h-9 mb-3 bg-[#0B1F33]/5 hover:bg-[#0B1F33]/10 text-primary-navy border border-border-color rounded-xl text-xs font-bold uppercase tracking-wider active:scale-[0.98] transition-all flex items-center justify-center space-x-1.5 cursor-pointer font-display"
                    id="header-create-user-trigger-btn"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-premium-gold" />
                    <span>Create User Workspace</span>
                  </button>
                  <div className="h-[1px] bg-border-color/30 mb-3" />
                </>
              )}
              
              <div className="bg-[#F8FAFC] rounded-2xl p-2.5 mb-3 border border-slate-100">
                <div className="flex justify-between items-center text-[9px] mb-1">
                  <span className="font-bold uppercase text-slate-400 tracking-wider">Database Security</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold uppercase text-[7px] tracking-wide">Verified</span>
                </div>
                <div className="flex items-center space-x-1.5 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-premium-gold" />
                  <span className="text-[10px] font-bold text-primary-navy uppercase tracking-wider font-display">
                    {currentRoleLabel(activeUser?.role || '')}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsOpenDropdown(false);
                  logout();
                }}
                className="w-full h-9 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 text-center rounded-xl text-xs font-bold uppercase tracking-wider active:scale-95 transition-transform flex items-center justify-center space-x-1 cursor-pointer animate-fade-in"
                id="header-logout-btn"
              >
                <span>Sign Out Workspace</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create User Dialog Modal */}
      {isOpenCreateUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="create-user-modal">
          <div className="bg-white rounded-[28px] border border-border-color w-full max-w-sm p-6 shadow-2xl relative animate-fade-in text-left">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 border-b border-border-color/50 pb-3">
              <div className="flex items-center space-x-2">
                <UserCheck className="w-5 h-5 text-premium-gold" />
                <h3 className="text-sm font-display font-bold text-primary-navy uppercase tracking-tight">Create Workspace User</h3>
              </div>
              <button 
                onClick={() => setIsOpenCreateUser(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-input-bg hover:bg-border-color/25 active:scale-90 transition-transform cursor-pointer"
                id="close-create-user-modal"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* Error / Success message */}
            {createError && (
              <div className="p-2.5 rounded-xl bg-red-50 text-red-600 border border-red-100 text-[10px] font-bold mb-4 leading-normal">
                {createError}
              </div>
            )}
            {createSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold mb-4 leading-normal">
                {createSuccess}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleCreateUserSubmit} className="space-y-4">
              <div>
                <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Robert Downey"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="neu-input w-full px-3.5 h-10 bg-[#F8FAFC] text-xs font-semibold text-primary-navy placeholder-slate-400 outline-none border border-slate-200 focus:border-premium-gold leading-none rounded-xl"
                  id="create-user-fullname"
                />
              </div>

              <div>
                <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1">
                  Work Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. robert@imcrm.co"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="neu-input w-full px-3.5 h-10 bg-[#F8FAFC] text-xs font-semibold text-primary-navy placeholder-slate-400 outline-none border border-slate-200 focus:border-premium-gold leading-none rounded-xl"
                  id="create-user-email"
                />
              </div>

              <div>
                <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="neu-input w-full px-3.5 h-10 bg-[#F8FAFC] text-xs font-semibold text-primary-navy placeholder-slate-400 outline-none border border-slate-200 focus:border-premium-gold leading-none rounded-xl"
                  id="create-user-phone"
                />
              </div>

              <div>
                <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 block mb-2">
                  Workspace Access Password
                </label>
                <input
                  type="text"
                  required
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="neu-input w-full px-3.5 h-10 bg-[#F8FAFC] text-xs font-semibold text-primary-navy placeholder-slate-400 outline-none border border-slate-200 focus:border-premium-gold leading-none rounded-xl"
                  id="create-user-password"
                />
              </div>

              <div>
                <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1">
                  System Permission Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="neu-input w-full px-3.5 h-10 bg-[#F8FAFC] text-xs font-semibold text-primary-navy outline-none border border-slate-200 focus:border-premium-gold rounded-xl cursor-pointer"
                  id="create-user-role-select"
                >
                  {activeUser?.role === UserRole.COMPANY_ADMIN && (
                    <>
                      <option value={UserRole.TEAM_LEADER}>Team Leader</option>
                      <option value={UserRole.SALES_EXECUTIVE}>Sales Executive</option>
                    </>
                  )}
                  {activeUser?.role === UserRole.TEAM_LEADER && (
                    <option value={UserRole.SALES_EXECUTIVE}>Sales Executive</option>
                  )}
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 neu-button-gold text-xs font-bold uppercase tracking-widest active:scale-95 disabled:opacity-50 transition-all border-none mt-2 flex items-center justify-center space-x-1 cursor-pointer"
                id="create-user-submit-btn"
              >
                <span>{isSubmitting ? 'Creating User...' : 'Provision User Access'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
