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

interface NotchInfo {
  type: 'triangle' | 'v' | 'square' | 'slash';
  points: [number, number][];
  center: [number, number];
  confidence: number;
}

function detectNotchesFromPaths(paths: HPGLPath[]): NotchInfo[] {
  const notches: NotchInfo[] = [];
  // Compute overall pattern diagonal for scale reference
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of paths) {
    const pts = (p.type === 'polyline' || p.type === 'rectangle') ? p.points : null;
    if (pts) for (const [x, y] of pts) {
      if (x < minX) minX = x; if (y < minY) minY = y;
      if (x > maxX) maxX = x; if (y > maxY) maxY = y;
    }
  }
  const patternDiag = Math.sqrt((maxX - minX) ** 2 + (maxY - minY) ** 2) || 1000;
  const notchSizeThreshold = Math.max(patternDiag * 0.08, 200);

  for (const p of paths) {
    const pts = (p.type === 'polyline' || p.type === 'rectangle') ? p.points : null;
    if (!pts || pts.length < 3) continue;

    const nv = pts.length;
    // Deduplicate closing point
    const isClosed = Math.abs(pts[0][0] - pts[nv - 1][0]) + Math.abs(pts[0][1] - pts[nv - 1][1]) < 5;
    const effectiveNv = (isClosed && nv >= 3) ? nv - 1 : nv;

    if (effectiveNv > 5) continue;

    // Compute bounding box
    const xs = pts.map(p => p[0]);
    const ys = pts.map(p => p[1]);
    const pw = Math.max(...xs) - Math.min(...xs);
    const ph = Math.max(...ys) - Math.min(...ys);
    const pathDiag = Math.sqrt(pw * pw + ph * ph);
    if (pathDiag >= notchSizeThreshold && pathDiag >= 50) continue;

    const center: [number, number] = [
      (Math.min(...xs) + Math.max(...xs)) / 2,
      (Math.min(...ys) + Math.max(...ys)) / 2,
    ];

    let type: NotchInfo['type'] | null = null;
    let confidence = 0;

    if (isClosed && effectiveNv === 3) { type = 'triangle'; confidence = 0.9; }
    else if (effectiveNv <= 3 && !isClosed) { type = 'v'; confidence = 0.8; }
    else if (isClosed && effectiveNv >= 4) { type = 'square'; confidence = 0.8; }
    else if (effectiveNv <= 3 && !isClosed && pathDiag < 20) { type = 'slash'; confidence = 0.7; }

    if (type) {
      notches.push({ type, points: pts as [number, number][], center, confidence });
    }
  }
  return notches;
}

interface MeasurePoint {
  x: number; y: number;
}

interface MeasureResult {
  type: 'distance' | 'angle';
  points: MeasurePoint[];
  value: number;
}

