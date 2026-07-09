'use client';

import { useRef, useState, useMemo, useEffect, useCallback } from 'react';

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
}

interface Props {
  data: HPGLData | null;
  zoom: number;
  onZoomChange?: (z: number) => void;
  invertColors: boolean;
  snapGrid: boolean;
  viewMode: 'outline' | 'tack' | 'measurement';
  fitKey?: number;
  penVisibility?: Record<number, boolean>;
  penColors?: Record<number, string>;
  flattened?: boolean;
}

const PAD = 40;
const VIEW_W = 800;
const VIEW_H = 600;

const PEN_COLORS = [
  '#F2C94C', '#00E5FF', '#FF4081', '#00E676',
  '#FF9100', '#448AFF', '#E040FB', '#FF1744',
  '#FFFFFF', '#69F0AE', '#FFD740', '#40C4FF',
];

const LT_PATTERNS: Record<number, string> = {
  0: '',
  1: '0.05 0.1',
  2: '0.2 0.15',
  3: '0.3 0.15 0.05 0.15',
  4: '0.4 0.15 0.05 0.15 0.05 0.15',
  5: '0.5 0.2',
  6: '0.08 0.1',
};

type BBox = { minX: number; minY: number; maxX: number; maxY: number; cx: number; cy: number; w: number; h: number };

function calcBounds(paths: HPGLPath[]): BBox {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of paths) {
    const pts = p.type === 'polyline' || p.type === 'rectangle' ? p.points : null;
    if (pts) for (const [x, y] of pts) {
      if (x < minX) minX = x; if (y < minY) minY = y;
      if (x > maxX) maxX = x; if (y > maxY) maxY = y;
    }
    if ((p.type === 'circle' || p.type === 'arc') && p.cx !== undefined && p.cy !== undefined && p.radius !== undefined) {
      const x1 = p.cx - p.radius, x2 = p.cx + p.radius;
      const y1 = p.cy - p.radius, y2 = p.cy + p.radius;
      if (x1 < minX) minX = x1; if (y1 < minY) minY = y1;
      if (x2 > maxX) maxX = x2; if (y2 > maxY) maxY = y2;
    }
  }
  if (minX === Infinity) return { minX: 0, minY: 0, maxX: 400, maxY: 300, cx: 200, cy: 150, w: 400, h: 300 };
  const w = maxX - minX || 400;
  const h = maxY - minY || 300;
  return { minX, minY, maxX, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, w, h };
}

function calcFitScale(bounds: BBox): number {
  const sx = (VIEW_W - PAD * 2) / bounds.w;
  const sy = (VIEW_H - PAD * 2) / bounds.h;
  return Math.min(sx, sy, 5);
}

function screenToViewbox(svg: SVGSVGElement, clientX: number, clientY: number) {
  const rect = svg.getBoundingClientRect();
  return {
    x: (clientX - rect.left) * (VIEW_W / rect.width),
    y: (clientY - rect.top) * (VIEW_H / rect.height),
  };
}

function clampFontSize(size: number, min: number = 6, max: number = 18): number {
  return Math.max(min, Math.min(max, size));
}

