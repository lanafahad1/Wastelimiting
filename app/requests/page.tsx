import { requirePermission, getViewer } from '@/lib/server/session';
import { serviceCall, param } from '@/lib/server/data';
import { privateMetadata } from '@/lib/seo';
import { isoDate } from '@/lib/format';
import { RequestsView } from './requests-view';

export const metadata = privateMetadata('Patient Requests');

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const STATUSES = ['open', 'resolved', 'declined', 'all'];

export default async function RequestsPage({ searchParams }: Props) {
  const actor = await requirePermission('request:list', '/requests');
  const viewer = await getViewer();
  const sp = await searchParams;
  const status = STATUSES.includes(param(sp.status) ?? '') ? (param(sp.status) as string) : 'open';
  // Every request is loaded once; status, type, date and order are filtered in the browser.
  const initial = await serviceCall((s) => s.listRequests(actor, { status: 'all' }));
  return (
    <RequestsView
      initial={initial}
      permissions={viewer?.permissions ?? []}
      initialFilters={{ status, type: param(sp.type) ?? '', date: isoDate(param(sp.date)) ?? '', order: param(sp.order) === 'newest' ? 'newest' : '' }}
    />
  );
}
