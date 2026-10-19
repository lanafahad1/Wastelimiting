import { forbidden } from 'next/navigation';
import { requirePermission, getViewer } from '@/lib/server/session';
import { serviceCall, getReference, param } from '@/lib/server/data';
import { privateMetadata } from '@/lib/seo';
import { isoDate } from '@/lib/format';
import { LinkAccount } from '@/components/patient/link-account';
import { MyMealsView } from './my-meals-view';

export const metadata = privateMetadata('My Meals');

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** The patient's main page: next meal, what needs their action, one day in detail or a week overview. */
export default async function MyMealsPage({ searchParams }: Props) {
  const actor = await requirePermission('patient:read', '/my-meals');
  if (actor.role !== 'patient') forbidden();
  const viewer = await getViewer();
  const pid = viewer?.patientId;
  if (!pid) return <LinkAccount />;

  const sp = await searchParams;
  const date = isoDate(param(sp.date));
  const week = isoDate(param(sp.week)) ?? null;
  const view = param(sp.view) === 'week' ? 'week' : 'day';
  const period = param(sp.period);
  const initial = await serviceCall((s) => {
    try { return s.getMyMeals(actor, pid, { date, week }); } catch (err) {
      // A deep link outside the viewable window falls back to today instead of an error page.
      if ([400, 409, 422].includes((err as { status?: number }).status ?? 0) && (date || week)) return s.getMyMeals(actor, pid, {});
      throw err;
    }
  });
  const usedWeek = initial.weekFrom === week ? week : null;
  const ref = await getReference();
  const v = ref.vocab;
  const reference = { vocab: { appetite: v.appetite, intakeAmounts: v.intakeAmounts, refusalReasons: v.refusalReasons, periods: v.periods, requestTypes: v.requestTypes } };
  const periodOk = (v.periods as { id: string }[]).some((p) => p.id === period) ? period! : null;

  return (
    <MyMealsView pid={pid} name={viewer!.name} demoId={viewer!.patientDemoId ?? ''} initial={initial} initialWeek={usedWeek}
      initialView={view} initialPeriod={periodOk} reference={reference} />
  );
}
