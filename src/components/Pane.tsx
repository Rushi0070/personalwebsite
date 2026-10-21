import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AFTER_HOURS, CONFIG, EPOCH0, INTRO, LINKS, LOOKING_FOR, PERSON, PLAYLIST, RUN_END, artAt, spotifyOf } from '../data';
import type { Checkpoint } from '../data';
import { SECTIONS, entriesIn, fileOf, shownEntry } from '../routes';
import type { Route } from '../routes';
import { daysBetween } from '../run';
import { grep } from '../search';
import type { GH } from '../shell';
import { mark } from '../hl';
import { clock } from '../player';
import type { Player } from '../player';
import LossChart from './LossChart';

// The view in the middle: one section or one entry at a time, never a long
// scroll. Everything that navigates goes through the terminal (`run`), so the
// terminal always shows the command for what just happened.

interface Props {
  route: Route;
  hl: string;
  run: (cmd: string) => void;
  clearHl: () => void;
  now: Date;
  gh: GH | null;
  theme: string;
  reduceMotion: boolean;
  trainKey: number;
  player: Player;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

function ago(iso: string, now: Date) {
  const h = Math.round((now.getTime() - new Date(iso).getTime()) / 3_600_000);
  if (!Number.isFinite(h)) return '';
  if (h < 1) return 'just now';
  if (h < 48) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d < 60 ? `${d}d ago` : `${Math.round(d / 30)}mo ago`;
}

const Ext = ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
  <a href={href} className={className} target="_blank" rel="noopener noreferrer">
    {children}
  </a>
);

// A photo shown large over everything; a click or esc closes it.
function Lightbox({ src, alt, caption, onClose }: { src: string; alt: string; caption: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={alt} onClick={onClose}>
      <img src={src} alt={alt} />
      <p>
        {caption} · <span>click or esc to close</span>
      </p>
    </div>
  );
}

// ---- header: where you are, prev/next, grep state ---------------------------------

function PaneHead({ route, hl, run, clearHl }: Pick<Props, 'route' | 'hl' | 'run' | 'clearHl'>) {
  const list = entriesIn(route.section);
  const e = shownEntry(route);
  const i = e ? list.indexOf(e) : -1;
  const file = fileOf(route);
  const parts = file.slice(2).split('/').filter(Boolean);
  if (file.endsWith('/')) parts[parts.length - 1] += '/';
  const here = hl ? grep(hl, 999).hits.filter((h) => h.route.section === route.section && (!e || h.where === e.id)).length : 0;
  return (
    <header className="pane-head">
      <nav className="crumbs" aria-label="Path">
        <button type="button" onClick={() => run('cd ~')}>~</button>
        {parts.map((p, j) => (
          <span key={j}>
            <span className="crumb-sep">/</span>
            {j < parts.length - 1 ? (
              <button type="button" onClick={() => run(`cd ${p}`)}>
                {p}
              </button>
            ) : (
              <span className="crumb-here">{p}</span>
            )}
          </span>
        ))}
      </nav>
      {hl && (
        <span className="grep-state">
          grep <b>“{hl}”</b> · {here} here
          <button type="button" onClick={clearHl} aria-label="Clear highlight">
            esc ✕
          </button>
        </span>
      )}
      {e && list.length > 1 && (
        <span className="pager">
          <button type="button" onClick={() => run(`open ${list[(i - 1 + list.length) % list.length].id}`)} aria-label="Previous">
            ‹
          </button>
          <span>
            {pad2(i + 1)}/{pad2(list.length)}
          </span>
          <button type="button" onClick={() => run(`open ${list[(i + 1) % list.length].id}`)} aria-label="Next">
            ›
          </button>
        </span>
      )}
    </header>
  );
}

// ---- views ---------------------------------------------------------------------------

