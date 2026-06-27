/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../lib/store';
import { ColdStatus, UserRole } from '../types';
import { 
  ArrowRightLeft, FileSpreadsheet, Key, Lock, PhoneCall, Plus, Search, 
  Sparkles, Upload, UserCheck, ShieldClose, AlertTriangle, CheckCircle, ExternalLink, MessageSquare
} from 'lucide-react';
import BottomDrawer from './BottomDrawer';
import EmptyState from './EmptyState';
import SkeletonLoader from './SkeletonLoader';

export default function ColdCallingScreen() {
  const { 
    activeUser,
    coldRecords,
    fetchColdData,
    updateColdStatus,
    bulkUploadCold,
    bulkAssignCold,
    bulkDeleteCold,
    convertColdToLead,
    projects,
    users: allUsers,
    fetchUsers,
    setActiveTab,
    setActiveLeadId,
    leadSources,
    fetchLeadSources
  } = useAppStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);

  const [activeSubTab, setActiveSubTab] = useState<'assigned' | 'upload'>('assigned');

  // Conversion flow states
  const [convertingRecord, setConvertingRecord] = useState<any | null>(null);
  const [conversionForm, setConversionPayload] = useState({
    assigned_to: '',
    project_interests: [] as string[],
    budget_min: '',
    budget_max: '',
    bedroom_preference: '2BHK',
    notes: ''
  });
  const [conversionError, setConversionError] = useState('');

  // Bulk CSV Upload states
  const [csvContentText, setCsvContentText] = useState('');
  const [uploadResult, setUploadResult] = useState<any | null>(null);
  const [bulkUploadAssigneeId, setBulkUploadAssigneeId] = useState('');

  // Bulk Assignment selection states
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [targetAssigneeId, setTargetAssigneeId] = useState('');

  // Call outcome states
  const [updatingRecordId, setUpdatingRecordId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [outcomeNotes, setOutcomeNotes] = useState('');

  useEffect(() => {
    fetchColdData();
    fetchUsers();
    fetchLeadSources();
  }, [activeUser]);

  const getSourceName = (sourceId: string | undefined) => {
    if (!sourceId) return '';
    const found = leadSources?.find(s => s.id === sourceId);
    return found ? found.name : sourceId;
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    fetchColdData({ search: e.target.value, status: statusFilter });
  };

  const handleStatusFilterChange = (st: string) => {
    setStatusFilter(st);
    fetchColdData({ search, status: st });
  };

  // Convert cold to active lead
  const handleOpenConversion = (rec: any) => {
    setConvertingRecord(rec);
    setConversionPayload({
      assigned_to: activeUser?.role === UserRole.SALES_EXECUTIVE ? activeUser.id : '',
      project_interests: [],
      budget_min: '',
      budget_max: '',
      bedroom_preference: '2BHK',
      notes: rec.notes || ''
    });
    setConversionError('');
  };

  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertingRecord) return;
    setConversionError('');

    const res = await convertColdToLead(convertingRecord.id, {
      ...conversionForm,
      budget_min: Number(conversionForm.budget_min) || undefined,
      budget_max: Number(conversionForm.budget_max) || undefined
    });

    if (res.success) {
      setConvertingRecord(null);
      fetchColdData();
      // Redirect dynamically to Leads
      if (res.lead) {
        if (confirm("Qualified successfully! Would you like to view the newly created profile under Leads?")) {
          setActiveLeadId(res.lead.id);
          setActiveTab('leads');
        }
      }
    } else {
      setConversionError(res.error || 'Failed to finish conversion.');
    }
  };

  // Submits a single status outcome callback notes update
  const handleUpdateStatusSubmit = async () => {
    if (!updatingRecordId || !newStatus) return;
    const ok = await updateColdStatus(updatingRecordId, newStatus, outcomeNotes);
    if (ok) {
      setUpdatingRecordId(null);
      setNewStatus('');
      setOutcomeNotes('');
    }
  };

  // CSV Bulk upload simulator (Page 13)
  const handleSimulateCSVUpload = async () => {
    if (!csvContentText.trim()) return;

    // Parse simple CSV rows
    const lines = csvContentText.split('\n');
    const recordsToUpload: any[] = [];

    lines.forEach((line, i) => {
      if (i === 0 || !line.trim()) return; // skip headers
      const parts = line.split(',');
      if (parts.length >= 2) {
        recordsToUpload.push({
          name: parts[0]?.trim(),
          phone: parts[1]?.trim(),
          city: parts[2]?.trim() || '',
          source: parts[3]?.trim() || 'Facebook Lead Ad',
          notes: parts[4]?.trim() || ''
        });
      }
    });

    if (recordsToUpload.length === 0) {
      alert("No valid rows discovered in input text blocks.");
      return;
    }

    const res = await bulkUploadCold(recordsToUpload, bulkUploadAssigneeId || undefined);
    setUploadResult(res);
    setCsvContentText('');
  };

  const isAdminOrTL = activeUser && [UserRole.COMPANY_ADMIN, UserRole.TEAM_LEADER].includes(activeUser.role);
  const assignableUsers = allUsers.filter(u => u.is_active);

  const toggleSelectAll = () => {
    const nonConvertedRecords = coldRecords.filter(r => r.status !== ColdStatus.CONVERTED_TO_LEAD);
    if (selectedIds.length === nonConvertedRecords.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(nonConvertedRecords.map(r => r.id));
    }
  };

  const handleBulkAssignSubmit = async () => {
    if (selectedIds.length === 0 || !targetAssigneeId) return;
    const ok = await bulkAssignCold(selectedIds, targetAssigneeId);
    if (ok) {
      setSelectedIds([]);
      setTargetAssigneeId('');
      alert("Selected cold contacts assigned successfully.");
    } else {
      alert("Failed to assign selected cold contacts.");
    }
  };

  const handleBulkDeleteSubmit = () => {
    if (selectedIds.length === 0) return;
    setDeleteConfirmationOpen(true);
  };

  const handleCSVFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContentText(text);
    };
    reader.readAsText(file);
  };

  const downloadCSVTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,Name,Phone,City,Source,Notes\nSachin Tendulkar,9999988888,Mumbai,Organic Website,Interested in 3BHK\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "ImCRM_ColdCalling_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const executeCall = (ph: string) => {
    window.location.href = `tel:${ph}`;
  };

  const isSE = activeUser?.role === UserRole.SALES_EXECUTIVE;

  return (
    <div className="flex flex-col select-none pb-28 text-left space-y-4">
      
      {/* Subtab selection - Hidden for Sales Executives */}
      {!isSE && (
        <div className="flex bg-white p-1 rounded-2xl border border-border-color shadow-sm">
          <button
            onClick={() => setActiveSubTab('assigned')}
            className={`flex-1 py-2 text-center text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
              activeSubTab === 'assigned' 
                ? 'bg-primary-navy text-white shadow' 
                : 'text-text-secondary hover:text-primary-navy'
            }`}
            id="coldtab-assigned"
          >
            Assigned Datasets
          </button>
          <button
            onClick={() => {
              setActiveSubTab('upload');
              setUploadResult(null);
            }}
            className={`flex-1 py-2 text-center text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
              activeSubTab === 'upload' 
                ? 'bg-primary-navy text-white shadow' 
                : 'text-text-secondary hover:text-primary-navy'
            }`}
            id="coldtab-upload"
          >
            Bulk Upload CSV
          </button>
        </div>
      )}

      {activeSubTab === 'assigned' || isSE ? (
        <div className="space-y-4">
          
          {/* Search filter panel */}
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search raw pipeline by name..."
                value={search}
                onChange={handleSearchChange}
                className="w-full h-11 pl-9 pr-4 neu-inset text-xs rounded-xl bg-input-bg text-primary-navy"
                id="cold-search"
              />
              <Search className="absolute left-3 top-3 w-4 h-4 text-text-secondary" />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className="px-3 border border-border-color bg-white text-xs font-bold text-primary-navy rounded-xl"
              id="cold-status-select"
            >
              <option value="">All Call States</option>
              {Object.values(ColdStatus).map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Bulk Assign Panel */}
          {isAdminOrTL && selectedIds.length > 0 && (
            <div className="bg-[#fcf8f2] border border-premium-gold/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in shadow-sm">
              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 bg-[#0B1F33] text-premium-gold rounded-full flex items-center justify-center text-[10px] font-extrabold font-mono">
                  {selectedIds.length}
                </span>
                <span className="text-xs font-bold text-[#0B1F33]">Cold contacts selected for SE assignment</span>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <select
                  value={targetAssigneeId}
                  onChange={(e) => setTargetAssigneeId(e.target.value)}
                  className="h-9 px-3 border border-border-color bg-white text-[11px] font-bold text-primary-navy rounded-xl focus:outline-none"
                >
                  <option value="">Select SE/Agent...</option>
                  {assignableUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.role === UserRole.SALES_EXECUTIVE ? 'SE' : u.role === UserRole.TEAM_LEADER ? 'TL' : 'Admin'})
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleBulkAssignSubmit}
                  disabled={!targetAssigneeId}
                  className="h-9 px-3.5 bg-[#0B1F33] text-white text-[10px] font-bold uppercase rounded-xl shadow hover:bg-slate-800 disabled:opacity-40 transition-all active:scale-95"
                >
                  Assign
                </button>

                <button
                  onClick={handleBulkDeleteSubmit}
                  className="h-9 px-3.5 bg-red-600 text-white text-[10px] font-bold uppercase rounded-xl shadow hover:bg-red-700 transition-all active:scale-95 cursor-pointer"
                >
                  Delete Selected
                </button>

                <button
                  onClick={() => setSelectedIds([])}
                  className="h-9 px-2 text-[10px] font-bold uppercase text-text-secondary hover:text-primary-navy"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Select All Checkbox */}
          {isAdminOrTL && coldRecords.some(r => r.status !== ColdStatus.CONVERTED_TO_LEAD) && (
            <div className="flex justify-between items-center px-1">
              <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={coldRecords.length > 0 && selectedIds.length === coldRecords.filter(r => r.status !== ColdStatus.CONVERTED_TO_LEAD).length}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded text-premium-gold focus:ring-premium-gold accent-premium-gold cursor-pointer"
                />
                <span className="text-[10px] font-bold text-primary-navy uppercase tracking-wider">
                  Select All Unqualified Contacts
                </span>
              </label>
            </div>
          )}

          {/* List panel */}
          <div className="space-y-3">
            {coldRecords.length === 0 ? (
              <EmptyState title="No Cold Contacts Assigned" description="You have finished all scheduled lists! Simulates importing fresh records to call people." icon={Sparkles} />
            ) : (
              coldRecords.map((rec) => {
                const isConverted = rec.status === ColdStatus.CONVERTED_TO_LEAD;
                
                return (
                  <div 
                    key={rec.id} 
                    className={`neu-flat p-4 bg-white border border-border-color transition-all relative overflow-hidden flex flex-col space-y-3 animate-fade-in ${
                      isConverted ? 'opacity-70 bg-slate-50/50' : ''
                    } ${isAdminOrTL && !isConverted ? 'pl-11' : ''}`}
                  >
                    {/* Individual Checkbox */}
                    {isAdminOrTL && !isConverted && (
                      <div className="absolute top-4 left-4 z-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(rec.id)}
                          onChange={() => {
                            if (selectedIds.includes(rec.id)) {
                              setSelectedIds(selectedIds.filter(id => id !== rec.id));
                            } else {
                              setSelectedIds([...selectedIds, rec.id]);
                            }
                          }}
                          className="w-4 h-4 rounded text-premium-gold focus:ring-premium-gold accent-premium-gold cursor-pointer"
                        />
                      </div>
                    )}
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-bold text-primary-navy flex items-center space-x-1 font-display">
                          <span>{rec.full_name}</span>
                          {isConverted && (
                            <span title="Profile locked">
                              <Lock className="w-3.5 h-3.5 text-premium-gold" />
                            </span>
                          )}
                        </h4>
                        <p className="text-[10px] text-text-secondary mt-0.5 font-mono">{rec.phone} • Region: {rec.city || 'Delhi/NCR'}</p>
                      </div>

                      <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                        isConverted ? 'bg-premium-gold/15 text-premium-gold' : 'bg-input-bg text-primary-navy'
                      }`}>
                        {rec.status}
                      </span>
                    </div>

                    <p className="text-[11px] text-text-secondary leading-normal bg-input-bg p-2 rounded-xl">
                      Origin Source: {getSourceName(rec.source_id) || 'General Registry'} <br/>
                      Remarks: {rec.notes || 'No introductory callback comments registered yet.'}
                    </p>

                    {/* Single record update overlay */}
                    {updatingRecordId === rec.id && (
                      <div className="p-3.5 bg-slate-50 rounded-2xl border space-y-3 animate-fade-in">
                        <div className="space-y-1">
                          <label className="text-[9.5px] font-bold text-primary-navy uppercase tracking-wide">Call Outcome Status State:</label>
                          <select
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value)}
                            className="w-full h-9 px-3 border border-border-color bg-white rounded-lg text-xs"
                          >
                            <option value="">Select status...</option>
                            <option value={ColdStatus.ATTEMPTED}>Attempted (No answer)</option>
                            <option value={ColdStatus.CONNECTED}>Connected (Spoke to client)</option>
                            <option value={ColdStatus.FOLLOWUP_REQUIRED}>Follow-up required callback</option>
                            <option value={ColdStatus.INTERESTED}>Interested (Qualifies for Lead!)</option>
                            <option value={ColdStatus.NOT_INTERESTED}>Not Interested (Reject)</option>
                            <option value={ColdStatus.WRONG_NUMBER}>Wrong number</option>
                            <option value={ColdStatus.DUPLICATE}>Already contacted (Duplicate)</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9.5px] font-bold text-primary-navy uppercase tracking-wide">Callback Output Notes:</label>
                          <textarea
                            value={outcomeNotes}
                            onChange={(e) => setOutcomeNotes(e.target.value)}
                            placeholder="Add brief details about the outcome..."
                            className="w-full p-2 h-14 neu-inset text-xs rounded-xl bg-white focus:outline-none"
                          />
                        </div>
                        <div className="flex justify-end space-x-2 pt-1">
                          <button
                            onClick={() => setUpdatingRecordId(null)}
                            className="px-3 py-1.5 text-[10px] font-bold uppercase text-text-secondary"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleUpdateStatusSubmit}
                            className="px-3.5 py-1.5 bg-primary-navy text-white text-[10px] font-bold uppercase rounded-lg shadow-sm"
                          >
                            Save Status Call
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex justify-between items-center border-t border-border-color/45 pt-2.5">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => executeCall(rec.phone)}
                          className="w-9 h-9 flex items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 active:scale-95 transition-transform"
                          title="Dial Call"
                        >
                          <PhoneCall className="w-4 h-4" />
                        </button>
                        
                        {!isConverted && !updatingRecordId && (
                          <button
                            onClick={() => {
                              setUpdatingRecordId(rec.id);
                              setNewStatus(rec.status);
                            }}
                            className="neu-button px-3.5 text-[10px] uppercase font-semibold text-text-secondary flex items-center space-x-1"
                          >
                            <span>Call Outcome</span>
                          </button>
                        )}
                      </div>

                      {/* Convert to Lead (Page 14 qualification gate) */}
                      {!isConverted ? (
                        <button
                          onClick={() => handleOpenConversion(rec)}
                          className={`neu-button px-4 py-2 text-[10px] uppercase font-bold flex items-center space-x-1 text-primary-navy ${
                            rec.status === ColdStatus.INTERESTED 
                              ? 'border-premium-gold text-premium-gold bg-premium-gold/5 font-extrabold scale-105 shadow-md' 
                              : ''
                          }`}
                          id={`convert-btn-${rec.id}`}
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          <span>Convert to Lead</span>
                        </button>
                      ) : (
                        <div className="flex items-center space-x-1 text-[10.5px] text-premium-gold font-medium bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Linked Qualified Profile</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        
        // 2. CSV UPLOAD simulator tab (Page 13 bulk template rules)
        <div className="space-y-4">
          <div className="rounded-[24px] neu-flat bg-white p-5 border space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-display font-semibold text-primary-navy">Pipeline Registry Importer</h3>
                <p className="text-[10px] text-text-secondary mt-1">Upload raw contacts databases via CSV format columns.</p>
              </div>

              <button
                onClick={downloadCSVTemplate}
                className="neu-button px-3 py-1.5 text-[9px] uppercase font-bold text-premium-gold border-premium-gold/35 flex items-center space-x-1"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Template .CSV</span>
              </button>
            </div>

            {/* Input area */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-primary-navy uppercase tracking-wider block">Upload CSV File:</label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border-color hover:border-premium-gold/70 rounded-2xl cursor-pointer bg-[#F8FAFC] hover:bg-slate-50/50 transition-all p-4 text-center">
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <Upload className="w-5 h-5 text-slate-400" />
                      <p className="text-[11px] font-bold text-slate-600">Select or Drag a .CSV file</p>
                      <p className="text-[9px] text-slate-400 font-medium">Auto-populates the template text block below</p>
                    </div>
                    <input 
                      type="file" 
                      accept=".csv" 
                      onChange={handleCSVFileChange} 
                      className="hidden" 
                      id="cold-csv-file-selector"
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-primary-navy uppercase tracking-wider block">CSV Rows Text Input (Including headers):</label>
                <textarea
                  value={csvContentText}
                  onChange={(e) => setCsvContentText(e.target.value)}
                  placeholder="Name,Phone,City,Source,Notes&#10;Mukesh Ambani,9988776655,Mumbai,Facebook Ad,Wants 3BHK penthouse&#10;Gautam Adani,9900112233,Ahmedabad,Organic Web,Interested in commercial open plots"
                  className="w-full text-xs h-36 font-mono p-3 rounded-2xl bg-input-bg border border-border-color text-primary-navy focus:outline-none"
                  id="csv-text-area"
                />
                <p className="text-[10.5px] text-text-secondary leading-normal">
                  Checks for unique duplication checks on mobile and alternate numbers automatically.
                </p>
              </div>

              {/* Assign to SE option for bulk upload */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-primary-navy uppercase tracking-wider block">Assign imported contacts to Sales Executive (Optional):</label>
                <select
                  value={bulkUploadAssigneeId}
                  onChange={(e) => setBulkUploadAssigneeId(e.target.value)}
                  className="w-full h-11 px-3 border border-border-color bg-white text-xs font-semibold text-primary-navy rounded-xl focus:outline-none focus:ring-1 focus:ring-premium-gold"
                  id="bulk-upload-assign-select"
                >
                  <option value="">Default (Assign to myself)</option>
                  {assignableUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.role === UserRole.SALES_EXECUTIVE ? 'SE' : u.role === UserRole.TEAM_LEADER ? 'TL' : 'Admin'})
                    </option>
                  ))}
                </select>
                <p className="text-[9px] text-text-secondary leading-normal">
                  If left unselected, imported records will automatically be assigned to your account.
                </p>
              </div>
            </div>

            <button
              onClick={handleSimulateCSVUpload}
              disabled={!csvContentText.trim()}
              className="w-full h-11 neu-button-gold text-white text-xs font-bold uppercase flex items-center justify-center space-x-2 active:scale-95 border-none disabled:opacity-50"
              id="csv-upload-btn"
            >
              <Upload className="w-4 h-4" />
              <span>Simulate CSV Registry Import</span>
            </button>
          </div>

          {/* Results Summary and Logs feedback */}
          {uploadResult && (
            <div className="rounded-[24px] bg-slate-50 border p-5 space-y-3 animate-fade-in text-xs leading-normal">
              <h4 className="font-semibold text-primary-navy flex items-center space-x-1">
                <CheckCircle className="w-4 h-4 text-success" />
                <span>Import Feedbacks Report</span>
              </h4>
              <div className="grid grid-cols-2 gap-4 text-center py-2 bg-white rounded-2xl border border-dashed text-[11px]">
                <div>
                  <span className="text-lg font-bold text-success block">{uploadResult.addedCount}</span>
                  <span className="text-[9px] uppercase tracking-wide text-text-secondary">Added successfully</span>
                </div>
                <div>
                  <span className="text-lg font-bold text-danger block">{uploadResult.duplicateCount}</span>
                  <span className="text-[9px] uppercase tracking-wide text-text-secondary font-mono">Duplicates flagged</span>
                </div>
              </div>

              {/* Duplicate details warnings */}
              {uploadResult.duplicateCount > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 text-danger rounded-xl flex items-start space-x-2 text-[10.5px]">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>Caution! Duplicate rows with phone numbers already existing in leads or assigned cold data records were safely omitted.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. MODAL DRAWER: CONVERT TO ACTIONABLE LEAD FORM (Page 14 Qualification workflow) */}
      <BottomDrawer
        isOpen={convertingRecord !== null}
        onClose={() => setConvertingRecord(null)}
        title="Qualify Cold Contact to Lead"
      >
        {convertingRecord && (
          <form onSubmit={handleConvertSubmit} className="space-y-4 text-xs text-left pb-16">
            
            {conversionError && (
              <p className="p-3 bg-red-50 border border-red-200 text-danger font-medium rounded-xl text-center">
                {conversionError}
              </p>
            )}

            <div className="p-3 bg-slate-50 rounded-2xl space-y-1">
              <p className="font-bold text-primary-navy">Pre-filled Details:</p>
              <div className="text-[11px] text-text-secondary">
                <p>Name: <strong className="text-primary-navy">{convertingRecord.full_name}</strong></p>
                <p>Phone: <strong className="text-primary-navy font-mono">{convertingRecord.phone}</strong></p>
                <p>Source: <strong className="text-primary-navy font-mono">cold call (Pre-filled)</strong></p>
              </div>
            </div>

            {/* Select active assignee */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-primary-navy uppercase tracking-wider block">Assigned Sales Executive (Required)</label>
              <select
                required
                value={conversionForm.assigned_to}
                onChange={(e) => setConversionPayload({ ...conversionForm, assigned_to: e.target.value })}
                className="w-full h-11 px-3 border border-border-color bg-input-bg rounded-xl font-medium"
              >
                <option value="">Select Assignee...</option>
                {allUsers.filter(u => u.role === UserRole.SALES_EXECUTIVE || u.role === UserRole.TEAM_LEADER).map(u => (
                  <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-primary-navy uppercase tracking-wider block">Size Preference</label>
                <select
                  value={conversionForm.bedroom_preference}
                  onChange={(e) => setConversionPayload({ ...conversionForm, bedroom_preference: e.target.value })}
                  className="w-full h-11 px-3 border border-border-color bg-input-bg rounded-xl text-primary-navy font-semibold"
                >
                  <option value="1BHK">1 BHK Suite</option>
                  <option value="2BHK">2 BHK Condo</option>
                  <option value="3BHK">3 BHK Premium</option>
                  <option value="Penthouse">Ultra penthouse</option>
                  <option value="Plot">Open Plots</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-primary-navy uppercase tracking-wider block">Interest Portfolio</label>
                <select
                  onChange={(e) => setConversionPayload({ ...conversionForm, project_interests: [e.target.value] })}
                  className="w-full h-11 px-3 border border-border-color bg-input-bg rounded-xl text-primary-navy font-semibold"
                >
                  <option value="">Select active project...</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-primary-navy uppercase tracking-wider block font-mono">Min Budget (INR)</label>
                <input
                  type="number"
                  value={conversionForm.budget_min}
                  onChange={(e) => setConversionPayload({ ...conversionForm, budget_min: e.target.value })}
                  placeholder="10000000 (1.0 Cr)"
                  className="w-full h-11 px-4 neu-inset text-xs rounded-xl bg-input-bg border-border-color text-primary-navy"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-primary-navy uppercase tracking-wider block font-mono">Max Budget (INR)</label>
                <input
                  type="number"
                  value={conversionForm.budget_max}
                  onChange={(e) => setConversionPayload({ ...conversionForm, budget_max: e.target.value })}
                  placeholder="25000000 (2.5 Cr)"
                  className="w-full h-11 px-4 neu-inset text-xs rounded-xl bg-input-bg border-border-color text-primary-navy"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-primary-navy uppercase tracking-wider block">Qualification Conversion Notes</label>
              <textarea
                value={conversionForm.notes}
                onChange={(e) => setConversionPayload({ ...conversionForm, notes: e.target.value })}
                placeholder="Buyer highly interested. Requested weekend visit..."
                className="w-full p-3 h-20 neu-inset text-xs rounded-xl bg-input-bg border-border-color focus:outline-none"
              />
            </div>

            <p className="text-[10px] text-text-secondary leading-normal italic bg-slate-50 border p-2.5 rounded-xl">
              Confirms and submits: this cold record becomes locked (read-only) with reference to the freshly created Lead record instantly!
            </p>

            <button
              type="submit"
              className="w-full h-11 bg-primary-navy text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow active:scale-95 transition-all"
              id="confirm-convert-btn"
            >
              Confirm and Qualify Lead
            </button>
          </form>
        )}
      </BottomDrawer>

      {/* Delete Confirmation Modal */}
      {deleteConfirmationOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-sm w-full space-y-4 shadow-2xl relative">
            <div className="flex items-center space-x-3 text-red-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-display font-bold text-[#0B1F33] text-sm">Confirm Permanent Deletion</h3>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Are you sure you want to permanently delete the <strong className="text-red-600 font-bold">{selectedIds.length}</strong> selected cold contacts? This action is irreversible and will purge these records completely from the system.
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setDeleteConfirmationOpen(false)}
                className="h-10 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setDeleteConfirmationOpen(false);
                  const ok = await bulkDeleteCold(selectedIds);
                  if (ok) {
                    setSelectedIds([]);
                    alert("Selected cold contacts deleted successfully.");
                  } else {
                    alert("Failed to delete selected cold contacts.");
                  }
                }}
                className="h-10 px-5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase rounded-xl shadow active:scale-95 transition-all cursor-pointer"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
