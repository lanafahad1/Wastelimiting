'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';

/** transitions.dev "Success check": plays once when it mounts (or when `play` turns true). */
export function SuccessCheck({ play = true, className }: { play?: boolean; className?: string }) {
  const [state, setState] = React.useState<'out' | 'in'>('out');
  React.useEffect(() => {
    if (!play) return;
    const id = requestAnimationFrame(() => setState('in'));
    return () => cancelAnimationFrame(id);
  }, [play]);
  return (
    <span className={cn('t-success-check grid size-12 place-items-center rounded-full bg-success-soft text-success', className)} data-state={state} aria-hidden>
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none"><path d="M6 12.5l4 4 8-9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </span>
  );
}
