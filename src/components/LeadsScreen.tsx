/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../lib/store';
import { LeadStatus, UserRole } from '../types';
import { 
  Building, Calendar, CheckSquare, ChevronRight, Download, Filter, 
  MessageSquare, MoreVertical, Plus, RotateCcw, Search, Trash2, Edit3,
  UserPlus, Users, X, Phone, Mail, MapPin, Tag, Landmark, BookOpen, Clock, Send, Upload, AlertTriangle, CheckCircle, FileSpreadsheet
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

const getInitialNotes = (statusHistory: any[]) => {
  if (!statusHistory || statusHistory.length === 0) return '';
  const record = statusHistory.find(
    (h: any) => h.previous_status === 'None' || (h.previous_status === 'New' && h.new_status === 'New')
  ) || statusHistory[statusHistory.length - 1];

  if (!record) return '';
  const note = record.remark || '';
  if (note === 'Lead creation lock' || note === 'Converted call database logging' || note === 'Bulk importing logging workflow') {
    return '';
  }
  return note;
};

const parseBudgetVal = (val: string | number) => {
  const num = Number(val);
  if (!num) return undefined;
  if (num <= 10000) {
    return num * 100000;
  }
  return num;
};

export default function LeadsScreen() {
  const { 
    activeUser,
    leads,
    leadsPage,
    leadsTotalPages,
    leadsTotalCount,
    fetchLeads,
    activeLeadId,
    setActiveLeadId,
    activeLeadDetails,
    fetchLeadDetails,
    createLead,
    updateLeadBasic,
    updateLeadStatus,
    scheduleFollowup,
    scheduleSiteVisit,
    bulkReassignLeads,
    bulkUpdateLeadsStatus,
    bulkImportLeads,
    projects,
    users: allUsers,
    fetchProjects,
    fetchUsers,
    offlineMode,
    leadSources,
    fetchLeadSources,
    deleteLead,
    activeDrawerCard,
    setActiveTab
  } = useAppStore();

  // Search & Filters panel states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [assignFilter, setAssignFilter] = useState('');
  const [budgetMinFilter, setBudgetMinFilter] = useState('');
  const [budgetMaxFilter, setBudgetMaxFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [isOpenFilterSheet, setIsOpenFilterSheet] = useState(false);

  // Bulk Lead Import states
  const [isOpenImportSheet, setIsOpenImportSheet] = useState(false);
  const [importCsvText, setImportCsvText] = useState('');
  const [importSelectedAssignee, setImportSelectedAssignee] = useState('');
  const [importResult, setImportResult] = useState<{ success: boolean; importedCount: number; duplicateCount: number; error?: string } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Selection states for Bulk Actions
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isOpenBulkSheet, setIsOpenBulkSheet] = useState(false);
  const [bulkTargetUser, setBulkTargetUser] = useState('');
  const [bulkTargetStatus, setBulkTargetStatus] = useState('');

  // Delete Lead Confirmation Modal states
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add / Edit Lead States
  const [isOpenCreateSheet, setIsOpenCreateSheet] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    alternate_phone: '',
    email: '',
    city: '',
    location: '',
    source: 'portal',
    project_interests: [] as string[],
    budget_min: '',
    budget_max: '',
    bedroom_preference: '2 BHK',
    carpet_area_min: '',
    carpet_area_max: '',
    assigned_to: '',
    initial_notes: ''
  });
  const [formError, setFormError] = useState('');
  const [editingLeadRecordId, setEditingLeadRecordId] = useState<string | null>(null);

  // Synchronize dynamic lead source default value
  useEffect(() => {
    if (leadSources && leadSources.length > 0) {
      setFormData(prev => ({
        ...prev,
        source: prev.source === 'portal' ? leadSources[0].id : prev.source
      }));
    }
  }, [leadSources]);

  // Core dynamic user filter logic for bulk imported assignments:
  // Company Admin can assign to TL (Team Leader) and SE (Sales Executive)
  // TL can assign to SE (Sales Executive)
  const assigneesForImport = allUsers.filter(u => {
    if (!activeUser) return false;
    if (activeUser.role === UserRole.COMPANY_ADMIN) {
      return u.role === UserRole.TEAM_LEADER || u.role === UserRole.SALES_EXECUTIVE;
    }
    if (activeUser.role === UserRole.TEAM_LEADER) {
      return u.role === UserRole.SALES_EXECUTIVE;
    }
    return false;
  });

  const handleMainCSVFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setImportCsvText(text);
    };
    reader.readAsText(file);
  };

  const downloadMainLeadTemplate = () => {
    const headers = "Name,Phone,Status,Followup Date (YYYY-MM-DD),Email,Source,Notes\n";
    const example = "Virat Kohli,9911223344,New,2026-06-25,virat@ipl.com,Walk-In,Interested in 3BHK high rises.\n";
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(headers + example);
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", "ImCRM_MainLeads_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleMainLeadCSVImport = async () => {
    if (!importCsvText.trim()) return;
    setIsImporting(true);
    setImportResult(null);

    const lines = importCsvText.split('\n');
    const leadsToImport: any[] = [];

    lines.forEach((line, index) => {
      if (index === 0 || !line.trim()) return; // skip header or empty rows
      const parts = line.split(',');
      if (parts.length >= 2) {
        // Name, Phone, Status, Followup Date, Email, Source, Notes
        const full_name = parts[0]?.trim();
        const phone = parts[1]?.trim();
        const statusVal = parts[2]?.trim() || '';
        const followupDate = parts[3]?.trim() || '';
        const email = parts[4]?.trim() || '';
        const source = parts[5]?.trim() || '';
        const notes = parts[6]?.trim() || '';

        if (full_name && phone) {
          leadsToImport.push({
            full_name,
            phone,
            status: statusVal || undefined,
            followupDate: followupDate || undefined,
            email: email || undefined,
            source: source || 'bulk_import',
            assignedTo: importSelectedAssignee || activeUser?.id,
            notes: notes || undefined
          });
        }
      }
    });

    if (leadsToImport.length === 0) {
      setImportResult({
        success: false,
        importedCount: 0,
        duplicateCount: 0,
        error: "No valid rows found to import. Verify template column format!"
      });
      setIsImporting(false);
      return;
    }

    try {
      const res = await bulkImportLeads(leadsToImport);
      setImportResult(res);
      if (res.success) {
        // Refresh leads list
        fetchLeads();
      }
    } catch (err: any) {
      setImportResult({
        success: false,
        importedCount: 0,
        duplicateCount: 0,
        error: err.message || "Something went wrong during import."
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Schedulers within Profile Tabs
  const [activeProfileTab, setActiveProfileTab] = useState<'overview' | 'notes' | 'followups' | 'site_visits' | 'status_update'>('overview');
  const [isOpenFollowupScheduler, setIsOpenFollowupScheduler] = useState(false);
  const [followupForm, setFollowupForm] = useState({
    scheduled_at: '',
    type: 'Call' as 'Call' | 'WhatsApp' | 'In-Person',
    notes: ''
  });

  const [isOpenSiteVisitScheduler, setIsOpenSiteVisitScheduler] = useState(false);
  const [visitForm, setVisitForm] = useState({
    project_id: '',
    scheduled_date: '',
    scheduled_time: '',
    visitors_count: '1',
    transport_arranged: false,
    notes: ''
  });

  const [statusUpdateForm, setStatusUpdateForm] = useState({
    newStatus: '',
    notes: '',
    outcome: '',
    lostReason: '',
    invalidReason: '',
    scheduleFollowupChecked: false,
    bookingAmount: '',
    followupDate: '',
    followupType: 'Call',
    followupNotes: '',
    visitProjectId: '',
    visitDate: '',
    visitTime: '12:00',
    visitVisitors: '1',
    visitTransport: false
  });

  const [newQuickNote, setNewQuickNote] = useState('');

  const handleFilterChange = (updates: {
    status?: string;
    source?: string;
    project?: string;
    assignedTo?: string;
  }) => {
    const newStatus = updates.status !== undefined ? updates.status : statusFilter;
    const newSource = updates.source !== undefined ? updates.source : sourceFilter;
    const newProject = updates.project !== undefined ? updates.project : projectFilter;
    const newAssign = updates.assignedTo !== undefined ? updates.assignedTo : assignFilter;

    if (updates.status !== undefined) setStatusFilter(updates.status);
    if (updates.source !== undefined) setSourceFilter(updates.source);
    if (updates.project !== undefined) setProjectFilter(updates.project);
    if (updates.assignedTo !== undefined) setAssignFilter(updates.assignedTo);

    syncFiltersToUrl({
      status: newStatus,
      source: newSource,
      project: newProject,
      assignedTo: newAssign,
    });

    fetchLeads({
      page: 1,
      search,
      status: newStatus,
      source: newSource,
      project: newProject,
      assignedTo: newAssign,
      budget_min: budgetMinFilter,
      budget_max: budgetMaxFilter,
      start_date: startDateFilter,
      end_date: endDateFilter
    });
  };

  // Helper to sync any changed filter parameters directly into the browser address bar
  const syncFiltersToUrl = (filters: {
    search?: string;
    status?: string;
    source?: string;
    project?: string;
    assignedTo?: string;
    budget_min?: string;
    budget_max?: string;
    start_date?: string;
    end_date?: string;
  }) => {
    const params = new URLSearchParams(window.location.search);
    
    if (filters.search !== undefined) {
      if (filters.search) params.set('q', filters.search);
      else params.delete('q');
    }
    if (filters.status !== undefined) {
      if (filters.status) params.set('status', filters.status);
      else params.delete('status');
    }
    if (filters.source !== undefined) {
      if (filters.source) params.set('source', filters.source);
      else params.delete('source');
    }
    if (filters.project !== undefined) {
      if (filters.project) params.set('project', filters.project);
      else params.delete('project');
    }
    if (filters.assignedTo !== undefined) {
      if (filters.assignedTo) params.set('assigned', filters.assignedTo);
      else params.delete('assigned');
    }
    if (filters.budget_min !== undefined) {
      if (filters.budget_min) params.set('budget_min', filters.budget_min);
      else params.delete('budget_min');
    }
    if (filters.budget_max !== undefined) {
      if (filters.budget_max) params.set('budget_max', filters.budget_max);
      else params.delete('budget_max');
    }
    if (filters.start_date !== undefined) {
      if (filters.start_date) params.set('start_date', filters.start_date);
      else params.delete('start_date');
    }
    if (filters.end_date !== undefined) {
      if (filters.end_date) params.set('end_date', filters.end_date);
      else params.delete('end_date');
    }

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({ path: newUrl }, '', newUrl);
  };

  const getSourceName = (sourceId: string | undefined) => {
    if (!sourceId) return 'N/A';
    const found = leadSources.find(s => s.id === sourceId);
    return found ? found.name : sourceId;
  };

  // Load and synchronize initial filters from URL Params on startup (Priority 6)
  useEffect(() => {
    fetchProjects();
    fetchUsers();
    fetchLeadSources();

    const params = new URLSearchParams(window.location.search);
    const urlSearch = params.get('q') || '';
    const urlStatus = params.get('status') || '';
    const urlSource = params.get('source') || '';
    const urlProject = params.get('project') || '';
    const urlAssigned = params.get('assigned') || '';
    const urlBudgetMin = params.get('budget_min') || '';
    const urlBudgetMax = params.get('budget_max') || '';
    const urlStartDate = params.get('start_date') || '';
    const urlEndDate = params.get('end_date') || '';
    const urlActiveLead = params.get('lead_id') || '';

    if (urlSearch) setSearch(urlSearch);
    if (urlStatus) setStatusFilter(urlStatus);
    if (urlSource) setSourceFilter(urlSource);
    if (urlProject) setProjectFilter(urlProject);
    if (urlAssigned) setAssignFilter(urlAssigned);
    if (urlBudgetMin) setBudgetMinFilter(urlBudgetMin);
    if (urlBudgetMax) setBudgetMaxFilter(urlBudgetMax);
    if (urlStartDate) setStartDateFilter(urlStartDate);
    if (urlEndDate) setEndDateFilter(urlEndDate);
    if (urlActiveLead) setActiveLeadId(urlActiveLead);

    // Initial fetch of leads with URL parameters
    fetchLeads({
      page: 1,
      search: urlSearch,
      status: urlStatus,
      source: urlSource,
      project: urlProject,
      assignedTo: urlAssigned,
      budget_min: urlBudgetMin,
      budget_max: urlBudgetMax,
      start_date: urlStartDate,
      end_date: urlEndDate
    });
  }, [activeUser]);

  // Sync URL when selected active lead ID is changed
  useEffect(() => {
    if (activeLeadId) {
      fetchLeadDetails(activeLeadId);
      setActiveProfileTab('overview');
      
      const params = new URLSearchParams(window.location.search);
      params.set('lead_id', activeLeadId);
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({ path: newUrl }, '', newUrl);
    } else {
      const params = new URLSearchParams(window.location.search);
      params.delete('lead_id');
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({ path: newUrl }, '', newUrl);
    }
  }, [activeLeadId]);

  // Sync status update form when active lead changes
  useEffect(() => {
    if (activeLeadDetails?.lead) {
      const currentStatus = activeLeadDetails.lead.status;
      const initialOutcomes = STATUS_OUTCOMES[currentStatus] || [];
      setStatusUpdateForm({
        newStatus: currentStatus,
        notes: '',
        outcome: initialOutcomes[0] || '',
        lostReason: '',
        invalidReason: '',
        scheduleFollowupChecked: currentStatus === LeadStatus.FOLLOWUP_SCHEDULED,
        bookingAmount: activeLeadDetails.lead.booking_amount?.toString() || '75000',
        followupDate: '',
        followupType: 'Call',
        followupNotes: '',
        visitProjectId: activeLeadDetails.lead.project_interests[0] || (projects[0]?.id || ''),
        visitDate: '',
        visitTime: '12:00',
        visitVisitors: '1',
        visitTransport: false
      });
    }
  }, [activeLeadDetails]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    syncFiltersToUrl({ search: val });
    fetchLeads({ 
      page: 1, 
      search: val, 
      status: statusFilter, 
      source: sourceFilter, 
      project: projectFilter, 
      assignedTo: assignFilter,
      budget_min: budgetMinFilter,
      budget_max: budgetMaxFilter,
      start_date: startDateFilter,
      end_date: endDateFilter
    });
  };

  const handleApplyFilters = () => {
    setIsOpenFilterSheet(false);
    syncFiltersToUrl({
      search,
      status: statusFilter,
      source: sourceFilter,
      project: projectFilter,
      assignedTo: assignFilter,
      budget_min: budgetMinFilter,
      budget_max: budgetMaxFilter,
      start_date: startDateFilter,
      end_date: endDateFilter
    });
    fetchLeads({ 
      page: 1, 
      search, 
      status: statusFilter, 
      source: sourceFilter, 
      project: projectFilter, 
      assignedTo: assignFilter,
      budget_min: budgetMinFilter,
      budget_max: budgetMaxFilter,
      start_date: startDateFilter,
      end_date: endDateFilter
    });
  };

  const handleResetFilters = () => {
    setStatusFilter('');
    setSourceFilter('');
    setProjectFilter('');
    setAssignFilter('');
    setBudgetMinFilter('');
    setBudgetMaxFilter('');
    setStartDateFilter('');
    setEndDateFilter('');
    setSearch('');
    setIsOpenFilterSheet(false);
    
    // Clear URL parameters
    const newUrl = window.location.pathname;
    window.history.replaceState({ path: newUrl }, '', newUrl);

    fetchLeads({ 
      page: 1, 
      search: '', 
      status: '', 
      source: '', 
      project: '', 
      assignedTo: '',
      budget_min: '',
      budget_max: '',
      start_date: '',
      end_date: ''
    });
  };

  // Checkbox lead checking
  const handleToggleSelectLead = (id: string) => {
    if (selectedLeadIds.includes(id)) {
      setSelectedLeadIds(selectedLeadIds.filter(x => x !== id));
    } else {
      setSelectedLeadIds([...selectedLeadIds, id]);
    }
  };

  // Submit Lead Form
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.full_name.trim()) return setFormError('Name is required.');
    if (!formData.phone.trim() || formData.phone.length < 8) return setFormError('Enter a valid mobile number.');

    const compositeBedroomPref = `${formData.bedroom_preference || '2 BHK'}|${formData.carpet_area_min || ''}|${formData.carpet_area_max || ''}`;

    if (editingLeadRecordId) {
      const ok = await updateLeadBasic(editingLeadRecordId, {
        ...formData,
        bedroom_preference: compositeBedroomPref,
        source_id: formData.source,
        project_interests: formData.project_interests,
        budget_min: parseBudgetVal(formData.budget_min),
        budget_max: parseBudgetVal(formData.budget_max)
      });
      if (ok) {
        setIsOpenCreateSheet(false);
        setEditingLeadRecordId(null);
        // Reset form
        setFormData({
          full_name: '',
          phone: '',
          alternate_phone: '',
          email: '',
          city: '',
          location: '',
          source: (leadSources && leadSources.length > 0) ? leadSources[0].id : '',
          project_interests: [],
          budget_min: '',
          budget_max: '',
          bedroom_preference: '2 BHK',
          carpet_area_min: '',
          carpet_area_max: '',
          assigned_to: '',
          initial_notes: ''
        });
      } else {
        setFormError('Failed to update lead data.');
      }
      return;
    }

    const resResult = await createLead({
      ...formData,
      bedroom_preference: compositeBedroomPref,
      source_id: formData.source,
      project_interests: formData.project_interests,
      budget_min: parseBudgetVal(formData.budget_min),
      budget_max: parseBudgetVal(formData.budget_max)
    });

    if (resResult.success) {
      setIsOpenCreateSheet(false);
      // Reset form
      setFormData({
        full_name: '',
        phone: '',
        alternate_phone: '',
        email: '',
        city: '',
        location: '',
        source: (leadSources && leadSources.length > 0) ? leadSources[0].id : '',
        project_interests: [],
        budget_min: '',
        budget_max: '',
        bedroom_preference: '2 BHK',
        carpet_area_min: '',
        carpet_area_max: '',
        assigned_to: '',
        initial_notes: ''
      });
    } else {
      setFormError(resResult.error || 'Failed to submit form.');
    }
  };

  // Submit bulk reassignment
  const handleBulkReassign = async () => {
    if (!bulkTargetUser) return;
    const ok = await bulkReassignLeads(selectedLeadIds, bulkTargetUser);
    if (ok) {
      setSelectedLeadIds([]);
      setIsOpenBulkSheet(false);
      setBulkTargetUser('');
    }
  };

  // Submit bulk status
  const handleBulkStatusUpdate = async () => {
    if (!bulkTargetStatus) return;
    const ok = await bulkUpdateLeadsStatus(selectedLeadIds, bulkTargetStatus);
    if (ok) {
      setSelectedLeadIds([]);
      setIsOpenBulkSheet(false);
      setBulkTargetStatus('');
    }
  };

  // Mock Export CSV (Page 12 bulk export for Team Leaders and Company Admins)
  const handleBulkExportCSV = () => {
    const authorizedPool = [UserRole.TEAM_LEADER, UserRole.COMPANY_ADMIN] as string[];
    if (!activeUser || !authorizedPool.includes(activeUser.role)) {
      alert("Only Team Leaders and Company Admins have CSV export clearances.");
      return;
    }

    const selectedLeads = leads.filter(l => selectedLeadIds.includes(l.id));
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Name,Phone,Email,Status,Source"].join(",") + "\n"
      + selectedLeads.map(l => `"${l.full_name}","${l.phone}","${l.email || ''}","${l.status}","${l.source_id}"`).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ImCRM_Leads_Export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setSelectedLeadIds([]);
  };

  const handleAddQuickNote = async () => {
    if (!newQuickNote.trim() || !activeLeadId) return;
    const ok = await updateLeadStatus(activeLeadId, activeLeadDetails?.lead.status || LeadStatus.NEW, newQuickNote);
    if (ok) {
      setNewQuickNote('');
    }
  };

  const handleSubmitFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followupForm.scheduled_at || !activeLeadId) return;
    const ok = await scheduleFollowup(activeLeadId, followupForm);
    if (ok) {
      setIsOpenFollowupScheduler(false);
      setFollowupForm({ scheduled_at: '', type: 'Call', notes: '' });
    }
  };

  const handleSubmitSiteVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitForm.project_id || !visitForm.scheduled_date || !visitForm.scheduled_time || !activeLeadId) return;
    const ok = await scheduleSiteVisit(activeLeadId, {
      ...visitForm,
      visitors_count: Number(visitForm.visitors_count) || 1
    });
    if (ok) {
      setIsOpenSiteVisitScheduler(false);
      setVisitForm({ project_id: '', scheduled_date: '', scheduled_time: '', visitors_count: '1', transport_arranged: false, notes: '' });
    }
  };

  const toggleFormProjectInterest = (projId: string) => {
    const currents = [...formData.project_interests];
    if (currents.includes(projId)) {
      setFormData({ ...formData, project_interests: currents.filter(id => id !== projId) });
    } else {
      setFormData({ ...formData, project_interests: [...currents, projId] });
    }
  };

  return (
    <div className="flex flex-col select-none pb-28 min-h-[70vh]">
      {/* 1. SINGLE LEAD DETAIL VIEW (Page 11-12) */}
      {activeLeadId ? (
        !activeLeadDetails || activeLeadDetails.lead.id !== activeLeadId ? (
          <div className="space-y-5 animate-fade-in text-left">
            {/* Back button */}
            <button 
              onClick={() => {
                if (activeDrawerCard) {
                  setActiveLeadId(null);
                  setActiveTab('dashboard');
                } else {
                  setActiveLeadId(null);
                }
              }} 
              className="flex items-center space-x-1 text-xs font-bold text-[#0B1F33] bg-[#0B1F33]/5 hover:bg-[#0B1F33]/10 px-3 py-1.5 rounded-xl border border-[#0B1F33]/15 cursor-pointer max-w-fit"
            >
              <span>&larr; {activeDrawerCard ? 'Back to Dashboard Card' : 'Back to Leads Pipeline'}</span>
            </button>
            <div className="rounded-[24px] bg-white border border-slate-200 p-6 shadow-sm">
              <SkeletonLoader type="list" count={3} />
            </div>
          </div>
        ) : (
          <div className="space-y-5 animate-fade-in text-left">
          {/* Back button */}
          <button 
            onClick={() => {
              if (activeDrawerCard) {
                setActiveLeadId(null);
                setActiveTab('dashboard');
              } else {
                setActiveLeadId(null);
              }
            }} 
            className="flex items-center space-x-1 text-xs font-bold text-[#0B1F33] bg-[#0B1F33]/5 hover:bg-[#0B1F33]/10 px-3 py-1.5 rounded-xl border border-[#0B1F33]/15 cursor-pointer max-w-fit"
          >
            <span>&larr; {activeDrawerCard ? 'Back to Dashboard Card' : 'Back to Leads Pipeline'}</span>
          </button>

          {/* DESKTOP TWO-COLUMN LAYOUT FOR INTENSE B2B SaaS COCKPIT */}
          <div className="hidden xl:grid grid-cols-3 gap-6 items-start">
            
            {/* LEFT COLUMN: Lead profile & preferences (1 Column) */}
            <div className="col-span-1 space-y-5">
              {/* Profile card */}
              <div className="rounded-[24px] bg-white border border-slate-200 p-6 space-y-4 shadow-sm">
                <div className="space-y-1">
                  <span className="text-[9px] text-premium-gold font-bold uppercase tracking-widest block font-display">Active Customer Profile</span>
                  <h2 className="text-xl font-display font-bold text-[#0B1F33] tracking-tight">{activeLeadDetails.lead.full_name}</h2>
                  <div className="space-y-1 text-slate-500 text-xs pt-1">
                    <div className="flex items-center space-x-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <a href={`tel:${activeLeadDetails.lead.phone}`} className="hover:underline font-mono font-medium">{activeLeadDetails.lead.phone}</a>
                    </div>
                    {activeLeadDetails.lead.email && (
                      <div className="flex items-center space-x-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{activeLeadDetails.lead.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3.5 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wide">Origin Source</span>
                    <span className="font-semibold text-[#0B1F33] font-display">{getSourceName(activeLeadDetails.lead.source_id)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wide">Pipeline Status</span>
                    <span className="text-[10px] font-bold bg-[#0B1F33]/5 text-[#0B1F33] px-2.5 py-1 rounded-full border border-slate-200 inline-block mt-0.5">{activeLeadDetails.lead.status}</span>
                  </div>
                </div>
              </div>

              {/* Preferences Card */}
              <div className="rounded-[24px] bg-white border border-slate-200 p-6 space-y-4 shadow-sm">
                <h3 className="text-xs font-bold text-premium-gold uppercase tracking-wider font-display border-b border-slate-100 pb-2">Target Preferences</h3>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Preferred City</span>
                    <span className="font-bold text-primary-navy font-display">{activeLeadDetails.lead.city || 'Delhi/NCR'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Local Location</span>
                    <span className="font-bold text-primary-navy font-display">{activeLeadDetails.lead.location || 'Any'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Configuration Preference</span>
                    <span className="font-bold text-primary-navy font-mono">{(activeLeadDetails.lead.bedroom_preference || '').split('|')[0] || 'Unstated'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Carpet Area Preference</span>
                    <span className="font-bold text-primary-navy font-mono">
                      {(() => {
                        const parts = (activeLeadDetails.lead.bedroom_preference || '').split('|');
                        const min = parts[1];
                        const max = parts[2];
                        if (min && max) return `${min} to ${max} sqft`;
                        if (min) return `>= ${min} sqft`;
                        if (max) return `<= ${max} sqft`;
                        return 'Any';
                      })()}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-400 block">Interested Projects</span>
                    <span className="font-bold text-primary-navy font-display">
                      {(activeLeadDetails.lead.project_interests || [])
                        .map((projId: string) => projects.find(p => p.id === projId)?.name)
                        .filter(Boolean)
                        .join(', ') || 'None Selected'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-400 block">Pricing Budget</span>
                    <span className="font-bold text-[#0B1F33] font-mono whitespace-nowrap">₹{((activeLeadDetails.lead.budget_min || 0)/100000).toFixed(0)}L to ₹{((activeLeadDetails.lead.budget_max || 100000000)/100000).toFixed(0)}L</span>
                  </div>
                </div>
              </div>

              {/* Initial Summary Notes Card */}
              <div className="rounded-[24px] bg-white border border-slate-200 p-6 space-y-3 shadow-sm text-xs text-left">
                <h3 className="text-xs font-bold text-premium-gold uppercase tracking-wider font-display border-b border-slate-100 pb-2">Initial Summary Notes</h3>
                <p className="text-slate-600 leading-normal italic">
                  {getInitialNotes(activeLeadDetails.statusHistory) || 'No initial notes logged.'}
                </p>
              </div>

              {/* Personnel Metadata */}
              <div className="rounded-[24px] bg-white border border-slate-200 p-6 space-y-3 shadow-sm text-xs">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-display border-b border-slate-100 pb-2">CRM Allocation</h3>
                <div className="space-y-2">
                  <p className="flex justify-between">
                    <span className="text-slate-400">Assigned To:</span>
                    <span className="font-bold text-[#0B1F33]">{allUsers.find(u => u.id === activeLeadDetails.lead.assigned_to)?.full_name || 'Unassigned'}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-400">Registered Date:</span>
                    <span className="font-medium text-slate-500 font-mono">{new Date(activeLeadDetails.lead.created_at).toLocaleDateString('en-IN', {day:'2-digit', month: 'short', year:'numeric'})}</span>
                  </p>
                </div>
              </div>

              {/* CRM Records Actions (Phase 4 Leads Actions) */}
              <div className="rounded-[24px] bg-white border border-slate-200 p-6 space-y-4 shadow-sm text-xs" id="lead_metadata_record_actions">
                <h3 className="text-xs font-bold text-premium-gold uppercase tracking-wider font-display border-b border-slate-100 pb-2">CRM Records Actions</h3>
                <div className="space-y-2">
                  {/* Edit Lead Button */}
                  <button
                    onClick={() => {
                      // Pre-fill creation form fields with selected lead's active content to Edit
                      const parts = (activeLeadDetails.lead.bedroom_preference || '').split('|');
                      setFormData({
                        full_name: activeLeadDetails.lead.full_name,
                        phone: activeLeadDetails.lead.phone,
                        alternate_phone: activeLeadDetails.lead.alternate_phone || '',
                        email: activeLeadDetails.lead.email || '',
                        city: activeLeadDetails.lead.city || '',
                        location: activeLeadDetails.lead.location || '',
                        source: activeLeadDetails.lead.source_id,
                        project_interests: activeLeadDetails.lead.project_interests || [],
                        budget_min: activeLeadDetails.lead.budget_min?.toString() || '',
                        budget_max: activeLeadDetails.lead.budget_max?.toString() || '',
                        bedroom_preference: parts[0] || '2 BHK',
                        carpet_area_min: parts[1] || '',
                        carpet_area_max: parts[2] || '',
                        assigned_to: activeLeadDetails.lead.assigned_to || '',
                        initial_notes: getInitialNotes(activeLeadDetails.statusHistory)
                      });
                      setEditingLeadRecordId(activeLeadDetails.lead.id);
                      setIsOpenCreateSheet(true);
                    }}
                    className="w-full h-10 bg-slate-50 border border-slate-200 text-[#0B1F33] hover:bg-slate-100 font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Edit3 className="w-4 h-4 text-violet-600" />
                    <span>Edit Lead Metadata</span>
                  </button>

                  {/* Danger Zone: Admin-only Delete Lead */}
                  {activeUser.role === UserRole.COMPANY_ADMIN && (
                    <button
                      onClick={() => setIsDeleteDialogOpen(true)}
                      className="w-full h-10 bg-rose-50 border border-rose-100 text-rose-700 hover:bg-rose-100 hover:text-rose-800 font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Lead Record</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Action modules stack (2 Columns) */}
            <div className="col-span-2 space-y-5">
              
              {/* Module 1: Unified Status Updates & Action Triggers */}
              <div className="bg-slate-50 rounded-3xl border border-slate-200 p-6 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <div>
                    <h3 className="text-xs font-bold text-primary-navy uppercase tracking-wider font-display">Update Lead State & Status</h3>
                    <p className="text-[10px] text-slate-500">Coordinate and log followups, walks, and reservations seamlessly.</p>
                  </div>
                </div>

                {/* Inline copy of the form for desktop view */}
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const status = statusUpdateForm.newStatus;
                    const outcome = statusUpdateForm.outcome;
                    const lostReason = statusUpdateForm.lostReason;
                    const invalidReason = statusUpdateForm.invalidReason;
                    const notes = statusUpdateForm.notes;
                    const bookingAmount = Number(statusUpdateForm.bookingAmount) || 0;

                    if (!status) { alert('Please select a target status.'); return; }
                    if (!notes.trim()) { alert('Status transition notes are mandatory.'); return; }

                    let richNotes = `Outcome: ${outcome}`;
                    if (status === LeadStatus.LOST && lostReason) richNotes += ` | Lost Reason: ${lostReason}`;
                    else if (status === LeadStatus.INVALID && invalidReason) richNotes += ` | Invalid Reason: ${invalidReason}`;
                    richNotes += ` | Remarks: ${notes.trim()}`;

                    const isExempted = [
                      LeadStatus.NEW,
                      LeadStatus.NOT_INTERESTED,
                      LeadStatus.LOST,
                      LeadStatus.BOOKING_DONE,
                      LeadStatus.INVALID
                    ].includes(status as LeadStatus);

                    let followupPayload = undefined;
                    if (!isExempted && status !== LeadStatus.SITE_VISIT_SCHEDULED) {
                      if (!statusUpdateForm.followupDate) {
                        alert('Please select a valid follow-up date.');
                        return;
                      }
                      followupPayload = {
                        scheduled_at: statusUpdateForm.followupDate,
                        type: statusUpdateForm.followupType,
                        notes: statusUpdateForm.followupNotes || `Scheduled during ${status} status update.`
                      };
                    }

                    let visitPayload = undefined;
                    if (status === LeadStatus.SITE_VISIT_SCHEDULED) {
                      if (!statusUpdateForm.visitProjectId || !statusUpdateForm.visitDate) {
                        alert('Site visit Project interest and scheduled date are mandatory.');
                        return;
                      }
                      visitPayload = {
                        project_id: statusUpdateForm.visitProjectId,
                        scheduled_date: statusUpdateForm.visitDate,
                        scheduled_time: statusUpdateForm.visitTime,
                        visitors_count: Number(statusUpdateForm.visitVisitors) || 1,
                        transport_arranged: statusUpdateForm.visitTransport
                      };
                    }

                    const ok = await updateLeadStatus(
                      activeLeadId,
                      status,
                      richNotes,
                      bookingAmount,
                      followupPayload,
                      visitPayload
                    );

                    if (ok) {
                      fetchLeadDetails(activeLeadId);
                    } else {
                      alert('Sync update failed.');
                    }
                  }}
                  className="grid grid-cols-2 gap-4 text-xs text-left"
                >
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Target Lead Status</label>
                    <select
                      value={statusUpdateForm.newStatus}
                      onChange={(e) => {
                        const st = e.target.value as LeadStatus;
                        const outcomes = STATUS_OUTCOMES[st] || [];
                        setStatusUpdateForm({
                          ...statusUpdateForm,
                          newStatus: st,
                          outcome: outcomes[0] || '',
                          lostReason: '',
                          invalidReason: ''
                        });
                      }}
                      className="w-full h-10 px-3 border border-slate-205 bg-white text-xs text-primary-navy font-semibold rounded-xl focus:outline-none"
                    >
                      {Object.values(LeadStatus).map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase">Outcome / Substate *</label>
                    <select
                      value={statusUpdateForm.outcome}
                      onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, outcome: e.target.value })}
                      className="w-full h-10 px-3 border border-slate-205 bg-white text-xs rounded-xl text-primary-navy font-semibold focus:outline-none"
                      required
                    >
                      <option value="">Select Outcome...</option>
                      {(STATUS_OUTCOMES[statusUpdateForm.newStatus as LeadStatus] || []).map(oct => (
                        <option key={oct} value={oct}>{oct}</option>
                      ))}
                    </select>
                  </div>

                  {statusUpdateForm.newStatus === LeadStatus.LOST && (
                    <div className="col-span-2 space-y-1 animate-fade-in">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Lost Reason *</label>
                      <select
                        value={statusUpdateForm.lostReason}
                        onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, lostReason: e.target.value })}
                        className="w-full h-10 px-3 border border-slate-205 bg-white rounded-xl text-primary-navy font-semibold focus:outline-none"
                        required
                      >
                        <option value="">Select reason...</option>
                        {LOST_REASONS.map(lr => <option key={lr} value={lr}>{lr}</option>)}
                      </select>
                    </div>
                  )}

                  {statusUpdateForm.newStatus === LeadStatus.INVALID && (
                    <div className="col-span-2 space-y-1 animate-fade-in">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Invalid Reason *</label>
                      <select
                        value={statusUpdateForm.invalidReason}
                        onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, invalidReason: e.target.value })}
                        className="w-full h-10 px-3 border border-slate-205 bg-white rounded-xl text-primary-navy font-semibold focus:outline-none"
                        required
                      >
                        <option value="">Select reason...</option>
                        {INVALID_REASONS.map(ir => <option key={ir} value={ir}>{ir}</option>)}
                      </select>
                    </div>
                  )}

                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Audit Comments & Remarks *</label>
                    <textarea
                      value={statusUpdateForm.notes}
                      onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, notes: e.target.value })}
                      placeholder="Type details of client response..."
                      className="w-full p-3 h-16 border border-slate-205 bg-white rounded-xl text-xs placeholder-slate-400 text-primary-navy font-medium resize-none focus:outline-none"
                      required
                    />
                  </div>

                  {/* Scheduled followups segment */}
                  {![LeadStatus.NEW, LeadStatus.NOT_INTERESTED, LeadStatus.LOST, LeadStatus.BOOKING_DONE, LeadStatus.INVALID].includes(statusUpdateForm.newStatus as LeadStatus) && statusUpdateForm.newStatus !== LeadStatus.SITE_VISIT_SCHEDULED && (
                    <div className="col-span-2 p-4 bg-amber-50/40 rounded-2xl border border-amber-200/60 grid grid-cols-2 gap-3 animate-fade-in">
                      <div className="col-span-2">
                        <span className="text-[10px] uppercase font-bold text-amber-800">Assign Mandatory Follow-up Call *</span>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-semibold text-slate-500">Date & Time *</label>
                        <input
                          type="datetime-local"
                          value={statusUpdateForm.followupDate}
                          onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, followupDate: e.target.value })}
                          className="w-full h-9 px-2 text-[11px] border border-amber-205 bg-white rounded-lg text-primary-navy"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-semibold text-slate-500">Callback Notes</label>
                        <input
                          type="text"
                          value={statusUpdateForm.followupNotes}
                          onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, followupNotes: e.target.value })}
                          placeholder="Call back for feedback"
                          className="w-full h-9 px-2 text-[11px] border border-amber-205 bg-white rounded-lg text-primary-navy"
                        />
                      </div>
                    </div>
                  )}

                  {/* Site Tour booking details */}
                  {statusUpdateForm.newStatus === LeadStatus.SITE_VISIT_SCHEDULED && (
                    <div className="col-span-2 p-4 bg-blue-50/40 rounded-2xl border border-blue-200/60 space-y-3 animate-fade-in">
                      <span className="text-[10px] uppercase font-bold text-blue-800">Set Property Walk-in Tour *</span>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-semibold text-slate-500">Project *</label>
                          <select
                            value={statusUpdateForm.visitProjectId}
                            onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, visitProjectId: e.target.value })}
                            className="w-full h-9 px-2 text-[11px] border border-blue-150 bg-white rounded-lg"
                            required
                          >
                            <option value="">Select Project...</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-semibold text-slate-500 font-mono">Date *</label>
                          <input
                            type="date"
                            value={statusUpdateForm.visitDate}
                            onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, visitDate: e.target.value })}
                            className="w-full h-9 px-2 text-[11px] border border-blue-150 bg-white rounded-lg font-mono"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-semibold text-slate-500 font-mono">Time</label>
                          <input
                            type="time"
                            value={statusUpdateForm.visitTime}
                            onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, visitTime: e.target.value })}
                            className="w-full h-9 px-2 text-[11px] border border-blue-150 bg-white rounded-lg font-mono"
                          />
                        </div>
                        <div className="flex items-center space-x-2 pt-4">
                          <input
                            type="checkbox"
                            checked={statusUpdateForm.visitTransport}
                            onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, visitTransport: e.target.checked })}
                            className="rounded text-blue-500 focus:ring-blue-400 h-3.5 w-3.5 cursor-pointer"
                          />
                          <span className="text-[10px] font-semibold text-slate-600">Arrange Agency Cab</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Booking reservation logs */}
                  {statusUpdateForm.newStatus === LeadStatus.BOOKING_DONE && (
                    <div className="col-span-2 p-4 bg-emerald-50/40 rounded-2xl border border-emerald-250 animate-fade-in space-y-1.5">
                      <label className="text-[9px] font-bold text-emerald-800 uppercase">Booking Capital Reservation (₹) *</label>
                      <input
                        type="number"
                        value={statusUpdateForm.bookingAmount}
                        onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, bookingAmount: e.target.value })}
                        className="w-full h-10 px-3 border border-emerald-200 bg-white rounded-xl text-xs font-mono font-bold focus:outline-none"
                        required
                      />
                    </div>
                  )}

                  <div className="col-span-2 pt-2 border-t border-slate-205 flex justify-end">
                    <button 
                      type="submit" 
                      className="px-6 h-10 bg-[#0B1F33] hover:bg-slate-800 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer border-none shadow-sm"
                    >
                      Commit Status Transition
                    </button>
                  </div>
                </form>
              </div>

              {/* Module 2-3 Columns for History Notes & Upcoming Appointments */}
              <div className="grid grid-cols-2 gap-5">
                
                {/* Notes & Chronology Timber Trail */}
                <div className="bg-white rounded-3xl border border-slate-250 p-5 space-y-3 shadow-sm flex flex-col justify-between">
                  <div className="space-y-3 flex-1 text-left">
                    <h4 className="text-xs font-bold text-premium-gold uppercase tracking-wider font-display border-b border-slate-100 pb-2">Conversation Note Trails</h4>
                    <div className="flex space-x-1.5 pb-2">
                      <input
                        type="text"
                        placeholder="Log custom client feedback..."
                        value={newQuickNote}
                        onChange={(e) => setNewQuickNote(e.target.value)}
                        className="flex-1 h-9 px-3 text-xs rounded-lg bg-slate-50 border border-slate-200 text-primary-navy placeholder-slate-400 outline-none font-medium"
                      />
                      <button 
                        onClick={handleAddQuickNote}
                        className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary-navy hover:bg-slate-800 text-white shadow font-bold cursor-pointer border-none shrink-0"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    
                    <div className="relative border-l border-slate-150 pl-5 ml-2.5 space-y-4 max-h-[30vh] overflow-y-auto custom-scroll pr-1">
                      {activeLeadDetails.timeline.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 text-[11px]">No custom timelines found.</div>
                      ) : (
                        activeLeadDetails.timeline.map((event: any) => (
                          <div key={event.id} className="relative text-xs">
                            <span className="absolute -left-[24px] top-1 w-1.5 h-1.5 rounded-full bg-premium-gold" />
                            <p className="font-bold text-primary-navy text-[11px] leading-tight">{event.title}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5 leading-normal">{event.description}</p>
                            <span className="text-[9px] text-slate-400 font-mono block mt-0.5">
                              {new Date(event.timestamp || event.created_at).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Combined Appointments: Follow-ups & Site Tours */}
                <div className="space-y-4 text-left">
                  {/* Followups */}
                  <div className="bg-white rounded-3xl border border-slate-250 p-5 shadow-sm space-y-2.5">
                    <h4 className="text-xs font-bold text-primary-navy uppercase tracking-wider font-display border-b border-slate-100 pb-1.5">Scheduled Callbacks</h4>
                    <div className="space-y-2 max-h-[16vh] overflow-y-auto custom-scroll pr-1">
                      {activeLeadDetails.followups.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic text-left">No callbacks scheduled.</p>
                      ) : (
                        activeLeadDetails.followups.map((f: any) => (
                          <div key={f.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs">
                            <div className="flex justify-between font-semibold">
                              <span>Due Callback</span>
                              <span className={`text-[8px] font-mono px-1.5 py-0.2 rounded-full font-bold uppercase ${f.completed ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-205'}`}>{f.completed ? 'Done' : 'Pending'}</span>
                            </div>
                            <p className="text-[10px] text-slate-500 leading-snug mt-1">{f.notes || 'Routine callback contact.'}</p>
                            <span className="text-[9.5px] font-bold text-premium-gold block mt-0.5 font-mono">{new Date(f.scheduled_at).toLocaleString('en-IN', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'})}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Site visits */}
                  <div className="bg-white rounded-3xl border border-slate-250 p-5 shadow-sm space-y-2.5">
                    <h4 className="text-xs font-bold text-[#0B1F33] uppercase tracking-wider font-display border-b border-slate-100 pb-1.5">Site walks Arranged</h4>
                    <div className="space-y-2 max-h-[16vh] overflow-y-auto custom-scroll pr-1">
                      {activeLeadDetails.siteVisits.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic text-left">No walks planned.</p>
                      ) : (
                        activeLeadDetails.siteVisits.map((sv: any) => {
                          const projectVal = projects.find(p => p.id === sv.project_id);
                          return (
                            <div key={sv.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs">
                              <div className="flex justify-between font-semibold">
                                <span className="truncate pr-2">Project: {projectVal?.name || 'Aura Heights'}</span>
                                <span className="text-[8px] font-mono font-bold uppercase text-info bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded-full">{sv.status}</span>
                              </div>
                              <p className="text-[9.5px] text-slate-500 font-mono mt-0.5">Date: {sv.scheduled_date} ({sv.scheduled_time}) • Visitors: {sv.visitors_count}</p>
                              {sv.feedback && <p className="text-[9.5px] text-info italic mt-0.5">Feedback: {sv.feedback}</p>}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>

          {/* MOBILE PRESERVED ORIGINAL WORKSPACE VIEW */}
          <div className="xl:hidden space-y-4">
          
          {/* Card overview details */}
          <div className="rounded-[24px] neu-flat p-5 bg-white border border-border-color space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-[10px] text-premium-gold font-bold uppercase tracking-widest font-display">Active Executive Lead</p>
                <h2 className="text-xl font-display font-bold text-primary-navy tracking-tight">
                  {activeLeadDetails.lead.full_name}
                </h2>
                <div className="flex items-center space-x-1.5 text-text-secondary text-xs mt-1">
                  <Phone className="w-3.5 h-3.5" />
                  <a href={`tel:${activeLeadDetails.lead.phone}`} className="hover:underline font-mono">{activeLeadDetails.lead.phone}</a>
                </div>
              </div>

              {/* Status and Source */}
              <div className="flex flex-col items-end space-y-2">
                <span className="px-3 py-1.5 bg-[#0B1F33]/5 border border-border-color/80 text-[10px] uppercase font-bold text-primary-navy rounded-xl inline-block">
                  {activeLeadDetails.lead.status}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-text-secondary font-display">Source: {getSourceName(activeLeadDetails.lead.source_id)}</span>
              </div>
            </div>

            {/* Quick mini grid basic info */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-input-bg/40 p-4 rounded-2xl border border-dashed border-border-color/60">
              <div className="flex items-center space-x-2 text-text-secondary">
                <MapPin className="w-4 h-4 text-premium-gold shrink-0" />
                <span>{activeLeadDetails.lead.location || 'N/A'}, {activeLeadDetails.lead.city || 'N/A'}</span>
              </div>
              <div className="flex items-center space-x-2 text-text-secondary">
                <Landmark className="w-4 h-4 text-premium-gold shrink-0" />
                <span>Config: {(activeLeadDetails.lead.bedroom_preference || '').split('|')[0] || 'Any'}</span>
              </div>
              <div className="flex items-center space-x-2 text-text-secondary">
                <Clock className="w-4 h-4 text-premium-gold shrink-0" />
                <span>Budget: ₹{((activeLeadDetails.lead.budget_min || 0)/100000).toFixed(0)}L - ₹{((activeLeadDetails.lead.budget_max || 100000000)/100000).toFixed(0)}L</span>
              </div>
              <div className="flex items-center space-x-2 text-text-secondary">
                <Mail className="w-4 h-4 text-premium-gold shrink-0" />
                <span className="truncate">{activeLeadDetails.lead.email || 'No email log'}</span>
              </div>
            </div>
          </div>

          {/* Tab Selection */}
          <div className="flex space-x-1 border-b border-[#0B1F33]/10 pb-1.5 overflow-x-auto custom-scroll scrollbar-none">
            {([
              { id: 'overview', label: 'Overview' },
              { id: 'notes', label: 'Notes' },
              { id: 'status_update', label: 'Status Update' }
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveProfileTab(tab.id)}
                className={`py-2 px-2.5 text-[9px] font-bold uppercase tracking-wider rounded-xl transition-all border shrink-0 cursor-pointer ${
                  activeProfileTab === tab.id
                    ? 'bg-primary-navy text-white border-primary-navy shadow-sm'
                    : 'bg-white text-text-secondary border-border-color/60 hover:text-primary-navy'
                }`}
                id={`tab-select-${tab.id}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Contents: Overview Info */}
          {activeProfileTab === 'overview' && (
            <div className="space-y-4">
              <div className="rounded-[24px] neu-flat bg-white p-5 border border-border-color space-y-3">
                <h3 className="text-xs font-bold text-premium-gold uppercase tracking-wider font-display">Assignee Metadata</h3>
                <div className="text-xs space-y-2 text-text-secondary">
                  <p>
                    <strong className="text-primary-navy font-display font-medium">Assigned Sales Executive:</strong>{' '}
                    {allUsers.find(u => u.id === activeLeadDetails.lead.assigned_to)?.full_name || 'Unassigned'}
                  </p>
                  <p>
                    <strong className="text-primary-navy font-display font-medium font-mono">Mobile Identifier:</strong> {activeLeadDetails.lead.phone}
                  </p>
                  <p>
                    <strong className="text-primary-navy font-display font-medium font-mono">E-Mail Log:</strong> {activeLeadDetails.lead.email || 'No email registered'}
                  </p>
                  <p>
                    <strong className="text-primary-navy font-display font-medium">Registered at:</strong>{' '}
                    {new Date(activeLeadDetails.lead.created_at).toLocaleString('en-IN', { dateStyle: 'medium' })}
                  </p>
                </div>
              </div>

              <div className="rounded-[24px] neu-flat bg-white p-5 border border-border-color space-y-3">
                <h3 className="text-xs font-bold text-premium-gold uppercase tracking-wider font-display">Lead Preferences</h3>
                <div className="grid grid-cols-2 gap-2.5 text-xs text-text-secondary text-left">
                  <div>
                    <span className="font-semibold text-primary-navy block">City Focus:</span>
                    <span>{activeLeadDetails.lead.city || 'Delhi/NCR'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-primary-navy block">Configuration Pref:</span>
                    <span>{(activeLeadDetails.lead.bedroom_preference || '').split('|')[0] || 'Unstated'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-primary-navy block">Carpet Area Pref:</span>
                    <span>
                      {(() => {
                        const parts = (activeLeadDetails.lead.bedroom_preference || '').split('|');
                        const min = parts[1];
                        const max = parts[2];
                        if (min && max) return `${min}-${max} sqft`;
                        if (min) return `>= ${min} sqft`;
                        if (max) return `<= ${max} sqft`;
                        return 'Any';
                      })()}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-primary-navy block">Pricing Budget:</span>
                    <span className="font-mono text-[10.5px]">₹{((activeLeadDetails.lead.budget_min || 0)/100000).toFixed(0)}L - ₹{((activeLeadDetails.lead.budget_max || 100000000)/100000).toFixed(0)}L</span>
                  </div>
                  <div className="col-span-2 border-t border-slate-100 pt-2 mt-1">
                    <span className="font-semibold text-primary-navy block">Interested Projects:</span>
                    <span className="normal-case">
                      {(activeLeadDetails.lead.project_interests || [])
                        .map((projId: string) => projects.find(p => p.id === projId)?.name)
                        .filter(Boolean)
                        .join(', ') || 'None Selected'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Initial Summary Notes Card (Mobile) */}
              <div className="rounded-[24px] bg-white border border-slate-200 p-5 space-y-2 text-left text-xs">
                <h3 className="text-xs font-bold text-premium-gold uppercase tracking-wider font-display">Initial Summary Notes</h3>
                <p className="text-slate-600 leading-normal italic">
                  {getInitialNotes(activeLeadDetails.statusHistory) || 'No initial notes logged.'}
                </p>
              </div>

              {/* CRM Records Actions (Phase 4 Leads Actions) */}
              <div className="rounded-[24px] bg-white border border-slate-200 p-5 space-y-3 shadow-sm text-xs">
                <h3 className="text-xs font-bold text-premium-gold uppercase tracking-wider font-display border-b border-slate-100 pb-2">Record Actions</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      const parts = (activeLeadDetails.lead.bedroom_preference || '').split('|');
                      setFormData({
                        full_name: activeLeadDetails.lead.full_name,
                        phone: activeLeadDetails.lead.phone,
                        alternate_phone: activeLeadDetails.lead.alternate_phone || '',
                        email: activeLeadDetails.lead.email || '',
                        city: activeLeadDetails.lead.city || '',
                        location: activeLeadDetails.lead.location || '',
                        source: activeLeadDetails.lead.source_id,
                        project_interests: activeLeadDetails.lead.project_interests || [],
                        budget_min: activeLeadDetails.lead.budget_min?.toString() || '',
                        budget_max: activeLeadDetails.lead.budget_max?.toString() || '',
                        bedroom_preference: parts[0] || '2 BHK',
                        carpet_area_min: parts[1] || '',
                        carpet_area_max: parts[2] || '',
                        assigned_to: activeLeadDetails.lead.assigned_to || '',
                        initial_notes: getInitialNotes(activeLeadDetails.statusHistory)
                      });
                      setEditingLeadRecordId(activeLeadDetails.lead.id);
                      setIsOpenCreateSheet(true);
                    }}
                    className="h-10 bg-slate-50 border border-slate-200 text-[#0B1F33] hover:bg-slate-100 font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer text-[11px] transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-violet-600" />
                    <span>Edit Metadata</span>
                  </button>

                  {activeUser.role === UserRole.COMPANY_ADMIN ? (
                    <button
                      onClick={() => setIsDeleteDialogOpen(true)}
                      className="h-10 bg-rose-50 border border-rose-100 text-rose-700 hover:bg-rose-100 font-semibold rounded-xl flex items-center justify-center gap-1 cursor-pointer text-[11px] transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Lead</span>
                    </button>
                  ) : (
                    <div className="h-10 flex items-center justify-center text-slate-400 bg-slate-50 border border-slate-100 rounded-xl text-[10px] text-center px-1 font-medium select-none">
                      Admin purge only
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab Contents: Notes Timeline & Log quick note */}
          {activeProfileTab === 'notes' && (
            <div className="space-y-4">
              {/* Log interactive note box */}
              <div className="rounded-[24px] neu-flat bg-white p-5 border border-border-color space-y-3">
                <h4 className="text-xs font-bold text-premium-gold uppercase tracking-wider font-display">Log Custom Note</h4>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Type comments, buyer feedback..."
                    value={newQuickNote}
                    onChange={(e) => setNewQuickNote(e.target.value)}
                    className="flex-1 h-11 px-4 neu-inset text-xs rounded-xl bg-input-bg border-border-color text-primary-navy font-medium placeholder-text-secondary outline-none"
                    id="quick-note-input"
                  />
                  <button 
                    onClick={handleAddQuickNote}
                    className="w-11 h-11 flex items-center justify-center rounded-xl bg-primary-navy text-white active:scale-95 shadow border cursor-pointer shrink-0"
                    id="quick-note-send"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Chronological timelines */}
              <div className="rounded-[24px] neu-flat bg-white p-5 border border-border-color space-y-3">
                <h4 className="text-xs font-bold text-[#0B1F33] uppercase tracking-wider font-display">Notes & Audit Trails</h4>
                <div className="relative border-l border-border-color/60 pl-6 ml-3 space-y-5 max-h-[35vh] overflow-y-auto custom-scroll pb-2">
                  {activeLeadDetails.timeline.length === 0 ? (
                    <EmptyState title="No Note Logs" description="Start typing in the box above to record a new conversation summary." icon={MessageSquare} />
                  ) : (
                    activeLeadDetails.timeline.map((event: any) => (
                      <div key={event.id} className="relative animate-fade-in text-xs">
                        <span className="absolute -left-[30px] top-1 w-2 h-2 rounded-full bg-premium-gold border border-white" />
                        <div className="space-y-0.5">
                          <p className="font-semibold text-[#0B1F33] text-[11px] leading-tight">{event.title}</p>
                          <p className="text-[10px] text-text-secondary leading-normal">{event.description}</p>
                          <span className="text-[9px] text-slate-400 font-mono block mt-0.5">
                            {new Date(event.timestamp || event.created_at || Date.now()).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab Contents: Follow-ups Logs */}
          {activeProfileTab === 'followups' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-card-bg/60 p-3 rounded-2xl border border-border-color/55">
                <span className="text-xs font-bold text-primary-navy uppercase font-display">Target Follow-ups</span>
              </div>

              <div className="space-y-3 max-h-[40vh] overflow-y-auto custom-scroll pr-1">
                {activeLeadDetails.followups.length === 0 ? (
                  <EmptyState title="No Scheduled Follow-ups" description="Log a fresh follow-up schedule to ensure active tracking." icon={Clock} />
                ) : (
                  activeLeadDetails.followups.map((f: any) => (
                    <div key={f.id} className="p-3 bg-white rounded-2xl border border-border-color text-xs flex justify-between items-start">
                      <div className="space-y-1">
                        <p className="font-semibold text-primary-navy">Type: {f.type} Call</p>
                        <p className="text-[11px] text-text-secondary leading-normal">{f.notes || 'No summary registered.'}</p>
                        <p className="text-[10px] text-premium-gold font-medium">Due: {new Date(f.scheduled_at).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                        {f.completed && (
                          <p className="text-[10px] text-success font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 mt-1 inline-block">Outcome: {f.outcome_notes}</p>
                        )}
                      </div>
                      <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                        f.completed ? 'bg-emerald-50 text-success' : 'bg-amber-50 text-warning'
                      }`}>
                        {f.completed ? 'Done' : 'Pending'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tab Contents: Site Visits */}
          {activeProfileTab === 'site_visits' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-card-bg/60 p-3 rounded-2xl border border-border-color/55">
                <span className="text-xs font-bold text-primary-navy uppercase font-display">Site Tours Register</span>
              </div>

              <div className="space-y-3 max-h-[40vh] overflow-y-auto custom-scroll pr-1">
                {activeLeadDetails.siteVisits.length === 0 ? (
                  <EmptyState title="No Property Site Visits" description="Plan a site tour to host units walk-ins." icon={Building} />
                ) : (
                  activeLeadDetails.siteVisits.map((sv: any) => {
                    const project = projects.find(p => p.id === sv.project_id);

                    return (
                      <div key={sv.id} className="p-3.5 bg-white rounded-2xl border border-border-color text-xs space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-primary-navy">Project: {project?.name || 'Aura Heights'}</p>
                            <p className="text-[10px] text-text-secondary mt-0.5">Scheduled on: {sv.scheduled_date} at {sv.scheduled_time}</p>
                          </div>
                          <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                            sv.status === 'visited' ? 'bg-emerald-50 text-success' : sv.status === 'cancelled' ? 'bg-red-50 text-danger' : 'bg-blue-50 text-info'
                          }`}>
                            {sv.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-text-secondary flex justify-between bg-input-bg/40 p-2 rounded-xl">
                          <span>Visitors: {sv.visitors_count}</span>
                          <span>Transport: {sv.transport_arranged ? 'Provided' : 'Self-driven'}</span>
                        </div>
                        {sv.feedback && (
                          <p className="text-[10px] text-info bg-blue-50/40 p-1 px-2 rounded-xl border border-blue-100">Feedback: {sv.feedback}</p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Tab Contents: Unified Status Update Form (Priority 4 & 5) */}
          {activeProfileTab === 'status_update' && (
            <div className="space-y-4">
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  
                  const status = statusUpdateForm.newStatus;
                  const outcome = statusUpdateForm.outcome;
                  const lostReason = statusUpdateForm.lostReason;
                  const invalidReason = statusUpdateForm.invalidReason;
                  const notes = statusUpdateForm.notes;
                  const bookingAmount = Number(statusUpdateForm.bookingAmount) || 0;

                  if (!status) {
                    alert('Please select a target status.');
                    return;
                  }
                  if (!notes.trim()) {
                    alert('Status transition notes are mandatory.');
                    return;
                  }

                  // Build unified rich transition notes for DB compatibility (Fix 9)
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

                  // Validate scheduling date/time if requested or mandatory (Fix 5 & 6)
                  let followupPayload = undefined;

                  if (!isExempted && status !== LeadStatus.SITE_VISIT_SCHEDULED) {
                    if (!statusUpdateForm.followupDate) {
                      alert('Please select a valid follow-up date and time. CRM purpose requires a future follow-up for this status.');
                      return;
                    }
                    followupPayload = {
                      scheduled_at: statusUpdateForm.followupDate,
                      type: statusUpdateForm.followupType,
                      notes: statusUpdateForm.followupNotes || `Scheduled during ${status} status update.`
                    };
                  }

                  let visitPayload = undefined;
                  if (status === LeadStatus.SITE_VISIT_SCHEDULED) {
                    if (!statusUpdateForm.visitProjectId || !statusUpdateForm.visitDate) {
                      alert('Site visit Project interest and scheduled date are mandatory.');
                      return;
                    }
                    visitPayload = {
                      project_id: statusUpdateForm.visitProjectId,
                      scheduled_date: statusUpdateForm.visitDate,
                      scheduled_time: statusUpdateForm.visitTime,
                      visitors_count: Number(statusUpdateForm.visitVisitors) || 1,
                      transport_arranged: statusUpdateForm.visitTransport
                    };
                  }

                  if (status === LeadStatus.BOOKING_DONE) {
                    if (bookingAmount <= 0) {
                      alert('Please enter a valid positive down-payment booking amount.');
                      return;
                    }
                  }

                  const ok = await updateLeadStatus(
                    activeLeadDetails.lead.id,
                    status,
                    richNotes,
                    bookingAmount,
                    followupPayload,
                    visitPayload
                  );

                  if (ok) {
                    setStatusUpdateForm(prev => ({
                      ...prev,
                      notes: '',
                      outcome: '',
                      lostReason: '',
                      invalidReason: '',
                      scheduleFollowupChecked: false,
                      followupDate: '',
                      followupNotes: '',
                      visitDate: ''
                    }));
                    setActiveProfileTab('overview');
                  } else {
                    alert('Transition failed. Please check mandatory fields.');
                  }
                }}
                className="rounded-[24px] neu-flat bg-white p-5 border border-border-color space-y-4 text-xs"
              >
                <div>
                  <h3 className="text-xs font-bold text-premium-gold uppercase tracking-wider font-display">Unified Status Transition</h3>
                  <p className="text-[10px] text-text-secondary">Perform authorized status transitions with automatic scheduling triggers.</p>
                </div>

                {/* Target Status Dropdown */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Target Lead Status</label>
                  <select
                    value={statusUpdateForm.newStatus}
                    onChange={(e) => {
                      const selectedStatus = e.target.value as LeadStatus;
                      const outcomesForStatus = STATUS_OUTCOMES[selectedStatus] || [];
                      setStatusUpdateForm({
                        ...statusUpdateForm,
                        newStatus: selectedStatus,
                        outcome: outcomesForStatus[0] || '',
                        scheduleFollowupChecked: selectedStatus === LeadStatus.FOLLOWUP_SCHEDULED,
                        lostReason: '',
                        invalidReason: ''
                      });
                    }}
                    className="w-full h-11 px-3 border border-border-color bg-input-bg text-[11px] font-bold uppercase tracking-wider text-primary-navy rounded-xl focus:outline-none"
                    id="unified-status-select"
                  >
                    {Object.values(LeadStatus).map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                {/* Dependent Outcome Dropdown (Fix 4) */}
                {STATUS_OUTCOMES[statusUpdateForm.newStatus as LeadStatus] && (
                  <div className="space-y-1 animate-fade-in">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Status Outcome *</label>
                    <select
                      value={statusUpdateForm.outcome}
                      onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, outcome: e.target.value })}
                      className="w-full h-11 px-3 border border-border-color bg-input-bg text-xs font-semibold text-primary-navy rounded-xl focus:outline-none focus:border-premium-gold"
                      id="unified-outcome-select"
                      required
                    >
                      <option value="">Select Outcome...</option>
                      {(STATUS_OUTCOMES[statusUpdateForm.newStatus as LeadStatus] || []).map(oct => (
                        <option key={oct} value={oct}>{oct}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Lost Reason Form (Fix 6) */}
                {statusUpdateForm.newStatus === LeadStatus.LOST && (
                  <div className="space-y-1 animate-fade-in">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Lost Reason *</label>
                    <select
                      value={statusUpdateForm.lostReason}
                      onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, lostReason: e.target.value })}
                      className="w-full h-11 px-3 border border-border-color bg-input-bg text-xs font-semibold text-primary-navy rounded-xl focus:outline-none focus:border-red-400"
                      id="lost-reason-select"
                      required
                    >
                      <option value="">Select Lost Reason...</option>
                      {LOST_REASONS.map(lr => (
                        <option key={lr} value={lr}>{lr}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Invalid Reason Form (Fix 6) */}
                {statusUpdateForm.newStatus === LeadStatus.INVALID && (
                  <div className="space-y-1 animate-fade-in">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Invalid Reason *</label>
                    <select
                      value={statusUpdateForm.invalidReason}
                      onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, invalidReason: e.target.value })}
                      className="w-full h-11 px-3 border border-border-color bg-input-bg text-xs font-semibold text-primary-navy rounded-xl focus:outline-none focus:border-red-400"
                      id="invalid-reason-select"
                      required
                    >
                      <option value="">Select Invalid Reason...</option>
                      {INVALID_REASONS.map(ir => (
                        <option key={ir} value={ir}>{ir}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Transition Notes (Mandatory) */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Remarks / Conversation summary *</label>
                  <textarea
                    value={statusUpdateForm.notes}
                    onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, notes: e.target.value })}
                    placeholder="Provide professional outcome audit trail text (required)..."
                    className="w-full p-3 h-20 text-xs text-primary-navy font-medium placeholder-slate-400 border border-border-color bg-input-bg rounded-xl outline-none"
                    required
                    id="unified-status-notes"
                  />
                </div>

                {/* Conditional Sub-forms */}
                {/* 1. Follow-up scheduling subform if not exempted and not site visit */}
                {![
                  LeadStatus.NEW,
                  LeadStatus.NOT_INTERESTED,
                  LeadStatus.LOST,
                  LeadStatus.BOOKING_DONE,
                  LeadStatus.INVALID
                ].includes(statusUpdateForm.newStatus as LeadStatus) && statusUpdateForm.newStatus !== LeadStatus.SITE_VISIT_SCHEDULED && (
                  <div className="p-3 bg-amber-50/50 rounded-2xl border border-amber-200 space-y-3 animate-fade-in text-left">
                    <p className="text-[10px] font-bold text-warning uppercase tracking-wider">
                      Required Outcome: Schedule Mandatory Follow-up
                    </p>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 block">Scheduled Date-Time *</label>
                        <input
                          type="datetime-local"
                          value={statusUpdateForm.followupDate}
                          onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, followupDate: e.target.value })}
                          className="w-full h-10 px-2 text-[10px] border border-amber-150 rounded-xl bg-white text-primary-navy"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 block">Follow-up Type</label>
                        <select
                          value={statusUpdateForm.followupType}
                          onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, followupType: e.target.value })}
                          className="w-full h-10 px-2 text-[10px] border border-amber-150 rounded-xl bg-white text-primary-navy"
                        >
                          <option value="Call">Phone Call</option>
                          <option value="WhatsApp">WhatsApp Chat</option>
                          <option value="In-Person">In-Person Meeting</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 block">Follow-up Agenda / Notes</label>
                      <input
                        type="text"
                        placeholder="e.g. Call to finalize property dimensions."
                        value={statusUpdateForm.followupNotes}
                        onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, followupNotes: e.target.value })}
                        className="w-full h-10 px-3 text-[10px] border border-amber-150 rounded-xl bg-white text-primary-navy"
                      />
                    </div>
                  </div>
                )}

                {/* 2. Site Visit scheduling subform if Site Visit Scheduled */}
                {statusUpdateForm.newStatus === LeadStatus.SITE_VISIT_SCHEDULED && (
                  <div className="p-3 bg-blue-50/50 rounded-2xl border border-blue-200 space-y-3 animate-fade-in text-left">
                    <p className="text-[10px] font-bold text-info uppercase tracking-wider">Required Outcome: Set Site Walk-in Tour</p>
                    
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 block">Target Property Project *</label>
                      <select
                        value={statusUpdateForm.visitProjectId}
                        onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, visitProjectId: e.target.value })}
                        className="w-full h-10 px-2 text-[10px] border border-blue-150 rounded-xl bg-white text-primary-navy"
                        required
                      >
                        <option value="">Select estate project...</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 block">Scheduled Date *</label>
                        <input
                          type="date"
                          value={statusUpdateForm.visitDate}
                          onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, visitDate: e.target.value })}
                          className="w-full h-10 px-2 text-[10px] border border-blue-150 rounded-xl bg-white text-primary-navy"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 block">Expected Time</label>
                        <input
                          type="time"
                          value={statusUpdateForm.visitTime}
                          onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, visitTime: e.target.value })}
                          className="w-full h-10 px-2 text-[10px] border border-blue-150 rounded-xl bg-white text-primary-navy"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 block">Visitors Count</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={statusUpdateForm.visitVisitors}
                          onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, visitVisitors: e.target.value })}
                          className="w-16 h-8 px-2 text-[10px] border border-blue-150 rounded-xl bg-white text-primary-navy text-center"
                        />
                      </div>
                      <label className="flex items-center space-x-2 text-[10px] font-bold text-slate-600 mt-3 select-none">
                        <input
                          type="checkbox"
                          checked={statusUpdateForm.visitTransport}
                          onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, visitTransport: e.target.checked })}
                          className="rounded border-blue-200"
                        />
                        <span>arrange transport</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* 3. Booking Down-payment subform if BOOKING_DONE */}
                {statusUpdateForm.newStatus === LeadStatus.BOOKING_DONE && (
                  <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-200 space-y-3 animate-fade-in text-left">
                    <p className="text-[10px] font-bold text-success uppercase tracking-wider">Required Outcome: Down-payment Record</p>
                    
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 block">Booking Down-payment Amount (₹) *</label>
                      <input
                        type="number"
                        placeholder="e.g. 75000"
                        value={statusUpdateForm.bookingAmount}
                        onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, bookingAmount: e.target.value })}
                        className="w-full h-10 px-3 text-[10px] border border-emerald-150 rounded-xl bg-white text-primary-navy font-bold font-mono"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  className="w-full h-11 bg-primary-navy hover:bg-[#1E293B] text-white rounded-xl text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-transform shadow flex items-center justify-center cursor-pointer border-none"
                  id="unified-status-submit"
                >
                  Confirm Transition Save
                </button>
              </form>
            </div>
          )}
          </div>
        </div>
        )
      ) : (
        
        // 2. LEADS SEARCH LIST HOME (Page 11)
        <div className="space-y-4 text-left">
          
          {/* DESKTOP INTEGRITY: Horizontal Filters, search, bulk & import cockpit */}
          <div className="hidden xl:flex flex-col space-y-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mb-4">
            
            {/* Row 1: Search and Main Triggers */}
            <div className="flex justify-between items-center gap-4">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Deep query leads name, alternate contacts, identification phone..."
                  value={search}
                  onChange={handleSearchChange}
                  className="w-full h-11 pl-10 pr-4 bg-slate-50 border border-slate-200 text-xs text-primary-navy font-semibold rounded-xl outline-none"
                  id="desktop-leads-search"
                />
                <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              </div>

              <div className="flex items-center gap-3">
                {/* Reset button */}
                <button
                  onClick={handleResetFilters}
                  className="px-4 h-11 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider rounded-xl border border-slate-250 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-slate-400" />
                  <span>Reset Filters</span>
                </button>

                {/* Bulk Lead Import - Company Admin/TL */}
                {activeUser && [UserRole.COMPANY_ADMIN, UserRole.TEAM_LEADER].includes(activeUser.role) && (
                  <button
                    onClick={() => {
                      setImportCsvText('');
                      setImportResult(null);
                      setImportSelectedAssignee('');
                      setIsOpenImportSheet(true);
                    }}
                    className="px-4 h-11 bg-slate-50 hover:bg-slate-100 text-primary-navy text-xs font-bold uppercase tracking-wider rounded-xl border border-slate-250 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-premium-gold" />
                    <span>Upload CSV</span>
                  </button>
                )}

                {/* Create Lead */}
                <button
                  onClick={() => setIsOpenCreateSheet(true)}
                  className="px-5 h-11 bg-primary-navy hover:bg-[#1E293B] text-white text-xs font-bold uppercase tracking-wider rounded-xl border-none flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Lead</span>
                </button>
              </div>
            </div>

            {/* Row 2: Selectors in horizonal row */}
            <div className="grid grid-cols-4 gap-4 pt-1.5 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Lead Pipeline Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => handleFilterChange({ status: e.target.value })}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-205 text-primary-navy rounded-xl font-bold uppercase tracking-wide text-[11px] focus:outline-none"
                >
                  <option value="">All Statuses</option>
                  {Object.values(LeadStatus).map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Origin Source</label>
                <select
                  value={sourceFilter}
                  onChange={(e) => handleFilterChange({ source: e.target.value })}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-205 text-primary-navy rounded-xl font-bold uppercase tracking-wide text-[11px] focus:outline-none"
                >
                  <option value="">All Sources</option>
                  {leadSources.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase font-display">Target Estate Project</label>
                <select
                  value={projectFilter}
                  onChange={(e) => handleFilterChange({ project: e.target.value })}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-205 text-[#0B1F33] rounded-xl font-bold text-[11px] focus:outline-none"
                >
                  <option value="">All Portfolios</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Assigned Personnel</label>
                <select
                  value={assignFilter}
                  onChange={(e) => handleFilterChange({ assignedTo: e.target.value })}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-205 text-[#0B1F33] rounded-xl font-bold text-[11px] focus:outline-none"
                >
                  <option value="">All Personnel</option>
                  {allUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Permanent Bulk Action Drawer on Desktop whenever leads are checked */}
            {selectedLeadIds.length > 0 && activeUser && [UserRole.COMPANY_ADMIN].includes(activeUser.role) && (
              <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs animate-fade-in shadow-inner">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-primary-navy bg-[#0B1F33]/5 px-2.5 py-1 rounded-full">{selectedLeadIds.length}</span>
                  <span className="text-slate-500 font-medium">Lead records checked for bulk action</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsOpenBulkSheet(true)}
                    className="px-4 py-2 bg-[#0B1F33] hover:bg-slate-800 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border-none cursor-pointer"
                  >
                    Apply Bulk Updates & Re-assign
                  </button>
                  {activeUser && [UserRole.TEAM_LEADER, UserRole.COMPANY_ADMIN].includes(activeUser.role) && (
                    <button
                      onClick={handleBulkExportCSV}
                      className="p-2 bg-white hover:bg-slate-100 rounded-xl border border-slate-250 text-slate-600 flex items-center gap-1 cursor-pointer font-bold text-[10px] uppercase"
                      title="Bulk CSV Export"
                    >
                      <Download className="w-3.5 h-3.5 text-premium-gold" />
                      <span>Export CSV</span>
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedLeadIds([])}
                    className="p-2 hover:bg-red-50 text-red-500 rounded-xl font-bold text-[10px]"
                  >
                    Clear Checks
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* DESKTOP TABLE LAYOUT SHIELD (Rendered >= 1280px) */}
          <div className="hidden xl:block overflow-hidden shadow-sm border border-slate-200 bg-white rounded-3xl">
            <table className="min-w-full divide-y divide-slate-100 text-xs text-left">
              <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[9px] border-b border-slate-200 select-none">
                <tr>
                  {activeUser && [UserRole.COMPANY_ADMIN].includes(activeUser.role) && (
                    <th scope="col" className="p-4 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={leads.length > 0 && selectedLeadIds.length === leads.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLeadIds(leads.map(lead => lead.id));
                          } else {
                            setSelectedLeadIds([]);
                          }
                        }}
                        className="w-4.5 h-4.5 rounded text-premium-gold border-slate-250 cursor-pointer"
                      />
                    </th>
                  )}
                  <th scope="col" className="p-4 py-3.5 pl-6">Customer Profile & Contact</th>
                  <th scope="col" className="p-4 py-3.5">Target Portfolio Config</th>
                  <th scope="col" className="p-4 py-3.5">Budget Range</th>
                  <th scope="col" className="p-4 py-3.5">Origin Source</th>
                  <th scope="col" className="p-4 py-3.5">Pipeline Status</th>
                  <th scope="col" className="p-4 py-3.5">Assigned personnel</th>
                  <th scope="col" className="p-4 py-3.5 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100 font-medium text-slate-600">
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 font-bold">
                      No matching leads found.
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => {
                    const isCompanyAdmin = activeUser && [UserRole.COMPANY_ADMIN].includes(activeUser.role);
                    const isChecked = isCompanyAdmin && selectedLeadIds.includes(lead.id);
                    const assigneeName = allUsers.find(u => u.id === lead.assigned_to)?.full_name || 'Unassigned';
                    
                    return (
                      <tr 
                        key={lead.id} 
                        className={`hover:bg-slate-50/45 transition-colors ${isChecked ? 'bg-slate-50' : ''}`}
                      >
                        {isCompanyAdmin && (
                          <td className="p-4 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleSelectLead(lead.id)}
                              className="w-4.5 h-4.5 rounded text-premium-gold border-slate-250 cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="p-4 py-3.5 pl-6">
                          <div 
                            onClick={() => setActiveLeadId(lead.id)}
                            className="cursor-pointer space-y-0.5 text-left group"
                          >
                            <span className="font-bold text-primary-navy group-hover:underline block font-display text-[12px]">{lead.full_name}</span>
                            <span className="font-mono text-slate-400 block text-[10px]">{lead.phone} • {lead.email || 'no email registered'}</span>
                          </div>
                        </td>
                        <td className="p-4 py-3.5 text-slate-500 font-mono text-left">
                          <div>
                            <span className="font-bold text-primary-navy block">{(lead.bedroom_preference || '').split('|')[0] || 'Unstated'}</span>
                            <span className="text-[10px] text-slate-400 block">
                              {(() => {
                                const parts = (lead.bedroom_preference || '').split('|');
                                const min = parts[1];
                                const max = parts[2];
                                if (min && max) return `${min}-${max} sqft`;
                                if (min) return `>= ${min} sqft`;
                                if (max) return `<= ${max} sqft`;
                                return 'Carpet: Any';
                              })()}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 py-3.5 font-bold text-slate-500 font-mono">
                          ₹{lead.budget_min ? (lead.budget_min/100000).toFixed(0) : '0'}L - ₹{lead.budget_max ? (lead.budget_max/100000).toFixed(0) : '0'}L
                        </td>
                        <td className="p-4 py-3.5">
                          <span className="text-[10px] px-2 py-0.5 font-bold uppercase tracking-wide bg-slate-100 text-slate-500 rounded border border-slate-200">{getSourceName(lead.source_id)}</span>
                        </td>
                        <td className="p-4 py-3.5">
                          <span className={`text-[10.5px] px-2.5 py-1 font-bold uppercase tracking-wide rounded-full border ${
                            lead.status === LeadStatus.BOOKING_DONE 
                              ? 'bg-emerald-50 text-success border-emerald-200' 
                              : lead.status === LeadStatus.SITE_VISIT_SCHEDULED 
                              ? 'bg-blue-50 text-info border-blue-200'
                              : 'bg-slate-100 text-[#0B1F33] border-slate-200'
                          }`}>
                            {lead.status}
                          </span>
                        </td>
                        <td className="p-4 py-3.5 font-bold text-primary-navy">
                          {assigneeName}
                        </td>
                        <td className="p-4 py-3.5 pr-6 text-right">
                          <div className="flex justify-end gap-2.5">
                            <button
                              onClick={() => {
                                window.location.href = `tel:${lead.phone}`;
                              }}
                              className="w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors border border-emerald-200 cursor-pointer"
                              title="Dial Phone"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                const formatted = lead.phone.replace(/\D/g, '');
                                window.location.href = `https://wa.me/${formatted}?text=${encodeURIComponent('Hello from ImCRM')}`;
                              }}
                              className="w-8 h-8 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 flex items-center justify-center transition-colors border border-green-200 cursor-pointer"
                              title="WhatsApp Text"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setActiveLeadId(lead.id)}
                              className="px-3.5 h-8 text-[10px] uppercase font-bold text-primary-navy rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-250 flex items-center justify-center cursor-pointer font-display"
                            >
                              Open Profile
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Quick Header Search Filter Block on Mobile View */}
          <div className="flex space-x-2 xl:hidden">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search leads by name, phone..."
                value={search}
                onChange={handleSearchChange}
                className="w-full h-11 pl-9 pr-4 neu-inset text-xs rounded-xl bg-input-bg text-primary-navy placeholder-text-secondary"
                id="leads-search-input"
              />
              <Search className="absolute left-3 top-3 w-4 h-4 text-text-secondary" />
            </div>

            {/* Float trigger modal filter sheet */}
            <button
              onClick={() => setIsOpenFilterSheet(true)}
              className="neu-button h-11 w-11 flex items-center justify-center bg-white border active:scale-95"
              id="filter-trigger-btn"
            >
              <Filter className="w-4 h-4 text-text-secondary" />
            </button>

            {/* Bulk Lead Import button - Only for Company Admin and Team Leader */}
            {activeUser && [UserRole.COMPANY_ADMIN, UserRole.TEAM_LEADER].includes(activeUser.role) && (
              <button
                onClick={() => {
                  setImportCsvText('');
                  setImportResult(null);
                  setImportSelectedAssignee('');
                  setIsOpenImportSheet(true);
                }}
                className="neu-button h-11 px-3 bg-white border border-border-color text-primary-navy text-xs font-bold space-x-1.5 active:scale-95 flex items-center"
                id="import-leads-csv-btn"
              >
                <Upload className="w-4 h-4 text-premium-gold" />
                <span>Import CSV</span>
              </button>
            )}

            {/* Trigger Create Sheet modal */}
            <button
              onClick={() => setIsOpenCreateSheet(true)}
              className="neu-button-gold h-11 px-4 flex items-center text-white text-xs font-bold space-x-1 active:scale-95 border-none"
              id="add-lead-btn"
            >
              <Plus className="w-4 h-4" />
              <span>Add Lead</span>
            </button>
          </div>

          {/* Company Admin Actions Bar (Page 12 Bulk actions triggered when leads are selected) - Mobile */}
          {selectedLeadIds.length > 0 && activeUser && [UserRole.COMPANY_ADMIN].includes(activeUser.role) && (
            <div className="rounded-[20px] p-3.5 bg-slate-50 border border-slate-200 flex items-center justify-between text-xs animate-fade-in shadow-inner xl:hidden">
              <div>
                <span className="font-bold text-primary-navy">{selectedLeadIds.length}</span>{' '}
                <span className="text-text-secondary">lead(s) selected</span>
              </div>
              <div className="flex items-center space-x-2">
                {/* Trigger Bulk updates */}
                <button
                  onClick={() => setIsOpenBulkSheet(true)}
                  className="px-3 py-1.5 bg-primary-navy text-white rounded-lg text-[10px] font-bold uppercase active:scale-95"
                  id="bulk-actions-sheet-trigger"
                >
                  Bulk updates
                </button>
                
                {/* Export trigger */}
                {activeUser && [UserRole.TEAM_LEADER, UserRole.COMPANY_ADMIN].includes(activeUser.role) && (
                  <button
                    onClick={handleBulkExportCSV}
                    className="p-1.5 rounded-lg bg-white border border-border-color text-primary-navy"
                    title="Bulk CSV Export"
                    id="bulk-csv-export"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                )}
                
                <button 
                  onClick={() => setSelectedLeadIds([])}
                  className="p-1 rounded text-red-600 font-bold"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Real paginated listing block - Mobile */}
          <div className="space-y-3 pb-8 xl:hidden">
            {leads.length === 0 ? (
              <EmptyState title="No Leads Found" description="Try editing filters or add a new qualified lead." onAction={() => setIsOpenCreateSheet(true)} actionText="Create Lead" />
            ) : (
              leads.map((lead) => {
                const isCompanyAdmin = activeUser && [UserRole.COMPANY_ADMIN].includes(activeUser.role);
                const isChecked = isCompanyAdmin && selectedLeadIds.includes(lead.id);
                return (
                  <div
                    key={lead.id}
                    className={`neu-flat p-4 bg-white border border-border-color/60 transition-all flex items-center justify-between animate-fade-in ${
                      isChecked ? 'ring-2 ring-premium-gold bg-slate-50/45' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3 w-5/6">
                      {isCompanyAdmin && (
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelectLead(lead.id)}
                          className="w-4.5 h-4.5 rounded text-premium-gold border-border-color bg-input-bg pointer-events-auto cursor-pointer"
                          id={`select-chk-${lead.id}`}
                        />
                      )}
                      
                      {/* Clicking body opens profile tabs detailed worksheet */}
                      <div 
                        onClick={() => setActiveLeadId(lead.id)}
                        className="flex-1 cursor-pointer text-left"
                        id={`lead-profile-open-${lead.id}`}
                      >
                        <h4 className="text-xs font-bold text-primary-navy font-display">{lead.full_name}</h4>
                        <p className="text-[10px] text-text-secondary mt-0.5 leading-none">{lead.phone} • Info Source: {getSourceName(lead.source_id)}</p>
                        <span className="text-[9px] text-premium-gold uppercase font-semibold font-display block mt-1">
                          Config: {(lead.bedroom_preference || '').split('|')[0] || 'Unstated'}
                          {(() => {
                            const parts = (lead.bedroom_preference || '').split('|');
                            if (parts[1] || parts[2]) {
                              return ` (${parts[1] || '0'}-${parts[2] || 'Any'} sqft)`;
                            }
                            return '';
                          })()}
                        </span>
                      </div>
                    </div>

                    {/* Left align: Badges */}
                    <div className="flex flex-col items-end shrink-0 space-y-1">
                      <span className={`text-[8.5px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                        lead.status === 'Booking Done' ? 'bg-emerald-50 text-success border border-emerald-200' : 'bg-input-bg text-primary-navy border border-border-color'
                      }`}>
                        {lead.status}
                      </span>
                      <ChevronRight className="w-4 h-4 text-text-secondary pr-1 shrink-0" />
                    </div>
                  </div>
                );
              })
            )}

            {/* Pagination keys */}
            {leadsTotalPages > 1 && (
              <div className="flex justify-between items-center bg-white p-3.5 rounded-[20px] border border-border-color text-xs mt-4">
                <button
                  onClick={() => fetchLeads({ page: Math.max(1, leadsPage - 1), search, status: statusFilter, source: sourceFilter, project: projectFilter, assignedTo: assignFilter })}
                  disabled={leadsPage === 1}
                  className="px-3 py-1.5 rounded-xl border border-border-color/60 disabled:opacity-50 text-text-secondary"
                  id="leads-prev-page"
                >
                  Previous
                </button>
                <span className="font-medium text-text-secondary">Page {leadsPage} of {leadsTotalPages}</span>
                <button
                  onClick={() => fetchLeads({ page: Math.min(leadsTotalPages, leadsPage + 1), search, status: statusFilter, source: sourceFilter, project: projectFilter, assignedTo: assignFilter })}
                  disabled={leadsPage === leadsTotalPages}
                  className="px-3 py-1.5 rounded-xl border border-border-color/60 disabled:opacity-50 text-text-secondary"
                  id="leads-next-page"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. MODAL DRAWER: LEAD ADVANCED ENTRY FORM (Page 11) */}
      <BottomDrawer
        isOpen={isOpenCreateSheet}
        onClose={() => { setIsOpenCreateSheet(false); setEditingLeadRecordId(null); }}
        title={editingLeadRecordId ? "Edit Lead Registration Info" : "Add Direct Executive Lead"}
      >
        <form onSubmit={handleCreateLead} className="space-y-4 text-xs text-left pb-16">
          {formError && (
            <p className="p-3 bg-red-50 border border-red-200 text-danger font-medium rounded-xl text-center">
              {formError}
            </p>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-primary-navy uppercase tracking-wider block">Full Name (Required)</label>
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="e.g. Anand Mahindra"
              className="w-full h-11 px-4 neu-inset text-xs rounded-xl bg-input-bg text-primary-navy font-semibold border-border-color"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-primary-navy uppercase tracking-wider block">Mobile Number (Required)</label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="e.g. 9845012345"
              className="w-full h-11 px-4 neu-inset text-xs rounded-xl bg-input-bg text-primary-navy font-semibold border-border-color"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-primary-navy uppercase tracking-wider block">Alternate Contact</label>
              <input
                type="tel"
                value={formData.alternate_phone}
                onChange={(e) => setFormData({ ...formData, alternate_phone: e.target.value })}
                placeholder="e.g. 9845099999"
                className="w-full h-11 px-4 neu-inset text-xs rounded-xl bg-input-bg border-border-color text-primary-navy font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-primary-navy uppercase tracking-wider block">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="anand@mahindra.com"
                className="w-full h-11 px-4 neu-inset text-xs rounded-xl bg-input-bg border-border-color text-primary-navy font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-primary-navy uppercase tracking-wider block">Location (Local Area)</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Worli / Bandra"
                className="w-full h-11 px-4 neu-inset text-xs rounded-xl bg-input-bg border-border-color text-primary-navy font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-primary-navy uppercase tracking-wider block">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Mumbai"
                className="w-full h-11 px-4 neu-inset text-xs rounded-xl bg-input-bg border-border-color text-primary-navy font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-primary-navy uppercase tracking-wider block">Lead Source</label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="w-full h-11 px-3 border border-border-color bg-input-bg rounded-xl font-medium"
              >
                {leadSources.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-primary-navy uppercase tracking-wider block">Configuration Preference</label>
              <select
                value={formData.bedroom_preference}
                onChange={(e) => setFormData({ ...formData, bedroom_preference: e.target.value })}
                className="w-full h-11 px-3 border border-border-color bg-input-bg rounded-xl font-medium"
              >
                <option value="1 BHK">1 BHK</option>
                <option value="2 BHK">2 BHK</option>
                <option value="2.5 BHK">2.5 BHK</option>
                <option value="3 BHK">3 BHK</option>
                <option value="3.5 BHK">3.5 BHK</option>
                <option value="4 BHK">4 BHK</option>
                <option value="4.5 BHK">4.5 BHK</option>
                <option value="Garden Apartment">Garden Apartment</option>
                <option value="Penthouse">Penthouse</option>
                <option value="Villa/Bungalow/Rowhouse">Villa/Bungalow/Rowhouse</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-primary-navy uppercase tracking-wider block">Min Carpet Area (sqft)</label>
              <input
                type="number"
                value={formData.carpet_area_min}
                onChange={(e) => setFormData({ ...formData, carpet_area_min: e.target.value })}
                placeholder="e.g. 500"
                className="w-full h-11 px-4 neu-inset text-xs rounded-xl bg-input-bg border-border-color text-primary-navy font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-primary-navy uppercase tracking-wider block">Max Carpet Area (sqft)</label>
              <input
                type="number"
                value={formData.carpet_area_max}
                onChange={(e) => setFormData({ ...formData, carpet_area_max: e.target.value })}
                placeholder="e.g. 2500"
                className="w-full h-11 px-4 neu-inset text-xs rounded-xl bg-input-bg border-border-color text-primary-navy font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-primary-navy uppercase tracking-wider block font-mono">Min Budget (INR)</label>
              <input
                type="number"
                value={formData.budget_min}
                onChange={(e) => setFormData({ ...formData, budget_min: e.target.value })}
                placeholder="15000000 (1.5 Cr)"
                className="w-full h-11 px-4 neu-inset text-xs rounded-xl bg-input-bg border-border-color text-primary-navy font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-primary-navy uppercase tracking-wider block font-mono">Max Budget (INR)</label>
              <input
                type="number"
                value={formData.budget_max}
                onChange={(e) => setFormData({ ...formData, budget_max: e.target.value })}
                placeholder="30000000 (3.0 Cr)"
                className="w-full h-11 px-4 neu-inset text-xs rounded-xl bg-input-bg border-border-color text-primary-navy font-medium"
              />
            </div>
          </div>

          {/* Project Interests Selector */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-primary-navy uppercase tracking-wider block">Project Interest Links (Multi-select)</label>
            <div className="flex flex-wrap gap-2">
              {projects.map(proj => {
                const isSelected = formData.project_interests.includes(proj.id);
                return (
                  <button
                    key={proj.id}
                    type="button"
                    onClick={() => toggleFormProjectInterest(proj.id)}
                    className={`px-3 py-2 rounded-xl text-[10px] font-semibold border transition-all ${
                      isSelected 
                        ? 'bg-primary-navy text-white border-primary-navy'
                        : 'bg-white text-text-secondary border-border-color/65'
                    }`}
                  >
                    {proj.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-primary-navy uppercase tracking-wider block">Initial Summary Notes</label>
            <textarea
              value={formData.initial_notes}
              onChange={(e) => setFormData({ ...formData, initial_notes: e.target.value })}
              placeholder="Record any introductory requests or customer details here..."
              className="w-full p-3 h-20 neu-inset text-xs rounded-xl bg-input-bg border-border-color focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full h-12 neu-button-gold text-white text-xs font-bold uppercase tracking-widest active:scale-95 transition-transform mt-3 border-none"
            id="submit-lead-form-btn"
          >
            {editingLeadRecordId ? "Save Lead Updates" : "Create Qualified Lead"}
          </button>
        </form>
      </BottomDrawer>

      {/* 4. MODAL DRAWER: SEARCH FILTERS SYSTEM */}
      <BottomDrawer
        isOpen={isOpenFilterSheet}
        onClose={() => setIsOpenFilterSheet(false)}
        title="Filter Leads Pipeline"
      >
        <div className="space-y-4 text-xs text-left pb-12">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-primary-navy uppercase tracking-wider block">Lead Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-11 px-3 border border-border-color bg-input-bg rounded-xl font-semibold text-primary-navy"
            >
              <option value="">All Statuses</option>
              {Object.values(LeadStatus).map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-primary-navy uppercase tracking-wider block">Lead Origin Source</label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full h-11 px-3 border border-border-color bg-input-bg rounded-xl font-semibold text-primary-navy"
            >
              <option value="">All Sources</option>
              {leadSources.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-primary-navy uppercase tracking-wider block">Builder Project Interest</label>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="w-full h-11 px-3 border border-border-color bg-input-bg rounded-xl font-semibold text-primary-navy"
            >
              <option value="">All Portfolios</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-primary-navy uppercase tracking-wider block">Assigned Executive (Company Admin only)</label>
            <select
              value={assignFilter}
              onChange={(e) => setAssignFilter(e.target.value)}
              className="w-full h-11 px-3 border border-border-color bg-input-bg rounded-xl font-semibold text-primary-navy"
            >
              <option value="">All Company Personnel</option>
              {allUsers.map(u => (
                <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-primary-navy uppercase tracking-wider block font-display">Budget Min (₹)</label>
              <input
                type="number"
                placeholder="e.g. 3000000"
                value={budgetMinFilter}
                onChange={(e) => setBudgetMinFilter(e.target.value)}
                className="w-full h-11 px-3 border border-border-color bg-input-bg rounded-xl font-mono text-primary-navy"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-primary-navy uppercase tracking-wider block font-display">Budget Max (₹)</label>
              <input
                type="number"
                placeholder="e.g. 15000000"
                value={budgetMaxFilter}
                onChange={(e) => setBudgetMaxFilter(e.target.value)}
                className="w-full h-11 px-3 border border-border-color bg-input-bg rounded-xl font-mono text-primary-navy"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-primary-navy uppercase tracking-wider block font-display">Created From</label>
              <input
                type="date"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                className="w-full h-11 px-3 border border-border-color bg-input-bg rounded-xl text-primary-navy font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-primary-navy uppercase tracking-wider block font-display">Created To</label>
              <input
                type="date"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                className="w-full h-11 px-3 border border-border-color bg-input-bg rounded-xl text-primary-navy font-mono"
              />
            </div>
          </div>

          <div className="flex space-x-3 pt-3">
            <button
              onClick={handleResetFilters}
              className="flex-1 h-11 border border-border-color text-primary-navy rounded-xl text-xs uppercase font-bold active:scale-95 transition-transform"
            >
              Reset
            </button>
            <button
              onClick={handleApplyFilters}
              className="flex-1 h-11 bg-primary-navy text-white rounded-xl text-xs uppercase font-bold active:scale-95 transition-transform"
            >
              Apply Filter
            </button>
          </div>
        </div>
      </BottomDrawer>

      {/* 5. MODAL DRAWER: BULK MANIPULATIONS SHEET */}
      <BottomDrawer
        isOpen={isOpenBulkSheet}
        onClose={() => setIsOpenBulkSheet(false)}
        title="Core Bulk Operations"
      >
        <div className="space-y-5 text-xs text-left pb-12">
          <p className="text-[11px] text-text-secondary leading-normal bg-slate-50 border p-3 rounded-2xl">
            You are currently administering <strong className="text-primary-navy">{selectedLeadIds.length}</strong> checked lead profile(s). Choose one bulk module below to execute:
          </p>

          {/* Module A: Reassignments */}
          {activeUser && [UserRole.TEAM_LEADER, UserRole.COMPANY_ADMIN].includes(activeUser.role) && (
            <div className="p-4 bg-white border border-border-color rounded-3xl space-y-2.5 shadow-sm">
              <h4 className="text-[10px] font-bold text-premium-gold uppercase tracking-wider flex items-center space-x-1.5">
                <Users className="w-4 h-4" />
                <span>Bulk Lead Reassignment</span>
              </h4>
              <label className="text-[10.5px] text-text-secondary">Select Target Personnel Employee:</label>
              <div className="flex space-x-2">
                <select
                  value={bulkTargetUser}
                  onChange={(e) => setBulkTargetUser(e.target.value)}
                  className="flex-1 h-11 px-3 border border-border-color bg-input-bg rounded-xl text-xs font-semibold"
                >
                  <option value="">Choose Employee...</option>
                  {allUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
                  ))}
                </select>
                <button
                  onClick={handleBulkReassign}
                  disabled={!bulkTargetUser}
                  className="h-11 px-4 bg-primary-navy text-white text-xs font-bold rounded-xl active:scale-95 disabled:opacity-50"
                  id="bulk-reassign-confirm"
                >
                  Reassign
                </button>
              </div>
            </div>
          )}

          {/* Module B: Status updates */}
          <div className="p-4 bg-white border border-border-color rounded-3xl space-y-2.5 shadow-sm">
            <h4 className="text-[10px] font-bold text-premium-gold uppercase tracking-wider flex items-center space-x-1.5">
              <CheckSquare className="w-4 h-4" />
              <span>Bulk Status Shift</span>
            </h4>
            <label className="text-[10.5px] text-text-secondary">Select Target Pipeline Status State:</label>
            <div className="flex space-x-2">
              <select
                value={bulkTargetStatus}
                onChange={(e) => setBulkTargetStatus(e.target.value)}
                className="flex-1 h-11 px-3 border border-border-color bg-input-bg rounded-xl text-xs font-semibold"
              >
                <option value="">Choose Status...</option>
                {Object.values(LeadStatus).map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
              <button
                onClick={handleBulkStatusUpdate}
                disabled={!bulkTargetStatus}
                className="h-11 px-4 bg-primary-navy text-white text-xs font-bold rounded-xl active:scale-95 disabled:opacity-50"
                id="bulk-status-confirm"
              >
                Update Status
              </button>
            </div>
          </div>
        </div>
      </BottomDrawer>

      {/* 6. MODAL DRAWER: ARRANGE CALLBACK (Follow-up scheduler) */}
      <BottomDrawer
        isOpen={isOpenFollowupScheduler}
        onClose={() => setIsOpenFollowupScheduler(false)}
        title="Arrange Callback Scheduled"
      >
        <form onSubmit={handleSubmitFollowup} className="space-y-4 text-xs text-left pb-16">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-primary-navy uppercase tracking-wider block">Follow-up Date & Time (Required)</label>
            <input
              type="datetime-local"
              required
              value={followupForm.scheduled_at}
              onChange={(e) => setFollowupForm({ ...followupForm, scheduled_at: e.target.value })}
              className="w-full h-11 px-4 neu-inset text-xs rounded-xl bg-input-bg text-primary-navy font-semibold border-border-color"
              id="followup-schedule-time"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-primary-navy uppercase tracking-wider block">Follow-up Communication Medium</label>
            <select
              value={followupForm.type}
              onChange={(e) => setFollowupForm({ ...followupForm, type: e.target.value as any })}
              className="w-full h-11 px-3 border border-border-color bg-input-bg rounded-xl font-medium"
            >
              <option value="Call">Standard Phone Call</option>
              <option value="WhatsApp">WhatsApp Message Chat</option>
              <option value="In-Person">In-Person Meeting</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-primary-navy uppercase tracking-wider block">Agenda / Outcome Expectations</label>
            <textarea
              value={followupForm.notes}
              onChange={(e) => setFollowupForm({ ...followupForm, notes: e.target.value })}
              placeholder="e.g. Schedule visit next Saturday. Send villas masterplans details..."
              className="w-full p-3 h-20 neu-inset text-xs rounded-xl bg-input-bg border-border-color focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full h-11 bg-primary-navy text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow active:scale-95 transition-transform"
            id="followup-schedule-submit"
          >
            Arrange Callback Hold
          </button>
        </form>
      </BottomDrawer>

      {/* 7. MODAL DRAWER: ARRANGE VISIT (Site visit scheduler) */}
      <BottomDrawer
        isOpen={isOpenSiteVisitScheduler}
        onClose={() => setIsOpenSiteVisitScheduler(false)}
        title="Arrange Property Site Tour"
      >
        <form onSubmit={handleSubmitSiteVisit} className="space-y-4 text-xs text-left pb-16">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-primary-navy uppercase tracking-wider block">Select Target Builder Project Portfolio</label>
            <select
              required
              value={visitForm.project_id}
              onChange={(e) => setVisitForm({ ...visitForm, project_id: e.target.value })}
              className="w-full h-11 px-3 border border-border-color bg-input-bg rounded-xl font-semibold"
            >
              <option value="">Choose Project...</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-primary-navy uppercase tracking-wider block">Visit Date (Required)</label>
              <input
                type="date"
                required
                value={visitForm.scheduled_date}
                onChange={(e) => setVisitForm({ ...visitForm, scheduled_date: e.target.value })}
                className="w-full h-11 px-4 neu-inset text-xs rounded-xl bg-input-bg text-primary-navy font-semibold border-border-color"
                id="site-visit-schedule-date"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-primary-navy uppercase tracking-wider block font-mono">Arrival Time (Required)</label>
              <input
                type="time"
                required
                value={visitForm.scheduled_time}
                onChange={(e) => setVisitForm({ ...visitForm, scheduled_time: e.target.value })}
                className="w-full h-11 px-4 neu-inset text-xs rounded-xl bg-input-bg text-primary-navy font-semibold border-border-color"
                id="site-visit-schedule-time"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 items-center">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-primary-navy uppercase tracking-wider block">Visitors Headcount</label>
              <input
                type="number"
                value={visitForm.visitors_count}
                onChange={(e) => setVisitForm({ ...visitForm, visitors_count: e.target.value })}
                className="w-full h-11 px-4 neu-inset text-xs rounded-xl bg-input-bg border-border-color text-primary-navy font-medium"
              />
            </div>
            
            <div className="flex items-center space-x-2 pt-4">
              <input
                type="checkbox"
                checked={visitForm.transport_arranged}
                onChange={(e) => setVisitForm({ ...visitForm, transport_arranged: e.target.checked })}
                className="w-5 h-5 rounded text-premium-gold border-border-color bg-input-bg"
                id="visit-transport-chk"
              />
              <label className="text-[10px] font-bold text-primary-navy uppercase tracking-wider leading-none">Arrange Agency Cab</label>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-primary-navy uppercase tracking-wider block">Driver Details / Agenda Notes</label>
            <textarea
              value={visitForm.notes}
              onChange={(e) => setVisitForm({ ...visitForm, notes: e.target.value })}
              placeholder="e.g. Cab pick-up from Bandra West. Host walk-in in Aura heights penthouse block."
              className="w-full p-3 h-20 neu-inset text-xs rounded-xl bg-input-bg border-border-color focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full h-11 bg-primary-navy text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow active:scale-95 transition-transform"
            id="site-visit-schedule-submit"
          >
            Schedule Site Visit Tour
          </button>
        </form>
      </BottomDrawer>

      {/* 8. MODAL DRAWER: BULK MAIN LEAD IMPORT */}
      <BottomDrawer
        isOpen={isOpenImportSheet}
        onClose={() => setIsOpenImportSheet(false)}
        title="Bulk Import Main Leads Database"
      >
        <div className="space-y-4 text-xs text-left pb-16">
          <div className="bg-slate-50 border p-3 border-border-color rounded-2xl flex items-start justify-between space-x-2">
            <div className="space-y-1">
              <h4 className="font-semibold text-primary-navy text-[11px]">Pipeline Import Standard Headers</h4>
              <p className="text-[10px] text-text-secondary leading-normal">
                Use columns: <span className="font-mono bg-white px-1.5 py-0.5 border text-primary-navy rounded text-[9px]">Name,Phone,Status,Followup Date (YYYY-MM-DD),Email,Source,Notes</span>
              </p>
            </div>
            <button
              onClick={downloadMainLeadTemplate}
              className="px-2.5 py-1 bg-white border border-border-color hover:border-premium-gold hover:text-premium-gold rounded-lg text-[9px] font-bold uppercase tracking-wider shrink-0 transition-all flex items-center space-x-1"
            >
              <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
              <span>Get CSV Template</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-primary-navy uppercase tracking-wider block">Browse File Input:</label>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border-color hover:border-premium-gold/70 rounded-2xl cursor-pointer bg-slate-50 hover:bg-slate-50/50 transition-all p-3 text-center">
                  <div className="flex flex-col items-center justify-center space-y-1">
                    <Upload className="w-5 h-5 text-slate-400" />
                    <p className="text-[11px] font-bold text-slate-600">Select .CSV file</p>
                    <p className="text-[9px] text-slate-400 font-medium">Automatic text area populating</p>
                  </div>
                  <input 
                    type="file" 
                    accept=".csv" 
                    onChange={handleMainCSVFileChange} 
                    className="hidden" 
                    id="main-csv-file-selector"
                  />
                </label>
              </div>
            </div>

            {/* Assignment filter selector to direct Company Admin / Team Leader permissions */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-primary-navy uppercase tracking-wider block font-mono text-premium-gold">Assign Imported Leads To:</label>
              <div className="space-y-1">
                <select
                  value={importSelectedAssignee}
                  onChange={(e) => setImportSelectedAssignee(e.target.value)}
                  className="w-full h-11 px-3 border border-border-color bg-input-bg rounded-xl font-semibold"
                  id="import-assignee-dropdown"
                >
                  <option value="">Omit (Assign entirely to me / Creator)</option>
                  {assigneesForImport.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name} ({u.role === UserRole.TEAM_LEADER ? 'Team Leader' : 'Sales Executive'})</option>
                  ))}
                </select>
                <p className="text-[9.5px] text-text-secondary leading-snug pt-0.5">
                  {activeUser?.role === UserRole.COMPANY_ADMIN 
                    ? "As Company Admin, you can dispatch leads to all Team Leaders (TL) or Sales Executives (SE)." 
                    : "As Team Leader, you can dispatch leads exclusively to your Sales Executives (SE)."}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-primary-navy uppercase tracking-wider block">Raw CSV Text Content (Editable):</label>
            <textarea
              value={importCsvText}
              onChange={(e) => setImportCsvText(e.target.value)}
              placeholder="Name,Phone,Status,Followup Date,Email,Source,Notes&#10;MS Dhoni,9988112233,Interested,2026-06-30,dhoni@csk.com,Facebook,Wants premium duplex"
              className="w-full text-xs h-32 font-mono p-3 rounded-2xl bg-input-bg border border-border-color text-primary-navy focus:outline-none"
              id="main-leads-csv-text-area"
              required
            />
          </div>

          <button
            onClick={handleMainLeadCSVImport}
            disabled={!importCsvText.trim() || isImporting}
            className="w-full h-11 neu-button-gold text-white text-xs font-bold uppercase flex items-center justify-center space-x-2 active:scale-95 border-none disabled:opacity-50 transition-all"
            id="main-leads-import-excel-submit"
          >
            {isImporting ? (
              <span>Importing leads in database...</span>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Confirm Ingestion & Dispatch Pipeline</span>
              </>
            )}
          </button>

          {importResult && (
            <div className="rounded-[20px] bg-slate-50 border p-4 space-y-2 text-xs">
              <h4 className="font-semibold text-primary-navy flex items-center space-x-1">
                {importResult.success ? (
                  <CheckCircle className="w-4 h-4 text-success" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-danger" />
                )}
                <span>Import Operation Results Report</span>
              </h4>
              
              {importResult.success ? (
                <>
                  <div className="grid grid-cols-2 gap-4 text-center py-2 bg-white rounded-xl border border-dashed text-[11px] font-bold">
                    <div>
                      <span className="text-lg text-success block">{importResult.importedCount}</span>
                      <span className="text-[9px] uppercase tracking-wide text-text-secondary font-medium">Leads Ingested</span>
                    </div>
                    <div>
                      <span className="text-lg text-amber-500 block">{importResult.duplicateCount}</span>
                      <span className="text-[9px] uppercase tracking-wide text-text-secondary font-medium font-mono font-bold">Duplicate Skipped</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-green-700 leading-normal bg-green-50/50 p-2 border border-green-200/50 rounded-xl">
                    Pipeline database updated successfully. Followup schedules have been linked for active records.
                  </p>
                </>
              ) : (
                <p className="text-[11px] text-danger bg-red-50 p-2.5 border border-red-200 rounded-xl leading-normal">
                  {importResult.error || "Execution failed. Check format syntax."}
                </p>
              )}
            </div>
          )}
        </div>
      </BottomDrawer>

      {/* 8. CUSTOM LEAD PURGE DIALOG (Replaces window.confirm) */}
      {isDeleteDialogOpen && activeLeadDetails?.lead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl border border-rose-100 shadow-2xl p-6 space-y-4 text-center animate-scale-up">
            <div className="mx-auto w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
              <Trash2 className="w-6 h-6" />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide font-display">Confirm Permanent Purge</h3>
              <p className="text-[11px] text-text-secondary leading-relaxed px-2">
                CRITICAL WARNING: Are you absolutely certain you want to permanently delete lead registration database record for <strong className="text-rose-700 font-semibold font-mono">"{activeLeadDetails.lead.full_name}"</strong>?
              </p>
              <p className="text-[10px] text-rose-600 bg-rose-50 p-2.5 border border-rose-100/50 rounded-xl leading-normal mt-2 font-medium">
                This operation cannot be undone and will permanently purge all related followup, meeting timeline, and site visit history from the database system.
              </p>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteDialogOpen(false)}
                className="flex-1 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-800 font-bold rounded-xl text-xs uppercase cursor-pointer border-none"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    const success = await deleteLead(activeLeadDetails.lead.id);
                    if (success) {
                      alert('Lead successfully purged.');
                      setActiveLeadId(null);
                      setIsDeleteDialogOpen(false);
                    } else {
                      alert('Purge operation failed.');
                    }
                  } catch (err: any) {
                    console.error("Purge failure:", err);
                    alert(`Failed to delete: ${err.message || err}`);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="flex-1 h-11 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-rose-200 border-none disabled:opacity-50"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <span>Purging...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Purge Record</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
