import Link from 'next/link';
import { logoMark } from '@/lib/art.js';

export function Logo({ href = '/', className = '' }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={`flex items-center gap-2.5 font-display text-xl font-semibold text-heading no-underline ${className}`} aria-label="CareBite home">
      <span className="size-9 shrink-0" dangerouslySetInnerHTML={{ __html: logoMark() }} />
      <span>Care<b className="font-semibold text-rose-ink">Bite</b></span>
    </Link>
  );
}
