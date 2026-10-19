import { Logo } from './logo';
import { MainNav } from './main-nav';
import { getViewer, homeFor } from '@/lib/server/session';
import { PUBLIC_NAV, STAFF_NAV, PATIENT_NAV } from '@/lib/site';

/** Server-rendered header: navigation comes from the session role and its RBAC permissions. */
export async function SiteHeader() {
  const viewer = await getViewer();
  const active = viewer?.status === 'active';
  const nav = !viewer ? PUBLIC_NAV
    : !active ? [{ href: '/access-pending', label: 'Access request' }]
      : viewer.role === 'patient' ? PATIENT_NAV
        : STAFF_NAV.filter((i) => !i.permission || viewer.permissions.includes(i.permission));
  const more = viewer ? PUBLIC_NAV.filter((i) => !nav.some((n) => n.href === i.href)) : [];
  const home = viewer ? homeFor({ role: viewer.role, status: viewer.status }) : '/';
  return (
    <header className="sticky top-[env(safe-area-inset-top,0px)] z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85">
      <MainNav
        home={home}
        nav={nav.map(({ href, label }) => ({ href, label }))}
        more={more.map(({ href, label }) => ({ href, label }))}
        logo={<Logo href={home} />}
        viewer={viewer ? { name: viewer.name, username: viewer.username, roleLabel: viewer.roleLabel, role: viewer.role, patientDemoId: viewer.patientDemoId, isDemo: viewer.isDemo } : null}
      />
    </header>
  );
}
