'use client';
// Small building blocks shared by the staff operations pages (dashboard,
// requests, kitchen, menu management, staff access).
import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ApiError } from '@/lib/api-client';
import { plural, timeAgo } from '@/lib/format';

/** A titled panel (section) with an icon, optional action and labelled heading. */
export function Panel({ id, title, icon: Icon, action, children, className, tone = 'default' }: {
  id: string; title: React.ReactNode; icon?: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>; action?: React.ReactNode; children: React.ReactNode; className?: string;
  tone?: 'default' | 'alert' | 'mint';
}) {
  return (
    <section aria-labelledby={id} className={cn('flex min-w-0 flex-col gap-4 rounded-[20px] border p-4 sm:p-5',
      tone === 'alert' ? 'border-[#F3C9D3] bg-destructive-soft/50' : tone === 'mint' ? 'border-sage bg-mint' : 'border-border bg-card shadow-soft', className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 id={id} className="flex items-center gap-2 text-lg sm:text-xl">{Icon ? <Icon className="size-5 shrink-0" aria-hidden /> : null}<span>{title}</span></h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const TONE = {
  default: 'border-border bg-card',
  danger: 'border-[#F3C9D3] bg-destructive-soft',
  warn: 'border-[#F1DFB8] bg-warning-soft',
  ok: 'border-sage bg-success-soft',
};

/** KPI tile: label, big value, detail; optionally a link to the filtered list. */
export function KpiTile({ label, value, of, sub, href, tone = 'default' }: { label: React.ReactNode; value: React.ReactNode; of?: React.ReactNode; sub?: React.ReactNode; href?: string; tone?: keyof typeof TONE }) {
  const body = (
    <>
      <small className="text-sm text-muted-foreground">{label}</small>
      <b className="font-display text-[1.6rem] font-semibold leading-tight text-heading tabular">{value}{of ? <span className="text-base font-medium text-muted-foreground"> {of}</span> : null}</b>
      {sub ? <span className="text-sm text-muted-foreground">{sub}</span> : null}
    </>
  );
  const cls = cn('flex min-w-0 flex-col gap-1 rounded-[16px] border px-4 py-3', TONE[tone]);
  return href ? <Link href={href} className={cn(cls, 'text-foreground no-underline transition-colors hover:border-heading')}>{body}</Link> : <div className={cls}>{body}</div>;
}

export const KpiRow = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr))]', className)}>{children}</div>
);


const noop = () => () => {};
/** False during server rendering and hydration, true afterwards (for local times and "x min ago"). */
export const useMounted = () => React.useSyncExternalStore(noop, () => true, () => false);

/**
 * A date-time in the viewer's own time zone. The server does not know it, so
 * the first render shows UTC and the browser switches to local time.
 */
export function When({ iso, format = 'datetime', withYear = false }: { iso?: string | null; format?: 'datetime' | 'time' | 'ago'; withYear?: boolean }) {
  const mounted = useMounted();
  if (!iso) return null;
  const tz = mounted ? undefined : 'UTC';
  const text = format === 'time'
    ? new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: tz })
    : new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', ...(withYear ? { year: 'numeric' } : {}), hour: '2-digit', minute: '2-digit', timeZone: tz });
  return <time dateTime={iso}>{text}{format === 'ago' && mounted ? ` (${timeAgo(iso)})` : ''}</time>;
}

/** " 3 upcoming orders re-screened, 1 put on hold." after a menu change. */
export const recheckText = (r: { hold?: boolean }[] = []) => (r.length ? ` ${plural(r.length, 'upcoming order')} re-screened, ${r.filter((x) => x.hold).length} put on hold.` : '');

/** Field errors and a form-level message from an ApiError. */
export function useFormErrors() {
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const reset = React.useCallback(() => { setErrors({}); setFormError(null); }, []);
  const fail = React.useCallback((err: unknown) => {
    if (err instanceof ApiError) {
      setErrors(err.errors ?? {});
      setFormError(Object.keys(err.errors ?? {}).length ? err.message : err.message);
    } else setFormError('Something went wrong. Please try again.');
  }, []);
  return { errors, formError, reset, fail };
}

/** Form-level error under a dialog form. */
export function FormMessage({ message }: { message: string | null }) {
  return <p role={message ? 'alert' : undefined} className="text-sm font-semibold text-destructive empty:hidden">{message ?? ''}</p>;
}

/** Inline field error for list rows (components.0, ingredients.2 …). */
export function RowError({ message, id }: { message?: string; id?: string }) {
  if (!message) return null;
  return <p id={id} role="alert" data-field-error className="basis-full text-sm font-semibold text-destructive">{message}</p>;
}
