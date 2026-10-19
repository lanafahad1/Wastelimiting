import { redirect } from 'next/navigation';
import { getActor, getViewer } from '@/lib/server/session';
import { privateMetadata } from '@/lib/seo';
import { SettingsView } from '@/components/auth/settings-view';

export const metadata = privateMetadata('Account Settings');

/** Account settings. Pending staff requests may open it too (to change their password or delete the request). */
export default async function SettingsPage() {
  const actor = await getActor();
  if (!actor) redirect('/login?next=/settings');
  const viewer = (await getViewer())!;
  return <SettingsView viewer={viewer} memberSince={actor.createdAt} />;
}
