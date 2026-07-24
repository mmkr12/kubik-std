import { Receipt } from 'lucide-react';
import { formatTenge } from '@/lib/utils';

export interface PriceLine {
  label: string;
  amount: number;
  indent?: boolean;
  bold?: boolean;
}

export function PriceBreakdown({ lines, total }: { lines: PriceLine[]; total: number }) {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-navy-900">
        <Receipt className="h-4 w-4 text-blue-600" /> Смета
      </h3>
      <div className="space-y-1.5">
        {lines.map((line, i) => (
          <div key={i} className={`flex items-center justify-between text-sm ${line.indent ? 'pl-3 text-xs' : ''}`}>
            <span className={line.bold ? 'font-medium text-navy-900' : 'text-muted-foreground'}>{line.label}</span>
            <span className={line.bold ? 'font-medium text-navy-900' : 'text-navy-800'}>{formatTenge(line.amount)}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-red-500">* Стоимость фиксируется по заданным вами параметрам</p>
      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <span className="font-medium text-navy-900">Итого</span>
        <span className="text-xl font-bold text-blue-600">{formatTenge(total)}</span>
      </div>
    </div>
  );
}
