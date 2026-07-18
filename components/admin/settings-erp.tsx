'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ProductType } from '@/lib/types';
import type { ProductionSettingsRow } from '@/lib/erp-pricing';

export function SettingsERP() {
  const [types, setTypes] = useState<ProductType[]>([]);
  const [settings, setSettings] = useState<ProductionSettingsRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const [{ data: typesData }, { data: settingsData }] = await Promise.all([
        supabase.from('product_types').select('*').order('sort_order'),
        supabase.from('production_settings').select('*').single(),
      ]);
      setTypes((typesData as ProductType[]) ?? []);
      setSettings((settingsData as ProductionSettingsRow) ?? null);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateType(id: string, patch: Partial<ProductType>) {
    setTypes((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function updateNormField(typeId: string, index: number, field: 'manufacture_hours_min' | 'manufacture_hours_max', value: number) {
    setTypes((prev) =>
      prev.map((t) => {
        if (t.id !== typeId) return t;
        const norms = [...t.norms];
        norms[index] = { ...norms[index], [field]: value };
        return { ...t, norms };
      })
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      await Promise.all(
        types.map((t) =>
          supabase
            .from('product_types')
            .update({ price_per_unit: t.price_per_unit, norms: t.norms })
            .eq('id', t.id)
        )
      );
      if (settings) {
        await supabase
          .from('production_settings')
          .update({
            daily_capacity_hours: settings.daily_capacity_hours,
            sunday_multiplier: settings.sunday_multiplier,
            weekday_surcharge_small: settings.weekday_surcharge_small,
            install_pricing: settings.install_pricing,
            updated_at: new Date().toISOString(),
          })
          .eq('id', 1);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !settings) return <p className="text-muted-foreground">Загрузка…</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardContent className="space-y-5 pt-5">
          <h2 className="font-semibold text-navy-900">Типы изделий и нормативы времени</h2>
          {types.map((t) => (
            <div key={t.id} className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-navy-900">
                  {t.name}{t.needs_review && <span className="ml-2 text-xs text-amber-600">требует уточнения</span>}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">цена за {t.unit === 'm2' ? 'м²' : 'шт'}</span>
                  <Input
                    type="number"
                    className="w-28"
                    value={t.price_per_unit}
                    onChange={(e) => updateType(t.id, { price_per_unit: Number(e.target.value) })}
                  />
                </div>
              </div>
              {t.norms.map((norm, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="w-24">
                    {norm.max_area_m2 ? `до ${norm.max_area_m2} м²` : 'норматив'}:
                  </span>
                  <Input
                    type="number"
                    step={0.5}
                    className="w-20"
                    value={norm.manufacture_hours_min}
                    onChange={(e) => updateNormField(t.id, i, 'manufacture_hours_min', Number(e.target.value))}
                  />
                  <span>–</span>
                  <Input
                    type="number"
                    step={0.5}
                    className="w-20"
                    value={norm.manufacture_hours_max}
                    onChange={(e) => updateNormField(t.id, i, 'manufacture_hours_max', Number(e.target.value))}
                  />
                  <span>часов изготовления</span>
                </div>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-5">
          <h2 className="font-semibold text-navy-900">Монтаж — Тараз</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Label className="col-span-2">Лёгкий монтаж (мин–макс)</Label>
            <Input type="number" value={settings.install_pricing.taraz.light.min}
              onChange={(e) => setSettings({ ...settings, install_pricing: { ...settings.install_pricing, taraz: { ...settings.install_pricing.taraz, light: { ...settings.install_pricing.taraz.light, min: Number(e.target.value) } } } })} />
            <Input type="number" value={settings.install_pricing.taraz.light.max}
              onChange={(e) => setSettings({ ...settings, install_pricing: { ...settings.install_pricing, taraz: { ...settings.install_pricing.taraz, light: { ...settings.install_pricing.taraz.light, max: Number(e.target.value) } } } })} />

            <Label className="col-span-2">Средний монтаж (мин–макс)</Label>
            <Input type="number" value={settings.install_pricing.taraz.medium.min}
              onChange={(e) => setSettings({ ...settings, install_pricing: { ...settings.install_pricing, taraz: { ...settings.install_pricing.taraz, medium: { ...settings.install_pricing.taraz.medium, min: Number(e.target.value) } } } })} />
            <Input type="number" value={settings.install_pricing.taraz.medium.max}
              onChange={(e) => setSettings({ ...settings, install_pricing: { ...settings.install_pricing, taraz: { ...settings.install_pricing.taraz, medium: { ...settings.install_pricing.taraz.medium, max: Number(e.target.value) } } } })} />

            <Label>Средний, вывеска &gt;6м</Label>
            <Input type="number" value={settings.install_pricing.taraz.medium_large}
              onChange={(e) => setSettings({ ...settings, install_pricing: { ...settings.install_pricing, taraz: { ...settings.install_pricing.taraz, medium_large: Number(e.target.value) } } })} />

            <Label>Сложный</Label>
            <Input type="number" value={settings.install_pricing.taraz.hard}
              onChange={(e) => setSettings({ ...settings, install_pricing: { ...settings.install_pricing, taraz: { ...settings.install_pricing.taraz, hard: Number(e.target.value) } } })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-5">
          <h2 className="font-semibold text-navy-900">Другие города (фиксированная стоимость)</h2>
          <div className="flex items-center gap-3">
            <span className="flex-1 text-sm text-navy-700">Шымкент</span>
            <Input type="number" className="w-32" value={settings.install_pricing.shymkent}
              onChange={(e) => setSettings({ ...settings, install_pricing: { ...settings.install_pricing, shymkent: Number(e.target.value) } })} />
          </div>
          <div className="flex items-center gap-3">
            <span className="flex-1 text-sm text-navy-700">Алматы</span>
            <Input type="number" className="w-32" value={settings.install_pricing.almaty}
              onChange={(e) => setSettings({ ...settings, install_pricing: { ...settings.install_pricing, almaty: Number(e.target.value) } })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-5">
          <h2 className="font-semibold text-navy-900">Планировщик и доплаты</h2>
          <div className="flex items-center gap-3">
            <span className="flex-1 text-sm text-navy-700">Мощность цеха, часов/день</span>
            <Input type="number" className="w-32" value={settings.daily_capacity_hours}
              onChange={(e) => setSettings({ ...settings, daily_capacity_hours: Number(e.target.value) })} />
          </div>
          <div className="flex items-center gap-3">
            <span className="flex-1 text-sm text-navy-700">Множитель за воскресенье по требованию клиента</span>
            <Input type="number" step={0.1} className="w-32" value={settings.sunday_multiplier}
              onChange={(e) => setSettings({ ...settings, sunday_multiplier: Number(e.target.value) })} />
          </div>
          <div className="flex items-center gap-3">
            <span className="flex-1 text-sm text-navy-700">Доплата за срочность мелкого заказа (пн–чт)</span>
            <Input type="number" className="w-32" value={settings.weekday_surcharge_small}
              onChange={(e) => setSettings({ ...settings, weekday_surcharge_small: Number(e.target.value) })} />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Сохраняем…' : saved ? 'Сохранено ✓' : 'Сохранить изменения'}
      </Button>
    </div>
  );
}
