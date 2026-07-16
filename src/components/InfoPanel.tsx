'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';

interface HPGLMeta {
  total_paths: number;
  polylines: number;
  arcs: number;
  circles: number;
  rectangles: number;
  labels: number;
  labelChars?: number;
  dimensions: { width: number; height: number };
  pens: number[];
}

interface CADInfo {
  cad: string;
  confidence: string;
  score: number;
}

interface MLInfo {
  ml_cad: string;
  ml_confidence: number;
  ml_scores: Record<string, number>;
  final_cad?: string;
  final_confidence?: number;
  source?: string;
  note?: string;
}

interface SelectedPathInfo {
  type: string;
  vertices: number;
  pen: number;
  lineType: number;
  closed?: boolean;
  length?: number;
  firstPoint?: [number, number];
}

interface FormatInfo {
  family: string;
  variant: string;
  astmStandard?: string | null;
  comments: string[];
}

interface MeasureResultInfo {
  type: 'distance' | 'angle';
  value: number;
}

const PALETTE = ['#F2C94C','#00E5FF','#FF4081','#00E676','#FF9100','#448AFF','#E040FB','#FF1744','#FFFFFF','#69F0AE','#FFD740','#40C4FF'];

interface Props {
  meta: HPGLMeta | null;
  fileName: string;
  cad?: CADInfo | null;
  ml?: MLInfo | null;
  features?: Record<string, unknown>;
  onCorrectCad?: (correctedCadId: string) => void;
  onOpenCadModal?: () => void;
  userSelectedCad?: string | null;
  selectedPath?: SelectedPathInfo | null;
  measureResults?: MeasureResultInfo[];
  formatInfo?: FormatInfo;
  pens?: number[];
  penVisibility?: Record<number, boolean>;
  onPenToggle?: (pen: number) => void;
  penColors?: Record<number, string>;
  onPenColorChange?: (pen: number, color: string) => void;
  flattened?: boolean;
  onToggleFlattened?: () => void;
  pieces?: Array<{ id: number; minx: number; miny: number; maxx: number; maxy: number; area: number; notch_count: number; has_grainline: boolean }>;
  piecesLoading?: boolean;
  onDetectPieces?: () => void;
  selectedPiece?: { id: number; area: number; perimeter?: number; notch_count: number; has_grainline: boolean; minx?: number; miny?: number; maxx?: number; maxy?: number; cut_order?: number; complexity?: number; contour_quality?: number };
  isAdmin?: boolean;
  filteredContours?: Array<{ type: 'placement_rect' | 'block_fuse'; contour_points: number[][] }>;
  showPlacementRect?: boolean;
  onTogglePlacementRect?: () => void;
  showBlockFuse?: boolean;
  onToggleBlockFuse?: () => void;
  showCutOrder?: boolean;
  onToggleCutOrder?: () => void;
  showStartPoints?: boolean;
  onToggleStartPoints?: () => void;
  cleanView?: boolean;
  onToggleCleanView?: () => void;
}

const APP_VERSION = '1.2.0';
const VE_VERSION = '1.0.0';

