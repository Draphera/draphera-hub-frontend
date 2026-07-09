'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';

const PALETTE = ['#F2C94C','#00E5FF','#FF4081','#00E676','#FF9100','#448AFF','#E040FB','#FF1744','#FFFFFF','#69F0AE','#FFD740','#40C4FF'];

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
  pens?: number[];
  penVisibility?: Record<number, boolean>;
  onPenToggle?: (pen: number) => void;
  penColors?: Record<number, string>;
  onPenColorChange?: (pen: number, color: string) => void;
  flattened?: boolean;
  onToggleFlattened?: () => void;
}

export default function Sidebar({
  onFileUpload, invertColors, onToggleInvert, zoom, onZoomChange,
  unit, onUnitChange, snapGrid, onToggleSnap,
  pens, penVisibility, onPenToggle, penColors, onPenColorChange,
  flattened, onToggleFlattened,
}: SidebarProps) {
  const { t } = useTranslation();

  const VALID_EXTENSIONS = ['.hpgl', '.plt', '.hpg', '.iso', '.dxf'];
  const isValidFile = (f: File) => VALID_EXTENSIONS.some(ext => f.name.toLowerCase().endsWith(ext));

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
          <input id="hpgl-upload" type="file" accept=".hpgl,.plt,.hpg,.iso,.dxf" onChange={handleInput} className="hidden" />
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

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs text-gray-400">{t('sidebar.snap_grid')}</span>
              <button onClick={onToggleSnap} className={`w-8 h-4 rounded-full transition-colors relative ${snapGrid ? 'bg-drapera-gold' : 'bg-drapera-border'}`}>
                <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${snapGrid ? 'translate-x-[17px]' : 'translate-x-0.5'}`} />
              </button>
            </label>
          </div>
        </div>

        {/* Pen layers */}
        {pens && pens.length > 0 && (
          <>
            <div className="h-px bg-drapera-border" />
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-drapera-steel-light">Penne</h3>
                <button onClick={onToggleFlattened}
                  className={`text-[9px] px-2 py-0.5 rounded font-medium transition-colors ${
                    flattened ? 'bg-drapera-gold/15 text-drapera-gold border border-drapera-gold/20' : 'text-gray-500 border border-drapera-border hover:text-white'
                  }`}>
                  {flattened ? 'Unificate' : 'Separate'}
                </button>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {pens.map(p => {
                  const visible = penVisibility?.[p] ?? true;
                  const color = penColors?.[p] ?? PALETTE[p % PALETTE.length];
                  return (
                    <div key={p} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
                      <button onClick={() => onPenToggle?.(p)}
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                          visible ? 'bg-drapera-gold/20 border-drapera-gold/40' : 'bg-drapera-dark border-drapera-border'
                        }`}>
                        {visible && <svg className="w-2.5 h-2.5 text-drapera-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </button>
                      <span className="text-[10px] text-gray-400 w-8 font-mono">SP{p}</span>
                      <input type="color"
                        value={color}
                        onChange={e => onPenColorChange?.(p, e.target.value)}
                        className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0"
                        disabled={!visible}
                      />
                      <div className="flex-1 h-3 rounded" style={{ backgroundColor: visible ? color : 'transparent', opacity: visible ? 1 : 0.2 }} />
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
