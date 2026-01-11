import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const dispositionButtonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        positive: 'bg-green-600 text-white hover:bg-green-700',
        negative: 'bg-red-600 text-white hover:bg-red-700',
        neutral: 'bg-gray-600 text-white hover:bg-gray-700',
        callback: 'bg-blue-600 text-white hover:bg-blue-700',
        dnc: 'bg-orange-600 text-white hover:bg-orange-700',
        voicemail: 'bg-purple-600 text-white hover:bg-purple-700',
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-12 px-6 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface DispositionButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof dispositionButtonVariants> {
  hotkey?: string;
}

export function DispositionButton({
  className,
  variant,
  size,
  hotkey,
  children,
  ...props
}: DispositionButtonProps) {
  return (
    <button
      className={cn(dispositionButtonVariants({ variant, size }), className)}
      {...props}
    >
      <span className="flex items-center gap-2">
        {hotkey && (
          <kbd className="rounded bg-white/20 px-1.5 py-0.5 text-xs font-mono">
            {hotkey}
          </kbd>
        )}
        {children}
      </span>
    </button>
  );
}
