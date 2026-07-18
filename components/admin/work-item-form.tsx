'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatTenge } from '@/lib/utils';
import { calcItemCost, calcInstallCost, resolveNorm, averageHours, type ProductionSettingsRow } from '@/lib/erp-pricing';
import type { ProductType, InstallCity, InstallComplexity } from '@/lib/types';

export interface NewItemDraft {
  productType: ProductType;
  params: Record<string, unknown>;
  manufactureHours: number;
  installComplexity: InstallComplexity | null;
  installCity: InstallCity;
  sundayClientRequested: boolean;
  itemCost: number;
  installCost: number;
}

export function WorkItemForm({
  productTypes,
  settings,
  onAdd,
  onCancel,
}: {
  productTypes: ProductType[];
  settings: ProductionSettingsRow;
  onAdd: (draft: NewItemDraft) => void;
  onCancel: () => void;
}) {
  const [productKey, setProductKey] = useState(productTypes[0]?.key ?? '');
  const [widthM, setWidthM] = useState(2);
  const [heightM, setHeightM] = useState(1);
  const [count, setCount] = useState(1);
  const [city, setCity] = useState<InstallCity>('taraz');
  const [complexity, setComplexity] = useState<InstallComplexity>('light');
  const [sundayRequested, setSundayRequested] = useState(false);

  const productType = productTypes.find((p) => p.key === productKey) ?? productTypes[0];

  const preview = useMemo(() => {
    if (!productType) return null;
    const { area, cost: itemCost } = calcItemCost(productType, { widthM, heightM, count });
    const norm = resolveNorm(productType, area);
    const manufactureHours = averageHours(norm, 'manufacture');
    const installCost = calcInstallCost({
      installMode: productType.install_mode,
      city,
      complexity,
      sundayRequested,
      settings,
    });
    return { area, itemCost, manufactureHours, installCost };
  }, [productType, widthM, heightM, count, city, complexity, sundayRequested, settings]);

  if (!productType || !preview) return null;

  function handleAdd() {
    onAdd({
      productType,
      params: productType.unit === 'm2' ? { widthM, heightM } : { count },
      manufactureHours: preview!.manufactureHours,
      installComplexity: productType.install_mode === 'complexity' ? complexity : null,
      installCity: city,
      sundayClientRequested: sundayRequested,
      itemCost: preview!.itemCost,
      installCost: preview!.installCost,
    });
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-mist-50 p-4">
      <div className="space-y-2">
        <Label>Тип изделия</Label>
        <select
          value={productKey}
          onChange={(e) => setProductKey(e.target.value)}
          className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm"
        >
          {productTypes.map((p) => (
            <option key={p.key} value={p.key}>
              {p.name}{p.needs_review ? ' (норматив требует уточнения)' : ''}
            </option>
          ))}
        </select>
      </div>

      {productType.unit === 'm2' ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Ширина, м</Label>
            <Input type="number" min={0.1} step={0.1} value={widthM} onChange={(e) => setWidthM(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Высота, м</Label>
            <Input type="number" min={0.1} step={0.1} value={heightM} onChange={(e) => setHeightM(Number(e.target.value))} />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Label>Количество, шт</Label>
          <Input type="number" min={1} value={count} onChange={(e) => setCount(Number(e.target.value))} />
        </div>
      )}

      {productType.install_mode === 'complexity' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Город монтажа</Label>
            <select value={city} onChange={(e) => setCity(e.target.value as InstallCity)} className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm">
              <option value="taraz">Тараз</option>
              <option value="shymkent">Шымкент</option>
              <option value="almaty">Алматы</option>
            </select>
          </div>
          {city === 'taraz' && (
            <div className="space-y-2">
              <Label>Сложность монтажа</Label>
              <select value={complexity} onChange={(e) => setComplexity(e.target.value as InstallComplexity)} className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm">
                <option value="light">Лёгкий (10–15 тыс)</option>
                <option value="medium">Средний (25–30 тыс)</option>
                <option value="medium_large">Средний, вывеска &gt;6м (40 тыс)</option>
                <option value="hard">Сложный (60 тыс)</option>
              </select>
            </div>
          )}
          <label className="col-span-2 flex items-center gap-2 text-sm text-navy-700">
            <input type="checkbox" checked={sundayRequested} onChange={(e) => setSundayRequested(e.target.checked)} />
            Клиент настоял на монтаже именно в воскресенье (стоимость ×{settings.sunday_multiplier})
          </label>
        </div>
      )}

      <div className="flex items-center justify-between rounded-lg bg-white px-4 py-3 text-sm">
        <span className="text-muted-foreground">
          Изделие: {formatTenge(preview.itemCost)} · Монтаж: {preview.installCost > 0 ? formatTenge(preview.installCost) : 'в цене'} · ~{preview.manufactureHours} ч
        </span>
        <span className="font-semibold text-navy-900">{formatTenge(preview.itemCost + preview.installCost)}</span>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onCancel}>Отмена</Button>
        <Button className="flex-1" onClick={handleAdd}>Добавить в заявку</Button>
      </div>
    </div>
  );
}
