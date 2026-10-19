'use client';
import * as React from 'react';

/** Server validation errors keyed by field path ({ 'dietOrder.categories': '…' }). */
const ErrorsContext = React.createContext<Record<string, string>>({});

export function FormErrors({ errors, children }: { errors: Record<string, string>; children: React.ReactNode }) {
  return <ErrorsContext.Provider value={errors}>{children}</ErrorsContext.Provider>;
}

export function FieldError({ name, className = '' }: { name: string; className?: string }) {
  const msg = React.useContext(ErrorsContext)[name];
  if (!msg) return null;
  return <p role="alert" data-field-error className={`text-sm font-semibold text-destructive ${className}`}>{msg}</p>;
}

/** Scroll the first visible error into view after a failed save. */
export function scrollToFirstError(root: HTMLElement | null) {
  requestAnimationFrame(() => root?.querySelector('[data-field-error]')?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
}
