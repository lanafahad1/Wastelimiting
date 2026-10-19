import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Info, CircleCheck, TriangleAlert, OctagonAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

const noticeVariants = cva('flex items-start gap-3 rounded-[16px] border px-4 py-3 text-[.95rem] [&>svg]:mt-0.5 [&>svg]:size-5 [&>svg]:shrink-0', {
  variants: {
    tone: {
      info: 'border-sage bg-mint text-sage-deep',
      ok: 'border-sage bg-success-soft text-success',
      warn: 'border-[#F1DFB8] bg-warning-soft text-warning',
      danger: 'border-[#F3C9D3] bg-destructive-soft text-destructive',
      rose: 'border-rose bg-blush text-rose-ink',
    },
  },
  defaultVariants: { tone: 'info' },
});
const ICON = { info: Info, ok: CircleCheck, warn: TriangleAlert, danger: OctagonAlert, rose: Info };

/** Status message: text plus icon (never colour alone). */
export function Notice({ tone = 'info', title, children, className, role, icon }: VariantProps<typeof noticeVariants> & { title?: React.ReactNode; children?: React.ReactNode; className?: string; role?: string; icon?: React.ReactNode }) {
  const Icon = ICON[tone ?? 'info'];
  return (
    <div role={role ?? (tone === 'danger' ? 'alert' : undefined)} className={cn(noticeVariants({ tone }), className)}>
      {icon ?? <Icon aria-hidden />}
      <div className="flex min-w-0 flex-col gap-0.5">
        {title ? <strong className="font-display font-semibold">{title}</strong> : null}
        {children ? <div className="leading-relaxed">{children}</div> : null}
      </div>
    </div>
  );
}
