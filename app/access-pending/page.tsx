import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Clock, OctagonAlert } from 'lucide-react';
import { getActor, getViewer, homeFor } from '@/lib/server/session';
import { privateMetadata } from '@/lib/seo';
import { Notice } from '@/components/ui/notice';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { AccessPendingActions } from '@/components/auth/access-pending-actions';

export const metadata = privateMetadata('Access request');

export default async function AccessPendingPage() {
  const actor = await getActor();
  if (!actor) redirect('/login?next=/access-pending');
  if (actor.status === 'active') redirect(homeFor(actor));
  const viewer = (await getViewer())!;
  const declined = viewer.status === 'declined';
  const deactivated = viewer.status === 'deactivated';
  const requested = viewer.requestedRole ? ` for ${viewer.requestedRole === 'admin' ? 'admin' : 'staff'} access` : '';
  return (
    <div className="container-page container-narrow flex flex-col gap-5 pb-16 pt-8 sm:pt-12">
      <span className="eyebrow">Staff access</span>
      <Badge variant={declined || deactivated ? 'danger' : 'warn'} className="self-start">
        {declined || deactivated ? <OctagonAlert aria-hidden /> : <Clock aria-hidden />}{viewer.statusLabel}
      </Badge>
      <h1 className="text-[1.9rem] leading-tight sm:text-[2.5rem]">
        {declined ? 'Your staff access request was declined' : deactivated ? 'This account has been deactivated' : 'Your staff access request is waiting for approval'}
      </h1>
      {declined ? (
        <p className="text-[1.05rem]">
          An admin declined this request{viewer.decisionNote ? <>: “{viewer.decisionNote}”</> : '.'} If you think this is a mistake, contact your department’s CareBite admin.
        </p>
      ) : deactivated ? (
        <p className="text-[1.05rem]">This account has been deactivated by an admin. If you think this is a mistake, contact your department’s CareBite admin.</p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-[1.05rem]">Thank you, {viewer.name}. An admin will check your request{requested} and assign your role. Until then your account cannot see any patient or menu information.</p>
          <p className="text-sm text-muted-foreground">Try again later: once approved, use “Check again” or reload this page.</p>
        </div>
      )}
      <Notice title="Demonstration access.">
        In this prototype the demo admin (admin.demo) approves requests. CareBite does not verify identity; a real hospital would issue staff accounts through its own identity system.
      </Notice>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <AccessPendingActions waiting={!declined && !deactivated} />
        <Link href="/settings" className={buttonVariants({ variant: 'ghost' })}>Account settings</Link>
      </div>
    </div>
  );
}
