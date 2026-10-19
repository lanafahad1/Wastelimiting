import { requirePermission } from '@/lib/server/session';
import { serviceCall } from '@/lib/server/data';
import { privateMetadata } from '@/lib/seo';
import { StaffAccessView } from './staff-access-view';

export const metadata = privateMetadata('Staff Access');

export default async function StaffAccessPage() {
  const actor = await requirePermission('staff:manage', '/staff-access');
  const initial = await serviceCall((s) => s.listStaff(actor));
  return <StaffAccessView initial={initial} />;
}
