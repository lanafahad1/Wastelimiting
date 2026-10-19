import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Hover/focus hint for an icon-only control (transitions.dev "Tooltip open/close",
 * pure CSS). The control must still have an accessible name (aria-label).
 * For explanations that must also work on touch, use <Toggletip> instead.
 */
export function Tooltip({ label, children, className }: { label: string; children: React.ReactElement<{ className?: string }>; className?: string }) {
  const id = React.useId();
  const trigger = React.cloneElement(children, { className: cn('t-tt-trigger', children.props.className), 'aria-describedby': id } as Record<string, unknown>);
  return (
    <span className={cn('t-tt-wrap', className)}>
      {trigger}
      <span className="t-tt z-40 text-xs font-semibold" id={id} role="tooltip">{label}</span>
    </span>
  );
}
