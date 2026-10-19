'use client';
// Small accessible SVG charts for the nutrition team dashboard (port of the old
// charts.js): line, column, horizontal bar and stacked bar. Thin marks, hairline
// grid, one y-axis. Every chart has a text title and caption, a "Show as table"
// alternative, a hover tooltip, and keyboard reading: focus the chart and use
// the arrow keys; the current value is announced in a polite live region.
import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { Table, Th, Td } from '@/components/ui/table';
import { cn } from '@/lib/utils';

/** Validated dataviz palette from the old stylesheet (sage single series, rose second series, sage ordinal ramp). */
export const VIZ = {
  surface: '#FFFFFF', c1: '#4E7A5B', c2: '#B4546F',
  o1: '#9FBFA6', o2: '#7FA88A', o3: '#4E7A5B', o4: '#2F4A38',
  grid: '#EFE9E9', axis: '#DCD3D3', ink: '#515151', muted: '#6B6666', cross: '#BFB4B4',
};

type TipLine = { label: string; value: string; color?: string };
type Tip = { title: string; lines: TipLine[] };
type Anchor = { x: number; y: number };

const ns = (n: number) => Number(n.toFixed(1));

/** Round an axis maximum up to a clean number. */
export function niceMax(v: number, min = 1) {
  const x = Math.max(v, min);
  const mag = 10 ** Math.floor(Math.log10(x));
  const n = x / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
}

function useWidth(initial = 520, min = 260) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(initial);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth((w) => { const next = Math.max(min, Math.floor(el.clientWidth)); return Math.abs(next - w) > 4 ? next : w; });
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [min]);
  return { ref, width };
}

const tipText = (t: Tip) => `${t.title}: ${t.lines.map((l) => (l.value ? `${l.label} ${l.value}` : l.label)).join(', ')}`;

/** Interactive plot area: hover or arrow keys pick a data point; its values show in a tooltip and are announced. */
function Plot({ label, tips, anchors, width, children, indexAt, svgHeight }: {
  label: string; tips: Tip[]; anchors: Anchor[]; width: number; svgHeight: number; children: (active: number | null) => React.ReactNode;
  indexAt: (x: number, y: number) => number;
}) {
  const [active, setActive] = React.useState<number | null>(null);
  const [kbd, setKbd] = React.useState(false);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const tip = active != null ? tips[active] : null;
  const a = active != null ? anchors[active] : null;
  const onKey = (e: React.KeyboardEvent) => {
    if (!tips.length) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); setKbd(true); setActive((i) => (i == null ? 0 : (i + 1) % tips.length)); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); setKbd(true); setActive((i) => (i == null ? tips.length - 1 : (i - 1 + tips.length) % tips.length)); }
    else if (e.key === 'Home') { e.preventDefault(); setKbd(true); setActive(0); }
    else if (e.key === 'End') { e.preventDefault(); setKbd(true); setActive(tips.length - 1); }
    else if (e.key === 'Escape') setActive(null);
  };
  const onMove = (e: React.PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const i = indexAt(e.clientX - r.left, e.clientY - r.top);
    setKbd(false);
    setActive(i >= 0 ? i : null);
  };
  // Keep the tooltip inside the chart.
  const tipW = 200;
  const left = a ? Math.min(Math.max(0, a.x + 12), Math.max(0, width - tipW)) : 0;
  const top = a ? Math.max(0, a.y - 70) : 0;
  return (
    <div className="relative">
      <div
        ref={boxRef}
        tabIndex={0}
        role="group"
        aria-roledescription="chart"
        aria-label={`${label}. Use the arrow keys to read each value, or open the table below.`}
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
        onPointerMove={onMove}
        onPointerLeave={() => setActive(null)}
        className="rounded-[10px] outline-none focus-visible:ring-3 focus-visible:ring-primary/30"
      >
        <svg width={width} height={svgHeight} viewBox={`0 0 ${width} ${svgHeight}`} aria-hidden className="block overflow-visible">
          {children(active)}
        </svg>
      </div>
      {tip && a ? (
        <div aria-hidden className="pointer-events-none absolute z-10 w-max min-w-36 max-w-[200px] rounded-[12px] border border-border bg-card px-2.5 py-2 text-[.82rem] shadow-lift" style={{ left, top }}>
          <div className="mb-1 font-semibold text-muted-foreground">{tip.title}</div>
          {tip.lines.map((l, i) => (
            <div key={i} className="flex items-center gap-2">
              {l.color ? <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: l.color }} /> : null}
              {l.value ? <b className="tabular text-foreground">{l.value}</b> : null}
              <span>{l.label}</span>
            </div>
          ))}
        </div>
      ) : null}
      <p className="sr-only" aria-live="polite">{tip && kbd ? tipText(tip) : ''}</p>
    </div>
  );
}

