import { requirePermission, getViewer } from '@/lib/server/session';
import { serviceCall, getReference, param } from '@/lib/server/data';
import { privateMetadata } from '@/lib/seo';
import { isoDate } from '@/lib/format';
import { PatientView } from '@/components/patients/patient-view';
import { TABS, type Tab } from '@/components/patients/tabs';

export const metadata = privateMetadata('Patient Nutrition Profile');

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function PatientPage({ params, searchParams }: Props) {
  const { id } = await params;
  const actor = await requirePermission('patient:list', `/patients/${encodeURIComponent(id)}`);
  const viewer = await getViewer();
  const sp = await searchParams;
  const t = param(sp.tab);
  const tab: Tab = (TABS as readonly string[]).includes(t ?? '') ? (t as Tab) : 'meals';
  const date = isoDate(param(sp.date));
  const [record, day, reference] = await Promise.all([
    serviceCall((s) => s.getPatient(actor, id)),
    serviceCall((s) => s.getDayPlan(actor, id, { date })),
    getReference(),
  ]);
  return <PatientView id={String(record.patient.id)} initialRecord={record} initialDay={day} reference={reference} permissions={viewer?.permissions ?? []} initialTab={tab} />;
}
