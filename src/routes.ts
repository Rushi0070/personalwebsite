// The site as a small file system. Every view has a path, the URL hash
// mirrors it (#/projects/vitalsync), and the terminal's cd/ls/open work on it.

import { CHECKPOINTS } from './data';
import type { Checkpoint, Kind } from './data';

export interface Section {
  id: string;
  /** How it shows in ls: directories end in a slash. */
  file: string;
  kind?: Kind;
}

export const SECTIONS: Section[] = [
  { id: 'about', file: 'about.md' },
  { id: 'experience', file: 'experience/', kind: 'experience' },
  { id: 'projects', file: 'projects/', kind: 'project' },
  { id: 'education', file: 'education/', kind: 'education' },
  { id: 'leadership', file: 'leadership/', kind: 'leadership' },
  { id: 'skills', file: 'skills.yaml' },
  { id: 'after-hours', file: 'after-hours.md' },
  { id: 'contact', file: 'contact.md' },
];

const SECTION_OF: Record<Kind, string> = {
  experience: 'experience',
  project: 'projects',
  education: 'education',
  leadership: 'leadership',
};

export const entriesIn = (section: string): Checkpoint[] => {
  const kind = SECTIONS.find((s) => s.id === section)?.kind;
  return kind ? CHECKPOINTS.filter((c) => c.kind === kind) : [];
};

export interface Route {
  section: string;
  entry?: string;
}

export const HOME: Route = { section: 'about' };

export const routeOf = (id: string): Route | null => {
  const c = CHECKPOINTS.find((x) => x.id === id);
  return c ? { section: SECTION_OF[c.kind], entry: c.id } : null;
};

export const sameRoute = (a: Route, b: Route) => a.section === b.section && (a.entry ?? '') === (b.entry ?? '');

// A section with a single entry shows that entry; with several, an index.
export const shownEntry = (r: Route): Checkpoint | null => {
  const list = entriesIn(r.section);
  if (r.entry) return list.find((c) => c.id === r.entry) ?? null;
  return list.length === 1 ? list[0] : null;
};

// Names a section used to have, or that people might type for it.
const RENAMED: Record<string, string> = { offline: 'after-hours', dj: 'after-hours' };

export function parseHash(hash: string): Route {
  const [raw, entry] = hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  const section = RENAMED[raw] ?? raw;
  if (!SECTIONS.some((s) => s.id === section)) return HOME;
  if (entry && entriesIn(section).some((c) => c.id === entry)) return { section, entry };
  return { section };
}

export const toHash = (r: Route) => `#/${r.section}${r.entry ? `/${r.entry}` : ''}`;

/** The prompt's working directory. */
export const cwdOf = (r: Route) => (r.section === 'about' ? '~' : SECTIONS.find((s) => s.id === r.section)?.kind ? `~/${r.section}` : '~');

/** The file the view is showing, for the status line and the pane header. */
export function fileOf(r: Route): string {
  const e = shownEntry(r);
  if (e) return `~/${r.section}/${e.id}.md`;
  const s = SECTIONS.find((x) => x.id === r.section)!;
  return `~/${s.file}`;
}

const clean = (seg: string) => seg.replace(/\.(md|yaml)$/, '').replace(/\/+$/, '').toLowerCase();

// Unique-prefix match, so `cd proj` and `open vital` work.
function pick<T>(items: T[], key: (t: T) => string, q: string): T | null {
  const exact = items.find((t) => key(t) === q);
  if (exact) return exact;
  const pre = items.filter((t) => key(t).startsWith(q));
  return pre.length === 1 ? pre[0] : null;
}

/**
 * Resolve a cd/open argument from the current route: `projects`, `vitalsync`,
 * `projects/vitalsync`, `~/skills`, `..`, `~`, `/`.
 */
export function resolve(cur: Route, arg: string): Route | null {
  let a = arg.trim();
  if (a === '' || a === '~' || a === '/' || a === '~/') return HOME;
  let base: Route = cur;
  if (a.startsWith('~/') || a.startsWith('/')) {
    base = HOME;
    a = a.replace(/^~?\//, '');
  }
  const segs = a.split('/').map(clean).filter(Boolean);
  let r: Route = base;
  for (const seg of segs) {
    if (seg === '.') continue;
    if (seg === '..') {
      r = r.entry && entriesIn(r.section).length > 1 ? { section: r.section } : HOME;
      continue;
    }
    // inside a section, its entries come first
    const inHere = pick(entriesIn(r.section), (c) => c.id, seg);
    if (inHere && entriesIn(r.section).length > 1) {
      r = { section: r.section, entry: inHere.id };
      continue;
    }
    const sec = pick(SECTIONS, (s) => s.id, RENAMED[seg] ?? seg);
    if (sec) {
      r = { section: sec.id };
      continue;
    }
    const anywhere = pick(CHECKPOINTS, (c) => c.id, seg);
    if (anywhere) {
      r = routeOf(anywhere.id)!;
      continue;
    }
    return null;
  }
  return r;
}

/** Everything a path argument can complete to. */
export const PATHS: string[] = [
  ...SECTIONS.map((s) => s.id),
  ...CHECKPOINTS.map((c) => c.id),
  ...SECTIONS.filter((s) => s.kind).flatMap((s) => entriesIn(s.id).map((c) => `${s.id}/${c.id}`)),
];
