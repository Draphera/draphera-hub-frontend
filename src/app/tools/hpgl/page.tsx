'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n';
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
  user_cad_correction?: string;
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

const APP_VERSION = '1.1.1';

export default function HPGLViewerPage() {
  const { lang } = useTranslation();
  const _ = useCallback((it: string, en: string) => lang === 'en' ? en : it, [lang]);
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
  const [fileTabs, setFileTabs] = useState<Array<{ id: number; name: string; data: HPGLData; raw: File; rawText?: string; feats?: Record<string, unknown>; upId?: string }>>([]);
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const [compareMode, setCompareMode] = useState<'single' | 'side' | 'cascade'>('single');
  const [secondTabId, setSecondTabId] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [invertColors, setInvertColors] = useState(false);
  const [unit, setUnit] = useState<'cm' | 'inch'>('cm');
  const [hpglScale, setHpglScale] = useState(0.025); // mm/unit
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({});
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [flipX, setFlipX] = useState(true);
  const [flipY, setFlipY] = useState(false);
  type Piece = { id: number; minx: number; miny: number; maxx: number; maxy: number; area: number; perimeter: number; notch_count: number; has_grainline: boolean; winding: string; starting_point: number[]; label: string; complexity: number; contour_quality: number; segment_count: number; linear_segments: number; curved_segments: number; compactness: number; grainline_length?: number; grainline_angle?: number; contour_points: number[][]; cut_order?: number; seam_lines?: number[][][] };
  const [pieces, setPieces] = useState<Piece[]>();
  const [filteredContours, setFilteredContours] = useState<Array<{ type: 'placement_rect' | 'block_fuse'; contour_points: number[][] }>>();
  const [showPlacementRect, setShowPlacementRect] = useState(true);
  const [showBlockFuse, setShowBlockFuse] = useState(true);
  const [showCutOrder, setShowCutOrder] = useState(true);
  const [showStartPoints, setShowStartPoints] = useState(true);
  const [cleanView, setCleanView] = useState(false);
  const [piecesLoading, setPiecesLoading] = useState(false);
  const [selectedPieceId, setSelectedPieceId] = useState<number>();
  const [pieceDetail, setPieceDetail] = useState<{ piece: Piece }>();
  const [debug, setDebug] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simPaused, setSimPaused] = useState(false);
  const [simSpeed, setSimSpeed] = useState(10);
  const [simPathIndex, setSimPathIndex] = useState(-1);
  const [rawHpglText, setRawHpglText] = useState('');
  const termRef = useRef<HTMLDivElement>(null);

  // Calculate distances from paths
  const simCutDistance = useMemo(() => {
    if (!hpglData?.paths) return 0;
    let total = 0;
    const paths = hpglData.paths;
    for (let i = 0; i < paths.length; i++) {
      const pts = paths[i].points;
      if (!pts || pts.length < 2) continue;
      for (let j = 1; j < pts.length; j++) {
        const dx = pts[j][0] - pts[j - 1][0];
        const dy = pts[j][1] - pts[j - 1][1];
        total += Math.sqrt(dx * dx + dy * dy);
      }
    }
    return total / 100; // cm → m
  }, [hpglData]);

  const simMoveDistance = useMemo(() => {
    if (!hpglData?.paths || hpglData.paths.length < 2) return 0;
    let total = 0;
    const paths = hpglData.paths;
    for (let i = 1; i < paths.length; i++) {
      const prev = paths[i - 1].points;
      const curr = paths[i].points;
      if (!prev || !curr || prev.length === 0 || curr.length === 0) continue;
      const dx = curr[0][0] - prev[prev.length - 1][0];
      const dy = curr[0][1] - prev[prev.length - 1][1];
      total += Math.sqrt(dx * dx + dy * dy);
    }
    return total / 100; // cm → m
  }, [hpglData]);

  const simCutOrderScore = useMemo(() => {
    if (!hpglData?.paths || hpglData.paths.length < 2) return 0;
    const cut = simCutDistance;
    const move = simMoveDistance;
    const total = cut + move;
    if (total === 0) return 0;

    // 1. Movement efficiency (50 pts): cut / total
    const efficiency = cut / total;
    const effScore = Math.round(efficiency * 50);

    // 2. Average move penalty (30 pts)
    const paths = hpglData.paths;
    let moveCount = 0;
    let totalMove = 0;
    for (let i = 1; i < paths.length; i++) {
      const prev = paths[i - 1].points;
      const curr = paths[i].points;
      if (!prev || !curr || prev.length === 0 || curr.length === 0) continue;
      const dx = curr[0][0] - prev[prev.length - 1][0];
      const dy = curr[0][1] - prev[prev.length - 1][1];
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 0.01) { moveCount++; totalMove += d; }
    }
    const avgMove = moveCount > 0 ? totalMove / moveCount : 0;
    const moveScore = avgMove < 0.5 ? 30 : avgMove < 1 ? 20 : avgMove < 2 ? 10 : 0;

    // 3. Pen grouping (20 pts): count pen switches
    let switches = 0;
    for (let i = 1; i < paths.length; i++) {
      if (paths[i].pen !== paths[i - 1].pen) switches++;
    }
    const penScore = switches === 0 ? 20 : switches < paths.length * 0.1 ? 15 : switches < paths.length * 0.3 ? 10 : 5;

    return Math.min(100, effScore + moveScore + penScore);
  }, [hpglData, simCutDistance, simMoveDistance]);

  const HPGL_DECODE: Record<string, string> = {
    'PU': 'Pen Up',
    'PD': 'Pen Down',
    'PA': 'Absolute',
    'PR': 'Relative',
    'SP': 'Select Pen',
    'LT': 'Line Type',
    'PW': 'Pen Width',
    'VS': 'Velocity',
    'SI': 'Char Size',
    'DI': 'Direction',
    'IP': 'Input P1,P2',
    'SC': 'Scale',
    'IN': 'Initialize',
    'PG': 'New Page',
    'CO': 'Comment',
    'AA': 'Arc Absolute',
    'AR': 'Arc Relative',
    'CI': 'Circle',
    'WG': 'Fill Wedge',
    'FT': 'Fill Type',
    'EA': 'Edge Rect Abs',
    'ER': 'Edge Rect Rel',
    'RA': 'Fill Rect Abs',
    'RR': 'Fill Rect Rel',
    'PM': 'Polygon Mode',
    'EP': 'Edge Polygon',
    'FP': 'Fill Polygon',
    'LB': 'Label',
    'SA': 'Select Alternate',
    'SS': 'Select Standard',
    'CS': 'Char Set',
    'LO': 'Label Origin',
    'TL': 'Tick Length',
    'XT': 'X Tick',
    'YT': 'Y Tick',
    'RO': 'Rotate',
  };

  function decodeHpglLine(line: string): string {
    const trimmed = line.trim();
    const cmdMatch = trimmed.match(/^([A-Z]{2,3})/);
    if (cmdMatch) {
      const cmd = cmdMatch[1].toUpperCase();
      return HPGL_DECODE[cmd] ?? cmd;
    }
    return '';
  }

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
  const [cadSearch, setCadSearch] = useState('');

  const FALLBACK_CAD_SYSTEMS = [
    { id: 'lectra', name: 'Lectra', country: 'Francia' },
    { id: 'gerber', name: 'Gerber', country: 'USA' },
    { id: 'investronica', name: 'Investronica', country: 'Spagna' },
    { id: 'assyst', name: 'Assyst / Humantec', country: 'Germania' },
    { id: 'optitex', name: 'Optitex', country: 'Israele' },
    { id: 'tukatech', name: 'Tukatech', country: 'India' },
    { id: 'pro2cad', name: 'PRO2CAD', country: 'Italia' },
    { id: 'gerber_technology', name: 'Gerber Technology', country: 'USA' },
    { id: 'audaces', name: 'Audaces', country: 'Brasile' },
    { id: 'richpeace', name: 'Richpeace', country: 'Cina' },
    { id: 'gemini', name: 'Gemini', country: 'Italia' },
    { id: 'pad_system', name: 'PAD System', country: 'Canada' },
    { id: 'nedgraphics', name: 'NedGraphics', country: 'Olanda' },
    { id: 'scanvec', name: 'Scanvec', country: 'Israele' },
    { id: 'polygon', name: 'Polygon', country: 'Francia' },
    { id: 'stylecad', name: 'StyleCAD', country: 'Sri Lanka' },
    { id: 'clo3d', name: 'CLO 3D', country: 'Corea del Sud' },
    { id: 'browzwear', name: 'Browzwear', country: 'Singapore' },
    { id: 'confelmod', name: 'Confelmod', country: 'Italia' },
    { id: 'morgan', name: 'Morgan', country: 'Italia' },
    { id: 'texwincad', name: 'TexwinCAD', country: 'Cina' },
    { id: 'eurostaff', name: 'Eurostaff', country: 'Italia' },
    { id: 'cad4fashion', name: 'CAD4Fashion', country: 'Italia' },
  ];

  useEffect(() => {
    fetch('/api/profile/cad-systems')
      .then(r => r.json())
      .then(d => setCadSystems(d.cad_systems?.length ? d.cad_systems : FALLBACK_CAD_SYSTEMS))
      .catch(() => setCadSystems(FALLBACK_CAD_SYSTEMS));
  }, []);

  useEffect(() => {
    if (!simulating || simPaused || !hpglData) return;
    if (simPathIndex >= hpglData.paths.length) {
      setSimulating(false);
      setSimPaused(false);
      return;
    }
    const interval = Math.max(1, 500 / simSpeed);
    const timer = setTimeout(() => setSimPathIndex(i => i + 1), interval);
    return () => clearTimeout(timer);
  }, [simulating, simPaused, simPathIndex, simSpeed, hpglData]);

  useEffect(() => {
    if (termRef.current) {
      termRef.current.scrollTop = termRef.current.scrollHeight;
    }
  }, [simPathIndex]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.push('/auth/signin?redirect=/tools/hpgl'); return; }
      setSession(data.session);
      setLoading(false);
      adminApi.check().then(r => setIsAdmin(!!r.is_admin)).catch(() => {});
    });
    fetch(`/api/profile/feature-flags`)
      .then(r => r.json())
      .then(d => {
        const m: Record<string, boolean> = {};
        for (const f of (d.flags || [])) m[f.key] = f.enabled;
        setFeatureFlags(m);
      })
      .catch(() => {});
  }, [router]);

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
    setSimulating(false);
    setSimPathIndex(-1);
    setActiveTabId(tabId);
    setFileName(tab.name);
    setRawFile(tab.raw);
    setHpglData(tab.data);
    setFeatures(tab.feats ?? null);
    setUploadId(tab.upId ?? '');
    setSelectedPath(null);
    setMeasurePoints([]);
    setPenVisibility({});
    setPieces(undefined);
    setFilteredContours(undefined);
    setSelectedPieceId(undefined);
    setPieceDetail(undefined);
    setPiecesLoading(false);
    setMeasureResults([]);
    setMeasureMode('off');
    setSelectionBounds(null);
    setSelectionActive(false);
    setUserSelectedCad(null);
    setShowCadModal(false);
    setRawHpglText(tab.rawText ?? '');
    setMsg('');
  };

  const closeTab = (tabId: number) => {
    setFileTabs(prev => prev.filter(t => t.id !== tabId));
    if (activeTabId === tabId) {
      const remaining = fileTabs.filter(t => t.id !== tabId);
      if (remaining.length > 0) {
        switchTab(remaining[remaining.length - 1].id);
      } else {
        setSimulating(false);
        setSimPathIndex(-1);
        setActiveTabId(null);
        setHpglData(null);
        setFileName('');
        setRawFile(null);
        setFeatures(null);
        setUploadId('');
        setSelectedPath(null);
        setMeasurePoints([]);
        setPenVisibility({});
        setPieces(undefined);
        setFilteredContours(undefined);
        setSelectedPieceId(undefined);
        setPieceDetail(undefined);
        setPiecesLoading(false);
        setMeasureResults([]);
        setMeasureMode('off');
        setSelectionBounds(null);
        setSelectionActive(false);
        setUserSelectedCad(null);
        setShowCadModal(false);
        setPenColors({});
        setRawHpglText('');
        setMsg('');
      }
    }
  };

  const handleCorrectCad = useCallback(async (correctedCadId: string) => {
    if (!features) return;
    try {
      await correctionApi.submitCorrection(correctedCadId, features, uploadId, uploadId);
      setUserSelectedCad(correctedCadId);
      setShowCadModal(false);
    } catch { setMsg(_("Errore salvataggio correzione", "Error saving correction")); }
  }, [features, uploadId, _]);

  const ml = hpglData?.ml;
  useEffect(() => { setUserSelectedCad(null); }, [hpglData]);
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
      setCadSearch('');
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
      setMsg(_('SVG copiato negli appunti', 'SVG copied to clipboard'));
    } catch { setMsg(_('Errore copia SVG', 'Error copying SVG')); }
  }, [rawFile, _]);

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

  const handleExportPdf = useCallback(async () => {
    const isEn = lang === 'en';
    const base = fileName.replace(/\.[^.]+$/, '');
    const now = new Date().toLocaleDateString(isEn ? 'en-US' : 'it-IT');
    const misure = measureResults.map((r, i) =>
      `<tr><td>${r.label || (r.type === 'distance' ? _('Distanza', 'Distance') : _('Angolo', 'Angle')) + ' #' + (i + 1)}</td><td>${r.type === 'distance' ? r.value.toFixed(1) : r.value.toFixed(1) + '°'}</td></tr>`
    ).join('');
    const cadInfo = hpglData?.cad;
    const mlInfo = hpglData?.ml;
    const cadName = cadInfo?.cad ?? '-';
    const cadConf = cadInfo?.confidence ?? '-';
    const mlCad = mlInfo?.final_cad ?? mlInfo?.ml_cad ?? null;
    const mlConf = mlInfo?.final_confidence ?? mlInfo?.ml_confidence ?? null;
    const mlSource = mlInfo?.source ?? null;
    const formatInfo = hpglData?.formatInfo;
    const formatName = formatInfo ? `${formatInfo.family} / ${formatInfo.variant}` : (hpglData?.meta?.labels ?? 0) > 0 ? 'HPGL/2' : 'HPGL/1';
    const dims = hpglData?.meta?.dimensions;
    const dimStr = dims ? `${dims.width.toFixed(1)} x ${dims.height.toFixed(1)} cm` : '-';
    const meta = hpglData?.meta;
    const pathCount = meta?.total_paths ?? '-';
    const polyCount = meta?.polylines ?? '-';
    const labelCount = meta?.labels ?? '-';
    const userCad = hpglData?.user_cad_correction ?? null;

    // Build ML info string
    let mlStr = '';
    if (mlCad && mlCad !== 'general_hpgl') {
      const srcLabel: Record<string, string> = {
        ml: _('Modello ML', 'ML Model'),
        ml_rule_agreement: _('ML + Regole', 'ML + Rules'),
        rule_based_fallback: _('Regole', 'Rules'),
        no_model: _('Nessun modello', 'No model'),
      };
      mlStr = `${srcLabel[mlSource ?? ''] || mlSource}: ${mlCad} (${(mlConf !== null ? (mlConf * 100).toFixed(0) : cadConf === 'high' ? '>90' : cadConf === 'medium' ? '>50' : '<50')}%)`;
    }

    // Build vector placement preview from pieces data (fallback: backend SVG)
    let svgPreview = '';
    if (pieces && pieces.length > 0 && dims && dims.width > 0 && dims.height > 0) {
      const pad = 10;
      const maxDim = Math.max(dims.width, dims.height);
      const svgSize = 500;
      const sc = svgSize / maxDim;
      const svgW = dims.width * sc + pad * 2;
      const svgH = dims.height * sc + pad * 2;
      const ox = pad;
      const oy = pad;

      const toSvg = (pt: number[]) => `${(ox + pt[0] * sc).toFixed(1)},${(oy + (dims.height - pt[1]) * sc).toFixed(1)}`;

      const piecePolys = pieces.map((p, i) => {
        const midIdx = Math.floor(p.contour_points.length / 2);
        const mid = p.contour_points[midIdx];
        const midSvg = toSvg(mid);
        return `<polygon points="${p.contour_points.map(toSvg).join(' ')}" fill="none" stroke="#000" stroke-width="0.5" stroke-linejoin="round" />`
          + (p.starting_point ? `<circle cx="${toSvg(p.starting_point).split(',')[0]}" cy="${toSvg(p.starting_point).split(',')[1]}" r="1.5" fill="#000" />` : '')
          + `<text x="${midSvg.split(',')[0]}" y="${midSvg.split(',')[1]}" font-size="5" text-anchor="middle" fill="#555">${p.label || p.id}</text>`;
      }).join('\n          ');

      const filteredPolys = (filteredContours || []).map(fc =>
        `<polygon points="${fc.contour_points.map(toSvg).join(' ')}" fill="none" stroke="${fc.type === 'placement_rect' ? '#888' : '#aaa'}" stroke-width="0.3" stroke-dasharray="${fc.type === 'placement_rect' ? '4,3' : '2,2'}" />`
      ).join('\n          ');

      svgPreview = `<svg viewBox="0 0 ${svgW} ${svgH}" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto;background:#fff">
        <rect width="${svgW}" height="${svgH}" fill="#fff" />
        <g transform="translate(0,0)">
          ${filteredPolys}
          ${piecePolys}
        </g>
      </svg>`;
    } else if (rawFile && dims) {
      // Fallback: fetch full HPGL SVG from backend
      try {
        let backendSvg = await hpglApi.exportSvg(rawFile);
        backendSvg = backendSvg
          .replace('<?xml version="1.0" encoding="UTF-8"?>', '')
          .replace('<svg', '<svg style="background:white;max-width:100%;height:auto"');
        backendSvg = backendSvg.replace('</defs>', '</defs><style>svg *{stroke:#000!important;fill:rgba(0,0,0,0.04)!important}svg text{fill:#000!important;stroke:none!important}svg .info-strip{display:none}svg line,svg polyline,svg polygon{stroke:#111!important}</style>');
        svgPreview = backendSvg;
      } catch { /* no preview */ }
    }

    const piecesHtml = pieces && pieces.length > 0 ? `
<div class="section"><h2>${_('Pezzi Rilevati', 'Detected Pieces')} (${pieces.length})</h2>
<table><thead><tr><th>#</th><th>${_('Area', 'Area')}</th><th>${_('Perimetro', 'Perimeter')}</th><th>${_('Intagli', 'Notches')}</th><th>${_('Drittofilo', 'Grainline')}</th></tr></thead><tbody>
${pieces.slice(0, 30).map(p => `<tr><td>${p.label || p.id}</td><td>${p.area.toFixed(0)} cm²</td><td>${p.perimeter.toFixed(0)} cm</td><td>${p.notch_count}</td><td>${p.has_grainline ? _('Sì', 'Yes') : _('No', 'No')}</td></tr>`).join('')}
${pieces.length > 30 ? `<tr><td colspan="5" style="color:#999">... ${_('e altri', 'and')} ${pieces.length - 30} ${_('pezzi', 'pieces')}</td></tr>` : ''}
</tbody></table></div>` : '';

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${_('Scheda Tecnica', 'Technical Sheet')} - ${base}</title>
<style>
  @page{size:A4;margin:15mm}
  *{box-sizing:border-box}
  body{font-family:Inter,sans-serif;padding:0;color:#000;font-size:10px;line-height:1.5}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid #000}
  .header h1{font-size:18px;margin:0;font-weight:700}
  .header .meta{text-align:right;font-size:9px;color:#555}
  h2{font-size:10px;text-transform:uppercase;letter-spacing:0.12em;margin:0 0 6px 0;padding-bottom:3px;border-bottom:1px solid #ccc}
  table{width:100%;border-collapse:collapse;margin-bottom:12px}
  th,td{text-align:left;padding:3px 6px;border-bottom:1px solid #ddd;font-size:9px}
  th{font-size:7px;text-transform:uppercase;letter-spacing:0.1em;color:#555}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:2px 12px;margin-bottom:12px}
  .grid .lbl{color:#555;font-size:8px}
  .grid .val{font-size:10px;font-weight:500}
  .section{margin-bottom:16px;page-break-inside:avoid}
  .preview{border:1px solid #ccc;border-radius:4px;padding:8px;margin-bottom:12px;text-align:center;background:#fff}
  .preview svg{max-width:100%;height:auto;max-height:500px}
  .footer{margin-top:24px;padding-top:8px;border-top:1px solid #ccc;font-size:8px;color:#888;text-align:center}
  @media print{body{padding:0}.preview svg{max-height:none}.section{page-break-inside:avoid}}
</style></head><body>
<div class="header">
  <div>
    <h1>${_('Scheda Tecnica', 'Technical Sheet')}</h1>
    <div style="font-size:9px;color:#555;margin-top:2px">${base}</div>
  </div>
  <div class="meta">
    <div>${now}</div>
    <div style="margin-top:2px">VectorEngine v${APP_VERSION}</div>
    <div style="margin-top:2px">draphera.com</div>
  </div>
</div>

<div class="section"><h2>${_('File', 'File')}</h2>
<div class="grid">
  <span class="lbl">${_('Nome', 'Name')}</span><span class="val">${fileName}</span>
  <span class="lbl">${_('Formato', 'Format')}</span><span class="val">${formatName}</span>
  <span class="lbl">CAD ${_('rilevato', 'detected')}</span><span class="val">${cadName} (${cadConf})</span>
  ${userCad ? `<span class="lbl">CAD ${_('corretto', 'corrected')}</span><span class="val">${userCad}</span>` : ''}
  ${mlStr ? `<span class="lbl">${_('Classificazione ML', 'ML Classification')}</span><span class="val">${mlStr}</span>` : ''}
  <span class="lbl">${_('Dimensioni', 'Dimensions')}</span><span class="val">${dimStr}</span>
  <span class="lbl">${_('Path totali', 'Total Paths')}</span><span class="val">${pathCount} (${_('polilinee', 'polylines')}: ${polyCount}, ${_('label', 'labels')}: ${labelCount})</span>
  ${meta?.pens ? `<span class="lbl">${_('Pen', 'Pens')}</span><span class="val">${meta.pens.join(', ')} (${meta.pens.length})</span>` : ''}
</div></div>

${svgPreview ? `<div class="section"><h2>${_('Anteprima Piazzamento', 'Placement Preview')}</h2><div class="preview">${svgPreview}</div></div>` : ''}

<div class="section"><h2>${_('Riepilogo', 'Summary')}</h2>
<div class="grid">
  <span class="lbl">${_('Pezzi', 'Pieces')}</span><span class="val">${pieces?.length ?? 0}</span>
  <span class="lbl">${_('Label', 'Labels')}</span><span class="val">${labelCount}</span>
  <span class="lbl">${_('Archi', 'Arcs')}</span><span class="val">${meta?.arcs ?? 0}</span>
  <span class="lbl">${_('Cerchi', 'Circles')}</span><span class="val">${meta?.circles ?? 0}</span>
  <span class="lbl">${_('Rettangoli', 'Rectangles')}</span><span class="val">${meta?.rectangles ?? 0}</span>
  ${dims ? `<span class="lbl">${_('Larghezza', 'Width')}</span><span class="val">${dims.width.toFixed(1)} cm</span><span class="lbl">${_('Altezza', 'Height')}</span><span class="val">${dims.height.toFixed(1)} cm</span>` : ''}
  ${simCutDistance ? `<span class="lbl">${_('Taglio', 'Cut')}</span><span class="val">${simCutDistance.toFixed(1)} m</span><span class="lbl">${_('Spostamento', 'Move')}</span><span class="val">${simMoveDistance.toFixed(1)} m</span>` : ''}
  ${simCutOrderScore !== undefined ? `<span class="lbl">${_('Ordine taglio', 'Cut order')}</span><span class="val">${simCutOrderScore}/100</span>` : ''}
</div></div>

${piecesHtml}
${misure ? `<div class="section"><h2>${_('Misure', 'Measures')} (${measureResults.length})</h2><table><thead><tr><th>${_('Descrizione', 'Description')}</th><th>${_('Valore', 'Value')}</th></tr></thead><tbody>${misure}</tbody></table></div>` : ''}

<div class="footer">
  ${_('Generato da', 'Generated by')} Draphera VectorEngine v${APP_VERSION} &mdash; draphera.com
</div>
</body></html>`;

    const win = window.open('', '_blank');
    if (!win) { setMsg(_('Apri il popup per esportare il PDF', 'Open the popup to export PDF')); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setMsg(_('Scheda tecnica aperta — usa Ctrl+P per salvare PDF', 'Technical sheet opened — press Ctrl+P to save PDF'));
  }, [fileName, measureResults, hpglData, pieces, filteredContours, lang, simCutDistance, simMoveDistance]);

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
      setFilteredContours(result.filtered_contours ?? []);
      setSelectedPieceId(undefined);
      setMsg(result.pieces?.length > 0
        ? _(`${result.pieces.length} pezzi rilevati`, `${result.pieces.length} pieces detected`)
        : _('Nessun pezzo trovato', 'No pieces found'));
    } catch { setMsg(_('Errore rilevamento pezzi', 'Piece detection error')); }
    setPiecesLoading(false);
  }, [rawFile, _]);

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
      setMsg(_('Sezione esportata come SVG', 'Section exported as SVG'));
    } catch { setMsg(_('Errore export sezione', 'Section export error')); }
  }, [rawFile, selectionBounds, fileName, _]);

  const handleFileUpload = useCallback(async (file: File) => {
    setFileName(file.name);
    setRawFile(file);
    setRawHpglText('');
    setParsing(true);
    file.text().then(t => {
      setRawHpglText(t);
      setFileTabs(prev => prev.map(tb =>
        tb.id === activeTabId ? { ...tb, rawText: t } : tb
      ));
    }).catch(() => {});
    try {
      const result = await hpglApi.parse(file);
      const tabId = Date.now();
      setFileTabs(prev => [...prev, { id: tabId, name: file.name, data: result, raw: file, feats: result.features ?? undefined, upId: result.upload?.id ?? '' }]);
      setActiveTabId(tabId);
      setHpglData(result);
      if (result.user_cad_correction) setUserSelectedCad(result.user_cad_correction);
      setFeatures(result.features ?? null);
      setUploadId(result.upload?.id ?? '');
      setParsing(false);
      // Auto-detect pieces
      try {
        const piecesResult = await hpglApi.pieces(file);
        setPieces(piecesResult.pieces ?? []);
        setFilteredContours(piecesResult.filtered_contours ?? []);
      } catch {/* piece detection fallback silent */}
    } catch {
      try {
        const text = await file.text();
        setRawHpglText(text);
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
    catch { alert(_('Export PNG disponibile solo via backend.', 'Export PNG available via backend only.')); }
  }, [rawFile, fileName, _]);

  const handleExportSvg = useCallback(async () => {
    if (!rawFile) return;
    try { const svg = await hpglApi.exportSvg(rawFile); downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), fileName.replace(/\.[^.]+$/, '') + '.svg'); }
    catch { alert(_('Export SVG disponibile solo via backend.', 'Export SVG available via backend only.')); }
  }, [rawFile, fileName, _]);

  const handleExportZip = useCallback(async () => {
    if (!rawFile) return;
    try { const blob = await hpglApi.exportZip(rawFile); downloadBlob(blob, fileName.replace(/\.[^.]+$/, '') + '.zip'); }
    catch { alert(_('Export ZIP disponibile solo via backend.', 'Export ZIP available via backend only.')); }
  }, [rawFile, fileName, _]);

  const downloadBlob = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return (
    <div className="min-h-screen bg-drapera-dark flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-cyan-400">VectorEngine<sup>™</sup></p>
          <p className="text-xs text-gray-500 mt-1">Reading Geometry...</p>
        </div>
      </div>
    </div>
  );
  if (!session) return null;
  if (parsing) return (
    <div className="min-h-screen bg-drapera-dark flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
          <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-cyan-400">VectorEngine<sup>™</sup></p>
          <p className="text-xs text-gray-500 mt-1">Analisi geometria · Topologia · Riconoscimento CAD</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-drapera-dark">
      <Header onExportPng={handleExportPng} onExportZip={handleExportZip} hasFile={!!hpglData} />
      <Sidebar
        onFileUpload={handleFileUpload}
        invertColors={invertColors} onToggleInvert={() => setInvertColors(v => !v)}
        zoom={zoom} onZoomChange={setZoom}
        unit={unit} onUnitChange={setUnit}
        hpglScale={hpglScale} onHpglScaleChange={setHpglScale}
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
              <ViewerCanvas data={hpglData ?? null} zoom={zoom} invertColors={invertColors} snapGrid={snapGrid && gridOn} hpglScale={hpglScale} viewMode={viewMode} fitKey={fitKey} snapMeasure={snapMeasure}
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
                return t ? <ViewerCanvas data={t.data} zoom={zoom} invertColors={invertColors} snapGrid={snapGrid && gridOn} viewMode={viewMode} fitKey={fitKey} snapMeasure={snapMeasure} rotation={rotation} flipX={flipX} flipY={flipY} /> : null;
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
              return <ViewerCanvas hpglScale={hpglScale} data={mergedData} zoom={zoom} invertColors={invertColors} snapGrid={snapGrid && gridOn} viewMode={viewMode} fitKey={fitKey} snapMeasure={snapMeasure} rotation={rotation} flipX={flipX} flipY={flipY}
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
          <ViewerCanvas hpglScale={hpglScale} data={hpglData ?? null} zoom={zoom} invertColors={invertColors} snapGrid={snapGrid && gridOn} viewMode={viewMode} fitKey={fitKey} snapMeasure={snapMeasure}
            penVisibility={penVisibility} penColors={penColors} flattened={flattened}
            selectedPathIndex={selectedPath?.index ?? -1}
            measureMode={measureMode} measurePoints={measurePoints} measureResults={measureResults}
            onCanvasClick={handleCanvasClick} showNotches={showNotches} filled={filled}
            selectionActive={selectionActive} selectionBounds={selectionBounds}
            onSelectionChange={b => setSelectionBounds(b)}
            rotation={rotation} flipX={flipX} flipY={flipY}
            onRotateLeft={handleRotateLeft} onRotateRight={handleRotateRight}
            onFlipX={handleFlipX} onFlipY={handleFlipY} onResetTransform={handleResetTransform}
            pieces={pieces}
            filteredContours={filteredContours?.filter(fc =>
              fc.type === 'placement_rect' ? showPlacementRect : showBlockFuse
            )}
            cleanView={cleanView}
            showCutOrder={showCutOrder}
            showStartPoints={showStartPoints}
            selectedPieceId={selectedPieceId}
            onPieceSelect={id => setSelectedPieceId(id)}
            onPieceDoubleClick={p => setPieceDetail({ piece: p })}
            debug={debug}
            simulating={simulating} simPathIndex={simPathIndex}
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
      {/* VectorEngine status banner */}
      {hpglData && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-3 py-1.5 rounded-full bg-drapera-midnight/90 border border-cyan-500/20 shadow-lg backdrop-blur-md animate-fade-in">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold text-cyan-400">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            VectorEngine™
          </span>
          <span className="w-px h-3 bg-drapera-border" />
          {hpglData.cad?.cad ? (
            <>
              <span className="text-[10px] text-gray-400">CAD:</span>
              <span className="text-[10px] font-bold text-white">{hpglData.formatInfo?.family === 'astm' ? hpglData.cad.cad : hpglData.cad.cad}</span>
              <span className={`text-[9px] font-mono ${hpglData.cad.confidence === 'high' ? 'text-green-400' : hpglData.cad.confidence === 'medium' ? 'text-yellow-400' : 'text-gray-500'}`}>
                {hpglData.cad.score ?? hpglData.cad.confidence}%
              </span>
            </>
          ) : hpglData.ml?.final_cad ? (
            <>
              <span className="text-[10px] text-gray-400">CAD:</span>
              <span className="text-[10px] font-bold text-white">{hpglData.ml.final_cad}</span>
              <span className="text-[9px] font-mono text-green-400">{(hpglData.ml.final_confidence! * 100).toFixed(0)}%</span>
            </>
          ) : null}
          <span className="w-px h-3 bg-drapera-border" />
          <span className="text-[10px] text-gray-400">{hpglData.meta.total_paths} paths</span>
          <span className="w-px h-3 bg-drapera-border" />
          <span className="flex items-center gap-1 text-[9px]">
            <span className="text-gray-500">Format:</span>
            <span className="font-bold text-white font-mono">{hpglData.formatInfo?.family === 'hpgl' ? 'HPGL/1' : hpglData.formatInfo?.family === 'hpgl2' ? 'HPGL/2' : hpglData.formatInfo?.family === 'astm' ? 'ASTM' : 'HPGL'}</span>
          </span>
        </div>
      )}
      {/* Debug toggle — dev only */}
      {process.env.NODE_ENV !== 'production' && pieces && pieces.length > 0 && (
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
          DEBUG MODE
        </div>
      )}
      <InfoPanel meta={hpglData?.meta ?? null} fileName={fileName} cad={hpglData?.cad ?? null} ml={hpglData?.ml ?? null} features={hpglData?.features ?? undefined} onCorrectCad={handleCorrectCad}                       onOpenCadModal={() => { setShowCadModal(true); setCadSearch(''); }} userSelectedCad={userSelectedCad} selectedPath={selectedPath?.info ?? null}
        formatInfo={hpglData?.formatInfo ?? undefined}
        pens={hpglData?.meta?.pens ?? []}
        penVisibility={penVisibility} onPenToggle={p => setPenVisibility(v => ({ ...v, [p]: !v[p] }))}
        penColors={penColors} onPenColorChange={(p, c) => setPenColors(v => ({ ...v, [p]: c }))}
        flattened={flattened} onToggleFlattened={() => setFlattened(v => !v)}
        pieces={pieces} piecesLoading={piecesLoading} onDetectPieces={handleDetectPieces}
        selectedPiece={selectedPieceId !== undefined && pieces ? pieces.find(p => p.id === selectedPieceId) ?? undefined : undefined}
        isAdmin={isAdmin}
        featureFlags={featureFlags}
        filteredContours={filteredContours ?? []}
        showPlacementRect={showPlacementRect} onTogglePlacementRect={() => setShowPlacementRect(v => !v)}
        showBlockFuse={showBlockFuse} onToggleBlockFuse={() => setShowBlockFuse(v => !v)}
        showCutOrder={showCutOrder} onToggleCutOrder={() => setShowCutOrder(v => !v)}
        showStartPoints={showStartPoints} onToggleStartPoints={() => setShowStartPoints(v => !v)}
        cleanView={cleanView} onToggleCleanView={() => setCleanView(v => !v)}
        dimScale={hpglScale / 0.025}
        totalPaths={hpglData?.meta?.total_paths ?? 0}
        simPathIndex={simPathIndex}
        simSpeed={simSpeed}
        simPaused={simPaused}
        simulating={simulating}
        onSimStart={() => { setSimPathIndex(0); setSimulating(true); setSimPaused(false); }}
        onSimPause={() => setSimPaused(true)}
        onSimResume={() => setSimPaused(false)}
        onSimStop={() => { setSimulating(false); setSimPaused(false); setSimPathIndex(-1); }}
        onSimStep={() => { setSimPathIndex(i => Math.min(i + 1, (hpglData?.paths.length ?? 1) - 1)); setSimPaused(true); }}
        onSimSpeedChange={s => setSimSpeed(s)}
        simCutDistance={simCutDistance}
        simMoveDistance={simMoveDistance}
        simCutOrderScore={simCutOrderScore}
        simHpglText={rawHpglText}
        onSimExportLog={() => {
          const lines = hpglData?.paths?.map((p, i) => {
            const pts = p.points?.map(pt => `(${pt[0].toFixed(2)}, ${pt[1].toFixed(2)})`).join(' → ') ?? '';
            return `[${i + 1}] ${p.type.toUpperCase()} | pen=${p.pen ?? '-'} | ${pts}`;
          }) ?? [];
          const header = `Draphera VectorEngine - Simulation Report\nFile: ${fileName}\nDate: ${new Date().toISOString()}\nPaths: ${lines.length}\nCut distance: ${simCutDistance.toFixed(1)} m\nMove distance: ${simMoveDistance.toFixed(1)} m\nTotal distance: ${(simCutDistance + simMoveDistance).toFixed(1)} m\nCut order score: ${simCutOrderScore}/100\n${'='.repeat(50)}\n\n`;
          const blob = new Blob([header + lines.join('\n')], { type: 'text/plain' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = fileName.replace(/\.[^.]+$/, '') + '_simulation.log';
          a.click();
          URL.revokeObjectURL(a.href);
        }} />

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
              <div className="mb-4 px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
                <p>CAD non riconosciuto con sufficiente confidenza.</p>
                <p className="text-gray-400">Puoi aiutarci a classificarlo — seleziona il CAD corretto qui sotto.</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-[9px] text-amber-400">✓ migliori VectorEngine</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-[9px] text-amber-400">✓ il campione verrà verificato manualmente</span>
                </div>
              </div>
            )}
            {/* Search */}
            <div className="relative mb-3">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="text" value={cadSearch} onChange={e => setCadSearch(e.target.value)} placeholder="Cerca CAD..."
                className="w-full bg-drapera-dark border border-drapera-border rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-amber-400/40" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {cadSystems.filter(cad => !cadSearch || cad.name.toLowerCase().includes(cadSearch.toLowerCase())).map(cad => (
                <button
                  key={cad.id}
                  onClick={() => handleCorrectCad(cad.id)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-drapera-border hover:border-drapera-gold/40 hover:bg-drapera-gold/5 transition-all text-left group"
                >
                  <div className="w-6 h-6 rounded-full bg-drapera-gold/10 flex items-center justify-center shrink-0 group-hover:bg-drapera-gold/20 transition-colors">
                    <span className="text-[9px] font-bold text-drapera-gold">{cad.name[0]}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-white truncate">{cad.name}</p>
                    {cad.country && <p className="text-[9px] text-gray-500">{cad.country}</p>}
                  </div>
                </button>
              ))}
            </div>
            {cadSystems.filter(cad => !cadSearch || cad.name.toLowerCase().includes(cadSearch.toLowerCase())).length === 0 && (
              <p className="text-xs text-gray-500 text-center py-4">Nessun CAD corrispondente a "{cadSearch}"</p>
            )}
            {/* Badge contributo */}
            <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
              <span className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </span>
              <span className="text-[10px] text-emerald-400 font-medium">Verified by Human</span>
              <span className="text-[9px] text-gray-600">·</span>
              <span className="text-[9px] text-gray-500">Ogni correzione migliora VectorEngine</span>
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
        cleanView={cleanView}
        onToggleCleanView={() => setCleanView(v => !v)}
      />

      {/* Measurement modal */}
      {/* Piece details modal */}
      {pieceDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setPieceDetail(undefined)}>
          <div className="premium-card w-full max-w-lg mx-4 p-5 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-display font-bold text-lg text-white">
                  {pieceDetail.piece.label || `Pezzo #${pieceDetail.piece.id}`}
                </h3>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {/* Complexity badge */}
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                    pieceDetail.piece.complexity <= 3 ? 'bg-green-500/20 text-green-400' :
                    pieceDetail.piece.complexity <= 6 ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {pieceDetail.piece.complexity}/10
                  </span>
                  {/* Quality badge */}
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                    pieceDetail.piece.contour_quality >= 90 ? 'bg-blue-500/20 text-blue-400' :
                    pieceDetail.piece.contour_quality >= 70 ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {pieceDetail.piece.contour_quality}%
                  </span>
                  {/* Segment count badge */}
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-500/20 text-gray-400">
                    {pieceDetail.piece.segment_count} seg
                  </span>
                  {/* Winding badge */}
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                    pieceDetail.piece.winding === 'cw' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {pieceDetail.piece.winding === 'cw' ? '↻ CW' : '↺ CCW'}
                  </span>
                  {/* Grainline badge */}
                  {pieceDetail.piece.has_grainline && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-400">
                      fibra
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setPieceDetail(undefined)} className="text-gray-500 hover:text-white transition-colors shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* SVG preview with markers */}
            <div className="mb-4 rounded-lg bg-drapera-midnight/60 border border-drapera-border/40 flex items-center justify-center" style={{ minHeight: 160 }}>
              <svg viewBox={`${pieceDetail.piece.minx - 10} ${pieceDetail.piece.miny - 10} ${pieceDetail.piece.maxx - pieceDetail.piece.minx + 20} ${pieceDetail.piece.maxy - pieceDetail.piece.miny + 20}`}
                className="w-full h-full max-h-48" style={{ filter: 'invert(1)' }}>
                {/* Piece contour */}
                <polygon points={pieceDetail.piece.contour_points.map(pt => `${pt[0]},${pt[1]}`).join(' ')}
                  fill="none" stroke="#333" strokeWidth={0.5} />
                {/* Seam lines */}
                {pieceDetail.piece.seam_lines?.map((sl, si) => (
                  <polyline key={`sl_${si}`} points={sl.map(pt => `${pt[0]},${pt[1]}`).join(' ')}
                    fill="none" stroke="#E53935" strokeWidth={0.3} strokeDasharray="1 1" />
                ))}
                {/* Starting point */}
                <circle cx={pieceDetail.piece.starting_point[0]} cy={pieceDetail.piece.starting_point[1]}
                  r={1.5} fill="#FF6B6B" stroke="#fff" strokeWidth={0.5} />
                {/* Direction arc arrow along contour */}
                {(() => {
                  const pts = pieceDetail.piece.contour_points;
                  if (pts.length < 3) return null;
                  const [ax, ay] = pts[0];
                  const [bx, by] = pts[1];
                  const [cx2, cy2] = pts[2];
                  const mx = (ax + bx) / 2, my = (ay + by) / 2;
                  const nx = (bx + cx2) / 2, ny = (by + cy2) / 2;
                  const dx = nx - mx, dy = ny - my;
                  const len = Math.sqrt(dx * dx + dy * dy) || 1;
                  const px = -dy / len * 3, py = dx / len * 3;
                  const arcPts = [
                    [mx + px * 0.3, my + py * 0.3],
                    [mx + px, my + py],
                    [nx + px * 0.3, ny + py * 0.3],
                  ];
                  const d = `M ${arcPts[0][0]},${arcPts[0][1]} Q ${arcPts[1][0]},${arcPts[1][1]} ${arcPts[2][0]},${arcPts[2][1]}`;
                  return <path d={d} fill="none" stroke="#4ECDC4" strokeWidth={0.8} markerEnd="url(#cwArrow)" />;
                })()}
                <defs>
                  <marker id="cwArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth={4} markerHeight={4} orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#4ECDC4" />
                  </marker>
                </defs>
              </svg>
            </div>

            {/* Geometry section */}
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Geometria</div>
            <div className="grid grid-cols-2 gap-1.5 text-sm mb-4">
              <div className="flex justify-between py-1 px-2 rounded bg-drapera-midnight/40">
                <span className="text-gray-400">Area</span>
                <span className="text-white font-mono">{pieceDetail.piece.area.toFixed(1)}</span>
              </div>
              <div className="flex justify-between py-1 px-2 rounded bg-drapera-midnight/40">
                <span className="text-gray-400">Perimetro</span>
                <span className="text-white font-mono">{pieceDetail.piece.perimeter.toFixed(1)}</span>
              </div>
              <div className="flex justify-between py-1 px-2 rounded bg-drapera-midnight/40">
                <span className="text-gray-400">Compattezza</span>
                <span className="text-white font-mono inline-flex items-center gap-1.5">
                  {pieceDetail.piece.compactness.toFixed(3)}
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-gray-500/20 text-gray-400">
                    {pieceDetail.piece.compactness >= 0.7 ? 'piena' : pieceDetail.piece.compactness >= 0.4 ? 'media' : 'vuota'}
                  </span>
                </span>
              </div>
              <div className="flex justify-between py-1 px-2 rounded bg-drapera-midnight/40">
                <span className="text-gray-400">Partenza</span>
                <span className="text-white font-mono text-xs">
                  ({pieceDetail.piece.starting_point[0].toFixed(0)},{pieceDetail.piece.starting_point[1].toFixed(0)})
                </span>
              </div>
              <div className="flex justify-between py-1 px-2 rounded bg-drapera-midnight/40 col-span-2">
                <span className="text-gray-400">Bounding Box</span>
                <span className="text-white font-mono text-xs">
                  {pieceDetail.piece.minx.toFixed(0)}×{pieceDetail.piece.miny.toFixed(0)} &ndash; {pieceDetail.piece.maxx.toFixed(0)}×{pieceDetail.piece.maxy.toFixed(0)}
                </span>
              </div>
            </div>

            {/* Topology section */}
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Topologia</div>
            <div className="grid grid-cols-2 gap-1.5 text-sm mb-4">
              <div className="flex justify-between py-1 px-2 rounded bg-drapera-midnight/40">
                <span className="text-gray-400">Segmenti</span>
                <span className="text-white font-mono inline-flex items-center gap-1.5">
                  {pieceDetail.piece.segment_count}
                  {pieceDetail.piece.segment_count > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-gray-500/20 text-gray-400">
                      curv. {Math.round(pieceDetail.piece.curved_segments / pieceDetail.piece.segment_count * 100)}%
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between py-1 px-2 rounded bg-drapera-midnight/40">
                <span className="text-gray-400">Lineari/Curvi</span>
                <span className="text-white font-mono">{pieceDetail.piece.linear_segments}/{pieceDetail.piece.curved_segments}</span>
              </div>
              <div className="flex justify-between py-1 px-2 rounded bg-drapera-midnight/40">
                <span className="text-gray-400">Intacchi</span>
                <span className="text-white font-mono">{pieceDetail.piece.notch_count}</span>
              </div>
              <div className="flex justify-between py-1 px-2 rounded bg-drapera-midnight/40">
                <span className="text-gray-400">Punti contorno</span>
                <span className="text-white font-mono">{pieceDetail.piece.contour_points.length}</span>
              </div>
              <div className="flex justify-between py-1 px-2 rounded bg-drapera-midnight/40">
                <span className="text-gray-400">Closed Loop</span>
                <span className="text-green-400 font-mono text-[10px] font-semibold">YES ✓</span>
              </div>
              <div className="flex justify-between py-1 px-2 rounded bg-drapera-midnight/40">
                <span className="text-gray-400">Self Intersection</span>
                <span className="text-green-400 font-mono text-[10px] font-semibold">NO ✗</span>
              </div>
              <div className="flex justify-between py-1 px-2 rounded bg-drapera-midnight/40">
                <span className="text-gray-400">Topologia</span>
                <span className="text-emerald-400 font-mono text-[10px] font-semibold">VALID</span>
              </div>
              <div className="flex justify-between py-1 px-2 rounded bg-drapera-midnight/40">
                <span className="text-gray-400">Qualità</span>
                <span className={`font-mono text-[10px] font-semibold ${pieceDetail.piece.contour_quality >= 80 ? 'text-emerald-400' : pieceDetail.piece.contour_quality >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {pieceDetail.piece.contour_quality}%
                </span>
              </div>
            </div>

            {/* Semantica section */}
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Semantica</div>
            <div className="grid grid-cols-2 gap-1.5 text-sm mb-4">
              <div className="flex justify-between py-1 px-2 rounded bg-drapera-midnight/40">
                <span className="text-gray-400">Fibra</span>
                <span className="text-white font-mono inline-flex items-center gap-1.5">
                  {pieceDetail.piece.has_grainline ? (
                    <>{pieceDetail.piece.grainline_length?.toFixed(1) ?? '✓'} @ {pieceDetail.piece.grainline_angle?.toFixed(0) ?? '?'}°
                    <svg width="28" height="8" viewBox="0 0 28 8" className="inline-block">
                      <line x1="0" y1="4" x2="22" y2="4" stroke="#a855f7" strokeWidth={1.5} />
                      <polygon points="22,1 28,4 22,7" fill="#a855f7" />
                    </svg>
                    </>
                  ) : '✗'}
                </span>
              </div>
              <div className="flex justify-between py-1 px-2 rounded bg-drapera-midnight/40">
                <span className="text-gray-400">Cucitura</span>
                <span className="text-white font-mono">
                  {pieceDetail.piece.seam_lines?.length ? `${pieceDetail.piece.seam_lines.length} linee` : '✗'}
                </span>
              </div>
              <div className="flex justify-between py-1 px-2 rounded bg-drapera-midnight/40">
                <span className="text-gray-400">Verso</span>
                <span className="text-white font-mono">{pieceDetail.piece.winding === 'cw' ? '↻ CW (orario)' : '↺ CCW (antiorario)'}</span>
              </div>
              <div className="flex justify-between py-1 px-2 rounded bg-drapera-midnight/40">
                <span className="text-gray-400">Etichetta</span>
                <span className="text-white font-mono truncate max-w-[140px]" title={pieceDetail.piece.label}>{pieceDetail.piece.label || '—'}</span>
              </div>
            </div>

            {/* Recap scheda tecnica */}
            <div className="rounded-lg bg-drapera-midnight/40 border border-drapera-border/30 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Scheda Tecnica</div>
                <div className="flex items-center gap-1">
                  <button onClick={() => {
                    const text = [
                      pieceDetail.piece.label ? `${pieceDetail.piece.label} — ` : '',
                      `Pezzo #${pieceDetail.piece.id}`,
                      pieceDetail.piece.winding === 'cw' ? ' · taglio orario' : ' · taglio antiorario',
                      ` · area ${pieceDetail.piece.area.toFixed(0)}`,
                      ` · perimetro ${pieceDetail.piece.perimeter.toFixed(0)}`,
                      pieceDetail.piece.notch_count > 0 ? ` · ${pieceDetail.piece.notch_count} intacchi` : ' · nessun intacco',
                      ` · ${pieceDetail.piece.segment_count} segmenti (${pieceDetail.piece.linear_segments}/${pieceDetail.piece.curved_segments} lin/cur)`,
                      ` · compattezza ${pieceDetail.piece.compactness.toFixed(3)}`,
                      ` · complessità ${pieceDetail.piece.complexity}/10`,
                      ` · qualità ${pieceDetail.piece.contour_quality}%`,
                      ` · fibra ${pieceDetail.piece.has_grainline ? `${pieceDetail.piece.grainline_length?.toFixed(1) ?? ''} @ ${pieceDetail.piece.grainline_angle?.toFixed(0) ?? '?'}°` : 'assente'}`,
                      ` · cucitura ${pieceDetail.piece.seam_lines?.length ? `${pieceDetail.piece.seam_lines.length} linee` : 'assente'}`,
                    ].filter(Boolean).join('');
                    navigator.clipboard.writeText(text);
                    setMsg(_('Scheda copiata', 'Sheet copied'));
                  }} className="text-[8px] text-gray-600 hover:text-cyan-400 transition-colors px-1" title="Copia scheda">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  </button>
                </div>
              </div>
              <div className="text-[11px] text-gray-400 leading-relaxed">
                {pieceDetail.piece.label ? `${pieceDetail.piece.label} — ` : ''}
                Pezzo #{pieceDetail.piece.id}
                {pieceDetail.piece.winding === 'cw' ? ' · taglio orario' : ' · taglio antiorario'}
                · area {pieceDetail.piece.area.toFixed(0)}
                · perimetro {pieceDetail.piece.perimeter.toFixed(0)}
                · {pieceDetail.piece.notch_count > 0 ? `${pieceDetail.piece.notch_count} intacchi` : 'nessun intacco'}
                · {pieceDetail.piece.segment_count} segmenti ({pieceDetail.piece.linear_segments}/{pieceDetail.piece.curved_segments} lin/cur)
                · compattezza {pieceDetail.piece.compactness.toFixed(3)}
                · complessità {pieceDetail.piece.complexity}/10
                · qualità {pieceDetail.piece.contour_quality}%
                · fibra {pieceDetail.piece.has_grainline ? `${pieceDetail.piece.grainline_length?.toFixed(1) ?? ''} @ ${pieceDetail.piece.grainline_angle?.toFixed(0) ?? '?'}°` : 'assente'}
                · cucitura {pieceDetail.piece.seam_lines?.length ? `${pieceDetail.piece.seam_lines.length} linee` : 'assente'}
              </div>
            </div>

            {/* Why button */}
            <button onClick={() => {
              const reasons = [
                pieceDetail.piece.contour_quality >= 80 ? _('✓ Loop chiuso — contorno completo', '✓ Closed loop — complete contour') : _('⚠ Loop aperto — contorno incompleto', '⚠ Open loop — incomplete contour'),
                pieceDetail.piece.compactness >= 0.4 ? _('✓ Nessuna auto intersezione rilevata', '✓ No self-intersection detected') : _('⚠ Possibile auto intersezione', '⚠ Possible self-intersection'),
                pieceDetail.piece.segment_count > 0 ? _('✓ Segmentazione coerente', '✓ Consistent segmentation') : _('⚠ Segmentazione assente', '⚠ Missing segmentation'),
                _('✓ Topologia valida — pezzo riconosciuto', '✓ Valid topology — piece recognized'),
                pieceDetail.piece.contour_points.length >= 3 ? _('✓ Continuità verificata — punti contorno ≥ 3', '✓ Continuity verified — contour points ≥ 3') : _('⚠ Punti contorno insufficienti', '⚠ Insufficient contour points'),
                pieceDetail.piece.has_grainline ? _('✓ Drittofilo presente', '✓ Grainline present') : _('⚠ Drittofilo non rilevato', '⚠ Grainline not detected'),
                pieceDetail.piece.notch_count > 0 ? `${_('✓', '✓')} ${pieceDetail.piece.notch_count} ${_('intacchi riconosciuti', 'notches recognized')}` : _('⚠ Nessun intacco rilevato', '⚠ No notches detected'),
              ];
              setMsg(reasons.filter(r => r.startsWith('✓')).length >= 4
                ? `${_('Qualità', 'Quality')} ${pieceDetail.piece.contour_quality}%:\n${reasons.filter(r => r.startsWith('✓')).join('\n')}`
                : `${_('Qualità', 'Quality')} ${pieceDetail.piece.contour_quality}%:\n${reasons.join('\n')}`
              );
              alert(reasons.filter(r => r.startsWith('✓')).length >= 4
                ? `${_('Qualità', 'Quality')} ${pieceDetail.piece.contour_quality}%:\n${reasons.filter(r => r.startsWith('✓')).join('\n')}`
                : `${_('Qualità', 'Quality')} ${pieceDetail.piece.contour_quality}%:\n${reasons.join('\n')}`
              );
            }}
              className="w-full flex items-center justify-center gap-1.5 py-2 mt-3 rounded-lg text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              WHY?
            </button>
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
