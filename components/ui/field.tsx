'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';
import { Label } from './input';

/**
 * A labelled form field with hint and error message. Errors use the
 * transitions.dev "error state shake" (t-input-wrap / t-input / t-error-msg):
 * the control shakes once each time a new error arrives.
 */
export function Field({
  id, label, hint, error, children, className, optional,
}: { id: string; label: React.ReactNode; hint?: React.ReactNode; error?: string | null; children: React.ReactElement<Record<string, unknown>>; className?: string; optional?: boolean }) {
  const inputRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = inputRef.current;
    if (!el || !error) return;
    el.classList.remove('is-shaking');
    void el.offsetWidth; // restart the animation
    el.classList.add('is-shaking');
  }, [error]);
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;
  const control = React.cloneElement(children, {
    id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined,
  });
  return (
    <div className={cn('t-input-wrap flex flex-col gap-1.5', error && 'is-error', className)}>
      <Label htmlFor={id}>{label}{optional ? <span className="font-sans text-xs font-normal text-muted-foreground"> (optional)</span> : null}</Label>
      <div ref={inputRef} className={cn('t-input rounded-[12px]', error && 'is-error')}>{control}</div>
      {hint ? <span id={`${id}-hint`} className="text-sm text-muted-foreground">{hint}</span> : null}
      <p id={`${id}-error`} role={error ? 'alert' : undefined} className="t-error-msg text-sm font-semibold text-destructive empty:hidden">{error ?? ''}</p>
    </div>
  );
}

/** A group of choices rendered as tappable option cards (radio or checkbox). */
export function OptionCard({ type = 'radio', name, value, checked, defaultChecked, onChange, title, description, disabled }: {
  type?: 'radio' | 'checkbox'; name: string; value: string; checked?: boolean; defaultChecked?: boolean; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  title: React.ReactNode; description?: React.ReactNode; disabled?: boolean;
}) {
  return (
    <label className={cn('group relative flex cursor-pointer items-start gap-3 rounded-[14px] border border-border bg-card px-3.5 py-3 transition-colors has-[:checked]:border-primary has-[:checked]:bg-mint has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-primary/25', disabled && 'cursor-not-allowed opacity-55')}>
      <input type={type} name={name} value={value} checked={checked} defaultChecked={defaultChecked} onChange={onChange} disabled={disabled} className="peer sr-only" />
      <span aria-hidden className={cn('mt-0.5 grid size-5 shrink-0 place-items-center border-2 border-input bg-card text-white transition-colors peer-checked:border-primary peer-checked:bg-primary', type === 'radio' ? 'rounded-full' : 'rounded-[6px]')}>
        <svg viewBox="0 0 16 16" className="size-3 opacity-0 transition-opacity group-has-[:checked]:opacity-100"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
      <span className="flex min-w-0 flex-col">
        <b className="font-display text-[.95rem] font-medium text-heading">{title}</b>
        {description ? <small className="text-sm text-muted-foreground">{description}</small> : null}
      </span>
    </label>
  );
}
