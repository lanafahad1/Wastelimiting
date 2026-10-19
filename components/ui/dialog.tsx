'use client';
import * as React from 'react';
import { Dialog as D } from '@base-ui/react/dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motionClass } from './motion';

/** Modal dialog (Base UI) with the transitions.dev "Modal open / close" transition. Focus is trapped and returns to the opener. */
export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({ className, children, wide = false, showClose = true, ...props }: React.ComponentProps<typeof D.Popup> & { wide?: boolean; showClose?: boolean }) {
  return (
    <D.Portal>
      <D.Backdrop className={(s) => cn('t-backdrop fixed inset-0 z-50 bg-[rgba(81,81,81,.28)] backdrop-blur-[2px]', motionClass(s))} />
      <D.Viewport className="fixed inset-0 z-50 grid place-items-end overflow-y-auto p-0 sm:place-items-center sm:p-6">
        <D.Popup
          className={(s) => cn(
            't-modal relative flex max-h-[min(92dvh,100%)] w-full flex-col overflow-hidden rounded-t-[24px] border border-border bg-card shadow-lift outline-none sm:rounded-[24px]',
            wide ? 'sm:max-w-3xl' : 'sm:max-w-lg',
            motionClass(s), typeof className === 'string' ? className : '',
          )}
          {...props}
        >
          {children}
          {showClose ? (
            <D.Close aria-label="Close dialog" className="absolute right-3 top-3 grid size-10 place-items-center rounded-full text-heading hover:bg-mint">
              <X className="size-5" />
            </D.Close>
          ) : null}
        </D.Popup>
      </D.Viewport>
    </D.Portal>
  );
}

export function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1 border-b border-border px-5 pb-4 pr-14 pt-5 sm:px-6', className)} {...props} />;
}
export function DialogTitle({ className, ...props }: React.ComponentProps<typeof D.Title>) {
  return <D.Title className={cn('font-display text-xl font-semibold text-heading', className as string)} {...props} />;
}
export function DialogDescription({ className, ...props }: React.ComponentProps<typeof D.Description>) {
  return <D.Description className={cn('text-sm text-muted-foreground', className as string)} {...props} />;
}
export function DialogBody({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-4 overflow-y-auto px-5 py-5 sm:px-6', className)} {...props} />;
}
export function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col-reverse gap-2 border-t border-border bg-background/60 px-5 py-4 sm:flex-row sm:justify-end sm:px-6 pb-[max(1rem,env(safe-area-inset-bottom))]', className)} {...props} />;
}
