'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { CSPProvider } from '@base-ui/react/csp-provider';
import { Toaster } from '@/components/ui/toast';

/** Old links used hash routes (#/patients/1); send them to the real URL. */
function LegacyHashRedirect() {
  const router = useRouter();
  React.useEffect(() => {
    const h = window.location.hash;
    if (h.startsWith('#/')) router.replace(h.slice(1));
  }, [router]);
  return null;
}

export function Providers({ nonce, children }: { nonce?: string; children: React.ReactNode }) {
  return (
    <CSPProvider nonce={nonce}>
      {children}
      <Toaster />
      <LegacyHashRedirect />
    </CSPProvider>
  );
}
