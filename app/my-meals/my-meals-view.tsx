'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, ChevronRightCircle, MessageSquare, List, RefreshCw, Info, Check, HeartPulse, Users, CalendarDays, CalendarRange, CalendarCheck } from 'lucide-react';
import { useApi, apiPath, apiSend, apiFetch, ApiError } from '@/lib/api-client';
import { PageHead, PageBody } from '@/components/site/page-head';
import { EntryChip, Stepper, RequestStatusChip } from '@/components/cb/status';
import { MealArt, MealType, NutriSummary } from '@/components/cb/meal';
import { periodLabel, portionLabel, amountLabel, reasonLabel } from '@/components/cb/labels';
import { Accordion } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';
import { addDays } from '@/domain/dates.js';
import { MealOption } from '@/components/patient/meal-option';
import { RequestDialog, type RequestTarget } from '@/components/patient/request-dialog';
import { FeedbackDialog, type FeedbackTarget } from '@/components/patient/feedback-dialog';
import { dayName } from '@/components/patient/helpers';

/* eslint-disable @typescript-eslint/no-explicit-any */
type MyMeals = any;
type Period = any;
type View = 'day' | 'week';

const iconBtn = 'grid size-11 shrink-0 place-items-center rounded-full border border-border bg-card text-heading hover:bg-mint disabled:pointer-events-none disabled:opacity-40';

