'use client';
import * as React from 'react';
import { OctagonAlert, Loader2 } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** "Show password" switch: reveals every password field of the form it sits in. */
export function ShowPassword({ id, checked, onChange }: { id: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-2.5 self-start text-sm">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-5 shrink-0 accent-[var(--color-primary)]" />
      <span>Show password</span>
    </label>
  );
}

/** Form-level error (credential errors, rate limits, network problems). */
export function FormError({ message, className }: { message: string | null; className?: string }) {
  return (
    <div role="alert" aria-live="assertive" className={cn('empty:hidden', className)}>
      {message ? (
        <p className="flex items-start gap-2 rounded-[14px] border border-[#F3C9D3] bg-destructive-soft px-3.5 py-2.5 text-sm font-semibold text-destructive">
          <OctagonAlert aria-hidden className="mt-0.5 size-4 shrink-0" />{message}
        </p>
      ) : null}
    </div>
  );
}

/** Submit button that is disabled and shows a spinner while the request is pending. */
export function SubmitButton({ pending, children, pendingLabel, className, ...props }: ButtonProps & { pending: boolean; pendingLabel?: string }) {
  return (
    <Button type="submit" disabled={pending || props.disabled} aria-disabled={pending || undefined} className={className} {...props}>
      {pending ? <Loader2 aria-hidden className="animate-spin" /> : null}
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}

/** Focus the first invalid control after validation fails. */
export function focusFirstInvalid(form: HTMLFormElement | null) {
  requestAnimationFrame(() => (form?.querySelector('[aria-invalid="true"]') as HTMLElement | null)?.focus());
}

/** better-auth client error shape (plus the extra `errors` map our sign-up hook adds). */
export type AuthError = { message?: string; status?: number; code?: string; errors?: Record<string, string> } | null | undefined;
