'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatTenge } from '@/lib/utils';
import { calcItemCost, calcInstallCost, calcSheetLayout, resolveNorm, averageHours, type ProductionSettingsRow } from '@/lib/erp-pricing';
import { SheetPreview } from '@/components/sheet-preview';
import { TypeExamplesGallery } from '@/components/type-examples-gallery';
import type { ProductType, ProductCategory, InstallCity, InstallComplexity } from '@/lib/types';

export interface CalculatorDraft {
  productType: ProductType;
  params: Record<string, unknown>;
  manufactureHours: number;
  installComplexity: InstallComplexity | null;
  installCity: InstallCity;
  sundayClientRequested: boolean;
  itemCost: number;
  installCost: number;
  finalCost: number;
  adjustmentComment: string | null;
}

type Step = 'category' | 'type' | 'form';

// Единый калькулятор — используется и на публичном сайте, и внутри
// заявки в админке, чтобы функциональность совпадала на 100%.
// Логика: категория → изделие → специализированный расчёт (п.22 ТЗ).
// mode="public"  — калькулятор на лендинге: без кнопок "Добавить/Отмена",
//                   вместо этого ссылка "Открыть КП".
// mode="item"    — калькулятор внутри заявки в админке: с кнопками
//                   "Добавить в заявку" / "Отмена" (onAdd обязателен).
export function ProductCalculator({
  categories,
  productTypes,
  settings,
  mode = 'item',
  onAdd,
  onCancel,
}: {
  categories: ProductCategory[];
  productTypes: ProductType[];
  settings: ProductionSettingsRow;
  mode?: 'public' | 'item';
  onAdd?: (draft: CalculatorDraft) => void;
  onCancel?: () => void;
}) {
  const [step, setStep] = useState<Step>('category');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [productKey, setProductKey] = useState('');
  const [widthM, setWidthM] = useState(2);
  const [heightM, setHeightM] = useState(1);
  const [count, setCount] = useState(1);
  const [city, setCity] = useState<InstallCity>('taraz');
  const [complexity, setComplexity] = useState<InstallComplexity>('light');
  const [sundayRequested, setSundayRequested] = useState(false);
  const [priceOverride, setPriceOverride] = useState<string>('');
  const [adjustmentComment, setAdjustmentComment] = useState('');
  const [signText, setSignText] = useState('');

  const activeCategories = categories.filter((c) => c.active).sort((a, b) => a.sort_order - b.sort_order);
  const typesInCategory = productTypes.filter((p) => p.category_id === categoryId && p.active);
  const productType = productTypes.find((p) => p.key === productKey);

  const isSheetBased = !!productType?.sheet_tiers?.length;

  const preview = useMemo(() => {
    if (!productType) return null;
    const { area, cost: areaCost } = calcItemCost(productType, { widthM, heightM, count });
    const sheetLayout = isSheetBased ? calcSheetLayout(productType, widthM, heightM) : null;
    const itemCost = sheetLayout ? sheetLayout.cost : areaCost;
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
  }, [productType, isSheetBased, widthM, heightM, count, city, complexity, sundayRequested, settings]);

  function selectCategory(id: string) {
    setCategoryId(id);
    setStep('type');
  }

  function selectType(key: string) {
    setProductKey(key);
    setPriceOverride('');
    setAdjustmentComment('');
    setStep('form');
  }

  function backToCategories() {
    setStep('category');
    setCategoryId(null);
    setProductKey('');
  }

  function backToTypes() {
    setStep('type');
    setProductKey('');
  }

  function buildDraft(): CalculatorDraft {
    const calculated = preview!.itemCost + preview!.installCost;
    const finalCost = priceOverride !== '' ? Number(priceOverride) : calculated;
    return {
      productType: productType!,
      params: productType!.unit === 'm2' ? { widthM, heightM } : { count },
      manufactureHours: preview!.manufactureHours,
      installComplexity: productType!.install_mode === 'complexity' ? complexity : null,
      installCity: city,
      sundayClientRequested: sundayRequested,
      itemCost: preview!.itemCost,
      installCost: preview!.installCost,
      finalCost,
      adjustmentComment: finalCost !== calculated ? (adjustmentComment || null) : null,
    };
  }

  function handleAdd() {
    onAdd?.(buildDraft());
  }

  const kpUrl = productType
    ? `/api/kp?productKey=${encodeURIComponent(productType.key)}&widthM=${widthM}&heightM=${heightM}&count=${count}&city=${city}&complexity=${complexity}&sunday=${sundayRequested}`
    : '#';

  return (
    <div className="space-y-4 rounded-xl border border-border bg-mist-50 p-4">
      {step === 'category' && (
        <div>
          <Label className="mb-2 block">Категория продукции</Label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {activeCategories.map((c) => (
              <button
                key={c.id}
                onClick={() => selectCategory(c.id)}
                className="rounded-xl border border-border bg-white p-3 text-left text-sm font-medium text-navy-900 transition-colors hover:border-blue-500 hover:bg-blue-50"
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'type' && (
        <div>
          <button onClick={backToCategories} className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-navy-900">
            <ArrowLeft className="h-3.5 w-3.5" /> Назад к категориям
          </button>
          <Label className="mb-2 block">Тип изделия</Label>
          {typesInCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground">В этой категории пока нет изделий — скоро появятся.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {typesInCategory.map((p) => (
                <button
                  key={p.key}
                  onClick={() => selectType(p.key)}
                  className="rounded-xl border border-border bg-white p-3 text-left text-sm font-medium text-navy-900 transition-colors hover:border-blue-500 hover:bg-blue-50"
                >
                  {p.name}
                  {p.needs_review && <span className="ml-1 text-xs font-normal text-amber-600">(расчёт вручную)</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 'form' && productType && preview && (
        <div className="space-y-4">
          <button onClick={backToTypes} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-navy-900">
            <ArrowLeft className="h-3.5 w-3.5" /> {productType.name}
          </button>

          <TypeExamplesGallery productTypeId={productType.id} productTypeKey={productType.key} />

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

          {isSheetBased && (
            <>
              <div className="space-y-2">
                <Label>Текст на вывеске (необязательно, для визуализации)</Label>
                <Input value={signText} onChange={(e) => setSignText(e.target.value)} placeholder="Например: Kubik" />
              </div>
              <SheetPreview productType={productType} widthM={widthM} heightM={heightM} text={signText} />
            </>
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
                    <option value="light">Лёгкий</option>
                    <option value="medium">Средний</option>
                    <option value="medium_large">Средний, вывеска &gt;6м</option>
                    <option value="hard">Сложный</option>
                  </select>
                </div>
              )}
              <label className="col-span-2 flex items-center gap-2 text-sm text-navy-700">
                <input type="checkbox" checked={sundayRequested} onChange={(e) => setSundayRequested(e.target.checked)} />
                Монтаж именно в воскресенье, по требованию клиента
              </label>
            </div>
          )}

          <div className="flex flex-col gap-2 rounded-lg bg-white px-4 py-3 text-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-muted-foreground">
                Изделие: {formatTenge(preview.itemCost)} · Монтаж: {preview.installCost > 0 ? formatTenge(preview.installCost) : 'в цене'}
              </span>
              <span className="text-lg font-bold text-navy-900">
                Расчётная: {formatTenge(preview.itemCost + preview.installCost)}
              </span>
            </div>
            {mode === 'item' && (
              <div className="grid grid-cols-1 gap-2 border-t border-border pt-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Итоговая цена (можно скорректировать)</Label>
                  <Input
                    type="number"
                    placeholder={String(preview.itemCost + preview.installCost)}
                    value={priceOverride}
                    onChange={(e) => setPriceOverride(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Причина скидки/наценки (если меняли цену)</Label>
                  <Input value={adjustmentComment} onChange={(e) => setAdjustmentComment(e.target.value)} placeholder="Скидка постоянному клиенту…" />
                </div>
              </div>
            )}
          </div>

          {mode === 'item' ? (
            <div className="flex gap-2">
              {onCancel && <Button variant="outline" className="flex-1" onClick={onCancel}>Отмена</Button>}
              <Button className="flex-1" onClick={handleAdd}>Добавить в заявку</Button>
            </div>
          ) : (
            <a href={kpUrl} target="_blank" className="block w-full rounded-full bg-blue-gradient py-2.5 text-center text-sm font-medium text-white hover:brightness-110">
              Открыть коммерческое предложение →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
