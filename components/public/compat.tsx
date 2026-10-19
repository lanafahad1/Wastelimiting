import * as React from 'react';
import { ShieldCheck, ShieldX, TriangleAlert, Scale } from 'lucide-react';
import { Toggletip } from '@/components/cb/toggletip';
import { cn } from '@/lib/utils';

export type Compat = { id: string; code: string; label: string; status: 'eligible' | 'depends' | 'review' | 'excluded'; note: string; portions: string[] };

const COMPAT: Record<Compat['status'], [string, string, React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>]> = {
  eligible: ['border-sage bg-success-soft text-success', 'Fits', ShieldCheck],
  depends: ['border-[#F1DFB8] bg-warning-soft text-warning', 'Depends on limits', Scale],
  review: ['border-[#F1DFB8] bg-warning-soft text-warning', 'Needs review', TriangleAlert],
  excluded: ['border-[#F3C9D3] bg-destructive-soft text-destructive', 'Not suitable', ShieldX],
};

/** One diet-compatibility result: code + text + icon; opens the reason on tap or Enter. */
export function CompatChip({ c }: { c: Compat }) {
  const [cls, text, Icon] = COMPAT[c.status] ?? COMPAT.review;
  return (
    <Toggletip ariaLabel={`${c.code}: ${text} for ${c.label}. Show why`} className={cn('min-h-8 gap-1 border-solid px-2.5 py-1 font-semibold tracking-normal', cls)}
      label={<><Icon className="size-3.5 shrink-0" aria-hidden /><b className="font-mono">{c.code}</b> {text}</>}>
      <b>{c.label}:</b> {c.note}
    </Toggletip>
  );
}

export function CompatChips({ list, className }: { list: Compat[]; className?: string }) {
  return (
    <ul aria-label="Compatibility with hospital diet categories" className={cn('flex flex-wrap gap-1.5', className)}>
      {list.map((c) => <li key={c.id}><CompatChip c={c} /></li>)}
    </ul>
  );
}
