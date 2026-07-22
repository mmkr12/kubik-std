import { Package, Factory, Wrench, Truck } from 'lucide-react';
import { formatTenge } from '@/lib/utils';

const ICONS = { materials: Package, production: Factory, install: Wrench, delivery: Truck };

export interface PriceLine {
  key: 'materials' | 'production' | 'install' | 'delivery';
  label: string;
  amount: number;
}

export function PriceBreakdown({ lines, total }: { lines: PriceLine[]; total: number }) {
  const visible = lines.filter((l) => l.amount > 0);

  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-navy-900">Предварительный расчёт</h3>
      <div className="space-y-2">
        {visible.map((line) => {
          const Icon = ICONS[line.key];
          return (
            <div key={line.key} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Icon className="h-4 w-4" /> {line.label}
              </span>
              <span className="text-navy-800">{formatTenge(line.amount)}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <span className="font-medium text-navy-900">Итого</span>
        <span className="text-xl font-bold text-blue-600">{formatTenge(total)}</span>
      </div>
    </div>
  );
}
