'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import ViewerCanvas from '@/components/ViewerCanvas';
import InfoPanel from '@/components/InfoPanel';
import FooterActions from '@/components/FooterActions';
import { hpglApi, correctionApi, adminCadApi, adminApi } from '@/lib/api';
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
  rotation?: number;
  charWidth?: number;
  charHeight?: number;
  slant?: number;
}

interface HPGLData {
  paths: HPGLPath[];
  meta: {
    total_paths: number; polylines: number; arcs: number; circles: number;
    rectangles: number; labels: number; labelChars?: number;
    dimensions: { width: number; height: number };
    pens: number[];
  };
  upload?: { saved: boolean; id?: string; existing?: boolean; error?: string };
  cad?: { cad: string; confidence: string; score: number };
  ml?: { ml_cad: string; ml_confidence: number; ml_scores: Record<string, number>; final_cad?: string; final_confidence?: number; source?: string };
  features?: Record<string, unknown>;
  iw?: [number, number, number, number] | null;
  isLectra?: boolean;
  formatInfo?: {
    family: string;
    variant: string;
    astmStandard?: string | null;
    comments: string[];
    isLectra?: boolean;
  };
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
  const [features, setFeatures] = useState<Record<string, unknown> | null>(null);
  const [uploadId, setUploadId] = useState('');
  const [showCadModal, setShowCadModal] = useState(false);
  const [userSelectedCad, setUserSelectedCad] = useState<string | null>(null);
  // Multi-file tabs
  const [fileTabs, setFileTabs] = useState<Array<{ id: number; name: string; data: HPGLData; raw: File; feats?: Record<string, unknown>; upId?: string }>>([]);
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const [compareMode, setCompareMode] = useState<'single' | 'side' | 'cascade'>('single');
  const [secondTabId, setSecondTabId] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [invertColors, setInvertColors] = useState(false);
  const [unit, setUnit] = useState<'cm' | 'inch'>('cm');
  const [snapGrid, setSnapGrid] = useState(true);
  const [snapMeasure, setSnapMeasure] = useState(false);
  const [selectionActive, setSelectionActive] = useState(false);
  const [selectionBounds, setSelectionBounds] = useState<{ minX: number; minY: number; maxX: number; maxY: number } | null>(null);
  const [viewMode, setViewMode] = useState<'outline' | 'tack' | 'measurement' | 'selection'>('outline');
  const [gridOn, setGridOn] = useState(true);
  const [fitKey, setFitKey] = useState(0);
  const [penVisibility, setPenVisibility] = useState<Record<number, boolean>>({});
  const [penColors, setPenColors] = useState<Record<number, string>>({});
  const [flattened, setFlattened] = useState(false);
  const [selectedPath, setSelectedPath] = useState<{ path: HPGLPath; index: number; info: { type: string; vertices: number; pen: number; lineType: number; closed?: boolean; length?: number; firstPoint?: [number, number] } } | null>(null);
  const [measureMode, setMeasureMode] = useState<'off' | 'distance' | 'angle'>('off');
  const [measurePoints, setMeasurePoints] = useState<Array<{ x: number; y: number }>>([]);
  const [measureResults, setMeasureResults] = useState<Array<{ type: 'distance' | 'angle'; points: Array<{ x: number; y: number }>; value: number; label?: string }>>([]);
  const [showNotches, setShowNotches] = useState(false);
  const [filled, setFilled] = useState(false);
  const [showBounds, setShowBounds] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [flipX, setFlipX] = useState(true);
  const [flipY, setFlipY] = useState(false);
  type Piece = { id: number; minx: number; miny: number; maxx: number; maxy: number; area: number; perimeter: number; notch_count: number; has_grainline: boolean; contour_points: number[][]; seam_lines?: number[][][] };
  const [pieces, setPieces] = useState<Piece[]>();
  const [piecesLoading, setPiecesLoading] = useState(false);
  const [selectedPieceId, setSelectedPieceId] = useState<number>();
  const [pieceDetail, setPieceDetail] = useState<{ piece: Piece; rawText?: string }>();
  const [debug, setDebug] = useState(false);