/** Figure shell: title, caption, optional legend, the plot and a table view. */
export function Figure({ title, caption, legend, headers, rows, children, className }: {
  title: string; caption?: string; legend?: React.ReactNode; headers: string[]; rows: (string | number)[][]; children: React.ReactNode; className?: string;
}) {
  const id = React.useId();
  return (
    <figure className={cn('m-0 flex min-w-0 flex-col gap-2', className)} aria-labelledby={`${id}-t`}>
      <figcaption className="flex flex-col gap-0.5">
        <b id={`${id}-t`} className="font-display font-medium text-heading">{title}</b>
        {caption ? <span className="text-[.84rem] text-muted-foreground">{caption}</span> : null}
      </figcaption>
      {legend}
      {children}
      <details className="group rounded-[12px] border border-border bg-background/60 [&_summary::-webkit-details-marker]:hidden">
        <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 font-display text-sm font-medium text-heading">
          Show as table <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="p-2 pt-0">
          <Table caption={title} className="text-[.84rem]">
            <thead><tr>{headers.map((h, i) => <Th key={h} scope="col" className={i ? 'text-right' : ''}>{h}</Th>)}</tr></thead>
            <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => (j === 0 ? <Th key={j} scope="row" className="bg-transparent font-sans text-[.84rem] font-semibold normal-case tracking-normal text-foreground">{c}</Th> : <Td key={j} className="text-right tabular">{c}</Td>))}</tr>)}</tbody>
          </Table>
        </div>
      </details>
    </figure>
  );
}

export function Legend({ series }: { series: { label: string; color: string }[] }) {
  return (
    <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-[.84rem]" aria-label="Legend">
      {series.map((s) => <li key={s.label} className="inline-flex items-center gap-1.5"><span aria-hidden className="size-3 rounded-[3px]" style={{ background: s.color }} />{s.label}</li>)}
    </ul>
  );
}

function Frame({ w, h, m, yMax, ticks, fmt }: { w: number; h: number; m: { t: number; r: number; b: number; l: number }; yMax: number; ticks: number; fmt: (v: number) => string }) {
  const ih = h - m.t - m.b;
  return (
    <>
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const v = (yMax / ticks) * i;
        const y = ns(m.t + ih - (v / yMax) * ih);
        return (
          <g key={i}>
            <line x1={m.l} x2={w - m.r} y1={y} y2={y} stroke={VIZ.grid} strokeWidth={1} />
            <text x={m.l - 8} y={y + 4} textAnchor="end" fontSize={12} fill={VIZ.muted} className="tabular">{fmt(v)}</text>
          </g>
        );
      })}
      <line x1={m.l} x2={w - m.r} y1={m.t + ih} y2={m.t + ih} stroke={VIZ.axis} strokeWidth={1} />
    </>
  );
}

export type DayPoint = { label: string; short: string; value: number | null; detail?: string };

