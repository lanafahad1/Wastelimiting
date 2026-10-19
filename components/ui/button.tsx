import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-full font-display font-medium leading-tight whitespace-nowrap transition-colors duration-150 disabled:pointer-events-none disabled:opacity-55 [&_svg]:size-[1.1em] [&_svg]:shrink-0 cursor-pointer no-underline max-sm:whitespace-normal max-sm:text-center',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary-hover shadow-soft',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-sage',
        outline: 'border border-border bg-card text-heading hover:bg-mint',
        ghost: 'text-heading hover:bg-mint',
        soft: 'bg-rose text-rose-ink hover:bg-pink',
        destructive: 'border border-destructive/30 bg-destructive-soft text-destructive hover:bg-destructive/15',
        'destructive-solid': 'bg-destructive text-white hover:bg-destructive/90',
        link: 'text-heading underline underline-offset-4 hover:text-sage-deep px-0',
      },
      size: {
        sm: 'min-h-9 px-3.5 py-1.5 text-sm',
        default: 'min-h-11 px-5 py-2.5 text-[.95rem]',
        lg: 'min-h-12 px-6 py-3 text-base',
        icon: 'size-10 p-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export type ButtonProps = React.ComponentProps<'button'> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
