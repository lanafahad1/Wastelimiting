'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';

/** Disclosure using the transitions.dev "Accordion expand" (grid-rows height + chevron flip). */
export function Accordion({ title, children, defaultOpen = false, open: controlled, onOpenChange, className, headClassName, id }: {
  title: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean; open?: boolean; onOpenChange?: (open: boolean) => void; className?: string; headClassName?: string; id?: string;
}) {
  const [inner, setInner] = React.useState(defaultOpen);
  const open = controlled ?? inner;
  const panelId = React.useId();
  const toggle = () => { const next = !open; if (controlled === undefined) setInner(next); onOpenChange?.(next); };
  return (
    <div className={cn('t-acc', className)} data-open={open ? 'true' : 'false'} id={id}>
      <button type="button" className={cn('t-acc-head flex w-full items-center justify-between gap-3 text-left', headClassName)} aria-expanded={open} aria-controls={panelId} onClick={toggle}>
        <span className="min-w-0 flex-1">{title}</span>
        <span className="t-acc-chevron text-heading" aria-hidden>
          <svg viewBox="0 0 16 16" width="16" height="16"><path d="M4 6.5L8 10.5L12 6.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
      </button>
      <div className="t-acc-panel" id={panelId} role="region" inert={!open}>
        <div className="t-acc-panel-inner">{children}</div>
      </div>
    </div>
  );
}
