'use client';

import { Minus, Plus } from 'lucide-react';
import { Label } from '@/components/ui/label';

export function StepperInput({
  label,
  unit,
  value,
  onChange,
  step = 1,
  min = 0,
  max,
}: {
  label: string;
  unit?: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  const clamp = (n: number) => Math.min(max ?? Infinity, Math.max(min, n));

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <Label>{label}</Label>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
      <div className="flex items-center rounded-xl border border-border bg-white">
        <button type="button" onClick={() => onChange(clamp(value - step))} className="flex h-10 w-10 shrink-0 items-center justify-center text-muted-foreground hover:text-navy-900">
          <Minus className="h-4 w-4" />
        </button>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(clamp(Number(e.target.value)))}
          className="h-10 w-full min-w-0 border-x border-border bg-transparent text-center text-sm focus:outline-none"
        />
        <button type="button" onClick={() => onChange(clamp(value + step))} className="flex h-10 w-10 shrink-0 items-center justify-center text-muted-foreground hover:text-navy-900">
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
