/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../lib/store';
import { UserRole } from '../types';
import { 
  Building, CheckSquare, Clock, Key, Landmark, Lock, MapPin, 
  Plus, ShieldAlert, Sparkles, X, ChevronRight, UserPlus, FileText, CheckCircle2, AlertTriangle, ChevronDown,
  Search, SlidersHorizontal, Upload, DollarSign, Calendar, Layers, Eye, Edit, Trash2
} from 'lucide-react';
import BottomDrawer from './BottomDrawer';
import EmptyState from './EmptyState';
import SkeletonLoader from './SkeletonLoader';

export default function ProjectsScreen() {
  const { 
    activeUser,
    projects,
    activeProjectDetails,
    fetchProjects,
    fetchProjectDetails,
    activeProjectId,
    setActiveProjectId,
    leads,
    fetchLeads,
    addProject,
    updateProject,
    deleteProject,
    bulkImportProjects
  } = useAppStore();

  const [selectedBlock, setSelectedBlock] = useState('Block A');
  const [selectedConfigTab, setSelectedConfigTab] = useState<'bhk' | 'inventory' | 'approvals'>('inventory');

  // Interactive Selected Unit state
  const [activeUnitId, setActiveUnitId] = useState<string | null>(null);

  // Blocking / Token state inputs
  const [isOpenBlockForm, setIsOpenBlockForm] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [blockError, setBlockError] = useState('');

  // Developer quota block input
  const [isOpenQuotaForm, setIsOpenQuotaForm] = useState(false);
  const [quotaReason, setQuotaReason] = useState('');

  // Project Manual Creation Form Inputs
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjCity, setNewProjCity] = useState('');
  const [newProjBuilder, setNewProjBuilder] = useState('');
  const [newProjRera, setNewProjRera] = useState('');
  const [newProjLocation, setNewProjLocation] = useState('');
  const [newProjPossession, setNewProjPossession] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');

  // Project Editing Form Inputs
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [editProjName, setEditProjName] = useState('');
  const [editProjCity, setEditProjCity] = useState('');
  const [editProjBuilder, setEditProjBuilder] = useState('');
  const [editProjRera, setEditProjRera] = useState('');
  const [editProjLocation, setEditProjLocation] = useState('');
  const [editProjPossession, setEditProjPossession] = useState('');
  const [editProjDesc, setEditProjDesc] = useState('');
  const [editProjAmenities, setEditProjAmenities] = useState<string[]>([]);
  const [editProjConfigurations, setEditProjConfigurations] = useState<{
    id?: string;
    configuration_type: string;
    carpet_area: number;
    price: number;
    unit_count: number;
  }[]>([]);
  const [newEditAmenity, setNewEditAmenity] = useState('');
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Bulk Import CSV Paste Inputs
  const [showImportForm, setShowImportForm] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');

  // Advanced Project Multi-Filters and Search
  const [searchBar, setSearchBar] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterBudget, setFilterBudget] = useState(''); // max price in total price
  const [filterPossession, setFilterPossession] = useState(''); // year string, e.g. "2027"
  const [filterUnits, setFilterUnits] = useState(''); // min available units count
  const [filterPrice, setFilterPrice] = useState(''); // max base price per sqft
  const [filterConfig, setFilterConfig] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Custom Inventories list to attach to added project
  const [customInventories, setCustomInventories] = useState<Array<{ configuration: string; carpet_area: number; pricing_lakhs: number; count: number }>>([
    { configuration: '2 BHK', carpet_area: 750, pricing_lakhs: 80, count: 5 }
  ]);

  useEffect(() => {
    fetchProjects();
    fetchLeads();
  }, [activeUser]);

  useEffect(() => {
    if (activeProjectId) {
      fetchProjectDetails(activeProjectId);
      setSelectedConfigTab('inventory');
    }
  }, [activeProjectId]);

  // Submit single manual project
  const handleAddProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    setAddSuccess('');
    if (!newProjName.trim() || !newProjCity.trim()) {
      setAddError('Project Name and City are required fields.');
      return;
    }

    const payload = {
      name: newProjName.trim(),
      city: newProjCity.trim(),
      builder_name: newProjBuilder.trim() || undefined,
      rera_number: newProjRera.trim() || undefined,
      location: newProjLocation.trim() || undefined,
      description: newProjDesc.trim() || undefined,
      possession_date: newProjPossession.trim() || undefined,
      custom_inventories: customInventories
    };

    const res = await addProject(payload);
    if (res.success) {
      setAddSuccess('Project created successfully with custom inventory!');
      setNewProjName('');
      setNewProjCity('');
      setNewProjBuilder('');
      setNewProjRera('');
      setNewProjLocation('');
      setNewProjPossession('');
      setNewProjDesc('');
      setCustomInventories([
        { configuration: '2 BHK', carpet_area: 750, pricing_lakhs: 80, count: 5 }
      ]);
      setTimeout(() => {
        setShowAddForm(false);
        setAddSuccess('');
      }, 2000);
    } else {
      setAddError(res.error || 'Failed to create project.');
    }
  };

  // CSV bulk project import
  const handleCSVImportSubmit = async () => {
    setImportError('');
    setImportSuccess('');
    if (!csvText.trim()) {
      setImportError('Please enter some CSV rows or click "Load Sample" to populate.');
      return;
    }

    const lines = csvText.split('\n').map(line => line.trim()).filter(Boolean);
    if (lines.length < 2) {
      setImportError('CSV must include a header row and at least one data row.');
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));
    const parsedProjects = [];

    for (let i = 1; i < lines.length; i++) {
      const columns = lines[i].split(',').map(col => col.trim().replace(/^["']|["']$/g, ''));
      if (!columns.length || !columns[0]) continue;

      const pObj: any = {};
      headers.forEach((header, index) => {
        pObj[header] = columns[index] || '';
      });

      parsedProjects.push({
        name: pObj.name || pObj.project_name || pObj.project || '',
        builder_name: pObj.builder_name || pObj.builder || pObj.developer || 'Ingested Builder',
        city: pObj.city || 'Mumbai',
        location: pObj.location || pObj.address || pObj.city || 'Mumbai',
        possession_date: pObj.possession_date || pObj.possession || pObj.handover || '',
        rera_number: pObj.rera_number || pObj.rera || '',
        description: pObj.description || pObj.desc || ''
      });
    }

    const validPayload = parsedProjects.filter(p => p.name);
    if (!validPayload.length) {
      setImportError('Could not locate any rows with a valid project "name" column.');
      return;
    }

    const res = await bulkImportProjects(validPayload);
    if (res.success) {
      setImportSuccess(`Successfully imported ${res.importedCount} projects! (${res.duplicateCount} duplicates skipped).`);
      setCsvText('');
      setTimeout(() => {
        setShowImportForm(false);
        setImportSuccess('');
      }, 2000);
    } else {
      setImportError(res.error || 'Bulk parsing ingestion failed.');
    }
  };

  // Load sample CSV
  const loadSampleCSV = () => {
    setCsvText(
      "name,builder_name,city,location,possession_date,rera_number,description\n" +
      '"Royal Crest Gardens","Elegance Group","Mumbai","Bandra West, Mumbai","2027-12-31","PRM/MUM/RERA/9933","Super premium 3BHK high rises"\n' +
      '"Oakwood Meadows","Signature Realty","Bangalore","Whitefield Estates","2026-06-30","PRM/BLR/RERA/4422","Villas and row-homes near lakes"\n' +
      '"Verdana Heights","Insignia Builders","Pune","Kalyani Nagar, Pune","2028-10-15","PRM/PUN/RERA/1100","Ultra luxury deck houses"'
    );
  };

  // Open edit project form and populate values
  const handleEditProjectClick = () => {
    const currentProject = projects.find(p => p.id === activeProjectId);
    if (!currentProject) return;
    setEditProjName(currentProject.name || '');
    setEditProjCity(currentProject.city || '');
    setEditProjBuilder(currentProject.builder_name || '');
    setEditProjRera(currentProject.rera_number || '');
    setEditProjLocation(currentProject.location || '');
    setEditProjPossession(currentProject.possession_date || '');
    setEditProjDesc(currentProject.description || '');
    
    const existingAmenities = currentProject.amenities || activeProjectDetails?.project?.amenities || [];
    setEditProjAmenities(Array.isArray(existingAmenities) ? existingAmenities : []);

    const existingConfigs = activeProjectDetails?.configurations || [];
    setEditProjConfigurations(existingConfigs.map(c => ({
      id: c.id,
      configuration_type: c.configuration_type,
      carpet_area: c.carpet_area,
      price: c.price,
      unit_count: c.unit_count
    })));

    setNewEditAmenity('');
    setEditError('');
    setEditSuccess('');
    setIsEditingProject(true);
  };

  // Submit project updates
  const handleEditProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');
    setEditSuccess('');
    if (!activeProjectId) return;
    if (!editProjName.trim() || !editProjCity.trim()) {
      setEditError('Project Name and City are required fields.');
      return;
    }

    const payload = {
      name: editProjName.trim(),
      city: editProjCity.trim(),
      builder_name: editProjBuilder.trim(),
      rera_number: editProjRera.trim(),
      location: editProjLocation.trim(),
      description: editProjDesc.trim(),
      possession_date: editProjPossession.trim() || undefined,
      amenities: editProjAmenities,
      configurations: editProjConfigurations
    };

    const res = await updateProject(activeProjectId, payload);
    if (res.success) {
      setEditSuccess('Project updated successfully!');
      setTimeout(() => {
        setIsEditingProject(false);
      }, 1500);
    } else {
      setEditError(res.error || 'Failed to update project.');
    }
  };

  // Delete project
  const handleDeleteProjectSubmit = async () => {
    if (!activeProjectId) return;
    const success = await deleteProject(activeProjectId);
    if (success) {
      setShowDeleteConfirm(false);
      setActiveProjectId(null);
    } else {
      setEditError('Failed to delete project.');
    }
  };

  // Perform project level multi-filtering on our projects array
  const filteredProjects = (projects || []).filter(p => {
    // 1. Search Bar (Name, Developer, Location, City, or Configuration)
    if (searchBar) {
      const s = searchBar.toLowerCase().trim();
      const words = s.split(' ');
      
      const nameMatch = p.name.toLowerCase().includes(s) || (p.builder_name || '').toLowerCase().includes(s);
      const locMatch = (p.location || '').toLowerCase().includes(s) || p.city.toLowerCase().includes(s);
      const configMatch = p.configurations?.some(c => c.toLowerCase().replace(/\s+/g, '').includes(s.replace(/\s+/g, '')));
      
      if (!nameMatch && !locMatch && !configMatch) {
        // Multi-keyword check (e.g., "2 BHK in kharadi" -> checks if all keywords of search match some fields)
        const activeKeywords = words.filter(w => w && w !== 'in' && w !== 'at' && w !== 'with');
        const allKeywordsMatch = activeKeywords.every(word => {
          const m1 = p.name.toLowerCase().includes(word) || (p.builder_name || '').toLowerCase().includes(word);
          const m2 = (p.location || '').toLowerCase().includes(word) || p.city.toLowerCase().includes(word);
          const m3 = p.configurations?.some(c => c.toLowerCase().replace(/\s+/g, '').includes(word.replace(/\s+/g, '')));
          return m1 || m2 || m3;
        });
        if (!allKeywordsMatch) {
          return false;
        }
      }
    }
    // 2. Location & City Filter
    if (filterLocation) {
      const fl = filterLocation.toLowerCase();
      if (!(p.location || '').toLowerCase().includes(fl) && !p.city.toLowerCase().includes(fl)) {
        return false;
      }
    }
    // 2.5 Unit Configuration (BHK) Filter
    if (filterConfig) {
      const fc = filterConfig.toLowerCase().replace(/\s+/g, '');
      const configMatch = p.configurations?.some(c => c.toLowerCase().replace(/\s+/g, '').includes(fc));
      if (!configMatch) {
        return false;
      }
    }
    // 3. Possession Year Filter
    if (filterPossession) {
      if (!p.possession_date || !p.possession_date.startsWith(filterPossession)) {
        return false;
      }
    }
    // 4. Units Available Filter
    if (filterUnits) {
      const minUnits = parseInt(filterUnits, 10);
      if (!isNaN(minUnits) && (p.availableUnits ?? 0) < minUnits) {
        return false;
      }
    }
    // 5. Budget Filter (Filter projects with starting unit prices under specified max budget)
    if (filterBudget) {
      const maxBudget = parseFloat(filterBudget);
      if (!isNaN(maxBudget) && p.priceRange && p.priceRange.min > maxBudget) {
        return false;
      }
    }
    // 6. Max Base Price Filter per sqft (Secondary Price filter)
    if (filterPrice) {
      const maxPriceSqft = parseFloat(filterPrice);
      if (!isNaN(maxPriceSqft) && p.priceRange && p.priceRange.min > maxPriceSqft * 1200) {
        return false;
      }
    }
    return true;
  });

  const currentProject = projects.find(p => p.id === activeProjectId);

  // Active user permission controls (Page 15 role visibility checks)
  const isLeaderOrAdmin = activeUser && [UserRole.TEAM_LEADER, UserRole.COMPANY_ADMIN].includes(activeUser.role);

  return (
    <div className="flex flex-col select-none pb-28 text-left space-y-4">
      
      {/* SECTION A: LIST ALL PROJECT PORTFOLIOS */}
      {!activeProjectId ? (
        <div className="space-y-4">
          <div className="rounded-[24px] neu-flat p-5 bg-gradient-to-br from-[#0B1F33] to-[#142e4a] border border-slate-700/50 relative overflow-hidden text-white shadow-md">
            <div className="space-y-1 relative z-10">
              <span className="text-[9px] uppercase font-bold text-premium-gold tracking-widest font-display">ImCRM Professional Assets</span>
              <h2 className="text-base font-display font-bold text-white">Project Catalog Inventories</h2>
              <p className="text-xs text-slate-200 pr-4 leading-normal mb-1">
                Configure build portfolios, import bulk inventories, and assign slabs manually.
              </p>
            </div>
            
            {/* Real Interactive Action buttons */}
            <div className="flex flex-wrap gap-2 pt-3 relative z-10">
              <button 
                type="button"
                onClick={() => { setShowAddForm(!showAddForm); setShowImportForm(false); }}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all border ${showAddForm ? 'bg-premium-gold text-primary-navy border-premium-gold' : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-600/50 text-white'}`}
                id="btn-add-project"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Project</span>
              </button>
              
              <button 
                type="button"
                onClick={() => { setShowImportForm(!showImportForm); setShowAddForm(false); }}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all border ${showImportForm ? 'bg-premium-gold text-primary-navy border-premium-gold' : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-600/50 text-white'}`}
                id="btn-import-csv"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>📥 Import CSV</span>
              </button>
            </div>

            <div className="absolute right-0 bottom-0 text-slate-700 opacity-20 -mr-6 -mb-6 pointer-events-none">
              <Building className="w-32 h-32 text-slate-500" />
            </div>
          </div>

          {/* Collapsible Manual Project Addition Form */}
          {showAddForm && (
            <form onSubmit={handleAddProjectSubmit} className="rounded-2xl p-4 bg-white border border-border-color space-y-3 animate-fade-in shadow-md">
              <div className="flex justify-between items-center border-b border-border-color/40 pb-2">
                <span className="text-xs font-display font-semibold text-primary-navy">Register New Property</span>
                <button type="button" onClick={() => setShowAddForm(false)}>
                  <X className="w-4 h-4 text-text-secondary" />
                </button>
              </div>

              {addError && <p className="text-[10px] text-danger font-medium">{addError}</p>}
              {addSuccess && <p className="text-[10px] text-success font-medium">{addSuccess}</p>}

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-text-secondary">Project Name *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Aura Heights" 
                    value={newProjName}
                    onChange={(e) => setNewProjName(e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border-color bg-input-bg outline-none text-[#0B1F33]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-text-secondary">City *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Mumbai" 
                    value={newProjCity}
                    onChange={(e) => setNewProjCity(e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border-color bg-input-bg outline-none text-[#0B1F33]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-text-secondary">Developer Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Luxe Builders" 
                    value={newProjBuilder}
                    onChange={(e) => setNewProjBuilder(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border-color bg-input-bg outline-none text-[#0B1F33]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-text-secondary">RERA ID Num</label>
                  <input 
                    type="text" 
                    placeholder="e.g. PRM/MUM/RERA/9933" 
                    value={newProjRera}
                    onChange={(e) => setNewProjRera(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border-color bg-input-bg outline-none text-[#0B1F33]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-text-secondary">Exact Location</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Bandra West" 
                    value={newProjLocation}
                    onChange={(e) => setNewProjLocation(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border-color bg-input-bg outline-none text-[#0B1F33]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-text-secondary">Possession Date</label>
                  <input 
                    type="date" 
                    value={newProjPossession}
                    onChange={(e) => setNewProjPossession(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border-color bg-input-bg outline-none text-[#0B1F33]"
                  />
                </div>

                <div className="space-y-1 col-span-2">
                  <label className="text-[9px] font-bold uppercase text-text-secondary">Brief Description</label>
                  <textarea 
                    rows={2}
                    placeholder="Provide developer highlights or amenities..." 
                    value={newProjDesc}
                    onChange={(e) => setNewProjDesc(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border-color bg-input-bg outline-none text-[#0B1F33]"
                  />
                </div>
              </div>

              {/* Custom Inventories Addition section */}
              <div className="border-t border-border-color/40 pt-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-primary-navy">Property Configurations Inventory (Add Multiple Units)</span>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomInventories([...customInventories, { configuration: '2 BHK', carpet_area: 750, pricing_lakhs: 80, count: 5 }]);
                    }}
                    className="text-[10px] font-bold text-premium-gold hover:underline flex items-center space-x-0.5"
                  >
                    <span>+ Add Config Row</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {customInventories.map((inv, idx) => (
                    <div key={idx} className="grid grid-cols-4 gap-2 items-end bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <div>
                        <label className="text-[8px] font-bold uppercase text-text-secondary block mb-0.5">Configuration</label>
                        <select
                          value={inv.configuration}
                          onChange={(e) => {
                            const updated = [...customInventories];
                            updated[idx].configuration = e.target.value;
                            setCustomInventories(updated);
                          }}
                          className="w-full px-2 py-1 text-[11px] rounded border border-slate-300 bg-white text-[#0B1F33]"
                        >
                          <option value="1 BHK">1 BHK</option>
                          <option value="2 BHK">2 BHK</option>
                          <option value="3 BHK">3 BHK</option>
                          <option value="4 BHK">4 BHK</option>
                          <option value="Penthouse">Penthouse</option>
                          <option value="Studio">Studio</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[8px] font-bold uppercase text-text-secondary block mb-0.5">Carpet (sqft)</label>
                        <input
                          type="number"
                          value={inv.carpet_area}
                          onChange={(e) => {
                            const updated = [...customInventories];
                            updated[idx].carpet_area = Number(e.target.value) || 0;
                            setCustomInventories(updated);
                          }}
                          placeholder="e.g. 750"
                          className="w-full px-2 py-1 text-[11px] rounded border border-slate-300 bg-white text-[#0B1F33]"
                        />
                      </div>

                      <div>
                        <label className="text-[8px] font-bold uppercase text-text-secondary block mb-0.5">Price (Lakhs)</label>
                        <input
                          type="number"
                          value={inv.pricing_lakhs}
                          onChange={(e) => {
                            const updated = [...customInventories];
                            updated[idx].pricing_lakhs = Number(e.target.value) || 0;
                            setCustomInventories(updated);
                          }}
                          placeholder="e.g. 80"
                          className="w-full px-2 py-1 text-[11px] rounded border border-slate-300 bg-white text-[#0B1F33]"
                        />
                      </div>

                      <div className="flex items-center space-x-1">
                        <div className="flex-1">
                          <label className="text-[8px] font-bold uppercase text-text-secondary block mb-0.5">Unit Count</label>
                          <input
                            type="number"
                            value={inv.count}
                            onChange={(e) => {
                              const updated = [...customInventories];
                              updated[idx].count = Number(e.target.value) || 1;
                              setCustomInventories(updated);
                            }}
                            min={1}
                            max={20}
                            placeholder="e.g. 5"
                            className="w-full px-2 py-1 text-[11px] rounded border border-slate-300 bg-white text-[#0B1F33]"
                          />
                        </div>

                        {customInventories.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = customInventories.filter((_, i) => i !== idx);
                              setCustomInventories(updated);
                            }}
                            className="bg-danger/10 text-danger p-1 rounded hover:bg-danger/20 self-end mb-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex space-x-2 justify-end pt-1">
                <button 
                  type="button" 
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 text-xs rounded-lg bg-input-bg text-text-secondary"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-1.5 text-xs rounded-lg bg-primary-navy text-white font-semibold shadow-md hover:opacity-90"
                >
                  Add Project
                </button>
              </div>
            </form>
          )}

          {/* Collapsible CSV Ingestion Form */}
          {showImportForm && (
            <div className="rounded-2xl p-4 bg-white border border-border-color space-y-3 animate-fade-in shadow-md">
              <div className="flex justify-between items-center border-b border-border-color/40 pb-2">
                <span className="text-xs font-display font-semibold text-primary-navy">Bulk Projects CSV Loader</span>
                <button type="button" onClick={() => setShowImportForm(false)}>
                  <X className="w-4 h-4 text-text-secondary" />
                </button>
              </div>

              {importError && <p className="text-[10px] text-danger font-medium">{importError}</p>}
              {importSuccess && <p className="text-[10px] text-success font-medium">{importSuccess}</p>}

              <p className="text-[9px] text-text-secondary leading-normal">
                Columns: <code>name,builder_name,city,location,possession_date,rera_number,description</code>
              </p>

              {/* CSV File Drag & Drop + Manual Upload */}
              <div className="border border-dashed border-premium-gold/40 rounded-xl p-4 flex flex-col items-center justify-center bg-amber-50/20 hover:bg-amber-50/50 transition-colors cursor-pointer relative group">
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                      const text = evt.target?.result;
                      if (typeof text === 'string') {
                        setCsvText(text);
                        setImportSuccess('CSV file loaded successfully! Review or click "Execute Import" below.');
                      }
                    };
                    reader.readAsText(file);
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                />
                <span className="text-xs text-primary-navy font-bold flex items-center gap-1.5">
                  📥 Click or Drag & Drop CSV File here
                </span>
                <span className="text-[9px] text-text-secondary mt-1">
                  Or paste CSV content manually in the box below
                </span>
              </div>

              <textarea 
                rows={4}
                placeholder="Paste CSV rows here..."
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                className="w-full p-2 text-[11px] font-mono rounded-lg border border-border-color bg-input-bg outline-none text-[#0B1F33] custom-scroll"
              />

              <div className="flex justify-between pt-1">
                <button 
                  type="button"
                  onClick={loadSampleCSV}
                  className="px-2 py-1 text-[10px] font-bold text-premium-gold uppercase tracking-wider bg-amber-50 cursor-pointer border border-premium-gold/30 rounded-lg hover:bg-amber-100"
                >
                  Load Sample Code Layout
                </button>
                <div className="flex space-x-2">
                  <button 
                    type="button" 
                    onClick={() => setShowImportForm(false)}
                    className="px-3 py-1.5 text-xs rounded-lg bg-input-bg text-text-secondary"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button"
                    onClick={handleCSVImportSubmit}
                    className="px-4 py-1.5 text-xs rounded-lg bg-primary-navy text-white font-semibold shadow-md hover:opacity-90"
                  >
                    Ingest In-Bulk
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Multiple Filter Finder Panel */}
          <div className="rounded-2xl bg-white border border-border-color p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-border-color/40 pb-2">
              <span className="text-xs font-display font-bold text-primary-navy flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-premium-gold" />
                <span>Search & Filter Inventories</span>
              </span>
              <button 
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-1 text-[10px] uppercase font-bold text-premium-gold"
                id="toggle-projects-filters"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{showFilters ? 'Collapse Filters' : 'Multiple Filters'}</span>
              </button>
            </div>

            {/* Keyword Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-text-secondary" />
              <input 
                type="text"
                placeholder="Search by Name or Developer..."
                value={searchBar}
                onChange={(e) => setSearchBar(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-border-color bg-input-bg outline-none"
              />
            </div>

            {/* Collapsible filters pane */}
            {showFilters && (
              <div className="grid grid-cols-2 gap-2 pt-1 animate-fade-in text-xs border-t border-border-color/30">
                {/* Location Filter */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-text-secondary">Location / Address</label>
                  <input 
                    type="text"
                    placeholder="e.g. Bandra"
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border-color bg-input-bg outline-none text-[#0B1F33]"
                  />
                </div>

                {/* Budget Limit max total_price */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-text-secondary">Max Budget limit (₹)</label>
                  <select 
                    value={filterBudget}
                    onChange={(e) => setFilterBudget(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border-color bg-input-bg outline-none text-[#0B1F33]"
                  >
                    <option value="">Any Budget</option>
                    <option value="5000000">Under 50 Lakhs (₹50L)</option>
                    <option value="10000000">Under 1 Crore (₹1Cr)</option>
                    <option value="15000000">Under 1.5 Crore (₹1.5Cr)</option>
                    <option value="20000000">Under 2 Crore (₹2Cr)</option>
                  </select>
                </div>

                {/* Possession Date Filter */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-text-secondary">Possession Yr</label>
                  <select 
                    value={filterPossession}
                    onChange={(e) => setFilterPossession(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border-color bg-input-bg outline-none text-[#0B1F33]"
                  >
                    <option value="">Any Date</option>
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                    <option value="2028">2028</option>
                    <option value="2029">2029</option>
                  </select>
                </div>

                {/* Minimum Available Units Filter */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-text-secondary">Min Units Avail</label>
                  <select 
                    value={filterUnits}
                    onChange={(e) => setFilterUnits(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border-color bg-input-bg outline-none text-[#0B1F33]"
                  >
                    <option value="">Any Range</option>
                    <option value="1">At least 1</option>
                    <option value="2">At least 2</option>
                    <option value="4">At least 4</option>
                    <option value="8">At least 8</option>
                  </select>
                </div>

                {/* BHK Configuration Filter */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-text-secondary">BHK Preference</label>
                  <select 
                    value={filterConfig}
                    onChange={(e) => setFilterConfig(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border-color bg-input-bg outline-none text-[#0B1F33]"
                  >
                    <option value="">Any BHK</option>
                    <option value="1 BHK">1 BHK</option>
                    <option value="2 BHK">2 BHK</option>
                    <option value="3 BHK">3 BHK</option>
                    <option value="4 BHK">4 BHK</option>
                  </select>
                </div>

                {/* Price (Base Price) Filter per sqft */}
                <div className="space-y-1 col-span-2">
                  <label className="text-[9px] font-bold uppercase text-text-secondary">Max Rate per sqft (₹)</label>
                  <input 
                    type="number"
                    placeholder="e.g. 5000"
                    value={filterPrice}
                    onChange={(e) => setFilterPrice(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border-color bg-input-bg outline-none text-[#0B1F33]"
                  />
                </div>

                {/* Reset Filters button */}
                <div className="col-span-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchBar('');
                      setFilterLocation('');
                      setFilterBudget('');
                      setFilterPossession('');
                      setFilterUnits('');
                      setFilterPrice('');
                      setFilterConfig('');
                    }}
                    className="text-[10px] font-bold text-premium-gold uppercase hover:underline"
                  >
                    Clear Filter Specs
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {filteredProjects.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border-color p-8 text-center text-xs text-text-secondary bg-white">
                <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-premium-gold" />
                <p className="font-semibold text-primary-navy">No Project Portfolios Matched</p>
                <p className="text-[10px] text-text-secondary/85 mt-1">
                  Clear or expand your possession date, budget limits, city query or rate per square-foot filters and try again.
                </p>
              </div>
            ) : (
              filteredProjects.map((proj) => (
                <div
                  key={proj.id}
                  onClick={() => setActiveProjectId(proj.id)}
                  className="neu-flat p-4 bg-white border border-border-color cursor-pointer flex justify-between items-center transition-all hover:-translate-y-1 rounded-2xl"
                  id={`project-card-${proj.id}`}
                >
                  <div className="flex items-center space-x-3 w-4/5 text-left">
                    <div className="w-12 h-12 rounded-2xl bg-input-bg border flex items-center justify-center text-premium-gold shadow-inner shrink-0">
                      <Building className="w-6 h-6" />
                    </div>
                    <div className="space-y-0.5">
                      <h3 className="text-xs font-bold text-primary-navy font-display">{proj.name}</h3>
                      <p className="text-[10px] text-text-secondary leading-none">Developer: {proj.builder_name} (RERA Active)</p>
                      <div className="flex items-center space-x-1 text-[10px] text-slate-500 pt-1">
                        <MapPin className="w-3.5 h-3.5 text-premium-gold" />
                        <span>{proj.location || proj.city}, {proj.city}</span>
                      </div>
                      
                      {/* Interactive pill indicators showing price ranges, units stats */}
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        <span className="text-[8px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700">
                          {proj.availableUnits ?? 0} Allocations Available
                        </span>
                        {proj.priceRange && (
                          <span className="text-[8px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 border border-amber-100 text-amber-700">
                            Rate: ₹{(proj.priceRange.min / 100000).toFixed(0)}L - ₹{(proj.priceRange.max / 100000).toFixed(0)}L
                          </span>
                        )}
                        {proj.possession_date && (
                          <span className="text-[8px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700">
                            Possession: {proj.possession_date.split('-')[0]}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-text-secondary" />
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        // SECTION B: ACTIVE PORTFOLIO DETAILS MATRIX LAYOUT
        <div className="space-y-4 animate-fade-in">
          
          {/* Card header */}
          <div className="rounded-[24px] neu-flat p-5 bg-white border flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[9px] text-premium-gold font-bold uppercase tracking-widest font-display">Real-Time Allocation Slab</span>
              <h2 className="text-lg font-display font-bold text-primary-navy">{currentProject?.name}</h2>
              <p className="text-[11px] text-text-secondary">{currentProject?.location} • Developed by {currentProject?.builder_name}</p>
            </div>
            
            <div className="flex items-center space-x-2 shrink-0">
              {isLeaderOrAdmin && (
                <>
                  <button
                    onClick={handleEditProjectClick}
                    className="p-1.5 border border-border-color bg-white hover:bg-slate-50 rounded-xl text-primary-navy transition-colors flex items-center justify-center cursor-pointer shadow-sm"
                    title="Edit Project"
                  >
                    <Edit className="w-4 h-4 text-premium-gold" />
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="p-1.5 border border-red-200 bg-red-50 hover:bg-red-100 rounded-xl text-red-600 transition-colors flex items-center justify-center cursor-pointer shadow-sm"
                    title="Delete Project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
              <button
                onClick={() => setActiveProjectId(null)}
                className="px-3 py-1.5 border border-border-color bg-input-bg rounded-xl text-[10px] uppercase font-bold text-primary-navy hover:bg-slate-100 transition-all cursor-pointer"
                id="back-to-portfolios"
              >
                Exit Map
              </button>
            </div>
          </div>

          {/* Spec details card */}
          <div className="rounded-[24px] bg-white border p-5 space-y-4">
            <h3 className="text-xs font-bold text-premium-gold uppercase tracking-wider font-display border-b border-border-color/40 pb-2">Property Specifications</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="space-y-0.5">
                <span className="text-[9px] font-bold uppercase text-text-secondary">RERA Registration</span>
                <p className="font-semibold text-primary-navy">{currentProject?.rera_number || 'Under Process'}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] font-bold uppercase text-text-secondary">Possession Target</span>
                <p className="font-semibold text-primary-navy">
                  {currentProject?.possession_date ? new Date(currentProject.possession_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' }) : 'To Be Decided'}
                </p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] font-bold uppercase text-text-secondary">Location City</span>
                <p className="font-semibold text-primary-navy">{currentProject?.city || 'Mumbai'}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] font-bold uppercase text-text-secondary">Project Status</span>
                <p className="font-semibold text-emerald-600 capitalize">{currentProject?.status || 'Active'}</p>
              </div>
            </div>

            {currentProject?.description && (
              <div className="space-y-1 text-xs pt-2 border-t border-border-color/30">
                <span className="text-[9px] font-bold uppercase text-text-secondary block">Description</span>
                <p className="text-text-secondary leading-relaxed">{currentProject.description}</p>
              </div>
            )}

            {currentProject?.amenities && currentProject?.amenities.length > 0 && (
              <div className="space-y-1 text-xs pt-2 border-t border-border-color/30">
                <span className="text-[9px] font-bold uppercase text-text-secondary block">Amenities</span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {currentProject.amenities.map((am, amIdx) => (
                    <span key={amIdx} className="text-[10px] bg-indigo-50 border border-indigo-100/60 rounded-full px-2.5 py-0.5 text-indigo-700 font-medium">
                      {am}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tab Contents: Configurations specifications (Page 15 pricing) */}
          <div className="space-y-3 rounded-[24px] bg-white p-5 border shadow-sm text-left">
            <h3 className="text-xs font-bold text-premium-gold uppercase tracking-wider font-display border-b border-border-color/40 pb-2">Configurations & BHK Pricing Model</h3>
            <div className="space-y-3 text-xs">
              {activeProjectDetails?.configurations && activeProjectDetails.configurations.length > 0 ? (
                activeProjectDetails.configurations.map((c) => (
                  <div key={c.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border hover:bg-slate-100/50 transition-colors">
                    <div className="text-left space-y-0.5">
                      <p className="font-bold text-primary-navy text-xs">{c.configuration_type}</p>
                      <p className="text-[10px] text-text-secondary">Carpet Area: <strong className="text-slate-700">{c.carpet_area.toLocaleString('en-IN')} Sq.Ft</strong></p>
                    </div>
                    <div className="text-right space-y-1">
                      <span className="font-bold text-indigo-600 text-[13px]">₹{((c.price || 0) / 100000).toFixed(1)} Lakh</span>
                      <p className="text-[9px] text-[#A67C1E] font-semibold">Available: {c.unit_count || 12} allocation units</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-text-secondary py-8 italic text-xs">No specifications recorded for this property.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Dialog */}
      <BottomDrawer
        isOpen={isEditingProject}
        onClose={() => setIsEditingProject(false)}
        title="Edit Project Portfolio"
      >
        <form onSubmit={handleEditProjectSubmit} className="space-y-4 p-5 text-primary-navy">
          {editError && (
            <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-semibold">
              {editError}
            </div>
          )}
          {editSuccess && (
            <div className="p-3 bg-green-50 text-green-600 border border-green-200 rounded-xl text-xs font-semibold">
              {editSuccess}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-text-secondary">Project Name *</label>
              <input 
                type="text" 
                required 
                value={editProjName} 
                onChange={(e) => setEditProjName(e.target.value)} 
                className="w-full px-3 py-2 text-xs rounded-xl border border-border-color bg-input-bg outline-none" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-text-secondary">City *</label>
              <input 
                type="text" 
                required 
                value={editProjCity} 
                onChange={(e) => setEditProjCity(e.target.value)} 
                className="w-full px-3 py-2 text-xs rounded-xl border border-border-color bg-input-bg outline-none" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-text-secondary">Developer/Builder</label>
              <input 
                type="text" 
                value={editProjBuilder} 
                onChange={(e) => setEditProjBuilder(e.target.value)} 
                className="w-full px-3 py-2 text-xs rounded-xl border border-border-color bg-input-bg outline-none" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-text-secondary">RERA Registration No</label>
              <input 
                type="text" 
                value={editProjRera} 
                onChange={(e) => setEditProjRera(e.target.value)} 
                className="w-full px-3 py-2 text-xs rounded-xl border border-border-color bg-input-bg outline-none" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-text-secondary">Location Landmark</label>
              <input 
                type="text" 
                value={editProjLocation} 
                onChange={(e) => setEditProjLocation(e.target.value)} 
                className="w-full px-3 py-2 text-xs rounded-xl border border-border-color bg-input-bg outline-none" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-text-secondary">Possession Target Date</label>
              <input 
                type="date" 
                value={editProjPossession} 
                onChange={(e) => setEditProjPossession(e.target.value)} 
                className="w-full px-3 py-2 text-xs rounded-xl border border-border-color bg-input-bg outline-none text-[#0B1F33]" 
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-text-secondary">Description</label>
            <textarea 
              rows={3} 
              value={editProjDesc} 
              onChange={(e) => setEditProjDesc(e.target.value)} 
              className="w-full px-3 py-2 text-xs rounded-xl border border-border-color bg-input-bg outline-none custom-scroll resize-none" 
            />
          </div>

          {/* Amenities Management */}
          <div className="space-y-2 border-t border-border-color/30 pt-3 text-left">
            <label className="text-[10px] font-bold uppercase text-text-secondary block">Project Amenities / Highlights</label>
            <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-100 rounded-xl min-h-[44px]">
              {editProjAmenities.length === 0 ? (
                <span className="text-[10px] text-text-secondary italic">No amenities specified. Add some below.</span>
              ) : (
                editProjAmenities.map((amenity, index) => (
                  <span key={index} className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 rounded-full text-[10px] font-medium flex items-center space-x-1 shadow-sm">
                    <span>{amenity}</span>
                    <button
                      type="button"
                      onClick={() => setEditProjAmenities(editProjAmenities.filter((_, idx) => idx !== index))}
                      className="text-red-500 hover:text-red-700 font-bold ml-1 text-xs focus:outline-none"
                    >
                      &times;
                    </button>
                  </span>
                ))
              )}
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="e.g. Swimming Pool, 24/7 Security"
                value={newEditAmenity}
                onChange={(e) => setNewEditAmenity(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newEditAmenity.trim() && !editProjAmenities.includes(newEditAmenity.trim())) {
                      setEditProjAmenities([...editProjAmenities, newEditAmenity.trim()]);
                      setNewEditAmenity('');
                    }
                  }
                }}
                className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-border-color bg-input-bg outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  if (newEditAmenity.trim() && !editProjAmenities.includes(newEditAmenity.trim())) {
                    setEditProjAmenities([...editProjAmenities, newEditAmenity.trim()]);
                    setNewEditAmenity('');
                  }
                }}
                className="px-3 py-1.5 bg-primary-navy text-white text-xs font-semibold rounded-xl hover:opacity-90 transition-all cursor-pointer shadow-sm"
              >
                + Add
              </button>
            </div>
          </div>

          {/* Configurations Management */}
          <div className="space-y-2 border-t border-border-color/30 pt-3 text-left">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold uppercase text-text-secondary block">Property Configurations & Pricing Models</label>
              <button
                type="button"
                onClick={() => {
                  setEditProjConfigurations([
                    ...editProjConfigurations,
                    { configuration_type: '2BHK', carpet_area: 750, price: 8000000, unit_count: 10 }
                  ]);
                }}
                className="text-[10px] font-bold text-premium-gold hover:underline flex items-center space-x-0.5 cursor-pointer"
              >
                <span>+ Add Config Row</span>
              </button>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scroll pr-1">
              {editProjConfigurations.length === 0 ? (
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center text-[10px] text-text-secondary italic">
                  No configuration tiers specified. Click "+ Add Config Row" above.
                </div>
              ) : (
                editProjConfigurations.map((config, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100 shadow-sm relative group">
                    <div className="col-span-3">
                      <label className="text-[8px] font-bold uppercase text-text-secondary block mb-0.5">Type</label>
                      <select
                        value={config.configuration_type}
                        onChange={(e) => {
                          const updated = [...editProjConfigurations];
                          updated[index].configuration_type = e.target.value;
                          setEditProjConfigurations(updated);
                        }}
                        className="w-full px-2 py-1 text-xs rounded-lg border border-border-color bg-white outline-none text-[#0B1F33]"
                      >
                        <option value="1BHK">1 BHK</option>
                        <option value="1.5BHK">1.5 BHK</option>
                        <option value="2BHK">2 BHK</option>
                        <option value="2.5BHK">2.5 BHK</option>
                        <option value="3BHK">3 BHK</option>
                        <option value="3.5BHK">3.5 BHK</option>
                        <option value="4BHK">4 BHK</option>
                        <option value="Penthouse">Penthouse</option>
                        <option value="Duplex">Duplex</option>
                        <option value="Studio">Studio</option>
                        <option value="RowHouse">Row House</option>
                        <option value="Villa">Villa</option>
                      </select>
                    </div>

                    <div className="col-span-3">
                      <label className="text-[8px] font-bold uppercase text-text-secondary block mb-0.5">Carpet Area (Sq.Ft)</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={config.carpet_area || ''}
                        onChange={(e) => {
                          const updated = [...editProjConfigurations];
                          updated[index].carpet_area = Number(e.target.value) || 0;
                          setEditProjConfigurations(updated);
                        }}
                        className="w-full px-2 py-1 text-xs rounded-lg border border-border-color bg-white outline-none text-[#0B1F33]"
                      />
                    </div>

                    <div className="col-span-3">
                      <label className="text-[8px] font-bold uppercase text-text-secondary block mb-0.5">Price (₹ Lakhs)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        required
                        value={config.price ? config.price / 100000 : ''}
                        onChange={(e) => {
                          const updated = [...editProjConfigurations];
                          updated[index].price = Math.round((Number(e.target.value) || 0) * 100000);
                          setEditProjConfigurations(updated);
                        }}
                        className="w-full px-2 py-1 text-xs rounded-lg border border-border-color bg-white outline-none text-[#0B1F33]"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="text-[8px] font-bold uppercase text-text-secondary block mb-0.5">Units</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={config.unit_count || ''}
                        onChange={(e) => {
                          const updated = [...editProjConfigurations];
                          updated[index].unit_count = Number(e.target.value) || 0;
                          setEditProjConfigurations(updated);
                        }}
                        className="w-full px-2 py-1 text-xs rounded-lg border border-border-color bg-white outline-none text-[#0B1F33]"
                      />
                    </div>

                    <div className="col-span-1 flex items-center justify-center pt-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEditProjConfigurations(editProjConfigurations.filter((_, idx) => idx !== index));
                        }}
                        className="text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                        title="Delete Configuration"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button 
              type="button" 
              onClick={() => setIsEditingProject(false)} 
              className="px-4 py-2 text-xs rounded-xl bg-slate-100 text-text-secondary hover:bg-slate-200 transition-all font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-5 py-2 text-xs rounded-xl bg-primary-navy text-white hover:opacity-90 transition-all font-semibold shadow-md cursor-pointer"
            >
              Save Portfolio Updates
            </button>
          </div>
        </form>
      </BottomDrawer>

      {/* Delete Project Confirmation Dialog */}
      <BottomDrawer
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Confirm Deletion"
      >
        <div className="p-6 text-primary-navy space-y-4">
          <div className="flex items-center space-x-3 text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">
            <ShieldAlert className="w-5 h-5 shrink-0 animate-pulse" />
            <p className="text-xs font-semibold">
              Warning: This action is irreversible. All configurations and specifications for this project will be deleted.
            </p>
          </div>

          <p className="text-xs leading-relaxed text-text-secondary">
            Are you sure you want to permanently delete <strong>{currentProject?.name}</strong> from the catalog? 
            This will remove all details and allocation slabs associated with this portfolio.
          </p>

          <div className="flex justify-end space-x-2 pt-2">
            <button 
              type="button" 
              onClick={() => setShowDeleteConfirm(false)} 
              className="px-4 py-2 text-xs rounded-xl bg-slate-100 text-text-secondary hover:bg-slate-200 transition-all font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="button" 
              onClick={handleDeleteProjectSubmit} 
              className="px-5 py-2 text-xs rounded-xl bg-red-600 text-white hover:bg-red-700 transition-all font-semibold shadow-md cursor-pointer"
            >
              Yes, Delete Project
            </button>
          </div>
        </div>
      </BottomDrawer>
    </div>
  );
}
