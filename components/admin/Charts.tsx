"use client";

import { useId, useState } from "react";

/** Area + line chart with a marker on the best period. */
export function SalesChart({
  labels,
  values,
  format,
}: {
  labels: string[];
  values: number[];
  format: (n: number) => string;
}) {
  const gradient = useId();
  const [active, setActive] = useState(values.indexOf(Math.max(...values)));

  const w = 720;
  const h = 240;
  const pad = { top: 18, right: 12, bottom: 26, left: 46 };
  const max = Math.max(...values) * 1.15;
  const x = (i: number) => pad.left + (i * (w - pad.left - pad.right)) / Math.max(values.length - 1, 1);
  const y = (v: number) => pad.top + (1 - v / max) * (h - pad.top - pad.bottom);

  const line = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(values.length - 1).toFixed(1)},${h - pad.bottom} L${pad.left},${h - pad.bottom} Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(max * t));

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-56 w-full" role="img" aria-label="Sales over time">
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00A9E0" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#00A9E0" stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={w - pad.right} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeDasharray="4 6" />
            <text x={pad.left - 8} y={y(t) + 4} textAnchor="end" className="fill-slate-400 text-[10px]">
              {format(t)}
            </text>
          </g>
        ))}

        <path d={area} fill={`url(#${gradient})`} />
        <path d={line} fill="none" stroke="#00A9E0" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

        {values.map((v, i) => (
          <g key={labels[i]}>
            <rect
              x={x(i) - 14}
              y={pad.top}
              width="28"
              height={h - pad.top - pad.bottom}
              fill="transparent"
              onMouseEnter={() => setActive(i)}
            />
            <circle cx={x(i)} cy={y(v)} r={i === active ? 5 : 0} fill="#fff" stroke="#004165" strokeWidth="3" />
            <text x={x(i)} y={h - 8} textAnchor="middle" className="fill-slate-400 text-[10px]">
              {labels[i]}
            </text>
          </g>
        ))}

        <g transform={`translate(${Math.min(Math.max(x(active), 70), w - 80)}, ${Math.max(y(values[active]) - 34, 4)})`}>
          <rect x="-62" y="0" width="124" height="28" rx="8" fill="#004165" />
          <text x="0" y="18" textAnchor="middle" className="fill-white text-[11px] font-semibold">
            {labels[active]} · {format(values[active])}
          </text>
        </g>
      </svg>
    </div>
  );
}

/** Donut with a centred total and a legend. */
export function Donut({
  slices,
  caption,
}: {
  slices: { name: string; value: number; color: string }[];
  caption?: string;
}) {
  const total = slices.reduce((sum, s) => sum + s.value, 0) || 1;
  const r = 52;
  const c = 2 * Math.PI * r;

  // Pre-compute each arc's length and start so nothing is reassigned while rendering.
  const arcs = slices.reduce<{ name: string; color: string; value: number; len: number; start: number }[]>(
    (acc, s) => {
      const len = (s.value / total) * c;
      const start = acc.length ? acc[acc.length - 1].start + acc[acc.length - 1].len : 0;
      return [...acc, { name: s.name, color: s.color, value: s.value, len, start }];
    },
    [],
  );

  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 140 140" className="h-32 w-32 shrink-0" role="img" aria-label={caption ?? "Breakdown"}>
        <g transform="translate(70,70) rotate(-90)">
          <circle r={r} fill="none" stroke="#eef2f6" strokeWidth="20" />
          {arcs.map((a) => (
            <circle
              key={a.name}
              r={r}
              fill="none"
              stroke={a.color}
              strokeWidth="20"
              strokeDasharray={`${a.len} ${c - a.len}`}
              strokeDashoffset={-a.start}
            />
          ))}
        </g>
        <text x="70" y="66" textAnchor="middle" className="fill-brand text-[20px] font-extrabold">
          {total}
        </text>
        <text x="70" y="84" textAnchor="middle" className="fill-slate-400 text-[10px]">
          {caption ?? "total"}
        </text>
      </svg>

      <ul className="min-w-0 flex-1 space-y-1.5 text-sm">
        {slices.map((s) => (
          <li key={s.name} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
              <span className="truncate text-ink">{s.name}</span>
            </span>
            <span className="shrink-0 font-semibold text-brand">{Math.round((s.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Horizontal bars, used for campaigns and categories. */
export function Bars({
  rows,
  format,
}: {
  rows: { name: string; value: number; sub?: string }[];
  format: (n: number) => string;
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.name} className="space-y-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium text-brand">{r.name}</span>
            <span className="shrink-0 text-ink">{r.sub ?? format(r.value)}</span>
          </div>
          <div className="h-2 rounded-full bg-surface">
            <div
              className="h-2 rounded-full bg-accent"
              style={{ width: `${Math.max((r.value / max) * 100, 3)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Tiny inline trend line for the KPI tiles. */
export function Spark({ values, color = "#004165" }: { values: number[]; color?: string }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const d = values
    .map((v, i) => `${i === 0 ? "M" : "L"}${(i * 60) / (values.length - 1)},${20 - ((v - min) / span) * 18}`)
    .join(" ");
  return (
    <svg viewBox="0 0 60 22" className="h-6 w-16" aria-hidden>
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
