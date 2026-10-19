import * as React from 'react';
import { cn } from '@/lib/utils';

/** Page title block: eyebrow, h1, intro and an optional action area. */
export function PageHead({ eyebrow, title, children, actions, className, narrow }: { eyebrow?: React.ReactNode; title: React.ReactNode; children?: React.ReactNode; actions?: React.ReactNode; className?: string; narrow?: boolean }) {
  return (
    <div className={cn('container-page flex flex-col gap-4 pb-6 pt-8 sm:pt-12 md:flex-row md:items-end md:justify-between', narrow && 'container-narrow', className)}>
      <div className="flex max-w-3xl flex-col gap-3">
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h1 className="text-[2rem] leading-tight sm:text-[2.6rem]">{title}</h1>
        {children ? <div className="text-[1.05rem] text-muted-foreground [&_p+p]:mt-2">{children}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2 md:justify-end">{actions}</div> : null}
    </div>
  );
}

/** Main content wrapper with bottom spacing. */
export function PageBody({ children, className, narrow }: { children: React.ReactNode; className?: string; narrow?: boolean }) {
  return <div className={cn('container-page flex flex-col gap-6 pb-16', narrow && 'container-narrow', className)}>{children}</div>;
}