/** Single-series line over days. A null value leaves a gap ("no records"). */
export function LineChart({ points, yMax, fmt, unit, color = VIZ.c1, ticks = 4, missing = 'no records' }: { points: DayPoint[]; yMax: number; fmt: (v: number) => string; unit: string; color?: string; ticks?: number; missing?: string }) {
  const { ref, width: w } = useWidth();
  const m = { t: 18, r: 46, b: 30, l: 44 };
  const h = 220;
  const iw = w - m.l - m.r;
  const ih = h - m.t - m.b;
  const step = iw / Math.max(1, points.length - 1);
  const xs = points.map((_, i) => ns(m.l + i * step));
  const y = (v: number) => ns(m.t + ih - (v / yMax) * ih);
  let path = '';
  let pen = false;
  points.forEach((p, i) => { if (p.value == null) { pen = false; return; } path += `${pen ? 'L' : 'M'}${xs[i]},${y(p.value)}`; pen = true; });
  const lastI = points.map((p) => p.value != null).lastIndexOf(true);
  const tips = points.map((p) => ({ title: p.label, lines: [{ label: unit, value: p.value == null ? missing : fmt(p.value), color }, ...(p.detail ? [{ label: p.detail, value: '' }] : [])] }));
  const anchors = points.map((p, i) => ({ x: xs[i], y: p.value == null ? m.t + ih / 2 : y(p.value) }));
  const indexAt = (x: number) => { let best = 0; xs.forEach((gx, i) => { if (Math.abs(gx - x) < Math.abs(xs[best] - x)) best = i; }); return best; };
  return (
    <div ref={ref} className="w-full min-w-0">
      <Plot label={`${unit} by day`} tips={tips} anchors={anchors} width={w} svgHeight={h} indexAt={indexAt}>
        {(active) => (
          <>
            <Frame w={w} h={h} m={m} yMax={yMax} ticks={ticks} fmt={fmt} />
            {active != null ? <line x1={xs[active]} x2={xs[active]} y1={m.t} y2={m.t + ih} stroke={VIZ.cross} strokeWidth={1} /> : null}
            {points.map((p, i) => <text key={i} x={xs[i]} y={h - 10} textAnchor="middle" fontSize={12} fill={VIZ.muted}>{p.short}</text>)}
            <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {points.map((p, i) => (p.value != null ? <circle key={i} cx={xs[i]} cy={y(p.value)} r={active === i ? 5.5 : 4} fill={color} stroke={VIZ.surface} strokeWidth={2} /> : <text key={i} x={xs[i]} y={m.t + ih - 6} textAnchor="middle" fontSize={12} fill={VIZ.muted}>–</text>))}
            {lastI >= 0 ? <text x={xs[lastI] + 8} y={y(points[lastI].value as number) + 4} fontSize={12} fontWeight={700} fill={VIZ.ink}>{fmt(points[lastI].value as number)}</text> : null}
          </>
        )}
      </Plot>
    </div>
  );
}

const roundTop = (x: number, y0: number, bw: number, bh: number) => {
  const r = Math.min(4, bh);
  return `M${ns(x)},${y0}V${ns(y0 - bh + r)}Q${ns(x)},${ns(y0 - bh)} ${ns(x + r)},${ns(y0 - bh)}H${ns(x + bw - r)}Q${ns(x + bw)},${ns(y0 - bh)} ${ns(x + bw)},${ns(y0 - bh + r)}V${y0}Z`;
};

/** Single-series columns over days. A null value shows "–" (no data, not zero). */
export function ColumnChart({ points, yMax, fmt, unit, color = VIZ.c1, missing = 'not measured' }: { points: DayPoint[]; yMax: number; fmt: (v: number) => string; unit: string; color?: string; missing?: string }) {
  const { ref, width: w } = useWidth();
  const m = { t: 22, r: 12, b: 30, l: 48 };
  const h = 220;
  const iw = w - m.l - m.r;
  const ih = h - m.t - m.b;
  const band = iw / Math.max(1, points.length);
  const bw = Math.min(24, band * 0.6);
  const max = Math.max(0, ...points.map((p) => p.value ?? 0));
  const y0 = m.t + ih;
  const cx = (i: number) => m.l + band * i + band / 2;
  const tips = points.map((p) => ({ title: p.label, lines: [{ label: unit, value: p.value == null ? missing : fmt(p.value), color }, ...(p.detail ? [{ label: p.detail, value: '' }] : [])] }));
  const anchors = points.map((p, i) => ({ x: cx(i), y: y0 - ((p.value ?? 0) / yMax) * ih }));
  const indexAt = (x: number) => Math.min(points.length - 1, Math.max(0, Math.floor((x - m.l) / band)));
  return (
    <div ref={ref} className="w-full min-w-0">
      <Plot label={`${unit} by day`} tips={tips} anchors={anchors} width={w} svgHeight={h} indexAt={indexAt}>
        {(active) => (
          <>
            <Frame w={w} h={h} m={m} yMax={yMax} ticks={4} fmt={fmt} />
            {points.map((p, i) => {
              const bh = ((p.value ?? 0) / yMax) * ih;
              return (
                <g key={i}>
                  {active === i ? <rect x={ns(cx(i) - band / 2)} y={m.t} width={ns(band)} height={ih} fill={VIZ.grid} opacity={0.6} /> : null}
                  <text x={ns(cx(i))} y={h - 10} textAnchor="middle" fontSize={12} fill={VIZ.muted}>{p.short}</text>
                  {bh > 0 ? <path d={roundTop(cx(i) - bw / 2, y0, bw, bh)} fill={color} /> : <text x={ns(cx(i))} y={y0 - 6} textAnchor="middle" fontSize={12} fill={VIZ.muted}>–</text>}
                  {p.value != null && p.value === max && max > 0 ? <text x={ns(cx(i))} y={ns(y0 - bh - 6)} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ.ink}>{fmt(p.value)}</text> : null}
                </g>
              );
            })}
          </>
        )}
      </Plot>
    </div>
  );
}

