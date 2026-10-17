import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { EPOCH0, LINKS, PERSON } from './data';
import { SECTIONS, entriesIn, fileOf, parseHash, routeOf, sameRoute, shownEntry, toHash } from './routes';
import type { Route } from './routes';
import { daysBetween } from './run';
import type { GH } from './shell';
import Pane from './components/Pane';
import Terminal from './components/Terminal';
import type { TerminalHandle } from './components/Terminal';

// rushi-jhala / workspace.
// One screen, no page scroll: an index of the site on the left, one view at
// a time in the middle, and a terminal docked below that drives all of it.
// Clicks become commands, so the terminal teaches itself as you browse.

const THEMES = ['graphite', 'paper', 'phosphor'] as const;
type Theme = (typeof THEMES)[number];

const store = {
  get(k: string) {
    try {
      return window.localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k: string, v: string) {
    try {
      window.localStorage.setItem(k, v);
    } catch {
      /* private mode: preference just won't persist */
    }
  },
};

// The theme attribute is set before React re-renders, so the canvas (whose
// effect runs before this component's) repaints with the new tokens.
function applyTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
  store.set('theme', t);
}

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduce(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduce;
}

function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

// Live, public GitHub activity: repo count and the most recent push
// (cached for the session; dashes if offline or rate limited).
function useGithub(user: string) {
  const KEY = `gh2:${user}`;
  const [gh, setGh] = useState<GH | null>(() => {
    try {
      const cached = sessionStorage.getItem(KEY);
      return cached ? (JSON.parse(cached) as GH) : null;
    } catch {
      return null;
    }
  });
  useEffect(() => {
    if (gh) return;
    const ctrl = new AbortController();
    (async () => {
      try {
        const [u, r] = await Promise.all([
          fetch(`https://api.github.com/users/${user}`, { signal: ctrl.signal }).then((x) => (x.ok ? x.json() : Promise.reject())),
          fetch(`https://api.github.com/users/${user}/repos?sort=pushed&per_page=1`, { signal: ctrl.signal }).then((x) => (x.ok ? x.json() : Promise.reject())),
        ]);
        const latest = Array.isArray(r) && r[0] ? r[0] : null;
        const value: GH = { repos: u.public_repos ?? 0, pushedRepo: latest?.name ?? '', pushedAt: latest?.pushed_at ?? '' };
        setGh(value);
        try {
          sessionStorage.setItem(KEY, JSON.stringify(value));
        } catch {
          /* ignore */
        }
      } catch {
        /* offline or rate limited: show dashes */
      }
    })();
    return () => ctrl.abort();
  }, [KEY, gh, user]);
  return gh;
}

