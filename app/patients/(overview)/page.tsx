import { requirePermission, getViewer } from '@/lib/server/session';
import { serviceCall, param } from '@/lib/server/data';
import { privateMetadata } from '@/lib/seo';
import { isoDate } from '@/lib/format';
import { PatientsView } from '@/components/patients/patients-view';
import { FILTERS } from '@/components/patients/filters';

export const metadata = privateMetadata('Patient Overview');

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function PatientsPage({ searchParams }: Props) {
  const actor = await requirePermission('patient:list', '/patients');
  const viewer = await getViewer();
  const sp = await searchParams;
  const date = isoDate(param(sp.date));
  const ward = param(sp.ward) ?? '';
  const include = param(sp.include) === 'discharged' ? 'discharged' : 'admitted';
  const f = param(sp.filter) ?? 'all';
  const filter = FILTERS.some(([id]) => id === f) ? f : 'all';
  const initial = await serviceCall((s) => s.listPatients(actor, { date, ward: ward || null, include }));
  return (
    <PatientsView
      initial={initial}
      initialQuery={{ date: initial.date, ward, include, filter, q: param(sp.q) ?? '' }}
      canCreate={Boolean(viewer?.permissions.includes('patient:create'))}
    />
  );
}
