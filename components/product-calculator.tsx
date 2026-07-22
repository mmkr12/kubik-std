'use client';

import { useEffect, useMemo, useState } from 'react';
import { Ruler } from 'lucide-react';
import { calcItemCost, calcSheetLayout, resolveNorm, averageHours, type ProductionSettingsRow } from '@/lib/erp-pricing';
import { SheetPreview } from '@/components/sheet-preview';
import { TypeExamplesGallery } from '@/components/type-examples-gallery';
import { BackingCalculator } from '@/components/calculators/backing-calculator';
import { LightLettersCalculator } from '@/components/calculators/light-letters-calculator';
import { LightboxCalculator } from '@/components/calculators/lightbox-calculator';
import { InstallOrDeliverySelector, DEFAULT_FULFILMENT, calcFulfilmentCost, type FulfilmentState } from '@/components/calculators/install-delivery-selector';
import { TrustBadges } from '@/components/calculators/ui/trust-badges';
import { CalculatorShell } from '@/components/calculators/ui/calculator-shell';
import { CalculatorFooter } from '@/components/calculators/ui/calculator-footer';
import { AccordionSection } from '@/components/calculators/ui/accordion-section';
import { StepperInput } from '@/components/calculators/ui/stepper-input';
import { PriceBreakdown, type PriceLine } from '@/components/calculators/ui/price-breakdown';
import { StatsRow } from '@/components/calculators/ui/stats-row';
import { cn } from '@/lib/utils';
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
  materialFundBreakdown?: { materialName: string; amount: number }[];
}

