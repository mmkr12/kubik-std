'use client';

import { useEffect, useState } from 'react';
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

  // Пока пользователь печатает — храним "сырой" текст в поле и не
  // обрезаем его по границам min/max на каждое нажатие клавиши (иначе
  // следующая цифра дописывается не к тому, что реально печатают).
  // Обрезаем только когда убрали фокус с поля или нажали +/-.
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    setText(raw);
    if (raw !== '' && !Number.isNaN(Number(raw))) {
      onChange(Number(raw));
    }
  }

  function handleBlur() {
    setFocused(false);
    const n = clamp(Number(text) || min);
    setText(String(n));
    onChange(n);
  }

  function stepBy(delta: number) {
    const n = clamp(value + delta);
    setText(String(n));
    onChange(n);
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <Label>{label}</Label>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
      <div className="flex items-center rounded-xl border border-border bg-white">
        <button type="button" onClick={() => stepBy(-step)} className="flex h-10 w-10 shrink-0 items-center justify-center text-muted-foreground hover:text-navy-900">
          <Minus className="h-4 w-4" />
        </button>
        <input
          type="number"
          value={text}
          onFocus={() => setFocused(true)}
          onChange={handleChange}
          onBlur={handleBlur}
          className="h-10 w-full min-w-0 border-x border-border bg-transparent text-center text-sm focus:outline-none"
        />
        <button type="button" onClick={() => stepBy(step)} className="flex h-10 w-10 shrink-0 items-center justify-center text-muted-foreground hover:text-navy-900">
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