function About({ run, now, gh, theme, reduceMotion, trainKey, hl }: Props) {
  const step = daysBetween(EPOCH0, now);
  const months = Math.max(0, (RUN_END.getFullYear() - now.getFullYear()) * 12 + (RUN_END.getMonth() - now.getMonth()));
  return (
    <div className="v-about">
      <div className="about-text">
        <p className="eyebrow">
          <i className="live" aria-hidden="true" /> training · step {step.toLocaleString('en-US')} · eta {months} mo
        </p>
        <h1>{PERSON.name}</h1>
        <p className="lede">
          MS Data Science, Stony Brook University <span className="lede-focus">· computer vision · nlp · edge ai</span>
        </p>
        <p className="intro">{mark(INTRO, hl)}</p>
        <p className="avail">
          <i aria-hidden="true" /> {LOOKING_FOR}{' '}
          <button type="button" onClick={() => run('open contact')}>
            say hi →
          </button>
        </p>
        <p className="actions">
          <button type="button" className="key" onClick={() => run('cd projects')}>
            see projects →
          </button>
          <button type="button" onClick={() => run('resume')}>resume ↓</button>
          <button type="button" onClick={() => run('mail hello')}>email</button>
        </p>
      </div>
      <figure className="run">
        <figcaption className="run-head">
          <span className="run-title">
            <span className="dimmed">runs/{PERSON.handle}/</span>train/loss
          </span>
          <span className="run-meta">illustrative</span>
        </figcaption>
        <LossChart key={trainKey} activeId="" onSelect={(id) => run(`open ${id}`)} smoothing={0.8} theme={theme} now={now} reduceMotion={reduceMotion} />
        <p className="run-note">every flag is a chapter · click one</p>
        <dl className="run-stats">
          <div>
            <dt>github</dt>
            <dd>{gh ? `${gh.repos} repos` : '—'}</dd>
          </div>
          <div>
            <dt>last push</dt>
            <dd>{gh && gh.pushedAt ? <Ext href={`${LINKS.github}/${gh.pushedRepo}`}>{`${ago(gh.pushedAt, now)} · ${gh.pushedRepo}`}</Ext> : '—'}</dd>
          </div>
        </dl>
      </figure>
    </div>
  );
}

