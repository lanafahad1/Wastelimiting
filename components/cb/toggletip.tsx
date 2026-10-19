'use client';
import * as React from 'react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

/**
 * An explanation that opens on click, tap or Enter/Space and closes with Escape
 * (not hover only), so it works with mouse, keyboard and touch.
 */
export function Toggletip({ label, children, className, ariaLabel }: { label: React.ReactNode; children: React.ReactNode; className?: string; ariaLabel: string }) {
  return (
    <Popover>
      <PopoverTrigger aria-label={ariaLabel} className={cn('inline-flex cursor-pointer items-center rounded-full border border-dashed border-input bg-card px-2 py-0.5 text-[.75rem] font-bold tracking-wide text-heading hover:border-primary hover:bg-mint', className)}>
        {label}
      </PopoverTrigger>
      <PopoverContent side="top" className="text-foreground">{children}</PopoverContent>
    </Popover>
  );
}
