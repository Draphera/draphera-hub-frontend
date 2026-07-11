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
  rotation?: number;
  charWidth?: number;
  charHeight?: number;
  slant?: number;
}

interface HPGLData {
  paths: HPGLPath[];
  meta: {
    total_paths: number; polylines: number; arcs: number; circles: number;
    rectangles: number; labels: number;
    dimensions: { width: number; height: number };
    pens: number[];
  };
  iw?: [number, number, number, number] | null;
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

/** Detect the placement bounding box: overall extent of all content (placement height + header width) */
function detectPlacementBounds(paths: HPGLPath[]): { minX: number; minY: number; maxX: number; maxY: number } | null {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  let found = false;
  for (const p of paths) {
    const pts = (p.type === 'polyline' || p.type === 'rectangle') ? p.points : null;
    if (pts) for (const [x, y] of pts) {
      if (x < minX) minX = x; if (y < minY) minY = y;
      if (x > maxX) maxX = x; if (y > maxY) maxY = y;
      found = true;
    }
  }
  return found ? { minX, minY, maxX, maxY } : null;
}

interface MeasurePoint {
  x: number; y: number;
}

interface MeasureResult {
  type: 'distance' | 'angle';
  points: MeasurePoint[];
  value: number;
  label?: string;
}

interface Props {
  data: HPGLData | null;
  filled?: boolean;
  showBounds?: boolean;
  showNotches?: boolean;
  zoom: number;
  onZoomChange?: (z: number) => void;
  invertColors: boolean;
  snapGrid: boolean;
  viewMode: 'outline' | 'tack' | 'measurement' | 'selection';
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
  snapMeasure?: boolean;
  selectionActive?: boolean;
  selectionBounds?: { minX: number; minY: number; maxX: number; maxY: number } | null;
  onSelectionChange?: (bounds: { minX: number; minY: number; maxX: number; maxY: number }) => void;
  rotation?: 0 | 90 | 180 | 270;
  flipX?: boolean;
  flipY?: boolean;
  onRotateLeft?: () => void;
  onRotateRight?: () => void;
  onFlipX?: () => void;
  onFlipY?: () => void;
  onResetTransform?: () => void;
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
    if (p.type === 'label' && p.x !== undefined && p.y !== undefined) {
      if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y;
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
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (ctm) {
    const svgPt = pt.matrixTransform(ctm.inverse());
    return { x: svgPt.x, y: svgPt.y };
  }
  // fallback (shouldn't happen)
  const rect = svg.getBoundingClientRect();
  return {
    x: (clientX - rect.left) * (VIEW_W / rect.width),
    y: (clientY - rect.top) * (VIEW_H / rect.height),
  };
}

function clampFontSize(size: number, min: number = 6, max: number = 18): number {
  return Math.max(min, Math.min(max, size));
}

/** Simplify polyline points using stride sampling based on LOD factor */
function simplifyPoints(pts: [number, number][], lodFactor: number): [number, number][] {
  if (lodFactor >= 1 || pts.length < 50) return pts;
  const stride = Math.max(1, Math.round(1 / lodFactor));
  const result: [number, number][] = [pts[0]];
  for (let i = stride; i < pts.length - 1; i += stride) {
    result.push(pts[i]);
  }
  result.push(pts[pts.length - 1]);
  return result;
}

function isPathVisible(
  path: HPGLPath,
  viewLeft: number, viewTop: number, viewW: number, viewH: number
): boolean {
  const margin = Math.max(viewW, viewH) * 0.5;
  const l = viewLeft - margin, r = viewLeft + viewW + margin;
  const t = viewTop - margin, b = viewTop + viewH + margin;

  if (path.type === 'polyline' || path.type === 'rectangle') {
    if (!path.points || path.points.length === 0) return true;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    // Only check first and last to avoid O(n) per path
    if (path.points.length <= 10) {
      for (const [x, y] of path.points) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    } else {
      minX = Math.min(path.points[0][0], path.points[path.points.length - 1][0]);
      maxX = Math.max(path.points[0][0], path.points[path.points.length - 1][0]);
      minY = Math.min(path.points[0][1], path.points[path.points.length - 1][1]);
      maxY = Math.max(path.points[0][1], path.points[path.points.length - 1][1]);
    }
    return !(maxX < l || minX > r || maxY < t || minY > b);
  }
  if ((path.type === 'circle' || path.type === 'arc') && path.cx !== undefined && path.cy !== undefined) {
    const r = path.radius ?? 0;
    return !(path.cx + r < l || path.cx - r > r || path.cy + r < t || path.cy - r > b);
  }
  if (path.type === 'label' && path.x !== undefined && path.y !== undefined) {
    return !(path.x < l || path.x > r || path.y < t || path.y > b);
  }
  return true;
}

export default function ViewerCanvas({ data, zoom, onZoomChange, invertColors, snapGrid, viewMode, fitKey, penVisibility, penColors, flattened, onPathSelect, selectedPathIndex, measureMode, measurePoints, onCanvasClick, measureResults, showNotches, filled, showBounds, snapMeasure, selectionActive, selectionBounds, onSelectionChange, rotation, flipX, flipY, onRotateLeft, onRotateRight, onFlipX, onFlipY, onResetTransform }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [wheelZoom, setWheelZoom] = useState(1);
  const [hoveredPath, setHoveredPath] = useState<{ idx: number; x: number; y: number } | null>(null);
  const dragRef = useRef<{ active: boolean; startX: number; startY: number; endX: number; endY: number }>({ active: false, startX: 0, startY: 0, endX: 0, endY: 0 });
  const [dragRect, setDragRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);

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

  const boundRectIdx = useMemo(() => {
    if (!data) return -1;
    const overall = detectPlacementBounds(data.paths);
    if (!overall) return -1;
    const overallArea = (overall.maxX - overall.minX) * (overall.maxY - overall.minY);
    if (overallArea <= 0) return -1;
    let bestIdx = -1;
    let bestArea = 0;
    for (let i = 0; i < data.paths.length; i++) {
      const p = data.paths[i];
      const pts = (p.type === 'polyline' || p.type === 'rectangle') ? p.points : null;
      if (!pts || pts.length < 3) continue;
      const isClosed = Math.abs(pts[0][0] - pts[pts.length - 1][0]) + Math.abs(pts[0][1] - pts[pts.length - 1][1]) < 5;
      if (!isClosed) continue;
      const xs = pts.map(pt => pt[0]);
      const ys = pts.map(pt => pt[1]);
      const area = (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
      if (area > bestArea) { bestArea = area; bestIdx = i; }
    }
    // Skip only if the largest closed path is ≥60% of the overall area (i.e. it's the outer bounding rect)
    if (bestIdx === -1 || bestArea < overallArea * 0.6) return -1;
    return bestIdx;
  }, [data]);

  const notches = useMemo(() => data ? detectNotchesFromPaths(data.paths) : [], [data]);
  const placementBounds = useMemo(() => {
    if (!data) return null;
    const pb = detectPlacementBounds(data.paths);
    return pb;
  }, [data]);

  const totalCommands = useMemo(() => {
    if (!data) return 0;
    let count = 0;
    for (const p of data.paths) {
      if (p.type === 'polyline' || p.type === 'rectangle') count += p.points?.length ?? 0;
      else if (p.type === 'circle' || p.type === 'arc') count += 1;
      else if (p.type === 'label') count += 1;
    }
    return count;
  }, [data]);

  // Rotation / flip transform center
  const contentCenter = useMemo(() => ({
    x: bounds ? bounds.cx : 0,
    y: bounds ? bounds.cy : 0,
  }), [bounds]);

  const contentTransform = useMemo(() => {
    if ((rotation ?? 0) === 0 && !flipX && !flipY) return null;
    const cx = contentCenter.x, cy = contentCenter.y;
    const sx = flipX ? -1 : 1, sy = flipY ? -1 : 1;
    return `translate(${cx}, ${cy}) rotate(${rotation ?? 0}) scale(${sx}, ${sy}) translate(${-cx}, ${-cy})`;
  }, [rotation, flipX, flipY, contentCenter]);

  // Convert coordinates between outer (user) space and inner (content) space
  const innerToOuter = useCallback((x: number, y: number): { x: number; y: number } => {
    if ((rotation ?? 0) === 0 && !flipX && !flipY) return { x, y };
    const cx = contentCenter.x, cy = contentCenter.y;
    const rot = (rotation ?? 0) * Math.PI / 180;
    const cosA = Math.cos(rot), sinA = Math.sin(rot);
    const sx = flipX ? -1 : 1, sy = flipY ? -1 : 1;
    let dx = (x - cx) * sx, dy = (y - cy) * sy;
    const rx = dx * cosA - dy * sinA;
    const ry = dx * sinA + dy * cosA;
    return { x: cx + rx, y: cy + ry };
  }, [rotation, flipX, flipY, contentCenter]);

  const outerToInner = useCallback((x: number, y: number): { x: number; y: number } => {
    if ((rotation ?? 0) === 0 && !flipX && !flipY) return { x, y };
    const cx = contentCenter.x, cy = contentCenter.y;
    const rot = -(rotation ?? 0) * Math.PI / 180;
    const cosA = Math.cos(rot), sinA = Math.sin(rot);
    const sx = flipX ? -1 : 1, sy = flipY ? -1 : 1;
    const dX = x - cx, dY = y - cy;
    // Inverse: [u] = 1/det * [cos*sinY   sin*sinY] [dX]
    //         [v]           [-sin*sinX  cos*sinX] [dY]
    const det = sx * sy;
    const u = (cosA * sy * dX + sinA * sy * dY) / det;
    const v = (-sinA * sx * dX + cosA * sx * dY) / det;
    return { x: cx + u, y: cy + v };
  }, [rotation, flipX, flipY, contentCenter]);

  const renderPaths = () => {
    if (!data) return null;
    const lodFactor = effectiveZoom >= 0.7 ? 1 : effectiveZoom >= 0.5 ? 0.5 : effectiveZoom >= 0.3 ? 0.25 : 0.1;
    return data.paths.map((path, idx) => {
      if (idx === boundRectIdx) return null;
      // Viewport culling
      if (!isPathVisible(path, viewLeft, viewTop, viewW, viewH)) return null;
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

      // Highlight for selected path (use LOD too)
      if (isSelected) {
        if ((path.type === 'polyline' || path.type === 'rectangle') && path.points) {
          const lodPts = (lodFactor < 1 && path.points.length > 100) ? simplifyPoints(path.points, lodFactor) : path.points;
          const pts = lodPts.map(p => `${p[0]},${p[1]}`).join(' ');
          if (path.closed) {
            elements.push(<polygon key={`sel-${idx}`} points={pts} fill="rgba(242,201,76,0.08)" stroke="#F2C94C" strokeWidth={highlightSw} strokeLinejoin="round" opacity={0.6} />);
          } else {
            elements.push(<polyline key={`sel-${idx}`} points={pts} fill="none" stroke="#F2C94C" strokeWidth={highlightSw} strokeLinejoin="round" strokeLinecap="round" opacity={0.6} />);
          }
        }
      }

      // Actual path with LOD simplification
      if ((path.type === 'polyline' || path.type === 'rectangle') && path.points) {
        const lodPts = (lodFactor < 1 && path.points.length > 100) ? simplifyPoints(path.points, lodFactor) : path.points;
        const pts = lodPts.map(p => `${p[0]},${p[1]}`).join(' ');
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
        const rot = path.rotation ?? 0;
        const sl = path.slant ?? 0;
        // font-size in user units (cm) inside the scaled <g>, no division by zoom
        const fs = path.charHeight ? Math.max(0.04, Math.min(3, path.charHeight)) : 0.15;
        const sw = Math.max(0.008, Math.min(0.08, (path.charHeight ?? 0.4) * 0.015));
        const slantSkew = sl ? ` skewY(${(-Math.atan(sl) * 180 / Math.PI).toFixed(1)})` : '';
        elements.push(
          <g key={idx} transform={`translate(${path.x}, ${path.y}) rotate(${rot})${slantSkew}`}>
            <text x={0} y={0} fill="none" stroke={color} strokeWidth={sw}
              fontSize={fs} fontFamily="monospace" fontWeight="100"
              strokeLinecap="round" strokeLinejoin="round"
              {...commonProps}>{path.text}</text>
          </g>
        );
      }

      return elements;
    });
  };

  const renderTackMarks = () => {
    if (!data || viewMode !== 'tack') return null;
    const SQ = 4; // fixed 4px square
    const CR = 3; // fixed 3px circle radius
    const elements: React.ReactNode[] = [];
    const z = effectiveZoom, px = pan.x, py = pan.y;
    data.paths.forEach((path, idx) => {
      if (idx === boundRectIdx) return;
      if (!isPathVisible(path, viewLeft, viewTop, viewW, viewH)) return;
      const pen = path.pen ?? 0;
      if (penVisibility && !penVisibility[pen]) return;
      const pts = (path.type === 'polyline' || path.type === 'rectangle') ? path.points : null;
      if (!pts || pts.length < 2) return;

      for (let i = 0; i < pts.length; i++) {
        const outer = innerToOuter(pts[i][0], pts[i][1]);
        const sx = outer.x * z + px, sy = outer.y * z + py;
        if (i === 0 || i === pts.length - 1) {
          elements.push(
            <rect key={`c_${idx}_${i}`} x={sx - SQ / 2} y={sy - SQ / 2}
              width={SQ} height={SQ} fill="none" stroke="#ff4444" strokeWidth={1.2} />
          );
        } else {
          const prev = pts[i - 1], next = pts[i + 1];
          const dx1 = pts[i][0] - prev[0], dy1 = pts[i][1] - prev[1];
          const dx2 = next[0] - pts[i][0], dy2 = next[1] - pts[i][1];
          const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
          const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
          if (len1 < 0.5 || len2 < 0.5) continue;
          const dot = (dx1 * dx2 + dy1 * dy2) / (len1 * len2);
          const angle = Math.acos(Math.max(-1, Math.min(1, dot))) * 180 / Math.PI;
          if (angle < 20) continue;
          if (angle < 60) {
            elements.push(
              <circle key={`c_${idx}_${i}`} cx={sx} cy={sy} r={CR}
                fill="none" stroke="#4488ff" strokeWidth={1} />
            );
          } else {
            elements.push(
              <rect key={`c_${idx}_${i}`} x={sx - SQ / 2} y={sy - SQ / 2}
                width={SQ} height={SQ} fill="none" stroke="#ff4444" strokeWidth={1.2} />
            );
          }
        }
      }
    });
    return elements;
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
          </g>
        )}

        {/* Completed measurement results */}
        {measureResults?.map((r, i) => {
          const midX = r.points.reduce((s, p) => s + p.x, 0) / r.points.length;
          const midY = r.points.reduce((s, p) => s + p.y, 0) / r.points.length;
          return (
            <g key={`result-${i}`}>
              {r.type === 'distance' && r.points.length === 2 && (
                <line x1={r.points[0].x} y1={r.points[0].y} x2={r.points[1].x} y2={r.points[1].y}
                  stroke="#ff6b6b" strokeWidth={sw * 0.7} strokeDasharray="4 3" opacity={0.7} />
              )}
              {r.type === 'angle' && r.points.length === 3 && (
                <>
                  <line x1={r.points[1].x} y1={r.points[1].y} x2={r.points[0].x} y2={r.points[0].y}
                    stroke="#ff6b6b" strokeWidth={sw * 0.7} strokeDasharray="4 3" opacity={0.7} />
                  <line x1={r.points[1].x} y1={r.points[1].y} x2={r.points[2].x} y2={r.points[2].y}
                    stroke="#ff6b6b" strokeWidth={sw * 0.7} strokeDasharray="4 3" opacity={0.7} />
                </>
              )}
              <text x={midX} y={midY - 10} textAnchor="middle" fill="#ff6b6b" fontSize={fs} fontFamily="Inter" fontWeight="bold">
                {r.type === 'distance' ? `${r.value.toFixed(1)}` : `${r.value.toFixed(1)}°`}
              </text>
            </g>
          );
        })}
      </g>
    );
  };

