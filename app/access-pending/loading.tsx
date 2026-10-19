import { LoadingBlock } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="container-page container-narrow pb-16 pt-8 sm:pt-12">
      <LoadingBlock label="Loading your access request…" rows={3} />
    </div>
  );
}
