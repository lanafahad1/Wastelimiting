import { requirePermission } from '@/lib/server/session';

/**
 * RBAC guard at the layout level: it runs before the loading UI streams, so a
 * role without 'dashboard:view' gets a real 403 response (the page checks again).
 */
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requirePermission('dashboard:view', '/dashboard');
  return children;
}
