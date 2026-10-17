import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent, PointerEvent } from 'react';
import { CHECKPOINTS, EPOCH0, RUN_END } from '../data';
import { buildRun, smooth } from '../run';

interface Props {
  activeId: string;
  onSelect: (id: string) => void;
  smoothing: number;
  theme: string;
  now: Date;
  reduceMotion: boolean;
}

// Plot box inside the canvas. The top band holds the checkpoint flags, so
// labels never sit on the curve.
const PAD = { l: 30, r: 12, t: 36, b: 22 };
const LANE = 12; // y of the flag row
const Y_MAX = 1.1;
const EASE = (x: number) => 1 - Math.pow(1 - x, 5); // easeOutQuint

// Dated checkpoints, in time order.
const DATED = CHECKPOINTS.filter((c) => c.at)
  .sort((a, b) => a.at!.getTime() - b.at!.getTime())
  .map((c) => ({ c }));

const fmtMonth = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export default function LossChart({ activeId, onSelect, smoothing, theme, now, reduceMotion }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hover, setHover] = useState<number | null>(null); // index into run
  const [progress, setProgress] = useState(reduceMotion ? 1 : 0);
  const reveal = reduceMotion ? 1 : progress;

  const { run, forecast, t0, te } = useMemo(() => buildRun(now), [now]);
  const smoothed = useMemo(() => smooth(run.map((p) => p.loss), smoothing), [run, smoothing]);

  // Size the canvas to its box, at device pixel ratio.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: Math.round(width), h: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Draw the run in from left to right, once.
  useEffect(() => {
    if (reduceMotion) return;
    let raf = 0;
    const start = performance.now();
    const DURATION = 2200;
    const tick = (ts: number) => {
      const p = Math.min(1, Math.max(0, (ts - start) / DURATION));
      setProgress(EASE(p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduceMotion]);

  // Paint.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.w === 0 || size.h === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const css = getComputedStyle(canvas);
    const v = (name: string) => css.getPropertyValue(name).trim();
    const C = {
      ink: v('--ink'),
      dim: v('--dim'),
      chrome: v('--chrome'),
      grid: v('--grid'),
      line: v('--line'),
      bg: v('--bg'),
      train: v('--train'),
      val: v('--val'),
    };
    const family = v('--mono-family') || 'monospace';
    const small = `400 10px ${family}`;
    const body = `400 11px ${family}`;

    const W = size.w;
    const H = size.h;
    const pw = W - PAD.l - PAD.r;
    const ph = H - PAD.t - PAD.b;
    const tEnd = run[run.length - 1].t;
    const X = (t: number) => PAD.l + ((t - t0) / (te - t0)) * pw;
    const Y = (val: number) => PAD.t + (1 - Math.min(val, Y_MAX) / Y_MAX) * ph;
    const snap = (n: number) => Math.round(n) + 0.5; // crisp 1px lines
    const idxAt = (t: number) => Math.min(run.length - 1, Math.max(0, Math.round(((t - t0) / (tEnd - t0)) * (run.length - 1))));

    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1;

    // Labels claim boxes; a later label that would overlap one is skipped,
    // so narrow canvases lose the least important tags, never legibility.
    const taken: [number, number, number, number][] = [];
    const free = (x: number, y: number, w: number, h: number) =>
      x >= 0 && x + w <= W && !taken.some(([a, b, c, d]) => x < a + c && x + w > a && y < b + d && y + h > b);
    const claim = (x: number, y: number, w: number, h: number) => taken.push([x, y, w, h]);

    // y grid: three rules, dotted except the floor
    ctx.font = small;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';
    for (const yv of [0, 0.5, 1]) {
      const y = snap(Y(yv));
      ctx.strokeStyle = yv === 0 ? C.line : C.grid;
      ctx.setLineDash(yv === 0 ? [] : [1, 3]);
      ctx.beginPath();
      ctx.moveTo(PAD.l, y);
      ctx.lineTo(W - PAD.r, y);
      ctx.stroke();
      ctx.fillStyle = C.dim;
      ctx.fillText(yv.toFixed(1), PAD.l - 8, y);
    }
    ctx.setLineDash([]);

    // x axis: years labelled, quarters ticked
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const startYear = new Date(t0).getFullYear();
    const endYear = new Date(te).getFullYear();
    for (let yr = startYear; yr <= endYear; yr++) {
      for (let q = 0; q < 4; q++) {
        const t = new Date(yr, q * 3, 1).getTime();
        if (t < t0 || t > te) continue;
        const x = snap(X(t));
        ctx.strokeStyle = q === 0 ? C.dim : C.line;
        ctx.beginPath();
        ctx.moveTo(x, PAD.t + ph);
        ctx.lineTo(x, PAD.t + ph + (q === 0 ? 4 : 2));
        ctx.stroke();
        if (q === 0) {
          ctx.fillStyle = C.dim;
          ctx.fillText(String(yr), x, PAD.t + ph + 7);
        }
      }
    }

    const nowX = X(tEnd);
    const done = reveal >= 0.999;

    // forecast band (now → expected graduation), after the run has drawn in
    if (forecast.length && done) {
      ctx.fillStyle = C.val;
      ctx.globalAlpha = 0.08;
      ctx.beginPath();
      forecast.forEach((f, i) => (i ? ctx.lineTo(X(f.t), Y(f.hi)) : ctx.moveTo(X(f.t), Y(f.hi))));
      for (let i = forecast.length - 1; i >= 0; i--) ctx.lineTo(X(forecast[i].t), Y(forecast[i].lo));
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = C.val;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      forecast.forEach((f, i) => (i ? ctx.lineTo(X(f.t), Y(f.mid)) : ctx.moveTo(X(f.t), Y(f.mid))));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // clip to the revealed part of the run
    const revealT = t0 + (tEnd - t0) * reveal;
    const visible = run.filter((p) => p.t <= revealT);

    // raw (faint) then smoothed
    if (visible.length > 1) {
      ctx.lineJoin = 'round';
      ctx.strokeStyle = C.train;
      ctx.globalAlpha = 0.2;
      ctx.beginPath();
      visible.forEach((p, i) => (i ? ctx.lineTo(X(p.t), Y(p.loss)) : ctx.moveTo(X(p.t), Y(p.loss))));
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      visible.forEach((p, i) => {
        const y = Y(smoothed[i]);
        if (i) ctx.lineTo(X(p.t), y);
        else ctx.moveTo(X(p.t), y);
      });
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    // checkpoint flags: a labelled cell in the top lane, a hairline down to
    // the run, a square on the curve. The active one is inverted.
    // Flags that would overlap are pushed right, keeping time order.
    ctx.font = body;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    let edge = -Infinity;
    const flags = DATED.map(({ c }) => {
      const on = c.id === activeId;
      const label = c.id;
      const w = Math.ceil(ctx.measureText(label).width) + 8;
      const x = X(c.at!.getTime());
      const left = Math.max(Math.round(x - 4), edge + 3);
      edge = left + w;
      claim(left, LANE - 7, w, 14);
      return { c, on, label, w, x, left };
    });
    for (const f of flags) {
      const t = f.c.at!.getTime();
      if (t > revealT + 1) continue;
      const x = snap(f.x);
      const y = Math.round(Y(smoothed[idxAt(t)]));
      ctx.strokeStyle = f.on ? C.chrome : C.line;
      ctx.setLineDash(f.on ? [] : [1, 2]);
      ctx.beginPath();
      ctx.moveTo(x, LANE + 7);
      ctx.lineTo(x, y - 4);
      ctx.stroke();
      ctx.setLineDash([]);
      if (f.on) {
        ctx.fillStyle = C.ink;
        ctx.fillRect(f.left, LANE - 7, f.w, 14);
        ctx.fillStyle = C.bg;
      } else {
        ctx.fillStyle = C.bg;
        ctx.fillRect(f.left, LANE - 7, f.w, 14);
        ctx.strokeStyle = C.line;
        ctx.strokeRect(f.left + 0.5, LANE - 6.5, f.w - 1, 13);
        ctx.fillStyle = C.chrome;
      }
      ctx.fillText(f.label, f.left + 4, LANE + 0.5);
      ctx.fillStyle = f.on ? C.ink : C.bg;
      ctx.strokeStyle = f.on ? C.ink : C.chrome;
      ctx.fillRect(x - 3, y - 3, 6, 6);
      ctx.strokeRect(x - 2.5, y - 2.5, 5, 5);
    }

    // "now": a dashed rule, and an instrument tag on the head of the run
    ctx.strokeStyle = C.dim;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(snap(nowX), LANE + 7);
    ctx.lineTo(snap(nowX), PAD.t + ph);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = small;
    ctx.fillStyle = C.chrome;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    {
      const w = Math.ceil(ctx.measureText('now').width) + 6;
      const x = Math.min(W - PAD.r - w, Math.max(Math.round(nowX - w / 2), edge + 3));
      if (free(x, LANE - 7, w, 14)) {
        ctx.fillStyle = C.bg;
        ctx.fillRect(x, LANE - 7, w, 14);
        ctx.fillStyle = C.chrome;
        ctx.fillText('now', x + 3, LANE + 0.5);
        claim(x, LANE - 7, w, 14);
      }
    }

    if (visible.length > 1) {
      const i = visible.length - 1;
      const hx = Math.round(X(visible[i].t));
      const hy = Math.round(Y(smoothed[i]));
      ctx.fillStyle = C.train;
      if (done) {
        ctx.strokeStyle = C.train;
        ctx.strokeRect(hx - 4.5, hy - 4.5, 9, 9);
        ctx.fillRect(hx - 1, hy - 1, 2, 2);
        const tag = `head ${smoothed[i].toFixed(3)}`;
        const tw = Math.ceil(ctx.measureText(tag).width) + 8;
        const tx = hx - 8 - tw;
        const ty = Math.max(LANE + 12, hy - 22);
        claim(tx, ty, tw, 13);
        ctx.fillStyle = C.bg;
        ctx.fillRect(tx, ty, tw, 13);
        ctx.fillStyle = C.chrome;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(tag, tx + 4, ty + 7);
        // leader from the tag to the head
        ctx.strokeStyle = C.dim;
        ctx.beginPath();
        ctx.moveTo(tx + tw, ty + 6.5);
        ctx.lineTo(hx - 5, hy - 5);
        ctx.stroke();

        // the forecast's end-of-line tag, if there is room for it
        if (forecast.length) {
          const last = forecast[forecast.length - 1];
          const tag2 = 'eta ' + fmtMonth(RUN_END.getTime());
          const w2 = Math.ceil(ctx.measureText(tag2).width);
          const x2 = Math.round(X(last.t)) - w2;
          const y2 = Math.round(Y(last.hi)) - 17;
          if (free(x2, y2, w2, 13)) {
            ctx.fillStyle = C.val;
            ctx.fillText(tag2, x2, y2 + 7);
          }
        }
      } else {
        ctx.beginPath();
        ctx.arc(hx, hy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // hover crosshair
    if (hover !== null && hover < visible.length) {
      const p = run[hover];
      const x = snap(X(p.t));
      const y = Y(smoothed[hover]);
      ctx.strokeStyle = C.chrome;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(x, PAD.t - 6);
      ctx.lineTo(x, PAD.t + ph);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = C.bg;
      ctx.strokeStyle = C.train;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.lineWidth = 1;
    }
  }, [size, run, forecast, smoothed, reveal, hover, activeId, theme, t0, te]);

  const onMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pw = rect.width - PAD.l - PAD.r;
    const t = t0 + ((x - PAD.l) / pw) * (te - t0);
    const tEnd = run[run.length - 1].t;
    if (x < PAD.l || t > tEnd) {
      setHover(null);
      return;
    }
    const i = Math.round(((t - t0) / (tEnd - t0)) * (run.length - 1));
    setHover(Math.max(0, Math.min(run.length - 1, i)));
  };

  // Click near a dated checkpoint to select it.
  const onClick = (e: MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pw = rect.width - PAD.l - PAD.r;
    let best: { id: string; d: number } | null = null;
    for (const { c } of DATED) {
      const cx = PAD.l + ((c.at!.getTime() - t0) / (te - t0)) * pw;
      const d = Math.abs(cx - x);
      if (d < 18 && (!best || d < best.d)) best = { id: c.id, d };
    }
    if (best) onSelect(best.id);
  };

  const hp = hover !== null ? run[hover] : null;

  return (
    <div className="chart" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        className="chart-canvas"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        onClick={onClick}
        role="img"
        aria-label={`Illustrative training-loss curve from ${fmtMonth(EPOCH0.getTime())} to now, with checkpoints at each dated chapter of the CV.`}
      />
      <div className={`readout ${hp ? 'is-on' : ''}`} aria-hidden="true">
        {hp && (
          <>
            <span>{fmtMonth(hp.t)}</span>
            <span>step {hp.step.toLocaleString('en-US')}</span>
            <span>loss <b>{hp.loss.toFixed(3)}</b></span>
            <span>smoothed <b>{smoothed[hover!].toFixed(3)}</b></span>
          </>
        )}
      </div>
    </div>
  );
}
