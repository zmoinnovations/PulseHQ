import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Send, Loader2, CheckCircle2, Activity, X, Globe, RefreshCw, Building2, Users, Moon, Sun, Terminal, Maximize2, Download, RotateCcw, FolderOpen, Briefcase, Plus, Sparkles, Paperclip, Linkedin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Lead, Batch, SearchParams, SearchMode, BusinessConfig } from '../types';
import { discoverLeads, enrichLead, loadBatches, saveBatches, loadBusinessConfigs, saveBusinessConfig, generateBusinessConfig } from '../services/leadService';
import { INDUSTRIES, REGIONS, REGION_DIRECTORIES, type Region } from '../constants';
import { BRANDING } from '../branding';
import { exportLeadsCSV } from '../utils/export';
import CheckboxDropdown from './CheckboxDropdown';

type ColorMode = 'light' | 'dark';

interface LeadRowProps {
  lead: Lead;
  idx: number;
  isActive: boolean;
  isChecked: boolean;
  onSelect: (lead: Lead) => void;
  onToggleCheck: (id: string, e: React.MouseEvent) => void;
}

const LeadRow = React.memo(function LeadRow({ lead, idx, isActive, isChecked, onSelect, onToggleCheck }: LeadRowProps) {
  const status = String(lead.status || '').trim().toLowerCase();

  return (
    <div
      onClick={() => onSelect(lead)}
      className={`flex items-center gap-2 px-4 py-3 cursor-pointer border-l-2 transition-colors ${
        isActive
          ? 'bg-[var(--c-surface)] border-l-[var(--c-primary)]'
          : 'bg-transparent border-l-transparent hover:bg-[var(--c-surface)]'
      }`}
    >
      <input
        type="checkbox"
        checked={isChecked}
        onClick={(e) => onToggleCheck(lead.id, e as any)}
        onChange={() => {}}
        className="w-3.5 h-3.5 shrink-0 accent-[var(--c-primary)] cursor-pointer"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm ${isActive ? 'text-[var(--c-text-1)] font-medium' : 'text-[var(--c-text-1)]'}`}>
            {lead.name}
          </span>
          {status === 'new' && (
            <span className="text-[10px] bg-[var(--c-primary)] text-[var(--c-primary-text)] px-1.5 py-0.5 font-medium">NEW</span>
          )}
          {status === 'contacted' && (
            <span className="text-[10px] bg-[var(--c-surface)] text-[var(--c-text-3)] border border-[var(--c-border)] px-1.5 py-0.5 font-medium">SENT</span>
          )}
        </div>
        <p className="text-xs text-[var(--c-text-3)] mt-0.5 truncate">
          {lead.contactPerson && <>{lead.contactPerson} &middot; </>}
          {lead.industry} &middot; {lead.location}
          {lead.source && <span className="ml-1.5 text-[10px] text-[var(--c-text-4)]">[{lead.source}]</span>}
        </p>
      </div>
      <div className="text-right shrink-0">
        <span className="text-xs font-mono text-[var(--c-text-2)]">{formatScore(lead.score)}</span>
      </div>
    </div>
  );
});

function formatScore(score: number): string {
  // Scores may be 1-10 or 1-100 depending on provider response
  const normalized = score > 10 ? Math.round(score / 10) : score;
  return `${Math.min(Math.max(normalized, 1), 10)}/10`;
}

/** Normalize a lead from any source (API, storage) to current schema. */
function normalizeLead(raw: any): Lead {
  // Ensure a proper UUID — old records may have sequential numbers like "1", "2"
  const needsId = !raw.id || /^\d+$/.test(raw.id);
  return {
    ...raw,
    id: needsId ? crypto.randomUUID() : raw.id,
    name: raw.name || raw.businessName || 'Unknown',
    intelligenceReport: {
      ...(raw.intelligenceReport || {}),
      profileSummary:
        raw.intelligenceReport?.profileSummary ||
        raw.intelligenceReport?.companyOverview ||
        '',
      keyMetrics: raw.intelligenceReport?.keyMetrics || [],
      opportunityAnalysis: raw.intelligenceReport?.opportunityAnalysis || '',
    },
  };
}

export default function LeadGenerator() {
  const [params, setParams] = useState<SearchParams>({ locations: [], niches: [] });
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [searchMode, setSearchMode] = useState<SearchMode>('individuals');
  const [automationMode, setAutomationMode] = useState<'manual' | 'automatic'>('manual');
  const [selectedRegion, setSelectedRegion] = useState<Region>('Africa');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [isStoppingAutomation, setIsStoppingAutomation] = useState(false);
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);
  const [automationStatus, setAutomationStatus] = useState('Idle');
  const [activeAutoLeadName, setActiveAutoLeadName] = useState<string | null>(null);
  const [searchLogs, setSearchLogs] = useState<{ time: string; msg: string }[]>([]);
  const [modalLead, setModalLead] = useState<Lead | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterBatchId, setFilterBatchId] = useState<string | null>(null);
  const [showBatchPicker, setShowBatchPicker] = useState(false);
  const [batchSearch, setBatchSearch] = useState('');
  const [runsExpanded, setRunsExpanded] = useState(false);
  const [searchSummary, setSearchSummary] = useState<{ total: number; found: number; duration: string; batchName: string } | null>(null);
  const [businessConfigs, setBusinessConfigs] = useState<BusinessConfig[]>([]);
  const [activeConfigId, setActiveConfigId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('pulsehq-active-config');
    return null;
  });
  const [showConfigPicker, setShowConfigPicker] = useState(false);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [configFormUrl, setConfigFormUrl] = useState('');
  const [configFormPrompt, setConfigFormPrompt] = useState('');
  const [configGenerating, setConfigGenerating] = useState(false);
  const [generatedConfig, setGeneratedConfig] = useState<BusinessConfig | null>(null);
  const [configFormFiles, setConfigFormFiles] = useState<{ name: string; content: string }[]>([]);
  const [configSaving, setConfigSaving] = useState(false);
  const [colorMode, setColorMode] = useState<ColorMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('pulsehq-theme');
      if (stored === 'dark' || stored === 'light') return stored;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });
  const initialLoadDone = useRef(false);
  const leadsRef = useRef<Lead[]>([]);
  const previousLeadCountRef = useRef(0);
  const discoveredAtRef = useRef<Map<string, number>>(new Map());
  const NEW_LEAD_REVIEW_MS = 7000;
  const searchModeRef = useRef<SearchMode>('individuals');
  const automationModeRef = useRef<'manual' | 'automatic'>('manual');
  const loadingRef = useRef(false);
  const autoSendRunningRef = useRef(false);
  const inFlightLeadIdsRef = useRef<Set<string>>(new Set());

  const modeLabel = searchMode === 'individuals' ? 'individuals' : 'businesses';

  // Close batch picker on outside click
  useEffect(() => {
    if (!showBatchPicker) return;
    const handle = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-batch-picker]')) setShowBatchPicker(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [showBatchPicker]);

  useEffect(() => {
    if (!showConfigPicker) return;
    const handle = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-config-picker]')) setShowConfigPicker(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [showConfigPicker]);

  // Apply color mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', colorMode === 'dark');
    localStorage.setItem('pulsehq-theme', colorMode);
  }, [colorMode]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/api/leads/load');
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          const loadedLeads = data.map((l: any) => ({
            ...normalizeLead(l),
            status: l.status === 'new' ? 'ready' : l.status
          }));
          loadedLeads.forEach((lead: Lead) => discoveredAtRef.current.set(lead.id, 0));
          setLeads(loadedLeads);
        }
      } catch (error) {
        console.error("Failed to load leads:", error);
      }
      // Load batches separately so a failure doesn't block leads
      try {
        const batchesData = await loadBatches();
        if (Array.isArray(batchesData)) setBatches(batchesData);
      } catch (error) {
        console.error("Failed to load batches:", error);
      }
      // Load business configs
      try {
        const configs = await loadBusinessConfigs();
        if (Array.isArray(configs) && configs.length > 0) {
          setBusinessConfigs(configs);
          // Set active config from localStorage or default to first
          const stored = localStorage.getItem('pulsehq-active-config');
          if (!stored || !configs.find(c => c.id === stored)) {
            setActiveConfigId(configs[0].id);
            localStorage.setItem('pulsehq-active-config', configs[0].id);
          }
        } else {
          // No configs — show generation form
          setShowConfigForm(true);
        }
      } catch (error) {
        console.error("Failed to load business configs:", error);
      }
      initialLoadDone.current = true;
    };
    loadData();
  }, []);

  useEffect(() => { leadsRef.current = leads; }, [leads]);
  useEffect(() => { searchModeRef.current = searchMode; }, [searchMode]);
  useEffect(() => { automationModeRef.current = automationMode; }, [automationMode]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);

  useEffect(() => {
    if (automationMode === 'manual') {
      setAutomationStatus('Idle');
      setActiveAutoLeadName(null);
      previousLeadCountRef.current = leads.length;
      return;
    }
    const prevCount = previousLeadCountRef.current;
    if (leads.length > prevCount) {
      setAutomationStatus(`+${leads.length - prevCount} new leads found`);
    } else if (loading) {
      setAutomationStatus('Searching...');
    } else if (activeAutoLeadName) {
      setAutomationStatus(`Emailing ${activeAutoLeadName}`);
    } else if (leads.some((l) => l.status === 'new' && l.email)) {
      const now = Date.now();
      const hasFresh = leads.some((l) => {
        if (l.status !== 'new' || !l.email) return false;
        const d = discoveredAtRef.current.get(l.id) ?? 0;
        return now - d < NEW_LEAD_REVIEW_MS;
      });
      setAutomationStatus(hasFresh ? 'Reviewing...' : 'Ready to send');
    } else {
      setAutomationStatus('Waiting...');
    }
    previousLeadCountRef.current = leads.length;
  }, [automationMode, loading, leads, activeAutoLeadName]);

  // Keep selectedLead in sync with leads array (e.g. after enrichment or status change)
  useEffect(() => {
    if (!selectedLead) return;
    const latest = leads.find((l) => l.id === selectedLead.id);
    if (latest && latest !== selectedLead) setSelectedLead(latest);
  }, [leads]);

  const handleSendEmail = async (lead: Lead) => {
    if (!lead.email) {
      alert("No email address. Add one manually or use Deep Enrich.");
      return;
    }
    setSendingEmail(true);
    try {
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: lead.email,
          subject: `Quick question about ${lead.name}'s setup`,
          html: lead.personalizedDraft,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: 'contacted' as Lead['status'] } : l));
        alert(`Email sent to ${lead.email}`);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      alert(`Failed: ${error.message}`);
    } finally {
      setSendingEmail(false);
    }
  };

  const handleEnrich = async (lead: Lead) => {
    setEnriching(true);
    try {
      const enrichment = await enrichLead(lead);
      if (enrichment.email || enrichment.phoneNumber) {
        const updated = leads.map(l => l.id === lead.id ? {
          ...l,
          email: enrichment.email || l.email,
          phoneNumber: enrichment.phoneNumber || l.phoneNumber
        } : l);
        setLeads(updated);
        if (selectedLead?.id === lead.id) {
          setSelectedLead({
            ...selectedLead,
            email: enrichment.email || selectedLead.email,
            phoneNumber: enrichment.phoneNumber || selectedLead.phoneNumber
          });
        }
      } else {
        alert("No additional contact info found.");
      }
    } catch (error) {
      console.error("Enrichment failed:", error);
    } finally {
      setEnriching(false);
    }
  };

  useEffect(() => {
    if (!initialLoadDone.current || leads.length === 0) return;
    const t = setTimeout(async () => {
      setSaving(true);
      try {
        await fetch('/api/leads/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(leads),
        });
      } catch (error) {
        console.error("Auto-save failed:", error);
      } finally {
        setSaving(false);
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [leads]);

  // Automatic outreach
  useEffect(() => {
    if (automationMode === 'manual' || loading || leads.length === 0 || autoSendRunningRef.current) return;
    const autoSend = async () => {
      autoSendRunningRef.current = true;
      try {
        while (automationModeRef.current === 'automatic' && !loadingRef.current) {
          const now = Date.now();
          const next = leadsRef.current.find((l) => {
            if (l.status !== 'new' || !l.email || inFlightLeadIdsRef.current.has(l.id)) return false;
            const d = discoveredAtRef.current.get(l.id) ?? 0;
            return now - d >= NEW_LEAD_REVIEW_MS;
          });
          if (!next) {
            const queued = leadsRef.current.some(l => l.status === 'new' && !!l.email && !inFlightLeadIdsRef.current.has(l.id));
            if (!queued) break;
            await new Promise(r => setTimeout(r, 1000));
            continue;
          }
          setSelectedLead(next);
          setActiveAutoLeadName(next.name);
          inFlightLeadIdsRef.current.add(next.id);
          try {
            const resp = await fetch('/api/email/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: next.email,
                subject: `Quick question about ${next.name}'s setup`,
                html: next.personalizedDraft.replace(/\n/g, '<br/>'),
              }),
            });
            const result = await resp.json();
            if (result.success) {
              setLeads(prev => prev.map(l => l.id === next.id ? { ...l, status: 'contacted' as Lead['status'] } : l));
            }
          } catch (error) {
            console.error(`[Auto] Failed: ${next.name}`, error);
          } finally {
            inFlightLeadIdsRef.current.delete(next.id);
            setActiveAutoLeadName(null);
          }
          await new Promise(r => setTimeout(r, 3500));
        }
      } finally {
        autoSendRunningRef.current = false;
      }
    };
    autoSend();
  }, [leads, automationMode, loading]);

  // Auto-target
  useEffect(() => {
    if (automationMode === 'manual' || loading) return;
    const pending = leads.filter(l => l.status === 'new');
    if (pending.length === 0) {
      const dir = REGION_DIRECTORIES[selectedRegion];
      let loc: string;
      if (selectedCountry && dir[selectedCountry]) {
        const cities = dir[selectedCountry];
        loc = `${cities[Math.floor(Math.random() * cities.length)]}, ${selectedCountry}`;
      } else {
        const all = Object.entries(dir).flatMap(([c, cities]: [string, string[]]) => cities.map(city => `${city}, ${c}`));
        loc = all[Math.floor(Math.random() * all.length)];
      }
      const niche = INDUSTRIES[Math.floor(Math.random() * INDUSTRIES.length)];
      setParams({ locations: [loc], niches: [niche] });
      const timer = setTimeout(() => {
        if (automationMode === 'automatic' && !loading) handleSearch();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [leads, automationMode, loading, selectedCountry, selectedRegion]);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setSearchLogs(prev => [...prev.slice(-49), { time, msg }]);
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (params.locations.length === 0 || params.niches.length === 0) return;
    setLoading(true);
    setSearchSummary(null);
    setSearchLogs([]);
    const total = params.locations.length * params.niches.length;
    const startTime = Date.now();
    addLog(`Starting search: ${total} combo${total > 1 ? 's' : ''} (${searchModeRef.current})`);

    // Create batch
    const batchId = crypto.randomUUID();
    const batchName = `Run — ${new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
    const batch: Batch = {
      id: batchId,
      name: batchName,
      createdAt: new Date().toISOString(),
      mode: searchModeRef.current,
      locations: [...params.locations],
      niches: [...params.niches],
      leadCount: 0,
      businessId: activeConfigId || undefined,
    };
    let batchLeadCount = 0;

    try {
      setLeads(prev => prev.map(l => l.status === 'new' ? { ...l, status: 'ready' } as Lead : l));
      let combo = 0;
      for (const location of params.locations) {
        for (const niche of params.niches) {
          combo++;
          addLog(`[${combo}/${total}] Searching ${location} × ${niche}...`);
          try {
            const results = await discoverLeads(location, niche, searchModeRef.current, activeConfigId || undefined);
            const source = `${location} × ${niche}`;
            setLeads(prev => {
              const found = results
                .map(r => ({ ...normalizeLead(r), status: 'new', source, batchId }) as Lead)
                .filter(nr => !prev.some(er => er.name.toLowerCase() === nr.name.toLowerCase()));
              const now = Date.now();
              found.forEach(lead => discoveredAtRef.current.set(lead.id, now));
              batchLeadCount += found.length;
              addLog(`[${combo}/${total}] Found ${found.length} new ${modeLabel}`);
              return [...prev, ...found];
            });
          } catch (error: any) {
            addLog(`[${combo}/${total}] Failed: ${error.message || 'Unknown error'}`);
            console.error(`Search failed: ${location}/${niche}`, error);
          }
        }
      }

      // Calculate duration
      const elapsed = Date.now() - startTime;
      const duration = elapsed >= 60000
        ? `${Math.floor(elapsed / 60000)}m ${Math.round((elapsed % 60000) / 1000)}s`
        : `${Math.round(elapsed / 1000)}s`;

      addLog(`Done. ${batchLeadCount} leads in ${duration}.`);

      // Save batch
      batch.leadCount = batchLeadCount;
      setBatches(prev => {
        const updated = [...prev, batch];
        saveBatches(updated);
        return updated;
      });

      // Show summary banner
      setSearchSummary({ total, found: batchLeadCount, duration, batchName });
    } finally {
      setLoading(false);
    }
  };

  const selectLead = useCallback((lead: Lead) => {
    setSelectedLead(lead);
  }, []);

  const openLeadModal = () => {
    if (selectedLead) {
      const fresh = leads.find(l => l.id === selectedLead.id) || selectedLead;
      setModalLead(fresh);
      setShowModal(true);
    }
  };

  const stopAutomation = () => {
    setIsStoppingAutomation(true);
    setAutomationMode('manual');
    setAutomationStatus('Idle');
    setActiveAutoLeadName(null);
    setTimeout(() => setIsStoppingAutomation(false), 400);
  };

  const toggleSelect = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const rerunBatch = (batch: Batch) => {
    setParams({ locations: batch.locations, niches: batch.niches });
    setSearchMode(batch.mode);
    setFilterBatchId(null);
  };

  const normalizeStatus = (status: Lead['status'] | string) => String(status || '').trim().toLowerCase();
  const businessKey = (name?: string) => String(name || '').trim().toLowerCase();

  const sortedLeads = [...leads].sort((a, b) => {
    const aNew = normalizeStatus(a.status) === 'new' ? 1 : 0;
    const bNew = normalizeStatus(b.status) === 'new' ? 1 : 0;
    if (aNew !== bNew) return bNew - aNew;
    return (discoveredAtRef.current.get(b.id) ?? 0) - (discoveredAtRef.current.get(a.id) ?? 0);
  });

  // Workspace: filter leads to active business context
  // Batches without a businessId are treated as belonging to the first config (migrated legacy)
  const firstConfigId = businessConfigs.length > 0 ? businessConfigs[0].id : null;
  const businessBatchIds = activeConfigId
    ? new Set(batches.filter(b => b.businessId === activeConfigId || (!b.businessId && activeConfigId === firstConfigId)).map(b => b.id))
    : null;

  const workspaceLeads = businessBatchIds
    ? sortedLeads.filter(l => !l.batchId || businessBatchIds.has(l.batchId))
    : sortedLeads;

  const filteredLeads = filterBatchId
    ? workspaceLeads.filter(l => l.batchId === filterBatchId)
    : workspaceLeads;

  const olderKeys = new Set(
    filteredLeads.filter(l => normalizeStatus(l.status) !== 'new').map(l => businessKey(l.name))
  );
  const newLeads = filteredLeads.filter(l => normalizeStatus(l.status) === 'new' && !olderKeys.has(businessKey(l.name)));
  const olderLeads = filteredLeads.filter(l => normalizeStatus(l.status) !== 'new');
  const displayedLeads = [...newLeads, ...olderLeads];

  return (
    <div className="flex flex-col h-screen bg-[var(--c-bg)] text-[var(--c-text-2)] font-sans overflow-hidden">
      {/* Modal */}
      <AnimatePresence>
        {showModal && modalLead && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-[var(--c-overlay)] pointer-events-auto"
            />
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="relative w-full max-w-2xl max-h-[80vh] bg-[var(--c-surface-raised)] border border-[var(--c-border)] shadow-lg overflow-hidden flex flex-col pointer-events-auto"
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-[var(--c-border)] flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-medium text-[var(--c-text-1)]">{modalLead.name}</h2>
                  <p className="text-sm text-[var(--c-text-3)] mt-1">
                    {modalLead.contactPerson && <>{modalLead.contactPerson} &middot; </>}
                    {modalLead.industry} &middot; {modalLead.location}
                  </p>
                  {modalLead.source && (
                    <span className="inline-block mt-1.5 text-[10px] bg-[var(--c-surface)] border border-[var(--c-border)] text-[var(--c-text-3)] px-1.5 py-0.5">{modalLead.source}</span>
                  )}
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1.5 hover:bg-[var(--c-surface)] transition-colors text-[var(--c-text-3)] hover:text-[var(--c-text-1)]"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                <div className="flex gap-6">
                  <div className="flex-1">
                    <p className="text-xs text-[var(--c-text-3)] uppercase tracking-wide mb-2">Summary</p>
                    <p className="text-sm text-[var(--c-text-1)] leading-relaxed">
                      {modalLead.intelligenceReport?.profileSummary || 'No summary available.'}
                    </p>
                  </div>
                  <div className="shrink-0 w-20 text-center">
                    <p className="text-xs text-[var(--c-text-3)] uppercase tracking-wide mb-2">Score</p>
                    <p className="text-2xl font-light text-[var(--c-text-1)] font-mono">{formatScore(modalLead.score)}</p>
                  </div>
                </div>

                <div className="h-px bg-[var(--c-border)]" />

                <div>
                  <p className="text-xs text-[var(--c-text-3)] uppercase tracking-wide mb-3">Pain Points</p>
                  <ul className="space-y-2">
                    {(modalLead.painPoints ?? []).map((point, i) => (
                      <li key={i} className="flex gap-2 text-sm text-[var(--c-text-1)]">
                        <span className="text-[var(--c-text-3)] font-mono text-xs mt-0.5">{i + 1}.</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>

                {(modalLead.intelligenceReport?.keyMetrics ?? []).length > 0 && (
                  <div>
                    <p className="text-xs text-[var(--c-text-3)] uppercase tracking-wide mb-3">Key Metrics</p>
                    <div className="flex flex-wrap gap-2">
                      {modalLead.intelligenceReport!.keyMetrics.map((m, i) => (
                        <span key={i} className="px-2.5 py-1 bg-[var(--c-surface)] border border-[var(--c-border)] text-xs text-[var(--c-text-1)]">{m}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="h-px bg-[var(--c-border)]" />

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs text-[var(--c-text-3)] uppercase tracking-wide mb-2">Opportunity</p>
                    <p className="text-sm text-[var(--c-text-1)] leading-relaxed">
                      {modalLead.intelligenceReport?.opportunityAnalysis || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--c-text-3)] uppercase tracking-wide mb-2">Recent Signals</p>
                    <p className="text-sm text-[var(--c-text-1)] leading-relaxed">
                      {modalLead.intelligenceReport?.recentNews || 'None identified.'}
                    </p>
                  </div>
                </div>

                {modalLead.intelligenceReport?.decisionMakerContext && (
                  <>
                    <div className="h-px bg-[var(--c-border)]" />
                    <div>
                      <p className="text-xs text-[var(--c-text-3)] uppercase tracking-wide mb-2">Decision Maker</p>
                      <p className="text-sm text-[var(--c-text-1)]">{modalLead.intelligenceReport.decisionMakerContext}</p>
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-[var(--c-border)] flex gap-3">
                <button
                  disabled={sendingEmail}
                  onClick={() => {
                    if (modalLead?.phoneNumber) {
                      window.open(`https://wa.me/${modalLead.phoneNumber.replace(/\D/g, '')}?text=${encodeURIComponent(modalLead.personalizedDraft)}`, '_blank');
                    } else if (modalLead?.email) {
                      handleSendEmail(modalLead);
                    } else {
                      navigator.clipboard.writeText(modalLead?.personalizedDraft || '');
                      alert('No contact info. Draft copied to clipboard.');
                    }
                  }}
                  className="flex-1 bg-[var(--c-primary)] hover:bg-[var(--c-primary-hover)] text-[var(--c-primary-text)] text-sm font-medium py-2.5 px-4 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {sendingEmail ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                  {sendingEmail ? 'Sending...' : 'Send Outreach'}
                </button>
                {modalLead.linkedinUrl && (
                  <a
                    href={modalLead.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 border border-[var(--c-border)] text-sm text-[var(--c-text-1)] hover:bg-[var(--c-surface)] transition-colors flex items-center gap-2"
                  >
                    <Linkedin size={14} />
                    LinkedIn
                  </a>
                )}
                {modalLead.website && (
                  <a
                    href={modalLead.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 border border-[var(--c-border)] text-sm text-[var(--c-text-1)] hover:bg-[var(--c-surface)] transition-colors flex items-center gap-2"
                  >
                    <Globe size={14} />
                    Website
                  </a>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Business Config Generation Modal */}
      <AnimatePresence>
        {showConfigForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { if (!configGenerating) setShowConfigForm(false); }}
              className="absolute inset-0 bg-[var(--c-overlay)] pointer-events-auto"
            />
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="relative w-full max-w-lg bg-[var(--c-surface-raised)] border border-[var(--c-border)] shadow-lg flex flex-col pointer-events-auto max-h-[80vh] overflow-y-auto"
            >
              <div className="px-6 py-5 border-b border-[var(--c-border)] flex justify-between items-center">
                <h2 className="text-sm font-medium text-[var(--c-text-1)]">
                  {generatedConfig ? 'Review Business Profile' : 'Create Business Profile'}
                </h2>
                {!configGenerating && (
                  <button onClick={() => { setShowConfigForm(false); setGeneratedConfig(null); }} className="text-[var(--c-text-3)] hover:text-[var(--c-text-1)]">
                    <X size={16} />
                  </button>
                )}
              </div>

              {!generatedConfig ? (
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs text-[var(--c-text-3)] mb-1.5">Business Website (optional)</label>
                    <input
                      type="url"
                      value={configFormUrl}
                      onChange={(e) => setConfigFormUrl(e.target.value)}
                      placeholder="https://yourcompany.com"
                      className="w-full bg-[var(--c-surface)] border border-[var(--c-border)] px-3 py-2 text-sm text-[var(--c-text-1)] outline-none focus:border-[var(--c-primary)] placeholder:text-[var(--c-text-4)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--c-text-3)] mb-1.5">Describe your business</label>
                    <textarea
                      value={configFormPrompt}
                      onChange={(e) => setConfigFormPrompt(e.target.value)}
                      rows={4}
                      placeholder="Tell us about your business, products/services, target audience, and what makes you different..."
                      className="w-full bg-[var(--c-surface)] border border-[var(--c-border)] px-3 py-2 text-sm text-[var(--c-text-1)] outline-none focus:border-[var(--c-primary)] placeholder:text-[var(--c-text-4)] resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--c-text-3)] mb-1.5">Attach files (optional)</label>
                    <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-[var(--c-border)] cursor-pointer hover:bg-[var(--c-surface)] transition-colors">
                      <Paperclip size={14} className="text-[var(--c-text-4)]" />
                      <span className="text-xs text-[var(--c-text-3)]">
                        {configFormFiles.length > 0 ? `${configFormFiles.length} file${configFormFiles.length > 1 ? 's' : ''} attached` : 'Business plan, pitch deck, or other docs'}
                      </span>
                      <input
                        type="file"
                        multiple
                        accept=".txt,.md,.csv,.json,.pdf,.doc,.docx"
                        className="hidden"
                        onChange={async (e) => {
                          const files = Array.from(e.target.files || []);
                          const results: { name: string; content: string }[] = [];
                          for (const file of files) {
                            try {
                              const text = await file.text();
                              results.push({ name: file.name, content: text.slice(0, 15000) });
                            } catch {
                              // skip unreadable files
                            }
                          }
                          setConfigFormFiles(prev => [...prev, ...results]);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    {configFormFiles.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {configFormFiles.map((f, i) => (
                          <span key={i} className="inline-flex items-center gap-1 text-[10px] bg-[var(--c-surface)] border border-[var(--c-border)] px-1.5 py-0.5 text-[var(--c-text-3)]">
                            {f.name}
                            <button onClick={() => setConfigFormFiles(prev => prev.filter((_, j) => j !== i))} className="hover:text-[var(--c-text-1)]">
                              <X size={10} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={async () => {
                      if (!configFormUrl && !configFormPrompt && configFormFiles.length === 0) return;
                      setConfigGenerating(true);
                      try {
                        // Combine prompt with file contents
                        let fullPrompt = configFormPrompt || '';
                        if (configFormFiles.length > 0) {
                          const fileContext = configFormFiles.map(f => `--- File: ${f.name} ---\n${f.content}`).join('\n\n');
                          fullPrompt = fullPrompt
                            ? `${fullPrompt}\n\nAttached documents:\n${fileContext}`
                            : `Generate a business profile from these documents:\n${fileContext}`;
                        }
                        const result = await generateBusinessConfig({ prompt: fullPrompt || undefined, websiteUrl: configFormUrl || undefined });
                        setGeneratedConfig(result);
                      } catch (error: any) {
                        alert(`Generation failed: ${error.message}`);
                      } finally {
                        setConfigGenerating(false);
                      }
                    }}
                    disabled={configGenerating || (!configFormUrl && !configFormPrompt && configFormFiles.length === 0)}
                    className="w-full py-2.5 bg-[var(--c-primary)] text-[var(--c-primary-text)] text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
                  >
                    {configGenerating ? (
                      <><Loader2 size={14} className="animate-spin" /> Generating...</>
                    ) : (
                      <><Sparkles size={14} /> Generate Profile</>
                    )}
                  </button>
                </div>
              ) : (
                <div className="p-6 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Briefcase size={14} className="text-[var(--c-primary)]" />
                      <span className="text-sm font-medium text-[var(--c-text-1)]">{generatedConfig.company.name}</span>
                    </div>
                    <p className="text-xs text-[var(--c-text-3)]">{generatedConfig.company.description}</p>
                    {generatedConfig.company.website && (
                      <p className="text-xs text-[var(--c-text-4)]">{generatedConfig.company.website}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-[var(--c-text-4)] mb-1">Products</p>
                    <div className="space-y-1">
                      {generatedConfig.products.map((p, i) => (
                        <p key={i} className="text-xs text-[var(--c-text-2)]">{p.name} — {p.summary}</p>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-[var(--c-text-4)] mb-1">Target Profiles</p>
                    <div className="space-y-0.5">
                      {generatedConfig.targetProfiles.map((t, i) => (
                        <p key={i} className="text-xs text-[var(--c-text-2)]">{t}</p>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={async () => {
                        setConfigSaving(true);
                        try {
                          const saved = await saveBusinessConfig(generatedConfig);
                          setBusinessConfigs(prev => [...prev, saved]);
                          setActiveConfigId(saved.id);
                          localStorage.setItem('pulsehq-active-config', saved.id);
                          setSelectedLead(null);
                          // Brief delay so user sees "Saved" state before modal closes
                          await new Promise(r => setTimeout(r, 400));
                          setShowConfigForm(false);
                          setGeneratedConfig(null);
                          setConfigFormUrl('');
                          setConfigFormPrompt('');
                          setConfigFormFiles([]);
                        } catch (error: any) {
                          alert(`Save failed: ${error.message}`);
                        } finally {
                          setConfigSaving(false);
                        }
                      }}
                      disabled={configSaving}
                      className="flex-1 py-2.5 bg-[var(--c-primary)] text-[var(--c-primary-text)] text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-70 transition-opacity"
                    >
                      {configSaving ? (
                        <><Loader2 size={14} className="animate-spin" /> Saving...</>
                      ) : (
                        <><CheckCircle2 size={14} /> Save & Activate</>
                      )}
                    </button>
                    <button
                      onClick={() => setGeneratedConfig(null)}
                      className="px-4 py-2.5 border border-[var(--c-border)] text-sm text-[var(--c-text-2)] hover:bg-[var(--c-surface)] transition-colors"
                    >
                      Regenerate
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="h-12 border-b border-[var(--c-border)] px-5 flex items-center gap-4 bg-[var(--c-surface-raised)] shrink-0">
        <div className="flex items-center gap-2.5">
          {!BRANDING.logoUrl || logoLoadFailed ? (
            <div className="w-6 h-6 bg-[var(--c-text-1)] flex items-center justify-center text-[var(--c-bg)] text-xs font-medium">
              {BRANDING.appName.charAt(0)}
            </div>
          ) : (
            <img
              src={BRANDING.logoUrl}
              alt=""
              className="w-6 h-6 object-cover"
              onError={() => setLogoLoadFailed(true)}
            />
          )}
          <span className="text-sm font-medium text-[var(--c-text-1)]">{BRANDING.appName}</span>
        </div>

        <div className="h-4 w-px bg-[var(--c-border)] mx-2" />

        {/* Automation toggle */}
        <div className="flex border border-[var(--c-border)]">
          <button
            onClick={() => setAutomationMode('manual')}
            className={`px-3 py-1 text-xs transition-colors ${
              automationMode === 'manual' ? 'bg-[var(--c-surface)] text-[var(--c-text-1)] font-medium' : 'text-[var(--c-text-3)] hover:text-[var(--c-text-1)]'
            }`}
          >
            Manual
          </button>
          <button
            onClick={() => setAutomationMode('automatic')}
            className={`px-3 py-1 text-xs transition-colors flex items-center gap-1.5 ${
              automationMode === 'automatic' ? 'bg-[var(--c-primary)] text-[var(--c-primary-text)] font-medium' : 'text-[var(--c-text-3)] hover:text-[var(--c-text-1)]'
            }`}
          >
            {automationMode === 'automatic' && <Activity size={10} className="animate-pulse" />}
            Auto
          </button>
        </div>
        {automationMode === 'automatic' && (
          <>
            <button
              onClick={stopAutomation}
              disabled={isStoppingAutomation}
              className="px-2 py-1 text-xs text-[var(--c-danger)] hover:bg-[var(--c-surface)] transition-colors border border-[var(--c-border)]"
            >
              Stop
            </button>
            <span className="text-xs text-[var(--c-text-3)] hidden md:inline">{automationStatus}</span>
          </>
        )}

        {/* Business config picker */}
        <div className="relative" data-config-picker>
          <button
            onClick={() => setShowConfigPicker(!showConfigPicker)}
            className={`px-2.5 py-1 text-xs border border-[var(--c-border)] flex items-center gap-1.5 transition-colors max-w-[180px] ${
              showConfigPicker ? 'bg-[var(--c-surface)] text-[var(--c-text-1)]' : 'text-[var(--c-text-3)] hover:text-[var(--c-text-1)] hover:bg-[var(--c-surface)]'
            }`}
          >
            <Briefcase size={12} />
            <span className="truncate">
              {businessConfigs.find(c => c.id === activeConfigId)?.company.name || 'No Business'}
            </span>
          </button>
          {showConfigPicker && (
            <div className="absolute top-full left-0 mt-1 w-72 bg-[var(--c-surface-raised)] border border-[var(--c-border)] shadow-lg z-40 flex flex-col max-h-[320px]">
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {businessConfigs.map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setActiveConfigId(c.id);
                      localStorage.setItem('pulsehq-active-config', c.id);
                      setShowConfigPicker(false);
                      setSelectedLead(null);
                      setFilterBatchId(null);
                    }}
                    className={`w-full px-3 py-2.5 text-left hover:bg-[var(--c-surface)] transition-colors border-b border-[var(--c-border)] ${
                      activeConfigId === c.id ? 'bg-[var(--c-surface)]' : ''
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[var(--c-text-1)] font-medium truncate">{c.company.name}</span>
                      {activeConfigId === c.id && <span className="text-[10px] text-[var(--c-primary)] shrink-0 ml-2">Active</span>}
                    </div>
                    <p className="text-[10px] text-[var(--c-text-3)] mt-0.5 truncate">{c.company.description}</p>
                  </button>
                ))}
              </div>
              <button
                onClick={() => { setShowConfigPicker(false); setShowConfigForm(true); }}
                className="w-full px-3 py-2.5 text-left hover:bg-[var(--c-surface)] transition-colors flex items-center gap-2 border-t border-[var(--c-border)]"
              >
                <Plus size={12} className="text-[var(--c-primary)]" />
                <span className="text-xs text-[var(--c-text-2)]">New Business Profile</span>
              </button>
            </div>
          )}
        </div>

        {/* Batch picker */}
        <div className="relative" data-batch-picker>
          <button
            onClick={() => setShowBatchPicker(!showBatchPicker)}
            className={`px-2.5 py-1 text-xs border border-[var(--c-border)] flex items-center gap-1.5 transition-colors ${
              showBatchPicker || filterBatchId ? 'bg-[var(--c-surface)] text-[var(--c-text-1)]' : 'text-[var(--c-text-3)] hover:text-[var(--c-text-1)] hover:bg-[var(--c-surface)]'
            }`}
          >
            <FolderOpen size={12} />
            {filterBatchId ? batches.find(b => b.id === filterBatchId)?.name || 'Batch' : 'Load'}
          </button>
          {showBatchPicker && (
            <div className="absolute top-full left-0 mt-1 w-72 bg-[var(--c-surface-raised)] border border-[var(--c-border)] shadow-lg z-40 flex flex-col max-h-[320px]">
              <div className="p-2 border-b border-[var(--c-border)]">
                <input
                  type="text"
                  value={batchSearch}
                  onChange={(e) => setBatchSearch(e.target.value)}
                  placeholder="Search batches..."
                  autoFocus
                  className="w-full bg-[var(--c-surface)] border border-[var(--c-border)] px-2.5 py-1.5 text-xs text-[var(--c-text-1)] outline-none focus:border-[var(--c-primary)] placeholder:text-[var(--c-text-4)]"
                />
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {filterBatchId && (
                  <button
                    onClick={() => { setFilterBatchId(null); setShowBatchPicker(false); setBatchSearch(''); }}
                    className="w-full px-3 py-2 text-xs text-left text-[var(--c-text-2)] hover:bg-[var(--c-surface)] border-b border-[var(--c-border)] transition-colors"
                  >
                    Show all leads
                  </button>
                )}
                {batches
                  .filter(b => !batchSearch || b.name.toLowerCase().includes(batchSearch.toLowerCase()) || b.locations.some(l => l.toLowerCase().includes(batchSearch.toLowerCase())) || b.niches.some(n => n.toLowerCase().includes(batchSearch.toLowerCase())))
                  .slice().reverse()
                  .map(b => (
                    <button
                      key={b.id}
                      onClick={() => { setFilterBatchId(b.id); setShowBatchPicker(false); setBatchSearch(''); }}
                      className={`w-full px-3 py-2.5 text-left hover:bg-[var(--c-surface)] transition-colors border-b border-[var(--c-border)] ${
                        filterBatchId === b.id ? 'bg-[var(--c-surface)]' : ''
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-[var(--c-text-1)] font-medium truncate">{b.name}</span>
                        <span className="text-[10px] text-[var(--c-text-4)] shrink-0 ml-2">{b.leadCount} leads</span>
                      </div>
                      <p className="text-[10px] text-[var(--c-text-3)] mt-0.5 truncate">
                        {b.mode} &middot; {b.locations.slice(0, 2).join(', ')}{b.locations.length > 2 ? ` +${b.locations.length - 2}` : ''}
                        {b.businessId && businessConfigs.find(c => c.id === b.businessId) && (
                          <span className="ml-1.5 text-[var(--c-text-4)]">[{businessConfigs.find(c => c.id === b.businessId)!.company.name}]</span>
                        )}
                      </p>
                    </button>
                  ))
                }
                {batches.length === 0 && (
                  <p className="px-3 py-4 text-xs text-[var(--c-text-4)] text-center">No batches yet. Run a search to create one.</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-3 text-xs text-[var(--c-text-3)]">
          {saving ? (
            <span className="flex items-center gap-1.5"><RefreshCw size={10} className="animate-spin" /> Saving</span>
          ) : (
            <span className="font-mono">{displayedLeads.length} leads</span>
          )}
          <div className="h-4 w-px bg-[var(--c-border)]" />
          <button
            onClick={() => setColorMode(colorMode === 'light' ? 'dark' : 'light')}
            className="p-1.5 border border-[var(--c-border)] hover:bg-[var(--c-surface)] transition-colors text-[var(--c-text-2)] hover:text-[var(--c-text-1)]"
            title={`Switch to ${colorMode === 'light' ? 'dark' : 'light'} mode`}
          >
            {colorMode === 'light' ? <Moon size={14} /> : <Sun size={14} />}
          </button>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-12 overflow-hidden min-h-0">
        {/* Left: Config */}
        <section className="col-span-3 border-r border-[var(--c-border)] flex flex-col bg-[var(--c-surface)] overflow-y-auto custom-scrollbar h-full min-h-0">
          <div className="p-5 space-y-5">
            <p className="text-xs text-[var(--c-text-3)] uppercase tracking-wide font-medium">Configuration</p>

            {/* Search Mode */}
            <div className="space-y-1.5">
              <label className="text-xs text-[var(--c-text-2)]">Target type</label>
              <div className="flex border border-[var(--c-border)]">
                <button
                  type="button"
                  onClick={() => setSearchMode('individuals')}
                  className={`flex-1 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    searchMode === 'individuals' ? 'bg-[var(--c-surface-raised)] text-[var(--c-text-1)]' : 'text-[var(--c-text-3)] hover:text-[var(--c-text-1)]'
                  }`}
                >
                  <Users size={12} />
                  People
                </button>
                <button
                  type="button"
                  onClick={() => setSearchMode('businesses')}
                  className={`flex-1 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    searchMode === 'businesses' ? 'bg-[var(--c-surface-raised)] text-[var(--c-text-1)]' : 'text-[var(--c-text-3)] hover:text-[var(--c-text-1)]'
                  }`}
                >
                  <Building2 size={12} />
                  Businesses
                </button>
              </div>
            </div>

            {/* Region */}
            <div className="space-y-1.5">
              <label className="text-xs text-[var(--c-text-2)]">Region</label>
              <div className="flex border border-[var(--c-border)]">
                {REGIONS.map(region => (
                  <button
                    key={region}
                    type="button"
                    onClick={() => {
                      setSelectedRegion(region);
                      setSelectedCountry('');
                      setParams(prev => ({ ...prev, locations: [] }));
                    }}
                    className={`flex-1 py-2 text-[11px] font-medium transition-colors ${
                      selectedRegion === region ? 'bg-[var(--c-surface-raised)] text-[var(--c-text-1)]' : 'text-[var(--c-text-3)] hover:text-[var(--c-text-1)]'
                    }`}
                  >
                    {region}
                  </button>
                ))}
              </div>
            </div>

            {/* Country */}
            <div className="space-y-1.5">
              <label className="text-xs text-[var(--c-text-2)]">{selectedRegion === 'US' ? 'State' : 'Country'}</label>
              <select
                value={selectedCountry}
                onChange={(e) => {
                  setSelectedCountry(e.target.value);
                  setParams(prev => ({ ...prev, locations: [] }));
                }}
                className="w-full bg-[var(--c-surface-raised)] border border-[var(--c-border)] py-2 px-3 text-sm text-[var(--c-text-1)] outline-none focus:border-[var(--c-primary)] transition-colors appearance-none cursor-pointer"
              >
                <option value="">All</option>
                {Object.keys(REGION_DIRECTORIES[selectedRegion]).sort().map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Cities */}
            <div className="space-y-1.5">
              <label className="text-xs text-[var(--c-text-2)] flex items-center gap-1.5">
                Cities
                {params.locations.length > 0 && <span className="text-[var(--c-text-1)] font-medium">({params.locations.length})</span>}
              </label>
              <CheckboxDropdown
                options={
                  selectedCountry
                    ? (REGION_DIRECTORIES[selectedRegion][selectedCountry] || []).map(city => `${city}, ${selectedCountry}`)
                    : Object.entries(REGION_DIRECTORIES[selectedRegion]).flatMap(([country, cities]: [string, string[]]) =>
                        cities.map(city => `${city}, ${country}`)
                      )
                }
                selected={params.locations}
                onChange={(locations) => setParams(prev => ({ ...prev, locations }))}
                placeholder="Select cities"
              />
            </div>

            {/* Industries */}
            <div className="space-y-1.5">
              <label className="text-xs text-[var(--c-text-2)] flex items-center gap-1.5">
                Industries
                {params.niches.length > 0 && <span className="text-[var(--c-text-1)] font-medium">({params.niches.length})</span>}
              </label>
              <CheckboxDropdown
                options={INDUSTRIES}
                selected={params.niches}
                onChange={(niches) => setParams(prev => ({ ...prev, niches }))}
                placeholder="Select industries"
              />
            </div>

            {/* Search button */}
            <button
              onClick={(e) => handleSearch(e)}
              disabled={loading || params.locations.length === 0 || params.niches.length === 0}
              className="w-full bg-[var(--c-primary)] hover:bg-[var(--c-primary-hover)] text-[var(--c-primary-text)] text-sm font-medium py-2.5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              {loading ? 'Searching...' : 'Search'}
            </button>

            {/* Search Logs */}
            {searchLogs.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Terminal size={10} className="text-[var(--c-text-3)]" />
                  <span className="text-[10px] text-[var(--c-text-3)] uppercase tracking-wide">Log</span>
                </div>
                <div className="bg-[var(--c-surface-raised)] border border-[var(--c-border)] p-2 max-h-[120px] overflow-y-auto custom-scrollbar font-mono text-[10px] leading-relaxed text-[var(--c-text-2)] space-y-0.5">
                  {searchLogs.map((log, i) => (
                    <div key={i} className="flex gap-1.5">
                      <span className="text-[var(--c-text-4)] shrink-0">{log.time}</span>
                      <span>{log.msg}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Stats + Batches */}
          <div className="mt-auto border-t border-[var(--c-border)] bg-[var(--c-surface-raised)] flex flex-col">
            <div className="p-4">
              <div className="grid grid-cols-2 gap-y-3 text-xs">
                <div>
                  <p className="text-[var(--c-text-3)]">Region</p>
                  <p className="text-[var(--c-text-1)] mt-0.5">{selectedRegion}</p>
                </div>
                <div>
                  <p className="text-[var(--c-text-3)]">Combos</p>
                  <p className="text-[var(--c-text-1)] mt-0.5">{params.locations.length}&times;{params.niches.length}</p>
                </div>
                <div>
                  <p className="text-[var(--c-text-3)]">Total</p>
                  <p className="text-[var(--c-text-1)] mt-0.5">{displayedLeads.length}</p>
                </div>
                <div>
                  <p className="text-[var(--c-text-3)]">Contacted</p>
                  <p className="text-[var(--c-text-1)] mt-0.5">{displayedLeads.filter(l => l.status === 'contacted').length}</p>
                </div>
              </div>
            </div>
            {(() => {
              const workspaceBatches = activeConfigId
                ? batches.filter(b => b.businessId === activeConfigId)
                : batches;
              return workspaceBatches.length > 0 && (
              <div className="border-t border-[var(--c-border)]">
                <button
                  onClick={() => setRunsExpanded(!runsExpanded)}
                  className="w-full px-3 py-2 flex items-center justify-between hover:bg-[var(--c-surface)] transition-colors"
                >
                  <span className="text-[10px] text-[var(--c-text-3)] uppercase tracking-wide font-medium">Recent Runs ({workspaceBatches.length})</span>
                  <span className="text-[10px] text-[var(--c-text-4)]">{runsExpanded ? '−' : '+'}</span>
                </button>
                {runsExpanded && (
                  <div className="px-3 pb-3 space-y-1.5 max-h-[120px] overflow-y-auto custom-scrollbar">
                    {workspaceBatches.slice(-5).reverse().map(b => (
                      <div
                        key={b.id}
                        className={`flex items-center gap-2 text-[11px] px-2 py-1.5 border border-[var(--c-border)] cursor-pointer transition-colors ${
                          filterBatchId === b.id ? 'bg-[var(--c-surface)] border-[var(--c-primary)]' : 'hover:bg-[var(--c-surface)]'
                        }`}
                        onClick={() => setFilterBatchId(filterBatchId === b.id ? null : b.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-[var(--c-text-1)] truncate">{b.name}</p>
                          <p className="text-[var(--c-text-4)] text-[10px]">{b.leadCount} leads &middot; {b.mode}</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); rerunBatch(b); }}
                          className="shrink-0 p-1 hover:bg-[var(--c-surface-raised)] text-[var(--c-text-3)] hover:text-[var(--c-text-1)] transition-colors"
                          title="Rerun this search"
                        >
                          <RotateCcw size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              );
            })()}
          </div>
        </section>

        {/* Center: Pipeline */}
        <section className="col-span-5 flex flex-col bg-[var(--c-bg)] overflow-y-auto custom-scrollbar h-full min-h-0">
          <div className="px-5 py-3 border-b border-[var(--c-border)] flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={displayedLeads.length > 0 && selectedIds.size === displayedLeads.length}
                onChange={() => {
                  if (selectedIds.size === displayedLeads.length) {
                    setSelectedIds(new Set());
                  } else {
                    setSelectedIds(new Set(displayedLeads.map(l => l.id)));
                  }
                }}
                className="w-3.5 h-3.5 accent-[var(--c-primary)] cursor-pointer"
              />
              <p className="text-xs text-[var(--c-text-3)] uppercase tracking-wide font-medium">Pipeline</p>
              {filterBatchId && (
                <button
                  onClick={() => setFilterBatchId(null)}
                  className="text-[10px] text-[var(--c-text-3)] hover:text-[var(--c-text-1)] border border-[var(--c-border)] px-1.5 py-0.5 flex items-center gap-1"
                >
                  <X size={8} /> Filter
                </button>
              )}
            </div>
            <span className="text-xs text-[var(--c-text-3)]">
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 size={10} className="animate-spin" />
                  Searching...
                </span>
              ) : `${displayedLeads.length} ${modeLabel}`}
            </span>
          </div>

          {/* Loading progress bar */}
          {loading && (
            <div className="h-0.5 w-full bg-[var(--c-border)] shrink-0 overflow-hidden">
              <div className="h-full bg-[var(--c-primary)] animate-pulse" style={{ width: '60%', animation: 'pulse 1.5s ease-in-out infinite, slideRight 2s ease-in-out infinite' }} />
            </div>
          )}

          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <div className="px-5 py-2 border-b border-[var(--c-border)] bg-[var(--c-surface)] flex items-center gap-3 shrink-0">
              <span className="text-xs text-[var(--c-text-1)] font-medium">{selectedIds.size} selected</span>
              <button
                onClick={() => {
                  const selected = leads.filter(l => selectedIds.has(l.id));
                  exportLeadsCSV(selected);
                }}
                className="text-xs text-[var(--c-text-2)] hover:text-[var(--c-text-1)] border border-[var(--c-border)] px-2 py-1 flex items-center gap-1 hover:bg-[var(--c-surface-raised)] transition-colors"
              >
                <Download size={10} /> Export CSV
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-xs text-[var(--c-text-3)] hover:text-[var(--c-text-1)] px-2 py-1 transition-colors"
              >
                Clear
              </button>
            </div>
          )}

          {/* Search complete summary */}
          <AnimatePresence>
            {searchSummary && !loading && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-b border-[var(--c-border)] bg-[var(--c-surface-raised)] px-5 py-3 shrink-0"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={14} className="text-[var(--c-text-1)]" />
                    <div>
                      <p className="text-xs text-[var(--c-text-1)] font-medium">
                        Search complete &mdash; {searchSummary.found} {modeLabel} found
                      </p>
                      <p className="text-[10px] text-[var(--c-text-3)] mt-0.5">
                        {searchSummary.total} {searchSummary.total === 1 ? 'combo' : 'combos'} searched in {searchSummary.duration} &middot; Saved as "{searchSummary.batchName}"
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSearchSummary(null)}
                    className="p-1 text-[var(--c-text-3)] hover:text-[var(--c-text-1)] transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!displayedLeads.length && !loading && (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <Search size={20} className="text-[var(--c-text-4)] mb-3" />
              <p className="text-sm text-[var(--c-text-3)]">No leads yet. Configure search and click Search.</p>
            </div>
          )}

          <div>
            <AnimatePresence>
              {newLeads.length > 0 && (
                <div>
                  <div className="px-5 py-2 bg-[var(--c-surface)] border-b border-[var(--c-border)]">
                    <span className="text-[10px] text-[var(--c-text-3)] uppercase tracking-wider font-medium">New &middot; {newLeads.length}</span>
                  </div>
                  {newLeads.map((lead, idx) => (
                    <LeadRow key={`n-${lead.id}`} lead={lead} idx={idx} isActive={selectedLead?.id === lead.id} isChecked={selectedIds.has(lead.id)} onSelect={selectLead} onToggleCheck={toggleSelect} />
                  ))}
                </div>
              )}

              {olderLeads.length > 0 && (
                <div>
                  <div className="px-5 py-2 bg-[var(--c-surface)] border-b border-[var(--c-border)] border-t border-t-[var(--c-border)]">
                    <span className="text-[10px] text-[var(--c-text-3)] uppercase tracking-wider font-medium">Previous &middot; {olderLeads.length}</span>
                  </div>
                  {olderLeads.slice().reverse().map((lead, idx) => (
                    <LeadRow key={`o-${lead.id}`} lead={lead} idx={idx} isActive={selectedLead?.id === lead.id} isChecked={selectedIds.has(lead.id)} onSelect={selectLead} onToggleCheck={toggleSelect} />
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Right: Draft */}
        <section className="col-span-4 border-l border-[var(--c-border)] flex flex-col bg-[var(--c-surface)] h-full min-h-0 hidden lg:flex">
          <div className="px-5 py-3 border-b border-[var(--c-border)] shrink-0 bg-[var(--c-surface-raised)] flex items-center justify-between">
            <p className="text-xs text-[var(--c-text-3)] uppercase tracking-wide font-medium">Draft Preview</p>
          </div>

          {selectedLead ? (
            <motion.div
              key={selectedLead.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--c-text-1)]">{selectedLead.name}</p>
                    <p className="text-xs text-[var(--c-text-3)] mt-0.5 truncate">
                      {selectedLead.contactPerson && <>{selectedLead.contactPerson} &middot; </>}
                      {selectedLead.industry} &middot; {selectedLead.location}
                    </p>
                  </div>
                  <button
                    onClick={openLeadModal}
                    className="shrink-0 px-2.5 py-1.5 text-xs text-[var(--c-text-1)] border border-[var(--c-border)] hover:bg-[var(--c-surface-raised)] bg-[var(--c-surface)] transition-colors flex items-center gap-1.5"
                    title="View full details"
                  >
                    <Maximize2 size={11} />
                    Details
                  </button>
                </div>

                {/* Contact */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--c-text-2)]">Email</span>
                    {selectedLead.email ? (
                      <span className="text-[var(--c-text-2)] flex items-center gap-1"><CheckCircle2 size={10} /> Found</span>
                    ) : (
                      <span className="text-[var(--c-text-3)]">Not found</span>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      type="email"
                      value={selectedLead.email || ''}
                      onChange={(e) => {
                        const updated = leads.map(l => l.id === selectedLead.id ? {...l, email: e.target.value} : l);
                        setLeads(updated);
                        setSelectedLead({...selectedLead, email: e.target.value});
                      }}
                      placeholder="Enter email"
                      className="flex-1 bg-[var(--c-surface-raised)] border border-[var(--c-border)] px-3 py-2 text-sm text-[var(--c-text-1)] outline-none focus:border-[var(--c-primary)] transition-colors placeholder:text-[var(--c-text-4)]"
                    />
                    <button
                      onClick={() => handleEnrich(selectedLead)}
                      disabled={enriching}
                      title="Deep search"
                      className="px-2.5 border border-[var(--c-border)] text-[var(--c-text-2)] hover:bg-[var(--c-surface-raised)] transition-colors disabled:opacity-30 bg-[var(--c-surface-raised)]"
                    >
                      {enriching ? <RefreshCw size={13} className="animate-spin" /> : <Search size={13} />}
                    </button>
                  </div>
                </div>

                {/* Links */}
                {(selectedLead.linkedinUrl || selectedLead.website) && (
                  <div className="flex flex-wrap gap-2">
                    {selectedLead.linkedinUrl && (
                      <a
                        href={selectedLead.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[var(--c-text-2)] border border-[var(--c-border)] hover:bg-[var(--c-surface-raised)] transition-colors"
                      >
                        <Linkedin size={12} />
                        LinkedIn
                      </a>
                    )}
                    {selectedLead.website && (
                      <a
                        href={selectedLead.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[var(--c-text-2)] border border-[var(--c-border)] hover:bg-[var(--c-surface-raised)] transition-colors"
                      >
                        <Globe size={12} />
                        Website
                      </a>
                    )}
                  </div>
                )}

                {/* Draft */}
                <div className="space-y-1.5">
                  <p className="text-xs text-[var(--c-text-2)]">Message</p>
                  <div className="text-sm text-[var(--c-text-1)] leading-relaxed whitespace-pre-wrap bg-[var(--c-surface-raised)] border border-[var(--c-border-subtle)] p-4 max-h-[280px] overflow-y-auto custom-scrollbar">
                    {selectedLead.personalizedDraft}
                  </div>
                </div>

                {(selectedLead.painPoints ?? []).length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-[var(--c-text-2)]">Pain points</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedLead.painPoints.map((p, i) => (
                        <span key={i} className="px-2 py-1 bg-[var(--c-surface-raised)] border border-[var(--c-border)] text-[11px] text-[var(--c-text-1)]">{p}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-[var(--c-border)] flex gap-2 shrink-0 bg-[var(--c-surface-raised)]">
                <button
                  onClick={() => {
                    if (selectedLead?.phoneNumber) {
                      window.open(`https://wa.me/${selectedLead.phoneNumber.replace(/\D/g, '')}?text=${encodeURIComponent(selectedLead.personalizedDraft)}`, '_blank');
                    } else {
                      navigator.clipboard.writeText(selectedLead?.personalizedDraft || '');
                      alert('No WhatsApp. Draft copied.');
                    }
                  }}
                  className="flex-1 py-2.5 border border-[var(--c-border)] text-xs text-[var(--c-text-1)] hover:bg-[var(--c-surface)] transition-colors flex items-center justify-center gap-1.5"
                >
                  <Send size={12} />
                  WhatsApp
                </button>
                <button
                  disabled={sendingEmail}
                  onClick={() => handleSendEmail(selectedLead)}
                  className="flex-1 py-2.5 bg-[var(--c-primary)] hover:bg-[var(--c-primary-hover)] text-[var(--c-primary-text)] text-xs font-medium transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {sendingEmail ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                  {sendingEmail ? 'Sending...' : 'Email'}
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <p className="text-sm text-[var(--c-text-4)]">Select {searchMode === 'individuals' ? 'a person' : 'a business'} to preview</p>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="h-8 border-t border-[var(--c-border)] px-5 flex items-center justify-between text-[10px] bg-[var(--c-surface-raised)] shrink-0 text-[var(--c-text-3)]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--c-text-1)]" />
            <span>Operational</span>
          </div>
        </div>
        <span>{BRANDING.footerText} &middot; {BRANDING.versionLabel}</span>
      </footer>
    </div>
  );
}
