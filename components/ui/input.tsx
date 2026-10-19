import * as React from 'react';
import { cn } from '@/lib/utils';

export const inputClass =
  'w-full min-h-11 rounded-[12px] border border-input bg-card px-3.5 py-2 text-base text-foreground placeholder:text-muted-foreground/80 shadow-[inset_0_1px_1px_rgba(0,0,0,.02)] focus-visible:outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/20 aria-invalid:border-destructive disabled:opacity-60';

export function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return <input className={cn(inputClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return <textarea className={cn(inputClass, 'min-h-24 py-2.5 leading-relaxed', className)} {...props} />;
}

/** Native select: accessible and comfortable on phones. */
export function NativeSelect({ className, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      className={cn(inputClass, 'appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 16 16%27%3E%3Cpath d=%27M4 6.5 8 10.5 12 6.5%27 fill=%27none%27 stroke=%27%23526B59%27 stroke-width=%271.6%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27/%3E%3C/svg%3E")] bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10', className)}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return <label className={cn('font-display text-sm font-medium text-heading', className)} {...props} />;
}
