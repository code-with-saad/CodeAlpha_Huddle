import { useEffect, useMemo, useRef, useState } from 'react';

// Hand-built SVG charts. Colours come from tokens only (classes in dashboard.css), marks are thin,
// values sit at the end of the bar, and each chart has a plain table behind the same numbers.

// Horizontal bars, one row per item. `tone` picks a token: accent, success, danger, warning or muted.
export function BarList({ rows, label }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="barlist" aria-label={label}>
      {rows.map((r) => (
        <li key={r.key} className="barrow">
          <span className="bar-label">
            {r.icon}
            <span className="bar-name">{r.label}</span>
            {r.tag && <span className="bar-tag">{r.tag}</span>}
          </span>
          <span className="bar-track" aria-hidden="true">
            <span className={`bar bar-${r.tone}`} style={{ width: r.value ? `max(4px, ${(r.value / max) * 100}%)` : 0 }} />
          </span>
          <span className="bar-value mono">{r.value}</span>
        </li>
      ))}
    </ul>
  );
}

// Open and done side by side in one stacked bar per row, separated by a 2px surface gap.
export function StackedList({ rows, label }) {
  const max = Math.max(1, ...rows.map((r) => r.open + r.done));
  return (
    <ul className="barlist" aria-label={label}>
      {rows.map((r) => {
        const total = r.open + r.done;
        return (
          <li key={r.key} className="barrow">
            <span className="bar-label">
              {r.icon}
              <span className="bar-name">{r.label}</span>
            </span>
            <span className="bar-track" aria-hidden="true">
              <span className="stack" style={{ width: total ? `max(4px, ${(total / max) * 100}%)` : 0 }}>
                {r.open > 0 && <span className="bar bar-accent stack-open" style={{ flex: r.open }} />}
                {r.done > 0 && <span className="bar bar-success stack-done" style={{ flex: r.done }} />}
              </span>
            </span>
            <span className="bar-value mono" title={`${r.open} open, ${r.done} done`}>
              {r.open}
              <span className="bar-sub"> open</span>, {r.done}
              <span className="bar-sub"> done</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

const niceMax = (n) => {
  if (n <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(n));
  return [1, 2, 5, 10].map((m) => m * pow).find((v) => v >= n);
};
const fmtDay = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });

// Completed per day as columns, created per day as a line, on one shared axis.
// Hover or arrow keys show a crosshair and a tooltip. `table` swaps the picture for the numbers.
export function TrendChart({ series, table }) {
  const wrap = useRef(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const H = 220;
  const m = { l: 34, r: 12, t: 12, b: 26 };
  const iw = width - m.l - m.r;
  const ih = H - m.t - m.b;
  const top = niceMax(Math.max(1, ...series.flatMap((s) => [s.created, s.completed])));
  const band = iw / series.length;
  const barW = Math.max(3, Math.min(24, band * 0.6));
  const x = (i) => m.l + band * i + band / 2;
  const y = (v) => m.t + ih - (v / top) * ih;
  const ticks = [0, top / 4, top / 2, (top * 3) / 4, top].map((v) => Math.round(v * 10) / 10);
  const xTicks = useMemo(() => {
    const want = width < 480 ? 3 : 6;
    const step = Math.max(1, Math.floor(series.length / want));
    const out = [];
    for (let i = series.length - 1; i >= 0; i -= step) out.unshift(i);
    return out;
  }, [series.length, width]);
  const line = series.map((s, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(s.created).toFixed(1)}`).join(' ');

  const at = (clientX) => {
    const r = wrap.current.getBoundingClientRect();
    return Math.min(series.length - 1, Math.max(0, Math.floor(((clientX - r.left - m.l) / iw) * series.length)));
  };
  const tip = hover === null ? null : series[hover];

  if (table) {
    return (
      <div className="trend-table" tabIndex={0} role="region" aria-label="Created and completed per day, as a table">
        <table>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Completed</th>
              <th scope="col">Created</th>
            </tr>
          </thead>
          <tbody>
            {[...series].reverse().map((s) => (
              <tr key={s.date}>
                <th scope="row">{fmtDay(s.date)}</th>
                <td className="mono">{s.completed}</td>
                <td className="mono">{s.created}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="trend" ref={wrap}>
      <svg
        width={width}
        height={H}
        role="img"
        tabIndex={0}
        aria-label={`Created and completed tasks per day. ${series.reduce((n, s) => n + s.completed, 0)} completed and ${series.reduce((n, s) => n + s.created, 0)} created. Use the left and right arrow keys to read each day, or switch to the table.`}
        onPointerMove={(e) => setHover(at(e.clientX))}
        onPointerLeave={() => setHover(null)}
        onFocus={() => hover === null && setHover(series.length - 1)}
        onBlur={() => setHover(null)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') { e.preventDefault(); setHover((h) => Math.max(0, (h ?? series.length) - 1)); }
          else if (e.key === 'ArrowRight') { e.preventDefault(); setHover((h) => Math.min(series.length - 1, (h ?? -1) + 1)); }
          else if (e.key === 'Escape') setHover(null);
        }}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid" x1={m.l} x2={width - m.r} y1={y(t)} y2={y(t)} />
            <text className="axis" x={m.l - 8} y={y(t)} textAnchor="end" dominantBaseline="middle">{t}</text>
          </g>
        ))}
        {xTicks.map((i) => (
          <text key={i} className="axis" x={x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === series.length - 1 ? 'end' : 'middle'}>
            {fmtDay(series[i].date)}
          </text>
        ))}
        {series.map((s, i) => {
          const h = (s.completed / top) * ih;
          if (!h) return null;
          // Rounded 4px at the data end, square on the baseline.
          const r = Math.min(4, barW / 2, h);
          const x0 = x(i) - barW / 2;
          const y0 = y(s.completed);
          return <path key={s.date} className="col" d={`M${x0},${y0 + h} V${y0 + r} Q${x0},${y0} ${x0 + r},${y0} H${x0 + barW - r} Q${x0 + barW},${y0} ${x0 + barW},${y0 + r} V${y0 + h} Z`} />;
        })}
        <path className="line" d={line} fill="none" />
        {hover !== null && (
          <g>
            <line className="cross" x1={x(hover)} x2={x(hover)} y1={m.t} y2={m.t + ih} />
            <circle className="dot" cx={x(hover)} cy={y(tip.created)} r={4} />
          </g>
        )}
        {hover === null && <circle className="dot" cx={x(series.length - 1)} cy={y(series.at(-1).created)} r={4} />}
      </svg>
      {tip && (
        <div className="tooltip" role="status" style={{ left: Math.min(width - 150, Math.max(0, x(hover) - 70)), top: 0 }}>
          <strong>{fmtDay(tip.date)}</strong>
          <span><i className="key key-col" />Completed <b className="mono">{tip.completed}</b></span>
          <span><i className="key key-line" />Created <b className="mono">{tip.created}</b></span>
        </div>
      )}
    </div>
  );
}
