'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { TrustBadges } from '@/components/calculators/ui/trust-badges';
import { LightLettersOnFrameCalculator, type LightLettersDraft } from '@/components/calculators/light-letters-on-frame-calculator';

const CATEGORIES = [
  { key: 'light_signage', name: 'Световые вывески', ready: true },
  { key: 'additional', name: 'Дополнительно', ready: false },
  { key: 'printing', name: 'Полиграфия', ready: false },
];

const TYPES = [
  { key: 'on_frame', name: 'Световые буквы\nна каркасе', icon: '/calc/kategorii/na_karkase.png', ready: true },
  { key: 'on_backing', name: 'Световые буквы\nна подложке', icon: '/calc/kategorii/na_podlojke.png', ready: false },
  { key: 'acrylic_box', name: 'Световой короб\nиз акрила', icon: '/calc/kategorii/iz_akrila.png', ready: false },
  { key: 'composite_box', name: 'Световой короб\nиз композита', icon: '/calc/kategorii/iz_kompozita.png', ready: false },
  { key: 'individual', name: 'Проект\nиндивидуальный', icon: '/calc/kategorii/individualnyi.png', ready: false },
];

export function MainCalculator({
  mode = 'public',
  onAdd,
  onCancel,
}: {
  mode?: 'public' | 'item';
  onAdd?: (draft: LightLettersDraft) => void;
  onCancel?: () => void;
}) {
  const [categoryKey, setCategoryKey] = useState('light_signage');
  const [typeKey, setTypeKey] = useState('on_frame');

  const category = CATEGORIES.find((c) => c.key === categoryKey)!;
  const type = TYPES.find((t) => t.key === typeKey)!;

  return (
    <div className="space-y-4">
      {mode === 'public' && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-navy-900">Рассчитайте стоимость вывески</h2>
            <p className="text-sm text-muted-foreground">Получите расчёт и коммерческое предложение за 1 минуту</p>
          </div>
          <TrustBadges compact />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setCategoryKey(c.key)}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-medium transition-colors',
              categoryKey === c.key ? 'bg-blue-gradient text-white' : 'border border-border bg-white text-navy-700 hover:bg-mist-50'
            )}
          >
            {c.name}
          </button>
        ))}
      </div>

      {!category.ready ? (
        <div className="rounded-xl border border-dashed border-border bg-mist-50 p-10 text-center text-muted-foreground">
          В разработке — скоро здесь появится калькулятор.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {TYPES.map((t) => (
              <button
                key={t.key}
                onClick={() => setTypeKey(t.key)}
                className={cn(
                  'flex min-w-0 flex-1 basis-[120px] items-center gap-2 rounded-xl border-2 bg-white px-3 py-2.5 text-left transition-colors sm:basis-[160px]',
                  typeKey === t.key ? 'border-blue-500' : 'border-mist-200 hover:border-mist-300'
                )}
              >
                <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-mist-100">
                  <Image src={t.icon} alt="" fill className="object-cover" />
                </span>
                <span className={cn('hidden whitespace-pre-line text-xs font-semibold leading-tight sm:block', typeKey === t.key ? 'text-blue-600' : 'text-navy-700')}>
                  {t.name}
                </span>
              </button>
            ))}
          </div>

          {!type.ready ? (
            <div className="rounded-xl border border-dashed border-border bg-mist-50 p-10 text-center text-muted-foreground">
              В разработке — скоро здесь появится калькулятор.
            </div>
          ) : (
            <LightLettersOnFrameCalculator mode={mode} onAdd={onAdd} onCancel={onCancel} />
          )}
        </>
      )}
    </div>
  );
}
