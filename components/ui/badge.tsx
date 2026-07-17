import * as React from 'react';
import { cn } from '@/lib/utils';

function Badge({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'success' | 'danger' }) {
  const variants = {
    default: 'bg-blue-600/10 text-blue-600',
    success: 'bg-emerald-500/10 text-emerald-600',
    danger: 'bg-red-500/10 text-red-600',
  };
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
