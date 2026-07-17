'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatTenge } from '@/lib/utils';
import { calculatePrice, DEFAULT_SETTINGS } from '@/lib/pricing';

const SIGN_TYPES = Object.keys(DEFAULT_SETTINGS.sign_type_prices);

export function Calculator() {
  const [signType, setSignType] = useState(SIGN_TYPES[0]);
  const [widthM, setWidthM] = useState(4);
  const [heightCm, setHeightCm] = useState(60);
  const [backlight, setBacklight] = useState(true);
  const [result, setResult] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCalculate() {
    setLoading(true);
    try {
      const res = await fetch('/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signType, widthM, heightCm, backlight }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data.total);
      } else {
        setResult(calculatePrice({ signType, widthM, heightCm, backlight }));
      }
    } catch {
      setResult(calculatePrice({ signType, widthM, heightCm, backlight }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div id="calculator" className="rounded-2xl border border-border bg-white p-6 card-shadow md:p-8">
      <h3 className="mb-1 text-xl font-semibold text-navy-900">Рассчитайте стоимость вашей вывески</h3>
      <p className="mb-6 text-sm text-muted-foreground">Получите расчёт и коммерческое предложение за 1 минуту</p>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="space-y-2">
          <Label>Тип вывески</Label>
          <select
            value={signType}
            onChange={(e) => setSignType(e.target.value)}
            className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {SIGN_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Размер ширины (м)</Label>
          <Input type="number" min={0.5} step={0.1} value={widthM} onChange={(e) => setWidthM(Number(e.target.value))} />
        </div>
        <div className="space-y-2">
          <Label>Высота см (см)</Label>
          <Input type="number" min={10} step={5} value={heightCm} onChange={(e) => setHeightCm(Number(e.target.value))} />
        </div>
        <div className="space-y-2">
          <Label>Подсветка</Label>
          <select
            value={backlight ? 'yes' : 'no'}
            onChange={(e) => setBacklight(e.target.value === 'yes')}
            className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <option value="yes">Да</option>
            <option value="no">Нет</option>
          </select>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <Button onClick={handleCalculate} disabled={loading}>
          {loading ? 'Считаем…' : 'Рассчитать стоимость'}
        </Button>
        {result !== null && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <span className="text-2xl font-bold text-navy-900">{formatTenge(result)}</span>
            <a
              href={`/api/kp?signType=${encodeURIComponent(signType)}&widthM=${widthM}&heightCm=${heightCm}&backlight=${backlight}`}
              target="_blank"
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              Открыть КП →
            </a>
          </motion.div>
        )}
      </div>
    </div>
  );
}
