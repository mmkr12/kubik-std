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
    <div className="space-y-4 px-3 md:px-0">
      {mode === 'public' && (
        <div className="hidden flex-col gap-3 sm:flex-row sm:items-start sm:justify-between md:flex">
          <div>
            <h2 className="text-2xl font-bold text-navy-900">Рассчитайте стоимость вывески</h2>
            <p className="text-sm text-muted-foreground">Получите расчёт и коммерческое предложение за 1 минуту</p>
          </div>
          <TrustBadges compact />
        </div>
      )}

      {/* Категории — на мобильном скрыты полностью, всегда открыты
          сразу на "Световые вывески" (единственная готовая категория). */}
      <div className="hidden flex-wrap gap-2 md:flex">
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
          <div className="flex flex-wrap gap-1.5 pt-2 md:gap-3 md:pt-0">
            {TYPES.map((t) => {
              const active = typeKey === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTypeKey(t.key)}
                  className={cn(
                    'flex h-11 min-w-0 items-center gap-1.5 rounded-xl border-2 bg-white text-left transition-colors md:h-auto',
                    active
                      ? 'flex-1 basis-[130px] px-2 border-blue-500 md:basis-[160px] md:gap-2 md:px-3 md:py-2.5'
                      : 'w-11 justify-center p-0 border-mist-200 hover:border-mist-300 md:w-auto md:flex-1 md:basis-[160px] md:justify-start md:gap-2 md:px-3 md:py-2.5'
                  )}
                >
                  <span className={cn('relative shrink-0 overflow-hidden rounded-lg bg-mist-100', active ? 'h-8 w-8 md:h-9 md:w-9' : 'h-9 w-9')}>
                    <Image src={t.icon} alt="" fill className="object-cover" />
                  </span>
                  <span className={cn('whitespace-pre-line text-[10px] font-semibold leading-[1.15] md:text-xs md:leading-tight', active ? 'block text-blue-600' : 'hidden md:block text-navy-700')}>
                    {t.name}
                  </span>
                </button>
              );
            })}
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
