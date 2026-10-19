'use client';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays } from '@/domain/dates.js';
import { formatLongDate } from '@/lib/format';

/** Previous / next day with a date input. Calls onChange(isoDate). */
export function DateNav({ date, onChange, min, max, label = 'Date', id = 'date-input' }: { date: string; onChange: (d: string) => void; min?: string | null; max?: string | null; label?: string; id?: string }) {
  const prev = addDays(date, -1);
  const next = addDays(date, 1);
  const btn = 'grid size-10 shrink-0 place-items-center rounded-full border border-border bg-card text-heading hover:bg-mint disabled:opacity-40';
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-2">
      <button type="button" className={btn} aria-label="Previous day" disabled={Boolean(min && prev < min)} onClick={() => onChange(prev)}><ChevronLeft className="size-5" aria-hidden /></button>
      <label className="sr-only" htmlFor={id}>{label}</label>
      <input id={id} type="date" value={date} min={min ?? undefined} max={max ?? undefined}
        onChange={(e) => { if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) onChange(e.target.value); }}
        className="min-h-10 rounded-[12px] border border-input bg-card px-3 text-base text-foreground" />
      <button type="button" className={btn} aria-label="Next day" disabled={Boolean(max && next > max)} onClick={() => onChange(next)}><ChevronRight className="size-5" aria-hidden /></button>
      <span className="font-display text-sm font-medium text-heading">{formatLongDate(date)}</span>
    </div>
  );
}
