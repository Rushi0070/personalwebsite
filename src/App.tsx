import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { CHECKPOINTS, CONFIG, EPOCH0, LINKS, PERSON, RUN_END } from './data';
import { daysBetween } from './run';
import LossChart from './components/LossChart';
import Terminal from './components/Terminal';
import Buffer from './components/Buffer';
import type { TerminalHandle } from './components/Terminal';

// rushi-jhala / training run.
// The page is an experiment dashboard: the career is the run, each role and
// project is a checkpoint, the CV's numbers are the evals, the stack is the
// config. Desktop is one fixed stage; small screens fold into a column.

const THEMES = ['graphite', 'paper', 'phosphor'] as const;
// Must match the stage breakpoint in index.css.
const DESKTOP = '(min-width: 1180px) and (min-height: 700px)';
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

interface GH {
  repos: number;
  pushedRepo: string;
  pushedAt: string;
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
        const value: GH = {
          repos: u.public_repos ?? 0,
          pushedRepo: latest?.name ?? '',
          pushedAt: latest?.pushed_at ?? '',
        };
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

function idFromHash() {
  const id = decodeURIComponent(window.location.hash.slice(1));
  return CHECKPOINTS.some((c) => c.id === id) ? id : null;
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const fmtTime = (d: Date) =>
  d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }).toLowerCase();
const fmtDate = (d: Date) => `${d.getFullYear()}.${pad2(d.getMonth() + 1)}`;

function monthsUntil(from: Date, to: Date) {
  return Math.max(0, (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()));
}

function ago(iso: string, now: Date) {
  const ms = now.getTime() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return '';
  const h = Math.round(ms / 3_600_000);
  if (h < 1) return 'just now';
  if (h < 48) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d < 60 ? `${d}d ago` : `${Math.round(d / 30)}mo ago`;
}

// --- small pieces -------------------------------------------------------------

