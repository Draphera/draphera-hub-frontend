'use client';

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
}

const APP_VERSION = '1.0.0';

export default function InfoPanel({ meta, fileName, cad, ml, features, onCorrectCad, userSelectedCad, selectedPath, formatInfo, pens, penVisibility, onPenToggle, penColors, onPenColorChange, flattened, onToggleFlattened, pieces, piecesLoading, onDetectPieces }: Props) {
  const { t } = useTranslation();

  return (
    <aside className="fixed right-0 top-14 bottom-0 w-[260px] bg-drapera-midnight border-l border-drapera-border overflow-y-auto z-40">
      <div className="p-4 space-y-5">
        <div>
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-drapera-steel-light mb-2">{t('info.title')}</h3>
          <div className="h-px bg-drapera-border mt-2.5" />
        </div>

        {/* Main CAD result: prefer user selection, then ML, then rule-based */}
        <div className={`px-3 py-2 rounded-lg border ${
          userSelectedCad
            ? 'bg-amber-500/10 border-amber-500/20'
            : !ml
              ? 'bg-drapera-gold/5 border-drapera-gold/15'
              : ml.source === 'no_model'
                ? 'bg-gray-500/5 border-gray-500/15'
                : ml.source === 'ml_rule_agreement'
                  ? 'bg-green-500/5 border-green-500/15'
                  : 'bg-cyan-500/5 border-cyan-500/15'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: userSelectedCad ? '#FBBF24' : !ml ? '#F2C94C' : ml.source === 'no_model' ? '#9CA3AF' : '#22D3EE' }}>
              {userSelectedCad ? 'Modello non addestrato' :
               !ml ? t('cad.detected') :
               ml.source === 'no_model' ? 'Modello non addestrato' :
               ml.source === 'ml_rule_agreement' ? t('info.ml_agreement') :
               ml.source === 'rule_based_fallback' ? t('info.ml_fallback') :
               t('info.ml_only')}
            </span>
            {!userSelectedCad && ml && (
              <span className={`text-xs font-bold ${(ml.final_confidence ?? ml.ml_confidence) > 0.8 ? 'text-green-400' : (ml.final_confidence ?? ml.ml_confidence) > 0.5 ? 'text-yellow-400' : 'text-gray-500'}`}>
                {ml.source === 'no_model' ? '—' : `${((ml.final_confidence ?? ml.ml_confidence) * 100).toFixed(0)}%`}
              </span>
            )}
            {!userSelectedCad && !ml && cad && (
              <span className={`ml-auto w-1.5 h-1.5 rounded-full ${cad.confidence === 'high' ? 'bg-green-400' : cad.confidence === 'medium' ? 'bg-yellow-400' : 'bg-gray-500'}`} />
            )}
          </div>
          <p className="text-xs text-white font-medium">
            {userSelectedCad
              ? userSelectedCad
              : ml
                ? (ml.final_cad === 'general_hpgl' ? t('cad.general_hpgl') : ml.final_cad ?? ml.ml_cad)
                : (cad ? t(`cad.${cad.cad}`) : t('cad.unknown'))}
          </p>
          {!userSelectedCad && ml?.note && (
            <p className="text-[10px] text-gray-500 mt-1 italic">{ml.note}</p>
          )}
          {!userSelectedCad && ml?.ml_scores && Object.keys(ml.ml_scores).length > 1 && (
            <div className="mt-1.5 space-y-0.5">
              {Object.entries(ml.ml_scores).sort(([, a], [, b]) => b - a).slice(0, 3).map(([cad_, score]) => (
                <div key={cad_} className="flex justify-between text-[10px]">
                  <span className="text-gray-500">{cad_}</span>
                  <span className="text-gray-400 font-mono">{(score * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          )}
          </div>

        {/* CAD status message */}
        {(ml || userSelectedCad) && (
          <div className="px-3 py-2 rounded-lg bg-drapera-gold/5 border border-drapera-gold/10 text-[10px] text-gray-400 leading-relaxed">
            {userSelectedCad ? (
              <p>Questo file è stato assegnato a <strong className="text-white">{userSelectedCad}</strong>.</p>
            ) : ml?.source === 'no_model' ? (
              <p>Modello non addestrato per questo CAD. Usa il menu per correggere.</p>
            ) : ml?.final_cad ? (
              <p>Rilevato: <strong className="text-white">{ml.final_cad}</strong> con confidence <strong className="text-white">{((ml.final_confidence ?? 0) * 100).toFixed(0)}%</strong>.
              {ml.final_confidence && ml.final_confidence < 0.65 && <> Se non è corretto, seleziona il CAD dal menu.</>}
              </p>
            ) : null}
          </div>
        )}

        {selectedPath && (
          <div className="px-3 py-2 rounded-lg bg-cyan-500/5 border border-cyan-500/15">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-cyan-400 font-semibold uppercase tracking-wider">Path selezionato</span>
              <button onClick={() => {
                const text = `Path #? Type: ${selectedPath.type}, Vertices: ${selectedPath.vertices}, Pen: SP${selectedPath.pen}, Length: ${selectedPath.length?.toFixed(1) ?? '?'}`;
                navigator.clipboard.writeText(text);
              }} className="text-[9px] text-gray-500 hover:text-cyan-400 transition-colors" title="Copia info">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              </button>
            </div>
            <div className="space-y-1 text-[10px]">
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
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-cyan-400 font-semibold uppercase tracking-wider">Penne</span>
              <button onClick={onToggleFlattened}
                className={`text-[9px] px-2 py-0.5 rounded font-medium transition-colors ${
                  flattened ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20' : 'text-gray-500 border border-drapera-border hover:text-white'
                }`}>
                {flattened ? 'Unificate' : 'Separate'}
              </button>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {pens.map(p => {
                const visible = penVisibility?.[p] ?? true;
                const color = penColors?.[p] ?? PALETTE[p % PALETTE.length];
                return (
                  <div key={p} className="flex items-center gap-2 py-1">
                    <button onClick={() => onPenToggle?.(p)}
                      className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        visible ? 'bg-cyan-500/20 border-cyan-500/40' : 'bg-drapera-dark border-drapera-border'
                      }`}>
                      {visible && <svg className="w-2 h-2 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </button>
                    <span className="text-[9px] text-gray-400 w-6 font-mono">SP{p}</span>
                    <input type="color" value={color}
                      onChange={e => onPenColorChange?.(p, e.target.value)}
                      className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent p-0 shrink-0" />
                    <div className="flex-1 h-2 rounded" style={{ backgroundColor: visible ? color : 'transparent', opacity: visible ? 1 : 0.15 }} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Format line */}
        <div className="flex items-center gap-2 px-3 py-3 rounded-lg bg-amber-500/15 border border-amber-500/30">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 shrink-0">
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

        {onDetectPieces && (
          <button onClick={onDetectPieces} disabled={piecesLoading}
            className="w-full flex items-center justify-center gap-2 py-1.5 rounded text-[10px] font-semibold transition-all bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 disabled:opacity-40">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h4a1 1 0 010 2H6v3a1 1 0 01-2 0V5zm14 14a1 1 0 01-1 1h-4a1 1 0 010-2h3v-3a1 1 0 012 0v4zM4 19a1 1 0 001 1h4a1 1 0 000-2H6v-3a1 1 0 00-2 0v4zm14-14a1 1 0 00-1-1h-4a1 1 0 000 2h3v3a1 1 0 002 0V5z" /></svg>
            {piecesLoading ? 'Rilevamento...' : pieces ? `${pieces.length} pezzi` : 'Rileva pezzi'}
          </button>
        )}

        <div className="space-y-2.5">
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
            <div key={f.label} className="flex justify-between py-1.5 border-b border-drapera-border/40">
              <span className="tech-label">{f.label}</span>
              <span className={`tech-value text-right ${f.cls || ''}`}>{f.value}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-drapera-border/30">
          <p className="text-[10px] text-gray-600 text-center">Draphera Hub HPGL Viewer v{APP_VERSION}</p>
        </div>
      </div>
    </aside>
  );
}
