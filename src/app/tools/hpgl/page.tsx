'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import ViewerCanvas from '@/components/ViewerCanvas';
import InfoPanel from '@/components/InfoPanel';
import FooterActions from '@/components/FooterActions';
import { hpglApi } from '@/lib/api';
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
}

const APP_VERSION = '1.0.0';

export default function HPGLViewerPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [hpglData, setHpglData] = useState<HPGLData | null>(null);
  const [fileName, setFileName] = useState('');
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [zoom, setZoom] = useState(1);
  const [invertColors, setInvertColors] = useState(false);
  const [unit, setUnit] = useState<'cm' | 'inch'>('cm');
  const [snapGrid, setSnapGrid] = useState(true);
  const [viewMode, setViewMode] = useState<'outline' | 'tack' | 'measurement'>('outline');
  const [gridOn, setGridOn] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.push('/auth/signin?redirect=/tools/hpgl'); return; }
      setSession(data.session);
      setLoading(false);
    });
  }, [router]);

  const handleFileUpload = useCallback(async (file: File) => {
    setFileName(file.name);
    setRawFile(file);
    try {
      const result = await hpglApi.parse(file);
      setHpglData(result);
    } catch {
      const text = await file.text();
      const paths: HPGLPath[] = [];
      let cx = 0, cy = 0, penDown = false, currentPen = 0, currentLineType = 0, currentPenWidth = 0.25, currentPoly: HPGLPath | null = null;
      const flush = () => {
        if (currentPoly && currentPoly.points!.length >= 2) {
          const pts = currentPoly.points!;
          const first = pts[0], last = pts[pts.length - 1];
          currentPoly.closed = Math.abs(first[0] - last[0]) < 0.5 && Math.abs(first[1] - last[1]) < 0.5;
          paths.push(currentPoly);
        }
        currentPoly = null;
      };
      const lines = Array.from(text.matchAll(/(IN|PU|PD|PA|PR|AA|CI|SP|LT|VS|PW|EA|ER|RA|RR|LB|DF|RO|IP|SC|DT|DI|DR|SI|SR|SA|SS|SM|AT|RT|PG)\s*((?:-?\d+(?:\.\d+)?(?:\s*,?\s*-?\d+(?:\.\d+)?)*)?)/gi));
      for (const m of lines) {
        const cmd = m[1].toUpperCase();
        const nums = m[2].trim().split(/[\s,]+/).filter(Boolean).map(Number);
        if (cmd === 'IN') { flush(); cx = cy = 0; penDown = false; currentPen = 0; currentLineType = 0; }
        else if (cmd === 'DF') { flush(); currentPen = 0; currentLineType = 0; }
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
        else if (cmd === 'RO' && nums.length >= 1) { /* rotation tracking */ }
        else if (cmd === 'PG') { flush(); }
      }
      flush();
      const pens = paths.reduce<number[]>((acc, p) => { const pen = p.pen ?? 0; if (!acc.includes(pen)) acc.push(pen); return acc; }, []);
      setHpglData({ paths, meta: { total_paths: paths.length, polylines: paths.filter(p => p.type === 'polyline').length, arcs: paths.filter(p => p.type === 'arc').length, circles: paths.filter(p => p.type === 'circle').length, rectangles: paths.filter(p => p.type === 'rectangle').length, labels: paths.filter(p => p.type === 'label').length, dimensions: { width: 400, height: 300 }, pens } });
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
        <ViewerCanvas data={hpglData ?? null} zoom={zoom} invertColors={invertColors} snapGrid={snapGrid && gridOn} viewMode={viewMode} />
      </main>
      <InfoPanel meta={hpglData?.meta ?? null} fileName={fileName} viewMode={viewMode} onViewModeChange={setViewMode} />
      <FooterActions
        onZoomIn={() => setZoom(z => Math.min(5, z + 0.15))}
        onZoomOut={() => setZoom(z => Math.max(0.1, z - 0.15))}
        onFitToScreen={() => setZoom(1)}
        gridOn={gridOn} onToggleGrid={() => setGridOn(v => !v)}
        onExportPng={handleExportPng} onExportSvg={handleExportSvg} hasFile={!!hpglData}
      />
    </div>
  );
}
