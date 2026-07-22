'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export function CharCounterInput({
  label,
  hint,
  value,
  onChange,
  maxLength = 20,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <Label>{label}</Label>
        <span className="text-xs text-muted-foreground">{value.length}/{maxLength}</span>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <Input
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
