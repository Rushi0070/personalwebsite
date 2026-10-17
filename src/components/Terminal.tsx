import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { CHECKPOINTS, CONFIG, LINKS, PERSON } from '../data';
import { hl } from '../hl';

export type Line =
  | { k: 'cmd'; text: string }
  | { k: 'out' | 'dim' | 'ok' | 'err' | 'num'; text: string }
  | { k: 'kv'; key: string; value: string; w?: number } // w: key column, in cells
  | { k: 'link'; text: string; href: string };

export interface TerminalHandle {
  focus: () => void;
  run: (cmd: string, echo?: boolean) => void;
}

interface Props {
  themes: string[];
  step: number;
  onSelect: (id: string) => void;
  onTheme: (name?: string) => string;
  onSmoothing: (v: number) => void;
  reduceMotion: boolean;
}

const OPENABLE: Record<string, string> = {
  github: LINKS.github,
  linkedin: LINKS.linkedin,
  blog: LINKS.blog,
  x: LINKS.x,
  resume: LINKS.resume,
};

const COMMANDS = ['help', 'whoami', 'ls', 'cat', 'eval', 'config', 'open', 'email', 'theme', 'smooth', 'clear'];

const BOOT_CMD = 'python train.py --resume';

// The boot log, one line per chapter. Every value is from the CV; lines are
// kept short enough not to wrap in the desktop panel.
const boot = (step: number): Line[] => [
  { k: 'dim', text: 'loading ckpts/ … 7 found' },
  { k: 'kv', key: 'epoch 0', value: 'pdeu · b.tech ict · cgpa 8.47' },
  { k: 'kv', key: 'ckpt', value: 'acm · dsa workshop · 100+' },
  { k: 'kv', key: 'ckpt', value: 'aivid · acc 95%+ · alerts <5s' },
  { k: 'kv', key: 'epoch 1', value: 'stony brook · ms data science' },
  { k: 'kv', key: 'ckpt', value: 'vitalsync · yolo11n on npu' },
  { k: 'kv', key: 'ckpt', value: 'sec-alpha-gen · finbert' },
  { k: 'kv', key: 'ckpt', value: 'uber-demand · xgboost · dvc' },
  { k: 'ok', text: `resumed at step ${step.toLocaleString('en-US')} · eta may 2027` },
  { k: 'dim', text: 'type help, or cat a checkpoint' },
];

// Key/value rows whose key column fits the longest key, like `column -t`.
const table = (rows: [string, string][]): Line[] => {
  const w = Math.max(...rows.map(([k]) => k.length)) + 1;
  return rows.map(([key, value]) => ({ k: 'kv', key, value, w }));
};

// Neighbouring keys on a QWERTY board, for the one believable typo.
const NEAR: Record<string, string> = {
  a: 'sq', e: 'wr', i: 'uo', n: 'bm', o: 'ip', r: 'et', s: 'ad', t: 'ry', u: 'yi', h: 'gj',
};

// The frames of a human typing `text`: each frame is what the line shows and
// how long to wait before the next one. Spaces and punctuation take longer;
// one letter slips to a neighbouring key, sits for a beat, and is backspaced.
function keystrokes(text: string) {
  const frames: { text: string; wait: number }[] = [];
  const spots = [...text].map((ch, i) => (i > 6 && NEAR[ch] ? i : -1)).filter((i) => i >= 0);
  const slip = spots[Math.floor(Math.random() * spots.length)]; // never in "python"
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    let wait = 34 + Math.random() * 46;
    if (ch === ' ') wait += 30 + Math.random() * 70;
    else if (/[-.]/.test(ch)) wait += 20 + Math.random() * 60;
    if (Math.random() < 0.04) wait += 180 + Math.random() * 260;
    if (i === slip) {
      const wrong = NEAR[ch][Math.floor(Math.random() * NEAR[ch].length)];
      frames.push({ text: text.slice(0, i) + wrong, wait: 260 + Math.random() * 120 });
      frames.push({ text: text.slice(0, i), wait: 90 + Math.random() * 40 });
    }
    frames.push({ text: text.slice(0, i + 1), wait });
  }
  return frames;
}

