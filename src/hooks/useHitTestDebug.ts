'use client';

import { useCallback, useRef, useEffect } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface PieceInfo {
  id: number;
  contour_points: number[][];
  minx: number; miny: number; maxx: number; maxy: number;
  area: number;
}

interface DebugSnapshot {
  /** Piece id or undefined */
  pieceId: number | undefined;
  /** Elements returned by elementsFromPoint */
  elementsAtPoint: { tag: string; id: string | null; dataAttrs: Record<string, string> }[];
  /** Viewport coordinates */
  clientX: number;
  clientY: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Signed area → winding label in screen coords (y‑down). */
function windingLabel(pts: number[][]): string {
  if (pts.length < 3) return '—';
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    s += x1 * y2 - x2 * y1;
  }
  const area = s / 2;
  // screen coords: CW = positive, CCW = negative
  return area > 1e-9 ? 'CW (screen)' : area < -1e-9 ? 'CCW (screen)' : 'DEGENERATE';
}

function centroidOf(pts: number[][]): [number, number] {
  let cx = 0, cy = 0;
  for (const [x, y] of pts) { cx += x; cy += y; }
  return [cx / pts.length, cy / pts.length];
}

function bboxOf(pts: number[][]): [number, number, number, number] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return [minX, minY, maxX, maxY];
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useHitTestDebug(
  debug: boolean,
  svgRef: React.RefObject<SVGSVGElement | null>,
  pieces: PieceInfo[] | undefined,
) {

  const lastSnapshot = useRef<DebugSnapshot | null>(null);

  /* ---- dump piece geometry when debug toggles or pieces change ---- */
  useEffect(() => {
    if (!debug || !pieces) return;
    console.group('%c🔍 Hit‑Test Debug — Piece Geometry', 'font-weight:bold;color:#F2C94C');
    for (const p of pieces) {
      const pts = p.contour_points;
      if (!pts || pts.length < 3) {
        console.warn(`  Piece #${p.id}: skipped (<3 pts)`);
        continue;
      }
      const [cx, cy] = centroidOf(pts);
      const [minX, minY, maxX, maxY] = bboxOf(pts);
      console.log(`  Piece #${p.id}`);
      console.log(`    points (${pts.length}):`, pts);
      console.log(`    winding: ${windingLabel(pts)}`);
      console.log(`    signed area: ${(signedArea(pts)).toFixed(1)}`);
      console.log(`    centroid: (${cx.toFixed(1)}, ${cy.toFixed(1)})`);
      console.log(`    bbox: (${minX.toFixed(1)}, ${minY.toFixed(1)}) → (${maxX.toFixed(1)}, ${maxY.toFixed(1)})`);
      console.log(`    minx/miny/maxx/maxy from API:`, { minx: p.minx, miny: p.miny, maxx: p.maxx, maxy: p.maxy });
      console.log(`    bbox match: ${Math.abs(minX - p.minx) < 0.5 ? '✅' : '❌'}`);
    }
    console.groupEnd();
  }, [debug, pieces]);

  /* ---- log elementsFromPoint on each pointer move ---- */
  const onPointerMoveDebug = useCallback((e: React.PointerEvent) => {
    if (!debug) return;
    const els = document.elementsFromPoint(e.clientX, e.clientY);
    const summary = els.map(el => ({
      tag: el.tagName.toLowerCase(),
      id: el.getAttribute('id'),
      dataAttrs: Object.fromEntries(
        Array.from(el.attributes)
          .filter(a => a.name.startsWith('data-'))
          .map(a => [a.name, a.value])
      ),
    }));

    // Find piece under cursor
    let pieceId: number | undefined;
    for (const el of els) {
      const attr = (el as Element).getAttribute?.('data-piece-id');
      if (attr) { pieceId = Number(attr); break; }
    }

    lastSnapshot.current = {
      pieceId,
      elementsAtPoint: summary,
      clientX: e.clientX,
      clientY: e.clientY,
    };

    console.log(
      `%c🔎 elementsFromPoint(${e.clientX}, ${e.clientY})`,
      'color:#888',
      `→ piece: ${pieceId ?? '—'}  elements:`,
      summary.map(s => `<${s.tag}${s.id ? '#'+s.id : ''}>`).join(' ')
    );
  }, [debug]);

  return { onPointerMoveDebug, lastSnapshot };
}

function signedArea(pts: number[][]): number {
  if (pts.length < 3) return 0;
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    s += x1 * y2 - x2 * y1;
  }
  return s / 2;
}
