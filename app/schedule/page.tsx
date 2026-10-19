import { requirePermission } from '@/lib/server/session';
import { serviceCall, param } from '@/lib/server/data';
import { privateMetadata } from '@/lib/seo';
import { isoDate } from '@/lib/format';
import { ScheduleView } from './schedule-view';

export const metadata = privateMetadata('Meal Schedule');

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * Reference pattern for data pages:
 * 1. Server component: check the RBAC permission, then fetch the initial data
 *    through the domain service as the signed-in actor.
 * 2. Client component: render it, keep it fresh with SWR (the server data is the
 *    `fallbackData`), and update the URL with history.replaceState.
 */
export default async function SchedulePage({ searchParams }: Props) {
  const actor = await requirePermission('schedule:view', '/schedule');
  const sp = await searchParams;
  const date = isoDate(param(sp.date));
  const ward = param(sp.ward) ?? '';
  const initial = await serviceCall((s) => s.getSchedule(actor, { date, ward: ward || null }));
  return <ScheduleView initial={initial} initialWard={ward} />;
}
