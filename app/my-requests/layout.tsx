import { forbidden } from 'next/navigation';
import { requirePermission } from '@/lib/server/session';

/**
 * Patient-only area. Checked here as well as in the page so the 403 page is sent
 * with a 403 status (the page itself renders inside the loading.tsx boundary).
 */
export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  const actor = await requirePermission('patient:read', '/my-requests');
  if (actor.role !== 'patient') forbidden();
  return children;
}
