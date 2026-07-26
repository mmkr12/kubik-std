'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function LightLettersPreview({
  mainText,
  additionalText,
  goldSilver,
  hasFrame,
}: {
  mainText: string;
  additionalText: string;
  goldSilver: boolean;
  hasFrame: boolean;
}) {
  const [night, setNight] = useState(true);
  const hasInput = mainText.trim().length > 0 || additionalText.trim().length > 0;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-semibold text-navy-900">{hasInput ? 'Схема' : 'Пример'}</span>
        <div className="flex overflow-hidden rounded-full border border-border text-xs">
          <button onClick={() => setNight(false)} className={cn('px-3 py-1', !night ? 'bg-blue-gradient text-white' : 'text-navy-700')}>День</button>
          <button onClick={() => setNight(true)} className={cn('px-3 py-1', night ? 'bg-blue-gradient text-white' : 'text-navy-700')}>Ночь</button>
        </div>
      </div>

      {!hasInput ? (
        <div className="relative aspect-[2/1] w-full">
          <Image src={night ? '/calc/primer/noch.png' : '/calc/primer/den.png'} alt="Пример вывески" fill className="object-cover" />
        </div>
      ) : (
        <div className={cn('relative flex aspect-[2/1] w-full flex-col items-center justify-center gap-2 px-6', night ? 'bg-navy-950' : 'bg-mist-100')}>
          {hasFrame && <div className={cn('absolute left-6 right-6 top-1/2 h-1 -translate-y-8 rounded', night ? 'bg-navy-700' : 'bg-navy-300')} />}
          {hasFrame && <div className={cn('absolute left-6 right-6 top-1/2 h-1 translate-y-8 rounded', night ? 'bg-navy-700' : 'bg-navy-300')} />}
          <span
            className={cn(
              'text-center text-3xl font-extrabold tracking-wide',
              night ? 'text-white drop-shadow-[0_0_12px_rgba(92,140,255,0.9)]' : 'text-navy-900',
              goldSilver && 'text-amber-400'
            )}
          >
            {mainText || 'Ваш текст'}
          </span>
          {additionalText && (
            <span className={cn('text-center text-sm font-semibold', night ? 'text-white/80' : 'text-navy-700')}>{additionalText}</span>
          )}
        </div>
      )}
    </div>
  );
}
