'use client';
import * as React from 'react';
import { X, CircleCheck, TriangleAlert, OctagonAlert, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Toasts with the transitions.dev "Toast open / close" transition. Call
 * toast('Saved.') from any client component; <Toaster /> renders them in a
 * polite live region at the bottom of the screen (above the safe area).
 */
type Tone = 'ok' | 'warn' | 'error' | 'info';
type Item = { id: number; message: string; tone: Tone; open: boolean };
type Listener = (items: Item[]) => void;

let items: Item[] = [];
let seq = 0;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l([...items]));
const CLOSE_MS = 350;

function dismiss(id: number) {
  items = items.map((t) => (t.id === id ? { ...t, open: false } : t));
  emit();
  setTimeout(() => { items = items.filter((t) => t.id !== id); emit(); }, CLOSE_MS);
}

export function toast(message: string, { tone = 'ok', timeout = 5000 }: { tone?: Tone; timeout?: number } = {}) {
  const id = ++seq;
  items = [...items.slice(-2), { id, message, tone, open: false }];
  emit();
  requestAnimationFrame(() => requestAnimationFrame(() => { items = items.map((t) => (t.id === id ? { ...t, open: true } : t)); emit(); }));
  if (timeout > 0) setTimeout(() => dismiss(id), timeout);
  return id;
}

const ICONS = { ok: CircleCheck, warn: TriangleAlert, error: OctagonAlert, info: Info };
const TONES = { ok: 'border-l-success', warn: 'border-l-warning', error: 'border-l-destructive', info: 'border-l-primary' };

export function Toaster() {
  const [list, setList] = React.useState<Item[]>([]);
  React.useEffect(() => { listeners.add(setList); return () => { listeners.delete(setList); }; }, []);
  return (
    <div aria-live="polite" aria-relevant="additions text" className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-end sm:pr-6">
      {list.map((t) => {
        const Icon = ICONS[t.tone];
        return (
          <div key={t.id} role={t.tone === 'error' ? 'alert' : 'status'} className={cn('t-toast pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-[16px] border border-border border-l-4 bg-card px-4 py-3 shadow-lift', TONES[t.tone], t.open && 'is-open')}>
            <Icon aria-hidden className={cn('mt-0.5 size-5 shrink-0', t.tone === 'error' ? 'text-destructive' : t.tone === 'warn' ? 'text-warning' : 'text-success')} />
            <p className="min-w-0 flex-1 text-[.95rem]">{t.message}</p>
            <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss notification" className="-m-1 grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-mint"><X className="size-4" /></button>
          </div>
        );
      })}
    </div>
  );
}