  // Initialize pen visibility from data
  useEffect(() => {
    if (hpglData?.meta?.pens) {
      const vis: Record<number, boolean> = {};
      const colors: Record<number, string> = {};
      const DEFAULT_PALETTE = ['#F2C94C','#00E5FF','#FF4081','#00E676','#FF9100','#448AFF','#E040FB','#FF1744','#FFFFFF','#69F0AE','#FFD740','#40C4FF'];
      for (const p of hpglData.meta.pens) {
        vis[p] = true;
        colors[p] = DEFAULT_PALETTE[p % DEFAULT_PALETTE.length];
      }
      setPenVisibility(vis);
      setPenColors(colors);
    }
  }, [hpglData]);
  const [msg, setMsg] = useState('');
  const [cadSystems, setCadSystems] = useState<Array<{ id: string; name: string; country?: string }>>([]);

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
      adminApi.check().then(r => setIsAdmin(!!r.is_admin)).catch(() => {});
    });
  }, [router]);

  // Toggle debug overlay with Alt+D
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'd') { e.preventDefault(); setDebug(v => !v); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const switchTab = (tabId: number) => {
    const tab = fileTabs.find(t => t.id === tabId);
    if (!tab) return;
    setActiveTabId(tabId);
    setFileName(tab.name);
    setRawFile(tab.raw);
    setHpglData(tab.data);
    setFeatures(tab.feats ?? null);
    setUploadId(tab.upId ?? '');
    setSelectedPath(null);
    setMeasurePoints([]);
    setPenVisibility({});
  };

  const closeTab = (tabId: number) => {
    setFileTabs(prev => prev.filter(t => t.id !== tabId));
    if (activeTabId === tabId) {
      const remaining = fileTabs.filter(t => t.id !== tabId);
      if (remaining.length > 0) {
        switchTab(remaining[remaining.length - 1].id);
      } else {
        setActiveTabId(null);
        setHpglData(null);
        setFileName('');
        setRawFile(null);
        setFeatures(null);
        setUploadId('');
      }
    }
  };

  const handleCorrectCad = useCallback(async (correctedCadId: string) => {
    if (!features) return;
    try {
      await correctionApi.submitCorrection(correctedCadId, features, uploadId, uploadId);
      setUserSelectedCad(correctedCadId);
      setShowCadModal(false);
    } catch { setMsg('Errore salvataggio correzione'); }
  }, [features, uploadId]);

  // Auto-show modal when ML is uncertain or no_model; auto-assign Lectra if detected
  const ml = hpglData?.ml;
  useEffect(() => {
    if (!hpglData) return;

    const isLectra = hpglData.isLectra || hpglData.formatInfo?.isLectra ||
      fileName.toUpperCase().includes('LECTRA');

    if (isLectra) {
      if (!userSelectedCad && features) {
        handleCorrectCad('lectra');
      }
      return;
    }

    if (ml && !userSelectedCad && features && (ml.source === 'no_model' || (ml.ml_confidence ?? 0) < 0.5)) {
      setShowCadModal(true);
    }
  }, [hpglData, ml, userSelectedCad, features, handleCorrectCad, fileName]);

  const handleCanvasClick = useCallback((x: number, y: number) => {
    if (measureMode === 'off') return;

    const newPt = { x, y };
    const pts = [...measurePoints, newPt];

    if (measureMode === 'distance' && pts.length >= 2) {
      const dx = pts[1].x - pts[0].x;
      const dy = pts[1].y - pts[0].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      setMeasureResults(prev => [...prev, { type: 'distance', points: [pts[0], pts[1]], value: dist, label: '' }]);
      setMeasurePoints([]);
    } else if (measureMode === 'angle' && pts.length >= 3) {
      // Angle at pts[1] between pts[0] and pts[2]
      const v1x = pts[0].x - pts[1].x, v1y = pts[0].y - pts[1].y;
      const v2x = pts[2].x - pts[1].x, v2y = pts[2].y - pts[1].y;
      const dot = v1x * v2x + v1y * v2y;
      const n1 = Math.sqrt(v1x * v1x + v1y * v1y);
      const n2 = Math.sqrt(v2x * v2x + v2y * v2y);
      if (n1 > 0 && n2 > 0) {
        const angle = Math.acos(Math.max(-1, Math.min(1, dot / (n1 * n2)))) * 180 / Math.PI;
        setMeasureResults(prev => [...prev, { type: 'angle', points: [pts[0], pts[1], pts[2]], value: angle, label: '' }]);
      }
      setMeasurePoints([]);
    } else {
      setMeasurePoints(pts);
    }
  }, [measureMode, measurePoints]);

  const handleLabelChange = useCallback((index: number, label: string) => {
    setMeasureResults(prev => prev.map((r, i) => i === index ? { ...r, label } : r));
  }, []);

  const handleCopySvg = useCallback(async () => {
    if (!rawFile) return;
    try {
      const svg = await hpglApi.exportSvg(rawFile);
      await navigator.clipboard.writeText(svg);
      setMsg('SVG copiato negli appunti');
    } catch { setMsg('Errore copia SVG'); }
  }, [rawFile]);

  const handleExportCsv = useCallback(() => {
    if (!features) return;
    const headers = Object.keys(features);
    const row = headers.map(k => {
      const v = features[k];
      return typeof v === 'number' ? v.toFixed(4) : String(v ?? '');
    });
    const csv = headers.join(',') + '\n' + row.join(',');
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), fileName.replace(/\.[^.]+$/, '') + '_features.csv');
  }, [features, fileName]);

  const handleExportPdf = useCallback(() => {
    const base = fileName.replace(/\.[^.]+$/, '');
    const now = new Date().toLocaleDateString('it-IT');
    const misure = measureResults.map((r, i) =>
      `<tr><td>${r.label || (r.type === 'distance' ? 'Distanza' : 'Angolo') + ' #' + (i + 1)}</td><td>${r.type === 'distance' ? r.value.toFixed(1) : r.value.toFixed(1) + '°'}</td></tr>`
    ).join('');
    const cadName = hpglData?.cad?.cad ?? '-';
    const formatInfo = hpglData?.formatInfo;
    const formatName = formatInfo ? `${formatInfo.family} / ${formatInfo.variant}` : (hpglData?.meta?.labels ?? 0) > 0 ? 'HPGL/2' : 'HPGL/1';

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Scheda Tecnica - ${base}</title>
<style>
  body{font-family:Inter,sans-serif;padding:40px;color:#1a1a2e;font-size:12px}
  h1{font-size:20px;margin-bottom:4px;color:#1a1a2e}
  .sub{color:#666;font-size:11px;margin-bottom:24px}
  table{width:100%;border-collapse:collapse;margin-bottom:16px}
  th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #eee}
  th{font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#888}
  td{font-size:12px}
  .section{margin-bottom:24px}
  .section h2{font-size:13px;text-transform:uppercase;letter-spacing:0.12em;color:#555;margin-bottom:8px;padding-bottom:4px;border-bottom:2px solid #eee}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 16px}
  .grid .lbl{color:#888;font-size:10px}
  .grid .val{font-size:12px}
  @media print{body{padding:20px}}
</style></head><body>
<h1>Scheda Tecnica</h1>
<div class="sub">${base} &mdash; ${now}</div>
<div class="section"><h2>File</h2>
<div class="grid">
  <span class="lbl">Nome</span><span class="val">${fileName}</span>
  <span class="lbl">Formato</span><span class="val">${formatName}</span>
  <span class="lbl">CAD</span><span class="val">${cadName}</span>
</div></div>
${misure ? `<div class="section"><h2>Misure (${measureResults.length})</h2><table><thead><tr><th>Descrizione</th><th>Valore</th></tr></thead><tbody>${misure}</tbody></table></div>` : ''}
<div class="section"><h2>Contenuto</h2><div class="grid">
  <span class="lbl">Path</span><span class="val">${hpglData?.meta?.total_paths ?? '-'}</span>
  <span class="lbl">Dimensioni</span><span class="val">${hpglData?.meta?.dimensions ? `${hpglData.meta.dimensions.width.toFixed(1)} × ${hpglData.meta.dimensions.height.toFixed(1)}` : '-'}</span>
</div></div>
${measureResults.length > 0 ? '<p style="margin-top:32px;font-size:9px;color:#aaa">Generato da Draphera Hub</p>' : ''}
</body></html>`;

    const win = window.open('', '_blank');
    if (!win) { setMsg('Apri il popup per esportare il PDF'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setMsg('Scheda tecnica aperta — usa Ctrl+P per salvare PDF');
  }, [fileName, measureResults, hpglData]);

  const handleRotateLeft = useCallback(() => setRotation(r => ((r - 90 + 360) % 360) as 0 | 90 | 180 | 270), []);
  const handleRotateRight = useCallback(() => setRotation(r => ((r + 90) % 360) as 0 | 90 | 180 | 270), []);
  const handleFlipX = useCallback(() => setFlipX(v => !v), []);
  const handleFlipY = useCallback(() => setFlipY(v => !v), []);
  const handleResetTransform = useCallback(() => { setRotation(0); setFlipX(false); setFlipY(false); }, []);

  const handleDetectPieces = useCallback(async () => {
    if (!rawFile) return;
    setPiecesLoading(true);
    try {
      const result = await hpglApi.pieces(rawFile);
      setPieces(result.pieces ?? []);
      setSelectedPieceId(undefined);
      setMsg(result.pieces?.length > 0 ? `${result.pieces.length} pezzi rilevati` : 'Nessun pezzo trovato');
    } catch { setMsg('Errore rilevamento pezzi'); }
    setPiecesLoading(false);
  }, [rawFile]);

  const handleToggleSelection = useCallback(() => {
    setSelectionActive(v => {
      if (v) {
        setSelectionBounds(null);
        setViewMode('outline');
        return false;
      }
      setViewMode('selection');
      return true;
    });
  }, []);

  const handleExportSelection = useCallback(async () => {
    if (!rawFile || !selectionBounds) return;
    try {
      const svg = await hpglApi.exportSvg(rawFile);
      const { minX, minY, maxX, maxY } = selectionBounds;
      const w = maxX - minX;
      const h = maxY - minY;
      const modified = svg.replace(/viewBox="[^"]*"/, `viewBox="${minX} ${minY} ${w} ${h}"`);
      const blob = new Blob([modified], { type: 'image/svg+xml;charset=utf-8' });
      downloadBlob(blob, fileName.replace(/\.[^.]+$/, '') + '_selection.svg');
      setMsg('Sezione esportata come SVG');
    } catch { setMsg('Errore export sezione'); }
  }, [rawFile, selectionBounds, fileName]);

  const handleFileUpload = useCallback(async (file: File) => {
    setFileName(file.name);
    setRawFile(file);
    setParsing(true);
    try {
      const result = await hpglApi.parse(file);
      const tabId = Date.now();
      setFileTabs(prev => [...prev, { id: tabId, name: file.name, data: result, raw: file, feats: result.features ?? undefined, upId: result.upload?.id ?? '' }]);
      setActiveTabId(tabId);
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
      let labelRotation = 0, charWidth = 0.2, charHeight = 0.4, labelSlant = 0;
      let labelDirX = 1, labelDirY = 0;
      let p1x = 0, p1y = 0, p2x = 10000, p2y = 10000;
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
        if (cmd === 'IN') { flush(); cx = cy = 0; penDown = false; currentPen = 0; currentLineType = 0; currentPenWidth = 0.25; labelRotation = 0; labelDirX = 1; labelDirY = 0; charWidth = 0.2; charHeight = 0.4; labelSlant = 0; p1x = 0; p1y = 0; p2x = 10000; p2y = 10000; }
        else if (cmd === 'DF') { flush(); currentPen = 0; currentLineType = 0; currentPenWidth = 0.25; labelRotation = 0; labelDirX = 1; labelDirY = 0; charWidth = 0.2; charHeight = 0.4; labelSlant = 0; p1x = 0; p1y = 0; p2x = 10000; p2y = 10000; }
        else if (cmd === 'IP' && nums.length >= 4) { p1x = nums[0]; p1y = nums[1]; p2x = nums[2]; p2y = nums[3]; }
        else if (cmd === 'RO' && nums.length >= 1) { labelRotation = -nums[0] % 360; }
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
        else if (cmd === 'DI' && nums.length >= 2) { const n = Math.hypot(nums[0], nums[1]) || 1; labelDirX = nums[0]/n; labelDirY = nums[1]/n; labelRotation = -Math.atan2(labelDirY, labelDirX) * 180 / Math.PI; }
        else if (cmd === 'DR' && nums.length >= 2) { const n = Math.hypot(nums[0], nums[1]) || 1; labelDirX = nums[0]/n; labelDirY = nums[1]/n; const diag = Math.hypot(p2x-p1x, p2y-p1y) || 1; labelRotation = -Math.atan2(labelDirY*diag, labelDirX*diag) * 180 / Math.PI; }
        else if (cmd === 'SI' && nums.length >= 2) { charWidth = Math.abs(nums[0]); charHeight = Math.abs(nums[1]); }
        else if (cmd === 'SR' && nums.length >= 2) { const diag = Math.hypot(p2x-p1x, p2y-p1y) || 1; charWidth = Math.abs(nums[0]) * diag * 0.1; charHeight = Math.abs(nums[1]) * diag * 0.1; }
        else if (cmd === 'SL' && nums.length >= 1) { labelSlant = nums[0]; }
        else if (cmd === 'DT' && nums.length >= 1) { /* terminator handled inline in LB */ }
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
          if (labelText) {
            const lines = labelText.split('\n');
            const lh = charHeight * 1.4;
            const perpX = -labelDirY, perpY = labelDirX;
            for (let li = 0; li < lines.length; li++) {
              const line = lines[li].trim();
              if (!line) continue;
              paths.push({
                type: 'label', x: cx + li * lh * perpX, y: cy + li * lh * perpY, text: line,
                pen: currentPen, lineType: currentLineType, penWidth: currentPenWidth,
                rotation: labelRotation, charWidth: charWidth, charHeight: charHeight, slant: labelSlant,
              });
            }
            // Advance pen along label direction (charWidth cm → HPGL units: 1 cm = 400 units)
            cx += labelText.length * charWidth * labelDirX / 0.0025;
            cy += labelText.length * charWidth * labelDirY / 0.0025;
          }
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
      const labelCount = paths.filter(p => p.type === 'label').length;
      const labelChars = paths.filter(p => p.type === 'label').reduce((sum, p) => sum + ((p as any).text?.length ?? 0), 0);
      const coMatches = Array.from(cleaned.matchAll(/CO"([^"]*)"/g));
      const coComments = coMatches.map(m => m[1]);
      const hasLECTRA = coComments.some(c => c.toUpperCase().includes('LECTRA'));
      const hasASTM = coComments.some(c => c.toUpperCase().includes('ASTM'));
      const astmStd = coComments.map(c => c.match(/ASTM\s*([A-Z0-9\-]+)/i)).find(Boolean)?.[0]?.trim();
      let ff: string, fv: string;
      if (hasASTM) { ff = 'astm'; fv = 'hpgl_astm'; }
      else if (labelCount > 0) { ff = 'hpgl2'; fv = 'hpgl_2'; }
      else { ff = 'hpgl'; fv = 'hpgl_1'; }
      setHpglData({ paths, meta: { total_paths: paths.length, polylines: paths.filter(p => p.type === 'polyline').length, arcs: paths.filter(p => p.type === 'arc').length, circles: paths.filter(p => p.type === 'circle').length, rectangles: paths.filter(p => p.type === 'rectangle').length, labels: labelCount, labelChars, dimensions: { width: w, height: h }, pens }, isLectra: hasLECTRA, formatInfo: { family: ff, variant: fv, astmStandard: astmStd ?? null, comments: coComments, isLectra: hasLECTRA } });
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
        snapMeasure={snapMeasure} onToggleSnapMeasure={() => setSnapMeasure(v => !v)}
        viewMode={viewMode} onViewModeChange={v => { setViewMode(v); if (v === 'measurement') setMeasureMode('distance'); else if (v !== 'selection') setMeasureMode('off'); setMeasurePoints([]); if (v !== 'selection') setSelectionActive(false); }}
        pens={hpglData?.meta?.pens ?? []}
        penVisibility={penVisibility}
        onPenToggle={p => setPenVisibility(v => ({ ...v, [p]: !v[p] }))}
        penColors={penColors}
        onPenColorChange={(p, c) => setPenColors(v => ({ ...v, [p]: c }))}
        flattened={flattened}
        onToggleFlattened={() => setFlattened(v => !v)}
        showNotches={showNotches}
        onToggleNotches={() => setShowNotches(v => !v)}
        filled={filled}
        onToggleFilled={() => setFilled(v => !v)}
        showBounds={showBounds}
        onToggleBounds={() => setShowBounds(v => !v)}
        rotation={rotation} onRotateLeft={handleRotateLeft} onRotateRight={handleRotateRight}
        flipX={flipX} onFlipX={handleFlipX} flipY={flipY} onFlipY={handleFlipY} onResetTransform={handleResetTransform}
      />
      <main className="ml-[260px] mr-[260px] pt-14 p-3" style={{ minHeight: 'calc(100vh - 3.5rem)' }}>
        {/* File tabs */}
        {fileTabs.length > 0 && (
          <div className="flex items-center gap-1 mb-2 overflow-x-auto">
            {fileTabs.map(tab => (
              <div key={tab.id}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-t-lg text-[11px] font-medium cursor-pointer transition-colors whitespace-nowrap ${
                  activeTabId === tab.id ? 'bg-drapera-midnight text-white border-b border-drapera-gold' : 'text-gray-500 hover:text-white hover:bg-white/5'
                }`}
                onClick={() => switchTab(tab.id)}
              >
                <span className="truncate max-w-[120px]">{tab.name}</span>
                <button onClick={e => { e.stopPropagation(); closeTab(tab.id); }} className="text-gray-600 hover:text-red-400 ml-0.5">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
            {/* Compare mode toggle */}
            {fileTabs.length >= 2 && (
              <div className="flex items-center gap-1 ml-3 text-[10px]">
                <button onClick={() => setCompareMode('single')}
                  className={`px-2 py-1 rounded ${compareMode === 'single' ? 'bg-drapera-gold/10 text-drapera-gold' : 'text-gray-500 hover:text-white'}`}>Singolo</button>
                <button onClick={() => setCompareMode('side')}
                  className={`px-2 py-1 rounded ${compareMode === 'side' ? 'bg-drapera-gold/10 text-drapera-gold' : 'text-gray-500 hover:text-white'}`}>Affianca</button>
                <button onClick={() => setCompareMode('cascade')}
                  className={`px-2 py-1 rounded ${compareMode === 'cascade' ? 'bg-drapera-gold/10 text-drapera-gold' : 'text-gray-500 hover:text-white'}`}>Accoda</button>
                {compareMode !== 'single' && (
                  <select className="bg-drapera-dark border border-drapera-border rounded px-1.5 py-1 text-[10px] text-white ml-1"
                    value={secondTabId ?? ''}
                    onChange={e => setSecondTabId(Number(e.target.value) || null)}>
                    <option value="">Seleziona secondo file...</option>
                    {fileTabs.filter(t => t.id !== activeTabId).map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
        )}
        {compareMode === 'side' && secondTabId ? (
          <div className="flex gap-2" style={{ height: 'calc(100vh - 12rem)' }}>
            <div className="flex-1 min-w-0">
              <ViewerCanvas data={hpglData ?? null} zoom={zoom} invertColors={invertColors} snapGrid={snapGrid && gridOn} viewMode={viewMode} fitKey={fitKey} snapMeasure={snapMeasure}
                penVisibility={penVisibility} penColors={penColors} flattened={flattened}
                selectedPathIndex={selectedPath?.index ?? -1} rotation={rotation} flipX={flipX} flipY={flipY}
                onPathSelect={(path, idx) => {
                  if (!path) { setSelectedPath(null); return; }
                  const pts = (path.type === 'polyline' || path.type === 'rectangle') && path.points ? path.points : [];
                  let length = 0;
                  for (let i = 1; i < pts.length; i++) length += Math.sqrt((pts[i][0] - pts[i-1][0]) ** 2 + (pts[i][1] - pts[i-1][1]) ** 2);
                  setSelectedPath({ index: idx, path, info: { type: path.type, vertices: pts.length, pen: path.pen ?? 0, lineType: path.lineType ?? 0, closed: path.closed, length, firstPoint: pts.length > 0 ? [pts[0][0], pts[0][1]] : undefined } });
                }} />
            </div>
            <div className="flex-1 min-w-0">
              {(() => {
                const t = fileTabs.find(t => t.id === secondTabId);
                return t ? <ViewerCanvas data={t.data} zoom={zoom} invertColors={invertColors} snapGrid={snapGrid && gridOn} viewMode={viewMode} fitKey={fitKey} showBounds={showBounds} snapMeasure={snapMeasure} rotation={rotation} flipX={flipX} flipY={flipY} /> : null;
              })()}
            </div>
          </div>
        ) : compareMode === 'cascade' && secondTabId ? (
          <div style={{ height: 'calc(100vh - 12rem)' }}>
            {(() => {
              const t = fileTabs.find(t => t.id === secondTabId);
              if (!t || !hpglData) return null;
              // Merge paths, offset second file's Y by first file's height + margin
              const firstH = hpglData.meta.dimensions.height || 0;
              const margin = firstH * 0.1 || 100;
              const offsetY = firstH + margin;
              const mergedPaths = [
                ...hpglData.paths,
                ...t.data.paths.map(p => {
                  if ((p.type === 'polyline' || p.type === 'rectangle') && p.points) {
                    return { ...p, points: p.points.map(pt => [pt[0], pt[1] + offsetY] as [number, number]) };
                  }
                  if ((p.type === 'circle' || p.type === 'arc') && p.cx !== undefined && p.cy !== undefined) {
                    return { ...p, cy: p.cy + offsetY };
                  }
                  if (p.type === 'label' && p.y !== undefined) {
                    return { ...p, y: p.y + offsetY };
                  }
                  return p;
                }),
              ];
              const mergedData: HPGLData = {
                paths: mergedPaths,
                meta: {
                  ...hpglData.meta,
                  total_paths: mergedPaths.length,
                  dimensions: {
                    width: Math.max(hpglData.meta.dimensions.width, t.data.meta.dimensions.width),
                    height: offsetY + t.data.meta.dimensions.height,
                  },
                },
              };
              return <ViewerCanvas data={mergedData} zoom={zoom} invertColors={invertColors} snapGrid={snapGrid && gridOn} viewMode={viewMode} fitKey={fitKey} showBounds={showBounds} snapMeasure={snapMeasure} rotation={rotation} flipX={flipX} flipY={flipY}
                penVisibility={penVisibility} penColors={penColors} flattened={flattened}
                selectedPathIndex={selectedPath?.index ?? -1}
                onPathSelect={(path, idx) => {
                  if (!path) { setSelectedPath(null); return; }
                  const pts = (path.type === 'polyline' || path.type === 'rectangle') && path.points ? path.points : [];
                  let length = 0;
                  for (let i = 1; i < pts.length; i++) length += Math.sqrt((pts[i][0] - pts[i-1][0]) ** 2 + (pts[i][1] - pts[i-1][1]) ** 2);
                  setSelectedPath({ index: idx, path, info: { type: path.type, vertices: pts.length, pen: path.pen ?? 0, lineType: path.lineType ?? 0, closed: path.closed, length, firstPoint: pts.length > 0 ? [pts[0][0], pts[0][1]] : undefined } });
                }} />;
            })()}
          </div>
        ) : (
          <ViewerCanvas data={hpglData ?? null} zoom={zoom} invertColors={invertColors} snapGrid={snapGrid && gridOn} viewMode={viewMode} fitKey={fitKey} snapMeasure={snapMeasure}
            penVisibility={penVisibility} penColors={penColors} flattened={flattened}
            selectedPathIndex={selectedPath?.index ?? -1}
            measureMode={measureMode} measurePoints={measurePoints} measureResults={measureResults}
            onCanvasClick={handleCanvasClick} showNotches={showNotches} filled={filled} showBounds={showBounds}
            selectionActive={selectionActive} selectionBounds={selectionBounds}
            onSelectionChange={b => setSelectionBounds(b)}
            rotation={rotation} flipX={flipX} flipY={flipY}
            onRotateLeft={handleRotateLeft} onRotateRight={handleRotateRight}
            onFlipX={handleFlipX} onFlipY={handleFlipY} onResetTransform={handleResetTransform}
            pieces={pieces}
            selectedPieceId={selectedPieceId}
            onPieceSelect={id => setSelectedPieceId(id)}
            onPieceDoubleClick={p => {
              setPieceDetail({ piece: p });
              rawFile?.text().then(t => setPieceDetail(d => d ? { ...d, rawText: t } : undefined));
            }}
            debug={debug}
            onPathSelect={(path, idx) => {
              if (!path) { setSelectedPath(null); return; }
              const pts = (path.type === 'polyline' || path.type === 'rectangle') && path.points ? path.points : [];
              let length = 0;
              for (let i = 1; i < pts.length; i++) {
                length += Math.sqrt((pts[i][0] - pts[i-1][0]) ** 2 + (pts[i][1] - pts[i-1][1]) ** 2);
              }
              setSelectedPath({
                index: idx,
                path,
                info: {
                  type: path.type,
                  vertices: pts.length,
                  pen: path.pen ?? 0,
                  lineType: path.lineType ?? 0,
                  closed: path.closed,
                  length,
                  firstPoint: pts.length > 0 ? [pts[0][0], pts[0][1]] : undefined,
                },
              });
            }} />
        )}
      </main>
      {msg && <div className="fixed top-16 right-4 z-50 px-4 py-2 rounded-lg bg-drapera-gold/10 border border-drapera-gold/20 text-xs text-drapera-gold animate-fade-in">{msg}</div>}
      {/* Debug toggle */}
      {pieces && pieces.length > 0 && (
        <button onClick={() => setDebug(v => !v)}
          className={`fixed bottom-4 right-4 z-50 px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold tracking-wider uppercase transition-all ${
            debug ? 'bg-red-500/20 border border-red-400/40 text-red-400 shadow-lg shadow-red-500/10' : 'bg-white/5 border border-white/10 text-gray-500 hover:text-white hover:border-white/20'
          }`}>
          {debug ? '⚡ DEBUG ON' : 'DEBUG'}
        </button>
      )}
      {/* Debug mode indicator */}
      {debug && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-1.5 rounded-full bg-red-500/15 border border-red-400/25 text-[11px] text-red-400 font-mono font-bold tracking-wider animate-pulse">
          DEBUG MODE — Alt+D to toggle
        </div>
      )}
      <InfoPanel meta={hpglData?.meta ?? null} fileName={fileName} cad={hpglData?.cad ?? null} ml={hpglData?.ml ?? null} features={hpglData?.features ?? undefined} onCorrectCad={handleCorrectCad} userSelectedCad={userSelectedCad} selectedPath={selectedPath?.info ?? null}
        formatInfo={hpglData?.formatInfo ?? undefined}
        pens={hpglData?.meta?.pens ?? []}
        penVisibility={penVisibility} onPenToggle={p => setPenVisibility(v => ({ ...v, [p]: !v[p] }))}
        penColors={penColors} onPenColorChange={(p, c) => setPenColors(v => ({ ...v, [p]: c }))}
        flattened={flattened} onToggleFlattened={() => setFlattened(v => !v)}
        pieces={pieces} piecesLoading={piecesLoading} onDetectPieces={handleDetectPieces}
        selectedPiece={selectedPieceId !== undefined && pieces ? pieces.find(p => p.id === selectedPieceId) ?? undefined : undefined}
        isAdmin={isAdmin} />

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
        onToggleMeasure={() => {
          if (viewMode === 'measurement') {
            setViewMode('outline');
            setMeasureMode('off');
            setMeasurePoints([]);
          } else {
            setViewMode('measurement');
            setMeasureMode('distance');
          }
        }}
        measureMode={measureMode}
        onMeasureModeChange={m => {
          setMeasureMode(m);
          setMeasurePoints([]);
          setViewMode(m !== 'off' ? 'measurement' : viewMode === 'measurement' ? 'outline' : viewMode);
        }}
        gridOn={gridOn} onToggleGrid={() => setGridOn(v => !v)}
        onExportPng={handleExportPng} onExportSvg={handleExportSvg} onExportZip={handleExportZip}
        onCopySvg={handleCopySvg} onExportCsv={handleExportCsv}
        onExportPdf={handleExportPdf}
        onToggleSelection={handleToggleSelection}
        onExportSelection={handleExportSelection}
        hasFile={!!hpglData}
        selectionActive={selectionActive}
        selectionExists={!!selectionBounds}
        isAdmin={isAdmin}
      />

      {/* Measurement modal */}
      {/* Piece details modal */}
      {pieceDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setPieceDetail(undefined)}>
          <div className="premium-card w-full max-w-lg mx-4 p-5 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg text-white">Pezzo #{pieceDetail.piece.id}</h3>
              <button onClick={() => setPieceDetail(undefined)} className="text-gray-500 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Specs table */}
            <div className="space-y-1.5 text-sm mb-4">
              <div className="flex justify-between py-1 px-2 rounded bg-drapera-midnight/40">
                <span className="text-gray-400">Area</span>
                <span className="text-white font-mono">{pieceDetail.piece.area.toFixed(1)}</span>
              </div>
              <div className="flex justify-between py-1 px-2 rounded bg-drapera-midnight/40">
                <span className="text-gray-400">Perimetro</span>
                <span className="text-white font-mono">{pieceDetail.piece.perimeter.toFixed(1)}</span>
              </div>
              <div className="flex justify-between py-1 px-2 rounded bg-drapera-midnight/40">
                <span className="text-gray-400">Bounding Box</span>
                <span className="text-white font-mono text-xs">
                  {pieceDetail.piece.minx.toFixed(1)}×{pieceDetail.piece.miny.toFixed(1)} &ndash; {pieceDetail.piece.maxx.toFixed(1)}×{pieceDetail.piece.maxy.toFixed(1)}
                </span>
              </div>
              <div className="flex justify-between py-1 px-2 rounded bg-drapera-midnight/40">
                <span className="text-gray-400">Intacchi</span>
                <span className="text-white font-mono">{pieceDetail.piece.notch_count}</span>
              </div>
              <div className="flex justify-between py-1 px-2 rounded bg-drapera-midnight/40">
                <span className="text-gray-400">Fibra</span>
                <span className="text-white font-mono">{pieceDetail.piece.has_grainline ? '✓ Presente' : '✗ Assente'}</span>
              </div>
              <div className="flex justify-between py-1 px-2 rounded bg-drapera-midnight/40">
                <span className="text-gray-400">Cucitura</span>
                <span className="text-white font-mono">
                  {pieceDetail.piece.seam_lines && pieceDetail.piece.seam_lines.length > 0
                    ? `${pieceDetail.piece.seam_lines.length} linee`
                    : '✗ Assente'}
                </span>
              </div>
            </div>

            {/* SVG preview with seam lines */}
            <div className="mb-4 rounded-lg bg-drapera-midnight/60 border border-drapera-border/40 flex items-center justify-center" style={{ minHeight: 160 }}>
              <svg viewBox={`${pieceDetail.piece.minx - 10} ${pieceDetail.piece.miny - 10} ${pieceDetail.piece.maxx - pieceDetail.piece.minx + 20} ${pieceDetail.piece.maxy - pieceDetail.piece.miny + 20}`}
                className="w-full h-full max-h-48" style={{ filter: 'invert(1)' }}>
                <polygon points={pieceDetail.piece.contour_points.map(pt => `${pt[0]},${pt[1]}`).join(' ')}
                  fill="none" stroke="#333" strokeWidth={0.5} />
                {pieceDetail.piece.seam_lines?.map((sl, si) => (
                  <polyline key={`sl_${si}`} points={sl.map(pt => `${pt[0]},${pt[1]}`).join(' ')}
                    fill="none" stroke="#E53935" strokeWidth={0.3} strokeDasharray="1 1" />
                ))}
              </svg>
            </div>

            {/* HPGL source */}
            {pieceDetail.rawText && (
              <details className="group">
                <summary className="text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors select-none">
                  Sorgente HPGL
                </summary>
                <pre className="mt-2 p-3 rounded bg-black/40 text-[10px] text-gray-300 font-mono leading-relaxed max-h-48 overflow-auto whitespace-pre-wrap break-all">
                  {pieceDetail.rawText}
                </pre>
              </details>
            )}
          </div>
        </div>
      )}

      {measureMode !== 'off' && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 w-[360px] rounded-xl border border-drapera-border bg-drapera-midnight shadow-2xl shadow-black/40"
          style={{ backdropFilter: 'blur(12px)' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-drapera-border/60">
            <span className="text-[11px] font-semibold text-red-400 uppercase tracking-wider">Misure</span>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-gray-500">{measureResults.length} risultati</span>
              <button onClick={() => { setMeasureResults([]); setMeasurePoints([]); setMeasureMode('off'); setViewMode('outline'); }}
                className="text-gray-500 hover:text-white transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-drapera-border/40">
            <div className="flex gap-0.5">
              <button onClick={() => setMeasureMode('distance')}
                className={`px-3 py-1 rounded text-[10px] font-medium transition-colors ${measureMode === 'distance' ? 'bg-red-500/20 text-red-300' : 'text-gray-500 hover:text-white'}`}>Distanza</button>
              <button onClick={() => setMeasureMode('angle')}
                className={`px-3 py-1 rounded text-[10px] font-medium transition-colors ${measureMode === 'angle' ? 'bg-red-500/20 text-red-300' : 'text-gray-500 hover:text-white'}`}>Angolo</button>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <span className="text-[9px] text-gray-500">Snap</span>
              <button onClick={() => setSnapMeasure(v => !v)}
                className={`w-6 h-3 rounded-full transition-colors relative ${snapMeasure ? 'bg-drapera-gold' : 'bg-drapera-border'}`}>
                <span className={`absolute top-0.5 w-2 h-2 rounded-full bg-white transition-transform ${snapMeasure ? 'translate-x-[13px]' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>

          {/* Results list */}
          {measureResults.length > 0 && (
            <div className="px-4 py-2 max-h-48 overflow-y-auto space-y-1">
              {measureResults.map((r, i) => (
                <div key={i} className="flex items-center gap-2 py-1 px-2 rounded bg-white/5">
                  <input
                    value={r.label ?? ''}
                    onChange={e => handleLabelChange(i, e.target.value)}
                    placeholder={r.type === 'distance' ? 'Distanza #' + (i + 1) : 'Angolo #' + (i + 1)}
                    className="flex-1 bg-transparent text-[10px] text-gray-300 border-b border-drapera-border/40 focus:border-drapera-gold/50 outline-none placeholder:text-gray-600"
                  />
                  <span className="text-[11px] text-white font-mono font-medium shrink-0">
                    {r.type === 'distance' ? `${r.value.toFixed(1)}` : `${r.value.toFixed(1)}°`}
                  </span>
                </div>
              ))}
              {measureResults.length > 1 && (
                <button onClick={() => setMeasureResults([])}
                  className="w-full mt-1 py-1 text-[9px] text-gray-500 hover:text-red-400 transition-colors">
                  Cancella tutte
                </button>
              )}
            </div>
          )}
          {measureResults.length === 0 && (
            <div className="px-4 py-3 text-center text-[10px] text-gray-500">
              Clicca sul canvas per aggiungere punti
            </div>
          )}
        </div>
      )}

    </div>
  );
}
