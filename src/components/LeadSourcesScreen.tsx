import React, { useState, useEffect } from 'react';
import { useAppStore } from '../lib/store';
import { motion } from 'motion/react';
import { ListPlus, Edit3, Check, X, Search, ToggleLeft, ToggleRight, Plus, HelpCircle, AlertCircle } from 'lucide-react';
import { UserRole } from '../types';

export default function LeadSourcesScreen() {
  const { 
    activeUser, 
    leadSources, 
    addLeadSource, 
    updateLeadSource, 
    fetchLeadSources,
    isLoading 
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [newSourceName, setNewSourceName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchLeadSources();
  }, [activeUser]);

  const canManage = activeUser?.role === UserRole.COMPANY_ADMIN;

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceName.trim()) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    const result = await addLeadSource(newSourceName.trim());
    if (result.success) {
      setNewSourceName('');
      setSuccessMessage('Lead source added successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setErrorMessage(result.error || 'Failed to add lead source.');
    }
  };

  const handleStartEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const handleSaveEdit = async (id: string, currentActive: boolean) => {
    if (!editingName.trim()) return;
    setErrorMessage(null);
    
    const result = await updateLeadSource(id, editingName.trim(), currentActive);
    if (result.success) {
      setEditingId(null);
      setSuccessMessage('Lead source updated!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setErrorMessage(result.error || 'Failed to update lead source.');
    }
  };

  const handleToggleActive = async (id: string, name: string, currentActive: boolean) => {
    setErrorMessage(null);
    const result = await updateLeadSource(id, name, !currentActive);
    if (result.success) {
      setSuccessMessage(`Lead source ${!currentActive ? 'enabled' : 'disabled'}!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setErrorMessage(result.error || 'Failed to change status.');
    }
  };

  const filteredSources = leadSources.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6" id="lead_sources_screen">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 mb-1 bg-violet-50 text-violet-600 rounded-xl">
              <ListPlus className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-display font-medium text-slate-900 tracking-tight">Lead Origin Channels</h1>
          </div>
          <p className="text-slate-500 text-sm">Configure marketing campaign entry points, property portals, and referral channels.</p>
        </div>

        {/* Quick Search */}
        <div className="relative w-full lg:w-72">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>
      </div>

      {/* Alert Banners */}
      {errorMessage && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs"
        >
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </motion.div>
      )}

      {successMessage && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs"
        >
          <Check className="w-5 h-5 shrink-0" />
          <span>{successMessage}</span>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Creation Form Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-display font-medium text-slate-900">Add New Channel</h3>
            <p className="text-xs text-slate-500">Create a dynamic traffic channel. Newly logged leads can be attributed specifically to this source instantly.</p>
            
            {canManage ? (
              <form onSubmit={handleAddSource} className="space-y-4 pt-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Channel Name</label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    placeholder="e.g. Google Ads, WhatsApp Campaign"
                    value={newSourceName}
                    onChange={(e) => setNewSourceName(e.target.value)}
                    className="w-full h-11 px-3 border border-slate-200 bg-slate-50 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !newSourceName.trim()}
                  className="w-full h-11 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Channel</span>
                </button>
              </form>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-800">
                <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Only Company Administrators possess authorization control to create or modify lead origin sources.</span>
              </div>
            )}
          </div>
        </div>

        {/* Existing Sources Table / Grid */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-display">Active Inbound Channels ({filteredSources.length})</span>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredSources.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-sm">
                  No lead channels matched your search filter.
                </div>
              ) : (
                filteredSources.map((source, idx) => (
                  <div 
                    key={source.id} 
                    className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      {editingId === source.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-sm font-semibold text-slate-900 focus:outline-none focus:border-violet-500"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveEdit(source.id, source.is_active)}
                            className="p-1 px-2 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-emerald-200 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Save</span>
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 px-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-slate-200 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Cancel</span>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 text-sm truncate">{source.name}</span>
                            {!source.is_active && (
                              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-400 text-[10px] font-bold rounded-md uppercase tracking-wide">Inactive</span>
                            )}
                          </div>
                          <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Channel Identity ID: {source.id}</p>
                        </div>
                      )}
                    </div>

                    {/* Actions controls */}
                    <div className="flex items-center gap-2">
                      {canManage && editingId !== source.id && (
                        <>
                          <button
                            onClick={() => handleStartEdit(source.id, source.name)}
                            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Rename Channel"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(source.id, source.name, source.is_active)}
                            className={`p-2 rounded-lg transition-colors cursor-pointer ${source.is_active ? 'text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:text-slate-500 hover:bg-slate-100'}`}
                            title={source.is_active ? 'Disable Channel' : 'Enable Channel'}
                          >
                            {source.is_active ? (
                              <ToggleRight className="w-6 h-6" />
                            ) : (
                              <ToggleLeft className="w-6 h-6" />
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