interface Props {
  data: HPGLData | null;
  filled?: boolean;
  showNotches?: boolean;
  zoom: number;
  onZoomChange?: (z: number) => void;
  invertColors: boolean;
  snapGrid: boolean;
  viewMode: 'outline' | 'tack' | 'measurement';
  fitKey?: number;
  penVisibility?: Record<number, boolean>;
  penColors?: Record<number, string>;
  flattened?: boolean;
  onPathSelect?: (path: HPGLPath | null, index: number) => void;
  selectedPathIndex?: number;
  measureMode?: 'off' | 'distance' | 'angle';
  measurePoints?: MeasurePoint[];
  onCanvasClick?: (x: number, y: number) => void;
  measureResults?: MeasureResult[];
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

export default function ViewerCanvas({ data, zoom, onZoomChange, invertColors, snapGrid, viewMode, fitKey, penVisibility, penColors, flattened, onPathSelect, selectedPathIndex, measureMode, measurePoints, onCanvasClick, measureResults, showNotches, filled }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [wheelZoom, setWheelZoom] = useState(1);
  const [hoveredPath, setHoveredPath] = useState<{ idx: number; x: number; y: number } | null>(null);

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

  const notches = useMemo(() => data ? detectNotchesFromPaths(data.paths) : [], [data]);

  const renderPaths = () => {
    if (!data) return null;
    return data.paths.map((path, idx) => {
      const pen = path.pen ?? 0;
      if (penVisibility && !penVisibility[pen]) return null;
      const isSelected = selectedPathIndex === idx;
      const color = flattened
        ? (invertColors ? '#00e5ff' : '#F2C94C')
        : (penColors?.[pen] ?? (invertColors ? '#00e5ff' : PEN_COLORS[pen % PEN_COLORS.length]));
      // Auto-thickness: closed paths and long paths are thicker (likely contours)
      const ptsLen = (path.type === 'polyline' || path.type === 'rectangle') ? (path.points?.length ?? 0) : 0;
      let ptDiag = 0;
      if (ptsLen >= 2 && path.points) {
        const xs = path.points.map(p => p[0]);
        const ys = path.points.map(p => p[1]);
        ptDiag = Math.sqrt((Math.max(...xs) - Math.min(...xs)) ** 2 + (Math.max(...ys) - Math.min(...ys)) ** 2);
      }
      const bbDiag = bounds ? Math.max(1, (bounds.w + bounds.h) / 2) : 1000;
      const sizeRatio = ptDiag / bbDiag;
      // Closed + large = contour (thick, solid), small/open = internals (thin)
      const isContour = path.closed && sizeRatio > 0.05;
      const isText = sizeRatio < 0.03;  // small paths = vector text / details
      const thick = isContour ? 1.8 : isText ? 1.3 : 1.0;
      const sw = ((path.penWidth ?? 0.25) * thick) / effectiveZoom;
      const highlightSw = sw * 3;
      // Text and contour: solid line. Others: respect LT
      const dash = (isContour || isText) ? '' : (LT_PATTERNS[path.lineType ?? 0] || '');
      const dashProps = dash ? { strokeDasharray: dash } : {};

      const commonProps = {
        style: { cursor: 'pointer' },
        onClick: () => onPathSelect?.(path, idx),
        onMouseEnter: () => {
          const firstPt = (path.type === 'polyline' || path.type === 'rectangle') ? path.points?.[0] : null;
          setHoveredPath(firstPt ? { idx, x: firstPt[0], y: firstPt[1] } : { idx, x: path.cx ?? 0, y: path.cy ?? 0 });
        },
        onMouseLeave: () => setHoveredPath(null),
      };

      const elements: JSX.Element[] = [];

      // Highlight for selected path
      if (isSelected) {
        if ((path.type === 'polyline' || path.type === 'rectangle') && path.points) {
          const pts = path.points.map(p => `${p[0]},${p[1]}`).join(' ');
          if (path.closed) {
            elements.push(<polygon key={`sel-${idx}`} points={pts} fill="rgba(242,201,76,0.08)" stroke="#F2C94C" strokeWidth={highlightSw} strokeLinejoin="round" opacity={0.6} />);
          } else {
            elements.push(<polyline key={`sel-${idx}`} points={pts} fill="none" stroke="#F2C94C" strokeWidth={highlightSw} strokeLinejoin="round" strokeLinecap="round" opacity={0.6} />);
          }
        }
      }

      // Actual path
      if ((path.type === 'polyline' || path.type === 'rectangle') && path.points) {
        const pts = path.points.map(p => `${p[0]},${p[1]}`).join(' ');
        if (path.closed) {
          elements.push(<polygon key={idx} points={pts} fill={filled ? 'rgba(242,201,76,0.1)' : 'none'} stroke={color} strokeWidth={sw} strokeLinejoin="round" {...dashProps} {...commonProps} />);
        } else {
          elements.push(<polyline key={idx} points={pts} fill="none" stroke={color} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" {...dashProps} {...commonProps} />);
        }
      } else if (path.type === 'arc' && path.cx !== undefined && path.cy !== undefined && path.radius !== undefined) {
        const cx = path.cx, cy = path.cy, r = path.radius;
        const sa = (path.startAngle || 0) * Math.PI / 180;
        const ea = (path.endAngle || 360) * Math.PI / 180;
        const x1 = cx + r * Math.cos(sa), y1 = cy + r * Math.sin(sa);
        const x2 = cx + r * Math.cos(ea), y2 = cy + r * Math.sin(ea);
        const large = (ea - sa) > Math.PI ? 1 : 0;
        elements.push(<path key={idx} d={`M${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2}`} fill="none" stroke={color} strokeWidth={sw} {...dashProps} {...commonProps} />);
      } else if (path.type === 'circle' && path.cx !== undefined && path.cy !== undefined && path.radius !== undefined) {
        elements.push(<circle key={idx} cx={path.cx} cy={path.cy} r={path.radius} fill="none" stroke={color} strokeWidth={sw} {...dashProps} {...commonProps} />);
      } else if (path.type === 'label' && path.text) {
        elements.push(<text key={idx} x={path.x ?? 0} y={path.y ?? 0} fill={color} fontSize={clampFontSize(6 / effectiveZoom, 5, 14)} fontFamily="monospace" {...commonProps}>{path.text}</text>);
      }

      return elements;
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
    if (viewMode !== 'measurement') return null;
    const fs = clampFontSize(10 / effectiveZoom, 7, 16);
    const sw = clampFontSize(1 / effectiveZoom, 0.5, 2);

    return (
      <g>
        {/* Guide lines through measure points */}
        {measurePoints?.map((p, i) => (
          <g key={`guide-${i}`}>
            <line x1={-1e6} y1={p.y} x2={1e6} y2={p.y} stroke="rgba(255,107,107,0.15)" strokeWidth={sw} strokeDasharray="4 4" />
            <line x1={p.x} y1={-1e6} x2={p.x} y2={1e6} stroke="rgba(255,107,107,0.15)" strokeWidth={sw} strokeDasharray="4 4" />
            <circle cx={p.x} cy={p.y} r={clampFontSize(4 / effectiveZoom, 3, 8)} fill="#ff6b6b" stroke="#fff" strokeWidth={sw * 0.5} />
          </g>
        ))}

        {/* Distance measurement: line between first 2 points */}
        {measurePoints && measurePoints.length >= 2 && (
          <g>
            <line x1={measurePoints[0].x} y1={measurePoints[0].y} x2={measurePoints[1].x} y2={measurePoints[1].y}
              stroke="#ff6b6b" strokeWidth={sw} strokeDasharray="5 3" />
            <text x={(measurePoints[0].x + measurePoints[1].x) / 2} y={(measurePoints[0].y + measurePoints[1].y) / 2 - 8}
              textAnchor="middle" fill="#ff6b6b" fontSize={fs} fontFamily="Inter" fontWeight="bold">
              {Math.sqrt((measurePoints[1].x - measurePoints[0].x) ** 2 + (measurePoints[1].y - measurePoints[0].y) ** 2).toFixed(1)}
            </text>
          </g>
        )}

        {/* Angle measurement: arc between 3 points */}
        {measurePoints && measurePoints.length >= 3 && measureMode === 'angle' && (
          <g>
            <line x1={measurePoints[1].x} y1={measurePoints[1].y} x2={measurePoints[0].x} y2={measurePoints[0].y}
              stroke="#ff6b6b" strokeWidth={sw} strokeDasharray="5 3" />
            <line x1={measurePoints[1].x} y1={measurePoints[1].y} x2={measurePoints[2].x} y2={measurePoints[2].y}
              stroke="#ff6b6b" strokeWidth={sw} strokeDasharray="5 3" />
            <circle cx={measurePoints[1].x} cy={measurePoints[1].y} r={clampFontSize(4 / effectiveZoom, 3, 8)} fill="#ff6b6b" />
          </g>
        )}

        {/* Completed measurement results */}
        {measureResults?.map((r, i) => {
          const midX = r.points.reduce((s, p) => s + p.x, 0) / r.points.length;
          const midY = r.points.reduce((s, p) => s + p.y, 0) / r.points.length;
          return (
            <g key={`result-${i}`}>
              {r.points.map((p, j) => (
                <circle key={j} cx={p.x} cy={p.y} r={clampFontSize(3 / effectiveZoom, 2, 6)} fill="#00e5ff" stroke="#fff" strokeWidth={sw * 0.5} opacity={0.7} />
              ))}
              {r.type === 'distance' && r.points.length === 2 && (
                <line x1={r.points[0].x} y1={r.points[0].y} x2={r.points[1].x} y2={r.points[1].y}
                  stroke="#00e5ff" strokeWidth={sw * 0.7} strokeDasharray="4 3" opacity={0.7} />
              )}
              {r.type === 'angle' && r.points.length === 3 && (
                <>
                  <line x1={r.points[1].x} y1={r.points[1].y} x2={r.points[0].x} y2={r.points[0].y}
                    stroke="#00e5ff" strokeWidth={sw * 0.7} strokeDasharray="4 3" opacity={0.7} />
                  <line x1={r.points[1].x} y1={r.points[1].y} x2={r.points[2].x} y2={r.points[2].y}
                    stroke="#00e5ff" strokeWidth={sw * 0.7} strokeDasharray="4 3" opacity={0.7} />
                </>
              )}
              <text x={midX} y={midY - 10} textAnchor="middle" fill="#00e5ff" fontSize={fs} fontFamily="Inter" fontWeight="bold">
                {r.type === 'distance' ? `${r.value.toFixed(1)}` : `${r.value.toFixed(1)}°`}
              </text>
            </g>
          );
        })}
      </g>
    );
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      const svg = svgRef.current;
      if (!svg) return;
      const vb = screenToViewbox(svg, e.clientX, e.clientY);
      const worldX = (vb.x - pan.x) / effectiveZoom;
      const worldY = (vb.y - pan.y) / effectiveZoom;
      if (measureMode && measureMode !== 'off' && onCanvasClick) {
        onCanvasClick(worldX, worldY);
        return;
      }
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
        className={`w-full h-full select-none relative z-[1] ${measureMode && measureMode !== 'off' ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
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

      {/* Notch overlay — subtle markers */}
      {showNotches && notches.length > 0 && (
        <div className="absolute inset-0 pointer-events-none z-[5]">
          <svg className="w-full h-full" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${effectiveZoom})`}>
              {notches.map((n, i) => (
                <g key={i}>
                  <line x1={n.center[0] - 3} y1={n.center[1]} x2={n.center[0] + 3} y2={n.center[1]} stroke="rgba(255,255,255,0.25)" strokeWidth={0.5 / effectiveZoom} />
                  <line x1={n.center[0]} y1={n.center[1] - 3} x2={n.center[0]} y2={n.center[1] + 3} stroke="rgba(255,255,255,0.25)" strokeWidth={0.5 / effectiveZoom} />
                  <title>Intaglio {n.type}</title>
                </g>
              ))}
            </g>
          </svg>
          <div className="absolute top-3 right-3">
            <span className="text-[9px] text-gray-600 font-mono">{notches.length} intagli</span>
          </div>
        </div>
      )}

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

      {/* Hover tooltip */}
      {hoveredPath && data?.paths[hoveredPath.idx] && (
        <div className="absolute top-3 left-3 z-20 rounded-md px-3 py-1.5 pointer-events-none"
          style={{ background: 'rgba(18, 10, 32, 0.9)', backdropFilter: 'blur(4px)', border: '1px solid rgba(242, 201, 76, 0.15)' }}>
          <p className="text-[10px] text-white font-mono">
            #{hoveredPath.idx} · {data.paths[hoveredPath.idx].type}
          </p>
          <p className="text-[9px] text-gray-400 font-mono">
            ({hoveredPath.x.toFixed(1)}, {hoveredPath.y.toFixed(1)})
          </p>
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
