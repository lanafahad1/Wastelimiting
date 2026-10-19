// Building blocks for the public, server-rendered pages (home, how it works,
// about, diets, sources). No client JavaScript here.
import * as React from 'react';
import { FileText, Heart, Shield, Sparkles, CircleCheck, Activity, RefreshCw, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Full-width band with a palette background. */
export function Band({ tone = 'plain', className, children, ...props }: React.ComponentProps<'section'> & { tone?: 'plain' | 'white' | 'blush' | 'mint' }) {
  const bg = { plain: 'bg-background', white: 'bg-card', blush: 'bg-blush', mint: 'bg-mint' }[tone];
  return <section className={cn('py-12 sm:py-16 lg:py-20', bg, className)} {...props}>{children}</section>;
}

/** Eyebrow + h2 + optional intro. */
export function SectionHead({ eyebrow, title, id, children, center = false, className }: { eyebrow?: React.ReactNode; title: React.ReactNode; id?: string; children?: React.ReactNode; center?: boolean; className?: string }) {
  return (
    <div className={cn('mb-8 flex max-w-3xl flex-col gap-3', center && 'mx-auto items-center text-center', className)}>
      {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
      <h2 id={id} className="text-[1.6rem] leading-tight sm:text-[2rem]">{title}</h2>
      {children ? <div className="text-muted-foreground">{children}</div> : null}
    </div>
  );
}

/** Icon + bold lead + text, as a list item. */
export function CheckItem({ icon: Icon = CircleCheck, title, children }: { icon?: LucideIcon; title?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-mint text-heading"><Icon className="size-4" aria-hidden /></span>
      <span className="min-w-0">{title ? <b className="text-heading">{title}</b> : null}{title && children ? ' ' : null}{children}</span>
    </li>
  );
}
export function CheckList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <ul className={cn('flex flex-col gap-4', className)}>{children}</ul>;
}

/** Benefit / role card with a round icon. */
export function Benefit({ icon: Icon, title, children, as: As = 'h3' }: { icon: LucideIcon; title: React.ReactNode; children: React.ReactNode; as?: 'h2' | 'h3' }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-card p-5 sm:p-6">
      <span className="grid size-11 place-items-center rounded-full bg-rose text-rose-ink"><Icon className="size-5" aria-hidden /></span>
      <As className="text-lg">{title}</As>
      <div className="text-muted-foreground">{children}</div>
    </div>
  );
}

/** Numbered vertical pipeline; safety steps are drawn in sage. */
export function Pipeline({ steps, className, label }: { steps: { title: string; text: React.ReactNode; safety?: boolean }[]; className?: string; label?: string }) {
  return (
    <ol aria-label={label} className={cn('flex flex-col rounded-xl border border-border bg-card p-5 sm:p-6', className)}>
      {steps.map((s, i) => (
        <li key={s.title} className="relative grid grid-cols-[44px_minmax(0,1fr)] gap-4 pb-6 last:pb-0">
          {i < steps.length - 1 ? <span aria-hidden className="absolute bottom-0 left-[21px] top-11 w-0.5 bg-pink" /> : null}
          <span aria-hidden className={cn('grid size-11 place-items-center rounded-full border-2 font-display font-semibold', s.safety ? 'border-heading bg-mint text-heading' : 'border-pink bg-card text-rose-ink')}>{i + 1}</span>
          <div className="min-w-0 pt-1.5">
            <h3 className="mb-1 text-[1.05rem]">{s.title}{s.safety ? <span className="sr-only"> (safety step)</span> : null}</h3>
            <p className="text-[.95rem] text-muted-foreground">{s.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Gradient call-to-action band. */
export function CtaBand({ title, children, action }: { title: React.ReactNode; children?: React.ReactNode; action: React.ReactNode }) {
  return (
    <div className="grid items-center gap-6 rounded-[28px] bg-gradient-to-br from-sage to-rose p-6 sm:p-10 md:grid-cols-[minmax(0,1fr)_auto]">
      <div className="flex flex-col gap-3">
        <h2 className="text-[1.5rem] text-sage-deep sm:text-[1.9rem]">{title}</h2>
        {children ? <div className="max-w-[56ch] text-foreground">{children}</div> : null}
      </div>
      <div className="flex flex-wrap gap-3 max-sm:[&>*]:w-full">{action}</div>
    </div>
  );
}

/** The seven-step core user journey (shared by Home and How It Works). */
export const JOURNEY: [LucideIcon, string, string][] = [
  [FileText, 'Record Patient Dietary Requirements', 'The care team records conditions, the prescribed diet, restrictions, and allergies and intolerances separately.'],
  [Heart, 'Add Preferences and Appetite', 'Preferred foods and cuisines, disliked ingredients, current appetite and preferred portion, from the team or the patient.'],
  [Shield, 'Screen Available Hospital Meals', 'Every meal on the day’s menu is checked against the diet order and allergies. Conflicts are excluded; incomplete information goes to review.'],
  [Sparkles, 'Review Personalized Suggestions', 'Eligible meals are ranked by preferences, appetite and past feedback, with a suggested portion and “Why This Meal?”.'],
  [CircleCheck, 'Confirm Meal Selection', 'The patient chooses from approved options; the nutrition team confirms, and the kitchen receives a preparation summary.'],
  [Activity, 'Record Intake and Feedback', 'Appetite before the meal, accepted or refused, how much was eaten, reasons and satisfaction.'],
  [RefreshCw, 'Support Future Meal Decisions', 'Feedback improves ranking, and repeated refusal or low intake is flagged for professional review.'],
];

export function Journey({ label = 'Core user journey' }: { label?: string }) {
  return (
    <ol aria-label={label} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {JOURNEY.map(([Icon, title, text], i) => (
        <li key={title} className="relative flex flex-col gap-2.5 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="grid size-11 place-items-center rounded-full bg-mint text-heading"><Icon className="size-5" aria-hidden /></span>
            <span aria-hidden className="font-display text-3xl font-semibold text-pink-deep tabular">{i + 1}</span>
          </div>
          <h3 className="text-[1.05rem]"><span className="sr-only">Step {i + 1}: </span>{title}</h3>
          <p className="text-[.95rem] text-muted-foreground">{text}</p>
        </li>
      ))}
    </ol>
  );
}

/** Small bordered panel (white). */
export function Panel({ className, children, tone = 'white', ...props }: React.ComponentProps<'div'> & { tone?: 'white' | 'mint' | 'blush' }) {
  const t = { white: 'border-border bg-card', mint: 'border-sage bg-mint', blush: 'border-rose bg-blush' }[tone];
  return <div className={cn('flex flex-col gap-3 rounded-xl border p-5 sm:p-6', t, className)} {...props}>{children}</div>;
}

/** External link that opens in a new tab and says so to screen readers. */
export function ExtLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className={cn('break-words', className)}>{children}<span className="sr-only"> (opens in a new tab)</span></a>;
}
