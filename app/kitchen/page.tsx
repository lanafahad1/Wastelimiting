import { requirePermission, getViewer } from '@/lib/server/session';
import { serviceCall, param } from '@/lib/server/data';
import { privateMetadata } from '@/lib/seo';
import { isoDate } from '@/lib/format';
import { PERIODS } from '@/domain/constants.js';
import { KitchenView } from './kitchen-view';

export const metadata = privateMetadata('Kitchen Summary');

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function KitchenPage({ searchParams }: Props) {
  const actor = await requirePermission('kitchen:view', '/kitchen');
  const viewer = await getViewer();
  const sp = await searchParams;
  const date = isoDate(param(sp.date));
  const p = param(sp.period) ?? '';
  const period = PERIODS.some((x: { id: string }) => x.id === p) ? p : '';
  const initial = await serviceCall((s) => s.getKitchenSummary(actor, { date, period: period || null }));
  return <KitchenView initial={initial} initialPeriod={period} permissions={viewer?.permissions ?? []} />;
}
