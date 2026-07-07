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
}

const PAD = 40;
const VIEW_W = 800;
const VIEW_H = 600;

const PEN_COLORS = [
  '#F2C94C', '#00E5FF', '#FF4081', '#00E676',
  '#FF9100', '#448AFF', '#E040FB', '#FF1744',
  '#FFFFFF', '#69F0AE', '#FFD740', '#40C4FF',
];

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

export default function ViewerCanvas({ data, zoom, onZoomChange, invertColors, snapGrid, viewMode }: Props) {
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
      const color = invertColors ? '#00e5ff' : PEN_COLORS[pen % PEN_COLORS.length];
      const sw = 0.5 / effectiveZoom;

      if ((path.type === 'polyline' || path.type === 'rectangle') && path.points) {
        const pts = path.points.map(p => `${p[0]},${p[1]}`).join(' ');
        if (path.closed) {
          return <polygon key={idx} points={pts} fill={fillColor} stroke={color} strokeWidth={sw} strokeLinejoin="round" />;
        }
        return <polyline key={idx} points={pts} fill="none" stroke={color} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />;
      }

      if (path.type === 'arc' && path.cx !== undefined && path.cy !== undefined && path.radius !== undefined) {
        const cx = path.cx, cy = path.cy, r = path.radius;
        const sa = (path.startAngle || 0) * Math.PI / 180;
        const ea = (path.endAngle || 360) * Math.PI / 180;
        const x1 = cx + r * Math.cos(sa), y1 = cy + r * Math.sin(sa);
        const x2 = cx + r * Math.cos(ea), y2 = cy + r * Math.sin(ea);
        const large = (ea - sa) > Math.PI ? 1 : 0;
        return <path key={idx} d={`M${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2}`} fill="none" stroke={color} strokeWidth={sw} />;
      }

      if (path.type === 'circle' && path.cx !== undefined && path.cy !== undefined && path.radius !== undefined) {
        return <circle key={idx} cx={path.cx} cy={path.cy} r={path.radius} fill="none" stroke={color} strokeWidth={sw} />;
      }

      if (path.type === 'label' && path.text) {
        return <text key={idx} x={path.x ?? 0} y={path.y ?? 0} fill={color} fontSize={6 / effectiveZoom} fontFamily="monospace">{path.text}</text>;
      }

      return null;
    });
  };

  const renderTackMarks = () => {
    if (!data || viewMode !== 'tack') return null;
    return data.paths.flatMap((path, idx) =>
      (path.type === 'polyline' || path.type === 'rectangle') && path.points
        ? path.points.filter((_, pi) => pi % 8 === 0).map((pt, pi) => (
            <circle key={`t${idx}_${pi}`} cx={pt[0]} cy={pt[1]} r={1.5 / effectiveZoom} fill={PEN_COLORS[(path.pen ?? 0) % PEN_COLORS.length]} opacity={0.4} />
          ))
        : []
    );
  };

  const renderMeasurement = () => {
    if (!data || viewMode !== 'measurement' || !bounds) return null;
    const { cx, cy, w, h } = bounds;
    return (
      <g>
        <line x1={cx - w / 2 - 10} y1={cy} x2={cx + w / 2 + 10} y2={cy} stroke="#ff6b6b" strokeWidth={0.5 / effectiveZoom} strokeDasharray="4 3" />
        <line x1={cx} y1={cy - h / 2 - 10} x2={cx} y2={cy + h / 2 + 10} stroke="#ff6b6b" strokeWidth={0.5 / effectiveZoom} strokeDasharray="4 3" />
        <text x={cx} y={cy - h / 2 - 15} textAnchor="middle" fill="#ff6b6b" fontSize={8 / effectiveZoom} fontFamily="Inter">{w.toFixed(1)}</text>
        <text x={cx + w / 2 + 15} y={cy} textAnchor="start" dominantBaseline="central" fill="#ff6b6b" fontSize={8 / effectiveZoom} fontFamily="Inter">{h.toFixed(1)}</text>
      </g>
    );
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { setIsPanning(true); setPanStart({ x: e.clientX, y: e.clientY }); }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return;

    const vb = screenToViewbox(svg, e.clientX, e.clientY);

    setMousePos({ x: (vb.x - pan.x) / effectiveZoom, y: (vb.y - pan.y) / effectiveZoom });

    if (isPanning) {
      setPan(prev => ({ x: prev.x + (vb.x - panStart.x), y: prev.y + (vb.y - panStart.y) }));
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => setIsPanning(false);

  return (
    <div className="relative w-full h-full overflow-hidden rounded-xl border border-drapera-border bg-drapera-dark">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full h-full cursor-grab active:cursor-grabbing select-none"
        style={{ minHeight: 460 }}
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
      <div className="absolute bottom-3 left-3 glass-panel px-2.5 py-1 flex items-center gap-3 z-10">
        <span className="text-[11px] text-drapera-steel-light font-mono">X: {mousePos.x.toFixed(1)}</span>
        <span className="text-[11px] text-drapera-steel-light font-mono">Y: {mousePos.y.toFixed(1)}</span>
        <span className="text-[11px] text-drapera-steel-light font-mono">Scale: {Math.round(effectiveZoom * 100)}%</span>
      </div>
    </div>
  );
}
