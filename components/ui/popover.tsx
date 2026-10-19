'use client';
import * as React from 'react';
import { Popover as P } from '@base-ui/react/popover';
import { cn } from '@/lib/utils';
import { motionClass, originFor } from './motion';

/** Popover (Base UI): opens on click/tap and keyboard, closes with Escape. Uses the dropdown transition. */
export const Popover = P.Root;
export const PopoverTrigger = P.Trigger;
export const PopoverClose = P.Close;
export const PopoverTitle = P.Title;
export const PopoverDescription = P.Description;

export function PopoverContent({ className, side = 'bottom', align = 'center', sideOffset = 8, children, ...props }: React.ComponentProps<typeof P.Popup> & { side?: 'top' | 'bottom'; align?: 'start' | 'center' | 'end'; sideOffset?: number }) {
  return (
    <P.Portal>
      <P.Positioner side={side} align={align} sideOffset={sideOffset} collisionPadding={12} className="z-50">
        <P.Popup
          data-origin={originFor(side, align)}
          className={(s) => cn('t-dropdown max-w-[min(22rem,calc(100vw-24px))] rounded-[16px] border border-border bg-popover p-3.5 text-sm shadow-lift outline-none', motionClass(s), typeof className === 'string' ? className : '')}
          {...props}
        >
          {children}
        </P.Popup>
      </P.Positioner>
    </P.Portal>
  );
}
