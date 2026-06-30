/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { 
  User, Lead, ColdData, Project, ProjectConfiguration, DashboardStats, UserRole, LeadSource 
} from '../types';

interface AppState {
  // Authentication & Impersonation
  users: User[];
  activeUser: User | null;
  isLoadingUsers: boolean;
  
  // Navigation & UI Tabs
  activeTab: 'dashboard' | 'leads' | 'projects' | 'reports' | 'cold-calling' | 'lead-sources';
  activeLeadId: string | null;
  activeProjectId: string | null;
  activeDrawerCard: string | null;
  
  // App State Data
  stats: DashboardStats | null;
  leads: Lead[];
  leadsPage: number;
  leadsTotalCount: number;
  leadsTotalPages: number;
  
  activeLeadDetails: {
    lead: Lead;
    notes: any[];
    statusHistory: any[];
    followups: any[];
    siteVisits: any[];
    timeline: any[];
  } | null;

  coldRecords: ColdData[];
  projects: Project[];
  activeProjectDetails: {
    project: Project;
    configurations: ProjectConfiguration[];
  } | null;

  leadSources: LeadSource[];

  reportsData: any;
  reportsPreset: 'today' | 'this_week' | 'this_month' | 'custom';
  reportsFilterUserId: string;
  reportsFilterProjectId: string;
  reportsCustomDates: { start: string; end: string };

  // Global UX States
  isLoading: boolean;
  error: string | null;
  darkMode: boolean;
  offlineMode: boolean;

  // Actions
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  checkSession: () => Promise<boolean>;
  fetchUsers: () => Promise<void>;
  createUser: (userData: { fullName: string; email: string; phone: string; role: string; password?: string }) => Promise<{ success: boolean; user?: User; error?: string }>;
  setActiveUser: (user: User | null) => void;
  setActiveTab: (tab: AppState['activeTab']) => void;
  setActiveLeadId: (leadId: string | null) => void;
  setActiveProjectId: (projectId: string | null) => void;
  setActiveDrawerCard: (cardId: string | null) => void;

  // Data Actions
  fetchStats: () => Promise<void>;
  fetchLeads: (filters?: { 
    search?: string; 
    status?: string; 
    source?: string; 
    project?: string; 
    assignedTo?: string; 
    budget_min?: string; 
    budget_max?: string; 
    start_date?: string; 
    end_date?: string; 
    page?: number 
  }) => Promise<void>;
  fetchLeadDetails: (id: string) => Promise<void>;
  createLead: (leadData: any) => Promise<{ success: boolean; lead?: Lead; error?: string }>;
  updateLeadBasic: (id: string, updateData: any) => Promise<boolean>;
  updateLeadStatus: (
    id: string, 
    newStatus: string, 
    notes: string, 
    bookingAmount?: number,
    followup?: { scheduled_at: string; type: string; notes: string },
    site_visit?: { project_id: string; scheduled_date: string; scheduled_time: string; visitors_count: number; transport_arranged: boolean }
  ) => Promise<boolean>;
  deleteLead: (id: string) => Promise<boolean>;
  deleteProject: (id: string) => Promise<boolean>;
  
  scheduleFollowup: (leadId: string, followupData: { scheduled_at: string; type: string; notes: string }) => Promise<boolean>;
  completeFollowup: (followupId: string, outcomeNotes: string) => Promise<boolean>;
  
  scheduleSiteVisit: (leadId: string, visitData: { project_id: string; scheduled_date: string; scheduled_time: string; visitors_count: number; transport_arranged: boolean; notes: string }) => Promise<boolean>;
  updateSiteVisitStatus: (visitId: string, status: string, feedback: string) => Promise<boolean>;
  
  bulkReassignLeads: (leadIds: string[], targetUserId: string) => Promise<boolean>;
  bulkUpdateLeadsStatus: (leadIds: string[], targetStatus: string) => Promise<boolean>;
  bulkImportLeads: (leads: any[]) => Promise<{ success: boolean; importedCount: number; duplicateCount: number; error?: string }>;

  // Lead Sources Actions
  fetchLeadSources: () => Promise<void>;
  addLeadSource: (name: string) => Promise<{ success: boolean; error?: string }>;
  updateLeadSource: (id: string, name: string, is_active: boolean) => Promise<{ success: boolean; error?: string }>;

