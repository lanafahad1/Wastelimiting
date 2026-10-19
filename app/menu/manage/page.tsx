import { requirePermission, getViewer } from '@/lib/server/session';
import { serviceCall, param } from '@/lib/server/data';
import { privateMetadata } from '@/lib/seo';
import { isTab } from './tabs';
import { ManageView } from './manage-view';

export const metadata = privateMetadata('Menu Management');

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ManagePage({ searchParams }: Props) {
  const actor = await requirePermission('menu:manage-view', '/menu/manage');
  const viewer = await getViewer();
  const t = param((await searchParams).tab);
  const [catalog, plan] = await serviceCall((s) => Promise.all([s.getManageCatalog(actor), s.getMenuPlan(actor, {})]));
  return <ManageView catalog={catalog} plan={plan} initialTab={isTab(t) ? t : 'meals'} permissions={viewer?.permissions ?? []} />;
}
