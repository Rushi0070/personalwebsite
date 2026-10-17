import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { candidates, chipsFor, exec, suggest } from '../shell';
import type { Ctx, Line, Part } from '../shell';
import { cwdOf } from '../routes';
import { hl } from '../hl';
import { clock } from '../player';

// The terminal is how the site is driven. Nav clicks land here as commands,
// suggestions type themselves out, and everything printed is clickable.

export interface TerminalHandle {
  /** Run a command; `type` animates it into the prompt first. */
  run: (cmd: string, opts?: { type?: boolean }) => void;
  focus: () => void;
}

type Base = Omit<Ctx, 'print' | 'clear' | 'history' | 'cols'>;

interface Props {
  ctx: Base;
  /** Boot the first time this is true. */
  start: boolean;
  reduceMotion: boolean;
  onFocusChange: (focused: boolean) => void;
}

const MAX_LINES = 400;
const CHAR_W = 7.8; // JetBrains Mono at 13px

// ---- rendering ---------------------------------------------------------------

function Prompt({ cwd }: { cwd: string }) {
  return (
    <span className="prompt" aria-hidden="true">
      <span className="p-user">rushi@run</span> <span className="p-cwd">{cwd}</span> <span className="p-sym">$</span>{' '}
    </span>
  );
}

function renderPart(p: Part, i: number, onRun: (c: string) => void): ReactNode {
  if (typeof p === 'string') return <span key={i}>{hl(p)}</span>;
  const cls = (p.cls ?? '').split(' ').filter(Boolean).map((c) => `c-${c}`).join(' ');
  if (p.run) {
    return (
      <button key={i} type="button" className={`t-run ${cls}`} onClick={() => onRun(p.run!)} title={p.run}>
        {p.t}
      </button>
    );
  }
  if (p.href) {
    return (
      <a key={i} className={`t-link ${cls}`} href={p.href} target={p.href.startsWith('mailto') ? undefined : '_blank'} rel="noopener noreferrer">
        {p.t}
      </a>
    );
  }
  return (
    <span key={i} className={cls}>
      {p.t}
    </span>
  );
}

function LineView({ l, onRun }: { l: Line; onRun: (c: string) => void }) {
  if (l.k === 'cmd') {
    return (
      <p className="tl tl-cmd">
        <Prompt cwd={l.cwd} />
        <span>{l.text}</span>
      </p>
    );
  }
  if (l.k === 'kv') {
    return (
      <p className="tl tl-kv" style={{ gridTemplateColumns: `${l.w}ch minmax(0, 1fr)` }}>
        <span className="kv-k">{l.key.map((p, i) => renderPart(p, i, onRun))}</span>
        <span className="kv-v">{l.val.map((p, i) => renderPart(p, i, onRun))}</span>
      </p>
    );
  }
  if (l.k === 'fetch') {
    // neofetch, with the site's mark for a logo
    return (
      <div className="tl tl-fetch">
        <svg className="fetch-mark" viewBox="0 0 16 16" aria-hidden="true">
          <rect x="0.5" y="0.5" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="0.6" />
          <path d="M3 3.5V7.5H6.5V10H9.5V11.5H13" fill="none" stroke="currentColor" strokeWidth="0.9" />
        </svg>
        <div className="fetch-body">
          <p>{l.head.map((p, i) => renderPart(p, i, onRun))}</p>
          <dl className="fetch-rows">
            {l.rows.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v.map((p, i) => renderPart(p, i, onRun))}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    );
  }
  return <p className={`tl tl-${l.k}`}>{l.parts.map((p, i) => renderPart(p, i, onRun))}</p>;
}

// ---- typing --------------------------------------------------------------------

// Frames of a person typing `text`: uneven keys, longer on spaces.
function keystrokes(text: string) {
  return [...text].map((_, i) => ({
    text: text.slice(0, i + 1),
    wait: 26 + Math.random() * 34 + (text[i] === ' ' ? 40 + Math.random() * 50 : 0),
  }));
}

// ---- component -------------------------------------------------------------------

