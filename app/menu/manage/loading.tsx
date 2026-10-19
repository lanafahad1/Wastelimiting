import { LoadingBlock } from '@/components/ui/skeleton';

export default function Loading() {
  return <div className="container-page py-10"><LoadingBlock label="Loading the menu catalogue…" rows={4} /></div>;
}
