import { LoadingBlock } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="container-page flex flex-col gap-6 pb-16 pt-8 sm:pt-12">
      <LoadingBlock label="Loading your account settings…" rows={4} />
    </div>
  );
}
