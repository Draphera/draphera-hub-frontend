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
  type: 'line' | 'arc' | 'circle';
  points?: [number, number][];
  cx?: number; cy?: number; radius?: number;
  startAngle?: number; endAngle?: number;
}

interface HPGLData {
  paths: HPGLPath[];
  meta: { total_paths: number; lines: number; arcs: number; circles: number; dimensions: { width: number; height: number } };
}

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
      let cx = 0, cy = 0, penDown = false;
      const lines = text.matchAll(/(PU|PD|PA|PR|AA|CI|SP)\s*((?:-?\d+(?:\.\d+)?\s*,?\s*)*)/gi);
      for (const m of lines) {
        const cmd = m[1].toUpperCase();
        const nums = m[2].trim().split(/[\s,]+/).filter(Boolean).map(Number);
        if (cmd === 'PU' && nums.length >= 2) { cx = nums[0]; cy = nums[1]; penDown = false; }
        else if (cmd === 'PD' && nums.length >= 2) {
          if (!penDown) { penDown = true; cx = nums[0]; cy = nums[1]; }
          else { paths.push({ type: 'line', points: [[cx, cy], [nums[0], nums[1]]] }); cx = nums[0]; cy = nums[1]; }
        }
        else if (cmd === 'PA' && nums.length >= 2) { cx = nums[0]; cy = nums[1]; }
        else if (cmd === 'CI' && nums.length >= 1) { paths.push({ type: 'circle', cx, cy, radius: nums[0] }); }
        else if (cmd === 'AA' && nums.length >= 3) { paths.push({ type: 'arc', cx: nums[0], cy: nums[1], radius: Math.abs(nums[2]), startAngle: 0, endAngle: 360 }); }
      }
      setHpglData({ paths, meta: { total_paths: paths.length, lines: paths.filter(p => p.type === 'line').length, arcs: paths.filter(p => p.type === 'arc').length, circles: paths.filter(p => p.type === 'circle').length, dimensions: { width: 400, height: 300 } } });
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
        <ViewerCanvas data={hpglData} zoom={zoom} invertColors={invertColors} snapGrid={snapGrid && gridOn} viewMode={viewMode} />
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
