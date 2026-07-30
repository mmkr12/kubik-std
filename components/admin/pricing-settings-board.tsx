'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DEFAULT_PRICING_CONFIG,
  LETTER_TYPE_LABELS,
  type LightLettersPricingConfig,
  type Diapason,
  type LetterType,
} from '@/lib/light-letters-pricing';

const DIAPASONS: { key: Diapason; label: string }[] = [
  { key: '50-250', label: '50–250 мм' },
  { key: '251-750', label: '251–750 мм' },
  { key: '751-1200', label: '751–1200 мм' },
];

const LETTER_TYPES = Object.keys(LETTER_TYPE_LABELS) as LetterType[];

// Глубокое клонирование — чтобы правки в форме не мутировали объект,
// на который завязан рендер, до нажатия "Сохранить".
function clone(config: LightLettersPricingConfig): LightLettersPricingConfig {
  return JSON.parse(JSON.stringify(config));
}

export function PricingSettingsBoard() {
  const [config, setConfig] = useState<LightLettersPricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  async function loadAll() {
    setLoading(true);
    const { data } = await supabase.from('production_settings').select('light_letters_pricing').single();
    setConfig(clone((data?.light_letters_pricing as LightLettersPricingConfig | undefined) ?? DEFAULT_PRICING_CONFIG));
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    setError(null);
    try {
      const { error: err } = await supabase
        .from('production_settings')
        .update({ light_letters_pricing: config })
        .eq('id', 1);
      if (err) {
        setError(err.message);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !config) return <p className="text-muted-foreground">Загрузка…</p>;

  return (
    <div className="max-w-3xl space-y-6 pb-24">
      <p className="text-sm text-muted-foreground">
        Цены калькуляторов «Световые буквы на каркасе» и «Световые буквы на подложке» — сейчас
        рабочих типов изделий. Правки применяются сразу после сохранения, без деплоя.
      </p>

      <Card>
        <CardContent className="space-y-3 pt-5">
          <h2 className="font-semibold text-navy-900">Изготовление букв — ₸ за мм высоты</h2>
          <div className="grid grid-cols-3 gap-3">
            {DIAPASONS.map((d) => (
              <NumberField
                key={d.key}
                label={d.label}
                value={config.ratePerMm[d.key]}
                onChange={(v) => setConfig({ ...config, ratePerMm: { ...config.ratePerMm, [d.key]: v } })}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-5">
          <h2 className="font-semibold text-navy-900">Глубина букв — % от нормы</h2>
          <p className="text-xs text-muted-foreground">Между точками и за их пределами процент вычисляется по наклону ближайшего отрезка.</p>
          <div className="grid grid-cols-3 gap-3">
            {config.depthAnchors.map(([mm, pct], i) => (
              <NumberField
                key={mm}
                label={`${mm} мм, %`}
                value={Math.round(pct * 1000) / 10}
                step={0.1}
                onChange={(v) => {
                  const next = [...config.depthAnchors] as typeof config.depthAnchors;
                  next[i] = [mm, v / 100];
                  setConfig({ ...config, depthAnchors: next });
                }}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-5">
          <h2 className="font-semibold text-navy-900">Множитель по типу свечения</h2>
          <p className="text-xs text-muted-foreground">Пусто — тип недоступен в этом диапазоне высоты.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-2">Тип свечения</th>
                  {DIAPASONS.map((d) => <th key={d.key} className="pb-2 px-1 font-medium">{d.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {LETTER_TYPES.map((t) => (
                  <tr key={t}>
                    <td className="py-1 pr-2 text-navy-800">{LETTER_TYPE_LABELS[t]}</td>
                    {DIAPASONS.map((d) => {
                      const val = config.typeMultipliers[t][d.key];
                      return (
                        <td key={d.key} className="py-1 px-1">
                          <Input
                            type="number"
                            step={0.05}
                            className="h-9 w-20"
                            value={val ?? ''}
                            placeholder="—"
                            onChange={(e) => {
                              const raw = e.target.value;
                              const next = raw === '' ? null : Number(raw);
                              setConfig({
                                ...config,
                                typeMultipliers: {
                                  ...config.typeMultipliers,
                                  [t]: { ...config.typeMultipliers[t], [d.key]: next },
                                },
                              });
                            }}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="max-w-xs pt-2">
            <NumberField
              label="Множитель «золото/серебро»"
              value={config.goldSilverMultiplier}
              step={0.05}
              onChange={(v) => setConfig({ ...config, goldSilverMultiplier: v })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-5">
          <h2 className="font-semibold text-navy-900">Подсветка</h2>
          <p className="text-xs text-muted-foreground">Количество на одну букву, по диапазону высоты.</p>
          <div className="grid grid-cols-3 gap-3">
            {DIAPASONS.map((d) => (
              <div key={d.key} className="space-y-2 rounded-lg border border-border p-2.5">
                <p className="text-xs font-medium text-navy-700">{d.label}</p>
                <NumberField
                  label="Модулей/букву"
                  value={config.ledPerLetter[d.key].modules}
                  onChange={(v) => setConfig({ ...config, ledPerLetter: { ...config.ledPerLetter, [d.key]: { ...config.ledPerLetter[d.key], modules: v } } })}
                />
                <NumberField
                  label="Ленты, м/букву"
                  step={0.1}
                  value={config.ledPerLetter[d.key].tapeM}
                  onChange={(v) => setConfig({ ...config, ledPerLetter: { ...config.ledPerLetter, [d.key]: { ...config.ledPerLetter[d.key], tapeM: v } } })}
                />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Цена модуля, ₸" value={config.ledModuleUnitPrice} onChange={(v) => setConfig({ ...config, ledModuleUnitPrice: v })} />
            <NumberField label="Цена ленты, ₸/м" value={config.ledTapeUnitPricePerM} onChange={(v) => setConfig({ ...config, ledTapeUnitPricePerM: v })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-5">
          <h2 className="font-semibold text-navy-900">Блоки питания</h2>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Модулей на 1 блок" value={config.psuModuleCapacity} onChange={(v) => setConfig({ ...config, psuModuleCapacity: v })} />
            <NumberField label="Метров ленты на 1 блок" value={config.psuTapeCapacityM} onChange={(v) => setConfig({ ...config, psuTapeCapacityM: v })} />
            <NumberField
              label="Запас перед след. блоком, %"
              value={Math.round(config.psuGraceFraction * 1000) / 10}
              step={1}
              onChange={(v) => setConfig({ ...config, psuGraceFraction: v / 100 })}
            />
            <NumberField label="Цена IP43 (открытый), ₸" value={config.psuUnitPrice.ip43} onChange={(v) => setConfig({ ...config, psuUnitPrice: { ...config.psuUnitPrice, ip43: v } })} />
            <NumberField label="Цена IP67 (закрытый), ₸" value={config.psuUnitPrice.ip67} onChange={(v) => setConfig({ ...config, psuUnitPrice: { ...config.psuUnitPrice, ip67: v } })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-5">
          <h2 className="font-semibold text-navy-900">Каркас</h2>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Шаг, метров металла" value={config.frameStepMeters} onChange={(v) => setConfig({ ...config, frameStepMeters: v })} />
            <NumberField label="Цена за шаг, ₸" value={config.frameStepPrice} onChange={(v) => setConfig({ ...config, frameStepPrice: v })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-5">
          <h2 className="font-semibold text-navy-900">Подложка (композит) — «Световые буквы на подложке»</h2>
          <div className="max-w-xs">
            <NumberField label="Цена листа 120×240 см, ₸" value={config.compositeSheetPrice} onChange={(v) => setConfig({ ...config, compositeSheetPrice: v })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-5">
          <h2 className="font-semibold text-navy-900">Монтаж — Тараз, по сложности</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <NumberField label="Лёгкий" value={config.complexityPrice.light} onChange={(v) => setConfig({ ...config, complexityPrice: { ...config.complexityPrice, light: v } })} />
            <NumberField label="Средний" value={config.complexityPrice.medium} onChange={(v) => setConfig({ ...config, complexityPrice: { ...config.complexityPrice, medium: v } })} />
            <NumberField label="Средний (габарит)" value={config.complexityPrice.medium_large} onChange={(v) => setConfig({ ...config, complexityPrice: { ...config.complexityPrice, medium_large: v } })} />
            <NumberField label="Сложный" value={config.complexityPrice.hard} onChange={(v) => setConfig({ ...config, complexityPrice: { ...config.complexityPrice, hard: v } })} />
          </div>
          <h2 className="pt-2 font-semibold text-navy-900">Монтаж — другие города (фикс.)</h2>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Шымкент" value={config.cityFixedPrice.shymkent ?? 0} onChange={(v) => setConfig({ ...config, cityFixedPrice: { ...config.cityFixedPrice, shymkent: v } })} />
            <NumberField label="Алматы" value={config.cityFixedPrice.almaty ?? 0} onChange={(v) => setConfig({ ...config, cityFixedPrice: { ...config.cityFixedPrice, almaty: v } })} />
          </div>
          <h2 className="pt-2 font-semibold text-navy-900">Доставка (без монтажа)</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <NumberField label="Самовывоз" value={config.deliveryPrice.pickup} onChange={(v) => setConfig({ ...config, deliveryPrice: { ...config.deliveryPrice, pickup: v } })} />
            <NumberField label="Тараз" value={config.deliveryPrice.taraz} onChange={(v) => setConfig({ ...config, deliveryPrice: { ...config.deliveryPrice, taraz: v } })} />
            <NumberField label="Шымкент" value={config.deliveryPrice.shymkent} onChange={(v) => setConfig({ ...config, deliveryPrice: { ...config.deliveryPrice, shymkent: v } })} />
            <NumberField label="Алматы" value={config.deliveryPrice.almaty} onChange={(v) => setConfig({ ...config, deliveryPrice: { ...config.deliveryPrice, almaty: v } })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-5">
          <h2 className="font-semibold text-navy-900">Наценка и срочность</h2>
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="«Изготовление» — наценка, % от материала"
              value={Math.round(config.productionPct * 1000) / 10}
              step={1}
              onChange={(v) => setConfig({ ...config, productionPct: v / 100 })}
            />
            <NumberField
              label="Срочно — множитель"
              value={config.urgentMultiplier}
              step={0.05}
              onChange={(v) => setConfig({ ...config, urgentMultiplier: v })}
            />
          </div>
        </CardContent>
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between border-t border-border bg-white px-8 py-4 md:left-60">
        {error ? (
          <p className="text-sm text-red-600">Ошибка сохранения: {error}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Изменения применятся сразу после сохранения.</p>
        )}
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Сохраняем…' : saved ? 'Сохранено ✓' : 'Сохранить'}
        </Button>
      </div>
    </div>
  );
}

function NumberField({
  label, value, onChange, step = 1,
}: {
  label: string; value: number; onChange: (v: number) => void; step?: number;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type="number" step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-9" />
    </div>
  );
}
