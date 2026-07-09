'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import ViewerCanvas from '@/components/ViewerCanvas';
import InfoPanel from '@/components/InfoPanel';
import FooterActions from '@/components/FooterActions';
import { hpglApi, correctionApi, adminCadApi } from '@/lib/api';
import type { Session } from '@supabase/supabase-js';

interface HPGLPath {
  type: 'polyline' | 'arc' | 'circle' | 'rectangle' | 'label';
  points?: [number, number][];
  cx?: number; cy?: number; radius?: number;
  startAngle?: number; endAngle?: number;
  pen?: number;
  lineType?: number;
  penWidth?: number;
  closed?: boolean;
  text?: string;
  x?: number; y?: number;
}

interface HPGLData {
  paths: HPGLPath[];
  meta: {
    total_paths: number; polylines: number; arcs: number; circles: number;
    rectangles: number; labels: number;
    dimensions: { width: number; height: number };
    pens: number[];
  };
  upload?: { saved: boolean; id?: string; existing?: boolean; error?: string };
  cad?: { cad: string; confidence: string; score: number };
  ml?: { ml_cad: string; ml_confidence: number; ml_scores: Record<string, number>; final_cad?: string; final_confidence?: number; source?: string };
  features?: Record<string, unknown>;
}

const APP_VERSION = '1.0.0';