export function MyMealsView({ pid, name, demoId, initial, initialWeek, initialView, initialPeriod, reference }: {
  pid: string; name: string; demoId: string; initial: MyMeals; initialWeek: string | null; initialView: View; initialPeriod: string | null; reference: any;
}) {
  const router = useRouter();
  const [date, setDate] = React.useState<string>(initial.date);
  const [week, setWeek] = React.useState<string | null>(initialWeek);
  const [view, setView] = React.useState<View>(initialView);
  const firstOpen = initialPeriod ?? (initial.next?.date === initial.date ? initial.next.period : null);
  const [open, setOpen] = React.useState<string[]>(firstOpen ? [firstOpen] : []);
  const [scrollTo, setScrollTo] = React.useState<string | null>(initialPeriod);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [request, setRequest] = React.useState<RequestTarget | null>(null);
  const [feedback, setFeedback] = React.useState<FeedbackTarget | null>(null);

  const base = `/api/patients/${pid}/my-meals`;
  const key = apiPath(base, { date, week });
  const initialKey = apiPath(base, { date: initial.date, week: initialWeek });
  const { data, error, isLoading, mutate } = useApi<MyMeals>(key, key === initialKey ? initial : undefined);
  const d: MyMeals = data ?? initial;
  const stale = d.date !== date || isLoading;

  const syncUrl = (s: { date: string; view: View; week: string | null; period?: string | null }) => {
    window.history.replaceState(null, '', apiPath('/my-meals', { date: s.date === d.today ? '' : s.date, view: s.view === 'week' ? 'week' : '', week: s.week ?? '', period: s.period ?? '' }));
  };

  // Scroll a period into view once its day has loaded (deep link ?period=, "Open", or after choosing).
  React.useEffect(() => {
    if (!scrollTo || view !== 'day' || d.date !== date) return;
    const el = document.getElementById(`mp-${scrollTo}`);
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    requestAnimationFrame(() => el.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' }));
    setScrollTo(null);
  }, [scrollTo, view, d.date, date]);

  const go = ({ toDate = date, period = null, toView = 'day' as View }: { toDate?: string; period?: string | null; toView?: View }) => {
    setDate(toDate); setView(toView);
    if (period) { setOpen((cur) => (cur.includes(period) ? cur : [...cur, period])); setScrollTo(period); }
    syncUrl({ date: toDate, view: toView, week, period });
  };
  const toggle = (period: string, isOpen: boolean) => {
    setOpen((cur) => (isOpen ? [...cur.filter((p) => p !== period), period] : cur.filter((p) => p !== period)));
    syncUrl({ date, view, week, period: isOpen ? period : null });
  };
  const switchView = (v: View) => { setView(v); setWeek(null); syncUrl({ date, view: v, week: null }); };
  const goWeek = (w: string) => { setWeek(w); syncUrl({ date, view, week: w }); };

  async function choose(period: string, mealId: string, portion: string) {
    setBusy(`${period}|${mealId}`);
    try {
      const r = await apiSend<{ note: string }>('POST', `/api/patients/${pid}/select`, { date, period, mealId, portion });
      toast(r.note, { timeout: 7000 });
      await mutate();
      setOpen((cur) => (cur.includes(period) ? cur : [...cur, period]));
      setScrollTo(period);
    } catch (err) {
      toast((err as ApiError).message, { tone: 'error', timeout: 8000 });
    } finally { setBusy(null); }
  }

  async function openFeedback(fDate: string, period: string) {
    let per: Period | undefined = fDate === d.date ? d.periods.find((p: Period) => p.period === period) : undefined;
    if (!per) {
      try { per = (await apiFetch<MyMeals>(apiPath(base, { date: fDate }))).periods.find((p: Period) => p.period === period); }
      catch (err) { toast((err as ApiError).message, { tone: 'error' }); return; }
    }
    if (!per) return;
    setFeedback({ date: fDate, period, mealName: per.entry?.mealName, portion: per.entry?.portion, myFeedback: per.myFeedback });
  }

  const ask = (type: string, rDate: string | null = null, period: string | null = null) => {
    const t = reference.vocab.requestTypes.find((x: { id: string; clinical?: boolean }) => x.id === type);
    if (t?.clinical) { router.push('/my-profile?report=1'); return; }
    setRequest({ type, date: rDate, period });
  };

  const min = addDays(d.today, -13);
  const max = d.choiceWindow.to;

  return (
    <>
      <PageHead eyebrow={`${demoId} · My meals`} title={`Hello, ${name}.`} narrow>
        <p>Every option here has been checked against your prescribed diet and allergies and approved by your nutrition team.</p>
      </PageHead>
      <PageBody narrow className="gap-4">
        {error ? <Notice tone="danger" title="We couldn’t load your meals.">{error.message} Check your connection and try again.</Notice> : null}
        <NextCard d={d} onOpen={(nd, np) => go({ toDate: nd, period: np })} onFeedback={openFeedback} onAsk={ask} />
        <TodoList d={d} onOpen={(nd, np) => go({ toDate: nd, period: np })} onFeedback={openFeedback} />

        {/* Compact day / week selector */}
        <div role="group" aria-label="Choose which day to see" className="flex flex-col gap-3 rounded-[20px] border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
          <div role="group" aria-label="View" className="grid grid-cols-2 rounded-full border border-border bg-blush p-1 sm:w-56">
            {(['day', 'week'] as View[]).map((v) => (
              <button key={v} type="button" aria-pressed={view === v} onClick={() => switchView(v)}
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full px-4 font-display text-sm font-medium text-heading aria-pressed:bg-heading aria-pressed:text-white">
                {v === 'day' ? <CalendarDays className="size-4" aria-hidden /> : <CalendarRange className="size-4" aria-hidden />}{v === 'day' ? 'Day' : 'Week'}
              </button>
            ))}
          </div>
          {view === 'day' ? (
            <div className="flex items-center gap-2">
              <button type="button" className={iconBtn} aria-label="Previous day" disabled={addDays(date, -1) < min} onClick={() => go({ toDate: addDays(date, -1) })}><ChevronLeft className="size-5" aria-hidden /></button>
              <label className="relative flex min-h-11 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-[14px] border border-border bg-background px-3 text-center focus-within:ring-3 focus-within:ring-primary/30 sm:flex-none sm:px-4">
                <span className="truncate"><b className="font-display text-heading">{dayName(date, d.today)}</b> {formatDate(date, { month: 'short', day: 'numeric' })}</span>
                <input type="date" aria-label="Pick a date" value={date} min={min} max={max} className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  onClick={(e) => { try { e.currentTarget.showPicker?.(); } catch { /* not supported */ } }}
                  onChange={(e) => { const v = e.target.value; if (/^\d{4}-\d{2}-\d{2}$/.test(v) && v >= min && v <= max) go({ toDate: v }); }} />
              </label>
              <button type="button" className={iconBtn} aria-label="Next day" disabled={addDays(date, 1) > max} onClick={() => go({ toDate: addDays(date, 1) })}><ChevronRight className="size-5" aria-hidden /></button>
              {date !== d.today ? <Button variant="ghost" size="sm" className="min-h-11" onClick={() => go({ toDate: d.today })}>Today</Button> : null}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button type="button" className={iconBtn} aria-label="Previous week" disabled={addDays(d.weekFrom, -1) < min} onClick={() => goWeek(addDays(d.weekFrom, -7))}><ChevronLeft className="size-5" aria-hidden /></button>
              <span className="flex min-h-11 flex-1 items-center justify-center rounded-[14px] border border-border bg-background px-4 font-display font-semibold text-heading sm:flex-none" aria-live="polite">
                {formatDate(d.weekFrom, { month: 'short', day: 'numeric' })} – {formatDate(addDays(d.weekFrom, 6), { month: 'short', day: 'numeric' })}
              </span>
              <button type="button" className={iconBtn} aria-label="Next week" disabled={addDays(d.weekFrom, 7) > max} onClick={() => goWeek(addDays(d.weekFrom, 7))}><ChevronRight className="size-5" aria-hidden /></button>
            </div>
          )}
        </div>

        {view === 'week' ? (
          <WeekView d={d} busy={stale} onDay={(nd) => go({ toDate: nd })} onOpen={(nd, np) => go({ toDate: nd, period: np })} />
        ) : (
          <section aria-label={`${dayName(date, d.today)}, ${formatDate(date, { month: 'long', day: 'numeric' })}`} aria-busy={stale} className={cn('flex flex-col gap-3 transition-opacity', stale && 'opacity-60')}>
            {d.npo ? <Notice tone="info">Your care team has asked that you have nothing to eat or drink for now. No meals will be brought.</Notice> : null}
            {d.periods.map((per: Period) => (
              <PeriodCard key={`${d.date}-${per.period}`} d={d} per={per} open={open.includes(per.period)} onToggle={(o) => toggle(per.period, o)}
                busy={busy} onChoose={(mealId, portion) => choose(per.period, mealId, portion)} onFeedback={() => openFeedback(d.date, per.period)} onAsk={() => ask('alternative', d.date, per.period)} />
            ))}
          </section>
        )}

        {!d.discharged ? (
          <section aria-labelledby="help-h" className="flex flex-col gap-3 rounded-xl border border-rose bg-blush p-5">
            <h2 id="help-h" className="text-lg">Need help?</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {reference.vocab.requestTypes.map((t: { id: string; label: string; clinical?: boolean }) => {
                const Icon = t.clinical ? HeartPulse : t.id === 'assistance' ? Users : t.id === 'schedule-change' ? CalendarCheck : MessageSquare;
                return <Button key={t.id} variant="outline" className="min-h-12 justify-start whitespace-normal text-left max-sm:text-left" onClick={() => ask(t.id)}><Icon aria-hidden />{t.label}</Button>;
              })}
            </div>
            <p className="text-sm text-muted-foreground">Changes to your prescribed diet or allergies are always reviewed by your nutrition team before anything changes. If you feel unwell or think you are having an allergic reaction, tell your nurse straight away.</p>
          </section>
        ) : null}
      </PageBody>

      <RequestDialog pid={pid} target={request} onClose={() => setRequest(null)} vocab={reference.vocab} today={d.today} maxDate={d.choiceWindow.to}
        defaultDate={date >= d.today ? date : d.today} onSent={() => { void mutate(); }} />
      <FeedbackDialog pid={pid} target={feedback} onClose={() => setFeedback(null)} reference={reference} onSaved={() => mutate()} />
    </>
  );
}

// ---------------------------------------------------------------- next meal and to-do

function NextCard({ d, onOpen, onFeedback, onAsk }: { d: MyMeals; onOpen: (date: string, period: string) => void; onFeedback: (date: string, period: string) => void; onAsk: (type: string, date: string, period: string) => void }) {
  if (d.discharged) {
    return (
      <section aria-labelledby="nx-h" className="flex flex-col gap-2 rounded-xl border-2 border-sage bg-gradient-to-b from-mint to-card p-5 sm:p-6">
        <h2 id="nx-h" className="text-2xl">You have been discharged</h2>
        <p>You were discharged{d.dischargedOn ? ` on ${formatDate(d.dischargedOn, { weekday: 'long', month: 'long', day: 'numeric' })}` : ''}. No more hospital meals are planned. Your past meals and requests are shown below for reference.</p>
      </section>
    );
  }
  const n = d.next;
  if (!n) return null;
  const s = n.status;
  let action: React.ReactNode = null;
  if (s === 'offered' && n.options) action = <Button size="lg" className="w-full sm:w-auto" onClick={() => onOpen(n.date, n.period)}><ChevronRightCircle aria-hidden />Choose your {periodLabel(n.period).toLowerCase()}</Button>;
  else if (s === 'selected') action = <Button variant="outline" className="w-full sm:w-auto" onClick={() => onOpen(n.date, n.period)}>Change my choice</Button>;
  else if (s === 'delivered') action = <Button className="w-full sm:w-auto" onClick={() => onFeedback(n.date, n.period)}><MessageSquare aria-hidden />Tell us how it was</Button>;
  else if (!s || s === 'on-hold') action = <Button variant="outline" className="w-full sm:w-auto" onClick={() => onAsk('assistance', n.date, n.period)}><MessageSquare aria-hidden />Ask the nutrition team</Button>;
  else if (s === 'confirmed' || s === 'prepared') action = <Button variant="ghost" className="w-full sm:w-auto" onClick={() => onAsk('alternative', n.date, n.period)}><MessageSquare aria-hidden />Ask for a different meal</Button>;
  return (
    <section aria-labelledby="nx-h" className="flex flex-col gap-3 rounded-xl border-2 border-sage bg-gradient-to-b from-mint to-card p-5 sm:p-6">
      <span className="eyebrow">Your next meal · {dayName(n.date, d.today)} · {periodLabel(n.period)}, around {n.serviceTime}</span>
      <h2 id="nx-h" className="text-[1.6rem] leading-tight sm:text-3xl" aria-live="polite">{n.message}</h2>
      {n.mealName ? <p className="text-lg"><b className="text-heading">{n.mealName}</b>{n.portion ? ` · ${portionLabel(n.portion)} portion` : ''}</p> : null}
      {s && s !== 'npo' ? <Stepper status={s} compact /> : null}
      {action ? <div className="flex flex-wrap gap-2 pt-1">{action}</div> : null}
    </section>
  );
}

function TodoList({ d, onOpen, onFeedback }: { d: MyMeals; onOpen: (date: string, period: string) => void; onFeedback: (date: string, period: string) => void }) {
  const items = d.todo.filter((t: any) => !(d.next && t.date === d.next.date && t.period === d.next.period && t.kind === 'choose'));
  if (!items.length && !d.pendingRequests) return null;
  const li = 'flex items-center justify-between gap-3 rounded-[14px] border border-border bg-card px-3 py-2.5';
  return (
    <section aria-labelledby="todo-h" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-soft">
      <h2 id="todo-h" className="flex items-center gap-2 text-lg"><List className="size-5" aria-hidden />Waiting for you</h2>
      <ul className="flex flex-col gap-2">
        {items.map((t: any) => (
          <li key={`${t.kind}-${t.date}-${t.period}`} className={li}>
            <span className="min-w-0 flex-1">{t.text} <span className="text-sm text-muted-foreground">· {dayName(t.date, d.today)}</span></span>
            {t.kind === 'choose'
              ? <Button size="sm" variant="outline" className="min-h-10" onClick={() => onOpen(t.date, t.period)} aria-label={`${t.text}, ${dayName(t.date, d.today)}`}>Choose</Button>
              : <Button size="sm" variant="soft" className="min-h-10" onClick={() => onFeedback(t.date, t.period)} aria-label={`${t.text}, ${dayName(t.date, d.today)}`}>Tell us</Button>}
          </li>
        ))}
        {d.pendingRequests ? (
          <li className={li}>
            <span className="min-w-0 flex-1">{d.pendingRequests} request{d.pendingRequests > 1 ? 's' : ''} waiting for the nutrition team</span>
            <Link href="/my-requests" className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'min-h-10' })}>See status</Link>
          </li>
        ) : null}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------- week overview