  const renderMeasureMarkers = () => {
    if (viewMode !== 'measurement') return null;
    const z = effectiveZoom, px = pan.x, py = pan.y;
    const elements: React.ReactNode[] = [];

    // Active measurement points (red unfilled squares, fixed size)
    measurePoints?.forEach((p, i) => {
      const outer = innerToOuter(p.x, p.y);
      const sx = outer.x * z + px, sy = outer.y * z + py;
      const sz = 5;
      elements.push(
        <rect key={`mp_${i}`} x={sx - sz / 2} y={sy - sz / 2}
          width={sz} height={sz} fill="none" stroke="#ff6b6b" strokeWidth={1.2} />
      );
    });

    // Completed result points (red unfilled squares, slightly smaller)
    measureResults?.forEach((r, ri) => {
      r.points.forEach((p, pi) => {
        const outer = innerToOuter(p.x, p.y);
        const sx = outer.x * z + px, sy = outer.y * z + py;
        const sz = 4;
        elements.push(
          <rect key={`mr_${ri}_${pi}`} x={sx - sz / 2} y={sy - sz / 2}
            width={sz} height={sz} fill="none" stroke="#ff6b6b" strokeWidth={1.2} opacity={0.8} />
        );
      });
    });

    // Result labels
    measureResults?.forEach((r, ri) => {
      if (!r.label) return;
      const midX = r.points.reduce((s, p) => s + p.x, 0) / r.points.length;
      const midY = r.points.reduce((s, p) => s + p.y, 0) / r.points.length;
      const outer = innerToOuter(midX, midY);
      const sx = outer.x * z + px, sy = outer.y * z + py;
      const fs = clampFontSize(11, 9, 13);
      elements.push(
        <text key={`rl_${ri}`} x={sx} y={sy - 4} textAnchor="middle"
          fill="#ff6b6b" fontSize={fs} fontFamily="Inter" fontWeight="bold"
          style={{ pointerEvents: 'none' }}>
          {r.label}
        </text>
      );
    });

    return <g>{elements}</g>;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      const svg = svgRef.current;
      if (!svg) return;
      const vb = screenToViewbox(svg, e.clientX, e.clientY);
      let worldX = (vb.x - pan.x) / effectiveZoom;
      let worldY = (vb.y - pan.y) / effectiveZoom;
      // Convert to inner (content) space for rotation/flip
      const inner = outerToInner(worldX, worldY);
      worldX = inner.x; worldY = inner.y;
      if (measureMode && measureMode !== 'off' && onCanvasClick) {
        // Optional snap to nearest vertex (~6 screen px threshold)
        if (snapMeasure && data) {
          const snapPx = 6 / effectiveZoom;
          let best = snapPx;
          for (const p of data.paths) {
            const pts = (p.type === 'polyline' || p.type === 'rectangle') ? p.points : null;
            if (!pts) continue;
            for (const [vx, vy] of pts) {
              const d = Math.hypot(vx - worldX, vy - worldY);
              if (d < best) { best = d; worldX = vx; worldY = vy; }
            }
          }
        }
        onCanvasClick(worldX, worldY);
        return;
      }
      if (selectionActive && onSelectionChange) {
        dragRef.current = { active: true, startX: worldX, startY: worldY, endX: worldX, endY: worldY };
        setDragRect({ x: worldX, y: worldY, w: 0, h: 0 });
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

    if (dragRef.current.active) {
      const wX = (vb.x - pan.x) / effectiveZoom;
      const wY = (vb.y - pan.y) / effectiveZoom;
      dragRef.current.endX = wX;
      dragRef.current.endY = wY;
      const x = Math.min(dragRef.current.startX, wX);
      const y = Math.min(dragRef.current.startY, wY);
      const w = Math.abs(wX - dragRef.current.startX);
      const h = Math.abs(wY - dragRef.current.startY);
      setDragRect({ x, y, w, h });
      return;
    }

    setMousePos({ x: (vb.x - pan.x) / effectiveZoom, y: (vb.y - pan.y) / effectiveZoom });

    if (isPanning) {
      setPan({ x: vb.x - panStart.x, y: vb.y - panStart.y });
    }
  };

  const handleMouseUp = () => {
    if (dragRef.current.active) {
      dragRef.current.active = false;
      const minX = Math.min(dragRef.current.startX, dragRef.current.endX);
      const minY = Math.min(dragRef.current.startY, dragRef.current.endY);
      const maxX = Math.max(dragRef.current.startX, dragRef.current.endX);
      const maxY = Math.max(dragRef.current.startY, dragRef.current.endY);
      if (maxX - minX > 0.5 && maxY - minY > 0.5) {
        onSelectionChange?.({ minX, minY, maxX, maxY });
      }
      setDragRect(null);
      return;
    }
    setIsPanning(false);
  };

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
      if (idx === boundRectIdx) return null;
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
      if (path.type === 'label' && path.text && path.x !== undefined && path.y !== undefined) {
        return <text key={idx} x={miniOffsetX + path.x * miniScale} y={miniOffsetY + path.y * miniScale} fill={color} stroke={color} strokeWidth={0.3} fontSize={3} fontFamily="monospace">{path.text}</text>;
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
        className={`w-full h-full select-none relative z-[1] ${selectionActive ? 'cursor-crosshair' : measureMode && measureMode !== 'off' ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
        style={svgStyle}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={e => { e.preventDefault(); if (data) setCtxMenu({ x: e.clientX, y: e.clientY }); }}
        onWheel={handleWheel}
      >
        <rect width={VIEW_W} height={VIEW_H} fill={bgColor} />
        {data ? (
          <>
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${effectiveZoom})`}>
            {contentTransform ? (
              <g transform={contentTransform}>
                {gridLines}
                {renderPaths()}
              </g>
            ) : (
              <>{gridLines}{renderPaths()}</>
            )}
            {renderMeasurement()}
            {/* Selection rectangle during drag */}
            {dragRect && (
              <rect x={dragRect.x} y={dragRect.y} width={dragRect.w} height={dragRect.h}
                fill="rgba(242,201,76,0.08)" stroke="#F2C94C" strokeWidth={1.5 / effectiveZoom} strokeDasharray="4 3" />
            )}
            {/* Confirmed selection rectangle */}
            {selectionBounds && (
              <rect x={selectionBounds.minX} y={selectionBounds.minY}
                width={selectionBounds.maxX - selectionBounds.minX}
                height={selectionBounds.maxY - selectionBounds.minY}
                fill="rgba(242,201,76,0.06)" stroke="#F2C94C" strokeWidth={1.5 / effectiveZoom} strokeDasharray="4 3" />
            )}
          </g>
          {renderTackMarks()}
          {renderMeasureMarkers()}
          {placementBounds && (() => {
            const corners = [
              innerToOuter(placementBounds.minX, placementBounds.minY),
              innerToOuter(placementBounds.maxX, placementBounds.minY),
              innerToOuter(placementBounds.minX, placementBounds.maxY),
              innerToOuter(placementBounds.maxX, placementBounds.maxY),
            ];
            const ox = Math.min(...corners.map(c => c.x));
            const oy = Math.min(...corners.map(c => c.y));
            const ox2 = Math.max(...corners.map(c => c.x));
            const oy2 = Math.max(...corners.map(c => c.y));
            return (
              <rect
                x={pan.x + ox * effectiveZoom}
                y={pan.y + oy * effectiveZoom}
                width={(ox2 - ox) * effectiveZoom}
                height={(oy2 - oy) * effectiveZoom}
                fill="none"
                stroke="#00E5FF"
                strokeWidth={showBounds ? 1.5 : 0}
                rx={1}
                style={{ pointerEvents: 'none', transition: 'stroke-width 0.15s' }} />
            );
          })()}
          </>
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

      {/* Command limit warning */}
      {totalCommands > 500000 && (
        <div className="absolute top-12 left-3 z-30 rounded-md px-3 py-2 max-w-[320px]"
          style={{ background: 'rgba(255, 68, 68, 0.12)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255, 68, 68, 0.3)' }}>
          <p className="text-[10px] text-red-400 font-semibold">File molto grande</p>
          <p className="text-[9px] text-red-300/70 mt-0.5">{(totalCommands / 1000).toFixed(0)}k comandi — alcuni browser potrebbero rallentare</p>
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

      {/* Right-click context menu */}
      {ctxMenu && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setCtxMenu(null)} onContextMenu={e => { e.preventDefault(); setCtxMenu(null); }} />
          <div className="fixed z-50 min-w-[140px] rounded-lg border border-drapera-border bg-drapera-midnight shadow-xl py-1"
            style={{ left: ctxMenu.x, top: ctxMenu.y, backdropFilter: 'blur(12px)' }}>
            <button onClick={() => { onRotateLeft?.(); setCtxMenu(null); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-gray-300 hover:bg-white/5 hover:text-white transition-colors">
              <span className="text-[13px]">⟲</span> Ruota sinistra
            </button>
            <button onClick={() => { onRotateRight?.(); setCtxMenu(null); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-gray-300 hover:bg-white/5 hover:text-white transition-colors">
              <span className="text-[13px]">⟳</span> Ruota destra
            </button>
            <div className="h-px bg-drapera-border/60 my-1 mx-2" />
            <button onClick={() => { onFlipX?.(); setCtxMenu(null); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-gray-300 hover:bg-white/5 hover:text-white transition-colors">
              <span className="text-[13px]">↔</span> Flip X
            </button>
            <button onClick={() => { onFlipY?.(); setCtxMenu(null); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-gray-300 hover:bg-white/5 hover:text-white transition-colors">
              <span className="text-[13px]">↕</span> Flip Y
            </button>
             {onResetTransform && (
              <>
                <div className="h-px bg-drapera-border/60 my-1 mx-2" />
                <button onClick={() => { onResetTransform?.(); setCtxMenu(null); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-gray-300 hover:bg-white/5 hover:text-white transition-colors">
                  <span className="text-[13px]">↺</span> Reset vista
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