function Mark() {
  // The mark is a loss curve: a stepped descent inside a square.
  return (
    <svg className="mark" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="0.5" y="0.5" width="15" height="15" fill="none" stroke="currentColor" />
      <path d="M3 3.5V7.5H6.5V10H9.5V11.5H13" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function Panel({ title, meta, className, children, id }: { title: ReactNode; meta?: ReactNode; className?: string; children: ReactNode; id?: string }) {
  return (
    <section className={`panel ${className ?? ''}`} aria-label={typeof title === 'string' ? title : undefined} id={id}>
      <header className="panel-head">
        <span className="panel-title">{title}</span>
        {meta && <span className="panel-meta">{meta}</span>}
      </header>
      <div className="panel-body">{children}</div>
    </section>
  );
}

function Ext({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  const internal = href.startsWith('/') || href.startsWith('mailto');
  return (
    <a href={href} className={className} target={internal ? undefined : '_blank'} rel={internal ? undefined : 'noopener noreferrer'} download={href === LINKS.resume ? 'Rushi_Jhala_Resume.pdf' : undefined}>
      {children}
    </a>
  );
}

// --- page ---------------------------------------------------------------------

export default function App() {
  const reduceMotion = usePrefersReducedMotion();
  const now = useNow();
  const gh = useGithub(LINKS.githubUser);
  const term = useRef<TerminalHandle>(null);
  const listRef = useRef<HTMLOListElement>(null);

  const [theme, setTheme] = useState<Theme>(() => {
    const saved = store.get('theme') as Theme | null;
    const t = saved && (THEMES as readonly string[]).includes(saved) ? saved : 'graphite';
    applyTheme(t);
    return t;
  });
  // The open checkpoint lives in the hash (#vitalsync), so each one has a link.
  const [activeId, setActiveId] = useState(() => idFromHash() ?? CHECKPOINTS[0].id);
  const [smoothing, setSmoothing] = useState(0.8);

  const firstSelect = useRef(true);
  useEffect(() => {
    if (firstSelect.current) {
      firstSelect.current = false;
      return;
    }
    history.replaceState(null, '', `#${activeId}`);
  }, [activeId]);
  useEffect(() => {
    const on = () => {
      const id = idFromHash();
      if (id) setActiveId(id);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const cycleTheme = useCallback((name?: string) => {
    let next: Theme;
    if (name && (THEMES as readonly string[]).includes(name)) next = name as Theme;
    else next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    applyTheme(next);
    setTheme(next);
    return next;
  }, [theme]);

  const active = CHECKPOINTS.find((c) => c.id === activeId) ?? CHECKPOINTS[0];
  const activeIndex = CHECKPOINTS.indexOf(active);

  const select = useCallback((id: string) => setActiveId(id), []);

  // Keyboard: j/k or arrows walk the checkpoints, / or : opens the terminal,
  // t cycles the theme. Ignored while typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        setActiveId(CHECKPOINTS[Math.min(CHECKPOINTS.length - 1, activeIndex + 1)].id);
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        setActiveId(CHECKPOINTS[Math.max(0, activeIndex - 1)].id);
      } else if (e.key === '/' || e.key === ':') {
        e.preventDefault();
        term.current?.focus();
      } else if (e.key === 't') {
        cycleTheme();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeIndex, cycleTheme]);

  // Keep the active row in view inside the list.
  useEffect(() => {
    const row = listRef.current?.querySelector<HTMLElement>('[aria-current="true"]');
    row?.scrollIntoView({ block: 'nearest' });
  }, [activeId]);

  const step = daysBetween(EPOCH0, now);
  const etaMonths = monthsUntil(now, RUN_END);
  const allEvals = useMemo(() => CHECKPOINTS.flatMap((c) => (c.evals ?? []).map((e) => ({ ...e, id: c.id }))), []);

  return (
    <div className="stage">
      <a href="#ckpt" className="skip">skip to the checkpoint</a>

      {/* ---- top frame ---- */}
      <header className="top">
        <div className="who">
          <a className="brand" href="/" aria-label={`${PERSON.name}, home`}>
            <Mark />
            <span>{PERSON.name.toLowerCase()}</span>
          </a>
          <h1 className="tagline">
            <span className="sr-only">{PERSON.name}: </span>
            ms data science, stony brook <span className="dot">·</span> computer vision <span className="dot">·</span> nlp <span className="dot">·</span> edge ai
          </h1>
        </div>
        <nav className="links" aria-label="Elsewhere">
          <Ext href={LINKS.github}>github</Ext>
          <Ext href={LINKS.linkedin}>linkedin</Ext>
          <Ext href={LINKS.blog}>blog</Ext>
          <Ext href={LINKS.email}>email</Ext>
          <Ext href={LINKS.resume} className="is-key">resume ↓</Ext>
        </nav>
      </header>

      {/* ---- left: checkpoints ---- */}
      <Panel title="checkpoints" meta={`${pad2(activeIndex + 1)}/${pad2(CHECKPOINTS.length)}`} className="p-ckpts">
        <ol className="ckpts" ref={listRef}>
          {CHECKPOINTS.map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                className="ckpt"
                aria-current={c.id === activeId ? 'true' : undefined}
                onClick={() => {
                  select(c.id);
                  // In the single-column layout the buffer is further down: bring it up.
                  if (!window.matchMedia(DESKTOP).matches) {
                    document.getElementById('ckpt')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
                  }
                }}
              >
                <span className="ckpt-n">{pad2(i + 1)}</span>
                <span className="ckpt-id">{c.id}</span>
                <span className={`ckpt-s s-${c.status}`}>{c.status === 'running' ? 'running' : 'done'}</span>
                <span className="ckpt-k">
                  {c.kind}
                  {c.at && <span className="ckpt-at">{fmtDate(c.at)}</span>}
                </span>
                <span className="ckpt-r">{c.role.toLowerCase()}</span>
              </button>
            </li>
          ))}
        </ol>
      </Panel>

      {/* ---- centre top: the run ---- */}
      <Panel
        title={<><span className="dimmed">runs/{PERSON.handle}/</span>train/loss</>}
        className="p-chart"
        meta={
          <span className="chart-tools">
            <span className="legend">
              <i className="sw sw-raw" /> raw <i className="sw sw-smooth" /> smoothed <i className="sw sw-fc" /> forecast
            </span>
            <label className="smoothing">
              <span>smoothing</span>
              <input
                type="range"
                min={0}
                max={0.99}
                step={0.01}
                value={smoothing}
                onChange={(e) => setSmoothing(Number(e.target.value))}
                aria-label="Chart smoothing"
              />
              <output>{smoothing.toFixed(2)}</output>
            </label>
          </span>
        }
      >
        <LossChart activeId={activeId} onSelect={select} smoothing={smoothing} theme={theme} now={now} reduceMotion={reduceMotion} />
        <p className="chart-note">illustrative curve · x is real time · checkpoints sit where the cv dates them</p>
      </Panel>

      {/* ---- centre bottom left: the checkpoint buffer ---- */}
      <Panel
        title={`ckpts/${active.id}.md`}
        className="p-ckpt"
        id="ckpt"
        meta={<span className={`badge b-${active.status}`}>{active.status}</span>}
      >
        <Buffer ckpt={active} />
      </Panel>

      {/* ---- centre bottom right: terminal ---- */}
      <Panel title="terminal" className="p-term" meta="zsh">
        <Terminal
          ref={term}
          themes={[...THEMES]}
          step={step}
          onSelect={select}
          onTheme={cycleTheme}
          onSmoothing={setSmoothing}
          reduceMotion={reduceMotion}
        />
      </Panel>

      {/* ---- right: config, eval; left bottom: system ---- */}
      <Panel title="config.yaml" className="p-config">
        <dl className="yaml">
          <div>
            <dt>name:</dt>
            <dd>{PERSON.name.toLowerCase()}</dd>
          </div>
          <div>
            <dt>focus:</dt>
            <dd>
              <span className="y-p">[</span>
              {PERSON.focus.join(', ')}
              <span className="y-p">]</span>
            </dd>
          </div>
          {CONFIG.map((c) => (
            <div key={c.key}>
              <dt>{c.key}:</dt>
              <dd>
                <span className="y-p">[</span>
                {c.value.map((v, i) => (
                  <span key={v}>
                    {v.toLowerCase()}
                    {i < c.value.length - 1 && <span className="y-p">, </span>}
                  </span>
                ))}
                <span className="y-p">]</span>
              </dd>
            </div>
          ))}
        </dl>
      </Panel>

      <Panel title="eval" className="p-eval" meta={`${allEvals.length} metrics`}>
        <dl className="evals">
          {allEvals.map((e) => (
            <div key={`${e.id}-${e.key}`} className={e.id === activeId ? 'is-on' : ''}>
              <dt>
                <span className="ev-id">{e.id}/</span>
                {e.key}
              </dt>
              <dd>
                {e.gauge !== undefined && (
                  <span className="gauge" style={{ '--g': e.gauge } as CSSProperties} aria-hidden="true" />
                )}
                <span className="num">{e.value}</span>
              </dd>
            </div>
          ))}
        </dl>
      </Panel>

      <Panel title="system" className="p-system">
        <dl className="sys">
          <div><dt>step</dt><dd>{step.toLocaleString('en-US')}</dd></div>
          <div><dt>eta</dt><dd>{etaMonths} mo</dd></div>
          <div><dt>local</dt><dd>{fmtTime(now)} et</dd></div>
          <div><dt>repos</dt><dd>{gh ? gh.repos : '—'}</dd></div>
          <div>
            <dt>last push</dt>
            <dd>{gh && gh.pushedAt ? ago(gh.pushedAt, now) : '—'}</dd>
          </div>
        </dl>
        {gh?.pushedRepo && (
          <p className="pushed">
            <Ext href={`${LINKS.github}/${gh.pushedRepo}`}>{gh.pushedRepo} ↗</Ext>
          </p>
        )}
      </Panel>

      {/* ---- status line ---- */}
      <footer className="status" aria-label="Status">
        <span className="mode">TRAINING</span>
        <span className="st-path">~/runs/{PERSON.handle}/ckpts/{active.id}.md</span>
        <span className="st-item">{theme}</span>
        <span className="st-item">smooth {smoothing.toFixed(2)}</span>
        <span className="st-keys" aria-hidden="true">
          <kbd>j</kbd><kbd>k</kbd> select <kbd>/</kbd> terminal <kbd>t</kbd> theme
        </span>
        <span className="st-pos">{pad2(activeIndex + 1)}/{pad2(CHECKPOINTS.length)}</span>
      </footer>
    </div>
  );
}
