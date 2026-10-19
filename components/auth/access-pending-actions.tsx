'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, LogOut, Loader2 } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';

/** "Check again" re-renders the server page (which redirects once approved) and "Log out". */
export function AccessPendingActions({ waiting }: { waiting: boolean }) {
  const router = useRouter();
  const [checking, startCheck] = React.useTransition();
  const [checkedAt, setCheckedAt] = React.useState<string | null>(null);
  const [leaving, setLeaving] = React.useState(false);
  const wasChecking = React.useRef(false);

  React.useEffect(() => {
    if (checking) { wasChecking.current = true; return; }
    if (wasChecking.current) {
      wasChecking.current = false;
      setCheckedAt(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
    }
  }, [checking]);

  const logout = async () => {
    setLeaving(true);
    await authClient.signOut();
    toast('You have been logged out.');
    router.push('/');
    router.refresh();
  };

  return (
    <>
      <Button onClick={() => startCheck(() => router.refresh())} disabled={checking}>
        {checking ? <Loader2 aria-hidden className="animate-spin" /> : <RefreshCw aria-hidden />}Check again
      </Button>
      <Button variant="outline" onClick={logout} disabled={leaving}><LogOut aria-hidden />Log out</Button>
      <p role="status" className="basis-full text-sm text-muted-foreground empty:hidden sm:order-last">{checkedAt ? `Checked at ${checkedAt}${waiting ? ': still waiting.' : '.'}` : ''}</p>
    </>
  );
}
