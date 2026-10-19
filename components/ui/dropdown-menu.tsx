'use client';
import * as React from 'react';
import { Menu } from '@base-ui/react/menu';
import { cn } from '@/lib/utils';
import { motionClass, originFor } from './motion';

/** Dropdown menu (Base UI) with the transitions.dev "Menu dropdown" origin-aware transition. */
export const DropdownMenu = Menu.Root;
export const DropdownMenuTrigger = Menu.Trigger;

export function DropdownMenuContent({ className, side = 'bottom', align = 'start', sideOffset = 8, children, ...props }: React.ComponentProps<typeof Menu.Popup> & { side?: 'top' | 'bottom'; align?: 'start' | 'center' | 'end'; sideOffset?: number }) {
  return (
    <Menu.Portal>
      <Menu.Positioner side={side} align={align} sideOffset={sideOffset} className="z-50 outline-none">
        <Menu.Popup
          data-origin={originFor(side, align)}
          className={(s) => cn('t-dropdown min-w-48 rounded-[16px] border border-border bg-popover p-1.5 shadow-lift outline-none', motionClass(s), typeof className === 'string' ? className : '')}
          {...props}
        >
          {children}
        </Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  );
}

const itemClass = 'flex w-full cursor-pointer select-none items-center gap-2 rounded-[10px] px-3 py-2 text-[.95rem] text-foreground no-underline outline-none data-[highlighted]:bg-mint data-[highlighted]:text-sage-deep [&_svg]:size-4 [&_svg]:text-heading';

export function DropdownMenuItem({ className, ...props }: React.ComponentProps<typeof Menu.Item>) {
  return <Menu.Item className={cn(itemClass, className as string)} {...props} />;
}
export function DropdownMenuLinkItem({ className, ...props }: React.ComponentProps<typeof Menu.LinkItem>) {
  return <Menu.LinkItem className={cn(itemClass, className as string)} {...props} />;
}
export function DropdownMenuSeparator({ className }: { className?: string }) {
  return <Menu.Separator className={cn('my-1 h-px bg-border', className)} />;
}
export function DropdownMenuLabel({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('px-3 pb-1 pt-2 text-xs font-bold uppercase tracking-wider text-muted-foreground', className)} {...props} />;
}
