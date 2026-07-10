'use client';

import { useTranslation } from '@/lib/i18n';
import { useState } from 'react';

interface Props {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToScreen: () => void;
  onToggleMeasure: () => void;
  measureMode?: 'off' | 'distance' | 'angle';
  onMeasureModeChange?: (m: 'off' | 'distance' | 'angle') => void;
  gridOn: boolean;
  onToggleGrid: () => void;
  onExportPng: () => void;
  onExportSvg: () => void;
  onCopySvg: () => void;
  onExportCsv: () => void;
  onExportPdf: () => void;
  onToggleSelection: () => void;
  onExportSelection: () => void;
  hasFile: boolean;
  selectionActive: boolean;
  selectionExists: boolean;
}

export default function FooterActions({
  onZoomIn, onZoomOut, onFitToScreen, onToggleMeasure, measureMode, onMeasureModeChange,
  gridOn, onToggleGrid, onExportPng, onExportSvg,
  onCopySvg, onExportCsv, onExportPdf, onToggleSelection, onExportSelection,
  hasFile, selectionActive, selectionExists,
}: Props) {
  const { t } = useTranslation();
  const [showExport, setShowExport] = useState(false);

  const isMeasuring = measureMode && measureMode !== 'off';

  const actions = [
    { key: 'zoomin', label: t('footer.zoom_in'), icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6' },
    { key: 'zoomout', label: t('footer.zoom_out'), icon: 'M20 12H4' },
    { key: 'fit', label: t('footer.fit_to_screen'), icon: 'M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4' },
    { key: 'measure', label: t('footer.measure'), icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { key: 'grid', label: t('footer.grid'), icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
  ];

  const exportOptions = [
    { key: 'png', label: 'PNG', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4' },
    { key: 'svg', label: 'SVG', icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
    { key: 'copy', label: 'Copia SVG', icon: 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z' },
    { key: 'csv', label: 'CSV features', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { key: 'pdf', label: 'PDF scheda', icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
    { key: 'sel', label: 'Seleziona area', icon: 'M4 5a1 1 0 011-1h4a1 1 0 010 2H6v3a1 1 0 01-2 0V5zm14 14a1 1 0 01-1 1h-4a1 1 0 010-2h3v-3a1 1 0 012 0v4zM4 19a1 1 0 001 1h4a1 1 0 000-2H6v-3a1 1 0 00-2 0v4zm14-14a1 1 0 00-1-1h-4a1 1 0 000 2h3v3a1 1 0 002 0V5z' },
  ];

  const exportHandlers: Record<string, () => void> = {
    png: onExportPng,
    svg: onExportSvg,
    copy: onCopySvg,
    csv: onExportCsv,
    pdf: onExportPdf,
    sel: onToggleSelection,
  };

  return (
    <footer className="fixed bottom-0 left-[260px] right-[260px] h-12 bg-drapera-dark border-t border-drapera-border flex items-center justify-center gap-0.5 px-3 z-40">
      {/* Main actions */}
      {actions.map(a => {
        if (a.key === 'measure') {
          return (
            <div key="measure-group" className="flex items-center gap-0.5">
              <button onClick={onToggleMeasure}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] transition-all ${
                  isMeasuring
                    ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                    : 'text-gray-500 hover:text-white hover:bg-white/5 border border-transparent'
                }`} title={a.label}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={a.icon} />
                </svg>
                <span className="hidden lg:inline">{a.label}</span>
              </button>
              {isMeasuring && onMeasureModeChange && (
                <div className="flex gap-0.5 ml-1">
                  <button onClick={() => onMeasureModeChange('distance')}
                    className={`px-2 py-1 rounded text-[9px] font-medium transition-colors ${
                      measureMode === 'distance' ? 'bg-red-500/20 text-red-300' : 'text-gray-500 hover:text-white'
                    }`}>Distanza</button>
                  <button onClick={() => onMeasureModeChange('angle')}
                    className={`px-2 py-1 rounded text-[9px] font-medium transition-colors ${
                      measureMode === 'angle' ? 'bg-red-500/20 text-red-300' : 'text-gray-500 hover:text-white'
                    }`}>Angolo</button>
                </div>
              )}
            </div>
          );
        }
        const handler = {
          zoomin: onZoomIn, zoomout: onZoomOut, fit: onFitToScreen,
          grid: onToggleGrid,
        }[a.key];
        return (
          <button key={a.key} onClick={handler}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] transition-all ${
              a.key === 'grid' && gridOn
                ? 'bg-drapera-gold/10 text-drapera-gold border border-drapera-gold/20'
                : 'text-gray-500 hover:text-white hover:bg-white/5 border border-transparent'
            }`} title={a.label}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={a.icon} />
            </svg>
            <span className="hidden lg:inline">{a.label}</span>
          </button>
        );
      })}

      {/* Export selection button (only when selection active) */}
      {selectionActive && selectionExists && (
        <button onClick={onExportSelection}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
          title="Export area selezionata">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Export area</span>
        </button>
      )}

      {/* Export dropdown */}
      <div className="relative">
        <button onClick={() => setShowExport(v => !v)}
          onBlur={() => setTimeout(() => setShowExport(false), 150)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] transition-all ${
            showExport ? 'bg-drapera-gold/10 text-drapera-gold border border-drapera-gold/20' : 'text-gray-500 hover:text-white hover:bg-white/5 border border-transparent'
          }`} title="Export">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="hidden lg:inline">Export</span>
        </button>

        {showExport && (
          <div className="absolute bottom-full mb-1.5 right-0 min-w-[160px] rounded-lg border border-drapera-border bg-drapera-midnight shadow-xl py-1"
            style={{ backdropFilter: 'blur(12px)' }}>
            {exportOptions.map(opt => {
              const isSel = opt.key === 'sel';
              const active = isSel && selectionActive;
              return (
                <button key={opt.key} onClick={() => {
                  if (isSel) { onToggleSelection(); setShowExport(false); return; }
                  if (opt.key === 'png' || opt.key === 'svg') {
                    if (!hasFile) return;
                  }
                  exportHandlers[opt.key]?.();
                  setShowExport(false);
                }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] transition-all ${
                    active
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : isSel
                        ? 'text-gray-300 hover:bg-white/5 hover:text-white'
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  } disabled:opacity-30 disabled:cursor-not-allowed`}>
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={opt.icon} />
                  </svg>
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </footer>
  );
}