/** Horizontal bars for categories. */
export function HBarChart({ items, fmt, unit, color = VIZ.c1 }: { items: { label: string; value: number }[]; fmt: (v: number) => string; unit: string; color?: string }) {
  const { ref, width: w } = useWidth();
  // Narrow screens: each label sits above its bar so long reasons are never cut.
  const above = w < 480;
  const row = above ? 44 : 30;
  const labelW = above ? 1 : Math.min(210, Math.max(120, w * 0.4));
  const m = { t: 6, r: 40, b: 6, l: labelW };
  const h = m.t + m.b + items.length * row;
  const iw = w - m.l - m.r;
  const max = niceMax(Math.max(1, ...items.map((i) => i.value)));
  const maxChars = above ? 80 : Math.max(12, Math.floor((labelW - 14) / 6.6));
  const tips = items.map((it) => ({ title: it.label, lines: [{ label: unit, value: fmt(it.value), color }] }));
  const anchors = items.map((it, i) => ({ x: m.l + (it.value / max) * iw, y: m.t + i * row + row / 2 }));
  const indexAt = (_x: number, yy: number) => Math.min(items.length - 1, Math.max(0, Math.floor((yy - m.t) / row)));
  return (
    <div ref={ref} className="w-full min-w-0">
      <Plot label={unit} tips={tips} anchors={anchors} width={w} svgHeight={h} indexAt={indexAt}>
        {(active) => (
          <>
            <line x1={m.l} x2={m.l} y1={m.t} y2={h - m.b} stroke={VIZ.axis} strokeWidth={1} />
            {items.map((it, i) => {
              const yy = m.t + i * row;
              const bw = Math.max(0, (it.value / max) * iw);
              const by = above ? yy + 22 : yy + (row - 16) / 2;
              if (above) {
                const r = Math.min(4, bw);
                const d = bw > 0 ? `M${m.l},${ns(by)}H${ns(m.l + bw - r)}Q${ns(m.l + bw)},${ns(by)} ${ns(m.l + bw)},${ns(by + r)}V${ns(by + 16 - r)}Q${ns(m.l + bw)},${ns(by + 16)} ${ns(m.l + bw - r)},${ns(by + 16)}H${m.l}Z` : '';
                return (
                  <g key={it.label}>
                    {active === i ? <rect x={0} y={yy} width={w} height={row} fill={VIZ.grid} opacity={0.6} /> : null}
                    <text x={m.l + 6} y={yy + 15} fontSize={12.5} fontWeight={600} fill={VIZ.ink}>{it.label}</text>
                    {d ? <path d={d} fill={color} /> : null}
                    <text x={ns(m.l + bw + 6)} y={ns(by + 12)} fontSize={12} fontWeight={700} fill={VIZ.ink}>{fmt(it.value)}</text>
                  </g>
                );
              }
              const r = Math.min(4, bw);
              const d = bw > 0 ? `M${m.l},${ns(by)}H${ns(m.l + bw - r)}Q${ns(m.l + bw)},${ns(by)} ${ns(m.l + bw)},${ns(by + r)}V${ns(by + 16 - r)}Q${ns(m.l + bw)},${ns(by + 16)} ${ns(m.l + bw - r)},${ns(by + 16)}H${m.l}Z` : '';
              return (
                <g key={it.label}>
                  {active === i ? <rect x={0} y={yy} width={w} height={row} fill={VIZ.grid} opacity={0.6} /> : null}
                  <text x={m.l - 10} y={ns(yy + row / 2 + 4)} textAnchor="end" fontSize={12.5} fontWeight={600} fill={VIZ.ink}>{it.label.length > maxChars ? `${it.label.slice(0, maxChars - 1)}…` : it.label}</text>
                  {d ? <path d={d} fill={color} /> : null}
                  <text x={ns(m.l + bw + 6)} y={ns(yy + row / 2 + 4)} fontSize={12} fontWeight={700} fill={VIZ.ink}>{fmt(it.value)}</text>
                </g>
              );
            })}
          </>
        )}
      </Plot>
    </div>
  );
}

