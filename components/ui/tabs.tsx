'use client';
import * as React from 'react';
import { Tabs as T } from '@base-ui/react/tabs';
import { cn } from '@/lib/utils';

/**
 * Tabs (Base UI) styled with the transitions.dev "Tabs sliding" segmented
 * control: the pill slides to the active tab (Base UI measures its position).
 */
export const Tabs = T.Root;
export const TabsPanel = T.Panel;

export function TabsList({ className, children, ...props }: React.ComponentProps<typeof T.List>) {
  return (
    <div className="max-w-full overflow-x-auto [scrollbar-width:none]">
      <T.List className={cn('t-tabs bg-blush', className as string)} {...props}>
        {children}
        <T.Indicator
          className="t-tabs-pill bg-card shadow-soft"
          style={{ transform: 'translateX(var(--active-tab-left))', width: 'var(--active-tab-width)', top: 'var(--active-tab-top)', height: 'var(--active-tab-height)' } as React.CSSProperties}
        />
      </T.List>
    </div>
  );
}

export function TabsTab({ className, ...props }: React.ComponentProps<typeof T.Tab>) {
  return <T.Tab className={cn('t-tab inline-flex items-center gap-1.5 whitespace-nowrap font-display text-sm font-medium data-[active]:text-heading [&_svg]:size-4', className as string)} {...props} />;
}
