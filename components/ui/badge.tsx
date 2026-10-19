import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const badgeVariants = cva('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[.8rem] font-bold leading-5 whitespace-nowrap [&_svg]:size-3.5 [&_svg]:shrink-0', {
  variants: {
    variant: {
      neutral: 'border-border bg-card text-foreground',
      sage: 'border-transparent bg-sage text-sage-deep',
      mint: 'border-transparent bg-mint text-sage-deep',
      rose: 'border-transparent bg-rose text-rose-ink',
      warn: 'border-[#F1DFB8] bg-warning-soft text-warning',
      danger: 'border-[#F3C9D3] bg-destructive-soft text-destructive',
      ok: 'border-transparent bg-success-soft text-success',
      dark: 'border-transparent bg-heading text-white',
      outline: 'border-dashed border-input bg-transparent text-muted-foreground',
    },
  },
  defaultVariants: { variant: 'neutral' },
});

export function Badge({ className, variant, ...props }: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
