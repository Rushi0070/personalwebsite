import type { Checkpoint } from '../data';
import { hl } from '../hl';

// One role, project or degree: what it was, the numbers, what was done, with
// what. Body text is set in the text face at reading size; labels in mono.
export default function Entry({ c }: { c: Checkpoint }) {
  return (
    <article className="entry" id={c.id} data-spy="entry" aria-labelledby={`${c.id}-t`}>
      <header className="entry-head">
        <h3 className="entry-title" id={`${c.id}-t`}>
          {c.title}
        </h3>
        {c.when && <p className="entry-when">{c.when}</p>}
        <p className="entry-role">
          {c.role}
          {c.status === 'running' && (
            <span className="entry-live">
              <i aria-hidden="true" /> in progress
            </span>
          )}
          {c.url && (
            <a className="entry-link" href={c.url} target="_blank" rel="noopener noreferrer">
              {c.urlLabel} ↗
            </a>
          )}
        </p>
      </header>

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

      {c.photo && (
        <figure className="entry-fig">
          <img src={c.photo.src} alt={c.photo.alt} loading="lazy" />
          <figcaption>{c.photo.caption}</figcaption>
        </figure>
      )}

      <ul className="entry-lines">
        {c.lines.map((l, i) => (
          <li key={i}>{hl(l)}</li>
        ))}
      </ul>

      {c.config && c.config.length > 0 && (
        <dl className="entry-config">
          {c.config.map((k) => (
            <div key={k.key}>
              <dt>{k.key}</dt>
              <dd>{hl(k.value)}</dd>
            </div>
          ))}
        </dl>
      )}

      {c.stack.length > 0 && (
        <ul className="tags" aria-label="Stack">
          {c.stack.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      )}
    </article>
  );
}