function WeekView({ d, busy, onDay, onOpen }: { d: MyMeals; busy: boolean; onDay: (date: string) => void; onOpen: (date: string, period: string) => void }) {
  return (
    <section aria-label="Week overview" aria-busy={busy} className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-2', busy && 'opacity-60')}>
      {d.week.map((day: any) => (
        <article key={day.date} className={cn('flex flex-col gap-2 rounded-[20px] border bg-card p-4', day.isToday ? 'border-2 border-heading' : 'border-border')}>
          <h3 className="text-base">
            <button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-[10px] text-left underline-offset-4 hover:underline" onClick={() => onDay(day.date)}>
              {day.isToday ? 'Today' : day.weekday} <span className="font-sans text-sm font-normal text-muted-foreground">{formatDate(day.date, { month: 'short', day: 'numeric' })}</span>
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </h3>
          <ul className="flex flex-col divide-y divide-border">
            {day.periods.map((p: any) => {
              const canOpen = (p.status === 'offered' && day.date >= d.today) || p.status === 'delivered';
              return (
                <li key={p.period} className="flex items-center gap-2 py-2">
                  <span className="w-[4.75rem] shrink-0 text-xs font-bold uppercase tracking-wide text-muted-foreground">{periodLabel(p.period)}</span>
                  <span className="flex min-w-0 flex-1 flex-col items-start gap-1 text-sm">
                    <span>{p.mealName ? <b>{p.mealName}</b> : p.status === 'offered' ? `${p.options} option${p.options > 1 ? 's' : ''} to choose from` : p.status === 'npo' ? 'Nothing by mouth' : p.status === 'cancelled' ? null : <span className="text-muted-foreground">Not planned yet</span>}</span>
                    {p.status ? <EntryChip status={p.status} short /> : null}
                  </span>
                  {canOpen ? <Button size="sm" variant="outline" className="min-h-10 shrink-0" onClick={() => onOpen(day.date, p.period)} aria-label={`Open ${periodLabel(p.period)} on ${day.weekday}`}>Open</Button> : null}
                </li>
              );
            })}
          </ul>
        </article>
      ))}
    </section>
  );
}

