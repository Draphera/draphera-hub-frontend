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

type AdminTab = 'uploads' | 'cad' | 'trainer' | 'waitlist';

export default function AdminPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [uploads, setUploads] = useState<Upload[]>([]);
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

  const [trainFile, setTrainFile] = useState<File | null>(null);
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

  const load = async (ft: string) => {
    try {
      const u = ft ? await adminApi.listUploads(ft) : await adminApi.listUploads();
      setUploads(u.uploads ?? []);
    } catch (e: any) { setMsg(`Errore: ${e.message}`); }
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
        }
      } catch { setIsAdmin(false); }
      setLoading(false);
    });
  }, [router]);

  const handleFilter = async (ft: string) => {
    setFilterType(ft);
    await load(ft);
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
    if (!trainFile || !trainCadId) return;
    setTraining(true);
    setTrainResults(null);
    setTrainDetail(null);
    try {
      const result = await adminCadApi.train(trainFile, trainCadId);
      setTrainResults({ detected: result.training?.detected_cad, assigned: result.training?.provided_cad });
      setTrainDetail(result.training);
      setMsg('Training completato');
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
  ];

  return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pt-24">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="section-title text-white">{t('admin.title')}</h1>
            <p className="text-drapera-steel-light mt-1">{t('admin.total')}: {uploads.length}</p>
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
                        const f = e.dataTransfer.files[0];
                        if (f) {
                          const ext = '.' + (f.name.split('.').pop()?.toLowerCase() || '');
                          if (['.hpgl', '.plt', '.hpg', '.iso', '.dxf'].includes(ext)) {
                            setTrainFile(f);
                          } else {
                            setMsg('Formato non supportato. Usa .hpgl .plt .hpg .iso .dxf');
                          }
                        }
                      }}
                    >
                      <input
                        type="file"
                        accept=".hpgl,.plt,.hpg,.iso,.dxf"
                        className="hidden"
                        id="train-file-input"
                        onChange={e => setTrainFile(e.target.files?.[0] || null)}
                      />
                      <label htmlFor="train-file-input" className="cursor-pointer">
                        {trainFile ? (
                          <p className="text-drapera-gold text-sm">{trainFile.name} ({(trainFile.size / 1024).toFixed(1)} KB)</p>
                        ) : (
                          <>
                            <p className="text-gray-500 text-sm mb-1">{t('sidebar.upload_hint')}</p>
                            <p className="text-gray-600 text-[10px]">HPGL / PLT / HPG / ISO / DXF</p>
                          </>
                        )}
                      </label>
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
                    disabled={!trainFile || !trainCadId || training}
                    className="btn-gold text-xs px-4 py-2 w-full disabled:opacity-40"
                  >
                    {training ? '...' : t('admin.cad_train_btn')}
                  </button>
                </div>
              </div>

              <div className="premium-card">
                <h3 className="font-display font-bold text-base text-white mb-4">{t('admin.cad_results')}</h3>
                {trainResults ? (
                  <div className="space-y-4">
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

                    {trainDetail && (
                      <div className="space-y-3 pt-2 border-t border-drapera-border/50">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-500">{t('admin.file_type')}:</span>
                            <span className="text-white ml-1 font-mono">{trainDetail.file_type?.toUpperCase() || '-'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Confidenza:</span>
                            <span className={`ml-1 font-mono ${trainDetail.detected_confidence === 'high' ? 'text-green-400' : trainDetail.detected_confidence === 'medium' ? 'text-yellow-400' : 'text-gray-500'}`}>
                              {trainDetail.detected_confidence || '-'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Match:</span>
                            <span className={`ml-1 font-mono ${trainDetail.match ? 'text-green-400' : 'text-red-400'}`}>
                              {trainDetail.match ? 'OK' : 'NO'}
                            </span>
                          </div>
                          {trainDetail.format_family && (
                            <div className="col-span-2">
                              <span className="text-gray-500">Famiglia formato:</span>
                              <span className="text-white ml-1 font-mono">
                                {trainDetail.format_family.family}
                                {trainDetail.format_family.variant !== 'standard' && (
                                  <span className="text-gray-500 ml-1">({trainDetail.format_family.variant})</span>
                                )}
                              </span>
                            </div>
                          )}
                        </div>

                        {trainDetail.filename_analysis?.filename_cad && (
                          <div>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{t('admin.filename_analysis')}</p>
                            <div className="text-xs">
                              <span className="text-gray-400">{t('admin.filename_cad')}:</span>
                              <span className="text-white ml-1">{trainDetail.filename_analysis.filename_cad}</span>
                            </div>
                          </div>
                        )}

                        {trainDetail.content_analysis?.content_cad && (
                          <div>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{t('admin.content_analysis')}</p>
                            <div className="text-xs">
                              <span className="text-gray-400">{t('admin.content_cad')}:</span>
                              <span className="text-white ml-1">{trainDetail.content_analysis.content_cad}</span>
                            </div>
                          </div>
                        )}

                        {trainDetail.hpgl_scores && Object.keys(trainDetail.hpgl_scores).length > 0 && (
                          <div>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{t('admin.hpgl_scores')}</p>
                            <div className="space-y-0.5">
                              {Object.entries(trainDetail.hpgl_scores).sort(([,a], [,b]) => (b as number) - (a as number)).map(([key, val]) => (
                                <div key={key} className="flex justify-between text-[11px]">
                                  <span className="text-gray-400">{key}</span>
                                  <span className="text-white font-mono">{val as number}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-600 text-xs">Carica un file e seleziona un CAD per avviare il training.</p>
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
      </div>
    </div>
  );
}
