import * as React from 'react';
import { ShieldCheck, ShieldX, TriangleAlert, List, Clock, Check, Layers, X, RefreshCw, ThumbsDown, Activity, MessageSquare, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { WORKFLOW_STEPS } from '@/domain/constants.js';
import { appetiteLabel, periodLabel, requestStatusLabel } from './labels';

type Variant = React.ComponentProps<typeof Badge>['variant'];

/** Screening status of a meal for a patient. */
export function ScreenChip({ status }: { status?: string | null }) {
  if (status === 'eligible') return <Badge variant="ok"><ShieldCheck aria-hidden />Passes screening</Badge>;
  if (status === 'review') return <Badge variant="warn"><TriangleAlert aria-hidden />Needs admin review</Badge>;
  if (status === 'excluded') return <Badge variant="danger"><ShieldX aria-hidden />Excluded</Badge>;
  return null;
}

const ENTRY: Record<string, [Variant, React.ComponentType<{ 'aria-hidden'?: boolean }> | null, string, string]> = {
  offered: ['rose', List, 'Options offered', 'Offered'],
  selected: ['warn', Clock, 'Patient choice submitted', 'Choice in'],
  confirmed: ['ok', Check, 'Confirmed by nutrition team', 'Confirmed'],
  prepared: ['ok', Layers, 'Prepared', 'Prepared'],
  delivered: ['dark', Check, 'Delivered', 'Delivered'],
  'on-hold': ['danger', TriangleAlert, 'On hold: needs review', 'On hold'],
  cancelled: ['outline', X, 'Cancelled', 'Cancelled'],
  none: ['outline', null, 'Not scheduled', 'Not scheduled'],
  npo: ['outline', X, 'Nothing by mouth', 'NPO'],
  discharged: ['outline', X, 'Discharged', 'Discharged'],
};

/** Meal-period workflow status: always text plus icon, never colour alone. */
export function EntryChip({ status, short = false }: { status?: string | null; short?: boolean }) {
  const [variant, Icon, text, brief] = ENTRY[status ?? 'none'] ?? ENTRY.none;
  return <Badge variant={variant}>{Icon ? <Icon aria-hidden /> : null}{short ? brief : text}</Badge>;
}

const STEP_LABELS: Record<string, string> = { offered: 'Options offered', selected: 'Choice submitted', confirmed: 'Confirmed', prepared: 'Prepared', delivered: 'Delivered' };

/** Offered → Choice submitted → Confirmed → Prepared → Delivered, current stage marked (aria-current="step"). */
export function Stepper({ status, compact = false }: { status?: string | null; compact?: boolean }) {
  if (status === 'on-hold' || status === 'cancelled') return <p className="text-sm"><EntryChip status={status} /></p>;
  const idx = (WORKFLOW_STEPS as string[]).indexOf(status ?? '');
  return (
    <ol aria-label="Meal progress" className={cn('flex flex-wrap items-center gap-x-1 gap-y-2 text-sm', compact && 'text-xs')}>
      {(WORKFLOW_STEPS as string[]).map((st, i) => {
        const state = i < idx ? 'done' : i === idx ? 'current' : 'todo';
        return (
          <li key={st} aria-current={state === 'current' ? 'step' : undefined} className="flex items-center gap-1.5">
            <span aria-hidden className={cn('grid size-6 place-items-center rounded-full border text-[.7rem] font-bold', state === 'done' && 'border-primary bg-primary text-white', state === 'current' && 'border-primary bg-mint text-heading ring-2 ring-primary/30', state === 'todo' && 'border-input bg-card text-muted-foreground')}>
              {state === 'done' ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span className={cn(state === 'current' ? 'font-bold text-heading' : state === 'done' ? 'text-foreground' : 'text-muted-foreground', compact && state === 'todo' && 'max-sm:sr-only')}>{STEP_LABELS[st]}</span>
            <span className="sr-only">{state === 'done' ? ' (done)' : state === 'current' ? ' (current stage)' : ' (not yet)'}</span>
            {i < (WORKFLOW_STEPS as string[]).length - 1 ? <span aria-hidden className="mx-1 h-px w-3 bg-input sm:w-5" /> : null}
          </li>
        );
      })}
    </ol>
  );
}

export function RequestStatusChip({ status }: { status: string }) {
  const variant: Variant = status === 'open' ? 'warn' : status === 'resolved' ? 'ok' : 'outline';
  const Icon = status === 'open' ? Clock : status === 'resolved' ? Check : X;
  return <Badge variant={variant}><Icon aria-hidden />{requestStatusLabel(status)}</Badge>;
}

const FLAG: Record<string, [Variant, React.ComponentType<{ 'aria-hidden'?: boolean }>]> = {
  review: ['warn', TriangleAlert], 'no-options': ['danger', ShieldX], hold: ['danger', TriangleAlert], changes: ['warn', RefreshCw],
  refusal: ['rose', ThumbsDown], 'low-intake': ['rose', Activity], requests: ['outline', MessageSquare], npo: ['outline', X],
};
export function FlagChips({ flags = [] }: { flags?: { code: string; label: string; text?: string }[] }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {flags.map((f) => { const [v, Icon] = FLAG[f.code] ?? ['neutral', Info]; return <Badge key={f.code + f.label} variant={v} title={f.text}><Icon aria-hidden />{f.label}</Badge>; })}
    </span>
  );
}

export function AppetiteChip({ level }: { level: string }) {
  return <Badge variant={level === 'poor' ? 'rose' : level === 'fair' ? 'warn' : 'ok'}>{appetiteLabel(level)}</Badge>;
}

export function AllergyChips({ b }: { b: { allergyStatus?: string; allergies: string[]; intolerances: string[] } }) {
  if (b.allergyStatus === 'unknown') return <Badge variant="warn"><TriangleAlert aria-hidden />Allergies not assessed</Badge>;
  if (!b.allergies.length && !b.intolerances.length) return <Badge variant="outline">No known food allergies</Badge>;
  return (
    <span className="flex flex-wrap gap-1.5">
      {b.allergies.map((a) => <Badge key={a} variant="danger"><TriangleAlert aria-hidden />{a}</Badge>)}
      {b.intolerances.map((a) => <Badge key={a} variant="warn">{a}</Badge>)}
    </span>
  );
}

const STRIP: Record<string, [React.ComponentType<{ 'aria-hidden'?: boolean; className?: string }> | null, string, string]> = {
  offered: [List, 'offered', 'bg-rose text-rose-ink'], selected: [Clock, 'choice in', 'bg-warning-soft text-warning'], confirmed: [Check, 'confirmed', 'bg-success-soft text-success'],
  prepared: [Layers, 'prepared', 'bg-success-soft text-success'], delivered: [Check, 'delivered', 'bg-heading text-white'], 'on-hold': [TriangleAlert, 'on hold', 'bg-destructive-soft text-destructive'],
  cancelled: [X, 'cancelled', 'bg-card text-muted-foreground'], npo: [X, 'NPO', 'bg-card text-muted-foreground'], discharged: [X, 'discharged', 'bg-card text-muted-foreground'],
  'none-flag': [ShieldX, 'no option', 'bg-destructive-soft text-destructive'], 'review-only': [TriangleAlert, 'review', 'bg-warning-soft text-warning'], none: [null, '—', 'bg-card text-muted-foreground'],
};
/** Meal periods for one day as a compact strip: letter, icon and text (not colour alone). */
export function PeriodStrip({ periods }: { periods: { period: string; status?: string; entryStatus?: string | null; noSuitable?: boolean; reviewOnly?: boolean }[] }) {
  return (
    <ul aria-label="Meal periods" className="grid grid-cols-1 gap-1">
      {periods.map((p) => {
        const key = p.status === 'npo' ? 'npo' : p.status === 'discharged' ? 'discharged' : p.entryStatus ?? (p.noSuitable ? 'none-flag' : p.reviewOnly ? 'review-only' : 'none');
        const [Icon, text, cls] = STRIP[key] ?? STRIP.none;
        return (
          <li key={p.period} className={cn('inline-flex w-fit items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs font-bold', cls)}>
            <b aria-hidden>{periodLabel(p.period).slice(0, 1)}</b>{Icon ? <Icon aria-hidden className="size-3" /> : null}<span>{text}</span>
            <span className="sr-only">{periodLabel(p.period)}: {text}</span>
          </li>
        );
      })}
    </ul>
  );
}