const Terminal = forwardRef<TerminalHandle, Props>(function Terminal({ ctx, start, reduceMotion, onFocusChange }, ref) {
  const [lines, setLines] = useState<Line[]>([]);
  const [input, setInput] = useState('');
  const [pos, setPos] = useState(0);
  const [focused, setFocused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false); // small screens: is the log showing?
  const history = useRef<string[]>([]); // most recent first
  const [hist, setHist] = useState<string[]>([]); // the same, for rendering suggestions
  const hIndex = useRef(-1);
  const cols = useRef(100);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timers = useRef<number[]>([]);

  // Commands always see the latest route/theme/etc.
  const ctxRef = useRef(ctx);
  useLayoutEffect(() => {
    ctxRef.current = ctx;
  });

  const print = useCallback((...ls: Line[]) => {
    setLines((prev) => {
      const next = [...prev, ...ls];
      return next.length > MAX_LINES ? next.slice(-MAX_LINES) : next;
    });
  }, []);
  const clear = useCallback(() => setLines([]), []);

  // For handlers (latest values) and for rendering (props and state only).
  const liveCtx = (): Ctx => ({ ...ctxRef.current, print, clear, history: history.current, cols: cols.current });
  const viewCtx: Ctx = { ...ctx, print, clear, history: hist, cols: 100 };

  const runNow = useCallback(
    (raw: string, reveal = false) => {
      if (reveal) setOpen(true);
      const text = raw.trim();
      print({ k: 'cmd', text, cwd: cwdOf(ctxRef.current.route) });
      if (!text) return;
      if (history.current[0] !== text) history.current = [text, ...history.current].slice(0, 100);
      setHist(history.current);
      hIndex.current = -1;
      exec(text, { ...ctxRef.current, print, clear, history: history.current, cols: cols.current });
    },
    [print, clear],
  );

  const typeThenRun = useCallback(
    (text: string, then?: () => void, reveal = false) => {
      if (reduceMotion) {
        runNow(text, reveal);
        then?.();
        return;
      }
      setBusy(true);
      let t = 0;
      for (const f of keystrokes(text)) {
        t += f.wait;
        timers.current.push(
          window.setTimeout(() => {
            setInput(f.text);
            setPos(f.text.length);
          }, t),
        );
      }
      timers.current.push(
        window.setTimeout(() => {
          setInput('');
          setPos(0);
          setBusy(false);
          runNow(text, reveal);
          then?.();
        }, t + 160),
      );
    },
    [reduceMotion, runNow],
  );

  useImperativeHandle(ref, () => ({
    run: (c, opts) => (opts?.type ? typeThenRun(c, undefined, true) : runNow(c)),
    focus: () => inputRef.current?.focus(),
  }));

  // Boot once: a login line, then `fetch` types itself.
  const booted = useRef(false);
  useEffect(() => {
    if (!start || booted.current) return;
    booted.current = true;
    const when = new Date().toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const id = window.setTimeout(() => {
      print({ k: 'dim', parts: [`last login: ${when.toLowerCase()} · this terminal drives the site`] });
      typeThenRun('fetch', () =>
        print({ k: 'dim', parts: ['type ', { t: 'help', run: 'help', cls: 'r' }, ', or click a suggestion below. everything underlined is clickable.'] }),
      );
    }, reduceMotion ? 0 : 500);
    timers.current.push(id);
  }, [start, print, typeThenRun, reduceMotion]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  // Keep the newest line in view.
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  // How many columns fit (fetch drops its art when narrow).
  useEffect(() => {
    const el = logRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      cols.current = Math.floor(e.contentRect.width / CHAR_W);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const ghost = focused && !busy && pos === input.length ? suggest(input, viewCtx) : '';

  const set = (v: string) => {
    setInput(v);
    setPos(v.length);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (busy) {
      e.preventDefault();
      return;
    }
    const k = e.key;
    if (k === 'Enter') {
      e.preventDefault();
      runNow(input, true);
      set('');
    } else if (k === 'Tab') {
      e.preventDefault();
      const c = candidates(input, liveCtx());
      if (c.length === 1) set(c[0] + (c[0].includes(' ') ? '' : ' '));
      else if (c.length > 1) {
        // extend to the common prefix, and show the options
        let common = c[0];
        for (const x of c) while (!x.startsWith(common)) common = common.slice(0, -1);
        if (common.length > input.length) set(common);
        print(
          { k: 'cmd', text: input, cwd: cwdOf(ctxRef.current.route) },
          { k: 'dim', parts: c.slice(0, 16).flatMap((x, i) => [...(i ? ['  '] : []), { t: x.split(' ').pop()!, run: x, cls: 'r' }]) },
        );
      } else if (ghost) set(input + ghost);
    } else if (k === 'ArrowRight' && ghost && pos === input.length) {
      e.preventDefault();
      set(input + ghost);
    } else if (k === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(history.current.length - 1, hIndex.current + 1);
      if (next >= 0) {
        hIndex.current = next;
        set(history.current[next]);
      }
    } else if (k === 'ArrowDown') {
      e.preventDefault();
      const next = hIndex.current - 1;
      hIndex.current = Math.max(-1, next);
      set(next >= 0 ? history.current[next] : '');
    } else if (e.ctrlKey && (k === 'l' || k === 'L')) {
      e.preventDefault();
      clear();
    } else if (e.ctrlKey && (k === 'c' || k === 'C') && !window.getSelection()?.toString()) {
      e.preventDefault();
      print({ k: 'cmd', text: `${input}^C`, cwd: cwdOf(ctxRef.current.route) });
      set('');
    } else if (e.ctrlKey && (k === 'u' || k === 'U')) {
      e.preventDefault();
      set('');
    } else if (k === 'Escape') {
      inputRef.current?.blur();
    }
  };

  const syncPos = () => setPos(inputRef.current?.selectionStart ?? input.length);
  const chips = chipsFor(ctx.route, ctx.player.playing);
  const np = ctx.player.track;
  // Audio may only start inside a click, so player commands skip the typing.
  const isPlayer = (c: string) => /^(play|pause|next|prev)\b/.test(c);
  const at = input[pos] ?? ' ';

  return (
    <section className="term" data-open={open} aria-label="Terminal">
      <header className="term-bar">
        <span className="term-title">terminal</span>
        <span className="term-dot">·</span>
        <span className="term-cwd">{cwdOf(ctx.route)}</span>
        {np && (
          <button
            type="button"
            className={`term-np ${ctx.player.playing ? 'is-on' : ''}`}
            onClick={() => runNow(ctx.player.playing ? 'pause' : 'play', true)}
            title={ctx.player.playing ? 'pause' : 'play'}
          >
            <span className="eq" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="np-t">{np.title}</span>
            <span className="np-a">· {np.artist.split(/,|&/)[0].trim()}</span>
            <span className="np-c">{clock(ctx.player.time)}</span>
          </button>
        )}
        <span className="term-hint">
          <kbd>/</kbd> to type · <kbd>tab</kbd> completes
        </span>
        <button type="button" className="term-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? 'hide ▾' : 'log ▴'}
        </button>
      </header>

      <div className="term-log" ref={logRef} role="log" aria-live="polite" onClick={(e) => e.target === e.currentTarget && inputRef.current?.focus()}>
        {lines.map((l, i) => (
          <LineView key={i} l={l} onRun={(c) => runNow(c, true)} />
        ))}
      </div>

      <label className={`term-input ${focused ? 'is-focus' : ''}`}>
        <Prompt cwd={cwdOf(ctx.route)} />
        <span className="input-wrap">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setPos(e.target.selectionStart ?? e.target.value.length);
              hIndex.current = -1;
            }}
            onKeyDown={onKey}
            onKeyUp={syncPos}
            onSelect={syncPos}
            onFocus={() => {
              setFocused(true);
              onFocusChange(true);
            }}
            onBlur={() => {
              setFocused(false);
              onFocusChange(false);
            }}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            enterKeyHint="go"
            aria-label="Type a command"
            placeholder=""
          />
          <span className="ghost" aria-hidden="true">
            {input.slice(0, pos)}
            <span className="caret">{at}</span>
            {input.slice(pos + 1)}
            {ghost && <span className="sugg">{ghost}</span>}
            {!input && !focused && !busy && <span className="placeholder">type a command, or click one below</span>}
          </span>
        </span>
      </label>

      <div className="term-chips" aria-label="Suggestions">
        <span className="chips-label">try</span>
        {chips.map((c) => (
          <button
            key={c}
            type="button"
            className="chip"
            disabled={busy}
            onClick={() => (isPlayer(c) ? runNow(c, true) : typeThenRun(c, undefined, true))}
          >
            {c}
          </button>
        ))}
      </div>
    </section>
  );
});

export default Terminal;
