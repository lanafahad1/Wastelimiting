'use client';
import * as React from 'react';
import { Check, Clock, TriangleAlert } from 'lucide-react';
import { periodLabel, roleLabel } from '@/components/cb/labels';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/format';
import { When, CellLabel } from './common';
import { usePatient } from './patient-context';

/* eslint-disable @typescript-eslint/no-explicit-any */

const effectOf = (ch: any) => (ch.hold ? 'Put on hold'
  : ch.resolution?.startsWith('Cancelled') || ch.resolution === 'Meal cancelled' ? 'Cancelled'
    : ch.resolution?.startsWith('Replaced') ? 'Replaced' : 'Options withdrawn');

export function ChangesTab() {
  const { record } = usePatient();
  const changes: any[] = record.changes;
  const audit: any[] = record.audit;
  return (
    <div className="flex flex-col gap-5">
      <section aria-labelledby="ch-head" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-soft sm:p-6">
        <h2 id="ch-head" className="text-xl">Changes after an order</h2>
        <p className="text-sm text-muted-foreground">Every time a change to the record, a reported allergy, a meal or the menu affected an upcoming meal: what changed, the effect, whether it has been reviewed, and whether the kitchen acknowledged it.</p>
        {changes.length ? (
          <ul className="flex flex-col gap-3">
            {changes.map((ch) => (
              <li key={`${ch.id}-${ch.at}`} className="flex flex-col gap-3 rounded-[16px] border border-border bg-background p-4">
                <div className="flex flex-col">
                  <b className="font-display text-heading">{formatDate(ch.date)} · {periodLabel(ch.period)}</b>
                  <span className="text-sm">{ch.mealName ?? 'Options'}</span>
                </div>
                <div className="text-sm">
                  <b>{ch.causeLabel}</b>
                  <p>{ch.change}</p>
                  <span className="text-muted-foreground"><When iso={ch.at} /></span>
                </div>
                <dl className="grid gap-3 text-sm sm:grid-cols-3">
                  <div className="flex flex-col gap-1">
                    <dt><CellLabel>Effect</CellLabel></dt>
                    <dd>
                      {ch.hold ? <Badge variant="danger"><TriangleAlert aria-hidden />{effectOf(ch)}</Badge> : <span>{effectOf(ch)}</span>}
                      {ch.details?.length ? <span className="mt-1 block text-muted-foreground">{ch.details.join(' ')}</span> : null}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1">
                    <dt><CellLabel>Review</CellLabel></dt>
                    <dd className="flex flex-col gap-1">
                      {ch.reviewed
                        ? <><span><Badge variant="ok"><Check aria-hidden />Reviewed</Badge></span><span>{ch.reviewedBy}{ch.reviewedByRole ? ` (${roleLabel(ch.reviewedByRole)})` : ''}: {ch.resolution ?? ''}</span></>
                        : <span><Badge variant="warn"><Clock aria-hidden />Not reviewed</Badge></span>}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1">
                    <dt><CellLabel>Kitchen</CellLabel></dt>
                    <dd>
                      {ch.kitchenAffected
                        ? ch.kitchenAck ? <span className="inline-flex items-center gap-1"><Check className="size-4" aria-hidden />Acknowledged by {ch.kitchenAck.by}</span> : <Badge variant="warn"><Clock aria-hidden />Alert not yet acknowledged</Badge>
                        : <span className="text-muted-foreground">Not affected</span>}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        ) : <p className="text-muted-foreground">No changes have affected this patient’s meals.</p>}
      </section>
      <section aria-labelledby="ac-head" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-soft sm:p-6">
        <h2 id="ac-head" className="text-xl">Activity log</h2>
        <p className="text-sm text-muted-foreground">Who changed this patient’s record or meals, and when.</p>
        {audit.length ? (
          <ol className="flex flex-col divide-y divide-border">
            {audit.map((a, i) => (
              <li key={a.id ?? i} className="flex flex-col gap-0.5 py-2.5 text-sm sm:flex-row sm:gap-4">
                <span className="shrink-0 text-muted-foreground tabular sm:w-32"><When iso={a.at} /></span>
                <span><b>{a.actorName}</b> <Badge variant="outline">{roleLabel(a.actorRole)}</Badge> {a.detail}</span>
              </li>
            ))}
          </ol>
        ) : <p className="text-muted-foreground">No activity recorded.</p>}
      </section>
    </div>
  );
}
