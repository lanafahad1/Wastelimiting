import * as React from 'react';
import { cn } from '@/lib/utils';

/** Scrollable table: only the table scrolls sideways on small screens, never the page. */
export function Table({ className, caption, ...props }: React.ComponentProps<'table'> & { caption?: React.ReactNode }) {
  return (
    <div className="w-full overflow-x-auto rounded-[16px] border border-border bg-card">
      <table className={cn('w-full border-collapse text-left text-sm', className)} {...props}>
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        {props.children}
      </table>
    </div>
  );
}
export const Th = ({ className, ...p }: React.ComponentProps<'th'>) => <th className={cn('border-b border-border bg-blush/60 px-3 py-2.5 font-display text-[.8rem] font-semibold uppercase tracking-wide text-heading', className)} {...p} />;
export const Td = ({ className, ...p }: React.ComponentProps<'td'>) => <td className={cn('border-b border-border px-3 py-2.5 align-top', className)} {...p} />;
