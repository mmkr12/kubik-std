'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ProductType, ProductCategory } from '@/lib/types';
import type { ProductionSettingsRow } from '@/lib/erp-pricing';

export function SettingsERP() {
  const [types, setTypes] = useState<ProductType[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddType, setShowAddType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeCategoryId, setNewTypeCategoryId] = useState('');
  const [newTypeUnit, setNewTypeUnit] = useState<'m2' | 'pcs'>('m2');
  const [settings, setSettings] = useState<ProductionSettingsRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const supabase = createClient();

  async function loadAll() {
    const [{ data: typesData }, { data: catsData }, { data: settingsData }] = await Promise.all([
      supabase.from('product_types').select('*').order('sort_order'),
      supabase.from('product_categories').select('*').order('sort_order'),
      supabase.from('production_settings').select('*').single(),
    ]);
    setTypes((typesData as ProductType[]) ?? []);
    setCategories((catsData as ProductCategory[]) ?? []);
    setSettings((settingsData as ProductionSettingsRow) ?? null);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateType(id: string, patch: Partial<ProductType>) {
    setTypes((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  async function toggleTypeActive(t: ProductType) {
    await supabase.from('product_types').update({ active: !t.active }).eq('id', t.id);
    loadAll();
  }

  async function toggleCategoryActive(c: ProductCategory) {
    await supabase.from('product_categories').update({ active: !c.active }).eq('id', c.id);
    loadAll();
  }

  async function renameCategory(id: string, name: string) {
    await supabase.from('product_categories').update({ name }).eq('id', id);
  }

  async function addCategory() {
    if (!newCategoryName.trim()) return;
    const key = newCategoryName.trim().toLowerCase().replace(/[^a-zа-я0-9]+/gi, '_');
    await supabase.from('product_categories').insert({ key: `${key}_${Date.now()}`, name: newCategoryName, sort_order: categories.length + 1 });
    setNewCategoryName('');
    loadAll();
  }

  async function addProductType() {
    if (!newTypeName.trim() || !newTypeCategoryId) return;
    const key = `${newTypeName.trim().toLowerCase().replace(/[^a-zа-я0-9]+/gi, '_')}_${Date.now()}`;
    await supabase.from('product_types').insert({
      key,
      name: newTypeName,
      unit: newTypeUnit,
      category_id: newTypeCategoryId,
      install_mode: 'manual',
      schedule_days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
      norms: [],
      needs_review: true,
      sort_order: types.length + 1,
    });
    setNewTypeName('');
    setNewTypeCategoryId('');
    setShowAddType(false);
    loadAll();
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
        <CardContent className="space-y-3 pt-5">
          <h2 className="font-semibold text-navy-900">Категории продукции</h2>
          {categories.map((c) => (
            <div key={c.id} className="flex items-center gap-3">
              <Input
                defaultValue={c.name}
                onBlur={(e) => renameCategory(c.id, e.target.value)}
                className="flex-1"
              />
              <button
                onClick={() => toggleCategoryActive(c)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${c.active ? 'bg-emerald-50 text-emerald-700' : 'bg-mist-100 text-muted-foreground'}`}
              >
                {c.active ? 'Включена' : 'Скрыта'}
              </button>
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <Input placeholder="Новая категория…" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="flex-1" />
            <Button size="sm" onClick={addCategory}>Добавить</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5 pt-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-navy-900">Типы изделий и нормативы времени</h2>
            <Button size="sm" variant="outline" onClick={() => setShowAddType(!showAddType)}>Добавить изделие</Button>
          </div>

          {showAddType && (
            <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
              <Input placeholder="Название изделия" value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} />
              <div className="flex gap-2">
                <select value={newTypeCategoryId} onChange={(e) => setNewTypeCategoryId(e.target.value)} className="h-10 flex-1 rounded-lg border border-border bg-white px-3 text-sm">
                  <option value="">Категория…</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select value={newTypeUnit} onChange={(e) => setNewTypeUnit(e.target.value as 'm2' | 'pcs')} className="h-10 rounded-lg border border-border bg-white px-3 text-sm">
                  <option value="m2">По площади (м²)</option>
                  <option value="pcs">Поштучно</option>
                </select>
              </div>
              <Button size="sm" onClick={addProductType}>Создать</Button>
              <p className="text-xs text-muted-foreground">Нормативы и цену можно будет задать сразу после создания, ниже в списке.</p>
            </div>
          )}

          {types.map((t) => (
            <div key={t.id} className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-navy-900">
                  {t.name}{t.needs_review && <span className="ml-2 text-xs text-amber-600">требует уточнения</span>}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleTypeActive(t)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${t.active ? 'bg-emerald-50 text-emerald-700' : 'bg-mist-100 text-muted-foreground'}`}
                  >
                    {t.active ? 'Показано' : 'Скрыто'}
                  </button>
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
