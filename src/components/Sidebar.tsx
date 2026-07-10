'use client';

import { useTranslation } from '@/lib/i18n';

interface SidebarProps {
  onFileUpload: (file: File) => void;
  invertColors: boolean;
  onToggleInvert: () => void;
  zoom: number;
  onZoomChange: (z: number) => void;
  unit: 'cm' | 'inch';
  onUnitChange: (u: 'cm' | 'inch') => void;
  snapGrid: boolean;
  onToggleSnap: () => void;
  snapMeasure: boolean;
  onToggleSnapMeasure: () => void;
  viewMode: 'outline' | 'tack' | 'measurement' | 'selection';
  onViewModeChange: (v: 'outline' | 'tack' | 'measurement' | 'selection') => void;
  pens?: number[];
  penVisibility?: Record<number, boolean>;
  onPenToggle?: (pen: number) => void;
  penColors?: Record<number, string>;
  onPenColorChange?: (pen: number, color: string) => void;
  flattened?: boolean;
  onToggleFlattened?: () => void;
  showNotches?: boolean;
  onToggleNotches?: () => void;
  filled?: boolean;
  onToggleFilled?: () => void;
  showBounds?: boolean;
  onToggleBounds?: () => void;
  rotation?: 0 | 90 | 180 | 270;
  onRotateLeft?: () => void;
  onRotateRight?: () => void;
  flipX?: boolean;
  onFlipX?: () => void;
  flipY?: boolean;
  onFlipY?: () => void;
  onResetTransform?: () => void;
  ocrLoading?: boolean;
  ocrTextsCount?: number;
  onOcr?: () => void;
  formatFamily?: string;
}

