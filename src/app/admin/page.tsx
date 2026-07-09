'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import { useTranslation } from '@/lib/i18n';
import { adminApi, adminCadApi, trainingApi, waitlistApi } from '@/lib/api';
import type { Session } from '@supabase/supabase-js';

interface Upload {
  id: string; user_id: string; filename: string; file_type: string;
  file_size: number; content_hash: string; created_at: string;
}

interface CadSystem {
  id: string; name: string; description?: string; color?: string; created_at?: string;
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

type AdminTab = 'uploads' | 'cad' | 'trainer' | 'waitlist' | 'profiles';

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
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('uploads');

  const [cadSystems, setCadSystems] = useState<CadSystem[]>([]);
  const [showCadForm, setShowCadForm] = useState(false);
  const [editingCadId, setEditingCadId] = useState<string | null>(null);
  const [cadForm, setCadForm] = useState({ id: '', name: '', description: '', color: '' });

  const [stats, setStats] = useState<{
    total_profiles: number; total_founders: number; waitlist_count: number;
    total_uploads: number; uploads_by_type: Record<string, number>;
    uploads_by_vendor: Record<string, number>;
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

  const [waitlist, setWaitlist] = useState<Array<{ id: string; email: string; name: string; position: number; created_at: string; approved: boolean }>>([]);
  const [regConfig, setRegConfig] = useState<{ max_users: number; current_users: number; registration_open: boolean } | null>(null);
  const [regMaxInput, setRegMaxInput] = useState('100');

  const [profiles, setProfiles] = useState<Array<Record<string, unknown>>>([]);
  const [profilesSearch, setProfilesSearch] = useState('');
  const [profilesOffset, setProfilesOffset] = useState(0);
  const [profilesTotal, setProfilesTotal] = useState(0);
  const [profilesLoading, setProfilesLoading] = useState(false);

  const loadWaitlist = async () => {
    try {
      const [w, r] = await Promise.all([waitlistApi.list(), waitlistApi.getRegState()]);
      setWaitlist(w.records ?? []);
      setRegConfig(r);
      setRegMaxInput(String(r.max_users ?? 100));
    } catch {}
  };

  const handleApproveWaitlist = async (email: string) => {
    try {
      await waitlistApi.approve(email);
      setMsg(`Approvato: ${email}`);
      await loadWaitlist();
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

  const handleTrainModel = async () => {
    setMlTraining(true); setMlResult(null);
    try {
      const r = await trainingApi.trainModel();
      setMlResult(r.result || r);
      setMsg('Modello addestrato con successo!');
    } catch (e: any) { setMlResult({ error: e.message }); setMsg(`Errore: ${e.message}`); }
    setMlTraining(false);
  };

  const loadTrainingCount = async () => {
    try {
      const data = await trainingApi.getTrainingData();
      setTrainingCount(data.total ?? 0);
    } catch {}
  };

  const load = async (ft: string, append = false) => {
    setUploadLoading(true);
    try {
      const u = ft ? await adminApi.listUploads(ft, 50, append ? uploadOffset : 0) : await adminApi.listUploads(undefined, 50, append ? uploadOffset : 0);
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

  const handleFilter = async (ft: string) => {
    setFilterType(ft);
    setUploadOffset(0);
    await load(ft, false);
  };

  const handleExportZip = async () => {
    setExporting(true);
    try {
      const blob = filterType ? await adminApi.exportZip(filterType) : await adminApi.exportZip();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `uploads-${filterType || 'all'}.zip`; a.click();
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
      setCadForm({ id: cad.id, name: cad.name, description: cad.description || '', color: cad.color || '' });
    } else {
      setEditingCadId(null);
      setCadForm({ id: '', name: '', description: '', color: '' });
    }
    setShowCadForm(true);
  };

  const handleCadSave = async () => {
    try {
      if (editingCadId) {
        await adminCadApi.update(editingCadId, { name: cadForm.name, description: cadForm.description, color: cadForm.color });
      } else {
        await adminCadApi.create({ id: cadForm.id, name: cadForm.name, description: cadForm.description, color: cadForm.color });
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
    } catch (e: any) { setMsg(`Errore: ${e.message}`); }
    setTraining(false);
  };

  const switchTab = async (tab: AdminTab) => {
    setActiveTab(tab);
    if (tab === 'cad' || tab === 'trainer') {
      await loadCadSystems();
    }
    if (tab === 'cad') {
      await loadTrainingCount();
    }
    if (tab === 'waitlist') {
      await loadWaitlist();
    }
    if (tab === 'profiles') {
      await loadProfiles();
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
    { key: 'trainer', label: t('admin.tab_trainer') },
    { key: 'waitlist', label: 'Waitlist' },
    { key: 'profiles', label: 'Utenti' },
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
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">Utenti</p>
            </div>
            <div className="premium-card p-3 text-center">
              <p className="text-xl font-bold text-drapera-gold">{stats.total_founders}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">Founder</p>
            </div>
            <div className="premium-card p-3 text-center">
              <p className="text-xl font-bold text-white">{stats.waitlist_count}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">Waitlist</p>
            </div>
            <div className="premium-card p-3 text-center">
              <p className="text-xl font-bold text-white">{stats.total_uploads}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">Upload</p>
              <div className="flex justify-center gap-1.5 mt-1">
                {Object.entries(stats.uploads_by_type).map(([k, v]) => (
                  <span key={k} className="text-[9px] px-1 py-0.5 rounded bg-white/5 text-gray-400">{k.toUpperCase()} {v}</span>
                ))}
              </div>
            </div>
            <div className="premium-card p-3 text-center">
              <p className="text-xl font-bold text-white">{stats.training_samples}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">Campioni ML</p>
            </div>
            <div className="premium-card p-3 text-center">
              <p className="text-xl font-bold text-white">{stats.registration.current_users} / {stats.registration.max_users}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">{stats.registration.registration_open ? 'Iscrizioni Aperte' : 'Iscrizioni Chiuse'}</p>
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
                      <th className="px-4 py-3 font-medium">{t('admin.user')}</th>
                      <th className="px-4 py-3 font-medium">{t('admin.date')}</th>
                      <th className="px-4 py-3 font-medium">{t('admin.size')}</th>
                      <th className="px-4 py-3 font-medium text-right">{t('admin.download')}</th>
                      <th className="px-4 py-3 font-medium text-right">{t('admin.delete')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploads.map(u => (
                      <tr key={u.id} className="border-b border-drapera-border/50 text-gray-300 hover:bg-white/5">
                        <td className="px-4 py-3 text-white font-mono text-xs max-w-[200px] truncate">{u.filename}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded border ${TYPE_COLORS[u.file_type] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
                            {u.file_type?.toUpperCase() || '?'}
                          </span>
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
                    ))}
                    {uploads.length === 0 && (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-600 text-xs">Nessun upload presente</td></tr>
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
                      <th className="px-4 py-3 font-medium">{t('admin.cad_description')}</th>
                      <th className="px-4 py-3 font-medium">{t('admin.cad_color')}</th>
                      <th className="px-4 py-3 font-medium text-right">{t('admin.cad_edit')}</th>
                      <th className="px-4 py-3 font-medium text-right">{t('admin.cad_delete')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cadSystems.map(cad => (
                      <tr key={cad.id} className="border-b border-drapera-border/50 text-gray-300 hover:bg-white/5">
                        <td className="px-4 py-3 text-white font-mono text-xs">{cad.id}</td>
                        <td className="px-4 py-3 text-sm text-white">{cad.name}</td>
                        <td className="px-4 py-3 text-xs text-gray-400 max-w-[200px] truncate">{cad.description || '-'}</td>
                        <td className="px-4 py-3">
                          {cad.color ? (
                            <span className="inline-block w-5 h-5 rounded border border-white/10" style={{ backgroundColor: cad.color }} />
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => openCadForm(cad)} className="text-drapera-gold hover:text-amber-400 text-xs">{t('admin.cad_edit')}</button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => handleCadDelete(cad.id)} className="text-red-400 hover:text-red-300 text-xs">{t('admin.cad_delete')}</button>
                        </td>
                      </tr>
                    ))}
                    {cadSystems.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-600 text-xs">Nessun CAD presente</td></tr>
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

        {activeTab === 'trainer' && (
          <div>
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
                      {cadSystems.map(cad => (
                        <option key={cad.id} value={cad.id}>{cad.name} ({cad.id})</option>
                      ))}
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
            <div className="premium-card mb-6">
              <h3 className="font-display font-bold text-base text-white mb-3">Configurazione Accesso</h3>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Max utenti:</span>
                  <input type="number" value={regMaxInput} onChange={e => setRegMaxInput(e.target.value)}
                    className="w-20 bg-drapera-dark border border-drapera-border rounded-lg px-2 py-1.5 text-sm text-white text-center" />
                  <button onClick={handleUpdateRegConfig} className="btn-ghost text-xs px-2 py-1">Aggiorna</button>
                </div>
                <button onClick={handleToggleRegistration}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors ${regConfig?.registration_open ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                  {regConfig?.registration_open ? 'Aperta' : 'Chiusa'}
                </button>
                <span className="text-xs text-gray-500">{regConfig?.current_users ?? 0} / {regConfig?.max_users ?? 100} utenti</span>
              </div>
            </div>

            <div className="premium-card overflow-hidden">
              <h3 className="font-display font-bold text-base text-white mb-3">Waitlist ({waitlist.length})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-drapera-border text-xs text-gray-500 uppercase tracking-wider">
                      <th className="px-4 py-3 font-medium">#</th>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Nome</th>
                      <th className="px-4 py-3 font-medium">Data</th>
                      <th className="px-4 py-3 font-medium">Stato</th>
                      <th className="px-4 py-3 font-medium text-right">Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {waitlist.map((w, i) => (
                      <tr key={w.id} className="border-b border-drapera-border/50 text-gray-300 hover:bg-white/5">
                        <td className="px-4 py-3 text-xs text-gray-500">{i + 1}</td>
                        <td className="px-4 py-3 text-xs text-white">{w.email}</td>
                        <td className="px-4 py-3 text-xs">{w.name || '-'}</td>
                        <td className="px-4 py-3 text-xs">{new Date(w.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${w.approved ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                            {w.approved ? 'Approvato' : 'In attesa'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!w.approved && (
                            <button onClick={() => handleApproveWaitlist(w.email)} className="text-drapera-gold hover:text-amber-400 text-xs">Approva</button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {waitlist.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-600 text-xs">Nessuno in waitlist</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
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
      </div>
    </div>
  );
}
