'use client';
import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, Menu as MenuIcon, X, Sparkles, LogOut, Settings, House } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLinkItem } from '@/components/ui/dropdown-menu';
import { authClient } from '@/lib/auth-client';
import { toast } from '@/components/ui/toast';

type Item = { href: string; label: string };
type ViewerLite = { name: string; username: string; roleLabel: string; role: string | null; patientDemoId: string | null; isDemo: boolean } | null;

const isActive = (path: string, href: string) => (href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`));

export function MainNav({ nav, more, viewer, home, logo }: { nav: Item[]; more: Item[]; viewer: ViewerLite; home: string; logo: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => { setOpen(false); }, [path]);
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const initials = viewer ? (viewer.name || viewer.username || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() : '';
  const logout = async () => {
    await authClient.signOut();
    toast('You have been logged out.');
    router.push('/');
    router.refresh();
  };
  // Staff navigation has the most entries: it collapses to the menu button on narrower screens.
  const wide = nav.length > 4;

  return (
    <>
      <div className="container-page flex h-16 items-center gap-4">
        {logo}
        <nav aria-label="Main" className={cn('ml-2 hidden items-center gap-1', wide ? 'xl:flex' : 'lg:flex')}>
          {nav.map((i) => (
            <Link key={i.href} href={i.href} aria-current={isActive(path, i.href) ? 'page' : undefined}
              className="rounded-full px-3 py-2 font-display text-[.92rem] text-foreground no-underline transition-colors hover:bg-mint hover:text-sage-deep aria-[current=page]:bg-sage aria-[current=page]:text-sage-deep">
              {i.label}
            </Link>
          ))}
          {more.length ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded-full px-3 py-2 font-display text-[.92rem] text-foreground hover:bg-mint">More <ChevronDown className="size-4" aria-hidden /></DropdownMenuTrigger>
              <DropdownMenuContent>
                {more.map((i) => <DropdownMenuLinkItem key={i.href} render={<Link href={i.href} />}>{i.label}</DropdownMenuLinkItem>)}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {viewer ? (
            <>
              <span className={cn('hidden rounded-full px-2.5 py-1 text-xs font-extrabold tracking-wide sm:inline', viewer.role === 'admin' ? 'bg-warning-soft text-warning' : viewer.role === 'patient' ? 'bg-rose text-rose-ink' : 'bg-mint text-heading')}>{viewer.roleLabel}</span>
              <DropdownMenu>
                <DropdownMenuTrigger aria-label={`Account menu for ${viewer.username}`} className="grid size-10 place-items-center rounded-full bg-pink font-display text-sm font-semibold text-rose-ink hover:bg-pink-deep">{initials}</DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <div className="px-3 pb-2 pt-1.5 text-sm">
                    <b className="text-heading">{viewer.name}</b> <span className="text-muted-foreground">@{viewer.username}</span>
                    <div className="text-xs text-muted-foreground">{viewer.roleLabel}{viewer.patientDemoId ? ` · ${viewer.patientDemoId}` : ''}{viewer.isDemo ? ' · demo account' : ''}</div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuLinkItem render={<Link href={home} />}><House aria-hidden />My start page</DropdownMenuLinkItem>
                  <DropdownMenuLinkItem render={<Link href="/settings" />}><Settings aria-hidden />Account settings</DropdownMenuLinkItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout}><LogOut aria-hidden />Log out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link href="/login" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'hidden sm:inline-flex')}>Log in</Link>
              <Link href="/login" className={buttonVariants({ size: 'sm' })}><Sparkles aria-hidden />Try the demo</Link>
            </>
          )}
          <button type="button" className={cn('grid size-10 place-items-center rounded-full text-heading hover:bg-mint', wide ? 'xl:hidden' : 'lg:hidden')}
            aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen((o) => !o)}>
            {open ? <X className="size-5" aria-hidden /> : <MenuIcon className="size-5" aria-hidden />}
          </button>
        </div>
      </div>
      {/* Mobile navigation: transitions.dev "Panel reveal". */}
      <div className={cn('overflow-hidden', wide ? 'xl:hidden' : 'lg:hidden', !open && 'pointer-events-none h-0')}>
        <div ref={panelRef} id="mobile-nav" className="t-panel-slide border-t border-border bg-card" data-open={open ? 'true' : 'false'} inert={!open}>
          <nav aria-label="Mobile" className="container-page flex flex-col gap-1 py-3">
            {viewer ? <p className="px-3 pt-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">{viewer.roleLabel} · @{viewer.username}</p> : null}
            {nav.map((i) => <MobileLink key={i.href} item={i} active={isActive(path, i.href)} />)}
            {viewer ? <MobileLink item={{ href: '/settings', label: 'Account settings' }} active={path === '/settings'} /> : null}
            {viewer ? (more.length ? <p className="px-3 pt-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Explore</p> : null) : <p className="px-3 pt-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Your account</p>}
            {(viewer ? more : []).map((i) => <MobileLink key={i.href} item={i} active={isActive(path, i.href)} />)}
            {viewer ? (
              <button type="button" onClick={logout} className="flex min-h-12 items-center rounded-[12px] px-3 text-left font-display text-base text-destructive hover:bg-destructive-soft">Log out</button>
            ) : (
              <>
                <MobileLink item={{ href: '/login', label: 'Log in' }} active={path === '/login'} />
                <MobileLink item={{ href: '/register', label: 'Create account' }} active={path === '/register'} />
              </>
            )}
          </nav>
        </div>
      </div>
    </>
  );
}

function MobileLink({ item, active }: { item: Item; active: boolean }) {
  return (
    <Link href={item.href} aria-current={active ? 'page' : undefined}
      className="flex min-h-12 items-center rounded-[12px] px-3 font-display text-base text-foreground no-underline hover:bg-mint aria-[current=page]:bg-sage aria-[current=page]:text-sage-deep">
      {item.label}
    </Link>
  );
}