// Old-style links (#vitalsync) still work.
function initialRoute(): Route {
  const raw = decodeURIComponent(window.location.hash.replace(/^#\/?/, ''));
  return routeOf(raw) ?? parseHash(window.location.hash);
}

const pad2 = (n: number) => String(n).padStart(2, '0');

function Mark() {
  // The mark is a loss curve: a stepped descent inside a square.
  return (
    <svg className="mark" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="0.5" y="0.5" width="15" height="15" fill="none" stroke="currentColor" />
      <path d="M3 3.5V7.5H6.5V10H9.5V11.5H13" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export default function App() {
  const reduceMotion = usePrefersReducedMotion();
  const now = useNow();
  const gh = useGithub(LINKS.githubUser);
  const term = useRef<TerminalHandle>(null);

  const [route, setRoute] = useState<Route>(initialRoute);
  const [hl, setHl] = useState('');
  const [typing, setTyping] = useState(false);
  const [trainKey, setTrainKey] = useState(0);
  const [booted, setBooted] = useState(false);
  const depth = useRef(0); // how many views we pushed, for `back`

  // The terminal's height: drag its top edge; double-click resets.
  const [dockH, setDockH] = useState<number | null>(() => {
    const v = Number(store.get('dock-h'));
    return Number.isFinite(v) && v > 0 ? v : null;
  });
  const [dragging, setDragging] = useState(false);
  const startDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  };
  const onDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const h = Math.round(window.innerHeight - e.clientY - 22);
    setDockH(Math.max(132, Math.min(Math.round(window.innerHeight * 0.7), h)));
  };
  const endDrag = () => {
    setDragging(false);
    if (dockH) store.set('dock-h', String(dockH));
  };

  const [theme, setTheme] = useState<Theme>(() => {
    const saved = store.get('theme') as Theme | null;
    const t = saved && (THEMES as readonly string[]).includes(saved) ? saved : 'graphite';
    applyTheme(t);
    return t;
  });

  const cycleTheme = useCallback(
    (name?: string) => {
      let next: Theme;
      if (name && (THEMES as readonly string[]).includes(name)) next = name as Theme;
      else next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
      applyTheme(next);
      setTheme(next);
      return next;
    },
    [theme],
  );

  const routeRef = useRef(route);
  useEffect(() => {
    routeRef.current = route;
  }, [route]);

  const go = useCallback((r: Route) => {
    if (sameRoute(r, routeRef.current)) return;
    routeRef.current = r;
    setRoute(r);
    depth.current++;
    window.history.pushState(null, '', toHash(r));
  }, []);

  const back = useCallback(() => {
    if (depth.current <= 0) return false;
    depth.current--;
    window.history.back();
    return true;
  }, []);

  // Browser back/forward.
  useEffect(() => {
    const on = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('popstate', on);
    return () => window.removeEventListener('popstate', on);
  }, []);

  // Make the initial URL canonical without adding a history entry.
  useEffect(() => {
    window.history.replaceState(null, '', toHash(routeRef.current));
    const id = window.setTimeout(() => setBooted(true), 250);
    return () => window.clearTimeout(id);
  }, []);

  const run = useCallback((cmd: string) => term.current?.run(cmd), []);
  const runTyped = useCallback((cmd: string) => term.current?.run(cmd, { type: true }), []);

  const ctx = useMemo(
    () => ({
      route,
      go,
      back,
      highlight: setHl,
      setTheme: cycleTheme,
      theme,
      themes: THEMES,
      gh,
      now,
      retrain: () => setTrainKey((k) => k + 1),
    }),
    [route, go, back, cycleTheme, theme, gh, now],
  );

  // Keys when not typing: / or : focuses the terminal, j/k move between
  // sections, h/l between entries, t cycles the theme, esc clears grep.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const si = SECTIONS.findIndex((s) => s.id === routeRef.current.section);
      const list = entriesIn(routeRef.current.section);
      const cur = shownEntry(routeRef.current);
      const sectionCmd = (i: number) => {
        const s = SECTIONS[(i + SECTIONS.length) % SECTIONS.length];
        return s.kind ? `cd ${s.id}` : s.id === 'about' ? 'cd ~' : `open ${s.id}`;
      };
      if (e.key === '/' || e.key === ':') {
        e.preventDefault();
        term.current?.focus();
      } else if (e.key === 'j') run(sectionCmd(si + 1));
      else if (e.key === 'k') run(sectionCmd(si - 1));
      else if ((e.key === 'l' || e.key === ']') && list.length > 1) {
        const i = cur ? list.indexOf(cur) : -1;
        run(`open ${list[(i + 1) % list.length].id}`);
      } else if ((e.key === 'h' || e.key === '[') && list.length > 1) {
        const i = cur ? list.indexOf(cur) : 0;
        run(`open ${list[(i - 1 + list.length) % list.length].id}`);
      } else if (e.key === 't') run('theme');
      else if (e.key === '?') run('help');
      else if (e.key === 'Escape') setHl('');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [run]);

  const step = daysBetween(EPOCH0, now);

  return (
    <div className="app" style={dockH ? ({ '--dock-h': `${dockH}px` } as CSSProperties) : undefined}>
      <a href="#term" className="skip" onClick={(e) => (e.preventDefault(), term.current?.focus())}>
        skip to the terminal
      </a>

      {/* ---- top ---- */}
      <header className="top">
        <button type="button" className="brand" onClick={() => run('cd ~')}>
          <Mark />
          <span>{PERSON.name.toLowerCase()}</span>
        </button>
        <p className="tagline">ms data science, stony brook · computer vision · nlp · edge ai</p>
        <nav className="links" aria-label="Elsewhere">
          <a href={LINKS.github} target="_blank" rel="noopener noreferrer">github</a>
          <a href={LINKS.linkedin} target="_blank" rel="noopener noreferrer">linkedin</a>
          <button type="button" onClick={() => run('mail')}>email</button>
          <button type="button" className="key" onClick={() => run('resume')}>resume ↓</button>
        </nav>
      </header>

      {/* ---- index ---- */}
      <nav className="index" aria-label="Site">
        <p className="index-root">~/{PERSON.handle}</p>
        <ol>
          {SECTIONS.map((s, i) => {
            const list = entriesIn(s.id);
            const on = route.section === s.id;
            const cmd = s.kind ? `cd ${s.id}` : s.id === 'about' ? 'cd ~' : `open ${s.id}`;
            return (
              <li key={s.id} className={on ? 'is-on' : ''}>
                <button type="button" aria-current={on && !route.entry ? 'page' : undefined} onClick={() => run(cmd)} title={cmd}>
                  <span className="ix-n">{pad2(i)}</span>
                  <span className="ix-name">{s.file}</span>
                  {list.length > 1 && <span className="ix-count">{list.length}</span>}
                </button>
                {list.length > 1 && (
                  <ol className="ix-sub">
                    {list.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          aria-current={route.entry === c.id ? 'page' : undefined}
                          onClick={() => run(`open ${c.id}`)}
                          title={`open ${c.id}`}
                        >
                          {c.id}.md
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
              </li>
            );
          })}
        </ol>
        <div className="index-foot">
          <button type="button" onClick={() => runTyped('help')}>
            <kbd>?</kbd> commands
          </button>
          <button type="button" onClick={() => run('theme')}>
            <kbd>t</kbd> theme <span>{theme}</span>
          </button>
        </div>
      </nav>

      {/* ---- the view ---- */}
      <Pane route={route} hl={hl} run={run} clearHl={() => setHl('')} now={now} gh={gh} theme={theme} reduceMotion={reduceMotion} trainKey={trainKey} />

      {/* ---- the terminal ---- */}
      <div className="dock" id="term">
        <div
          className={`dock-handle ${dragging ? 'is-drag' : ''}`}
          onPointerDown={startDrag}
          onPointerMove={onDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onDoubleClick={() => {
            setDockH(null);
            store.set('dock-h', '');
          }}
          title="drag to resize · double-click to reset"
          aria-hidden="true"
        />
        <Terminal ref={term} ctx={ctx} start={booted} reduceMotion={reduceMotion} onFocusChange={setTyping} />
      </div>

      {/* ---- status line ---- */}
      <footer className="status" aria-hidden="true">
        <span className={`mode ${typing ? 'is-insert' : ''}`}>{typing ? 'INSERT' : 'NORMAL'}</span>
        <span className="st-path">{fileOf(route)}</span>
        {hl && <span className="st-grep">/{hl}</span>}
        <span className="st-keys">
          <kbd>/</kbd> type <kbd>j</kbd><kbd>k</kbd> sections <kbd>h</kbd><kbd>l</kbd> entries <kbd>?</kbd> help
        </span>
        <span className="st-item">{theme}</span>
        <span className="st-pos">step {step.toLocaleString('en-US')}</span>
      </footer>
    </div>
  );
}
