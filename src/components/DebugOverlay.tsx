'use client';

/* ------------------------------------------------------------------ */
/*  Debug overlay — uses vector-effect="non-scaling-stroke" so that    */
/*  all strokes remain the same screen‑pixel width regardless of zoom.  */
/*  Circle radii and font sizes are large enough to stay visible.       */
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
  inContentSpace?: boolean;
}

/* ---- helpers ---- */

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

/* ---- component ---- */

const VECTOR = { vectorEffect: 'non-scaling-stroke' as const };

export default function DebugOverlay({ debug, pieces }: Props) {
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
            {/* ★ TEST: huge bright circle at centroid — must be visible */}
            <circle cx={cx} cy={cy} r={30} fill="#00FF00" opacity={0.5} />
            <text x={cx} y={cy} textAnchor="middle" fill="#FF0000" fontSize={20} fontWeight="bold">●</text>

            {/* ---- Render polygon (blue) — like the visible overlay ---- */}
            <polygon
              points={pts.map(pt => `${pt[0]},${pt[1]}`).join(' ')}
              fill="rgba(0, 120, 255, 0.08)"
              stroke="#0078FF"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeDasharray="6 4"
              vectorEffect="non-scaling-stroke"
            />

            {/* ---- Hit polygon outline (red) ---- */}
            <polygon
              points={pts.map(pt => `${pt[0]},${pt[1]}`).join(' ')}
              fill="none"
              stroke="#FF0044"
              strokeWidth={1.5}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />

            {/* ---- Numbered vertices ---- */}
            {pts.map((pt, i) => (
              <g key={`v_${p.id}_${i}`}>
                <circle cx={pt[0]} cy={pt[1]} r={5} fill={color} stroke="#fff" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
                <text
                  x={pt[0] + 8} y={pt[1] - 6}
                  fill={color}
                  fontSize={11}
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {i}
                </text>
              </g>
            ))}

            {/* ---- Centroid cross ---- */}
            <g transform={`translate(${cx}, ${cy})`}>
              <line x1={-8} y1={0} x2={8} y2={0} stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
              <line x1={0} y1={-8} x2={0} y2={8} stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
              <circle r={3} fill={color} />
            </g>

            {/* ---- Bounding box (dashed) ---- */}
            <rect
              x={p.minx} y={p.miny}
              width={p.maxx - p.minx} height={p.maxy - p.miny}
              fill="none"
              stroke={color}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              opacity={0.6}
              vectorEffect="non-scaling-stroke"
            />

            {/* ---- Label ---- */}
            <text
              x={cx} y={cy - 18}
              textAnchor="middle"
              fill={color}
              fontSize={12}
              fontFamily="monospace"
              fontWeight="bold"
            >
              {label}
            </text>
          </g>
        );
      })}
    </g>
  );
}
