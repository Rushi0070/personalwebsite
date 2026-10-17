import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { CHECKPOINTS, CONFIG, EPOCH0, INTRO, LINKS, PERSON, RUN_END } from './data';
import type { Kind } from './data';
import { daysBetween } from './run';
import LossChart from './components/LossChart';
import Terminal from './components/Terminal';
import Entry from './components/Entry';
import type { TerminalHandle } from './components/Terminal';

// rushi-jhala / training run, reading edition.
// One scrolling page: the content is the point, set at reading size; the run
// (loss curve, terminal, status line) is the frame around it. A sticky index
// on the left always shows where you are.

const THEMES = ['graphite', 'paper', 'phosphor'] as const;
type Theme = (typeof THEMES)[number];

interface Section {
  id: string;
  label: string;
  kind?: Kind;
}

const SECTIONS: Section[] = [
  { id: 'about', label: 'about' },
  { id: 'experience', label: 'experience', kind: 'experience' },
  { id: 'projects', label: 'projects', kind: 'project' },
  { id: 'education', label: 'education', kind: 'education' },
  { id: 'leadership', label: 'leadership', kind: 'leadership' },
  { id: 'skills', label: 'skills' },
  { id: 'terminal', label: 'terminal' },
  { id: 'contact', label: 'contact' },
];

const entriesOf = (kind?: Kind) => (kind ? CHECKPOINTS.filter((c) => c.kind === kind) : []);

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

// Which section (and which entry inside it) the reader is on: the last one
// whose top has passed 30% of the viewport; the last section once the page
// bottoms out.
function useScrollSpy() {
  const [spot, setSpot] = useState({ section: SECTIONS[0].id, entry: '' });
  useEffect(() => {
    // ~15 rects per scroll event: cheap enough to measure directly.
    const measure = () => {
      const line = window.innerHeight * 0.3;
      let section = SECTIONS[0].id;
      let entry = '';
      for (const el of document.querySelectorAll<HTMLElement>('[data-spy]')) {
        if (el.getBoundingClientRect().top > line) break;
        if (el.dataset.spy === 'section') {
          section = el.id;
          entry = '';
        } else {
          entry = el.id;
        }
      }
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom) {
        section = SECTIONS[SECTIONS.length - 1].id;
        entry = '';
      }
      setSpot((s) => (s.section === section && s.entry === entry ? s : { section, entry }));
    };
    measure();
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, []);
  return spot;
}

// True once the element has been on screen (and stays true).
function useSeen<T extends Element>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setSeen(true), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return [ref, seen] as const;
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const fmtTime = (d: Date) =>
  d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }).toLowerCase();

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