export default function Sidebar({
  onFileUpload, invertColors, onToggleInvert, zoom, onZoomChange,
  unit, onUnitChange, snapGrid, onToggleSnap, snapMeasure, onToggleSnapMeasure,
  viewMode, onViewModeChange,
  pens, penVisibility, onPenToggle, penColors, onPenColorChange,
  flattened, onToggleFlattened,
  showNotches, onToggleNotches,
  filled, onToggleFilled,
  showBounds, onToggleBounds,
  rotation, onRotateLeft, onRotateRight, flipX, onFlipX, flipY, onFlipY, onResetTransform,
  ocrLoading, ocrTextsCount, onOcr, formatFamily,
}: SidebarProps) {
  const { t } = useTranslation();

  const VALID_EXTENSIONS = ['.hpgl', '.plt', '.hpg'];
  const isValidFile = (f: File) => {
    const name = f.name.toLowerCase();
    // Accept known HPGL extensions OR files with no extension at all
    return VALID_EXTENSIONS.some(ext => name.endsWith(ext)) || !name.includes('.');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && isValidFile(f)) onFileUpload(f);
  };
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && isValidFile(f)) onFileUpload(f);
  };

  return (
    <aside className="fixed left-0 top-14 bottom-0 w-[260px] bg-drapera-midnight border-r border-drapera-border overflow-y-auto z-40">
      <div className="p-4 space-y-5">
        <div>
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-drapera-steel-light mb-2.5">{t('sidebar.upload_title')}</h3>
          <div onDragOver={e => e.preventDefault()} onDrop={handleDrop}
            className="border-2 border-dashed border-drapera-border rounded-xl p-5 text-center hover:border-drapera-gold/40 transition-colors cursor-pointer group"
            onClick={() => document.getElementById('hpgl-upload')?.click()}>
            <svg className="w-7 h-7 mx-auto text-drapera-steel-light mb-2 group-hover:text-drapera-gold transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l3 3h7a2 2 0 012 2v7a2 2 0 01-2 2H5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 11v5m0 0l-2-2m2 2l2-2" />
            </svg>
            <p className="text-[11px] text-drapera-steel-light group-hover:text-gray-300 transition-colors">{t('sidebar.upload_hint')}</p>
          </div>
          <input id="hpgl-upload" type="file" onChange={handleInput} className="hidden" />
        </div>

        <div className="h-px bg-drapera-border" />

        <div>
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-drapera-steel-light mb-3">{t('sidebar.settings')}</h3>
          <div className="space-y-3.5">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs text-gray-400">{t('sidebar.invert_colors')}</span>
              <button onClick={onToggleInvert} className={`w-8 h-4 rounded-full transition-colors relative ${invertColors ? 'bg-drapera-gold' : 'bg-drapera-border'}`}>
                <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${invertColors ? 'translate-x-[17px]' : 'translate-x-0.5'}`} />
              </button>
            </label>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-xs text-gray-400">{t('sidebar.zoom')}</span>
                <span className="text-[10px] text-drapera-steel-light">{Math.round(zoom * 100)}%</span>
              </div>
              <input type="range" min={0.1} max={5} step={0.05} value={zoom}
                onChange={e => onZoomChange(parseFloat(e.target.value))}
                className="w-full h-1 bg-drapera-border rounded-full appearance-none cursor-pointer accent-drapera-gold" />
            </div>

            <div>
              <span className="text-xs text-gray-400 block mb-1.5">{t('sidebar.units')}</span>
              <div className="flex rounded-lg border border-drapera-border overflow-hidden">
                <button onClick={() => onUnitChange('cm')} className={`flex-1 py-1.5 text-[11px] font-medium transition-colors ${unit === 'cm' ? 'bg-drapera-gold text-drapera-dark' : 'text-gray-500 hover:text-white'}`}>{t('sidebar.cm')}</button>
                <button onClick={() => onUnitChange('inch')} className={`flex-1 py-1.5 text-[11px] font-medium transition-colors ${unit === 'inch' ? 'bg-drapera-gold text-drapera-dark' : 'text-gray-500 hover:text-white'}`}>{t('sidebar.inch')}</button>
              </div>
            </div>

          </div>
        </div>

        {/* View mode + toggles */}
        <div className="h-px bg-drapera-border" />
        <div>
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-drapera-steel-light mb-2.5">Visualizzazione</h3>
          <div className="space-y-1">
            {([
              { key: 'outline' as const, label: 'Contorno', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
              { key: 'tack' as const, label: 'Tack', icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
              { key: 'measurement' as const, label: 'Misure', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
            ]).map(mode => (
              <button key={mode.key} onClick={() => onViewModeChange(mode.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all ${
                  viewMode === mode.key
                    ? 'bg-drapera-gold/10 text-drapera-gold border border-drapera-gold/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}>
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={mode.icon} />
                </svg>
                {mode.label}
              </button>
            ))}
          </div>
          <div className="mt-2 space-y-1.5">
            <label className="flex items-center justify-between cursor-pointer px-1">
              <span className="text-[11px] text-gray-400">{t('sidebar.snap_grid')}</span>
              <button onClick={onToggleSnap} className={`w-7 h-3.5 rounded-full transition-colors relative ${snapGrid ? 'bg-drapera-gold' : 'bg-drapera-border'}`}>
                <span className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-transform ${snapGrid ? 'translate-x-[14px]' : 'translate-x-0.5'}`} />
              </button>
            </label>
            <label className="flex items-center justify-between cursor-pointer px-1">
              <span className="text-[11px] text-gray-400">Snap misure</span>
              <button onClick={onToggleSnapMeasure} className={`w-7 h-3.5 rounded-full transition-colors relative ${snapMeasure ? 'bg-drapera-gold' : 'bg-drapera-border'}`}>
                <span className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-transform ${snapMeasure ? 'translate-x-[14px]' : 'translate-x-0.5'}`} />
              </button>
            </label>
            {pens && pens.length > 0 && (
              <label className="flex items-center justify-between cursor-pointer px-1">
                <span className="text-[11px] text-gray-400">Mostra intagli</span>
                <button onClick={onToggleNotches} className={`w-7 h-3.5 rounded-full transition-colors relative ${showNotches ? 'bg-drapera-gold' : 'bg-drapera-border'}`}>
                  <span className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-transform ${showNotches ? 'translate-x-[14px]' : 'translate-x-0.5'}`} />
                </button>
              </label>
            )}
            <label className="flex items-center justify-between cursor-pointer px-1">
              <span className="text-[11px] text-gray-400">Riempimento</span>
              <button onClick={onToggleFilled} className={`w-7 h-3.5 rounded-full transition-colors relative ${filled ? 'bg-drapera-gold' : 'bg-drapera-border'}`}>
                <span className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-transform ${filled ? 'translate-x-[14px]' : 'translate-x-0.5'}`} />
              </button>
            </label>
            <label className="flex items-center justify-between cursor-pointer px-1">
              <span className="text-[11px] text-gray-400">Bordi pattern</span>
              <button onClick={onToggleBounds} className={`w-7 h-3.5 rounded-full transition-colors relative ${showBounds ? 'bg-drapera-gold' : 'bg-drapera-border'}`}>
                <span className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-transform ${showBounds ? 'translate-x-[14px]' : 'translate-x-0.5'}`} />
              </button>
            </label>
            <div className="pt-1.5 px-1">
              <span className="text-[10px] text-gray-500 font-semibold block mb-1.5">Rotazione / Flip</span>
              <div className="flex items-center gap-1">
                <button onClick={onRotateLeft}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[10px] transition-colors ${(rotation ?? 0) !== 0 ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-gray-500 hover:text-white hover:bg-white/5 border border-transparent'}`}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  <span className="text-[9px]">⟲</span>
                </button>
                <button onClick={onRotateRight}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[10px] transition-colors ${(rotation ?? 0) !== 0 ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-gray-500 hover:text-white hover:bg-white/5 border border-transparent'}`}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  <span className="text-[9px]">⟳</span>
                </button>
                <button onClick={onFlipX}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[10px] transition-colors ${flipX ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-gray-500 hover:text-white hover:bg-white/5 border border-transparent'}`}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                  <span className="text-[9px]">↔</span>
                </button>
                <button onClick={onFlipY}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[10px] transition-colors ${flipY ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-gray-500 hover:text-white hover:bg-white/5 border border-transparent'}`}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
                  <span className="text-[9px]">↕</span>
                </button>
                <button onClick={onResetTransform}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[10px] text-gray-500 hover:text-white hover:bg-white/5 border border-transparent">
                  <span className="text-[9px]">↺</span>
                  <span className="text-[8px]">reset</span>
                </button>
              </div>
            </div>
            {formatFamily === 'hpgl' && (
              <div className="mt-2">
                <button onClick={onOcr} disabled={ocrLoading}
                  className="w-full flex items-center justify-center gap-2 py-1.5 rounded text-[10px] font-medium transition-all bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 disabled:opacity-40">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  {ocrLoading ? 'OCR in corso...' : ocrTextsCount ? `OCR (${ocrTextsCount} testi)` : 'Riconosci testi'}
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </aside>
  );
}