  // Cold Data Actions
  fetchColdData: (filters?: { search?: string; status?: string; sourceId?: string; assignedTo?: string }) => Promise<void>;
  updateColdStatus: (id: string, status: string, notes?: string) => Promise<boolean>;
  bulkUploadCold: (records: any[], assignedToUserId?: string) => Promise<{ success: boolean; addedCount: number; duplicateCount: number; results?: any[] }>;
  bulkAssignCold: (recordIds: string[], targetUserId: string) => Promise<boolean>;
  bulkDeleteCold: (recordIds: string[]) => Promise<boolean>;
  convertColdToLead: (id: string, conversionPayload: any) => Promise<{ success: boolean; lead?: Lead; error?: string }>;

  // Projects & Unit blockings
  fetchProjects: () => Promise<void>;
  fetchProjectDetails: (id: string) => Promise<void>;
  addProject: (payload: { name: string; city: string; builder_name?: string; rera_number?: string; location?: string; description?: string; possession_date?: string; custom_inventories?: any[] }) => Promise<{ success: boolean; error?: string }>;
  updateProject: (id: string, payload: { name?: string; city?: string; builder_name?: string; rera_number?: string; location?: string; description?: string; possession_date?: string; status?: string }) => Promise<{ success: boolean; error?: string }>;
  bulkImportProjects: (projects: any[]) => Promise<{ success: boolean; importedCount: number; duplicateCount: number; error?: string }>;

  // Reports
  fetchReports: () => Promise<void>;
  setReportsPreset: (preset: AppState['reportsPreset']) => void;
  setReportsFilterUserId: (userId: string) => void;
  setReportsFilterProjectId: (projectId: string) => void;
  setReportsCustomDates: (dates: { start: string; end: string }) => void;
  
  // Dark mode toggle helper
  toggleDarkMode: () => void;
  toggleOfflineMode: () => void;
  updateAvatar: (avatarUrl: string | null) => Promise<boolean>;
}

