'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import { useTranslation } from '@/lib/i18n';
import { adminApi, adminCadApi, trainingApi, waitlistApi, detectionRulesApi } from '@/lib/api';
import type { Session } from '@supabase/supabase-js';

interface Upload {
  id: string; user_id: string; filename: string; file_type: string;
  file_size: number; content_hash: string; created_at: string;
  cad_id?: string;
}

interface CadSystem {
  id: string; name: string; description?: string; color?: string; created_at?: string;
  training_ready?: boolean; sample_threshold?: number; country?: string;
}

interface CadReadiness {
  id: string; name: string; samples: number; threshold: number;
  training_ready: boolean; can_train: boolean;
}

interface TrainResult {
  detected?: string; assigned?: string; stats?: Record<string, number>;
  total?: number; processed?: number; errors?: number; features_saved?: number;
  results?: Array<{ file: string; detected_cad: string; detected_confidence: string; match: boolean; file_type: string }>;
  error_details?: Array<{ file: string; error: string }>;
}
interface TrainingDetail {
  detected_cad?: string;
  detected_confidence?: string;
  provided_cad?: string;
  match?: boolean;
  file_type?: string;
  filename_analysis?: { filename_cad?: string; patterns_checked?: string[] };
  content_analysis?: { content_cad?: string; markers_checked?: string[] };
  hpgl_scores?: Record<string, number>;
  format_family?: { family?: string; variant?: string; details?: Record<string, unknown> };
}

const TYPE_COLORS: Record<string, string> = {
  hpgl: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  iso: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  dxf: 'bg-green-500/20 text-green-400 border-green-500/30',
};

type AdminTab = 'uploads' | 'cad' | 'rules' | 'trainer' | 'waitlist' | 'profiles' | 'founders' | 'analytics' | 'system';

