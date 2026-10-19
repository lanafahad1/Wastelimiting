import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const cardVariants = cva('flex flex-col gap-4 rounded-xl border p-5 sm:p-6', {
  variants: {
    tone: {
      default: 'border-border bg-card shadow-soft',
      mint: 'border-sage bg-mint',
      blush: 'border-rose bg-blush',
      plain: 'border-border bg-card',
    },
  },
  defaultVariants: { tone: 'default' },
});

export function Card({ className, tone, ...props }: React.ComponentProps<'section'> & VariantProps<typeof cardVariants>) {
  return <section className={cn(cardVariants({ tone }), className)} {...props} />;
}
export function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-wrap items-start justify-between gap-3', className)} {...props} />;
}
export function CardTitle({ className, as: As = 'h2', ...props }: React.ComponentProps<'h2'> & { as?: 'h2' | 'h3' | 'h4' }) {
  return <As className={cn('text-lg sm:text-xl', className)} {...props} />;
}
export function CardDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />;
}
