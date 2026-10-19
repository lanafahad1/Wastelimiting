'use client';
// Small pieces shared by the staff patient-care screens (Patient Overview,
// New patient profile, Patient Nutrition Profile). Area-local on purpose.
import * as React from 'react';
import { SWRConfig, useSWRConfig, mutate as globalMutate } from 'swr';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { ApiError } from '@/lib/api-client';
import { formatDateTime } from '@/lib/format';
import { scrollToFirstError } from '@/components/forms/errors';
import { cn } from '@/lib/utils';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** A timestamp ("Oct 19, 2:05 PM"). Rendered on the server and the client, so hydration differences are allowed. */
export function When({ iso }: { iso?: string | null }) {
  if (!iso) return null;
  return <time dateTime={iso} suppressHydrationWarning>{formatDateTime(iso)}</time>;
}

const isApiRead = (k: unknown) => typeof k === 'string' && k.startsWith('/api/') && !k.startsWith('/api/reference');

/**
 * A page-scoped SWR cache. useApi() prefers cached data over `fallbackData` and does not
 * revalidate on mount, so without this a revisit could show an older cached copy instead
 * of the fresh server data.
 */
export function FreshCache({ children }: { children: React.ReactNode }) {
  return <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>;
}

/**
 * After a change: revalidate every API read on this page (record, day plan, list), and drop
 * the app-wide cached copies (schedule, kitchen, requests, dashboard…) so other pages start
 * from fresh server data next time.
 */
/** Drop the app-wide cached API reads (e.g. after deleting a record, when there is nothing left to revalidate here). */
export const dropAppCache = () => globalMutate(isApiRead, undefined, { revalidate: false });

export function useRevalidate() {
  const { mutate } = useSWRConfig();
  return React.useCallback(async () => {
    void dropAppCache();
    return mutate(isApiRead);
  }, [mutate]);
}

/** The message to show for a failed request, with the screening reasons when the server sent them. */
export function errorText(err: unknown): string {
  if (err instanceof ApiError) {
    const reasons = (err.details?.reasons as string[] | undefined) ?? [];
    return `${err.message}${reasons.length ? ` ${reasons.join(' ')}` : ''}`;
  }
  return 'Something went wrong. Check your connection and try again.';
}

/** Submit state for a form: busy flag, field errors (for FormErrors) and a form-level message. */
export function useSubmit() {
  const [busy, setBusy] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const run = React.useCallback(async (fn: () => Promise<void>, root?: HTMLElement | null) => {
    setBusy(true); setErrors({}); setFormError(null);
    try {
      await fn();
    } catch (err) {
      const fieldErrors = err instanceof ApiError ? err.errors : {};
      setErrors(fieldErrors);
      setFormError(errorText(err));
      if (Object.keys(fieldErrors).length) scrollToFirstError(root ?? null);
    } finally {
      setBusy(false);
    }
  }, []);
  return { busy, errors, formError, setFormError, setErrors, run };
}

/** Form-level error under a form (announced). */
export function FormMessage({ message, className }: { message?: string | null; className?: string }) {
  if (!message) return null;
  return <p role="alert" className={cn('rounded-[12px] border border-[#F3C9D3] bg-destructive-soft px-3 py-2 text-sm font-semibold text-destructive', className)}>{message}</p>;
}

/** Controlled modal with header, scrollable body and footer. Focus is trapped and returns via `finalFocus`. */
export function Modal({ open, onClose, title, description, wide = false, children, footer, finalFocus }: {
  open: boolean; onClose: () => void; title: React.ReactNode; description?: React.ReactNode; wide?: boolean; children: React.ReactNode; footer?: React.ReactNode;
  finalFocus?: React.ComponentProps<typeof DialogContent>['finalFocus'];
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent wide={wide} finalFocus={finalFocus}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <DialogBody>{children}</DialogBody>
        {footer ? <DialogFooter>{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}

/** Small uppercase label above a value in list rows and cards. */
export const CellLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[.7rem] font-extrabold uppercase tracking-wider text-muted-foreground">{children}</span>
);

export type AnyRecord = any;