function Detail({ c, hl, run }: { c: Checkpoint; hl: string; run: (cmd: string) => void }) {
  const [zoom, setZoom] = useState(false);
  return (
    <article className="detail" aria-labelledby={`${c.id}-t`}>
      <header className="d-head">
        <p className="d-kind">
          {c.kind}
          {c.status === 'running' && (
            <span className="d-live">
              <i aria-hidden="true" /> in progress
            </span>
          )}
        </p>
        <h2 className="d-title" id={`${c.id}-t`}>
          {mark(c.title, hl)}
        </h2>
        <p className="d-role">
          <span>{mark(c.role, hl)}</span>
          {c.when && <span className="d-when">{c.when}</span>}
          {c.url && (
            <Ext href={c.url} className="d-link">
              {c.urlLabel} ↗
            </Ext>
          )}
        </p>
      </header>
      <div className="d-grid">
        <ul className="d-lines">
          {c.lines.map((l, i) => (
            <li key={i}>{mark(l, hl)}</li>
          ))}
        </ul>
        <aside className="d-side">
          {c.photo && (
            <figure className="d-fig">
              <button type="button" className="d-fig-btn" onClick={() => setZoom(true)} aria-label="View the photo larger">
                <img src={c.photo.src} alt={c.photo.alt} loading="lazy" />
                <span className="d-fig-zoom" aria-hidden="true">view large ↗</span>
              </button>
              <figcaption>{c.photo.caption}</figcaption>
            </figure>
          )}
          {c.evals && c.evals.length > 0 && (
            <dl className="metrics">
              {c.evals.map((e) => (
                <div key={e.key}>
                  <dt>{e.key}</dt>
                  <dd>{e.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {c.config && c.config.length > 0 && (
            <dl className="d-config">
              {c.config.map((k) => (
                <div key={k.key}>
                  <dt>{k.key}</dt>
                  <dd>{mark(k.value, hl)}</dd>
                </div>
              ))}
            </dl>
          )}
          {c.stack.length > 0 && (
            <div className="d-stack">
              <p className="side-label">stack · click to trace</p>
              <ul className="tags">
                {c.stack.map((s) => (
                  <li key={s}>
                    <button type="button" onClick={() => run(`which ${s.toLowerCase()}`)}>
                      {mark(s, hl)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
      {zoom && c.photo && <Lightbox src={c.photo.src} alt={c.photo.alt} caption={c.photo.caption} onClose={() => setZoom(false)} />}
    </article>
  );
}

function Index({ section, hl, run }: { section: string; hl: string; run: (cmd: string) => void }) {
  const list = entriesIn(section);
  return (
    <div className="v-index">
      <p className="index-note">
        {list.length} {section} · click one, or type <code>open {list[0].id}</code>
      </p>
      <ol className="cards">
        {list.map((c, i) => (
          <li key={c.id}>
            <button type="button" className="card" onClick={() => run(`open ${c.id}`)}>
              <span className="card-top">
                <span className="card-n">{pad2(i + 1)}</span>
                <span className="card-file">{c.id}.md</span>
                {c.status === 'running' && <span className="card-live">running</span>}
              </span>
              <span className="card-title">{mark(c.title, hl)}</span>
              <span className="card-role">
                {c.role}
                {c.when && <span className="card-when"> · {c.when}</span>}
              </span>
              <span className="card-blurb">{mark(c.blurb, hl)}</span>
              {c.evals && (
                <span className="card-evals">
                  {c.evals.map((e) => (
                    <span key={e.key}>
                      <b>{e.value}</b> {e.key}
                    </span>
                  ))}
                </span>
              )}
              {c.stack.length > 0 && (
                <span className="card-tags">
                  {c.stack.slice(0, 4).map((s) => (
                    <span key={s}>{mark(s, hl)}</span>
                  ))}
                  {c.stack.length > 4 && <span className="more">+{c.stack.length - 4}</span>}
                </span>
              )}
              <span className="card-go">open →</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Skills({ hl, run }: { hl: string; run: (cmd: string) => void }) {
  return (
    <div className="v-skills">
      <p className="index-note">
        click a skill to trace it · or type <code>which pytorch</code>
      </p>
      <dl className="skills">
        {CONFIG.map((g) => (
          <div key={g.key}>
            <dt>{g.key.replace('_', ' ')}</dt>
            <dd>
              <ul className="tags">
                {g.value.map((v) => (
                  <li key={v}>
                    <button type="button" onClick={() => run(`which ${v.toLowerCase()}`)}>
                      {mark(v, hl)}
                    </button>
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// Transport icons, drawn so they look the same in every font.
function Icon({ name }: { name: 'prev' | 'play' | 'pause' | 'next' }) {
  const d = {
    prev: 'M3 3h1.6v10H3zM13 3v10L5.5 8z',
    play: 'M4 2.5v11L13.5 8z',
    pause: 'M3.5 3h3v10h-3zM9.5 3h3v10h-3z',
    next: 'M11.4 3H13v10h-1.6zM3 3v10l7.5-5z',
  }[name];
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path d={d} fill="currentColor" />
    </svg>
  );
}

function Eq() {
  return (
    <span className="eq" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

function AfterHours({ player, run, hl }: { player: Player; run: (cmd: string) => void; hl: string }) {
  const [zoom, setZoom] = useState(false);
  const i = player.index < 0 ? 0 : player.index;
  const cur = PLAYLIST[i];
  const loaded = player.index >= 0;
  const pct = loaded ? Math.min(100, (player.time / (player.duration || 30)) * 100) : 0;
  const ph = AFTER_HOURS.photo;
  return (
    <div className="v-offline">
      <header className="off-head">
        <h2 className="d-title">After hours</h2>
        <p className="off-line">{mark(AFTER_HOURS.line, hl)}</p>
      </header>

      <div className="off-grid">
        <figure className="off-photo">
          <button type="button" className="d-fig-btn" onClick={() => setZoom(true)} aria-label="View the photo larger">
            <img
              src={ph.small}
              srcSet={`${ph.small} 1100w, ${ph.src} ${ph.width}w`}
              sizes="(min-width: 1100px) 40vw, 92vw"
              width={ph.width}
              height={ph.height}
              alt={ph.alt}
            />
            <span className="d-fig-zoom" aria-hidden="true">view large ↗</span>
          </button>
          <figcaption>{ph.caption}</figcaption>
        </figure>

        <section className={`np ${player.playing ? 'is-on' : ''}`} aria-label="Now playing">
          <div className="np-cover">
            <img
              src={artAt(cur, 600)}
              srcSet={`${artAt(cur, 600)} 600w, ${artAt(cur, 1200)} 1200w`}
              sizes="(min-width: 1100px) 232px, 40vw"
              width={1200}
              height={1200}
              alt={`${cur.title}, cover art`}
            />
          </div>
          <p className="np-label">{loaded ? (player.playing ? 'now playing' : 'paused') : 'on rotation'}</p>
          <p className="np-title">{cur.title}</p>
          <p className="np-artist">{cur.artist}</p>
          <div
            className="np-bar"
            role="slider"
            aria-label="Position in the preview"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pct)}
            tabIndex={loaded ? 0 : -1}
            onClick={(e) => {
              if (!loaded) return;
              const r = e.currentTarget.getBoundingClientRect();
              player.seek((e.clientX - r.left) / r.width);
            }}
          >
            <span style={{ width: `${pct}%` }} />
          </div>
          <p className="np-time">
            <span>{clock(loaded ? player.time : 0)}</span>
            <span>{clock(loaded ? player.duration : 30)}</span>
          </p>
          <div className="np-ctrl">
            <button type="button" onClick={() => run('prev')} aria-label="Previous track">
              <Icon name="prev" />
            </button>
            <button type="button" className="np-play" onClick={() => run(player.playing ? 'pause' : `play ${i + 1}`)} aria-label={player.playing ? 'Pause' : 'Play'}>
              <Icon name={player.playing ? 'pause' : 'play'} />
            </button>
            <button type="button" onClick={() => run('next')} aria-label="Next track">
              <Icon name="next" />
            </button>
          </div>
          <p className="np-links">
            full song: <Ext href={cur.apple}>apple music ↗</Ext> <Ext href={spotifyOf(cur)}>spotify ↗</Ext>
          </p>
          {player.error && <p className="np-err">{player.error}</p>}
        </section>

        <ol className="tracks" aria-label="Playlist">
          {PLAYLIST.map((t, n) => {
            const on = n === player.index;
            return (
              <li key={t.id}>
                <button type="button" className={`trk ${on ? 'is-on' : ''}`} aria-current={on ? 'true' : undefined} onClick={() => run(on && player.playing ? 'pause' : `play ${n + 1}`)}>
                  <span className="trk-n">{on && player.playing ? <Eq /> : pad2(n + 1)}</span>
                  <img src={artAt(t, 120)} srcSet={`${artAt(t, 120)} 1x, ${artAt(t, 240)} 2x`} width={40} height={40} alt="" loading="lazy" />
                  <span className="trk-text">
                    <span className="trk-title">{mark(t.title, hl)}</span>
                    <span className="trk-artist">{mark(t.artist, hl)}</span>
                  </span>
                  <span className="trk-len">{on ? clock(player.time) : '0:30'}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <p className="off-note">
        official 30s previews · tap a track, or type <code>play delilah</code>
      </p>
      {zoom && <Lightbox src={ph.src} alt={ph.alt} caption={ph.caption} onClose={() => setZoom(false)} />}
    </div>
  );
}

function Contact({ run }: { run: (cmd: string) => void }) {
  return (
    <div className="v-contact">
      <p className="contact-avail">
        <i aria-hidden="true" /> {LOOKING_FOR}
      </p>
      <p className="contact-line">Shortest path to me: email.</p>
      <p className="contact-mail">
        <button type="button" onClick={() => run('mail')}>
          {PERSON.email}
        </button>
      </p>
      <p className="actions">
        <button type="button" className="key" onClick={() => run('mail hello')}>
          write to me →
        </button>
        <button type="button" onClick={() => run('copy email')}>copy email</button>
        <button type="button" onClick={() => run('resume')}>resume ↓</button>
        <Ext href={LINKS.linkedin}>linkedin ↗</Ext>
        <Ext href={LINKS.github}>github ↗</Ext>
        <Ext href={LINKS.blog}>blog ↗</Ext>
      </p>
      <p className="contact-tip">
        terminal people: <code>mail hi rushi</code> pre-fills it.
      </p>
      <p className="colophon">
        {PERSON.location.toLowerCase()} · set in jetbrains mono and ibm plex sans · eta{' '}
        {RUN_END.toLocaleString('en-US', { month: 'short', year: 'numeric' }).toLowerCase()}
      </p>
    </div>
  );
}

// ---- pane ------------------------------------------------------------------------------

export default function Pane(props: Props) {
  const { route, hl, run } = props;
  const e = shownEntry(route);
  const key = `${route.section}/${route.entry ?? ''}`;
  let view: ReactNode;
  if (e) view = <Detail c={e} hl={hl} run={run} />;
  else if (entriesIn(route.section).length > 1) view = <Index section={route.section} hl={hl} run={run} />;
  else if (route.section === 'skills') view = <Skills hl={hl} run={run} />;
  else if (route.section === 'contact') view = <Contact run={run} />;
  else if (route.section === 'after-hours') view = <AfterHours player={props.player} run={run} hl={hl} />;
  else view = <About {...props} />;
  const label = SECTIONS.find((s) => s.id === route.section)?.id ?? 'about';
  return (
    <main className="pane" aria-label={label}>
      <PaneHead route={route} hl={hl} run={run} clearHl={props.clearHl} />
      <div className="pane-body" key={key}>
        {view}
      </div>
    </main>
  );
}
