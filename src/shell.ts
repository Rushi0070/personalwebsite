// The shell behind the terminal. Commands navigate the site, search it, and
// reach me; every name they print is clickable, so nobody has to type.

import { CHECKPOINTS, CONFIG, EPOCH0, INTRO, LINKS, PERSON, RUN_END } from './data';
import { HOME, PATHS, SECTIONS, entriesIn, fileOf, resolve, shownEntry } from './routes';
import type { Route } from './routes';
import { SKILLS, grep, skillGroupOf, which } from './search';

// ---- output model -------------------------------------------------------------

/** A run of text; `run` makes it a button that executes a command, `href` a link. */
export type Part = string | { t: string; cls?: string; run?: string; href?: string; download?: string };

export type Line =
  | { k: 'cmd'; text: string; cwd: string }
  | { k: 'out' | 'dim' | 'ok' | 'err'; parts: Part[] }
  | { k: 'kv'; key: Part[]; val: Part[]; w: number }
  | { k: 'pre'; parts: Part[] }
  | { k: 'fetch'; head: Part[]; rows: [string, Part[]][] };

const out = (...parts: Part[]): Line => ({ k: 'out', parts });
const dim = (...parts: Part[]): Line => ({ k: 'dim', parts });
const ok = (...parts: Part[]): Line => ({ k: 'ok', parts });
const err = (...parts: Part[]): Line => ({ k: 'err', parts });
const pre = (...parts: Part[]): Line => ({ k: 'pre', parts });
const cmd = (t: string, run = t): Part => ({ t, run, cls: 'r' });
const link = (t: string, href: string): Part => ({ t, href, cls: 'l' });
const n = (t: string | number): Part => ({ t: String(t), cls: 'n' });
const key = (t: string): Part => ({ t, cls: 'k' });

const len = (ps: Part[]) => ps.reduce((s, p) => s + (typeof p === 'string' ? p : p.t).length, 0);
const asParts = (x: Part | Part[]) => (Array.isArray(x) ? x : [x]);
function table(rows: [Part | Part[], Part | Part[]][], min = 0): Line[] {
  const w = Math.max(min, ...rows.map(([k]) => len(asParts(k)))) + 2;
  return rows.map(([k, v]) => ({ k: 'kv', key: asParts(k), val: asParts(v), w }));
}
/** Parts separated by a gap, for ls-style rows. */
const spaced = (ps: Part[], gap = '  ') => ps.flatMap((p, i) => (i ? [gap, p] : [p]));

// ---- context the shell acts on --------------------------------------------------

export interface GH {
  repos: number;
  pushedRepo: string;
  pushedAt: string;
}

export interface Ctx {
  route: Route;
  go: (r: Route) => void;
  back: () => boolean;
  highlight: (term: string) => void;
  setTheme: (name?: string) => string;
  theme: string;
  themes: readonly string[];
  gh: GH | null;
  now: Date;
  /** Columns the terminal can show, to decide on ASCII art. */
  cols: number;
  history: string[];
  print: (...l: Line[]) => void;
  clear: () => void;
  retrain: () => void;
}

// ---- helpers --------------------------------------------------------------------

const EXTERNAL: Record<string, string> = {
  github: LINKS.github,
  linkedin: LINKS.linkedin,
  blog: LINKS.blog,
  x: LINKS.x,
  twitter: LINKS.x,
};

const pad2 = (v: number) => String(v).padStart(2, '0');
const ym = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
const days = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86_400_000);
const monthsLeft = (from: Date) =>
  Math.max(0, (RUN_END.getFullYear() - from.getFullYear()) * 12 + (RUN_END.getMonth() - from.getMonth()));
const ago = (iso: string, now: Date) => {
  const h = Math.round((now.getTime() - new Date(iso).getTime()) / 3_600_000);
  if (!Number.isFinite(h)) return '';
  if (h < 1) return 'just now';
  if (h < 48) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d < 60 ? `${d}d ago` : `${Math.round(d / 30)}mo ago`;
};

const openTab = (href: string) => {
  window.open(href, '_blank', 'noopener,noreferrer');
};

