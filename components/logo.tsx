import { cn } from '@/lib/utils';

export function Logo({ dark = false, className }: { dark?: boolean; className?: string }) {
  const color = dark ? 'text-white' : 'text-navy-900';
  return (
    <div className={cn('flex items-baseline gap-1 select-none', className)}>
      <span className={cn('text-xl font-bold tracking-tight', color)}>
        K<span className="text-blue-500">&lt;&gt;</span>I
      </span>
      <span className={cn('text-xs font-medium', dark ? 'text-white/60' : 'text-muted-foreground')}>
        .std
      </span>
    </div>
  );
}