export const useAppStore = create<AppState>((set, get) => ({
  users: [],
  activeUser: null,
  isLoadingUsers: false,
  
  activeTab: 'dashboard',
  activeLeadId: null,
  activeProjectId: null,
  activeDrawerCard: null,
  
  stats: null,
  leads: [],
  leadsPage: 1,
  leadsTotalCount: 0,
  leadsTotalPages: 1,
  
  activeLeadDetails: null,
  coldRecords: [],
  projects: [],
  activeProjectDetails: null,
  leadSources: [],

  reportsData: null,
  reportsPreset: 'today',
  reportsFilterUserId: '',
  reportsFilterProjectId: '',
  reportsCustomDates: {
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  },

  isLoading: false,
  error: null,
  darkMode: false,
  offlineMode: false,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Authentication failed.' };
      }
      localStorage.setItem('imcrm_user_token', data.token);
      set({ activeUser: data.user, error: null });
      
      // Auto-fetch data on login
      get().fetchStats();
      get().fetchLeads({ page: 1 });
      get().fetchColdData();
      get().fetchProjects();
      get().fetchReports();
      get().fetchUsers();

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Server connection error.' };
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    localStorage.removeItem('imcrm_user_token');
    set({ 
      activeUser: null, 
      stats: null, 
      leads: [], 
      coldRecords: [], 
      projects: [], 
      reportsData: null,
      activeLeadId: null,
      activeProjectId: null
    });
  },

  checkSession: async () => {
    const token = localStorage.getItem('imcrm_user_token');
    if (!token) return false;
    try {
      const res = await fetch(`/api/auth/me?token=${token}`);
      if (res.ok) {
        const data = await res.json();
        set({ activeUser: data.user });
        
        // Auto-fetch data on valid session
        get().fetchStats();
        get().fetchLeads({ page: 1 });
        get().fetchColdData();
        get().fetchProjects();
        get().fetchReports();
        get().fetchUsers();

        return true;
      }
      localStorage.removeItem('imcrm_user_token');
      set({ activeUser: null });
      return false;
    } catch (e) {
      console.error("Session verification failed", e);
      return false;
    }
  },

  // Init users (no auto login default)
  fetchUsers: async () => {
    set({ isLoadingUsers: true });
    try {
      const res = await fetch('/api/auth/users');
      if (res.ok) {
        const data = await res.json();
        set({ users: data.users });
      }
    } catch (e) {
      console.error("Failed to load users", e);
    } finally {
      set({ isLoadingUsers: false });
    }
  },

  createUser: async (userData: any) => {
    const activeUser = get().activeUser;
    if (!activeUser) {
      return { success: false, error: "No active session found." };
    }
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/auth/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...userData,
          password: userData.password || 'password',
          creatorUserId: activeUser.id
        })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'User creation failed.' };
      }
      // Reload matching lists in state
      await get().fetchUsers();
      return { success: true, user: data.user };
    } catch (e) {
      console.error("Failed to create user", e);
      return { success: false, error: 'Network error or endpoint unavailable.' };
    } finally {
      set({ isLoading: false });
    }
  },

  setActiveUser: (user: User | null) => {
    set({ activeUser: user, activeLeadId: null, activeProjectId: null, stats: null });
    if (user) {
      get().fetchStats();
      get().fetchLeads({ page: 1 });
      get().fetchColdData();
      get().fetchProjects();
      get().fetchReports();
    }
  },

  setActiveTab: (tab) => {
    const isViewingLeadDetailFromDashboard = tab === 'leads' && get().activeLeadId !== null;
    set({ 
      activeTab: tab, 
      error: null,
      activeDrawerCard: (tab === 'dashboard' || isViewingLeadDetailFromDashboard) ? get().activeDrawerCard : null
    });
    if (tab === 'dashboard') get().fetchStats();
    if (tab === 'leads') get().fetchLeads({ page: 1 });
    if (tab === 'cold-calling') get().fetchColdData();
    if (tab === 'projects') get().fetchProjects();
    if (tab === 'reports') get().fetchReports();
  },

  setActiveLeadId: (leadId) => set({ activeLeadId: leadId }),
  setActiveProjectId: (projectId) => set({ activeProjectId: projectId }),
  setActiveDrawerCard: (cardId) => set({ activeDrawerCard: cardId }),

  toggleOfflineMode: () => set((state) => ({ offlineMode: !state.offlineMode })),
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),

  updateAvatar: async (avatarUrl) => {
    const user = get().activeUser;
    if (!user) return false;
    try {
      const res = await fetch('/api/auth/update-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, avatarUrl })
      });
      if (res.ok) {
        const data = await res.json();
        set({ activeUser: data.user });
        get().fetchUsers();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to update avatar:', e);
      return false;
    }
  },

  // Fetch Dashboard Smart KPI cards
  fetchStats: async () => {
    const user = get().activeUser;
    if (!user) return;
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/dashboard/stats?userId=${user.id}&role=${user.role}&companyId=${user.company_id}`);
      if (res.ok) {
        const data = await res.json();
        set({ stats: data.stats });
      } else {
        throw new Error('Could not fetch stats');
      }
    } catch (e: any) {
      set({ error: e.message || "Failed to load dashboard metrics" });
    } finally {
      set({ isLoading: false });
    }
  },

  // Fetch Leads search/filters/pagination (Page 11)
  fetchLeads: async (filters = {}) => {
    const user = get().activeUser;
    if (!user) return;
    set({ isLoading: true, error: null });
    
    const page = filters.page || get().leadsPage;
    let url = `/api/leads?userId=${user.id}&role=${user.role}&companyId=${user.company_id}&page=${page}`;
    
    if (filters.search) url += `&search=${encodeURIComponent(filters.search)}`;
    if (filters.status) url += `&status=${encodeURIComponent(filters.status)}`;
    if (filters.source) url += `&source=${encodeURIComponent(filters.source)}`;
    if (filters.project) url += `&project=${encodeURIComponent(filters.project)}`;
    if (filters.assignedTo) url += `&assignedTo=${encodeURIComponent(filters.assignedTo)}`;
    if (filters.budget_min) url += `&budget_min=${encodeURIComponent(filters.budget_min)}`;
    if (filters.budget_max) url += `&budget_max=${encodeURIComponent(filters.budget_max)}`;
    if (filters.start_date) url += `&start_date=${encodeURIComponent(filters.start_date)}`;
    if (filters.end_date) url += `&end_date=${encodeURIComponent(filters.end_date)}`;

    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        set({ 
          leads: data.leads,
          leadsPage: data.pagination.page,
          leadsTotalCount: data.pagination.totalCount,
          leadsTotalPages: data.pagination.totalPages
        });
      }
    } catch (e: any) {
      set({ error: e.message || "Failed to fetch leads list" });
    } finally {
      set({ isLoading: false });
    }
  },

  // Fetch complete Lead summary & Tab sections & Timeline (Page 11)
  fetchLeadDetails: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/leads/${id}`);
      if (res.ok) {
        const data = await res.json();
        set({ activeLeadDetails: data });
      } else {
        throw new Error('Lead details can not be retrieved');
      }
    } catch (e: any) {
      set({ error: e.message || "Failed to fetch lead profile" });
    } finally {
      set({ isLoading: false });
    }
  },

  // Create Lead + checking duplicates (Page 11 / 31)
  createLead: async (leadData) => {
    const user = get().activeUser;
    if (!user) return { success: false, error: 'User is not logged in.' };
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...leadData,
          company_id: user.company_id,
          created_by: user.id
        })
      });
      const data = await res.json();
      if (res.ok) {
        get().fetchLeads({ page: 1 });
        get().fetchStats();
        return { success: true, lead: data.lead };
      } else {
        return { success: false, error: data.error || 'Failed to generate lead' };
      }
    } catch (e: any) {
      return { success: false, error: e.message || "Server exception during lead creation" };
    } finally {
      set({ isLoading: false });
    }
  },

  updateLeadBasic: async (id, updateData) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      if (res.ok) {
        get().fetchLeadDetails(id);
        get().fetchLeads();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  // Status logs with notes (Page 11 timeline audit)
  updateLeadStatus: async (id, newStatus, notes, bookingAmount, followup, site_visit) => {
    const user = get().activeUser;
    if (!user) return false;
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/leads/${id}/status-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_status: newStatus,
          notes,
          user_id: user.id,
          booking_amount: bookingAmount,
          followup,
          site_visit
        })
      });
      if (res.ok) {
        get().fetchLeadDetails(id);
        get().fetchStats();
        get().fetchLeads();
        get().fetchReports();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  // Followup Scheduling (Page 12)
  scheduleFollowup: async (leadId, followupData) => {
    const user = get().activeUser;
    if (!user) return false;
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/leads/${leadId}/followups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...followupData,
          user_id: user.id
        })
      });
      if (res.ok) {
        get().fetchLeadDetails(leadId);
        get().fetchStats();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  completeFollowup: async (followupId, outcomeNotes) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/followups/${followupId}`, {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ outcome_notes: outcomeNotes, completed: true })
      });
      if (res.ok) {
        const lId = get().activeLeadId;
        if (lId) get().fetchLeadDetails(lId);
        get().fetchStats();
        get().fetchReports();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  // Site Visits (Page 12)
  scheduleSiteVisit: async (leadId, visitData) => {
    const user = get().activeUser;
    if (!user) return false;
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/leads/${leadId}/site-visits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...visitData,
          user_id: user.id
        })
      });
      if (res.ok) {
         get().fetchLeadDetails(leadId);
         get().fetchStats();
         get().fetchReports();
         return true;
      }
      return false;
    } catch (e) {
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  updateSiteVisitStatus: async (visitId, status, feedback) => {
    const user = get().activeUser;
    if (!user) return false;
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/site-visits/${visitId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, feedback, user_id: user.id })
      });
      if (res.ok) {
        const lId = get().activeLeadId;
        if (lId) get().fetchLeadDetails(lId);
        get().fetchStats();
        get().fetchReports();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  // Bulk reassignments (Page 12 / 24)
  bulkReassignLeads: async (leadIds, targetUserId) => {
    const user = get().activeUser;
    if (!user) return false;
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/leads/bulk-reassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds, targetUserId, managerId: user.id })
      });
      if (res.ok) {
        get().fetchLeads();
        get().fetchStats();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  bulkUpdateLeadsStatus: async (leadIds, targetStatus) => {
    const user = get().activeUser;
    if (!user) return false;
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/leads/bulk-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds, targetStatus, user_id: user.id })
      });
      if (res.ok) {
        get().fetchLeads();
        get().fetchStats();
        get().fetchReports();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  bulkImportLeads: async (leads) => {
    const user = get().activeUser;
    if (!user) return { success: false, importedCount: 0, duplicateCount: 0, error: 'Session not found.' };
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/leads/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads, createdBy: user.id })
      });
      const data = await res.json();
      if (res.ok) {
        get().fetchLeads({ page: 1 });
        get().fetchStats();
        get().fetchReports();
        return { success: true, importedCount: data.importedCount, duplicateCount: data.duplicateCount };
      } else {
        return { success: false, importedCount: 0, duplicateCount: 0, error: data.error || 'Import failed.' };
      }
    } catch (e: any) {
      console.error(e);
      return { success: false, importedCount: 0, duplicateCount: 0, error: e.message || 'Network error.' };
    } finally {
      set({ isLoading: false });
    }
  },


  // Cold calling dataset actions (Page 13)
  fetchColdData: async (filters = {}) => {
    const user = get().activeUser;
    if (!user) return;
    set({ isLoading: true, error: null });
    
    let url = `/api/cold-data?userId=${user.id}&role=${user.role}&companyId=${user.company_id}`;
    if (filters.search) url += `&search=${encodeURIComponent(filters.search)}`;
    if (filters.status) url += `&status=${encodeURIComponent(filters.status)}`;
    if (filters.sourceId) url += `&sourceId=${encodeURIComponent(filters.sourceId)}`;
    if (filters.assignedTo) url += `&assignedTo=${encodeURIComponent(filters.assignedTo)}`;

    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        set({ coldRecords: data.records });
      }
    } catch (e) {
      console.error(e);
    } finally {
      set({ isLoading: false });
    }
  },

  updateColdStatus: async (id, status, notes) => {
    const user = get().activeUser;
    if (!user) return false;
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/cold-data/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes })
      });
      if (res.ok) {
        get().fetchColdData();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  bulkUploadCold: async (records, assignedToUserId) => {
    const user = get().activeUser;
    if (!user) return { success: false, addedCount: 0, duplicateCount: 0 };
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/cold-data/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records,
          userId: user.id,
          companyId: user.company_id,
          assignedToUserId
        })
      });
      const data = await res.json();
      if (res.ok) {
         get().fetchColdData();
         return {
           success: true,
           addedCount: data.addedCount,
           duplicateCount: data.duplicateCount,
           results: data.results
         };
      }
      return { success: false, addedCount: 0, duplicateCount: 0, error: data.error };
    } catch (e) {
      return { success: false, addedCount: 0, duplicateCount: 0 };
    } finally {
      set({ isLoading: false });
    }
  },

  bulkAssignCold: async (recordIds, targetUserId) => {
    const user = get().activeUser;
    if (!user) return false;
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/cold-data/bulk-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordIds,
          targetUserId
        })
      });
      if (res.ok) {
        get().fetchColdData();
        return true;
      }
      return false;
    } catch (e) {
      console.error(e);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  bulkDeleteCold: async (recordIds) => {
    const user = get().activeUser;
    if (!user) return false;
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/cold-data/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordIds
        })
      });
      if (res.ok) {
        get().fetchColdData();
        get().fetchStats();
        return true;
      }
      return false;
    } catch (e) {
      console.error(e);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  // Qualification and Convert Workflow (Page 14)
  convertColdToLead: async (id, conversionPayload) => {
    const user = get().activeUser;
    if (!user) return { success: false, error: 'Must be logged in' };
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/cold-data/${id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...conversionPayload,
          user_id: user.id
        })
      });
      const data = await res.json();
      if (res.ok) {
        get().fetchColdData();
        get().fetchLeads();
        get().fetchStats();
        return { success: true, lead: data.lead };
      }
      return { success: false, error: data.error };
    } catch (e: any) {
      return { success: false, error: e.message || 'Server error' };
    } finally {
      set({ isLoading: false });
    }
  },


  // Projects and inventory unit levels (Page 15)
  fetchProjects: async () => {
    const user = get().activeUser;
    if (!user) return;
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/projects?companyId=${user.company_id}`);
      if (res.ok) {
        const data = await res.json();
        set({ projects: data.projects });
      }
    } catch (e) {
      console.error(e);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchProjectDetails: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (res.ok) {
        const data = await res.json();
        set({ activeProjectDetails: data });
      }
    } catch (e) {
      console.error(e);
    } finally {
      set({ isLoading: false });
    }
  },

  addProject: async (payload) => {
    const user = get().activeUser;
    if (!user) return { success: false, error: 'User is not logged in.' };
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          company_id: user.company_id
        })
      });
      const data = await res.json();
      if (res.ok) {
        get().fetchProjects();
        return { success: true };
      }
      return { success: false, error: data.error || 'Failed to add project.' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Server error.' };
    } finally {
      set({ isLoading: false });
    }
  },

  updateProject: async (id, payload) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        await get().fetchProjects();
        if (get().activeProjectId === id) {
          await get().fetchProjectDetails(id);
        }
        return { success: true };
      }
      return { success: false, error: data.error || 'Failed to update project.' };
    } catch (e: any) {
      console.error(e);
      return { success: false, error: e.message || 'An error occurred.' };
    } finally {
      set({ isLoading: false });
    }
  },

  bulkImportProjects: async (projectsList) => {
    const user = get().activeUser;
    if (!user) return { success: false, importedCount: 0, duplicateCount: 0, error: 'User not logged in.' };
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/projects/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projects: projectsList,
          companyId: user.company_id
        })
      });
      const data = await res.json();
      if (res.ok) {
        get().fetchProjects();
        return { 
          success: true, 
          importedCount: data.importedCount, 
          duplicateCount: data.duplicateCount 
        };
      }
      return { success: false, importedCount: 0, duplicateCount: 0, error: data.error || 'Failed to bulk import projects.' };
    } catch (e: any) {
      return { success: false, importedCount: 0, duplicateCount: 0, error: e.message || 'Server error' };
    } finally {
      set({ isLoading: false });
    }
  },


  // Reports engine (Page 17)
  fetchReports: async () => {
    const user = get().activeUser;
    if (!user) return;
    set({ isLoading: true, error: null });
    
    let url = `/api/reports?companyId=${user.company_id}&preset=${get().reportsPreset}`;
    if (get().reportsFilterUserId) {
      url += `&userId=${get().reportsFilterUserId}`;
    } else {
      url += `&userId=${user.id}`;
    }
    if (get().reportsFilterProjectId) {
      url += `&projectId=${get().reportsFilterProjectId}`;
    }
    if (get().reportsPreset === 'custom') {
      url += `&start=${get().reportsCustomDates.start}&end=${get().reportsCustomDates.end}`;
    }

    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        set({ reportsData: data.report });
      }
    } catch (e) {
      console.error(e);
    } finally {
      set({ isLoading: false });
    }
  },

  setReportsPreset: (preset) => {
    set({ reportsPreset: preset });
    get().fetchReports();
  },

  setReportsFilterUserId: (userId) => {
    set({ reportsFilterUserId: userId });
    get().fetchReports();
  },

  setReportsFilterProjectId: (projectId) => {
    set({ reportsFilterProjectId: projectId });
    get().fetchReports();
  },

  setReportsCustomDates: (dates) => {
    set({ reportsCustomDates: dates, reportsPreset: 'custom' });
    get().fetchReports();
  },

  deleteLead: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/leads/${id}`, { method: 'DELETE' });
      if (res.ok) {
        set({ activeLeadId: null, activeLeadDetails: null });
        await get().fetchLeads();
        await get().fetchStats();
        return true;
      }
      return false;
    } catch (e) {
      console.error(e);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteProject: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (res.ok) {
        set({ activeProjectId: null, activeProjectDetails: null });
        await get().fetchProjects();
        return true;
      }
      return false;
    } catch (e) {
      console.error(e);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchLeadSources: async () => {
    const user = get().activeUser;
    if (!user) return;
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/lead-sources?companyId=${user.company_id}`);
      if (res.ok) {
        const data = await res.json();
        set({ leadSources: data.leadSources || [] });
      }
    } catch (e) {
      console.error(e);
    } finally {
      set({ isLoading: false });
    }
  },

  addLeadSource: async (name) => {
    const user = get().activeUser;
    if (!user) return { success: false, error: 'User is not logged in.' };
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/lead-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          company_id: user.company_id
        })
      });
      const data = await res.json();
      if (res.ok) {
        await get().fetchLeadSources();
        return { success: true };
      }
      return { success: false, error: data.error || 'Failed to add lead source.' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Server error' };
    } finally {
      set({ isLoading: false });
    }
  },

  updateLeadSource: async (id, name, is_active) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/lead-sources/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, is_active })
      });
      const data = await res.json();
      if (res.ok) {
        await get().fetchLeadSources();
        return { success: true };
      }
      return { success: false, error: data.error || 'Failed to update lead source.' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Server error' };
    } finally {
      set({ isLoading: false });
    }
  }
}));