// ---------------------------------------------------------------- one meal period

function SelectedMeal({ per, date }: { per: Period; date: string }) {
  const m = per.selectedMeal;
  if (!m) return null;
  const href = `/meal/${m.id}?date=${date}&period=${per.period}`;
  return (
    <div className="grid grid-cols-1 gap-3 rounded-[16px] border border-border bg-background p-3 sm:grid-cols-[96px_minmax(0,1fr)]">
      <MealArt meal={m} className="aspect-[4/3] w-full sm:aspect-square sm:w-24" />
      <div className="flex min-w-0 flex-col gap-1.5">
        <b className="font-display text-heading"><Link href={href}>{m.name}</Link></b>
        <span className="text-sm"><MealType m={m} /> · {portionLabel(per.entry.portion)} portion</span>
        <NutriSummary n={m.nutrition} caption="Nutrition per standard serving" partial={m.nutritionPartial} missingFrom={m.nutritionMissingFrom} />
        <Link href={href} className="inline-flex min-h-10 items-center gap-1 text-sm">Ingredients, allergens and why it suits you <ChevronRight className="size-4" aria-hidden /></Link>
      </div>
    </div>
  );
}

function PeriodCard({ d, per, open, onToggle, busy, onChoose, onFeedback, onAsk }: {
  d: MyMeals; per: Period; open: boolean; onToggle: (open: boolean) => void; busy: string | null; onChoose: (mealId: string, portion: string) => void; onFeedback: () => void; onAsk: () => void;
}) {
  const e = per.entry;
  const s: string | null = d.npo ? 'npo' : e?.status ?? null;
  const fb = per.myFeedback;
  const lower = periodLabel(per.period).toLowerCase();
  const summary = e?.mealName ?? (s === 'offered' ? `${per.options.length} option${per.options.length === 1 ? '' : 's'}` : '');
  return (
    <section id={`mp-${per.period}`} aria-label={per.label} className="scroll-mt-24 overflow-hidden rounded-xl border border-border bg-card shadow-soft">
      <Accordion open={open} onOpenChange={onToggle} headClassName="min-h-16 px-4 py-3 sm:px-5"
        title={(
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="flex flex-col">
              <span className="font-display text-lg font-semibold text-heading">{per.label}</span>
              <span className="text-sm text-muted-foreground">around {per.serviceTime}</span>
            </span>
            <span className="min-w-0 flex-1 text-sm font-semibold text-foreground">{summary}</span>
            {s ? <EntryChip status={s} short /> : <Badge variant="outline">Not planned yet</Badge>}
          </span>
        )}>
        <div className="flex flex-col gap-3 px-4 pb-5 sm:px-5">
          <p className="font-semibold text-heading" aria-live="polite">{per.message}</p>
          {e && !['npo', 'cancelled', 'on-hold'].includes(s ?? '') ? <Stepper status={s} /> : null}
          {s === 'on-hold' ? <Notice tone="warn" icon={<RefreshCw aria-hidden />}>Some information changed, so your nutrition team is checking this meal before it is prepared. You don’t need to do anything; you will see new options or a confirmation here.</Notice> : null}
          {e?.replaced && ['confirmed', 'prepared', 'delivered'].includes(s ?? '') ? <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><Info className="size-4" aria-hidden />The nutrition team replaced your earlier meal.</p> : null}
          {['offered', 'selected'].includes(s ?? '') && per.options.length ? (
            <div className="flex flex-col gap-3">
              {per.options.map((o: any) => (
                <MealOption key={o.id} o={o} period={per.period} date={d.date} chosen={e?.selectedMealId === o.id} chosenPortion={e?.portion}
                  canChoose={d.canChoose && ['offered', 'selected'].includes(e?.status) && o.stillSuitable} busy={busy === `${per.period}|${o.id}`} onChoose={onChoose} />
              ))}
            </div>
          ) : null}
          {['confirmed', 'prepared', 'delivered'].includes(s ?? '') ? <SelectedMeal per={per} date={d.date} /> : null}
          {s === 'delivered' && d.canGiveFeedback ? (
            <div className="flex flex-col gap-2 rounded-[14px] bg-blush px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              {fb ? (
                <>
                  <span className="flex items-start gap-1.5"><Check className="mt-1 size-4 shrink-0 text-success" aria-hidden />You told us: {fb.accepted ? `${amountLabel(fb.amount).toLowerCase()} eaten` : 'not eaten'}{fb.satisfaction ? `, ${fb.satisfaction}/5` : ''}{fb.reasons.length ? ` (${fb.reasons.map(reasonLabel).join(', ').toLowerCase()})` : ''}.</span>
                  <Button size="sm" variant="outline" className="min-h-10" onClick={onFeedback} aria-label={`Change what you told us about your ${lower}`}>Change</Button>
                </>
              ) : (
                <>
                  <span>How was your {lower}? <span className="text-sm text-muted-foreground">Delivered does not mean eaten: tell us how much you had.</span></span>
                  <Button size="sm" variant="soft" className="min-h-10" onClick={onFeedback} aria-label={`Tell us how your ${lower} was`}><MessageSquare aria-hidden />Tell us</Button>
                </>
              )}
            </div>
          ) : null}
          {per.requests.length ? (
            <ul className="flex flex-col gap-2">
              {per.requests.map((r: any) => (
                <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-[14px] border border-border px-3 py-2 text-sm">
                  <RequestStatusChip status={r.status} /><b>{r.typeLabel}</b>{r.response ? <span>: {r.response}</span> : null}
                  <Link href={`/my-requests?id=${encodeURIComponent(r.id)}`} className="ml-auto inline-flex min-h-10 items-center" aria-label={`View request: ${r.typeLabel}`}>View</Link>
                </li>
              ))}
            </ul>
          ) : null}
          {d.canChoose && !d.npo && s !== 'delivered' ? (
            <div><Button size="sm" variant="ghost" className="min-h-10" onClick={onAsk}><MessageSquare aria-hidden />Ask for a different meal</Button></div>
          ) : null}
        </div>
      </Accordion>
    </section>
  );
}
