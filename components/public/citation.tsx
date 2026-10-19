import { CITATION } from '@/lib/site';
import { CopyCitation } from './copy-citation';

/** The project citation with a "Copy citation" button. */
export function Citation({ id = 'cite' }: { id?: string }) {
  return (
    <div className="flex flex-col gap-3">
      <p id={id} className="rounded-[14px] border border-border bg-card p-4 text-sm text-muted-foreground">{CITATION}</p>
      <CopyCitation text={CITATION} targetId={id} />
    </div>
  );
}
