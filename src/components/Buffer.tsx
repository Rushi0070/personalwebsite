import type { ReactNode } from 'react';
import type { Checkpoint } from '../data';
import { hl } from '../hl';

// ckpts/<id>.md as an editor buffer: every logical line is numbered, long
// lines wrap under a hanging indent, and the rest of the window shows vim's
// end-of-buffer tildes.

type Row = { cls?: string; body?: ReactNode; extra?: ReactNode };

function rowsOf(c: Checkpoint): Row[] {
  const rows: Row[] = [];
  const blank = () => rows.push({});
  const h2 = (t: string) => rows.push({ cls: 'md-h2', body: <><span className="md-mark">##</span> {t}</> });

  rows.push({ cls: 'md-h1', body: <h2><span className="md-mark">#</span> {c.title}</h2> });
  rows.push({
    cls: 'md-sub',
    body: (
      <>
        {c.role}
        {c.when && <span className="md-dim"> · {c.when}</span>}
      </>
    ),
  });
  if (c.url) {
    rows.push({
      body: (
        <a className="md-link" href={c.url} target="_blank" rel="noopener noreferrer">
          <span className="md-dim">[</span>
          {c.urlLabel}
          <span className="md-dim">]</span> ↗
        </a>
      ),
    });
  }

  if (c.evals?.length) {
    blank();
    h2('evals');
    rows.push({
      cls: 'md-evals',
      body: c.evals.map((e, i) => (
        <span key={e.key} className="md-eval">
          {i > 0 && <span className="md-dim"> · </span>}
          <span className="md-dim">{e.key}</span> <span className="num">{e.value}</span>
        </span>
      )),
    });
  }

  if (c.photo) {
    blank();
    rows.push({
      cls: 'md-img',
      body: (
        <>
          <span className="md-dim">![</span>
          {c.photo.caption}
          <span className="md-dim">]({c.photo.src.split('/').pop()})</span>
        </>
      ),
      extra: (
        <figure className="md-fig">
          <img src={c.photo.src} alt={c.photo.alt} loading="lazy" />
        </figure>
      ),
    });
  }

  blank();
  h2('log');
  for (const l of c.lines) rows.push({ cls: 'md-li', body: <><span className="md-bullet">-</span>{hl(l)}</> });

  if (c.config?.length) {
    blank();
    h2('config');
    for (const k of c.config) {
      rows.push({
        cls: 'md-kv',
        body: (
          <>
            <span className="md-key">{k.key}:</span> {hl(k.value)}
          </>
        ),
      });
    }
  }

  if (c.stack.length) {
    blank();
    h2('stack');
    rows.push({
      cls: 'md-stack',
      body: c.stack.map((s) => (
        <code key={s} className="md-code">
          {s}
        </code>
      )),
    });
  }
  return rows;
}

export default function Buffer({ ckpt }: { ckpt: Checkpoint }) {
  const rows = rowsOf(ckpt);
  return (
    <>
      <article className="buffer" key={ckpt.id}>
        {rows.map((r, i) => (
          <div key={i} className={`bl ${r.cls ?? ''}`}>
            <span className="ln" aria-hidden="true">
              {i + 1}
            </span>
            <div className="lt">
              {r.body ?? ' '}
              {r.extra}
            </div>
          </div>
        ))}
      </article>
      <div className="eob" aria-hidden="true">
        {Array.from({ length: 40 }, (_, i) => (
          <span key={i}>~</span>
        ))}
      </div>
    </>
  );
}
