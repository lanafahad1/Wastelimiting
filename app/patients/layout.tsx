import { requirePermission } from '@/lib/server/session';

// Checked here (outside the loading boundaries) so a role without access gets a real 403 response
// before anything streams. Each page checks its own permission again.
export default async function PatientsLayout({ children }: { children: React.ReactNode }) {
  await requirePermission('patient:list', '/patients');
  return children;
}
