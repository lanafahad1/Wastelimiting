import { requirePermission } from '@/lib/server/session';

// Admin only; checked outside the loading boundary so other roles get a real 403 response.
export default async function NewPatientLayout({ children }: { children: React.ReactNode }) {
  await requirePermission('patient:create', '/patients/new');
  return children;
}
