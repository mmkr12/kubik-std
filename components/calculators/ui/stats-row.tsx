import type { LucideIcon } from 'lucide-react';

export interface StatItem {
  icon: LucideIcon;
  label: string;
  value: string;
}

export function StatsRow({ items }: { items: StatItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2">
          <item.icon className="h-4 w-4 shrink-0 text-blue-600" />
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{item.label}</p>
            <p className="text-sm font-medium text-navy-900">{item.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