function Ext({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  const internal = href.startsWith('/') || href.startsWith('mailto');
  return (
    <a href={href} className={className} target={internal ? undefined : '_blank'} rel={internal ? undefined : 'noopener noreferrer'} download={href === LINKS.resume ? 'Rushi_Jhala_Resume.pdf' : undefined}>
      {children}
    </a>
  );
}

function SectionHead({ id, label }: { id: string; label: string }) {
  return (
    <h2 className="sec-h" id={`${id}-h`}>
      <span className="sec-n">{pad2(SECTIONS.findIndex((s) => s.id === id))}</span>
      <span>{label}</span>
    </h2>
  );
}

// --- page ---------------------------------------------------------------------

export default function App() {
  const reduceMotion = usePrefersReducedMotion();
  const now = useNow();
  const gh = useGithub(LINKS.githubUser);
  const spot = useScrollSpy();
  const term = useRef<TerminalHandle>(null);
  const [termRef, termSeen] = useSeen<HTMLDivElement>();

  const [theme, setTheme] = useState<Theme>(() => {
    const saved = store.get('theme') as Theme | null;
    const t = saved && (THEMES as readonly string[]).includes(saved) ? saved : 'graphite';
    applyTheme(t);
    return t;
  });
  const [smoothing, setSmoothing] = useState(0.8);

  const cycleTheme = useCallback((name?: string) => {
    let next: Theme;
    if (name && (THEMES as readonly string[]).includes(name)) next = name as Theme;
    else next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    applyTheme(next);
    setTheme(next);
    return next;
  }, [theme]);

  const go = useCallback(
    (id: string) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      history.replaceState(null, '', `#${id}`);
    },
    [reduceMotion],
  );

  // On small screens the index is a sideways strip: keep the current
  // section's tab in view.
  useEffect(() => {
    const a = document.querySelector<HTMLElement>(`.toc > ol > li > a[href="#${spot.section}"]`);
    const ol = a?.closest('ol');
    if (!a || !ol || ol.scrollWidth <= ol.clientWidth) return;
    const left = a.getBoundingClientRect().left - ol.getBoundingClientRect().left + ol.scrollLeft - 16;
    ol.scrollTo({ left, behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [spot.section, reduceMotion]);

  // A deep link (#vitalsync) arrives before React has drawn the target.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (id) document.getElementById(id)?.scrollIntoView({ block: 'start' });
  }, []);

  // Keyboard: j/k step through sections, / opens the terminal, t cycles the
  // theme. Ignored while typing or with modifiers.
  const sectionIndex = Math.max(0, SECTIONS.findIndex((s) => s.id === spot.section));
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'j') go(SECTIONS[Math.min(SECTIONS.length - 1, sectionIndex + 1)].id);
      else if (e.key === 'k') go(SECTIONS[Math.max(0, sectionIndex - 1)].id);
      else if (e.key === '/') {
        e.preventDefault();
        go('terminal');
        term.current?.focus();
      } else if (e.key === 't') cycleTheme();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sectionIndex, go, cycleTheme]);

  const step = daysBetween(EPOCH0, now);
  const etaMonths = monthsUntil(now, RUN_END);
  const where = spot.entry || spot.section;
  const link = (id: string) => (e: MouseEvent) => {
    e.preventDefault();
    go(id);
  };

  return (
    <>
      <a href="#experience" className="skip">skip to experience</a>
      <div className="page">
        {/* ---- the index ---- */}
        <aside className="side">
          <a className="brand" href="#about" onClick={link('about')}>
            <Mark />
            <span>{PERSON.handle}</span>
          </a>
          <nav className="toc" aria-label="Sections">
            <ol>
              {SECTIONS.map((s, i) => {
                const entries = entriesOf(s.kind);
                const on = spot.section === s.id;
                return (
                  <li key={s.id} className={on ? 'is-on' : ''}>
                    <a href={`#${s.id}`} aria-current={on ? 'location' : undefined} onClick={link(s.id)}>
                      <span className="toc-n">{pad2(i)}</span>
                      {s.label}
                    </a>
                    {entries.length > 1 && (
                      <ol className="toc-sub">
                        {entries.map((c) => (
                          <li key={c.id}>
                            <a href={`#${c.id}`} aria-current={spot.entry === c.id ? 'location' : undefined} onClick={link(c.id)}>
                              {c.id}
                            </a>
                          </li>
                        ))}
                      </ol>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
          <div className="side-foot">
            <Ext href={LINKS.resume} className="key">resume ↓</Ext>
            <button type="button" className="theme-btn" onClick={() => cycleTheme()} aria-label={`Theme: ${theme}. Change theme`}>
              theme <span>{theme}</span>
            </button>
          </div>
        </aside>

        <main className="main">
          {/* ---- about ---- */}
          <section id="about" data-spy="section" className="hero" aria-label="About">
            <p className="eyebrow">
              <i className="live" aria-hidden="true" /> training · ~/runs/{PERSON.handle}
            </p>
            <h1>{PERSON.name}</h1>
            <p className="lede">
              MS Data Science, Stony Brook University
              <span className="lede-focus"> · computer vision · nlp · edge ai</span>
            </p>
            <p className="intro">{INTRO}</p>
            <p className="cta">
              <Ext href={LINKS.resume} className="key">resume ↓</Ext>
              <Ext href={LINKS.email}>email</Ext>
              <Ext href={LINKS.github}>github</Ext>
              <Ext href={LINKS.linkedin}>linkedin</Ext>
              <Ext href={LINKS.blog}>blog</Ext>
            </p>

            <figure className="run">
              <figcaption className="run-head">
                <span className="run-title">
                  <span className="dimmed">runs/{PERSON.handle}/</span>train/loss
                </span>
                <span className="run-meta">illustrative · click a checkpoint</span>
              </figcaption>
              <LossChart activeId={spot.entry} onSelect={go} smoothing={smoothing} theme={theme} now={now} reduceMotion={reduceMotion} />
              <dl className="run-stats">
                <div><dt>step</dt><dd>{step.toLocaleString('en-US')}</dd></div>
                <div><dt>eta</dt><dd>{etaMonths} mo</dd></div>
                <div><dt>local</dt><dd>{fmtTime(now)} et</dd></div>
                <div>
                  <dt>last push</dt>
                  <dd>
                    {gh && gh.pushedAt ? (
                      <Ext href={`${LINKS.github}/${gh.pushedRepo}`}>
                        {ago(gh.pushedAt, now)} · {gh.pushedRepo}
                      </Ext>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
              </dl>
            </figure>
          </section>

          {/* ---- the checkpoints, by kind ---- */}
          {SECTIONS.filter((s) => s.kind).map((s) => (
            <section key={s.id} id={s.id} data-spy="section" className="sec" aria-labelledby={`${s.id}-h`}>
              <SectionHead id={s.id} label={s.label} />
              {entriesOf(s.kind).map((c) => (
                <Entry key={c.id} c={c} />
              ))}
            </section>
          ))}

          {/* ---- skills ---- */}
          <section id="skills" data-spy="section" className="sec" aria-labelledby="skills-h">
            <SectionHead id="skills" label="skills" />
            <dl className="skills">
              {CONFIG.map((c) => (
                <div key={c.key}>
                  <dt>{c.key.replace('_', ' ')}</dt>
                  <dd>
                    <ul className="tags">
                      {c.value.map((v) => (
                        <li key={v}>{v}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* ---- terminal ---- */}
          <section id="terminal" data-spy="section" className="sec" aria-labelledby="terminal-h">
            <SectionHead id="terminal" label="terminal" />
            <p className="sec-note">
              A small shell for this page. Try <code>help</code>, <code>ls</code>, <code>cat vitalsync</code> or{' '}
              <code>theme paper</code>.
            </p>
            <div className="term-box" ref={termRef}>
              <span className="term-label">zsh</span>
              <Terminal
                ref={term}
                themes={[...THEMES]}
                step={step}
                start={termSeen}
                onSelect={go}
                onTheme={cycleTheme}
                onSmoothing={setSmoothing}
                reduceMotion={reduceMotion}
              />
            </div>
          </section>

          {/* ---- contact ---- */}
          <section id="contact" data-spy="section" className="sec contact" aria-labelledby="contact-h">
            <SectionHead id="contact" label="contact" />
            <p className="contact-line">Email is the quickest way to reach me.</p>
            <p className="contact-mail">
              <Ext href={LINKS.email}>{PERSON.email}</Ext>
            </p>
            <p className="cta">
              <Ext href={LINKS.resume} className="key">resume ↓</Ext>
              <Ext href={LINKS.github}>github</Ext>
              <Ext href={LINKS.linkedin}>linkedin</Ext>
              <Ext href={LINKS.x}>x</Ext>
              <Ext href={LINKS.blog}>blog</Ext>
            </p>
            <p className="colophon">
              set in jetbrains mono and ibm plex sans · {PERSON.location.toLowerCase()} · eta{' '}
              {RUN_END.toLocaleString('en-US', { month: 'short', year: 'numeric' }).toLowerCase()}
            </p>
          </section>
        </main>
      </div>

      {/* ---- status line ---- */}
      <footer className="status" aria-hidden="true">
        <span className="mode">TRAINING</span>
        <span className="st-path">~/runs/{PERSON.handle}/{where}.md</span>
        <span className="st-keys">
          <kbd>j</kbd><kbd>k</kbd> section <kbd>/</kbd> terminal <kbd>t</kbd> theme
        </span>
        <span className="st-item">{theme}</span>
        <span className="st-pos">
          {pad2(sectionIndex)}/{pad2(SECTIONS.length - 1)}
        </span>
      </footer>
    </>
  );
}
