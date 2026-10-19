'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HeartPulse, MessageSquare, ChevronRight, Plus, ShieldAlert, Users, CalendarCheck } from 'lucide-react';
import { useApi } from '@/lib/api-client';
import { PageHead, PageBody } from '@/components/site/page-head';
import { RequestStatusChip } from '@/components/cb/status';
import { EmptyState } from '@/components/cb/misc';
import { periodLabel } from '@/components/cb/labels';
import { buttonVariants } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Notice } from '@/components/ui/notice';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';
import { RequestDialog, type RequestTarget, type RequestVocab } from '@/components/patient/request-dialog';
import { Time } from '@/components/patient/helpers';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Data = { requests: any[]; discharged: boolean };

export function MyRequestsView({ pid, demoId, initial, focusId, vocab, today, maxDate }: { pid: string; demoId: string; initial: Data; focusId: string | null; vocab: RequestVocab; today: string; maxDate: string }) {
  const router = useRouter();
  const key = `/api/patients/${pid}/requests`;
  const { data, error } = useApi<Data>(key, initial);
  const [highlight, setHighlight] = React.useState<string | null>(focusId);
  const [request, setRequest] = React.useState<RequestTarget | null>(null);
  const d = data ?? initial;
  const rs = d.requests;
  const pending = rs.filter((r) => r.status === 'open');

  // ?id= highlights one request: scroll it into view and move focus to it.
  React.useEffect(() => {
    if (!focusId) return;
    const el = document.getElementById(`rq-${focusId}`);
    if (!el) return;
    el.scrollIntoView({ block: 'center' });
    el.focus({ preventScroll: true });
  }, [focusId]);

  const newRequest = (type: string) => {
    if (vocab.requestTypes.find((t) => t.id === type)?.clinical) { router.push('/my-profile?report=1'); return; }
    setRequest({ type });
  };

  return (
    <>
      <PageHead eyebrow={`${demoId} · My requests`} title="My Requests" narrow
        actions={d.discharged ? null : (
          <DropdownMenu>
            <DropdownMenuTrigger className={buttonVariants({ className: 'w-full sm:w-auto' })}><Plus aria-hidden />New request</DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {vocab.requestTypes.map((t) => {
                const Icon = t.clinical ? HeartPulse : t.id === 'assistance' ? Users : t.id === 'schedule-change' ? CalendarCheck : MessageSquare;
                return <DropdownMenuItem key={t.id} className="min-h-11" onClick={() => newRequest(t.id)}><Icon aria-hidden />{t.label}</DropdownMenuItem>;
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}>
        <p>Everything you have asked the nutrition team, with its status and their reply. The team sees the same status.</p>
      </PageHead>
      <PageBody narrow className="gap-4">
        {error ? <Notice tone="danger" title="We couldn’t refresh your requests.">{error.message} Check your connection and try again.</Notice> : null}
        <p className="text-sm">
          <b>{pending.length}</b> pending · <b>{rs.length - pending.length}</b> answered.{' '}
          {d.discharged ? 'You have been discharged, so new requests cannot be sent here.' : <>To send a new request, use <Link href="/my-meals">My Meals</Link> (meal requests) or <Link href="/my-profile?report=1">My Food Profile</Link> (diet or allergy changes).</>}
        </p>
        {rs.length ? (
          <ul className="flex flex-col gap-3">
            {rs.map((r) => (
              <li key={r.id} id={`rq-${r.id}`} tabIndex={-1} aria-current={r.id === highlight ? 'true' : undefined}
                className={cn('flex scroll-mt-24 flex-col gap-3 rounded-xl border bg-card p-4 shadow-soft outline-none sm:p-5', r.clinical && 'border-l-[5px] border-l-pink-deep',
                  r.id === highlight ? 'border-2 border-heading ring-3 ring-sage' : 'border-border')}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="flex items-center gap-2 text-lg">{r.clinical ? <HeartPulse className="size-5" aria-hidden /> : <MessageSquare className="size-5" aria-hidden />}{r.typeLabel}</h2>
                  <RequestStatusChip status={r.status} />
                </div>
                <dl className="grid gap-x-6 gap-y-2 text-[.95rem] sm:grid-cols-[8rem_1fr]">
                  <dt className="text-sm font-semibold text-muted-foreground">Sent</dt>
                  <dd><Time iso={r.createdAt} />{r.createdByRole !== 'patient' ? ` by ${r.createdBy} (nutrition team)` : ''}</dd>
                  {r.date ? <><dt className="text-sm font-semibold text-muted-foreground">About</dt><dd>{periodLabel(r.period)} on {formatDate(r.date, { weekday: 'long', month: 'short', day: 'numeric' })}{r.mealName ? ` · ${r.mealName}` : ''}</dd></> : null}
                  {r.reportLabel ? <><dt className="text-sm font-semibold text-muted-foreground">What changed</dt><dd>{r.reportLabel}{r.allergenLabel ? ` · ${r.allergenLabel}` : ''}</dd></> : null}
                  <dt className="text-sm font-semibold text-muted-foreground">Your message</dt><dd className="min-w-0 break-words">“{r.message}”</dd>
                  <dt className="text-sm font-semibold text-muted-foreground">Response</dt>
                  <dd>{r.response
                    ? <><b>{r.response}</b><br /><span className="text-sm text-muted-foreground">{r.resolvedBy}, <Time iso={r.resolvedAt} /></span></>
                    : <span className="text-muted-foreground">No response yet. {r.clinical ? 'An admin will review it before your record changes.' : 'The nutrition team will reply here.'}</span>}</dd>
                </dl>
                {r.clinical && r.status === 'open' && r.allergenLabel && r.reportLabel?.includes('new')
                  ? <p className="flex items-start gap-1.5 text-sm"><ShieldAlert className="mt-0.5 size-4 shrink-0 text-heading" aria-hidden />Until an admin reviews this, meals that contain {r.allergenLabel.toLowerCase()} are held back for review.</p> : null}
                {r.date ? <Link href={`/my-meals?date=${r.date}&period=${r.period}`} className="inline-flex min-h-10 w-fit items-center gap-1 text-sm">Go to this meal <ChevronRight className="size-4" aria-hidden /></Link> : null}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No requests yet" action={<Link href="/my-meals" className={buttonVariants()}>Go to My Meals</Link>}>
            When you ask for a different meal, a schedule change or support, it appears here with its status.
          </EmptyState>
        )}
      </PageBody>
      <RequestDialog pid={pid} target={request} onClose={() => setRequest(null)} vocab={vocab} today={today} maxDate={maxDate} defaultDate={today}
        onSent={(r) => setHighlight(r.request.id)} />
    </>
  );
}
