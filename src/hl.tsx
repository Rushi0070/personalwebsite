import type { ReactNode } from 'react';

// Figures in running text are set in --num, the way an editor colours number
// literals. Only free-standing numbers match: "95%+", "0.45", "768px", "100+",
// but not the "11" in YOLO11n or the "10" in 10-K. Arrows match too (group 2).
const NUM = /(?<![\w-])([<−]?\d+(?:[.,]\d+)*(?:%\+?|\+|px\b|s\b)?)(?![\w-])|(→)/g;

export function hl(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(NUM)) {
    const i = m.index ?? 0;
    if (i > last) out.push(text.slice(last, i));
    // Arrows are set in the mono face (the text face has none).
    out.push(
      <span key={i} className={m[2] ? 'arrow' : 'num'}>
        {m[0]}
      </span>,
    );
    last = i + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

// hl(), plus every occurrence of `term` wrapped in <mark> (grep's hits).
export function mark(text: string, term: string): ReactNode[] {
  if (!term) return hl(text);
  const q = term.toLowerCase();
  const low = text.toLowerCase();
  const out: ReactNode[] = [];
  let last = 0;
  for (let i = low.indexOf(q); i >= 0; i = low.indexOf(q, i + q.length)) {
    if (i > last) out.push(<span key={`t${last}`}>{hl(text.slice(last, i))}</span>);
    out.push(
      <mark key={`m${i}`} className="hit">
        {text.slice(i, i + q.length)}
      </mark>,
    );
    last = i + q.length;
  }
  if (last < text.length) out.push(<span key={`t${last}`}>{hl(text.slice(last))}</span>);
  return out;
}
