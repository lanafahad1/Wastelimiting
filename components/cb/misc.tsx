import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { botanical } from '@/lib/art.js';
import { ABOUT_NAV } from '@/lib/site';

export function PatientHeader({ b, link = true }: { b: { id: string; demoId: string; preferredName?: string; ward: string; wardLabel?: string; bed: string; ageRange?: string }; link?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col">
      <span className="w-fit rounded-[8px] border border-[#F5D5DD] bg-blush px-1.5 font-mono text-[.8rem] font-bold text-rose-ink">{b.demoId}</span>
      <span className="font-display text-lg font-semibold text-heading">{link ? <Link href={`/patients/${b.id}`} className="no-underline hover:underline">{b.preferredName || b.demoId}</Link> : b.preferredName || b.demoId}</span>
      <span className="text-sm text-muted-foreground">{b.wardLabel ?? `Ward ${b.ward}`} · Bed {b.bed}{b.ageRange ? ` · ${b.ageRange}` : ''}</span>
    </div>
  );
}

/** Demo-ID pill used in tables and lists. */
export const Pid = ({ children }: { children: React.ReactNode }) => <span className="rounded-[8px] border border-[#F5D5DD] bg-blush px-1.5 font-mono text-[.8rem] font-bold whitespace-nowrap text-rose-ink">{children}</span>;

/** Secondary navigation inside "About & Sources". */
export function AboutNav({ current }: { current: string }) {
  return (
    <nav aria-label="About and sources" className="container-page flex flex-wrap items-center gap-2 pt-6">
      <span className="mr-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">About &amp; Sources</span>
      {ABOUT_NAV.map((i) => (
        <Link key={i.href} href={i.href} aria-current={i.href === current ? 'page' : undefined}
          className="rounded-full border border-border bg-card px-3 py-1.5 text-sm text-foreground no-underline hover:bg-mint aria-[current=page]:border-primary aria-[current=page]:bg-mint aria-[current=page]:text-sage-deep">
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

/** Empty state: says what is missing and what to do next. */
export function EmptyState({ title, children, action, className, art = true }: { title: string; children?: React.ReactNode; action?: React.ReactNode; className?: string; art?: boolean }) {
  return (
    <div className={cn('flex flex-col items-center gap-3 rounded-[20px] border border-dashed border-input bg-card/70 px-6 py-10 text-center', className)}>
      {art ? <span className="w-28 opacity-90" dangerouslySetInnerHTML={{ __html: botanical('w-full h-auto') }} /> : null}
      <h3 className="text-lg">{title}</h3>
      {children ? <div className="max-w-md text-muted-foreground">{children}</div> : null}
      {action}
    </div>
  );
}

/** Stat tile for dashboards and summaries. */
export function Stat({ value, label, tone = 'default' }: { value: React.ReactNode; label: React.ReactNode; tone?: 'default' | 'danger' | 'warn' | 'ok' }) {
  return (
    <div className={cn('flex flex-col gap-1 rounded-[16px] border px-4 py-3', tone === 'danger' ? 'border-[#F3C9D3] bg-destructive-soft' : tone === 'warn' ? 'border-[#F1DFB8] bg-warning-soft' : tone === 'ok' ? 'border-sage bg-success-soft' : 'border-border bg-card')}>
      <b className="font-display text-2xl font-semibold text-heading tabular">{value}</b>
      <small className="text-sm text-muted-foreground">{label}</small>
    </div>
  );
}