export type Series = { key: string; label: string; color: string; ink?: 'light' };

/** Horizontal stacked bars, 2px surface gaps between segments. */
export function StackedChart({ rows, series, unit }: { rows: { label: string; segments: Record<string, number> }[]; series: Series[]; unit: string }) {
  const { ref, width: w } = useWidth();
  const row = 34;
  const m = { t: 6, r: 44, b: 6, l: 86 };
  const h = m.t + m.b + rows.length * row;
  const iw = w - m.l - m.r;
  const total = (r: { segments: Record<string, number> }) => series.reduce((s, x) => s + (r.segments[x.key] ?? 0), 0);
  const max = Math.max(1, ...rows.map(total));
  const tips = rows.map((r) => ({ title: r.label, lines: series.map((s) => ({ label: s.label, value: String(r.segments[s.key] ?? 0), color: s.color })) }));
  const anchors = rows.map((r, i) => ({ x: m.l + (total(r) / max) * iw, y: m.t + i * row + row / 2 }));
  const indexAt = (_x: number, yy: number) => Math.min(rows.length - 1, Math.max(0, Math.floor((yy - m.t) / row)));
  return (
    <div ref={ref} className="w-full min-w-0">
      <Plot label={unit} tips={tips} anchors={anchors} width={w} svgHeight={h} indexAt={indexAt}>
        {(active) => rows.map((r, i) => {
          const yy = m.t + i * row + (row - 18) / 2;
          let x = m.l;
          const segs = series.map((s) => ({ ...s, value: r.segments[s.key] ?? 0 })).filter((s) => s.value > 0);
          return (
            <g key={r.label}>
              {active === i ? <rect x={0} y={m.t + i * row} width={w} height={row} fill={VIZ.grid} opacity={0.6} /> : null}
              <text x={m.l - 10} y={ns(yy + 13)} textAnchor="end" fontSize={12.5} fontWeight={600} fill={VIZ.ink}>{r.label}</text>
              {segs.map((s, k) => {
                const full = (s.value / max) * iw;
                const gap = k < segs.length - 1 ? 2 : 0;
                const bw = Math.max(1, full - gap);
                const last = k === segs.length - 1;
                const rr = last ? Math.min(4, bw) : 0;
                const d = `M${ns(x)},${ns(yy)}H${ns(x + bw - rr)}${rr ? `Q${ns(x + bw)},${ns(yy)} ${ns(x + bw)},${ns(yy + rr)}V${ns(yy + 18 - rr)}Q${ns(x + bw)},${ns(yy + 18)} ${ns(x + bw - rr)},${ns(yy + 18)}` : `V${ns(yy + 18)}`}H${ns(x)}Z`;
                const el = (
                  <g key={s.key}>
                    <path d={d} fill={s.color} />
                    {bw >= 22 ? <text x={ns(x + bw / 2)} y={ns(yy + 13)} textAnchor="middle" fontSize={11.5} fontWeight={800} fill={s.ink === 'light' ? '#FFFFFF' : '#1F2E24'}>{s.value}</text> : null}
                  </g>
                );
                x += full;
                return el;
              })}
              <text x={ns(x + 6)} y={ns(yy + 13)} fontSize={12} fontWeight={700} fill={VIZ.ink}>{total(r)}</text>
            </g>
          );
        })}
      </Plot>
    </div>
  );
}