function download(href: string, name: string) {
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function mailto(subject: string, body = '') {
  const q = new URLSearchParams({ subject, ...(body ? { body } : {}) }).toString().replace(/\+/g, '%20');
  window.location.href = `${LINKS.email}?${q}`;
}

function lev(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

function didYouMean(word: string, pool: string[]) {
  let best = '';
  let bestD = Infinity;
  for (const p of pool) {
    const dd = lev(word, p);
    if (dd < bestD) {
      bestD = dd;
      best = p;
    }
  }
  return bestD <= Math.max(1, Math.floor(word.length / 3)) ? best : '';
}

const entryLabel = (id: string) => CHECKPOINTS.find((c) => c.id === id)?.title ?? id;

// ---- commands -------------------------------------------------------------------

interface Command {
  usage: string;
  help: string;
  group: 'navigate' | 'find' | 'reach' | 'this';
  run: (args: string[], ctx: Ctx) => void;
  hidden?: boolean;
}

function lsLines(target: Route, long: boolean): Line[] {
  const list = entriesIn(target.section);
  if (target.section === 'about' || (!list.length && !target.entry)) {
    if (!long) {
      return [
        out(
          ...spaced(
            SECTIONS.map((s) => ({ t: s.file, run: s.kind ? `cd ${s.id}` : `open ${s.id}`, cls: s.kind ? 'r dir' : 'r' })),
          ),
        ),
      ];
    }
    return table(
      SECTIONS.map((s) => {
        const count = entriesIn(s.id).length;
        return [cmd(s.file, s.kind ? `cd ${s.id}` : `open ${s.id}`), key(count ? `${count} ${count === 1 ? 'entry' : 'entries'}` : '—')];
      }),
    );
  }
  if (target.entry) return [out(cmd(`${target.entry}.md`, `open ${target.entry}`))];
  if (!long) return [out(...spaced(list.map((c) => cmd(`${c.id}.md`, `open ${c.id}`))))];
  return table(list.map((c) => [cmd(`${c.id}.md`, `open ${c.id}`), `${c.role.toLowerCase()}${c.when ? ` · ${c.when.toLowerCase()}` : ''}`]));
}

function treeLines(): Line[] {
  const lines: Line[] = [pre({ t: '~', cls: 'dir' })];
  SECTIONS.forEach((s, i) => {
    const last = i === SECTIONS.length - 1;
    lines.push(pre(last ? '└── ' : '├── ', { t: s.file, run: s.kind ? `cd ${s.id}` : `open ${s.id}`, cls: s.kind ? 'r dir' : 'r' }));
    const list = entriesIn(s.id);
    list.forEach((c, j) => {
      lines.push(pre(last ? '    ' : '│   ', j === list.length - 1 ? '└── ' : '├── ', cmd(`${c.id}.md`, `open ${c.id}`)));
    });
  });
  const dirs = SECTIONS.filter((s) => s.kind).length;
  const files = SECTIONS.filter((s) => !s.kind).length + CHECKPOINTS.length;
  lines.push(dim(`${dirs} directories, ${files} files`));
  return lines;
}

function catLines(r: Route): Line[] {
  const e = shownEntry(r);
  if (e) {
    return [
      out({ t: e.title, cls: 'b' }),
      dim(`${e.role}${e.when ? ` · ${e.when}` : ''}`),
      out(e.blurb),
      ...(e.evals?.length ? [out(...spaced(e.evals.flatMap((v) => [key(v.key), n(v.value)]), ' '))] : []),
    ];
  }
  if (r.section === 'skills') return table(CONFIG.map((g) => [key(`${g.key}:`), g.value.join(', ').toLowerCase()]));
  if (r.section === 'contact')
    return table([
      [key('email'), cmd(PERSON.email, 'mail')],
      [key('linkedin'), cmd('open linkedin')],
      [key('github'), cmd('open github')],
      [key('resume'), cmd('resume')],
    ]);
  if (r.section === 'about') return [out(INTRO)];
  return [err(`cat: ${r.section}: is a directory`), dim('try ', cmd(`ls ${r.section}`))];
}

function fetchLines(ctx: Ctx): Line[] {
  const step = days(EPOCH0, ctx.now);
  return [
    {
      k: 'fetch',
      head: [{ t: 'rushi', cls: 'p' }, '@', { t: 'run', cls: 'p' }, { t: ' · ms data science, stony brook university', cls: 'b' }],
      rows: [
        ['status', [{ t: 'full-time or internship · from may 2027', cls: 'okc' }]],
        ['focus', ['computer vision · nlp · edge ai']],
        ['uptime', [n(step.toLocaleString('en-US')), ` days since epoch 0 (${ym(EPOCH0)})`]],
        ['stack', ['pytorch · opencv · onnx · xgboost · docker']],
        ['eta', ['may 2027 · ', n(monthsLeft(ctx.now)), ' months to go']],
        ['langs', ['python · java · sql']],
        [
          'github',
          ctx.gh ? [n(ctx.gh.repos), ' repos', ...(ctx.gh.pushedAt ? [` · pushed ${ago(ctx.gh.pushedAt, ctx.now)}`] : [])] : ['—'],
        ],
      ],
    },
  ];
}

function logLines(): Line[] {
  const dated = CHECKPOINTS.filter((c) => c.at).sort((a, b) => b.at!.getTime() - a.at!.getTime());
  const w = Math.max(...dated.map((c) => c.id.length)) + 2;
  const lines: Line[] = dated.map((c, i) =>
    pre(
      { t: '* ', cls: 'art' },
      { t: ym(c.at!), cls: 'n' },
      '  ',
      cmd(c.id, `open ${c.id}`),
      ' '.repeat(w - c.id.length),
      c.role.toLowerCase(),
      ...(i === 0 ? [{ t: '  (HEAD, running)', cls: 'okc' }] : []),
      ...(c.at!.getTime() === EPOCH0.getTime() ? [{ t: '  (epoch 0)', cls: 'k' }] : []),
    ),
  );
  const undated = CHECKPOINTS.filter((c) => !c.at);
  lines.push(dim('  undated: ', ...spaced(undated.map((c) => cmd(c.id, `open ${c.id}`)), ' · ')));
  return lines;
}

const COMMANDS: Record<string, Command> = {
  help: {
    usage: 'help',
    help: 'list commands',
    group: 'this',
    run: (_, ctx) => {
      const groups: [string, Part[]][] = [
        ['navigate', [cmd('ls'), ' · ', cmd('cd <dir>', 'cd projects'), ' · ', cmd('open <name>', 'open vitalsync'), ' · ', cmd('tree'), ' · ', cmd('back')]],
        ['find', [cmd('grep <word>', 'grep onnx'), ' · ', cmd('which <skill>', 'which pytorch'), ' · ', cmd('log'), ' · ', cmd('eval')]],
        ['reach me', [cmd('mail [message]', 'mail hello'), ' · ', cmd('copy email'), ' · ', cmd('resume'), ' · ', cmd('ping')]],
        ['this site', [cmd('fetch'), ' · ', cmd('theme [name]', 'theme'), ' · ', cmd('history'), ' · ', cmd('clear'), ' · ', cmd('man <cmd>', 'man grep')]],
      ];
      ctx.print(...table(groups.map(([g, ps]) => [key(g), ps])), dim('tab completes · ↑↓ history · everything underlined is clickable'));
    },
  },
  man: {
    usage: 'man <command>',
    help: 'how a command works',
    group: 'this',
    run: ([c], ctx) => {
      const m = c && COMMANDS[c];
      if (!m) return ctx.print(err(`man: ${c ? `no entry for ${c}` : 'what manual page do you want?'}`), dim('try ', cmd('man grep')));
      ctx.print(out({ t: m.usage, cls: 'b' }), dim(m.help));
    },
  },
  ls: {
    usage: 'ls [-l] [dir]',
    help: 'list what is in a directory; -l adds details',
    group: 'navigate',
    run: (args, ctx) => {
      const long = args.some((a) => /^-\w*l/.test(a));
      const arg = args.filter((a) => !a.startsWith('-')).join(' ');
      const target = arg ? resolve(ctx.route, arg) : ctx.route;
      if (!target) return ctx.print(err(`ls: ${arg}: no such file or directory`));
      ctx.print(...lsLines(target, long));
    },
  },
  cd: {
    usage: 'cd <dir>',
    help: 'go to a section: cd projects, cd .., cd ~, cd -',
    group: 'navigate',
    run: (args, ctx) => {
      const arg = args.join(' ');
      if (arg === '-') {
        if (!ctx.back()) ctx.print(err('cd: no previous directory'));
        return;
      }
      const r = resolve(ctx.route, arg);
      if (!r) {
        const guess = didYouMean(arg, PATHS);
        return ctx.print(err(`cd: no such file or directory: ${arg}`), ...(guess ? [dim('did you mean ', cmd(guess, `cd ${guess}`), '?')] : []));
      }
      ctx.go(r);
    },
  },
  open: {
    usage: 'open <name>',
    help: 'open a project, section, or link: open vitalsync, open github, open resume',
    group: 'navigate',
    run: (args, ctx) => {
      const arg = args.join(' ').toLowerCase();
      if (!arg) return ctx.print(err('open: open what?'), dim('try ', cmd('open vitalsync'), ' or ', cmd('ls')));
      if (EXTERNAL[arg]) {
        openTab(EXTERNAL[arg]);
        return ctx.print(ok('opening ', link(arg, EXTERNAL[arg]), ' in a new tab'));
      }
      if (arg === 'resume' || arg === 'resume.pdf') return COMMANDS.resume.run([], ctx);
      if (arg === 'email' || arg === 'mail') return COMMANDS.mail.run([], ctx);
      const r = resolve(ctx.route, arg);
      if (!r) {
        const guess = didYouMean(arg, [...PATHS, ...Object.keys(EXTERNAL), 'resume']);
        return ctx.print(err(`open: ${arg}: not found`), ...(guess ? [dim('did you mean ', cmd(guess, `open ${guess}`), '?')] : []));
      }
      ctx.go(r);
    },
  },
  cat: {
    usage: 'cat <name>',
    help: 'open something and print a summary here',
    group: 'navigate',
    run: (args, ctx) => {
      const arg = args.join(' ');
      if (!arg) return ctx.print(err('cat: cat what?'), dim('try ', cmd('cat vitalsync')));
      if (/^resume(\.pdf)?$/.test(arg)) return ctx.print(err('cat: resume.pdf: binary file'), dim('try ', cmd('resume'), ' to download it'));
      const r = resolve(ctx.route, arg);
      if (!r) return ctx.print(err(`cat: ${arg}: no such file`));
      ctx.print(...catLines(r));
      if (shownEntry(r) || !entriesIn(r.section).length) ctx.go(r);
    },
  },
  tree: { usage: 'tree', help: 'the whole site at a glance', group: 'navigate', run: (_, ctx) => ctx.print(...treeLines()) },
  back: {
    usage: 'back',
    help: 'the previous view (same as cd -)',
    group: 'navigate',
    run: (_, ctx) => {
      if (!ctx.back()) ctx.print(err('back: nothing to go back to'));
    },
  },
  pwd: { usage: 'pwd', help: 'where you are', group: 'navigate', run: (_, ctx) => ctx.print(out(fileOf(ctx.route))) },

  grep: {
    usage: 'grep <word>',
    help: 'search everything on the site; matches stay highlighted (esc clears)',
    group: 'find',
    run: (args, ctx) => {
      const term = args.join(' ').replace(/^["']|["']$/g, '');
      if (!term) return ctx.print(err('grep: search for what?'), dim('try ', cmd('grep onnx'), ' or ', cmd('grep real-time')));
      const { hits, total } = grep(term);
      ctx.highlight(term);
      if (!total) return ctx.print(err(`grep: no matches for “${term}”`));
      const where = (h: (typeof hits)[number]) => (h.where.startsWith('skills/') ? 'cd skills' : h.where === 'about' ? 'cd ~' : `open ${h.where}`);
      ctx.print(
        ...table(
          hits.map((h) => [
            cmd(h.where, where(h)),
            [h.snippet.slice(0, h.at), { t: h.snippet.slice(h.at, h.at + h.len), cls: 'hit' }, h.snippet.slice(h.at + h.len)],
          ]),
        ),
        dim(`${total} match${total === 1 ? '' : 'es'}${total > hits.length ? `, ${hits.length} shown` : ''} · highlighted on the page · esc clears`),
      );
    },
  },
  which: {
    usage: 'which <skill>',
    help: 'where a tool or skill was used: which pytorch',
    group: 'find',
    run: (args, ctx) => {
      const skill = args.join(' ');
      if (!skill) return ctx.print(err('which: which skill?'), dim('try ', cmd('which pytorch'), ' or ', cmd('which docker')));
      const used = which(skill);
      const group = skillGroupOf(skill);
      if (!used.length && !group) {
        const guess = didYouMean(skill.toLowerCase(), SKILLS);
        return ctx.print(err(`which: ${skill} not found in this run`), ...(guess ? [dim('did you mean ', cmd(guess, `which ${guess}`), '?')] : []));
      }
      const lines: Line[] = [];
      if (group) lines.push(out({ t: skill, cls: 'b' }, ' is listed under ', cmd(`skills/${group}`, 'cd skills')));
      if (used.length) {
        lines.push(
          ...table(used.map((u) => [cmd(u.id, `open ${u.id}`), key(u.how === 'stack' ? `in the stack · ${entryLabel(u.id)}` : `mentioned in the work · ${entryLabel(u.id)}`)])),
        );
      } else lines.push(dim('not tied to a specific project on this site'));
      ctx.print(...lines);
    },
  },
  log: { usage: 'log', help: 'the run as a git log: every dated chapter', group: 'find', run: (_, ctx) => ctx.print(...logLines()) },
  eval: {
    usage: 'eval',
    help: 'every number from the cv, with where it came from',
    group: 'find',
    run: (_, ctx) =>
      ctx.print(...table(CHECKPOINTS.flatMap((c) => (c.evals ?? []).map((e): [Part[], Part[]] => [[cmd(c.id, `open ${c.id}`), `/${e.key}`], [n(e.value)]])))),
  },

  mail: {
    usage: 'mail [message]',
    help: 'write to me; anything after mail becomes the message',
    group: 'reach',
    run: (args, ctx) => {
      const body = args.join(' ');
      mailto('Hello from rushijhala.vercel.app', body);
      ctx.print(ok('opening your mail app → ', link(PERSON.email, LINKS.email)), dim('nothing opened? ', cmd('copy email')));
    },
  },
  copy: {
    usage: 'copy email|link',
    help: 'copy my email, or a link to this view',
    group: 'reach',
    run: async ([what = 'email'], ctx) => {
      const text = what === 'link' ? window.location.href : PERSON.email;
      try {
        await navigator.clipboard.writeText(text);
        ctx.print(ok(`copied ${text}`));
      } catch {
        ctx.print(err('copy: the browser blocked the clipboard'), out(text));
      }
    },
  },
  resume: {
    usage: 'resume',
    help: 'download my resume (pdf)',
    group: 'reach',
    run: (_, ctx) => {
      download(LINKS.resume, 'Rushi_Jhala_Resume.pdf');
      ctx.print(ok('downloading ', link('Rushi_Jhala_Resume.pdf', LINKS.resume)));
    },
  },
  ping: {
    usage: 'ping',
    help: 'check whether I am reachable',
    group: 'reach',
    run: (_, ctx) =>
      ctx.print(
        out(`PING ${PERSON.handle} via email and linkedin`),
        out({ t: 'status: looking for full-time or internship roles from may 2027', cls: 'okc' }),
        out('64 bytes from ', { t: PERSON.email, cls: 'b' }, ': icmp_seq=1 ttl=64 · reachable'),
        dim('send a real one: ', cmd('mail hello'), ' · ', cmd('open linkedin')),
      ),
  },
  hire: {
    usage: 'hire',
    help: 'the obvious next step',
    group: 'reach',
    hidden: true,
    run: (_, ctx) => {
      ctx.print(ok('good call. opening a mail to ', { t: PERSON.email, cls: 'b' }, ' …'));
      mailto("Let's work together");
    },
  },

  fetch: { usage: 'fetch', help: 'a summary of this run', group: 'this', run: (_, ctx) => ctx.print(...fetchLines(ctx)) },
  theme: {
    usage: 'theme [name]',
    help: 'switch colours; no name cycles',
    group: 'this',
    run: ([name], ctx) => {
      if (name === 'ls' || name === 'list') return ctx.print(out(...spaced(ctx.themes.map((t) => cmd(t, `theme ${t}`)))));
      if (name && !ctx.themes.includes(name)) return ctx.print(err(`theme: no theme ${name}`), out(...spaced(ctx.themes.map((t) => cmd(t, `theme ${t}`)))));
      ctx.print(ok(`theme → ${ctx.setTheme(name)}`));
    },
  },
  history: {
    usage: 'history',
    help: 'what you ran (click to run again)',
    group: 'this',
    run: (_, ctx) => {
      const h = [...ctx.history].reverse();
      if (!h.length) return ctx.print(dim('no history yet'));
      ctx.print(...h.slice(-12).map((c, i) => pre({ t: String(h.length - Math.min(12, h.length) + i + 1).padStart(4) + '  ', cls: 'k' }, cmd(c))));
    },
  },
  clear: { usage: 'clear', help: 'clear the terminal (ctrl+l)', group: 'this', run: (_, ctx) => ctx.clear() },
  train: {
    usage: 'train',
    help: 'replay the training run',
    group: 'this',
    run: (_, ctx) => {
      ctx.retrain();
      if (ctx.route.section !== 'about') ctx.go(HOME);
      ctx.print(dim('python train.py --resume'), ok('resumed at step ', n(days(EPOCH0, ctx.now).toLocaleString('en-US')), ' · eta may 2027'));
    },
  },

  whoami: {
    usage: 'whoami',
    help: 'who is who',
    group: 'this',
    hidden: true,
    run: (_, ctx) =>
      ctx.print(out({ t: PERSON.name.toLowerCase(), cls: 'b' }, ` · ${PERSON.role.toLowerCase()}`), dim('and you: a visitor. hi. try ', cmd('fetch'), '.')),
  },
  date: {
    usage: 'date',
    help: 'my local time',
    group: 'this',
    hidden: true,
    run: (_, ctx) =>
      ctx.print(out(ctx.now.toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'full', timeStyle: 'short' }).toLowerCase(), ' (et)')),
  },
  echo: { usage: 'echo <text>', help: 'print text', group: 'this', hidden: true, run: (args, ctx) => ctx.print(out(args.join(' '))) },
  sudo: {
    usage: 'sudo <command>',
    help: 'no',
    group: 'this',
    hidden: true,
    run: (args, ctx) => {
      if (args.some((a) => /hire/i.test(a))) return COMMANDS.hire.run([], ctx);
      ctx.print(err('sudo: this run is read-only'), dim('though ', cmd('sudo hire rushi'), ' is allowed'));
    },
  },
  rm: { usage: 'rm', help: 'no', group: 'this', hidden: true, run: (_, ctx) => ctx.print(err('rm: checkpoints are append-only')) },
  vim: { usage: 'vim', help: 'already here', group: 'this', hidden: true, run: (_, ctx) => ctx.print(dim('you are already in it. the whole page is the buffer.')) },
  exit: {
    usage: 'exit',
    help: 'stay a while',
    group: 'this',
    hidden: true,
    run: (_, ctx) => ctx.print(dim('this shell is the website. there is no outside. try ', cmd('cd ~'), '.')),
  },
  hello: {
    usage: 'hello',
    help: 'hi',
    group: 'this',
    hidden: true,
    run: (_, ctx) => ctx.print(out('hi! start with ', cmd('fetch'), ', ', cmd('ls'), ' or ', cmd('help'), '.')),
  },
};

const ALIAS: Record<string, string> = {
  dir: 'ls',
  ll: 'ls -l',
  la: 'ls -l',
  neofetch: 'fetch',
  timeline: 'log',
  email: 'mail',
  cls: 'clear',
  vi: 'vim',
  nvim: 'vim',
  nano: 'vim',
  quit: 'exit',
  logout: 'exit',
  hi: 'hello',
  hey: 'hello',
  find: 'grep',
  search: 'grep',
  '?': 'help',
  skills: 'cd skills',
  contact: 'cd contact',
  metrics: 'eval',
  cv: 'resume',
};

export const COMMAND_NAMES = Object.keys(COMMANDS).filter((c) => !COMMANDS[c].hidden);

// ---- run ------------------------------------------------------------------------------

export function exec(raw: string, ctx: Ctx) {
  let line = raw.trim();
  if (!line) return;
  // a few shapes people type
  line = line.replace(/^git\s+log.*$/, 'log').replace(/^python3?\s+train\.py.*$/, 'train').replace(/^man\s*$/, 'help');
  let [name, ...args] = line.split(/\s+/);
  name = name.toLowerCase();
  if (ALIAS[name]) {
    const [n2, ...a2] = ALIAS[name].split(' ');
    name = n2;
    args = [...a2, ...args];
  }
  const c = COMMANDS[name];
  if (c) return c.run(args, ctx);

  // A bare name is enough: `projects`, `vitalsync`, `github`.
  if (EXTERNAL[name] || name === 'resume') return COMMANDS.open.run([name], ctx);
  const r = resolve(ctx.route, line);
  if (r) return ctx.go(r);

  const guess = didYouMean(name, [...COMMAND_NAMES, ...PATHS]);
  ctx.print(
    err(`zsh: command not found: ${name}`),
    guess ? dim('did you mean ', cmd(guess, COMMANDS[guess] ? guess : `open ${guess}`), '?  or ', cmd('help')) : dim('try ', cmd('help')),
  );
}

// ---- completion ---------------------------------------------------------------------------

const ARGS: Record<string, (ctx: Ctx) => string[]> = {
  cd: () => ['..', '~', ...PATHS.filter((p) => SECTIONS.some((s) => s.id === p) || entriesIn(p.split('/')[0]).length > 0)],
  ls: () => [...SECTIONS.filter((s) => s.kind).map((s) => s.id), '-l'],
  open: () => [...CHECKPOINTS.map((c) => c.id), ...SECTIONS.map((s) => s.id), ...Object.keys(EXTERNAL).filter((k) => k !== 'twitter'), 'resume'],
  cat: () => [...CHECKPOINTS.map((c) => c.id), 'skills', 'contact', 'about'],
  theme: (ctx) => [...ctx.themes],
  man: () => COMMAND_NAMES,
  which: () => SKILLS,
  grep: () => SKILLS,
  copy: () => ['email', 'link'],
};

/** Every candidate for what is being typed, best first. */
export function candidates(input: string, ctx: Ctx): string[] {
  const sp = input.indexOf(' ');
  if (sp < 0) {
    const q = input.toLowerCase();
    if (!q) return [];
    const pool = [...COMMAND_NAMES, ...SECTIONS.map((s) => s.id), ...CHECKPOINTS.map((c) => c.id), ...Object.keys(EXTERNAL)];
    return [...new Set(pool.filter((p) => p.startsWith(q) && p !== q))];
  }
  const head = input.slice(0, sp).toLowerCase();
  const argText = input.slice(sp + 1);
  const pool = ARGS[head]?.(ctx) ?? [];
  const lastSpace = argText.lastIndexOf(' ');
  const prefix = (lastSpace < 0 ? argText : argText.slice(lastSpace + 1)).toLowerCase();
  const before = input.slice(0, input.length - prefix.length);
  return pool.filter((p) => p.toLowerCase().startsWith(prefix) && p.toLowerCase() !== prefix).map((p) => before + p);
}

/** The fish-style grey suggestion: history first, then completion. */
export function suggest(input: string, ctx: Ctx): string {
  if (!input.trim()) return '';
  const fromHistory = ctx.history.find((h) => h.startsWith(input) && h.length > input.length);
  if (fromHistory) return fromHistory.slice(input.length);
  const c = candidates(input, ctx)[0];
  return c ? c.slice(input.length) : '';
}

// ---- suggestions by place -----------------------------------------------------------------

export function chipsFor(route: Route): string[] {
  const list = entriesIn(route.section);
  const e = shownEntry(route);
  if (e && list.length > 1) {
    const i = list.indexOf(e);
    const next = list[(i + 1) % list.length];
    const tool = e.stack[0]?.toLowerCase();
    return ['cd ..', `open ${next.id}`, ...(tool ? [`which ${tool}`] : []), 'mail hello'];
  }
  switch (route.section) {
    case 'about':
      return ['ls', 'cd projects', 'fetch', 'log', 'resume'];
    case 'experience':
      return ['which opencv', 'grep real-time', 'cd projects', 'resume'];
    case 'projects':
      return [...list.map((c) => `open ${c.id}`), 'grep onnx'];
    case 'education':
      return ['log', 'cat pdeu', 'cd skills'];
    case 'leadership':
      return ['log', 'cd projects', 'mail hello'];
    case 'skills':
      return ['which pytorch', 'which docker', 'grep forecasting', 'cd projects'];
    case 'contact':
      return ['mail hello', 'copy email', 'resume', 'open linkedin', 'ping'];
    default:
      return ['ls', 'help'];
  }
}

