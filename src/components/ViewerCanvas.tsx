'use client';

import { useRef, useState } from 'react';

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

interface Props {
  data: HPGLData | null;
  zoom: number;
  invertColors: boolean;
  snapGrid: boolean;
  viewMode: 'outline' | 'tack' | 'measurement';
}

export default function ViewerCanvas({ data, zoom, invertColors, snapGrid, viewMode }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const bgColor = invertColors ? '#1a1a2e' : '#120A20';
  const gridColor = invertColors ? 'rgba(255,255,255,0.05)' : 'rgba(242,201,76,0.04)';
  const strokeColor = invertColors ? '#00e5ff' : '#F2C94C';
  const gridSize = snapGrid ? 20 : 30;
  const viewW = 800, viewH = 600;

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = (e.target as SVGSVGElement).getBoundingClientRect();
    const x = ((e.clientX - rect.left) / zoom - pan.x / zoom).toFixed(1);
    const y = ((e.clientY - rect.top) / zoom - pan.y / zoom).toFixed(1);
    setMousePos({ x: parseFloat(x), y: parseFloat(y) });
    if (isPanning) {
      setPan(prev => ({ x: prev.x + (e.clientX - panStart.x), y: prev.y + (e.clientY - panStart.y) }));
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || e.shiftKey) { setIsPanning(true); setPanStart({ x: e.clientX, y: e.clientY }); }
  };
  const handleMouseUp = () => setIsPanning(false);

  const gridLines: JSX.Element[] = [];
  for (let i = 0; i < Math.max(viewW, viewH) * 2; i += gridSize) {
    gridLines.push(
      <line key={`gv${i}`} x1={i} y1={0} x2={i} y2={viewH} stroke={gridColor} strokeWidth={0.5} />,
      <line key={`gh${i}`} x1={0} y1={i} x2={viewW} y2={i} stroke={gridColor} strokeWidth={0.5} />,
    );
  }

  const renderPaths = () => {
    if (!data) return null;
    return data.paths.map((path, idx) => {
      if (path.type === 'line' && path.points) {
        const pts = path.points.map(p => `${p[0] + viewW / 2},${p[1] + viewH / 2}`).join(' ');
        return <polyline key={`l${idx}`} points={pts} fill="none" stroke={strokeColor} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />;
      }
      if (path.type === 'arc' && path.cx !== undefined && path.cy !== undefined && path.radius !== undefined) {
        const cx = path.cx + viewW / 2, cy = path.cy + viewH / 2, r = path.radius;
        const sa = (path.startAngle || 0) * Math.PI / 180;
        const ea = (path.endAngle || 360) * Math.PI / 180;
        const x1 = cx + r * Math.cos(sa), y1 = cy + r * Math.sin(sa);
        const x2 = cx + r * Math.cos(ea), y2 = cy + r * Math.sin(ea);
        const large = (ea - sa) > Math.PI ? 1 : 0;
        return <path key={`a${idx}`} d={`M${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2}`} fill="none" stroke={strokeColor} strokeWidth={1.5} />;
      }
      if (path.type === 'circle' && path.cx !== undefined && path.cy !== undefined && path.radius !== undefined) {
        return <circle key={`c${idx}`} cx={path.cx + viewW / 2} cy={path.cy + viewH / 2} r={path.radius} fill="none" stroke={strokeColor} strokeWidth={1.5} />;
      }
      return null;
    });
  };

  const renderTackMarks = () => {
    if (!data || viewMode !== 'tack') return null;
    return data.paths.flatMap((path, idx) =>
      path.type === 'line' && path.points
        ? path.points.filter((_, pi) => pi % 5 === 0).map((pt, pi) => (
            <circle key={`t${idx}_${pi}`} cx={pt[0] + viewW / 2} cy={pt[1] + viewH / 2} r={2} fill={strokeColor} opacity={0.5} />
          ))
        : []
    );
  };

  const renderMeasurement = () => {
    if (!data || viewMode !== 'measurement') return null;
    const { dimensions: d } = data.meta;
    return (
      <g>
        <line x1={viewW / 2 - 20} y1={viewH / 2} x2={viewW / 2 + d.width + 20} y2={viewH / 2} stroke="#ff6b6b" strokeWidth={1} strokeDasharray="4 3" />
        <line x1={viewW / 2} y1={viewH / 2 - 20} x2={viewW / 2} y2={viewH / 2 + d.height + 20} stroke="#ff6b6b" strokeWidth={1} strokeDasharray="4 3" />
        <text x={viewW / 2 + d.width / 2} y={viewH / 2 - 10} textAnchor="middle" fill="#ff6b6b" fontSize={11} fontFamily="Inter">{d.width.toFixed(1)}</text>
        <text x={viewW / 2 + 12} y={viewH / 2 + d.height / 2} textAnchor="start" fill="#ff6b6b" fontSize={11} fontFamily="Inter">{d.height.toFixed(1)}</text>
      </g>
    );
  };

  return (
    <div className="relative w-full h-full overflow-hidden rounded-xl border border-drapera-border bg-drapera-dark">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${viewW} ${viewH}`}
        className="w-full h-full cursor-grab active:cursor-grabbing select-none"
        style={{ minHeight: 460 }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <rect width={viewW} height={viewH} fill={bgColor} />
        {data ? (
          <g transform={`translate(${pan.x / zoom}, ${pan.y / zoom}) scale(${zoom})`}>
            {gridLines}
            {renderPaths()}
            {renderTackMarks()}
            {renderMeasurement()}
          </g>
        ) : (
          <>
            {gridLines}
            <text x={viewW / 2} y={viewH / 2} textAnchor="middle" fill="#4A4A6A" fontSize={13} fontFamily="Inter">
              Carica un file HPGL per visualizzare il rendering
            </text>
          </>
        )}
      </svg>
      <div className="absolute bottom-3 left-3 glass-panel px-2.5 py-1 flex items-center gap-3 z-10">
        <span className="text-[11px] text-drapera-steel-light font-mono">X: {mousePos.x.toFixed(1)}</span>
        <span className="text-[11px] text-drapera-steel-light font-mono">Y: {mousePos.y.toFixed(1)}</span>
        <span className="text-[11px] text-drapera-steel-light font-mono">Scale: {Math.round(zoom * 100)}%</span>
      </div>
    </div>
  );
}
