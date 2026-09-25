import React, { useState, useEffect } from 'react';
import { useAppStore } from '../lib/store';
import { 
  Share2, 
  Copy, 
  Check, 
  RefreshCw, 
  AlertCircle, 
  Play, 
  ArrowRight, 
  Users, 
  Clock, 
  ExternalLink,
  Sliders,
  CheckCircle2
} from 'lucide-react';
import { UserRole } from '../types';

export default function IntegrationsScreen() {
  const { activeUser, setActiveTab } = useAppStore();

  const [activeTabSub, setActiveTabSub] = useState<'meta' | '99acres' | 'logs'>('meta');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Configuration State
  const [config, setConfig] = useState({
    meta: {
      enabled: true,
      verifyToken: 'partneros_meta_token_secure_99',
      appSecret: 'meta_secret_live_partneros',
      pageId: '108482019482711',
      lastReceivedAt: undefined as string | undefined,
      leadsIngestedCount: 0
    },
    ninetyNineAcres: {
      enabled: true,
      apiKey: 'nnacres_api_key_partneros_live',
      queryUrl: 'https://api.99acres.com/leads/v1/inbound',
      lastReceivedAt: undefined as string | undefined,
      leadsIngestedCount: 0
    }
  });

  const [logs, setLogs] = useState<Array<{
    id: string;
    source: 'Meta' | '99acres';
    lead_name: string;
    phone: string;
    email?: string;
    project_name?: string;
    status: 'Ingested' | 'Duplicate' | 'Error';
    created_at: string;
  }>>([]);

  // Simulation test form state
  const [simName, setSimName] = useState('Ankit Verma');
  const [simPhone, setSimPhone] = useState('9810293847');
  const [simEmail, setSimEmail] = useState('ankit.verma@example.com');
  const [simProject, setSimProject] = useState('M3M Crown Gurgaon');

  const originUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const metaWebhookUrl = `${originUrl}/api/webhooks/meta`;
  const ninetyNineAcresWebhookUrl = `${originUrl}/api/webhooks/99acres`;

  const fetchConfig = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/integrations/config');
      if (res.ok) {
        const data = await res.json();
        if (data.config) setConfig(data.config);
        if (data.logs) setLogs(data.logs);
      }
    } catch (err) {
      console.error('Failed to load integrations configuration:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/integrations/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        setStatusMessage({ type: 'success', text: 'Integration credentials and webhook parameters updated!' });
      } else {
        const data = await res.json();
        setStatusMessage({ type: 'error', text: data.error || 'Failed to update settings.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setIsSaving(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleSimulateLead = async (source: 'Meta' | '99acres') => {
    setIsSimulating(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/integrations/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source,
          leadData: {
            full_name: simName,
            phone: simPhone,
            email: simEmail,
            project_name: simProject,
            city: 'Delhi/NCR'
          }
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({ 
          type: 'success', 
          text: `Success! Lead ingested from ${source} into Admin pipeline as Unassigned. Ready for manual allocation.` 
        });
        await fetchConfig();
        // Generate new random phone for subsequent simulations
        setSimPhone('98' + Math.floor(10000000 + Math.random() * 90000000));
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Simulation failed' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setIsSimulating(false);
    }
  };

  // Guard: ONLY visible to Company Admin
  if (activeUser?.role !== UserRole.COMPANY_ADMIN) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm max-w-xl mx-auto my-12">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800 font-display">Restricted Administrative Area</h2>
        <p className="text-sm text-slate-500 mt-2">
          The Integrations tab is accessible strictly to Company Administrators. All incoming leads from advertising platforms are directed directly to the Admin workspace for centralized manual assignment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 font-display">Lead Source Integrations</h1>
              <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                Ingest real-time leads directly from Meta Ads & 99acres into the Admin pool for manual agent assignment.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchConfig}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            id="refresh-integrations-btn"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={() => setActiveTab('leads')}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-premium-gold text-white hover:brightness-110 shadow-sm transition cursor-pointer"
            id="view-admin-leads-btn"
          >
            <Users className="w-3.5 h-3.5" />
            View Admin Leads Pool
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </button>
        </div>
      </div>

      {/* Status notification */}
      {statusMessage && (
        <div 
          className={`p-4 rounded-xl text-xs md:text-sm flex items-center gap-3 border ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Highlights & Workflow Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-200">
            <span className="font-bold text-xs">01</span>
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 font-display uppercase tracking-wide">Real-time Webhook Ingestion</h4>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Meta Lead Gen & 99acres push leads directly into CRM upon visitor form submission.
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
            <span className="font-bold text-xs">02</span>
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 font-display uppercase tracking-wide">Admin Exclusive Queue</h4>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Leads arrive initially as <strong className="text-amber-700">Unassigned</strong> in the Admin panel.
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
            <span className="font-bold text-xs">03</span>
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 font-display uppercase tracking-wide">Manual Admin Allocation</h4>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Admin reviews lead quality, city, and budget before delegating to team leaders or executives.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Subtabs: Meta / 99acres / Ingestion Audit Log */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTabSub('meta')}
          className={`flex items-center gap-2 px-6 py-3 font-display text-xs md:text-sm font-bold border-b-2 transition cursor-pointer ${
            activeTabSub === 'meta'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
          Meta Ads (Facebook & Instagram)
          <span className="ml-1.5 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-mono">
            {config.meta.leadsIngestedCount} ingested
          </span>
        </button>

        <button
          onClick={() => setActiveTabSub('99acres')}
          className={`flex items-center gap-2 px-6 py-3 font-display text-xs md:text-sm font-bold border-b-2 transition cursor-pointer ${
            activeTabSub === '99acres'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
          99acres Real Estate Portal
          <span className="ml-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-mono">
            {config.ninetyNineAcres.leadsIngestedCount} ingested
          </span>
        </button>

        <button
          onClick={() => setActiveTabSub('logs')}
          className={`flex items-center gap-2 px-6 py-3 font-display text-xs md:text-sm font-bold border-b-2 transition cursor-pointer ${
            activeTabSub === 'logs'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Ingestion Activity Logs
          <span className="ml-1.5 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-mono">
            {logs.length}
          </span>
        </button>
      </div>

      {/* TAB 1: META INTEGRATION */}
      {activeTabSub === 'meta' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Credentials & Webhook Settings */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 font-display">Meta Webhook Configuration</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Connect your Facebook Page & Lead Ads forms to this webhook URL in the Meta Business Suite.
                  </p>
                </div>
                <label className="flex items-center cursor-pointer gap-2">
                  <input
                    type="checkbox"
                    checked={config.meta.enabled}
                    onChange={(e) => setConfig({ ...config, meta: { ...config.meta, enabled: e.target.checked } })}
                    className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-700 font-display">Active</span>
                </label>
              </div>

              {/* Callback URL */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  Callback URL (Webhook Endpoint)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={metaWebhookUrl}
                    className="flex-1 h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-mono select-all focus:outline-none"
                  />
                  <button
                    onClick={() => handleCopy(metaWebhookUrl, 'meta-webhook')}
                    className="h-10 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0"
                  >
                    {copiedKey === 'meta-webhook' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedKey === 'meta-webhook' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  Paste this URL into Meta Developers &rarr; Webhooks &rarr; Page &rarr; Leadgen subscription.
                </p>
              </div>

              {/* Verify Token */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  Verify Token
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={config.meta.verifyToken}
                    onChange={(e) => setConfig({ ...config, meta: { ...config.meta, verifyToken: e.target.value } })}
                    className="flex-1 h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 font-mono focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={() => handleCopy(config.meta.verifyToken, 'meta-token')}
                    className="h-10 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0"
                  >
                    {copiedKey === 'meta-token' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedKey === 'meta-token' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  Provide this exact string when verifying the webhook handshake with Meta servers.
                </p>
              </div>

              {/* Facebook Page ID */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  Connected Facebook Page ID / Ad Account ID
                </label>
                <input
                  type="text"
                  value={config.meta.pageId}
                  onChange={(e) => setConfig({ ...config, meta: { ...config.meta, pageId: e.target.value } })}
                  placeholder="e.g. 108482019482711"
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* App Secret / Access Token */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  Meta System User Access Token / App Secret
                </label>
                <input
                  type="password"
                  value={config.meta.appSecret}
                  onChange={(e) => setConfig({ ...config, meta: { ...config.meta, appSecret: e.target.value } })}
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleSaveConfig}
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  {isSaving ? 'Saving...' : 'Save Meta Configuration'}
                </button>
              </div>
            </div>

            {/* Setup Guidance for Meta */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-3">
              <h3 className="text-xs font-bold text-slate-700 font-display uppercase tracking-wider">How to connect with Meta Business Manager</h3>
              <ol className="list-decimal list-inside space-y-2 text-xs text-slate-600 leading-relaxed">
                <li>Go to <strong>developers.facebook.com</strong> &rarr; Your App &rarr; <strong>Webhooks</strong>.</li>
                <li>Subscribe to the <strong>Page</strong> object and select the <strong>leadgen</strong> field.</li>
                <li>Enter the Callback URL and Verify Token displayed above.</li>
                <li>Click <strong>Verify and Save</strong>. Meta will immediately send a verification request.</li>
                <li>All leads submitted through Facebook Instant Forms will be routed into your Admin pipeline in real-time.</li>
              </ol>
            </div>
          </div>

          {/* Test & Simulation Sandbox */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 text-slate-800">
                <Play className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold font-display">Test Meta Lead Ingestion</h3>
              </div>
              <p className="text-xs text-slate-500">
                Trigger a sample lead into your CRM to test the pipeline without running active Facebook ad spend.
              </p>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Prospect Name</label>
                  <input
                    type="text"
                    value={simName}
                    onChange={(e) => setSimName(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Phone Number</label>
                  <input
                    type="text"
                    value={simPhone}
                    onChange={(e) => setSimPhone(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Email</label>
                  <input
                    type="text"
                    value={simEmail}
                    onChange={(e) => setSimEmail(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Project / Ad Campaign</label>
                  <input
                    type="text"
                    value={simProject}
                    onChange={(e) => setSimProject(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <button
                onClick={() => handleSimulateLead('Meta')}
                disabled={isSimulating}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                id="simulate-meta-lead-btn"
              >
                <Play className="w-3.5 h-3.5" />
                {isSimulating ? 'Ingesting Simulated Lead...' : 'Send Test Meta Lead'}
              </button>

              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-[11px] text-blue-900 leading-relaxed">
                💡 Ingested leads are instantly tagged with source <strong>"Meta"</strong> and remain <strong>Unassigned</strong> so the Admin can manually allocate them.
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-display">Meta Pipeline Summary</span>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-xs text-slate-600">Total Leads Ingested:</span>
                <span className="text-sm font-bold text-slate-900 font-mono">{config.meta.leadsIngestedCount}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-xs text-slate-600">Last Received:</span>
                <span className="text-xs font-semibold text-slate-700">
                  {config.meta.lastReceivedAt ? new Date(config.meta.lastReceivedAt).toLocaleTimeString() : 'Never'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: 99ACRES INTEGRATION */}
      {activeTabSub === '99acres' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Credentials & Webhook Settings */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 font-display">99acres Webhook & Lead API</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Receive inbound buyer inquiries and portal queries directly into your CRM database.
                  </p>
                </div>
                <label className="flex items-center cursor-pointer gap-2">
                  <input
                    type="checkbox"
                    checked={config.ninetyNineAcres.enabled}
                    onChange={(e) => setConfig({ ...config, ninetyNineAcres: { ...config.ninetyNineAcres, enabled: e.target.checked } })}
                    className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-700 font-display">Active</span>
                </label>
              </div>

              {/* 99acres Inbound Webhook URL */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  Inbound Webhook URL (For 99acres Push Service)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={ninetyNineAcresWebhookUrl}
                    className="flex-1 h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-mono select-all focus:outline-none"
                  />
                  <button
                    onClick={() => handleCopy(ninetyNineAcresWebhookUrl, 'nnacres-webhook')}
                    className="h-10 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0"
                  >
                    {copiedKey === 'nnacres-webhook' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedKey === 'nnacres-webhook' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  Provide this webhook URL to your 99acres Key Account Manager (KAM) to activate lead push.
                </p>
              </div>

              {/* 99acres API Key */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  99acres API Key / Client Secret
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={config.ninetyNineAcres.apiKey}
                    onChange={(e) => setConfig({ ...config, ninetyNineAcres: { ...config.ninetyNineAcres, apiKey: e.target.value } })}
                    className="flex-1 h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={() => handleCopy(config.ninetyNineAcres.apiKey, 'nnacres-key')}
                    className="h-10 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0"
                  >
                    {copiedKey === 'nnacres-key' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedKey === 'nnacres-key' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* 99acres Query Pull URL */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  99acres Query Feed URL (Optional Pull API)
                </label>
                <input
                  type="text"
                  value={config.ninetyNineAcres.queryUrl || ''}
                  onChange={(e) => setConfig({ ...config, ninetyNineAcres: { ...config.ninetyNineAcres, queryUrl: e.target.value } })}
                  placeholder="https://api.99acres.com/leads/v1/inbound"
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleSaveConfig}
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  {isSaving ? 'Saving...' : 'Save 99acres Configuration'}
                </button>
              </div>
            </div>

            {/* Setup Guidance for 99acres */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-3">
              <h3 className="text-xs font-bold text-slate-700 font-display uppercase tracking-wider">How to connect 99acres</h3>
              <ol className="list-decimal list-inside space-y-2 text-xs text-slate-600 leading-relaxed">
                <li>Log in to your <strong>99acres Broker / Builder Panel</strong>.</li>
                <li>Navigate to <strong>Settings &rarr; Lead Forwarding &rarr; Webhook / CRM Integration</strong>.</li>
                <li>Paste the Inbound Webhook URL above as your destination webhook.</li>
                <li>All prospective buyer inquiries (name, phone, budget, and project name) will instantly stream into ImCRM.</li>
              </ol>
            </div>
          </div>

          {/* Test & Simulation Sandbox */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 text-slate-800">
                <Play className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold font-display">Test 99acres Lead Ingestion</h3>
              </div>
              <p className="text-xs text-slate-500">
                Simulate an incoming verified buyer inquiry from the 99acres portal.
              </p>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Buyer Name</label>
                  <input
                    type="text"
                    value={simName}
                    onChange={(e) => setSimName(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Mobile Number</label>
                  <input
                    type="text"
                    value={simPhone}
                    onChange={(e) => setSimPhone(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Email</label>
                  <input
                    type="text"
                    value={simEmail}
                    onChange={(e) => setSimEmail(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Property / Project Listing</label>
                  <input
                    type="text"
                    value={simProject}
                    onChange={(e) => setSimProject(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <button
                onClick={() => handleSimulateLead('99acres')}
                disabled={isSimulating}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                id="simulate-99acres-lead-btn"
              >
                <Play className="w-3.5 h-3.5" />
                {isSimulating ? 'Ingesting 99acres Inquiry...' : 'Send Test 99acres Lead'}
              </button>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 leading-relaxed">
                💡 Ingested leads are instantly tagged with source <strong>"99acres"</strong> and placed in the Admin pool as <strong>Unassigned</strong> for delegation.
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-display">99acres Pipeline Summary</span>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-xs text-slate-600">Total Inquiries Ingested:</span>
                <span className="text-sm font-bold text-slate-900 font-mono">{config.ninetyNineAcres.leadsIngestedCount}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-xs text-slate-600">Last Received:</span>
                <span className="text-xs font-semibold text-slate-700">
                  {config.ninetyNineAcres.lastReceivedAt ? new Date(config.ninetyNineAcres.lastReceivedAt).toLocaleTimeString() : 'Never'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: INGESTION LOGS */}
      {activeTabSub === 'logs' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-800 font-display">Ingestion Audit History</h3>
              <p className="text-xs text-slate-500 mt-0.5">Real-time log of inbound leads from Meta and 99acres webhooks.</p>
            </div>
            <button
              onClick={fetchConfig}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </button>
          </div>

          {logs.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-semibold">No integration webhooks received yet.</p>
              <p className="text-xs text-slate-400 mt-1">Use the test sandbox above or trigger live campaigns to see audit events.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-400 font-display uppercase tracking-wider text-[10px]">
                    <th className="p-3.5 pl-5">Timestamp</th>
                    <th className="p-3.5">Source</th>
                    <th className="p-3.5">Lead Name</th>
                    <th className="p-3.5">Contact</th>
                    <th className="p-3.5">Project Interest</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 pr-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3.5 pl-5 font-mono text-slate-500">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                          log.source === 'Meta' 
                            ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {log.source}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-slate-800">
                        {log.lead_name}
                      </td>
                      <td className="p-3.5 font-mono text-slate-600">
                        {log.phone}
                      </td>
                      <td className="p-3.5 text-slate-600">
                        {log.project_name || 'General Inquiry'}
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          log.status === 'Ingested' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : log.status === 'Duplicate'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="p-3.5 pr-5 text-right">
                        <button
                          onClick={() => setActiveTab('leads')}
                          className="px-2.5 py-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        >
                          View in Leads &rarr;
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
