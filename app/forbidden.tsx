import Link from 'next/link';
import { Lock } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { getViewer, homeFor } from '@/lib/server/session';

/** Rendered by forbidden(): the role lacks the RBAC permission for this page. */
export default async function Forbidden() {
  const viewer = await getViewer();
  return (
    <div className="container-page flex flex-col items-center gap-4 py-24 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-rose text-rose-ink"><Lock className="size-6" aria-hidden /></span>
      <h1 className="text-3xl">This page is not available for your role</h1>
      <p className="max-w-md text-muted-foreground">CareBite shows each person only the information they need.{viewer ? ` ${viewer.roleLabel} accounts cannot open this page.` : ''}</p>
      <Link href={homeFor(viewer ? { role: viewer.role, status: viewer.status } : null)} className={buttonVariants()}>Go to my start page</Link>
    </div>
  );
}
