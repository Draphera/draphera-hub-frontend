'use client';

import { useTranslation } from '@/lib/i18n';

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
  hasFile: boolean;
}

export default function FooterActions({
  onZoomIn, onZoomOut, onFitToScreen, onToggleMeasure, measureMode, onMeasureModeChange,
  gridOn, onToggleGrid, onExportPng, onExportSvg, hasFile,
}: Props) {
  const { t } = useTranslation();

  const actions = [
    { key: 'zoomin', label: t('footer.zoom_in'), icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6' },
    { key: 'zoomout', label: t('footer.zoom_out'), icon: 'M20 12H4' },
    { key: 'fit', label: t('footer.fit_to_screen'), icon: 'M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4' },
    { key: 'measure', label: t('footer.measure'), icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { key: 'grid', label: t('footer.grid'), icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
    { key: 'png', label: t('footer.export_png'), icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4' },
    { key: 'svg', label: t('footer.export_svg'), icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
  ];

  const isMeasuring = measureMode && measureMode !== 'off';

  return (
    <footer className="fixed bottom-0 left-[260px] right-[260px] h-12 bg-drapera-dark border-t border-drapera-border flex items-center justify-center gap-0.5 px-3 z-40">
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
          grid: onToggleGrid, png: onExportPng, svg: onExportSvg,
        }[a.key];
        return (
          <button key={a.key} onClick={handler}
            disabled={(a.key === 'png' || a.key === 'svg') && !hasFile}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] transition-all ${
              a.key === 'grid' && gridOn
                ? 'bg-drapera-gold/10 text-drapera-gold border border-drapera-gold/20'
                : 'text-gray-500 hover:text-white hover:bg-white/5 border border-transparent'
            } disabled:opacity-30 disabled:cursor-not-allowed`} title={a.label}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={a.icon} />
            </svg>
            <span className="hidden lg:inline">{a.label}</span>
          </button>
        );
      })}
    </footer>
  );
}
