import { requirePermission } from '@/lib/server/session';
import { serviceCall, param } from '@/lib/server/data';
import { privateMetadata } from '@/lib/seo';
import { isoDate } from '@/lib/format';
import { DashboardView } from './dashboard-view';

export const metadata = privateMetadata('Nutrition Team Dashboard');

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function DashboardPage({ searchParams }: Props) {
  const actor = await requirePermission('dashboard:view', '/dashboard');
  const date = isoDate(param((await searchParams).date));
  const initial = await serviceCall((s) => s.getDashboard(actor, { date }));
  return <DashboardView initial={initial} requestedDate={date ?? null} />;
}
