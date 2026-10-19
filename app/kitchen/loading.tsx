import { LoadingBlock } from '@/components/ui/skeleton';

export default function Loading() {
  return <div className="container-page py-10"><LoadingBlock label="Preparing the kitchen summary…" rows={4} /></div>;
}
