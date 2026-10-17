// The "training run" behind the chart. The curve is illustrative (it is the
// page's metaphor, not a measured metric) but it is deterministic: the same
// seed draws the same run on every visit. Time is real: x is the calendar,
// "step" is days since epoch 0, and the dated checkpoints sit where the CV
// puts them.

import { CHECKPOINTS, EPOCH0, RUN_END } from './data';

const DAY = 86_400_000;

export const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / DAY);

export interface RunPoint {
  t: number; // ms timestamp
  step: number; // days since epoch 0
  loss: number;
}

export interface Forecast {
  t: number;
  mid: number;
  lo: number;
  hi: number;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box–Muller from the seeded uniform source.
function gaussian(rand: () => number) {
  const u = Math.max(rand(), 1e-9);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const months = (t: number) => (t - EPOCH0.getTime()) / (30.44 * DAY);

// Each dated chapter starts a new task: a warm restart that bumps the loss a
// little, then decays (SGDR-style). Epoch 0 itself is the cold start.
const RESTARTS = CHECKPOINTS.filter((c) => c.at && c.at.getTime() > EPOCH0.getTime()).map((c) => months(c.at!.getTime()));

function base(m: number) {
  let v = 0.09 + 0.82 * Math.exp(-m / 13);
  for (const r of RESTARTS) {
    if (m >= r) v += 0.13 * Math.exp(-(m - r) / 2.2);
  }
  return v;
}

export function buildRun(now: Date, points = 520) {
  const rand = mulberry32(2021_10_01);
  const t0 = EPOCH0.getTime();
  const tn = Math.max(now.getTime(), t0 + DAY);
  const run: RunPoint[] = [];
  for (let i = 0; i < points; i++) {
    const t = t0 + ((tn - t0) * i) / (points - 1);
    const b = base(months(t));
    const noise = gaussian(rand) * (0.018 + 0.05 * b);
    run.push({ t, step: Math.round((t - t0) / DAY), loss: Math.min(1.05, Math.max(0.012, b + noise)) });
  }

  const forecast: Forecast[] = [];
  const te = RUN_END.getTime();
  if (te > tn) {
    const last = base(months(tn));
    const n = 60;
    for (let i = 0; i <= n; i++) {
      const t = tn + ((te - tn) * i) / n;
      const mid = base(months(t)) - (base(months(tn)) - last);
      const spread = 0.012 + 0.07 * (i / n);
      forecast.push({ t, mid, lo: Math.max(0, mid - spread), hi: mid + spread });
    }
  }
  return { run, forecast, t0, tn, te: Math.max(te, tn) };
}

// TensorBoard's debiased exponential moving average.
export function smooth(values: number[], weight: number) {
  const out = new Array<number>(values.length);
  let last = 0;
  let count = 0;
  for (let i = 0; i < values.length; i++) {
    last = last * weight + (1 - weight) * values[i];
    count++;
    const debias = weight === 1 ? 1 : 1 - Math.pow(weight, count);
    out[i] = last / debias;
  }
  return out;
}