export default function AdminPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [uploadTotal, setUploadTotal] = useState(0);
  const [uploadOffset, setUploadOffset] = useState(0);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [cleanInput, setCleanInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [authAlg, setAuthAlg] = useState('');
  const [filterType, setFilterType] = useState('');
  const [cadFilter, setCadFilter] = useState('');
  const [editingCadUpload, setEditingCadUpload] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('uploads');

  const [cadSystems, setCadSystems] = useState<CadSystem[]>([]);
  const [showCadForm, setShowCadForm] = useState(false);
  const [editingCadId, setEditingCadId] = useState<string | null>(null);
  const [cadForm, setCadForm] = useState({ id: '', name: '', description: '', color: '', country: '' });

  const [stats, setStats] = useState<{
    total_profiles: number; total_founders: number; waitlist_count: number;
    total_uploads: number; uploads_by_type: Record<string, number>;
    uploads_by_vendor: Record<string, number>;
    uploads_by_month: Record<string, number>;
    top_uploaders: Record<string, number>;
    training_samples: number;
    registration: { max_users: number; current_users: number; registration_open: boolean };
  } | null>(null);

  const [trainFiles, setTrainFiles] = useState<File[]>([]);
  const [trainCadId, setTrainCadId] = useState('');
  const [trainResults, setTrainResults] = useState<TrainResult | null>(null);
  const [trainDetail, setTrainDetail] = useState<TrainingDetail | null>(null);
  const [training, setTraining] = useState(false);

  const [mlTraining, setMlTraining] = useState(false);
  const [mlResult, setMlResult] = useState<{ accuracy?: number; samples?: number; test_samples?: number; classes?: string[]; error?: string } | null>(null);
  const [trainingCount, setTrainingCount] = useState(0);
  const [trainingStats, setTrainingStats] = useState<{ total_samples: number; unique_classes: number; by_class: Record<string, number>; cad_readiness?: CadReadiness[]; min_samples?: number } | null>(null);

  const [rulesList, setRulesList] = useState<Array<{ id: number; rule_type: string; cad_id: string; pattern: string; created_at?: string }>>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [newRuleCad, setNewRuleCad] = useState('');
  const [newRuleType, setNewRuleType] = useState<'filename' | 'content_marker'>('filename');
  const [newRulePattern, setNewRulePattern] = useState('');

  const [waitlist, setWaitlist] = useState<Array<Record<string, unknown>>>([]);
  const [waitlistTotal, setWaitlistTotal] = useState(0);
  const [waitlistOffset, setWaitlistOffset] = useState(0);
  const [waitlistSearch, setWaitlistSearch] = useState('');
  const [waitlistStats, setWaitlistStats] = useState<{ total: number; pending: number; approved: number; avg_wait_days: number } | null>(null);
  const [regConfig, setRegConfig] = useState<{ max_users: number; current_users: number; registration_open: boolean } | null>(null);
  const [regMaxInput, setRegMaxInput] = useState('100');

  const [profiles, setProfiles] = useState<Array<Record<string, unknown>>>([]);
  const [profilesSearch, setProfilesSearch] = useState('');
  const [profilesOffset, setProfilesOffset] = useState(0);
  const [profilesTotal, setProfilesTotal] = useState(0);
  const [profilesLoading, setProfilesLoading] = useState(false);

  const [founders, setFounders] = useState<Array<Record<string, unknown>>>([]);
  const [founderAddUserId, setFounderAddUserId] = useState('');
  const [systemHealth, setSystemHealth] = useState<{
    status: string; supabase_url: string; python_version: string;
    fastapi_version: string; admin_emails: number;
    ml_model: { loaded: boolean; exists: boolean };
    tables: Array<{ table: string; reachable: boolean; count: number; error?: string }>;
  } | null>(null);

  const loadWaitlist = async (append = false) => {
    try {
      const [w, r, s] = await Promise.all([
        waitlistApi.list(50, append ? waitlistOffset : 0, waitlistSearch),
        waitlistApi.getRegState(),
        waitlistApi.stats(),
      ]);
      if (append) {
        setWaitlist(prev => [...prev, ...(w.records ?? [])]);
      } else {
        setWaitlist(w.records ?? []);
      }
      setWaitlistTotal(w.total ?? 0);
      setWaitlistOffset(append ? waitlistOffset + 50 : 50);
      setRegConfig(r);
      setRegMaxInput(String(r.max_users ?? 100));
      setWaitlistStats(s);
    } catch {}
  };

  const handleApproveWaitlist = async (email: string) => {
    try {
      await waitlistApi.approve(email);
      setMsg(`Approvato: ${email}`);
      await loadWaitlist();
    } catch (e: any) { setMsg(`Errore: ${e.message}`); }
  };

  const handleApproveAndFounder = async (email: string) => {
    if (!window.confirm(`Approvare ${email} e aggiungere come founder?`)) return;
    try {
      const res = await waitlistApi.approveAndFounder(email);
      setMsg(email + ' approvato e aggiunto come founder!');
      await loadWaitlist();
      setStats(await adminApi.stats());
    } catch (e: any) { setMsg(`Errore: ${e.message}`); }
  };

  const handleUpdateRegConfig = async () => {
    try {
      await waitlistApi.updateRegState({ max_users: parseInt(regMaxInput) || 100 });
      setMsg('Config aggiornata');
      await loadWaitlist();
    } catch (e: any) { setMsg(`Errore: ${e.message}`); }
  };

  const handleToggleRegistration = async () => {
    try {
      await waitlistApi.updateRegState({ registration_open: !regConfig?.registration_open });
      setMsg(regConfig?.registration_open ? 'Registrazione chiusa' : 'Registrazione aperta');
      await loadWaitlist();
    } catch (e: any) { setMsg(`Errore: ${e.message}`); }
  };

  const loadProfiles = async (append = false) => {
    setProfilesLoading(true);
    try {
      const data = await adminApi.listProfiles(50, append ? profilesOffset : 0, profilesSearch);
      if (append) {
        setProfiles(prev => [...prev, ...data.profiles]);
      } else {
        setProfiles(data.profiles);
      }
      setProfilesTotal(data.total);
      setProfilesOffset(append ? profilesOffset + 50 : 50);
    } catch (e: any) { setMsg(`Errore: ${e.message}`); }
    setProfilesLoading(false);
  };

  const handlePromoteAdmin = async (profileId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      await adminApi.updateProfile(profileId, { role: newRole });
      setMsg(`Ruolo aggiornato a ${newRole}`);
      await loadProfiles();
    } catch (e: any) { setMsg(`Errore: ${e.message}`); }
  };

  const handleSetOffice = async (profileId: string, office: string) => {
    try {
      await adminApi.updateProfile(profileId, { office });
      setMsg(`Office aggiornato: ${office}`);
      await loadProfiles();
    } catch (e: any) { setMsg(`Errore: ${e.message}`); }
  };

  const loadFounders = async () => {
    try {
      const data = await adminApi.listFounders();
      setFounders(data.founders);
    } catch (e: any) { setMsg(`Errore: ${e.message}`); }
  };

  const handleAddFounder = async () => {
    if (!founderAddUserId.trim()) return;
    try {
      await adminApi.addFounder(founderAddUserId.trim());
      setFounderAddUserId('');
      setMsg('Founder aggiunto');
      await loadFounders();
      setStats(await adminApi.stats());
    } catch (e: any) { setMsg(`Errore: ${e.message}`); }
  };

  const handleRemoveFounder = async (userId: string) => {
    if (!window.confirm('Rimuovere questo founder?')) return;
    try {
      await adminApi.deleteFounder(userId);
      setMsg('Founder rimosso');
      await loadFounders();
      setStats(await adminApi.stats());
    } catch (e: any) { setMsg(`Errore: ${e.message}`); }
  };

  const loadSystemHealth = async () => {
    try {
      setSystemHealth(await adminApi.systemHealth());
    } catch (e: any) { setMsg(`Errore: ${e.message}`); }
  };

  const handleTrainModel = async () => {
    setMlTraining(true); setMlResult(null);
    try {
      const r = await trainingApi.trainModel();
      setMlResult(r.result || r);
      setMsg('Modello addestrato con successo!');
      await loadTrainingStats();
    } catch (e: any) { setMlResult({ error: e.message }); setMsg(`Errore: ${e.message}`); }
    setMlTraining(false);
  };

  const loadTrainingCount = async () => {
    try {
      const data = await trainingApi.getTrainingData();
      setTrainingCount(data.total ?? 0);
    } catch {}
  };

  const loadTrainingStats = async () => {
    try {
      const data = await trainingApi.getTrainingStats();
      setTrainingStats(data);
    } catch {}
  };

  const load = async (ft: string, append = false) => {
    setUploadLoading(true);
    try {
      const u = await adminApi.listUploads(ft || undefined, 50, append ? uploadOffset : 0, cadFilter || undefined);
      if (append) {
        setUploads(prev => [...prev, ...(u.uploads ?? [])]);
      } else {
        setUploads(u.uploads ?? []);
      }
      setUploadTotal(u.total ?? u.uploads?.length ?? 0);
      setUploadOffset(append ? uploadOffset + 50 : 50);
    } catch (e: any) { setMsg(`Errore: ${e.message}`); }
    setUploadLoading(false);
  };

  const loadRules = async () => {
    setRulesLoading(true);
    try {
      const data = await detectionRulesApi.list();
      setRulesList(data.rules ?? []);
    } catch {}
    setRulesLoading(false);
  };

  const handleAddRule = async () => {
    if (!newRuleCad || !newRulePattern) return;
    try {
      await detectionRulesApi.create({ rule_type: newRuleType, cad_id: newRuleCad, pattern: newRulePattern });
      setNewRuleCad('');
      setNewRulePattern('');
      await loadRules();
    } catch {}
  };

  const handleDeleteRule = async (ruleId: number) => {
    try {
      await detectionRulesApi.remove(ruleId);
      await loadRules();
    } catch {}
  };

  const handleReloadRules = async () => {
    try {
      const res = await detectionRulesApi.reload();
      setMsg(`${t('admin.rules_reloaded')} (${res.filename_rules} filename, ${res.content_marker_rules} content marker)`);
    } catch {}
  };

  const loadCadSystems = async () => {
    try {
      const data = await adminCadApi.list();
      setCadSystems(data.cad_systems ?? data ?? []);
    } catch (e: any) { setMsg(`Errore: ${e.message}`); }
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (!data.session) { router.push('/auth/signin?redirect=/admin'); return; }
      try {
        const a = await adminApi.check();
        if (a.alg) setAuthAlg(a.alg);
        if (a.error) setAuthError(`${a.error}: ${a.detail || ''}`);
        setIsAdmin(a.is_admin);
        if (a.is_admin) {
          await load('');
          await loadCadSystems();
          try { setStats(await adminApi.stats()); } catch {}
        }
      } catch { setIsAdmin(false); }
      setLoading(false);
    });
  }, [router]);

  const handleCadFilter = async (cid: string) => {
    setCadFilter(cid);
    setUploadOffset(0);
    await load(filterType, false);
  };

  const handleFilter = async (ft: string) => {
    setFilterType(ft);
    setUploadOffset(0);
    await load(ft, false);
  };

  const handleExportZip = async () => {
    setExporting(true);
    try {
      const blob = await adminApi.exportZip(filterType || undefined, cadFilter || undefined);
      const url = URL.createObjectURL(blob);
      const label = `${cadFilter || 'all'}-${filterType || 'all'}`;
      const a = document.createElement('a'); a.href = url; a.download = `uploads-${label}.zip`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch { setMsg(t('admin.error')); }
    setExporting(false);
  };

  const handleDownload = async (id: string) => {
    try {
      const blob = await adminApi.downloadUpload(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'download.hpgl'; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch { setMsg(t('admin.error')); }
  };

  const handleDelete = async (id: string) => {
    try {
      await adminApi.deleteUpload(id);
      setUploads(prev => prev.filter(u => u.id !== id));
      setMsg(t('admin.deleted'));
    } catch { setMsg(t('admin.error')); }
  };

  const handleClean = async () => {
    if (cleanInput !== 'DELETE_ALL') return;
    try {
      await adminApi.cleanAll(filterType || undefined);
      setUploads([]);
      setCleanInput('');
      setMsg(t('admin.cleaned'));
    } catch { setMsg(t('admin.error')); }
  };

  const openCadForm = (cad?: CadSystem) => {
    if (cad) {
      setEditingCadId(cad.id);
      setCadForm({ id: cad.id, name: cad.name, description: cad.description || '', color: cad.color || '', country: cad.country || '' });
    } else {
      setEditingCadId(null);
      setCadForm({ id: '', name: '', description: '', color: '', country: '' });
    }
    setShowCadForm(true);
  };

  const handleCadSave = async () => {
    try {
      if (editingCadId) {
        const updates: Record<string, unknown> = { name: cadForm.name, description: cadForm.description, color: cadForm.color };
        if (cadForm.country) updates.country = cadForm.country;
        await adminCadApi.update(editingCadId, updates);
      } else {
        await adminCadApi.create({ id: cadForm.id, name: cadForm.name, description: cadForm.description, color: cadForm.color, country: cadForm.country || undefined });
      }
      setShowCadForm(false);
      try {
        await loadCadSystems();
      } catch {}
      setMsg(editingCadId ? 'CAD aggiornato' : 'CAD creato');
    } catch (e: any) { setMsg(`Errore: ${e.message}`); }
  };

  const handleCadDelete = async (cadId: string) => {
    if (!window.confirm('Eliminare questo sistema CAD?')) return;
    try {
      await adminCadApi.delete(cadId);
      await loadCadSystems();
      setMsg('CAD eliminato');
    } catch (e: any) { setMsg(`Errore: ${e.message}`); }
  };

    const handleTrain = async () => {
    if (trainFiles.length === 0 || !trainCadId) return;
    setTraining(true);
    setTrainResults(null);
    setTrainDetail(null);
    try {
      const result = await adminCadApi.train(trainFiles, trainCadId);
      setTrainResults(result);
      setMsg(`Training: ${result.processed ?? 0} processati, ${result.errors ?? 0} errori, ${result.features_saved ?? 0} feature salvate`);
      await loadTrainingStats();
    } catch (e: any) { setMsg(`Errore: ${e.message}`); }
    setTraining(false);
  };

  const switchTab = async (tab: AdminTab) => {
    setActiveTab(tab);
    if (tab === 'uploads') {
      setUploadOffset(0);
      await load(filterType, false);
    }
    if (tab === 'cad' || tab === 'trainer' || tab === 'rules') {
      await loadCadSystems();
    }
    if (tab === 'cad') {
      await loadTrainingCount();
    }
    if (tab === 'trainer') {
      await loadTrainingStats();
    }
    if (tab === 'rules') {
      await loadRules();
    }
    if (tab === 'waitlist') {
      await loadWaitlist();
    }
    if (tab === 'profiles') {
      await loadProfiles();
    }
    if (tab === 'founders') {
      await loadFounders();
    }
    if (tab === 'system') {
      await loadSystemHealth();
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-6 h-6 border-2 border-drapera-gold border-t-transparent rounded-full animate-spin" /></div>;
  if (!session) return null;

  if (!isAdmin) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="max-w-3xl mx-auto px-4 py-10 pt-24 text-center">
          <h1 className="section-title text-white mb-4">{t('admin.title')}</h1>
          <p className="text-drapera-steel-light mb-3">{t('admin.no_access')}</p>
          {authError && (
            <div className="inline-block px-4 py-2 rounded-lg bg-red-900/20 border border-red-500/30 text-xs text-red-400 font-mono whitespace-pre text-left">
              {authError}{authAlg ? `\nalg: ${authAlg}` : ''}
          </div>
        )}


      </div>
    </div>
  );
}

  const filters = ['', 'hpgl', 'iso', 'dxf'];

  const tabs: { key: AdminTab; label: string }[] = [
    { key: 'uploads', label: t('admin.tab_uploads') },
    { key: 'cad', label: t('admin.tab_cad') },
    { key: 'rules', label: t('admin.tab_rules') },
    { key: 'trainer', label: t('admin.tab_trainer') },
    { key: 'waitlist', label: 'Waitlist' },
    { key: 'profiles', label: t('admin.tab_profiles') },
    { key: 'founders', label: t('admin.tab_founders') },
    { key: 'analytics', label: t('admin.tab_analytics') },
    { key: 'system', label: t('admin.tab_system') },
  ];

  return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pt-24">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="section-title text-white">{t('admin.title')}</h1>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link href="/dashboard" className="btn-ghost text-xs px-3 py-1.5">{t('nav.dashboard')}</Link>
          </div>
        </div>

        {msg && (
          <div className="mb-4 px-4 py-2 rounded-lg bg-drapera-gold/10 border border-drapera-gold/20 text-xs text-drapera-gold">
            {msg}
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
            <div className="premium-card p-3 text-center">
              <p className="text-xl font-bold text-drapera-gold">{stats.total_profiles}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">{t('admin.tab_profiles')}</p>
            </div>
            <div className="premium-card p-3 text-center">
              <p className="text-xl font-bold text-drapera-gold">{stats.total_founders}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">{t('admin.tab_founders')}</p>
            </div>
            <div className="premium-card p-3 text-center">
              <p className="text-xl font-bold text-white">{stats.waitlist_count}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">Waitlist</p> {/* keep as Waitlist */}
            </div>
            <div className="premium-card p-3 text-center">
              <p className="text-xl font-bold text-white">{stats.total_uploads}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">{t('admin.table_upload')}</p>
              <div className="flex justify-center gap-1.5 mt-1">
                {Object.entries(stats.uploads_by_type).map(([k, v]) => (
                  <span key={k} className="text-[9px] px-1 py-0.5 rounded bg-white/5 text-gray-400">{k.toUpperCase()} {v}</span>
                ))}
              </div>
            </div>
            <div className="premium-card p-3 text-center">
              <p className="text-xl font-bold text-white">{stats.training_samples}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">{t('admin.trainer.samples_count')}</p>
            </div>
            <div className="premium-card p-3 text-center">
              <p className="text-xl font-bold text-white">{stats.registration.current_users} / {stats.registration.max_users}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">{stats.registration.registration_open ? t('admin.waitlist.open') : t('admin.waitlist.closed')}</p>
            </div>
          </div>
        )}

        <div className="flex gap-1 mb-6 border-b border-drapera-border">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => switchTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.key
                  ? 'border-drapera-gold text-drapera-gold'
                  : 'border-transparent text-gray-500 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'uploads' && (
          <>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {filters.map(f => (
                <button key={f || 'all'} onClick={() => handleFilter(f)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    filterType === f
                      ? 'bg-drapera-gold/20 border-drapera-gold/40 text-drapera-gold'
                      : 'border-drapera-border text-gray-500 hover:text-white hover:border-drapera-gold/30'
                  }`}
                >
                  {f ? f.toUpperCase() : 'ALL'}
                </button>
              ))}
              <div className="flex-1" />
              <select
                className="bg-drapera-dark border border-drapera-border rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-drapera-gold/50"
                value={cadFilter}
                onChange={e => handleCadFilter(e.target.value)}
              >
                <option value="">Tutti i CAD</option>
                {cadSystems.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <button onClick={handleExportZip} disabled={exporting || uploads.length === 0}
                className="btn-gold text-xs px-3 py-1.5"
              >
                {exporting ? '...' : 'Download ZIP'}
              </button>
            </div>

            <div className="premium-card overflow-hidden mb-8">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-drapera-border text-xs text-gray-500 uppercase tracking-wider">
                      <th className="px-4 py-3 font-medium">{t('admin.filename')}</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">CAD</th>
                      <th className="px-4 py-3 font-medium">{t('admin.user')}</th>
                      <th className="px-4 py-3 font-medium">{t('admin.date')}</th>
                      <th className="px-4 py-3 font-medium">{t('admin.size')}</th>
                      <th className="px-4 py-3 font-medium text-right">{t('admin.download')}</th>
                      <th className="px-4 py-3 font-medium text-right">{t('admin.delete')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploads.map(u => {
                      const cadName = u.cad_id ? (cadSystems.find(s => s.id === u.cad_id)?.name || u.cad_id) : null;
                      return (
                      <tr key={u.id} className="border-b border-drapera-border/50 text-gray-300 hover:bg-white/5">
                        <td className="px-4 py-3 text-white font-mono text-xs max-w-[200px] truncate">{u.filename}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded border ${TYPE_COLORS[u.file_type] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
                            {u.file_type?.toUpperCase() || '?'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {editingCadUpload === u.id ? (
                            <select
                              className="bg-drapera-dark border border-drapera-border rounded px-1.5 py-1 text-[10px] text-white outline-none focus:border-drapera-gold/50 w-28"
                              value={u.cad_id || ''}
                              onChange={async e => {
                                const val = e.target.value;
                                setEditingCadUpload(null);
                                try {
                                  await adminCadApi.setUploadCad(u.id, val);
                                  await load(filterType, false);
                                } catch (e2: any) {
                                  setMsg(`Errore: ${e2.message}`);
                                }
                              }}
                              onBlur={() => setEditingCadUpload(null)}
                              autoFocus
                            >
                              <option value="">—</option>
                              {cadSystems.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                          ) : (
                            <button onClick={() => setEditingCadUpload(u.id)}
                              className={`text-[10px] font-medium px-2 py-0.5 rounded-full border transition-colors ${
                                cadName
                                  ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'
                                  : 'text-gray-600 border-gray-600/30 hover:text-gray-400 hover:border-gray-500/50'
                              }`}>
                              {cadName || '—'}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs">{u.user_id?.slice(0, 8)}...</td>
                        <td className="px-4 py-3 text-xs">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}</td>
                        <td className="px-4 py-3 text-xs">{u.file_size ? `${(u.file_size / 1024).toFixed(1)} KB` : '-'}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => handleDownload(u.id)} className="text-drapera-gold hover:text-amber-400 text-xs">{t('admin.download')}</button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => handleDelete(u.id)} className="text-red-400 hover:text-red-300 text-xs">{t('admin.delete')}</button>
                        </td>
                      </tr>
                    );})}
                    {uploads.length === 0 && (
                      <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-600 text-xs">Nessun upload presente</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {uploads.length > 0 && (
                <div className="px-4 py-3 border-t border-drapera-border/50 flex items-center justify-between">
                  <span className="text-xs text-gray-500">{uploads.length} uploads</span>
                  <button onClick={() => load(filterType, true)} disabled={uploadLoading}
                    className="text-xs text-drapera-gold hover:underline disabled:opacity-40">
                    {uploadLoading ? 'Caricamento...' : 'Carica altri'}
                  </button>
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="premium-card">
                <h3 className="font-display font-bold text-base text-white mb-3">{t('admin.clean_all')}</h3>
                <p className="text-xs text-gray-500 mb-2">
                  {filterType ? `Filtro attivo: ${filterType.toUpperCase()}` : 'Tutti i file'}
                </p>
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-drapera-dark border border-drapera-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-red-500/50 transition-colors"
                    value={cleanInput}
                    onChange={e => setCleanInput(e.target.value)}
                    placeholder={t('admin.clean_confirm')}
                  />
                  <button
                    onClick={handleClean}
                    disabled={cleanInput !== 'DELETE_ALL'}
                    className="px-4 py-2 bg-red-600/20 border border-red-600/40 text-red-400 text-xs font-medium rounded-lg hover:bg-red-600/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    {t('admin.clean_btn')}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'cad' && (
          <div>
            <div className="flex justify-end mb-4">
              <button onClick={() => openCadForm()} className="btn-gold text-xs px-3 py-1.5">
                + {t('admin.cad_add')}
              </button>
            </div>
            <div className="premium-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
<thead>
                      <tr className="border-b border-drapera-border text-xs text-gray-500 uppercase tracking-wider">
                        <th className="px-4 py-3 font-medium">{t('admin.cad_id')}</th>
                        <th className="px-4 py-3 font-medium">{t('admin.cad_name')}</th>
                        <th className="px-4 py-3 font-medium">Naz.</th>
                        <th className="px-4 py-3 font-medium">{t('admin.cad_samples')}</th>
                        <th className="px-4 py-3 font-medium">{t('admin.cad_threshold')}</th>
                        <th className="px-4 py-3 font-medium">{t('admin.cad_training_ready')}</th>
                        <th className="px-4 py-3 font-medium text-right">{t('admin.cad_edit')}</th>
                        <th className="px-4 py-3 font-medium text-right">{t('admin.cad_delete')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cadSystems.map(cad => {
                        const cr = trainingStats?.cad_readiness?.find(r => r.id === cad.id);
                        const samples = cr?.samples ?? 0;
                        const threshold = cad.sample_threshold ?? trainingStats?.min_samples ?? 20;
                        const canTrain = samples >= threshold;
                        return (
                        <tr key={cad.id} className={`border-b border-drapera-border/50 text-gray-300 hover:bg-white/5 ${cad.training_ready ? 'bg-green-500/5' : ''}`}>
                          <td className="px-4 py-3 text-white font-mono text-xs">{cad.id}</td>
                          <td className="px-4 py-3 text-sm text-white">{cad.name}</td>
                          <td className="px-4 py-3 text-xs">{cad.country ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400 font-mono">{cad.country}</span> : '-'}</td>
                          <td className="px-4 py-3 text-xs font-mono">{samples}</td>
                          <td className="px-4 py-3 text-xs font-mono text-gray-500">{threshold}</td>
                          <td className="px-4 py-3">
                            {cad.training_ready ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">{t('cad.trained')}</span>
                            ) : canTrain ? (
                              <button
                                onClick={async () => {
                                  try {
                                    await adminCadApi.update(cad.id, { training_ready: true });
                                    await loadCadSystems();
                                    await loadTrainingStats();
                                  } catch {}
                                }}
                                className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20 hover:bg-amber-500/25 cursor-pointer"
                              >
                                {t('admin.cad_enable')}
                              </button>
                            ) : (
                              <span className="text-[10px] text-gray-600">Mancano {threshold - samples} file</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => openCadForm(cad)} className="text-drapera-gold hover:text-amber-400 text-xs">{t('admin.cad_edit')}</button>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => handleCadDelete(cad.id)} className="text-red-400 hover:text-red-300 text-xs">{t('admin.cad_delete')}</button>
                          </td>
                        </tr>
                      );})}
                      {cadSystems.length === 0 && (
                        <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-600 text-xs">Nessun CAD presente</td></tr>
                      )}
                    </tbody>
                </table>
              </div>
            </div>

            {showCadForm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                <div className="premium-card w-full max-w-md mx-4 p-6">
                  <h3 className="font-display font-bold text-lg text-white mb-4">
                    {editingCadId ? t('admin.cad_edit') : t('admin.cad_add')}
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t('admin.cad_id')}</label>
                      <input
                        className="w-full bg-drapera-dark border border-drapera-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-drapera-gold/50 transition-colors"
                        value={cadForm.id}
                        onChange={e => setCadForm(f => ({ ...f, id: e.target.value }))}
                        disabled={!!editingCadId}
                        placeholder="es. lectra"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t('admin.cad_name')}</label>
                      <input
                        className="w-full bg-drapera-dark border border-drapera-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-drapera-gold/50 transition-colors"
                        value={cadForm.name}
                        onChange={e => setCadForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="es. Lectra"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t('admin.cad_description')}</label>
                      <input
                        className="w-full bg-drapera-dark border border-drapera-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-drapera-gold/50 transition-colors"
                        value={cadForm.description}
                        onChange={e => setCadForm(f => ({ ...f, description: e.target.value }))}
                        placeholder="es. Lectra Modaris"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t('cad.country')}</label>
                      <select
                        className="w-full bg-drapera-dark border border-drapera-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-drapera-gold/50 transition-colors appearance-none cursor-pointer"
                        value={cadForm.country}
                        onChange={e => setCadForm(f => ({ ...f, country: e.target.value }))}
                      >
                        <option value="">—</option>
                        <option value="BR">BR — Brasile</option>
                        <option value="CA">CA — Canada</option>
                        <option value="CN">CN — Cina</option>
                        <option value="KR">KR — Corea del Sud</option>
                        <option value="FR">FR — Francia</option>
                        <option value="DE">DE — Germania</option>
                        <option value="GB">GB — Gran Bretagna</option>
                        <option value="IL">IL — Israele</option>
                        <option value="IT">IT — Italia</option>
                        <option value="NL">NL — Paesi Bassi</option>
                        <option value="SG">SG — Singapore</option>
                        <option value="ES">ES — Spagna</option>
                        <option value="US">US — Stati Uniti</option>
                        <option value="IN">IN — India</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t('admin.cad_color')}</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          className="w-10 h-10 rounded border border-drapera-border bg-transparent cursor-pointer"
                          value={cadForm.color || '#000000'}
                          onChange={e => setCadForm(f => ({ ...f, color: e.target.value }))}
                        />
                        <input
                          className="flex-1 bg-drapera-dark border border-drapera-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-drapera-gold/50 transition-colors font-mono"
                          value={cadForm.color}
                          onChange={e => setCadForm(f => ({ ...f, color: e.target.value }))}
                          placeholder="#ffffff"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-6 justify-end">
                    <button onClick={() => setShowCadForm(false)} className="btn-ghost text-xs px-4 py-2">
                      {t('admin.cad_cancel')}
                    </button>
                    <button onClick={handleCadSave} className="btn-gold text-xs px-4 py-2" disabled={!cadForm.id || !cadForm.name}>
                      {t('admin.cad_save')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="premium-card mt-6">
              <h3 className="font-display font-bold text-base text-white mb-3">ML Model — Riconoscimento CAD</h3>
              <p className="text-xs text-gray-500 mb-4">
                Addestra un classificatore RandomForest sui {trainingCount} campioni raccolti dal trainer.
                Serve almeno 10 campioni e 2 classi CAD diverse.
              </p>
              <div className="flex items-center gap-3">
                <button onClick={handleTrainModel} disabled={mlTraining || trainingCount < 10}
                  className="btn-gold text-xs px-4 py-2 disabled:opacity-40">
                  {mlTraining ? 'Training...' : 'Addestra Modello'}
                </button>
                <span className="text-xs text-gray-500">{trainingCount} campioni</span>
              </div>
              {mlResult && (
                <div className="mt-4 p-3 rounded-lg bg-drapera-dark/50 border border-drapera-border">
                  {mlResult.error ? (
                    <p className="text-xs text-red-400">{mlResult.error}</p>
                  ) : (
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-green-400 font-bold">{(mlResult.accuracy! * 100).toFixed(1)}%</span>
                        <span className="text-gray-500">accuracy su {mlResult.test_samples ?? '?'} test</span>
                      </div>
                      <p className="text-gray-500">Classi: {mlResult.classes?.join(', ')}</p>
                      <p className="text-gray-500">{mlResult.samples} campioni totali</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'rules' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-display font-bold text-base text-white">{t('admin.rules_title')}</h2>
              <button onClick={handleReloadRules} className="btn-ghost text-xs px-3 py-1.5">
                {t('admin.rules_reload')}
              </button>
            </div>
            <div className="premium-card p-5 mb-6">
              <p className="text-xs text-gray-500 mb-4">{t('admin.rules_reload_confirm')}</p>
              <div className="grid grid-cols-[1fr_140px_1fr_auto] gap-2 items-end">
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">{t('admin.cad_name')}</label>
                  <select className="w-full bg-drapera-dark border border-drapera-border rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-drapera-gold/50"
                    value={newRuleCad} onChange={e => setNewRuleCad(e.target.value)}>
                    <option value="">{t('admin.cad_select')}...</option>
                    {cadSystems.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">{t('admin.rules_type')}</label>
                  <select className="w-full bg-drapera-dark border border-drapera-border rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-drapera-gold/50"
                    value={newRuleType} onChange={e => setNewRuleType(e.target.value as 'filename' | 'content_marker')}>
                    <option value="filename">{t('admin.rules_filename')}</option>
                    <option value="content_marker">{t('admin.rules_content_marker')}</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">{t('admin.rules_pattern')}</label>
                  <input className="w-full bg-drapera-dark border border-drapera-border rounded-lg px-2 py-1.5 text-xs text-white placeholder-gray-600 outline-none focus:border-drapera-gold/50 font-mono"
                    value={newRulePattern} onChange={e => setNewRulePattern(e.target.value)}
                    placeholder="es. \\blectra\\b" />
                </div>
                <button onClick={handleAddRule} disabled={!newRuleCad || !newRulePattern}
                  className="btn-gold text-xs px-3 py-1.5 disabled:opacity-40">
                  + {t('admin.rules_add')}
                </button>
              </div>
            </div>
            <div className="premium-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-drapera-border text-xs text-gray-500 uppercase tracking-wider">
                      <th className="px-4 py-3 font-medium">{t('admin.cad_name')}</th>
                      <th className="px-4 py-3 font-medium">{t('admin.rules_type')}</th>
                      <th className="px-4 py-3 font-medium">{t('admin.rules_pattern')}</th>
                      <th className="px-4 py-3 font-medium text-right">{t('admin.rules_delete')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rulesList.map(rule => {
                      const cadName = cadSystems.find(s => s.id === rule.cad_id)?.name || rule.cad_id;
                      return (
                        <tr key={rule.id} className="border-b border-drapera-border/50 text-gray-300 hover:bg-white/5">
                          <td className="px-4 py-3 text-xs">{cadName}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${rule.rule_type === 'filename' ? 'bg-blue-500/15 text-blue-400' : 'bg-purple-500/15 text-purple-400'}`}>
                              {rule.rule_type === 'filename' ? t('admin.rules_filename') : t('admin.rules_content_marker')}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-gray-400 max-w-[300px] truncate">{rule.pattern}</td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => handleDeleteRule(rule.id)} className="text-red-400 hover:text-red-300 text-xs">{t('admin.rules_delete')}</button>
                          </td>
                        </tr>
                      );
                    })}
                    {rulesList.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-600 text-xs">{t('admin.rules_no_rules')}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'trainer' && (
          <div>
            {trainingStats && (
              <div className="premium-card p-5 mb-6">
                <h3 className="font-display font-bold text-base text-white mb-4">Stato Training per CAD ({trainingStats.total_samples} campioni, soglia {trainingStats.min_samples ?? 20})</h3>
                {trainingStats.cad_readiness && trainingStats.cad_readiness.length > 0 ? (
                  trainingStats.cad_readiness.map(cr => {
                    const pct = Math.min(100, (cr.samples / cr.threshold) * 100);
                    return (
                      <div key={cr.id} className="flex items-center gap-3 mb-2">
                        <span className="text-[11px] text-gray-400 w-28 truncate">{cr.name}</span>
                        <div className="flex-1 h-5 rounded bg-drapera-dark/50 overflow-hidden relative">
                          <div className={`h-full rounded transition-all duration-500 ${
                            cr.can_train ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 'bg-gradient-to-r from-drapera-gold to-amber-500'
                          }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-white font-mono w-20 text-right">
                          {cr.samples}/{cr.threshold}
                          {cr.training_ready && <span className="text-green-400 ml-1">✓</span>}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  trainingStats.by_class && Object.keys(trainingStats.by_class).length > 0 ? (() => {
                    const entries = Object.entries(trainingStats.by_class);
                    const maxS = Math.max(...entries.map(([, v]) => v), 1);
                    return entries.map(([cls, count]) => (
                      <div key={cls} className="flex items-center gap-3 mb-2">
                        <span className="text-[11px] text-gray-400 w-28 truncate">{cls}</span>
                        <div className="flex-1 h-5 rounded bg-drapera-dark/50 overflow-hidden">
                          <div className="h-full rounded bg-gradient-to-r from-drapera-gold to-amber-500 transition-all duration-500"
                            style={{ width: `${(count / maxS) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-white font-mono w-10 text-right">{count}</span>
                      </div>
                    ));
                  })() : (
                    <p className="text-xs text-gray-600">Nessun campione</p>
                  )
                )}
              </div>
            )}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="premium-card">
                <h3 className="font-display font-bold text-base text-white mb-4">{t('admin.cad_train')}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-2">{t('admin.cad_upload_file')}</label>
                    <div className="border-2 border-dashed border-drapera-border rounded-lg p-6 text-center hover:border-drapera-gold/30 transition-colors cursor-pointer"
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => {
                        e.preventDefault();
                        const files = Array.from(e.dataTransfer.files);
                        if (files.length) setTrainFiles(prev => [...prev, ...files]);
                      }}
                    >
                      <input
                        type="file"
                        multiple
                        accept=".hpgl,.plt,.hpg,.iso,.dxf,.pin,.ass,.mod,.p99,.zl,.pd"
                        className="hidden"
                        id="train-file-input"
                        onChange={e => {
                          const files = e.target.files ? Array.from(e.target.files) : [];
                          setTrainFiles(prev => [...prev, ...files]);
                        }}
                      />
                      <label htmlFor="train-file-input" className="cursor-pointer">
                        {trainFiles.length > 0 ? (
                          <div className="text-left">
                            <p className="text-drapera-gold text-sm mb-1">{trainFiles.length} file selezionati</p>
                            <div className="max-h-24 overflow-y-auto space-y-0.5">
                              {trainFiles.map((f, i) => (
                                <p key={i} className="text-[10px] text-gray-500 truncate">{f.name}</p>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-gray-500 text-sm mb-1">{t('sidebar.upload_hint')}</p>
                            <p className="text-gray-600 text-[10px]">Seleziona o trascina più file HPGL / PLT / HPG / ISO / DXF</p>
                          </>
                        )}
                      </label>
                      {trainFiles.length > 0 && (
                        <button onClick={() => setTrainFiles([])} className="mt-2 text-[10px] text-red-400 hover:text-red-300 transition-colors">
                          Rimuovi tutti
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('admin.cad_select')}</label>
                    <select
                      className="w-full bg-drapera-dark border border-drapera-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-drapera-gold/50 transition-colors"
                      value={trainCadId}
                      onChange={e => setTrainCadId(e.target.value)}
                    >
                      <option value="">{t('admin.cad_select')}...</option>
                      {cadSystems.filter(c => c.training_ready).map(cad => (
                        <option key={cad.id} value={cad.id}>{cad.name} ({cad.id}) — {t('cad.trained')}</option>
                      ))}
                      {cadSystems.filter(c => !c.training_ready).length > 0 && (
                        <optgroup label={t('cad.in_training')}>
                          {cadSystems.filter(c => !c.training_ready).map(cad => (
                            <option key={cad.id} value={cad.id}>{cad.name} ({cad.id})</option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </div>
                  <button
                    onClick={handleTrain}
                    disabled={trainFiles.length === 0 || !trainCadId || training}
                    className="btn-gold text-xs px-4 py-2 w-full disabled:opacity-40"
                  >
                    {training ? `Processando ${trainFiles.length} file...` : `${t('admin.cad_train_btn')} (${trainFiles.length} file)`}
                  </button>
                </div>
              </div>

              <div className="premium-card">
                <h3 className="font-display font-bold text-base text-white mb-4">{t('admin.cad_results')}</h3>
                {trainResults ? (
                  <div className="space-y-4">
                    {trainResults.total !== undefined ? (
                      <>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-drapera-dark/50 rounded-lg p-3 text-center">
                            <p className="text-lg font-bold text-drapera-gold">{trainResults.processed}/{trainResults.total}</p>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Processati</p>
                          </div>
                          <div className="bg-drapera-dark/50 rounded-lg p-3 text-center">
                            <p className={`text-lg font-bold ${trainResults.errors ? 'text-red-400' : 'text-green-400'}`}>{trainResults.errors || 0}</p>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Errori</p>
                          </div>
                          <div className="bg-drapera-dark/50 rounded-lg p-3 text-center">
                            <p className="text-lg font-bold text-white">{trainResults.features_saved || 0}</p>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Features</p>
                          </div>
                        </div>

                        {trainResults.results && trainResults.results.length > 0 && (
                          <div className="max-h-48 overflow-y-auto space-y-1">
                            {trainResults.results.map((r, i) => (
                              <div key={i} className="flex items-center justify-between text-[11px] px-2 py-1 rounded hover:bg-white/5">
                                <span className="text-gray-400 truncate max-w-[180px]">{r.file}</span>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className={`font-mono ${r.match ? 'text-green-400' : 'text-yellow-400'}`}>{r.detected_cad}</span>
                                  <span className={`text-[9px] px-1 py-0.5 rounded ${
                                    r.detected_confidence === 'high' ? 'bg-green-500/10 text-green-400' : r.detected_confidence === 'medium' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-gray-500/10 text-gray-400'
                                  }`}>{r.detected_confidence}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {trainResults.error_details && trainResults.error_details.length > 0 && (
                          <div className="space-y-1 pt-2 border-t border-red-500/20">
                            <p className="text-[10px] text-red-400 uppercase tracking-wider">Errori</p>
                            {trainResults.error_details.map((e, i) => (
                              <p key={i} className="text-[11px] text-red-400/80">{e.file}: {e.error}</p>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-drapera-dark/50 rounded-lg p-3 text-center">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{t('admin.cad_detected')}</p>
                          <p className="text-lg font-bold text-drapera-gold">{trainResults.detected || '-'}</p>
                        </div>
                        <div className="bg-drapera-dark/50 rounded-lg p-3 text-center">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{t('admin.cad_assigned')}</p>
                          <p className="text-lg font-bold text-white">{trainResults.assigned || '-'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-600 text-xs">Carica file e seleziona un CAD per avviare il training batch.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'waitlist' && (
          <div>
            {waitlistStats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="premium-card p-3 text-center">
                  <p className="text-xl font-bold text-white">{waitlistStats.total}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">{t('admin.waitlist.stats_total')}</p>
              </div>
              <div className="premium-card p-3 text-center">
                <p className="text-xl font-bold text-yellow-400">{waitlistStats.pending}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">{t('admin.waitlist.stats_pending')}</p>
              </div>
              <div className="premium-card p-3 text-center">
                <p className="text-xl font-bold text-green-400">{waitlistStats.approved}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">{t('admin.waitlist.stats_approved')}</p>
              </div>
              <div className="premium-card p-3 text-center">
                <p className="text-xl font-bold text-drapera-gold">{waitlistStats.avg_wait_days}g</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">{t('admin.waitlist.stats_avg_wait')}</p>
                </div>
              </div>
            )}

            <div className="premium-card mb-6">
              <h3 className="font-display font-bold text-base text-white mb-3">{t('admin.waitlist.config_title')}</h3>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{t('admin.waitlist.max_users')}</span>
                  <input type="number" value={regMaxInput} onChange={e => setRegMaxInput(e.target.value)}
                    className="w-20 bg-drapera-dark border border-drapera-border rounded-lg px-2 py-1.5 text-sm text-white text-center" />
                  <button onClick={handleUpdateRegConfig} className="btn-ghost text-xs px-2 py-1">{t('admin.waitlist.update')}</button>
                </div>
                <button onClick={handleToggleRegistration}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors ${regConfig?.registration_open ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                  {regConfig?.registration_open ? t('admin.waitlist.open') : t('admin.waitlist.closed')}
                </button>
                <span className="text-xs text-gray-500">{regConfig?.current_users ?? 0} / {regConfig?.max_users ?? 100} {t('admin.waitlist.user_count')}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-4">
              <input
                className="flex-1 min-w-[200px] bg-drapera-dark border border-drapera-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-drapera-gold/50 transition-colors"
                value={waitlistSearch}
                onChange={e => { setWaitlistSearch(e.target.value); }}
                onKeyDown={e => { if (e.key === 'Enter') { setWaitlistOffset(0); loadWaitlist(); } }}
                placeholder={t('admin.search_placeholder_email_name')}
              />
              <button onClick={() => { setWaitlistOffset(0); loadWaitlist(); }} className="btn-gold text-xs px-3 py-2">
                {t('admin.search')}
              </button>
              <span className="text-xs text-gray-500">{waitlistTotal} {t('admin.waitlist.requests')}</span>
            </div>

            <div className="premium-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-drapera-border text-xs text-gray-500 uppercase tracking-wider">
                      <th className="px-4 py-3 font-medium">{t('admin.table_hash')}</th>
                      <th className="px-4 py-3 font-medium">{t('admin.table_email')}</th>
                      <th className="px-4 py-3 font-medium">{t('admin.table_name')}</th>
                      <th className="px-4 py-3 font-medium">{t('admin.table_date')}</th>
                      <th className="px-4 py-3 font-medium">{t('admin.table_status')}</th>
                      <th className="px-4 py-3 font-medium text-right">{t('admin.table_actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {waitlist.map((w, i) => {
                      const wId = String(w.id || '');
                      const wEmail = String(w.email || '');
                      const wApproved = !!w.approved;
                      return (
                        <tr key={wId} className="border-b border-drapera-border/50 text-gray-300 hover:bg-white/5">
                          <td className="px-4 py-3 text-xs text-gray-500">{i + 1}</td>
                          <td className="px-4 py-3 text-xs text-white font-mono">{wEmail}</td>
                          <td className="px-4 py-3 text-xs">{String(w.name || '-')}</td>
                          <td className="px-4 py-3 text-xs">{w.created_at ? new Date(String(w.created_at)).toLocaleDateString() : '-'}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${wApproved ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                              {wApproved ? t('admin.waitlist.stats_approved') : t('admin.waitlist.stats_pending')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {!wApproved && (
                                <>
                                  <button onClick={() => handleApproveWaitlist(wEmail)} className="text-drapera-gold hover:text-amber-400 text-[10px] px-1.5 py-1 rounded hover:bg-drapera-gold/10">{t('admin.waitlist.approve')}</button>
                                  <button onClick={() => handleApproveAndFounder(wEmail)} className="text-[10px] px-1.5 py-1 rounded text-amber-400 hover:bg-amber-500/10 border border-amber-500/20">{t('admin.waitlist.approve_founder')}</button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {waitlist.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-600 text-xs">{waitlistSearch ? t('admin.waitlist.no_results') : t('admin.waitlist.nobody')}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {waitlist.length > 0 && waitlist.length < waitlistTotal && (
                <div className="px-4 py-3 border-t border-drapera-border/50 flex items-center justify-between">
                  <span className="text-xs text-gray-500">{waitlist.length} / {waitlistTotal} {t('admin.waitlist.requests')}</span>
                  <button onClick={() => loadWaitlist(true)}
                    className="text-xs text-drapera-gold hover:underline">
                    {t('admin.load_more')}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'profiles' && (
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <input
                className="flex-1 min-w-[200px] bg-drapera-dark border border-drapera-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-drapera-gold/50 transition-colors"
                value={profilesSearch}
                onChange={e => { setProfilesSearch(e.target.value); }}
                onKeyDown={e => { if (e.key === 'Enter') { setProfilesOffset(0); loadProfiles(); } }}
                placeholder="Cerca per email..."
              />
              <button onClick={() => { setProfilesOffset(0); loadProfiles(); }} className="btn-gold text-xs px-3 py-2">
                Cerca
              </button>
              <span className="text-xs text-gray-500">{profilesTotal} utenti</span>
            </div>

            <div className="premium-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-drapera-border text-xs text-gray-500 uppercase tracking-wider">
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Nome</th>
                      <th className="px-4 py-3 font-medium">Ruolo</th>
                      <th className="px-4 py-3 font-medium">Office</th>
                      <th className="px-4 py-3 font-medium">Upload</th>
                      <th className="px-4 py-3 font-medium">Registrato</th>
                      <th className="px-4 py-3 font-medium text-right">Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.map(p => {
                      const role = String(p.role || 'user');
                      return (
                        <tr key={String(p.id)} className="border-b border-drapera-border/50 text-gray-300 hover:bg-white/5">
                          <td className="px-4 py-3 text-xs text-white font-mono max-w-[180px] truncate">{String(p.email || '')}</td>
                          <td className="px-4 py-3 text-xs">{String(p.full_name || '-')}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                              role === 'admin' ? 'bg-drapera-gold/10 text-drapera-gold' : 'bg-gray-500/10 text-gray-400'
                            }`}>
                              {role}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs">{String(p.office || '-')}</td>
                          <td className="px-4 py-3 text-xs">{String(p.upload_count || '0')}</td>
                          <td className="px-4 py-3 text-xs">{p.created_at ? new Date(String(p.created_at)).toLocaleDateString() : '-'}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handlePromoteAdmin(String(p.id), role)}
                                className={`text-[10px] px-2 py-1 rounded font-medium transition-colors ${
                                  role === 'admin'
                                    ? 'text-red-400 hover:bg-red-500/10'
                                    : 'text-drapera-gold hover:bg-drapera-gold/10'
                                }`}
                              >
                                {role === 'admin' ? 'Revoca' : 'Admin'}
                              </button>
                              <div className="relative group">
                                <button className="text-[10px] px-2 py-1 rounded text-gray-500 hover:text-white hover:bg-white/5 transition-colors">
                                  Office
                                </button>
                                <div className="absolute right-0 top-full mt-1 z-20 hidden group-hover:block min-w-[160px]">
                                  <div className="premium-card p-2 space-y-1">
                                    {['maddalena', 'caselle', 'verona', 'arezzo', 'bergamo', 'napoli'].map(o => (
                                      <button
                                        key={o}
                                        onClick={() => handleSetOffice(String(p.id), o)}
                                        className={`block w-full text-left text-[10px] px-2 py-1 rounded transition-colors ${
                                          String(p.office || '') === o ? 'text-drapera-gold bg-drapera-gold/10' : 'text-gray-400 hover:text-white hover:bg-white/5'
                                        }`}
                                      >
                                        {o}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {profiles.length === 0 && (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-600 text-xs">Nessun utente trovato</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {profiles.length > 0 && profiles.length < profilesTotal && (
                <div className="px-4 py-3 border-t border-drapera-border/50 flex items-center justify-between">
                  <span className="text-xs text-gray-500">{profiles.length} / {profilesTotal} utenti</span>
                  <button onClick={() => loadProfiles(true)} disabled={profilesLoading}
                    className="text-xs text-drapera-gold hover:underline disabled:opacity-40">
                    {profilesLoading ? 'Caricamento...' : 'Carica altri'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {stats && (
              <>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="premium-card p-5">
                    <h3 className="font-display font-bold text-base text-white mb-4">Upload per Tipo</h3>
                    {(["hpgl", "iso", "dxf"] as const).map(type => {
                      const max = Math.max(...Object.values(stats.uploads_by_type), 1);
                      const count = stats.uploads_by_type[type] || 0;
                      return (
                        <div key={type} className="flex items-center gap-3 mb-2">
                          <span className="text-[11px] font-medium text-gray-400 w-12 uppercase">{type}</span>
                          <div className="flex-1 h-5 rounded bg-drapera-dark/50 overflow-hidden">
                            <div className="h-full rounded transition-all duration-500"
                              style={{ width: `${(count / max) * 100}%`, backgroundColor: type === 'hpgl' ? '#f2c94c' : type === 'iso' ? '#3b82f6' : '#22c55e' }}
                            />
                          </div>
                          <span className="text-xs text-white font-mono w-10 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="premium-card p-5">
                    <h3 className="font-display font-bold text-base text-white mb-4">Upload per Vendor CAD</h3>
                    {Object.keys(stats.uploads_by_vendor).length > 0 ? (() => {
                      const entries = Object.entries(stats.uploads_by_vendor);
                      const maxV = Math.max(...entries.map(([, v]) => v), 1);
                      return entries.map(([vendor, count]) => (
                        <div key={vendor} className="flex items-center gap-3 mb-2">
                          <span className="text-[11px] text-gray-400 w-24 truncate">{vendor}</span>
                          <div className="flex-1 h-5 rounded bg-drapera-dark/50 overflow-hidden">
                            <div className="h-full rounded bg-drapera-gold transition-all duration-500"
                              style={{ width: `${(count / maxV) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-white font-mono w-10 text-right">{count}</span>
                        </div>
                      ));
                    })() : (
                      <p className="text-xs text-gray-600">Nessun dato vendor</p>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="premium-card p-5">
                    <h3 className="font-display font-bold text-base text-white mb-4">Trend Mensile</h3>
                    {Object.keys(stats.uploads_by_month).length > 0 ? (() => {
                      const entries = Object.entries(stats.uploads_by_month);
                      const maxM = Math.max(...entries.map(([, v]) => v), 1);
                      return (
                        <div className="flex items-end gap-1.5 h-28">
                          {entries.slice(-12).map(([month, count]) => (
                            <div key={month} className="flex-1 flex flex-col items-center gap-1">
                              <span className="text-[9px] text-gray-500">{count}</span>
                              <div className="w-full rounded-t bg-drapera-gold/70 transition-all duration-500"
                                style={{ height: `${(count / maxM) * 100}%`, minHeight: count > 0 ? '4px' : '0' }}
                              />
                              <span className="text-[7px] text-gray-600 -rotate-45 origin-left whitespace-nowrap">{month.slice(5)}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })() : (
                      <p className="text-xs text-gray-600">Nessun dato mensile</p>
                    )}
                  </div>

                  <div className="premium-card p-5">
                    <h3 className="font-display font-bold text-base text-white mb-4">Top Uploader</h3>
                    {Object.keys(stats.top_uploaders).length > 0 ? (() => {
                      const entries = Object.entries(stats.top_uploaders);
                      const maxT = Math.max(...entries.map(([, v]) => v), 1);
                      return entries.map(([email, count]) => (
                        <div key={email} className="flex items-center gap-3 mb-2">
                          <span className="text-[11px] text-gray-400 flex-1 truncate">{email}</span>
                          <div className="w-20 h-5 rounded bg-drapera-dark/50 overflow-hidden">
                            <div className="h-full rounded bg-amber-500 transition-all duration-500"
                              style={{ width: `${(count / maxT) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-white font-mono w-8 text-right">{count}</span>
                        </div>
                      ));
                    })() : (
                      <p className="text-xs text-gray-600">Nessun uploader</p>
                    )}
                  </div>
                </div>
              </>
            )}
            {!stats && <p className="text-xs text-gray-600">Caricamento statistiche...</p>}
          </div>
        )}

        {activeTab === 'founders' && (
          <div>
            <div className="premium-card mb-6">
              <h3 className="font-display font-bold text-base text-white mb-3">Aggiungi Founder</h3>
              <div className="flex gap-2">
                <input
                className="flex-1 bg-drapera-dark border border-drapera-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-drapera-gold/50 transition-colors font-mono"
                value={founderAddUserId}
                onChange={e => setFounderAddUserId(e.target.value)}
                placeholder="Incolla UUID utente..."
              />
              <button onClick={handleAddFounder} disabled={!founderAddUserId.trim()} className="btn-gold text-xs px-3 py-2 disabled:opacity-40">
                Aggiungi
              </button>
            </div>
          </div>

          <div className="premium-card overflow-hidden">
            <h3 className="font-display font-bold text-base text-white mb-3 px-4 pt-4">Fondatori ({founders.length})</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-drapera-border text-xs text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3 font-medium">#</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Nome</th>
                    <th className="px-4 py-3 font-medium">User ID</th>
                    <th className="px-4 py-3 font-medium">Data</th>
                    <th className="px-4 py-3 font-medium text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {founders.map(f => (
                    <tr key={String(f.user_id)} className="border-b border-drapera-border/50 text-gray-300 hover:bg-white/5">
                      <td className="px-4 py-3">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-drapera-gold to-amber-500 flex items-center justify-center text-[9px] font-bold text-drapera-dark">#{String(f.position)}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-white">{String(f.email || '-')}</td>
                      <td className="px-4 py-3 text-xs">{String(f.full_name || '-')}</td>
                      <td className="px-4 py-3 text-[10px] font-mono text-gray-500">{String(f.user_id || '').slice(0, 12)}...</td>
                      <td className="px-4 py-3 text-xs">{f.created_at ? new Date(String(f.created_at)).toLocaleDateString() : '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleRemoveFounder(String(f.user_id))} className="text-red-400 hover:text-red-300 text-xs">Rimuovi</button>
                      </td>
                    </tr>
                  ))}
                  {founders.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-600 text-xs">Nessun founder</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'system' && (
        <div className="space-y-6">
          {systemHealth ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="premium-card p-4 text-center">
                  <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${systemHealth.status === 'ok' ? 'bg-green-400' : 'bg-red-400'}`} />
                  <p className="text-xs text-white font-semibold">{systemHealth.status === 'ok' ? 'Salute OK' : 'Problemi'}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Stato sistema</p>
                </div>
                <div className="premium-card p-4 text-center">
                  <p className="text-sm font-bold text-white font-mono">{systemHealth.python_version}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Python</p>
                </div>
                <div className="premium-card p-4 text-center">
                  <p className="text-sm font-bold text-white font-mono">{systemHealth.fastapi_version}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">FastAPI</p>
                </div>
                <div className="premium-card p-4 text-center">
                  <p className="text-sm font-bold text-white font-mono">{systemHealth.admin_emails}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Admin</p>
                </div>
              </div>

              <div className="premium-card p-5">
                <h3 className="font-display font-bold text-base text-white mb-4">ML Model</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className={`rounded-lg p-3 text-center ${systemHealth.ml_model.exists ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                    <p className={`text-sm font-bold ${systemHealth.ml_model.exists ? 'text-green-400' : 'text-red-400'}`}>
                      {systemHealth.ml_model.exists ? 'Presente' : 'Assente'}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">File modello</p>
                  </div>
                  <div className={`rounded-lg p-3 text-center ${systemHealth.ml_model.loaded ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
                    <p className={`text-sm font-bold ${systemHealth.ml_model.loaded ? 'text-green-400' : 'text-yellow-400'}`}>
                      {systemHealth.ml_model.loaded ? 'Caricato' : 'Non caricato'}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Stato in memoria</p>
                  </div>
                </div>
              </div>

              <div className="premium-card p-5">
                <h3 className="font-display font-bold text-base text-white mb-4">Database — Tabelle</h3>
                <div className="space-y-2">
                  {systemHealth.tables.map(t => (
                    <div key={t.table} className="flex items-center justify-between px-3 py-2 rounded-lg bg-drapera-dark/30">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${t.reachable ? 'bg-green-400' : 'bg-red-400'}`} />
                        <span className="text-xs text-white font-mono">{t.table}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-gray-500">{t.count >= 0 ? `${t.count} records` : '?'}</span>
                        {t.error && <span className="text-[9px] text-red-400 max-w-[200px] truncate">{t.error}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="premium-card p-5">
                <h3 className="font-display font-bold text-base text-white mb-3">Supabase</h3>
                <p className="text-xs text-gray-400 font-mono">{systemHealth.supabase_url}</p>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-drapera-gold border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}
    </div>
  </div>
);
}