export default function InfoPanel({ meta, fileName, cad, ml, features, onCorrectCad, onOpenCadModal, userSelectedCad, selectedPath, formatInfo, pens, penVisibility, onPenToggle, penColors, onPenColorChange, flattened, onToggleFlattened, pieces, piecesLoading, onDetectPieces, selectedPiece, isAdmin, filteredContours, showPlacementRect, onTogglePlacementRect, showBlockFuse, onToggleBlockFuse, showCutOrder, onToggleCutOrder, showStartPoints, onToggleStartPoints, cleanView, onToggleCleanView }: Props) {
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<'info' | 'analysis'>('info');

  return (
    <aside className="fixed right-0 top-14 bottom-0 w-[260px] bg-drapera-midnight border-l border-drapera-border overflow-y-auto z-40">
      <div className="p-3 space-y-3">
        <div>
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-drapera-steel-light mb-2">{t('info.title')}</h3>
          <div className="h-px bg-drapera-border mt-2.5" />
        </div>

        {/* Tabs */}
        {(pens?.length || selectedPath || filteredContours?.length || (pieces?.length ?? 0) >= 1 || (isAdmin && onDetectPieces)) && (
          <div className="flex rounded-lg border border-drapera-border overflow-hidden">
            <button onClick={() => setActiveTab('info')}
              className={`flex-1 py-1 text-[9px] font-medium transition-colors ${activeTab === 'info' ? 'bg-drapera-gold/10 text-drapera-gold border-b-2 border-drapera-gold' : 'text-gray-500 hover:text-white'}`}>
              Info file
            </button>
            <button onClick={() => setActiveTab('analysis')}
              className={`flex-1 py-1 text-[9px] font-medium transition-colors ${activeTab === 'analysis' ? 'bg-cyan-500/10 text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-500 hover:text-white'}`}>
              Analisi
            </button>
          </div>
        )}

        {/* --- Tab 1: Info file --- */}
        {activeTab === 'info' && (
          <div className="space-y-3">
            {/* Main CAD result: prefer user selection, then ML, then rule-based */}
            <div className={`px-2.5 py-1.5 rounded-lg border ${
              ml?.source === 'user_correction'
                ? 'bg-emerald-500/10 border-emerald-500/20'
                : userSelectedCad
                  ? 'bg-amber-500/10 border-amber-500/20'
                  : !ml
                    ? 'bg-drapera-gold/5 border-drapera-gold/15'
                    : ml.source === 'no_model'
                      ? 'bg-gray-500/5 border-gray-500/15'
                      : ml.source === 'ml_rule_agreement'
                        ? 'bg-green-500/5 border-green-500/15'
                        : 'bg-cyan-500/5 border-cyan-500/15'
            }`}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[9px] font-semibold uppercase tracking-wider"
                  style={{ color: ml?.source === 'user_correction' ? '#34D399' : userSelectedCad ? '#FBBF24' : !ml ? '#F2C94C' : ml.source === 'no_model' ? '#9CA3AF' : '#22D3EE' }}>
                  {ml?.source === 'user_correction' ? 'Verified by Human' :
                   userSelectedCad ? 'Modello non addestrato' :
                   !ml ? t('cad.detected') :
                   ml.source === 'no_model' ? 'Modello non addestrato' :
                   ml.source === 'ml_rule_agreement' ? t('info.ml_agreement') :
                   ml.source === 'rule_based_fallback' ? t('info.ml_fallback') :
                   t('info.ml_only')}
                </span>
                {ml?.source === 'user_correction' && (
                  <span className="text-[10px] font-bold text-emerald-400">100%</span>
                )}
                {!userSelectedCad && ml && ml.source !== 'user_correction' && (
                  <span className={`text-[10px] font-bold ${(ml.final_confidence ?? ml.ml_confidence) > 0.8 ? 'text-green-400' : (ml.final_confidence ?? ml.ml_confidence) > 0.5 ? 'text-yellow-400' : 'text-gray-500'}`}>
                    {ml.source === 'no_model' ? '—' : `${((ml.final_confidence ?? ml.ml_confidence) * 100).toFixed(0)}%`}
                  </span>
                )}
                {!userSelectedCad && !ml && cad && (
                  <span className={`ml-auto w-1 h-1 rounded-full ${cad.confidence === 'high' ? 'bg-green-400' : cad.confidence === 'medium' ? 'bg-yellow-400' : 'bg-gray-500'}`} />
                )}
              </div>
              <p className="text-[10px] text-white font-medium">
                {userSelectedCad
                  ? userSelectedCad
                  : ml
                    ? (ml.final_cad === 'general_hpgl' ? t('cad.general_hpgl') : ml.final_cad ?? ml.ml_cad)
                    : (cad ? t(`cad.${cad.cad}`) : t('cad.unknown'))}
              </p>
              {!userSelectedCad && ml?.note && (
                <p className="text-[9px] text-gray-500 mt-0.5 italic">{ml.note}</p>
              )}
              {!userSelectedCad && ml?.ml_scores && Object.keys(ml.ml_scores).length > 1 && (
                <div className="mt-1 space-y-0.5">
                  {Object.entries(ml.ml_scores).sort(([, a], [, b]) => b - a).slice(0, 3).map(([cad_, score]) => (
                    <div key={cad_} className="flex justify-between text-[9px]">
                      <span className="text-gray-500">{cad_}</span>
                      <span className="text-gray-400 font-mono">{(score * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CAD status message */}
            {(ml || userSelectedCad) && (
              <div className="px-2.5 py-1.5 rounded-lg bg-drapera-gold/5 border border-drapera-gold/10 text-[9px] text-gray-400 leading-relaxed">
                {ml?.source === 'user_correction' ? (
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                      <svg className="w-2.5 h-2.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </span>
                    <p>Corretto manualmente come <strong className="text-white">{ml.ml_cad}</strong>. Il campione verrà verificato e utilizato per migliorare VectorEngine.</p>
                  </div>
                ) : userSelectedCad ? (
                  <p>Questo file è stato assegnato a <strong className="text-white">{userSelectedCad}</strong>.</p>
                ) : ml?.source === 'no_model' ? (
                  <div>
                    <p>Modello non addestrato per questo CAD.</p>
                    {onOpenCadModal && (
                      <button onClick={onOpenCadModal}
                        className="mt-1.5 w-full py-1.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors">
                        Seleziona CAD
                      </button>
                    )}
                  </div>
                ) : ml?.final_cad ? (
                  <p>Rilevato: <strong className="text-white">{ml.final_cad}</strong> con confidence <strong className="text-white">{((ml.final_confidence ?? 0) * 100).toFixed(0)}%</strong>.
                  {ml.final_confidence && ml.final_confidence < 0.65 && <> Se non è corretto, <button onClick={onOpenCadModal} className="text-amber-400 underline">seleziona il CAD</button>.</>}
                  </p>
                ) : null}
              </div>
            )}

            {/* File metadata */}
            <div className="space-y-1">
              {[
                { label: t('info.file_name'), value: fileName || '\u2014', cls: 'truncate max-w-[140px]', always: true },
                { label: t('info.dimensions'), value: meta ? `${Number.isFinite(meta.dimensions.width) ? meta.dimensions.width.toFixed(1) : '0'} \u00d7 ${Number.isFinite(meta.dimensions.height) ? meta.dimensions.height.toFixed(1) : '0'}` : '\u2014', always: true },
                { label: t('info.total_paths'), value: meta?.total_paths ?? '\u2014', always: true },
                { label: t('info.lines'), value: meta?.polylines, hideZero: true },
                { label: t('info.arcs'), value: meta?.arcs, hideZero: true },
                { label: t('info.circles'), value: meta?.circles, hideZero: true },
                { label: t('info.rectangles'), value: meta?.rectangles, hideZero: true },
                { label: t('info.labels'), value: meta?.labels, hideZero: true },
                { label: t('info.label_chars'), value: meta?.labelChars, hideZero: true },
                { label: t('info.pens'), value: meta?.pens?.length ? meta.pens.map(p => `#${p}`).join(', ') : '', hideZero: true },
              ].filter(f => f.always || (f.hideZero && f.value && f.value !== 0 && f.value !== '0')).map(f => (
                <div key={f.label} className="flex justify-between py-0.5 border-b border-drapera-border/20">
                  <span className="tech-label text-[9px]">{f.label}</span>
                  <span className={`tech-value text-right text-[9px] ${f.cls || ''}`}>{f.value}</span>
                </div>
              ))}
            </div>

            {/* Format line */}
            <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-amber-500/15 border border-amber-500/30">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 shrink-0">
                {t('info.format')}
              </span>
              <span className="text-xs font-bold font-mono text-white uppercase">
                {formatInfo
                  ? formatInfo.family === 'hpgl' ? 'HPGL/1' :
                    formatInfo.family === 'hpgl2' ? 'HPGL/2' :
                    formatInfo.family === 'astm' ? 'ASTM' : formatInfo.family
                  : meta && meta.labels > 0 ? 'HPGL/2' : 'HPGL/1'}
              </span>
              {formatInfo?.astmStandard && (
                <span className="text-[11px] text-amber-400 font-semibold">({formatInfo.astmStandard})</span>
              )}
            </div>

            <div className="pt-1">
              <p className="text-[9px] text-gray-600 text-center">Draphera Hub HPGL Viewer v{APP_VERSION} + VectorEngine v{VE_VERSION}</p>
            </div>
          </div>
        )}

        {/* --- Tab 2: Analisi --- */}
        {activeTab === 'analysis' && (
          <div className="space-y-3">
            {selectedPath && (
              <div className="px-2.5 py-1.5 rounded-lg bg-cyan-500/5 border border-cyan-500/15">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] text-cyan-400 font-semibold uppercase tracking-wider">Path selezionato</span>
                  <button onClick={() => {
                    const text = `Path #? Type: ${selectedPath.type}, Vertices: ${selectedPath.vertices}, Pen: SP${selectedPath.pen}, Length: ${selectedPath.length?.toFixed(1) ?? '?'}`;
                    navigator.clipboard.writeText(text);
                  }} className="text-[8px] text-gray-500 hover:text-cyan-400 transition-colors" title="Copia info">
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  </button>
                </div>
                <div className="space-y-0.5 text-[9px]">
                  <div className="flex justify-between"><span className="text-gray-500">Tipo</span><span className="text-white font-mono">{selectedPath.type}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Vertici</span><span className="text-white font-mono">{selectedPath.vertices}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Penna</span><span className="text-white font-mono">SP{selectedPath.pen}</span></div>
                  {selectedPath.lineType > 0 && <div className="flex justify-between"><span className="text-gray-500">Line type</span><span className="text-white font-mono">LT{selectedPath.lineType}</span></div>}
                  {selectedPath.closed !== undefined && <div className="flex justify-between"><span className="text-gray-500">Chiuso</span><span className="text-white font-mono">{selectedPath.closed ? 'Sì' : 'No'}</span></div>}
                  {selectedPath.length !== undefined && <div className="flex justify-between"><span className="text-gray-500">Lunghezza</span><span className="text-white font-mono">{selectedPath.length.toFixed(1)}</span></div>}
                  {selectedPath.firstPoint && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Coordinate</span>
                      <div className="flex items-center gap-1">
                        <span className="text-white font-mono text-[9px]">({selectedPath.firstPoint[0].toFixed(1)}, {selectedPath.firstPoint[1].toFixed(1)})</span>
                        <button onClick={() => navigator.clipboard.writeText(`${selectedPath.firstPoint![0].toFixed(1)},${selectedPath.firstPoint![1].toFixed(1)}`)} className="text-gray-600 hover:text-cyan-400 transition-colors" title="Copia coordinate">
                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {pens && pens.length > 0 && (
              <div className="px-3 py-2 rounded-lg bg-cyan-500/5 border border-cyan-500/15">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] text-cyan-400 font-semibold uppercase tracking-wider">Penne</span>
                  <button onClick={onToggleFlattened}
                    className={`text-[8px] px-1.5 py-0.5 rounded font-medium transition-colors ${
                      flattened ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20' : 'text-gray-500 border border-drapera-border hover:text-white'
                    }`}>
                    {flattened ? 'Unificate' : 'Separate'}
                  </button>
                </div>
                <div className="space-y-0.5 max-h-28 overflow-y-auto">
                  {pens.map(p => {
                    const visible = penVisibility?.[p] ?? true;
                    const color = penColors?.[p] ?? PALETTE[p % PALETTE.length];
                    return (
                      <div key={p} className="flex items-center gap-1.5 py-0.5">
                        <button onClick={() => onPenToggle?.(p)}
                          className={`w-3 h-3 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            visible ? 'bg-cyan-500/20 border-cyan-500/40' : 'bg-drapera-dark border-drapera-border'
                          }`}>
                          {visible && <svg className="w-1.5 h-1.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </button>
                        <span className="text-[8px] text-gray-400 w-5 font-mono">SP{p}</span>
                        <input type="color" value={color}
                          onChange={e => onPenColorChange?.(p, e.target.value)}
                          className="w-3 h-3 rounded cursor-pointer border-0 bg-transparent p-0 shrink-0" />
                        <div className="flex-1 h-1.5 rounded" style={{ backgroundColor: visible ? color : 'transparent', opacity: visible ? 1 : 0.15 }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {filteredContours && filteredContours.length > 0 && (
              <div className="px-3 py-2 rounded-lg bg-drapera-midnight/50 border border-drapera-border">
                <span className="text-[9px] text-gray-500 font-semibold uppercase tracking-wider mb-1.5 block">Contenitori</span>
                <div className="space-y-0.5">
                  {filteredContours.some(fc => fc.type === 'placement_rect') && (
                    <div className="flex items-center gap-2 py-0.5">
                      <button onClick={onTogglePlacementRect}
                        className={`w-3 h-3 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          showPlacementRect ? 'bg-red-500/20 border-red-500/40' : 'bg-drapera-dark border-drapera-border'
                        }`}>
                        {showPlacementRect && <svg className="w-1.5 h-1.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </button>
                      <div className="w-2 h-2 rounded-sm border border-red-400" />
                      <span className="text-[9px] text-gray-400">Piazzamento</span>
                    </div>
                  )}
                  {filteredContours.some(fc => fc.type === 'block_fuse') && (
                    <div className="flex items-center gap-2 py-0.5">
                      <button onClick={onToggleBlockFuse}
                        className={`w-3 h-3 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          showBlockFuse ? 'bg-blue-500/20 border-blue-500/40' : 'bg-drapera-dark border-drapera-border'
                        }`}>
                        {showBlockFuse && <svg className="w-1.5 h-1.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </button>
                      <div className="w-2 h-2 rounded-sm border border-dashed border-blue-400" />
                      <span className="text-[9px] text-gray-400">Block Fuse</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {pieces && pieces.length >= 1 && (
              <div className="px-3 py-2 rounded-lg bg-drapera-midnight/50 border border-drapera-border">
                <span className="text-[9px] text-gray-500 font-semibold uppercase tracking-wider mb-1.5 block">Taglio</span>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 py-0.5">
                    <button onClick={onToggleStartPoints}
                      className={`w-3 h-3 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        showStartPoints ? 'bg-red-500/20 border-red-500/40' : 'bg-drapera-dark border-drapera-border'
                      }`}>
                      {showStartPoints && <svg className="w-1.5 h-1.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </button>
                    <div className="w-1 h-1 rounded-full bg-red-400" />
                    <span className="text-[9px] text-gray-400">Punti partenza</span>
                  </div>
                  {pieces.length >= 2 && (
                    <div className="flex items-center gap-2 py-0.5">
                      <button onClick={onToggleCutOrder}
                        className={`w-3 h-3 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          showCutOrder ? 'bg-amber-500/20 border-amber-500/40' : 'bg-drapera-dark border-drapera-border'
                        }`}>
                        {showCutOrder && <svg className="w-1.5 h-1.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </button>
                      <svg className="w-2.5 h-2.5" viewBox="0 0 20 10">
                        <line x1="1" y1="5" x2="19" y2="5" stroke="#F2C94C" strokeWidth={1.2} strokeDasharray="3,2" />
                        <polygon points="17,3 19,5 17,7" fill="#F2C94C" />
                      </svg>
                      <span className="text-[9px] text-gray-400">Ordine taglio</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {isAdmin && onDetectPieces && (
              <button onClick={onDetectPieces} disabled={piecesLoading}
                className="w-full flex items-center justify-center gap-1.5 py-1 rounded text-[9px] font-semibold transition-all bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 disabled:opacity-40">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h4a1 1 0 010 2H6v3a1 1 0 01-2 0V5zm14 14a1 1 0 01-1 1h-4a1 1 0 010-2h3v-3a1 1 0 012 0v4zM4 19a1 1 0 001 1h4a1 1 0 000-2H6v-3a1 1 0 00-2 0v4zm14-14a1 1 0 00-1-1h-4a1 1 0 000 2h3v3a1 1 0 002 0V5z" /></svg>
                {piecesLoading ? 'Rilevamento...' : pieces ? `${pieces.length} pezzi` : 'Rileva pezzi'}
              </button>
            )}
            {selectedPiece && (
              <div className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[9px] text-emerald-400 font-semibold uppercase tracking-wider">Pezzo #{selectedPiece.id}</p>
                  {selectedPiece.contour_quality !== undefined && (
                    <span className={`text-[8px] font-mono ${selectedPiece.contour_quality > 80 ? 'text-green-400' : selectedPiece.contour_quality > 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                      Qualità: {selectedPiece.contour_quality}%
                    </span>
                  )}
                </div>
                <div className="space-y-0.5 text-[9px]">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Area</span>
                    <span className="text-white font-mono">{selectedPiece.area.toFixed(1)}</span>
                  </div>
                  {selectedPiece.perimeter !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Perimetro</span>
                      <span className="text-white font-mono">{selectedPiece.perimeter.toFixed(1)}</span>
                    </div>
                  )}
                  {selectedPiece.minx !== undefined && selectedPiece.miny !== undefined && selectedPiece.maxx !== undefined && selectedPiece.maxy !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Bounding Box</span>
                      <span className="text-white font-mono text-[8px]">({selectedPiece.minx.toFixed(0)},{selectedPiece.miny.toFixed(0)}) &ndash; ({selectedPiece.maxx.toFixed(0)},{selectedPiece.maxy.toFixed(0)})</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Intagli (Notch)</span>
                    <span className="text-white font-mono">{selectedPiece.notch_count}</span>
                  </div>
                  {selectedPiece.has_grainline && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Drittofilo</span>
                      <span className="text-emerald-400 font-mono">Presente</span>
                    </div>
                  )}
                  {selectedPiece.cut_order !== undefined && selectedPiece.cut_order > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Ordine taglio</span>
                      <span className="text-amber-400 font-mono">#{selectedPiece.cut_order}</span>
                    </div>
                  )}
                  {selectedPiece.complexity !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Complessità</span>
                      <span className="text-white font-mono">{selectedPiece.complexity}/10</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </aside>
  );
}
