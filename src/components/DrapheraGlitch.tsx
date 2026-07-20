'use client';

import { useEffect, useRef, useState } from 'react';
import { userApi } from '@/lib/api';

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight'];
const COLORS = ['#1A2E5A', '#C8CCD4', '#F5F7FA', '#0F1113', '#1E90FF'];
const BLOCK_SIZE = 24;
const COLS = 8;
const ROWS = 14;

const SHAPES = [
  [[1,1,1,1]],
  [[1,1],[1,1]],
  [[1,0],[1,0],[1,1]],
  [[0,1],[0,1],[1,1]],
  [[1,1,0],[0,1,1]],
  [[0,1,1],[1,1,0]],
];

export default function DrapheraGlitch() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [active, setActive] = useState(false);
  const [showBadge, setShowBadge] = useState(false);
  const keysRef = useRef<string[]>([]);
  const frameRef = useRef(0);
  const gridRef = useRef<number[][]>([]);
  const pieceRef = useRef<{ shape: number[][]; x: number; y: number; color: string } | null>(null);
  const dropCounterRef = useRef(0);

  // Konami code listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      keysRef.current.push(e.key);
      keysRef.current = keysRef.current.slice(-KONAMI.length);
      if (keysRef.current.join(',') === KONAMI.join(',')) {
        setActive(true);
        userApi.unlockTetrisBadge().catch(() => {});
        setTimeout(() => { setActive(false); setShowBadge(true); }, 5000);
        setTimeout(() => setShowBadge(false), 8000);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Game loop
  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Init grid
    if (gridRef.current.length === 0) {
      gridRef.current = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    }

    const spawn = () => {
      const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      pieceRef.current = {
        shape, x: Math.floor((COLS - shape[0].length) / 2), y: 0,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      };
    };

    if (!pieceRef.current) spawn();

    let frameCount = 0;
    let scanlinePhase = 0;
    let glitchTimer = 0;
    const interval = setInterval(() => {
      frameCount++;
      scanlinePhase = (scanlinePhase + 1) % 3;

      // Random glitch
      if (Math.random() < 0.03) glitchTimer = 3;

      const p = pieceRef.current;
      if (p) {
        dropCounterRef.current++;
        if (dropCounterRef.current >= 20) {
          dropCounterRef.current = 0;
          p.y++;
          // Check collision
          let collided = false;
          for (let r = 0; r < p.shape.length; r++) {
            for (let c = 0; c < p.shape[r].length; c++) {
              if (p.shape[r][c]) {
                const ny = p.y + r;
                const nx = p.x + c;
                if (ny >= ROWS || (ny >= 0 && gridRef.current[ny]?.[nx])) collided = true;
              }
            }
          }
          if (collided) {
            p.y--;
            for (let r = 0; r < p.shape.length; r++) {
              for (let c = 0; c < p.shape[r].length; c++) {
                if (p.shape[r][c]) {
                  const gy = p.y + r;
                  const gx = p.x + c;
                  if (gy >= 0 && gy < ROWS && gx >= 0 && gx < COLS) gridRef.current[gy][gx] = 1;
                }
              }
            }
            pieceRef.current = null;
            spawn();
          }
        }
      }

      // Draw
      const W = COLS * BLOCK_SIZE;
      const H = ROWS * BLOCK_SIZE;

      // Glitch shift
      ctx.save();
      if (glitchTimer > 0) {
        glitchTimer--;
        ctx.translate(Math.random() * 4 - 2, 0);
      }

      // Background
      ctx.fillStyle = '#0F1113';
      ctx.fillRect(0, 0, W, H);

      // Grid blocks
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (gridRef.current[r]?.[c]) {
            const color = COLORS[(r + c) % COLORS.length];
            ctx.fillStyle = color;
            ctx.fillRect(c * BLOCK_SIZE + 1, r * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
            ctx.strokeStyle = 'rgba(30,144,255,0.2)';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(c * BLOCK_SIZE + 1, r * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
          }
        }
      }

      // Current piece
      if (p) {
        ctx.fillStyle = p.color;
        for (let r = 0; r < p.shape.length; r++) {
          for (let c = 0; c < p.shape[r].length; c++) {
            if (p.shape[r][c]) {
              const x = (p.x + c) * BLOCK_SIZE + 1;
              const y = (p.y + r) * BLOCK_SIZE + 1;
              ctx.fillRect(x, y, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
              ctx.strokeStyle = 'rgba(30,144,255,0.3)';
              ctx.lineWidth = 0.5;
              ctx.strokeRect(x, y, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
            }
          }
        }
      }

      // Scanlines
      if (scanlinePhase === 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.04)';
        for (let i = 0; i < H; i += 3) {
          ctx.fillRect(0, i, W, 1);
        }
      }

      // Vignette
      const grad = ctx.createRadialGradient(W/2, H/2, W*0.2, W/2, H/2, W*0.7);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(1, 'rgba(0,0,0,0.3)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      ctx.restore();

      // HUD text
      ctx.fillStyle = 'rgba(30,144,255,0.5)';
      ctx.font = '7px monospace';
      ctx.fillText('DRAPHERA MODULAR GLITCH', 4, H - 4);

    }, 60);

    return () => clearInterval(interval);
  }, [active]);

  if (!active && !showBadge) return null;

  return (
    <>
      {active && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm" style={{ pointerEvents: 'none' }}>
          <div className="relative">
            <canvas ref={canvasRef} width={COLS * BLOCK_SIZE} height={ROWS * BLOCK_SIZE}
              className="border border-blue-500/30 shadow-lg shadow-blue-500/10" />
            <div className="absolute -top-6 left-0 right-0 text-center">
              <span className="text-[8px] font-mono text-blue-400/60 tracking-[0.3em] uppercase">MODULAR GLITCH v1.0</span>
            </div>
          </div>
        </div>
      )}
      {showBadge && (
        <div className="fixed bottom-20 right-4 z-[200] animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 shadow-lg shadow-blue-500/10">
            <svg className="w-3.5 h-3.5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354.31.035.56.294.56.604v0c0 .355-.186.676-.401.959-.221.29-.349.634-.349 1.003 0 1.036 1.007 1.875 2.25 1.875s2.25-.84 2.25-1.875c0-.369-.128-.713-.349-1.003-.215-.283-.401-.604-.401-.959v0c0-.31.25-.57.56-.604a48.039 48.039 0 004.616-.354 48.083 48.083 0 00-.642-5.056c-.023-.31.222-.57.532-.57v0c.355 0 .676.186.959.401.29.221.634.349 1.003.349 1.036 0 1.875-1.007 1.875-2.25s-.84-2.25-1.875-2.25c-.369 0-.713.128-1.003.349-.283.215-.604.401-.959.401v0a.656.656 0 01-.658-.663 48.422 48.422 0 01.315-4.907c-1.381.205-2.779.28-4.163.3a.64.64 0 01-.657-.643z" /></svg>
            <span className="text-[10px] font-semibold text-blue-400">Secret unlocked</span>
          </div>
        </div>
      )}
    </>
  );
}