export default function HPGLViewerPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [hpglData, setHpglData] = useState<HPGLData | null>(null);
  const [parsing, setParsing] = useState(false);
  const [fileName, setFileName] = useState('');
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [zoom, setZoom] = useState(1);
  const [invertColors, setInvertColors] = useState(false);
  const [unit, setUnit] = useState<'cm' | 'inch'>('cm');
  const [snapGrid, setSnapGrid] = useState(true);
  const [viewMode, setViewMode] = useState<'outline' | 'tack' | 'measurement'>('outline');
  const [gridOn, setGridOn] = useState(true);
  const [fitKey, setFitKey] = useState(0);
  const [features, setFeatures] = useState<Record<string, unknown> | null>(null);
  const [uploadId, setUploadId] = useState('');
  const [msg, setMsg] = useState('');
  const [cadSystems, setCadSystems] = useState<Array<{ id: string; name: string; country?: string }>>([]);
  const [showCadModal, setShowCadModal] = useState(false);
  const [userSelectedCad, setUserSelectedCad] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/profile/cad-systems`)
      .then(r => r.json())
      .then(d => setCadSystems(d.cad_systems ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.push('/auth/signin?redirect=/tools/hpgl'); return; }
      setSession(data.session);
      setLoading(false);
    });
  }, [router]);

  const handleCorrectCad = useCallback(async (correctedCadId: string) => {
    if (!features) return;
    try {
      await correctionApi.submitCorrection(correctedCadId, features, uploadId, uploadId);
      setUserSelectedCad(correctedCadId);
      setShowCadModal(false);
    } catch { setMsg('Errore salvataggio correzione'); }
  }, [features, uploadId]);

  // Auto-show modal when ML is uncertain or no_model
  const ml = hpglData?.ml;
  useEffect(() => {
    if (hpglData && ml && !userSelectedCad && (ml.source === 'no_model' || (ml.ml_confidence ?? 0) < 0.5)) {
      setShowCadModal(true);
    }
  }, [hpglData, ml, userSelectedCad]);

  const handleFileUpload = useCallback(async (file: File) => {
    setFileName(file.name);
    setRawFile(file);
    setParsing(true);
    try {
      const result = await hpglApi.parse(file);
      setHpglData(result);
      setFeatures(result.features ?? null);
      setUploadId(result.upload?.id ?? '');
      setParsing(false);
    } catch {
      try {
        const text = await file.text();
      const cleaned = text.replace(/[^\n\r\t\x1b\x03\x00\x20-\x7e\xa0-\xff]/g, '');
      const paths: HPGLPath[] = [];
      let cx = 0, cy = 0, penDown = false, currentPen = 0, currentLineType = 0, currentPenWidth = 0.25, currentPoly: HPGLPath | null = null;
      const parseNums = (s: string) => s.trim().split(/[\s,;]+/).filter(Boolean).map(Number).filter(n => !isNaN(n));
      const flush = () => {
        if (currentPoly && currentPoly.points!.length >= 2) {
          const pts = currentPoly.points!;
          const first = pts[0], last = pts[pts.length - 1];
          currentPoly.closed = Math.abs(first[0] - last[0]) < 0.5 && Math.abs(first[1] - last[1]) < 0.5;
          paths.push(currentPoly);
        }
        currentPoly = null;
      };
      const lines = Array.from(cleaned.matchAll(/(IN|DF|IP|SC|RO|PU|PD|PA|PR|SP|LT|PW|VS|PG|AA|AT|RT|CI|EA|ER|RA|RR|WG|EW|LB|DT|DI|DR|SI|SR|SA|SS|SM|TL|LO|FT|PM|RP|OC)\s*((?:-?\d+(?:\.\d+)?(?:\s*,?\s*-?\d+(?:\.\d+)?)*)?)/gi));
      for (const m of lines) {
        const cmd = m[1].toUpperCase();
        const nums = parseNums(m[2] || '');
        if (cmd === 'IN') { flush(); cx = cy = 0; penDown = false; currentPen = 0; currentLineType = 0; currentPenWidth = 0.25; }
        else if (cmd === 'DF') { flush(); currentPen = 0; currentLineType = 0; currentPenWidth = 0.25; }
        else if (cmd === 'SP' && nums.length >= 1) { flush(); currentPen = Math.abs(nums[0]) % 12; }
        else if (cmd === 'LT' && nums.length >= 1) { currentLineType = Math.abs(nums[0]) % 7; }
        else if (cmd === 'PW' && nums.length >= 1) { currentPenWidth = Math.max(0.05, nums[0]); }
        else if (cmd === 'PU') {
          flush(); penDown = false;
          if (nums.length >= 2) { cx = nums[nums.length - 2]; cy = nums[nums.length - 1]; }
        }
        else if (cmd === 'PD') {
          if (nums.length >= 2) {
            if (!penDown) { penDown = true; currentPoly = { type: 'polyline', points: [[cx, cy]], pen: currentPen, lineType: currentLineType, penWidth: currentPenWidth, closed: false }; }
            for (let i = 0; i < nums.length; i += 2) {
              const x = nums[i], y = nums[i + 1];
              if (currentPoly) currentPoly.points!.push([x, y]);
              cx = x; cy = y;
            }
          } else { penDown = true; if (!currentPoly) currentPoly = { type: 'polyline', points: [[cx, cy]], pen: currentPen, lineType: currentLineType, penWidth: currentPenWidth, closed: false }; }
        }
        else if (cmd === 'PA' && nums.length >= 2) {
          if (penDown) {
            if (!currentPoly) currentPoly = { type: 'polyline', points: [[cx, cy]], pen: currentPen, lineType: currentLineType, penWidth: currentPenWidth, closed: false };
            for (let i = 0; i < nums.length; i += 2) { const x = nums[i], y = nums[i + 1]; currentPoly.points!.push([x, y]); cx = x; cy = y; }
          } else { cx = nums[nums.length - 2]; cy = nums[nums.length - 1]; }
        }
        else if (cmd === 'PR' && nums.length >= 2) {
          const dx = nums[nums.length - 2], dy = nums[nums.length - 1];
          if (penDown) {
            if (!currentPoly) currentPoly = { type: 'polyline', points: [[cx, cy]], pen: currentPen, lineType: currentLineType, penWidth: currentPenWidth, closed: false };
            currentPoly.points!.push([cx + dx, cy + dy]);
          }
          cx += dx; cy += dy;
        }
        else if (cmd === 'CI' && nums.length >= 1) { flush(); paths.push({ type: 'circle', cx, cy, radius: Math.abs(nums[0]), pen: currentPen, lineType: currentLineType, penWidth: currentPenWidth, closed: true }); }
        else if (cmd === 'AA' && nums.length >= 3) { flush(); paths.push({ type: 'arc', cx: nums[0], cy: nums[1], radius: Math.abs(nums[2]), startAngle: 0, endAngle: 360, pen: currentPen, lineType: currentLineType, penWidth: currentPenWidth }); }
        else if (cmd === 'EA' && nums.length >= 2) { flush(); paths.push({ type: 'rectangle', points: [[cx, cy], [nums[0], cy], [nums[0], nums[1]], [cx, nums[1]], [cx, cy]], pen: currentPen, lineType: currentLineType, penWidth: currentPenWidth, closed: true }); }
        else if (cmd === 'ER' && nums.length >= 2) { const ex = cx + nums[0], ey = cy + nums[1]; flush(); paths.push({ type: 'rectangle', points: [[cx, cy], [ex, cy], [ex, ey], [cx, ey], [cx, cy]], pen: currentPen, lineType: currentLineType, penWidth: currentPenWidth, closed: true }); }
        else if (cmd === 'RA' && nums.length >= 2) { flush(); paths.push({ type: 'rectangle', points: [[cx, cy], [nums[0], cy], [nums[0], nums[1]], [cx, nums[1]], [cx, cy]], pen: currentPen, lineType: currentLineType, penWidth: currentPenWidth, closed: true }); }
        else if (cmd === 'RR' && nums.length >= 2) { const rx = cx + nums[0], ry = cy + nums[1]; flush(); paths.push({ type: 'rectangle', points: [[cx, cy], [rx, cy], [rx, ry], [cx, ry], [cx, cy]], pen: currentPen, lineType: currentLineType, penWidth: currentPenWidth, closed: true }); }
        else if (cmd === 'PG') { flush(); }
        else if (cmd === 'LB') {
          flush();
          const fullMatch = m[0];
          const afterLB = cleaned.slice(m.index! + fullMatch.indexOf('LB') + 2);
          let labelText = '';
          for (const ch of afterLB) {
            if (ch === '\x1b' || ch === '\x03' || ch === '\x00' || ch === '\n') break;
            labelText += ch;
          }
          labelText = labelText.trim();
          if (labelText) paths.push({ type: 'label', x: cx, y: cy, text: labelText, pen: currentPen, lineType: currentLineType, penWidth: currentPenWidth });
        }
      }
      flush();
      const pens = paths.reduce<number[]>((acc, p) => { const pen = p.pen ?? 0; if (!acc.includes(pen)) acc.push(pen); return acc; }, []);

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const p of paths) {
        for (const pt of (p.type === 'polyline' || p.type === 'rectangle') ? (p.points ?? []) : []) {
          if (pt[0] < minX) minX = pt[0]; if (pt[1] < minY) minY = pt[1];
          if (pt[0] > maxX) maxX = pt[0]; if (pt[1] > maxY) maxY = pt[1];
        }
        if ((p.type === 'circle' || p.type === 'arc') && p.cx !== undefined && p.cy !== undefined && p.radius !== undefined) {
          const x1 = p.cx - p.radius, x2 = p.cx + p.radius;
          const y1 = p.cy - p.radius, y2 = p.cy + p.radius;
          if (x1 < minX) minX = x1; if (y1 < minY) minY = y1;
          if (x2 > maxX) maxX = x2; if (y2 > maxY) maxY = y2;
        }
      }
      const w = minX === Infinity ? 400 : maxX - minX || 400;
      const h = minY === Infinity ? 300 : maxY - minY || 300;
      setHpglData({ paths, meta: { total_paths: paths.length, polylines: paths.filter(p => p.type === 'polyline').length, arcs: paths.filter(p => p.type === 'arc').length, circles: paths.filter(p => p.type === 'circle').length, rectangles: paths.filter(p => p.type === 'rectangle').length, labels: paths.filter(p => p.type === 'label').length, dimensions: { width: w, height: h }, pens } });
      } catch { /* client-side parse also failed */ }
      setParsing(false);
    }
  }, []);

  const handleExportPng = useCallback(async () => {
    if (!rawFile) return;
    try { const blob = await hpglApi.exportPng(rawFile); downloadBlob(blob, fileName.replace(/\.[^.]+$/, '') + '.png'); }
    catch { alert('Export PNG disponibile solo via backend.'); }
  }, [rawFile, fileName]);

  const handleExportSvg = useCallback(async () => {
    if (!rawFile) return;
    try { const svg = await hpglApi.exportSvg(rawFile); downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), fileName.replace(/\.[^.]+$/, '') + '.svg'); }
    catch { alert('Export SVG disponibile solo via backend.'); }
  }, [rawFile, fileName]);

  const handleExportZip = useCallback(async () => {
    if (!rawFile) return;
    try { const blob = await hpglApi.exportZip(rawFile); downloadBlob(blob, fileName.replace(/\.[^.]+$/, '') + '.zip'); }
    catch { alert('Export ZIP disponibile solo via backend.'); }
  }, [rawFile, fileName]);

  const downloadBlob = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-6 h-6 border-2 border-drapera-gold border-t-transparent rounded-full animate-spin" /></div>;
  if (!session) return null;
  if (parsing) return <div className="min-h-screen flex items-center justify-center"><div className="flex flex-col items-center gap-3"><div className="w-8 h-8 border-2 border-drapera-gold border-t-transparent rounded-full animate-spin" /><span className="text-sm text-drapera-steel-light">Parsing file...</span></div></div>;

  return (
    <div className="min-h-screen bg-drapera-dark">
      <Header onExportPng={handleExportPng} onExportZip={handleExportZip} hasFile={!!hpglData} />
      <Sidebar
        onFileUpload={handleFileUpload}
        invertColors={invertColors} onToggleInvert={() => setInvertColors(v => !v)}
        zoom={zoom} onZoomChange={setZoom}
        unit={unit} onUnitChange={setUnit}
        snapGrid={snapGrid} onToggleSnap={() => setSnapGrid(v => !v)}
      />
      <main className="ml-[260px] mr-[260px] pt-14 p-3" style={{ minHeight: 'calc(100vh - 3.5rem)' }}>
        <ViewerCanvas data={hpglData ?? null} zoom={zoom} invertColors={invertColors} snapGrid={snapGrid && gridOn} viewMode={viewMode} fitKey={fitKey} />
      </main>
      {msg && <div className="fixed top-16 right-4 z-50 px-4 py-2 rounded-lg bg-drapera-gold/10 border border-drapera-gold/20 text-xs text-drapera-gold animate-fade-in">{msg}</div>}
      <InfoPanel meta={hpglData?.meta ?? null} fileName={fileName} viewMode={viewMode} onViewModeChange={setViewMode} cad={hpglData?.cad ?? null} ml={hpglData?.ml ?? null} features={hpglData?.features ?? undefined} onCorrectCad={handleCorrectCad} userSelectedCad={userSelectedCad} />

      {/* CAD Selection Modal */}
      {showCadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowCadModal(false)}>
          <div className="premium-card w-full max-w-lg mx-4 p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg text-white">Seleziona CAD</h3>
              <button onClick={() => setShowCadModal(false)} className="text-gray-500 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {ml && (
              <div className="mb-4 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                Modello non addestrato
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {cadSystems.map(cad => (
                <button
                  key={cad.id}
                  onClick={() => handleCorrectCad(cad.id)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-drapera-border hover:border-drapera-gold/40 hover:bg-drapera-gold/5 transition-all text-left"
                >
                  <div className="w-6 h-6 rounded-full bg-drapera-gold/10 flex items-center justify-center shrink-0">
                    <span className="text-[9px] font-bold text-drapera-gold">{cad.name[0]}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-white truncate">{cad.name}</p>
                    {cad.country && <p className="text-[9px] text-gray-500">{cad.country}</p>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <FooterActions
        onZoomIn={() => setZoom(z => Math.min(5, z + 0.15))}
        onZoomOut={() => setZoom(z => Math.max(0.1, z - 0.15))}
        onFitToScreen={() => { setZoom(1); setFitKey(k => k + 1); }}
        onToggleMeasure={() => setViewMode(v => v === 'measurement' ? 'outline' : 'measurement')}
        gridOn={gridOn} onToggleGrid={() => setGridOn(v => !v)}
        onExportPng={handleExportPng} onExportSvg={handleExportSvg} hasFile={!!hpglData}
      />
    </div>
  );
}
