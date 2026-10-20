import { Slot } from 'radix-ui';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { cx } from './cx.ts';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 's' | 'm' | 'l';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-accent-600 text-on-accent border border-accent-600 hover:bg-accent-700 hover:border-accent-700 active:bg-accent-700',
  secondary: 'bg-surface-0 text-ink-900 border border-line-300 hover:bg-surface-100',
  ghost: 'bg-transparent text-ink-900 border border-transparent hover:bg-surface-100',
  danger:
    'bg-surface-0 text-critical-600 border border-line-300 hover:border-critical-600 hover:bg-surface-100',
};

// Höhen 32 / 40 / 48 px; die Klickfläche bleibt dank min-w/min-h mind. 44 × 44 px auf Touch.
const SIZES: Record<ButtonSize, string> = {
  s: 'h-control-s px-3 text-body-s gap-1.5',
  m: 'h-control-m px-4 text-body-s gap-2',
  l: 'h-control-l px-5 text-body gap-2',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'm', asChild = false, className, type, ...props },
  ref,
) {
  const Comp = asChild ? Slot.Root : 'button';
  return (
    <Comp
      ref={ref}
      type={asChild ? undefined : (type ?? 'button')}
      className={cx(
        'inline-flex items-center justify-center rounded-control font-medium whitespace-nowrap select-none',
        'transition-colors duration-fast ease-kardia',
        'disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
        'pointer-coarse:min-h-touch',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
});
