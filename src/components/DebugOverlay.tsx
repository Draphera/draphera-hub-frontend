'use client';

import { useMemo } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PieceInfo {
  id: number;
  contour_points: number[][];
  minx: number; miny: number; maxx: number; maxy: number;
  area: number;
  notch_count: number;
  has_grainline: boolean;
}

interface Props {
  debug: boolean;
  pieces: PieceInfo[] | undefined;
  /** Whether the overlay runs inside the content‑transform group (true)
   *  or in outer (pan/zoom) space (false).  Default true. */
  inContentSpace?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function signedAreaScreen(pts: number[][]): number {
  if (pts.length < 3) return 0;
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    s += x1 * y2 - x2 * y1;
  }
  return s / 2;
}

function centroidOf(pts: number[][]): [number, number] {
  let cx = 0, cy = 0;
  for (const [x, y] of pts) { cx += x; cy += y; }
  return [cx / pts.length, cy / pts.length];
}

function windingLabel(pts: number[][]): string {
  const a = signedAreaScreen(pts);
  return a > 1e-9 ? 'CW' : a < -1e-9 ? 'CCW' : 'DEGEN';
}

const PIECE_DEBUG_COLORS = [
  '#FF6B6B','#4ECDC4','#45B7D1','#FFA07A','#98D8C8','#F7DC6F','#BB8FCE','#85C1E9',
];

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function DebugOverlay({ debug, pieces, inContentSpace = true }: Props) {
  if (!debug || !pieces) return null;

  return (
    <g style={{ pointerEvents: 'none' }}>
      {pieces.map((p) => {
        const pts = p.contour_points;
        if (!pts || pts.length < 3) return null;
        const color = PIECE_DEBUG_COLORS[p.id % PIECE_DEBUG_COLORS.length];
        const [cx, cy] = centroidOf(pts);
        const winding = windingLabel(pts);
        const label = `#${p.id} ${winding} A=${p.area.toFixed(0)}`;

        return (
          <g key={`debug_${p.id}`}>
            {/* ---- Render polygon (blue) — same as visible overlay ---- */}
            <polygon
              points={pts.map(pt => `${pt[0]},${pt[1]}`).join(' ')}
              fill="rgba(0, 120, 255, 0.06)"
              stroke="#0078FF"
              strokeWidth={1.5}
              strokeLinejoin="round"
              strokeDasharray="4 3"
            />

            {/* ---- Hit polygon overlay (red) — slightly offset for comparison ---- */}
            <polygon
              points={pts.map(pt => `${pt[0]},${pt[1]}`).join(' ')}
              fill="none"
              stroke="#FF0044"
              strokeWidth={1}
              strokeLinejoin="round"
            />

            {/* ---- Numbered vertices ---- */}
            {pts.map((pt, i) => (
              <g key={`v_${p.id}_${i}`}>
                <circle cx={pt[0]} cy={pt[1]} r={4} fill={color} stroke="#fff" strokeWidth={0.8} />
                <text
                  x={pt[0] + 6} y={pt[1] - 4}
                  fill={color}
                  fontSize={8}
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {i}
                </text>
              </g>
            ))}

            {/* ---- Centroid ---- */}
            <g transform={`translate(${cx}, ${cy})`}>
              <line x1={-6} y1={0} x2={6} y2={0} stroke={color} strokeWidth={1.2} />
              <line x1={0} y1={-6} x2={0} y2={6} stroke={color} strokeWidth={1.2} />
              <circle r={2} fill={color} />
            </g>

            {/* ---- Bounding box (dashed) ---- */}
            <rect
              x={p.minx} y={p.miny}
              width={p.maxx - p.minx} height={p.maxy - p.miny}
              fill="none"
              stroke={color}
              strokeWidth={0.8}
              strokeDasharray="2 3"
              opacity={0.5}
            />

            {/* ---- Label ---- */}
            <text
              x={cx} y={cy - 14}
              textAnchor="middle"
              fill={color}
              fontSize={10}
              fontFamily="monospace"
              fontWeight="bold"
              style={{ pointerEvents: 'none' }}
            >
              {label}
            </text>
          </g>
        );
      })}
    </g>
  );
}