export default function ViewerCanvas({ data, zoom, onZoomChange, invertColors, snapGrid, viewMode, fitKey, penVisibility, penColors, flattened }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [wheelZoom, setWheelZoom] = useState(1);

  const bgColor = invertColors ? '#1a1a2e' : '#120A20';
  const gridColor = invertColors ? 'rgba(255,255,255,0.05)' : 'rgba(242,201,76,0.04)';
  const gridSize = snapGrid ? 20 : 30;

  const bounds = useMemo(() => data ? calcBounds(data.paths) : null, [data]);
  const fitScale = useMemo(() => bounds ? calcFitScale(bounds) : 1, [bounds]);

  useEffect(() => {
    if (bounds) {
      const s = calcFitScale(bounds);
      setPan({ x: VIEW_W / 2 - bounds.cx * s, y: VIEW_H / 2 - bounds.cy * s });
      setWheelZoom(1);
    }
  }, [bounds]);

  useEffect(() => {
    if (bounds && fitKey) {
      const s = calcFitScale(bounds);
      setPan({ x: VIEW_W / 2 - bounds.cx * s, y: VIEW_H / 2 - bounds.cy * s });
      setWheelZoom(1);
    }
  }, [fitKey]);

  const effectiveZoom = zoom * fitScale * wheelZoom;

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const svg = svgRef.current;
    if (!svg || !bounds) return;

    const delta = -e.deltaY * 0.001;
    const factor = 1 + delta;
    const newWheelZoom = Math.max(0.05, Math.min(50, wheelZoom * factor));
    const ratio = newWheelZoom / wheelZoom;

    const vb = screenToViewbox(svg, e.clientX, e.clientY);

    setPan(prev => ({
      x: vb.x - (vb.x - prev.x) * ratio,
      y: vb.y - (vb.y - prev.y) * ratio,
    }));
    setWheelZoom(newWheelZoom);
  }, [wheelZoom, bounds]);

  const gridLines: JSX.Element[] = [];
  for (let i = -2000; i < 2000; i += gridSize) {
    gridLines.push(
      <line key={`gv${i}`} x1={i} y1={-2000} x2={i} y2={2000} stroke={gridColor} strokeWidth={0.5} />,
      <line key={`gh${i}`} x1={-2000} y1={i} x2={2000} y2={i} stroke={gridColor} strokeWidth={0.5} />,
    );
  }

  const fillColor = invertColors ? 'rgba(0,229,255,0.06)' : 'rgba(242,201,76,0.06)';

  const renderPaths = () => {
    if (!data) return null;
    return data.paths.map((path, idx) => {
      const pen = path.pen ?? 0;
      if (penVisibility && !penVisibility[pen]) return null;
      const color = flattened
        ? (invertColors ? '#00e5ff' : '#F2C94C')
        : (penColors?.[pen] ?? (invertColors ? '#00e5ff' : PEN_COLORS[pen % PEN_COLORS.length]));
      const sw = (path.penWidth ?? 0.25) / effectiveZoom;
      const dash = LT_PATTERNS[path.lineType ?? 0] || '';
      const dashProps = dash ? { strokeDasharray: dash } : {};

      if ((path.type === 'polyline' || path.type === 'rectangle') && path.points) {
        const pts = path.points.map(p => `${p[0]},${p[1]}`).join(' ');
        if (path.closed) {
          return <polygon key={idx} points={pts} fill={fillColor} stroke={color} strokeWidth={sw} strokeLinejoin="round" {...dashProps} />;
        }
        return <polyline key={idx} points={pts} fill="none" stroke={color} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" {...dashProps} />;
      }

      if (path.type === 'arc' && path.cx !== undefined && path.cy !== undefined && path.radius !== undefined) {
        const cx = path.cx, cy = path.cy, r = path.radius;
        const sa = (path.startAngle || 0) * Math.PI / 180;
        const ea = (path.endAngle || 360) * Math.PI / 180;
        const x1 = cx + r * Math.cos(sa), y1 = cy + r * Math.sin(sa);
        const x2 = cx + r * Math.cos(ea), y2 = cy + r * Math.sin(ea);
        const large = (ea - sa) > Math.PI ? 1 : 0;
        return <path key={idx} d={`M${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2}`} fill="none" stroke={color} strokeWidth={sw} {...dashProps} />;
      }

      if (path.type === 'circle' && path.cx !== undefined && path.cy !== undefined && path.radius !== undefined) {
        return <circle key={idx} cx={path.cx} cy={path.cy} r={path.radius} fill="none" stroke={color} strokeWidth={sw} {...dashProps} />;
      }

      if (path.type === 'label' && path.text) {
        return <text key={idx} x={path.x ?? 0} y={path.y ?? 0} fill={color} fontSize={clampFontSize(6 / effectiveZoom, 5, 14)} fontFamily="monospace">{path.text}</text>;
      }

      return null;
    });
  };

  const renderTackMarks = () => {
    if (!data || viewMode !== 'tack') return null;
    return data.paths.flatMap((path, idx) => {
      const pen = path.pen ?? 0;
      if (penVisibility && !penVisibility[pen]) return [];
      return (path.type === 'polyline' || path.type === 'rectangle') && path.points
        ? path.points.filter((_, pi) => pi % 8 === 0).map((pt, pi) => (
            <circle key={`t${idx}_${pi}`} cx={pt[0]} cy={pt[1]} r={clampFontSize(1.5 / effectiveZoom, 1, 8)} fill={PEN_COLORS[pen % PEN_COLORS.length]} opacity={0.4} />
          ))
        : [];
    });
  };

  const renderMeasurement = () => {
    if (!data || viewMode !== 'measurement' || !bounds) return null;
    const { cx, cy, w, h } = bounds;
    return (
      <g>
        <line x1={cx - w / 2 - 10} y1={cy} x2={cx + w / 2 + 10} y2={cy} stroke="#ff6b6b" strokeWidth={clampFontSize(0.5 / effectiveZoom, 0.3, 3)} strokeDasharray="4 3" />
        <line x1={cx} y1={cy - h / 2 - 10} x2={cx} y2={cy + h / 2 + 10} stroke="#ff6b6b" strokeWidth={clampFontSize(0.5 / effectiveZoom, 0.3, 3)} strokeDasharray="4 3" />
        <text x={cx} y={cy - h / 2 - 15} textAnchor="middle" fill="#ff6b6b" fontSize={clampFontSize(8 / effectiveZoom, 6, 18)} fontFamily="Inter">{w.toFixed(1)}</text>
        <text x={cx + w / 2 + 15} y={cy} textAnchor="start" dominantBaseline="central" fill="#ff6b6b" fontSize={clampFontSize(8 / effectiveZoom, 6, 18)} fontFamily="Inter">{h.toFixed(1)}</text>
      </g>
    );
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      const svg = svgRef.current;
      if (!svg) return;
      const vb = screenToViewbox(svg, e.clientX, e.clientY);
      setIsPanning(true);
      setPanStart({ x: vb.x - pan.x, y: vb.y - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return;

    const vb = screenToViewbox(svg, e.clientX, e.clientY);

    setMousePos({ x: (vb.x - pan.x) / effectiveZoom, y: (vb.y - pan.y) / effectiveZoom });

    if (isPanning) {
      setPan({ x: vb.x - panStart.x, y: vb.y - panStart.y });
    }
  };

  const handleMouseUp = () => setIsPanning(false);

  const svgStyle: React.CSSProperties = {
    minHeight: 460,
    outline: '1px solid rgba(242, 201, 76, 0.08)',
    outlineOffset: -1,
  };

  // Mini-map
  const MINI_SIZE = 120;
  const miniScale = bounds ? Math.min(MINI_SIZE / bounds.w, MINI_SIZE / bounds.h, 0.5) : 1;
  const miniOffsetX = bounds ? -bounds.minX * miniScale : 0;
  const miniOffsetY = bounds ? -bounds.minY * miniScale : 0;
  // Viewport rectangle in world coords
  const viewLeft = -pan.x / effectiveZoom;
  const viewTop = -pan.y / effectiveZoom;
  const viewW = VIEW_W / effectiveZoom;
  const viewH = VIEW_H / effectiveZoom;

  const renderMiniPaths = () => {
    if (!data) return null;
    return data.paths.map((path, idx) => {
      const pen = path.pen ?? 0;
      if (penVisibility && !penVisibility[pen]) return null;
      const color = flattened
        ? (invertColors ? '#00e5ff' : '#F2C94C')
        : (penColors?.[pen] ?? (invertColors ? '#00e5ff' : PEN_COLORS[pen % PEN_COLORS.length]));
      if ((path.type === 'polyline' || path.type === 'rectangle') && path.points) {
        const pts = path.points.map(p => `${miniOffsetX + p[0] * miniScale},${miniOffsetY + p[1] * miniScale}`).join(' ');
        if (path.closed) return <polygon key={idx} points={pts} fill="none" stroke={color} strokeWidth={0.5} />;
        return <polyline key={idx} points={pts} fill="none" stroke={color} strokeWidth={0.5} />;
      }
      if (path.type === 'circle' && path.cx !== undefined && path.cy !== undefined && path.radius !== undefined) {
        return <circle key={idx} cx={miniOffsetX + path.cx * miniScale} cy={miniOffsetY + path.cy * miniScale} r={path.radius * miniScale} fill="none" stroke={color} strokeWidth={0.5} />;
      }
      return null;
    });
  };

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-drapera-border bg-drapera-dark"
      style={{ height: 'calc(100vh - 8rem)', minHeight: 460 }}>
      {data && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none z-0"
          style={{
            boxShadow: 'inset 0 0 30px rgba(242, 201, 76, 0.06), 0 0 20px rgba(242, 201, 76, 0.03)',
          }}
        />
      )}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full h-full cursor-grab active:cursor-grabbing select-none relative z-[1]"
        style={svgStyle}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <rect width={VIEW_W} height={VIEW_H} fill={bgColor} />
        {data ? (
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${effectiveZoom})`}>
            {gridLines}
            {renderPaths()}
            {renderTackMarks()}
            {renderMeasurement()}
          </g>
        ) : (
          <>
            {gridLines}
            <text x={VIEW_W / 2} y={VIEW_H / 2} textAnchor="middle" fill="#4A4A6A" fontSize={13} fontFamily="Inter">
              Carica un file HPGL per visualizzare il rendering
            </text>
          </>
        )}
      </svg>

      {/* Mini-map */}
      {bounds && (
        <div className="absolute bottom-3 right-3 z-20 rounded-lg overflow-hidden border border-drapera-border/60"
          style={{ width: MINI_SIZE + 16, height: MINI_SIZE + 16, background: 'rgba(18, 10, 32, 0.9)', backdropFilter: 'blur(4px)' }}>
          <svg width={MINI_SIZE + 16} height={MINI_SIZE + 16} viewBox={`0 0 ${MINI_SIZE + 16} ${MINI_SIZE + 16}`}>
            <g transform={`translate(8, 8)`}>
              {/* Bounding box background */}
              <rect x={0} y={0} width={MINI_SIZE} height={MINI_SIZE} fill="rgba(255,255,255,0.02)" rx={2} />
              {/* Paths */}
              {renderMiniPaths()}
              {/* Viewport rectangle */}
              <rect
                x={Math.max(0, viewLeft * miniScale)}
                y={Math.max(0, viewTop * miniScale)}
                width={Math.min(MINI_SIZE - viewLeft * miniScale, viewW * miniScale)}
                height={Math.min(MINI_SIZE - viewTop * miniScale, viewH * miniScale)}
                fill="rgba(242,201,76,0.08)"
                stroke="#F2C94C"
                strokeWidth={1}
                rx={1}
              />
            </g>
          </svg>
        </div>
      )}

      {/* Coordinate bar */}
      <div className="absolute bottom-3 left-3 flex items-center gap-3 z-10 rounded-md px-3 py-1.5"
        style={{ background: 'rgba(18, 10, 32, 0.85)', backdropFilter: 'blur(4px)', border: '1px solid rgba(242, 201, 76, 0.12)' }}>
        <span className="text-[11px] text-drapera-steel-light font-mono font-medium tracking-wide">X: {mousePos.x.toFixed(1)}</span>
        <span className="text-[11px] text-drapera-steel-light font-mono font-medium tracking-wide">Y: {mousePos.y.toFixed(1)}</span>
        <span className="text-[11px] text-drapera-steel-light font-mono font-medium tracking-wide">S: {Math.round(effectiveZoom * 100)}%</span>
      </div>
    </div>
  );
}