// Единый калькулятор — используется и на публичном сайте, и внутри
// заявки в админке, чтобы функциональность совпадала на 100%.
// По умолчанию сразу открыт калькулятор "Световые вывески" (основное
// направление) без промежуточных экранов; сверху — переключатель типов
// изделия этой категории, и отдельно — предложение других категорий.
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
  const activeCategories = useMemo(
    () => [...categories].filter((c) => c.active).sort((a, b) => a.sort_order - b.sort_order),
    [categories]
  );
  const defaultCategoryId = useMemo(() => {
    const main = activeCategories.find((c) => c.key === 'light_signage');
    return main?.id ?? activeCategories[0]?.id ?? null;
  }, [activeCategories]);

  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [productKey, setProductKey] = useState('');
  const [widthM, setWidthM] = useState(2);
  const [heightM, setHeightM] = useState(1);
  const [count, setCount] = useState(1);
  const [fulfilment, setFulfilment] = useState<FulfilmentState>(DEFAULT_FULFILMENT);
  const [priceOverride, setPriceOverride] = useState<string>('');
  const [adjustmentComment, setAdjustmentComment] = useState('');
  const [signText, setSignText] = useState('');

  // Инициализация — сразу категория "Световые вывески" и первый её тип,
  // без выбора вручную.
  useEffect(() => {
    if (!categoryId && defaultCategoryId) setCategoryId(defaultCategoryId);
  }, [defaultCategoryId, categoryId]);

  const typesInCategory = productTypes.filter((p) => p.category_id === categoryId && p.active);

  useEffect(() => {
    if (categoryId && typesInCategory.length > 0 && !typesInCategory.some((t) => t.key === productKey)) {
      setProductKey(typesInCategory[0].key);
      setPriceOverride('');
      setAdjustmentComment('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, productTypes]);

  const productType = productTypes.find((p) => p.key === productKey);
  const isSheetBased = !!productType?.sheet_tiers?.length;

  const preview = useMemo(() => {
    if (!productType) return null;
    const { area, cost: areaCost } = calcItemCost(productType, { widthM, heightM, count });
    const sheetLayout = isSheetBased ? calcSheetLayout(productType, widthM, heightM) : null;
    const itemCost = sheetLayout ? sheetLayout.cost : areaCost;
    const norm = resolveNorm(productType, area);
    const manufactureHours = averageHours(norm, 'manufacture');
    const installCost = productType.install_mode === 'complexity' ? calcFulfilmentCost(fulfilment, settings) : 0;
    return { area, itemCost, manufactureHours, installCost };
  }, [productType, isSheetBased, widthM, heightM, count, fulfilment, settings]);

  function selectType(key: string) {
    setProductKey(key);
    setPriceOverride('');
    setAdjustmentComment('');
  }

  function selectCategory(id: string) {
    setCategoryId(id);
    setProductKey('');
  }

  function buildDraft(): CalculatorDraft {
    const calculated = preview!.itemCost + preview!.installCost;
    const finalCost = priceOverride !== '' ? Number(priceOverride) : calculated;
    return {
      productType: productType!,
      params: productType!.unit === 'm2' ? { widthM, heightM } : { count },
      manufactureHours: preview!.manufactureHours,
      installComplexity: productType!.install_mode === 'complexity' && fulfilment.mode === 'install' ? fulfilment.installComplexity : null,
      installCity: fulfilment.mode === 'install' ? fulfilment.installCity : 'taraz',
      sundayClientRequested: fulfilment.sundayRequested,
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
    ? `/api/kp?productKey=${encodeURIComponent(productType.key)}&widthM=${widthM}&heightM=${heightM}&count=${count}&city=${fulfilment.installCity}&complexity=${fulfilment.installComplexity}&sunday=${fulfilment.sundayRequested}`
    : '#';

  const otherCategories = activeCategories.filter((c) => c.id !== categoryId);
  const isSpecialized = productType && ['light_sign_backing', 'light_letters', 'lightbox'].includes(productType.key);

  const priceLines: PriceLine[] = preview
    ? [
        { key: 'materials', label: 'Материалы', amount: preview.itemCost },
        { key: 'install', label: 'Монтаж', amount: fulfilment.mode === 'install' ? preview.installCost : 0 },
        { key: 'delivery', label: 'Доставка', amount: fulfilment.mode === 'delivery' ? preview.installCost : 0 },
      ]
    : [];

  return (
    <div className="space-y-4">
      <TrustBadges />

      <div className="space-y-4 rounded-xl border border-border bg-mist-50 p-4">
        {/* Переключатель типов изделия текущей категории — всегда сверху,
            клик сразу меняет калькулятор снизу, без промежуточных шагов. */}
        <div className="flex flex-wrap gap-2">
          {typesInCategory.map((p) => (
            <button
              key={p.key}
              onClick={() => selectType(p.key)}
              className={cn(
                'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                p.key === productKey ? 'bg-blue-gradient text-white' : 'bg-white text-navy-700 hover:bg-blue-50 border border-border'
              )}
            >
              {p.name}
              {p.needs_review && <span className="ml-1 text-xs font-normal opacity-70">(вручную)</span>}
            </button>
          ))}
          {typesInCategory.length === 0 && (
            <p className="text-sm text-muted-foreground">В этой категории пока нет изделий — скоро появятся.</p>
          )}
        </div>

        {/* Предложение других категорий — не шаг, а доп. подсказка сбоку. */}
        {otherCategories.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">
            <span>Нужна ещё продукция?</span>
            {otherCategories.map((c) => (
              <button key={c.id} onClick={() => selectCategory(c.id)} className="rounded-full bg-white px-2.5 py-1 font-medium text-blue-700 hover:bg-blue-100">
                {c.name} →
              </button>
            ))}
          </div>
        )}

        {productType && productType.key === 'light_sign_backing' && (
          <BackingCalculator productType={productType} settings={settings} mode={mode} onAdd={onAdd} onCancel={onCancel} />
        )}
        {productType && productType.key === 'light_letters' && (
          <LightLettersCalculator productType={productType} settings={settings} mode={mode} onAdd={onAdd} onCancel={onCancel} />
        )}
        {productType && productType.key === 'lightbox' && (
          <LightboxCalculator productType={productType} settings={settings} mode={mode} onAdd={onAdd} onCancel={onCancel} />
        )}

        {productType && preview && !isSpecialized && (
          <CalculatorShell
            left={
              <>
                <TypeExamplesGallery productTypeId={productType.id} productTypeKey={productType.key} />

                <AccordionSection icon={Ruler} title="1. Основные параметры" defaultOpen>
                  {productType.unit === 'm2' ? (
                    <div className="grid grid-cols-2 gap-3">
                      <StepperInput label="Ширина" unit="м" value={widthM} onChange={setWidthM} step={0.1} min={0.1} />
                      <StepperInput label="Высота" unit="м" value={heightM} onChange={setHeightM} step={0.1} min={0.1} />
                    </div>
                  ) : (
                    <StepperInput label="Количество" unit="шт" value={count} onChange={setCount} step={1} min={1} />
                  )}
                  {isSheetBased && (
                    <div className="space-y-1">
                      <label className="text-sm text-navy-700">Текст на вывеске (необязательно, для визуализации)</label>
                      <input
                        value={signText}
                        onChange={(e) => setSignText(e.target.value)}
                        placeholder="Например: Kubik"
                        className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm"
                      />
                    </div>
                  )}
                </AccordionSection>

                {productType.install_mode === 'complexity' && (
                  <AccordionSection icon={Ruler} title="2. Крепление и монтаж">
                    <InstallOrDeliverySelector value={fulfilment} onChange={setFulfilment} settings={settings} />
                  </AccordionSection>
                )}
              </>
            }
            right={
              <>
                {isSheetBased && <SheetPreview productType={productType} widthM={widthM} heightM={heightM} text={signText} />}
                <StatsRow
                  items={
                    productType.unit === 'm2'
                      ? [
                          { icon: Ruler, label: 'Ширина', value: `${widthM} м` },
                          { icon: Ruler, label: 'Высота', value: `${heightM} м` },
                          { icon: Ruler, label: 'Площадь', value: `${preview.area.toFixed(2)} м²` },
                        ]
                      : [{ icon: Ruler, label: 'Количество', value: `${count} шт` }]
                  }
                />
                <PriceBreakdown lines={priceLines} total={preview.itemCost + preview.installCost} />
              </>
            }
            footer={
              <CalculatorFooter
                calculated={preview.itemCost + preview.installCost}
                mode={mode}
                priceOverride={priceOverride}
                onPriceOverrideChange={setPriceOverride}
                adjustmentComment={adjustmentComment}
                onAdjustmentCommentChange={setAdjustmentComment}
                onAdd={handleAdd}
                onCancel={onCancel}
                kpUrl={kpUrl}
              />
            }
          />
        )}
      </div>
    </div>
  );
}