const Terminal = forwardRef<TerminalHandle, Props>(function Terminal(
  { themes, step, onSelect, onTheme, onSmoothing, reduceMotion },
  ref,
) {
  const [lines, setLines] = useState<Line[]>([]);
  const [typed, setTyped] = useState('');
  const [booted, setBooted] = useState(false);
  const [input, setInput] = useState('');
  const history = useRef<string[]>([]);
  const hIndex = useRef(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Type the boot command like a person (uneven keys, one slip that gets
  // backspaced), then stream the log.
  useEffect(() => {
    const BOOT = boot(step);
    if (reduceMotion) {
      setLines([{ k: 'cmd', text: BOOT_CMD }, ...BOOT]);
      setBooted(true);
      return;
    }
    const keys = keystrokes(BOOT_CMD);
    let i = 0;
    let timer = 0;
    const typeNext = () => {
      const { text, wait } = keys[i++];
      setTyped(text);
      if (i < keys.length) {
        timer = window.setTimeout(typeNext, wait);
        return;
      }
      timer = window.setTimeout(() => {
        setTyped('');
        setLines([{ k: 'cmd', text: BOOT_CMD }]);
        let j = 0;
        const stream = () => {
          const line = BOOT[j++];
          setLines((prev) => [...prev, line]);
          if (j < BOOT.length) timer = window.setTimeout(stream, 90 + Math.random() * 140);
          else setBooted(true);
        };
        timer = window.setTimeout(stream, 320);
      }, 170);
    };
    timer = window.setTimeout(typeNext, 700);
    return () => window.clearTimeout(timer);
    // The boot runs once; a later step tick must not replay it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, typed]);

  const print = (...ls: Line[]) => setLines((prev) => [...prev, ...ls]);

  const exec = (raw: string, echo = true) => {
    const cmd = raw.trim();
    if (echo) print({ k: 'cmd', text: cmd });
    if (!cmd) return;
    history.current.unshift(cmd);
    hIndex.current = -1;
    const [name, ...args] = cmd.split(/\s+/);
    const arg = args.join(' ').toLowerCase();

    switch (name.toLowerCase()) {
      case 'help':
        print(
          { k: 'kv', key: 'whoami', value: 'who is training' },
          { k: 'kv', key: 'ls', value: 'list checkpoints' },
          { k: 'kv', key: 'cat <id>', value: 'open a checkpoint' },
          { k: 'kv', key: 'eval', value: 'eval metrics' },
          { k: 'kv', key: 'config', value: 'run config (stack)' },
          { k: 'kv', key: 'open <x>', value: Object.keys(OPENABLE).join(' · ') },
          { k: 'kv', key: 'email', value: 'write to me' },
          { k: 'kv', key: 'theme [x]', value: themes.join(' · ') },
          { k: 'kv', key: 'smooth n', value: 'chart smoothing, 0 – 0.99' },
          { k: 'kv', key: 'clear', value: 'clear the log' },
        );
        break;
      case 'whoami':
        print({ k: 'out', text: `${PERSON.name.toLowerCase()} · ${PERSON.role.toLowerCase()}` }, { k: 'dim', text: PERSON.focus.join(' · ') + ' · ' + PERSON.location.toLowerCase() });
        break;
      case 'ls':
        print(...table(CHECKPOINTS.map((c) => [c.id, `${c.kind} · ${c.status}`])));
        break;
      case 'cat': {
        const c = CHECKPOINTS.find((x) => x.id === arg || x.id.startsWith(arg));
        if (!c || !arg) {
          print({ k: 'err', text: `cat: ${arg || 'missing checkpoint'}: try ls` });
          break;
        }
        onSelect(c.id);
        print({ k: 'ok', text: `loaded ckpts/${c.id}` }, { k: 'dim', text: `${c.title.toLowerCase()} · ${c.role.toLowerCase()}` });
        break;
      }
      case 'eval': {
        print(...table(CHECKPOINTS.flatMap((c) => (c.evals ?? []).map((e): [string, string] => [`${c.id}/${e.key}`, e.value]))));
        break;
      }
      case 'config':
        print(...table(CONFIG.map((c) => [c.key, c.value.join(', ').toLowerCase()])));
        break;
      case 'open': {
        const href = OPENABLE[arg];
        if (!href) {
          print({ k: 'err', text: `open: ${arg || '?'}: one of ${Object.keys(OPENABLE).join(', ')}` });
          break;
        }
        print({ k: 'link', text: `opening ${arg} ↗`, href });
        window.open(href, '_blank', 'noopener,noreferrer');
        break;
      }
      case 'email':
        print({ k: 'link', text: PERSON.email, href: LINKS.email });
        window.location.href = LINKS.email;
        break;
      case 'theme': {
        const next = onTheme(arg || undefined);
        print({ k: 'ok', text: `theme → ${next}` });
        break;
      }
      case 'smooth':
      case 'smoothing': {
        const v = Number(arg);
        if (!Number.isFinite(v) || v < 0 || v > 0.99) {
          print({ k: 'err', text: `${name}: give a value between 0 and 0.99` });
          break;
        }
        onSmoothing(v);
        print({ k: 'ok', text: `smoothing → ${v.toFixed(2)}` });
        break;
      }
      case 'clear':
        setLines([]);
        break;
      case 'sudo':
        print({ k: 'err', text: 'sudo: this run is read-only' });
        break;
      default:
        print({ k: 'err', text: `zsh: command not found: ${name}` }, { k: 'dim', text: 'try help' });
    }
  };

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    run: (c: string, echo = true) => exec(c, echo),
  }));

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      exec(input);
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(history.current.length - 1, hIndex.current + 1);
      if (next >= 0) {
        hIndex.current = next;
        setInput(history.current[next]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = hIndex.current - 1;
      hIndex.current = Math.max(-1, next);
      setInput(next >= 0 ? history.current[next] : '');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const [head, ...rest] = input.split(' ');
      if (rest.length === 0) {
        const m = COMMANDS.find((c) => c.startsWith(head));
        if (m) setInput(m + ' ');
      } else if (head === 'cat') {
        const m = CHECKPOINTS.find((c) => c.id.startsWith(rest.join(' ')));
        if (m) setInput(`cat ${m.id}`);
      } else if (head === 'open') {
        const m = Object.keys(OPENABLE).find((k) => k.startsWith(rest.join(' ')));
        if (m) setInput(`open ${m}`);
      }
    } else if (e.key === 'Escape') {
      inputRef.current?.blur();
    }
  };

  return (
    <div className="term" onClick={() => inputRef.current?.focus()}>
      <div className="term-scroll" ref={scrollRef} role="log" aria-live="polite">
        {lines.map((l, i) => (
          <p
            key={i}
            className={`tl tl-${l.k}`}
            style={l.k === 'kv' && l.w ? { gridTemplateColumns: `calc(var(--cw) * ${l.w}) minmax(0, 1fr)` } : undefined}
          >
            {l.k === 'cmd' && (
              <>
                <span className="prompt">rushi@run</span>
                <span className="prompt-sep">:~$</span> {l.text}
              </>
            )}
            {(l.k === 'out' || l.k === 'ok') && hl(l.text)}
            {(l.k === 'dim' || l.k === 'err' || l.k === 'num') && l.text}
            {l.k === 'kv' && (
              <>
                <span className="kv-k">{l.key}</span>
                <span className="kv-v">{hl(l.value)}</span>
              </>
            )}
            {l.k === 'link' && (
              <a href={l.href} target={l.href.startsWith('mailto') ? undefined : '_blank'} rel="noopener noreferrer">
                {l.text}
              </a>
            )}
          </p>
        ))}
        {!booted && typed && (
          <p className="tl tl-cmd">
            <span className="prompt">rushi@run</span>
            <span className="prompt-sep">:~$</span> {typed}
            <span className="caret" aria-hidden="true" />
          </p>
        )}
        {booted && (
          <label className="tl tl-input">
            <span className="prompt">rushi@run</span>
            <span className="prompt-sep">:~$</span>
            <span className="input-wrap">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                spellCheck={false}
                autoComplete="off"
                autoCapitalize="off"
                aria-label="Terminal command"
              />
              <span className="ghost" aria-hidden="true">
                {input}
                <span className="caret" />
              </span>
            </span>
          </label>
        )}
      </div>
    </div>
  );
});

export default Terminal;
