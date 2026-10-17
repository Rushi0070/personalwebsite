import type { ReactNode } from 'react';

// Figures in running text are set in --num, the way an editor colours number
// literals. Only free-standing numbers match: "95%+", "0.45", "768px", "100+",
// but not the "11" in YOLO11n or the "10" in 10-K.
const NUM = /(?<![\w-])([<−]?\d+(?:[.,]\d+)*(?:%\+?|\+|px\b|s\b)?)(?![\w-])/g;

export function hl(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(NUM)) {
    const i = m.index ?? 0;
    if (i > last) out.push(text.slice(last, i));
    out.push(
      <span key={i} className="num">
        {m[0]}
      </span>,
    );
    last = i + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
