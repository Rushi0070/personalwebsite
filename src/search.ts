// grep and which over everything the site says.

import { AFTER_HOURS, CHECKPOINTS, CONFIG, INTRO, PLAYLIST } from './data';
import { HOME, routeOf } from './routes';
import type { Route } from './routes';

export interface Hit {
  /** Where it was found, as the terminal names it: `vitalsync`, `skills/ml`. */
  where: string;
  route: Route;
  /** A window of text around the match, and the match's span inside it. */
  snippet: string;
  at: number;
  len: number;
}

const WINDOW = 46;

function snip(text: string, i: number, len: number) {
  const start = Math.max(0, i - WINDOW);
  const end = Math.min(text.length, i + len + WINDOW);
  const pre = start > 0 ? '…' : '';
  const post = end < text.length ? '…' : '';
  return { snippet: pre + text.slice(start, end) + post, at: pre.length + (i - start), len };
}

// Every searchable string with where it lives.
function corpus(): { where: string; route: Route; text: string }[] {
  const out: { where: string; route: Route; text: string }[] = [{ where: 'about', route: HOME, text: INTRO }];
  for (const c of CHECKPOINTS) {
    const route = routeOf(c.id)!;
    out.push({ where: c.id, route, text: `${c.title} · ${c.role}` });
    for (const l of c.lines) out.push({ where: c.id, route, text: l });
    for (const k of c.config ?? []) out.push({ where: c.id, route, text: `${k.key}: ${k.value}` });
    if (c.stack.length) out.push({ where: c.id, route, text: `stack: ${c.stack.join(', ')}` });
  }
  for (const g of CONFIG) out.push({ where: `skills/${g.key}`, route: { section: 'skills' }, text: g.value.join(', ') });
  out.push({ where: 'after-hours', route: { section: 'after-hours' }, text: AFTER_HOURS.line });
  for (const t of PLAYLIST) out.push({ where: 'after-hours', route: { section: 'after-hours' }, text: `${t.title} — ${t.artist}` });
  return out;
}

const CORPUS = corpus();

export function grep(term: string, limit = 14): { hits: Hit[]; total: number } {
  const q = term.toLowerCase();
  const hits: Hit[] = [];
  let total = 0;
  for (const doc of CORPUS) {
    const i = doc.text.toLowerCase().indexOf(q);
    if (i < 0) continue;
    total++;
    if (hits.length < limit) hits.push({ where: doc.where, route: doc.route, ...snip(doc.text, i, q.length) });
  }
  return { hits, total };
}

/** Which checkpoints used a tool or skill (stack, config or bullets). */
export function which(skill: string): { id: string; how: 'stack' | 'mentioned' }[] {
  const q = skill.toLowerCase();
  const out: { id: string; how: 'stack' | 'mentioned' }[] = [];
  for (const c of CHECKPOINTS) {
    if (c.stack.some((s) => s.toLowerCase().includes(q))) out.push({ id: c.id, how: 'stack' });
    else if ([...c.lines, ...(c.config ?? []).map((k) => k.value)].some((l) => l.toLowerCase().includes(q))) out.push({ id: c.id, how: 'mentioned' });
  }
  return out;
}

export const skillGroupOf = (skill: string) => {
  const q = skill.toLowerCase();
  return CONFIG.find((g) => g.value.some((v) => v.toLowerCase().includes(q)))?.key ?? null;
};

/** Every skill name, for completion. */
export const SKILLS: string[] = [...new Set([...CONFIG.flatMap((g) => g.value), ...CHECKPOINTS.flatMap((c) => c.stack)].map((s) => s.toLowerCase()))];
