import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="container-page flex flex-col items-center gap-4 py-24 text-center">
      <span className="eyebrow">404</span>
      <h1 className="text-4xl">Page not found</h1>
      <p className="max-w-md text-muted-foreground">The page you were looking for does not exist or has moved.</p>
      <Link href="/" className={buttonVariants()}>Go to the home page</Link>
    </div>
  );
}
