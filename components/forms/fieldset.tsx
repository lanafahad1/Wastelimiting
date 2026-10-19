import * as React from 'react';
import { cn } from '@/lib/utils';

export function Fieldset({ legend, children, className, hint }: { legend: React.ReactNode; children: React.ReactNode; className?: string; hint?: React.ReactNode }) {
  return (
    <fieldset className={cn('flex min-w-0 flex-col gap-2.5', className)}>
      <legend className="mb-1 font-display text-[.95rem] font-semibold text-heading">{legend}</legend>
      {children}
      {hint ? <span className="text-sm text-muted-foreground">{hint}</span> : null}
    </fieldset>
  );
}

/** Responsive grid of option cards. */
export function Options({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return <div className={cn('grid gap-2', wide ? 'sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')}>{children}</div>;
}
