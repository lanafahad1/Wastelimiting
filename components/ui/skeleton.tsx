import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

/** Placeholder that pulses while content loads (transitions.dev "Skeleton loader" pulse). */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className="t-skel-skeleton is-pulsing !static" style={{ '--pulse-count': 'infinite' } as CSSProperties}>
      <div className={cn('rounded-[12px] bg-rose/70', className)} />
    </div>
  );
}

/** Loading region announced to screen readers. */
export function LoadingBlock({ label = 'Loading…', rows = 3 }: { label?: string; rows?: number }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className={i === 0 ? 'h-24' : 'h-16'} />)}
    </div>
  );
}
