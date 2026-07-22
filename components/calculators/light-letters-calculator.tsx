'use client';

import { useEffect, useState } from 'react';
import { Type, Palette, Wrench, Ruler } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { calcLightLettersCost, resolveNorm, averageHours, type ProductionSettingsRow } from '@/lib/erp-pricing';
import { TypeExamplesGallery } from '@/components/type-examples-gallery';
import { InstallOrDeliverySelector, DEFAULT_FULFILMENT, calcFulfilmentCost, type FulfilmentState } from '@/components/calculators/install-delivery-selector';
import { LettersFramePreview } from '@/components/calculators/letters-frame-preview';
import { CalculatorShell } from '@/components/calculators/ui/calculator-shell';
import { CalculatorFooter } from '@/components/calculators/ui/calculator-footer';
import { AccordionSection } from '@/components/calculators/ui/accordion-section';
import { StepperInput } from '@/components/calculators/ui/stepper-input';
import { CharCounterInput } from '@/components/calculators/ui/char-counter-input';
import { PriceBreakdown, type PriceLine } from '@/components/calculators/ui/price-breakdown';
import { StatsRow } from '@/components/calculators/ui/stats-row';
import type { CalculatorDraft } from '@/components/product-calculator';
import type { ProductType, LightSignagePricing } from '@/lib/types';

const DEFAULT_FONT_FAMILY = '"Arial", sans-serif';

const TYPE_LABELS: Record<keyof LightSignagePricing['letters']['type_multipliers'], string> = {
  full: 'Полное свечение',
  front: 'Лицевое свечение',
  side: 'Боковое свечение',
  front_and_side: 'Лицевое + полоска сбоку',
  back: 'Контражурное (заднее)',
  nonstandard: 'Нестандартный вариант',
};

export function LightLettersCalculator({
  productType,
  settings,
  mode,
  onAdd,
  onCancel,
}: {
  productType: ProductType;
  settings: ProductionSettingsRow;
  mode: 'public' | 'item';
  onAdd?: (draft: CalculatorDraft) => void;
  onCancel?: () => void;
}) {
  const [letterType, setLetterType] = useState<keyof LightSignagePricing['letters']['type_multipliers']>('full');
  const [goldSilver, setGoldSilver] = useState(false);
  const [letterHeightMm, setLetterHeightMm] = useState(300);
  const [additionalText, setAdditionalText] = useState('');
  const [mainText, setMainText] = useState('KUBIK');
  const [frameType, setFrameType] = useState<'20x20' | '40x20' | 'none'>('20x20');
  const [totalWidthM, setTotalWidthM] = useState(2);
  const [fulfilment, setFulfilment] = useState<FulfilmentState>(DEFAULT_FULFILMENT);
  const [priceOverride, setPriceOverride] = useState('');
  const [adjustmentComment, setAdjustmentComment] = useState('');

  useEffect(() => {
    if (frameType === 'none' && fulfilment.mode === 'install' && fulfilment.installComplexity === 'light') {
      setFulfilment((f) => ({ ...f, installComplexity: 'hard' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameType, fulfilment.mode]);

  const letters = calcLightLettersCost({ letterHeightMm, letterType, goldSilver, frameType, totalWidthM, pricing: settings.light_signage_pricing });
  const fulfilmentCost = calcFulfilmentCost(fulfilment, settings);
  const calculated = Math.round(letters.total) + fulfilmentCost;
  const area = totalWidthM * (letterHeightMm / 1000);

  const priceLines: PriceLine[] = [
    { key: 'materials', label: 'Материалы', amount: Math.round(letters.letterFund + letters.frameFund) },
    { key: 'production', label: 'Производство', amount: Math.round(letters.total - letters.letterFund - letters.frameFund) },
    { key: 'install', label: 'Монтаж', amount: fulfilment.mode === 'install' ? fulfilmentCost : 0 },
    { key: 'delivery', label: 'Доставка', amount: fulfilment.mode === 'delivery' ? fulfilmentCost : 0 },
  ];

  function handleAdd() {
    const norm = resolveNorm(productType, area);
    const manufactureHours = averageHours(norm, 'manufacture');
    const finalCost = priceOverride !== '' ? Number(priceOverride) : calculated;

    const materialFundBreakdown = [{ materialName: 'Светодиодные модули', amount: letters.letterFund }];
    if (frameType !== 'none') {
      materialFundBreakdown.push({
        materialName: frameType === '20x20' ? 'Металлопрофиль 20х20' : 'Металлопрофиль 40х20',
        amount: letters.frameFund,
      });
    }

    onAdd?.({
      productType,
      params: { letterType, goldSilver, letterHeightMm, mainText, additionalText, frameType, totalWidthM, fulfilment },
      manufactureHours,
      installComplexity: fulfilment.mode === 'install' ? fulfilment.installComplexity : null,
      installCity: fulfilment.mode === 'install' ? fulfilment.installCity : 'taraz',
      sundayClientRequested: fulfilment.sundayRequested,
      itemCost: Math.round(letters.total),
      installCost: fulfilmentCost,
      finalCost,
      adjustmentComment: finalCost !== calculated ? (adjustmentComment || null) : null,
      materialFundBreakdown,
    });
  }

  const kpUrl = `/api/kp?productKey=${encodeURIComponent(productType.key)}&widthM=${totalWidthM}&heightM=${letterHeightMm / 1000}`;

  return (
    <CalculatorShell
      left={
        <>
          <TypeExamplesGallery productTypeId={productType.id} productTypeKey={productType.key} />

          <AccordionSection icon={Type} title="1. Основные параметры" defaultOpen>
            <CharCounterInput label="Текст на вывеске" value={mainText} onChange={setMainText} maxLength={20} placeholder="Название компании" />
            <div className="grid grid-cols-2 gap-3">
              <StepperInput label="Высота букв" unit="мм" value={letterHeightMm} onChange={setLetterHeightMm} step={10} min={50} />
              <StepperInput label="Общая ширина" unit="м" value={totalWidthM} onChange={setTotalWidthM} step={0.1} min={0.3} />
            </div>
            <CharCounterInput label="Дополнительный текст (необязательно)" hint="Например: кофейня, 24/7, since 2020" value={additionalText} onChange={setAdditionalText} maxLength={30} />
          </AccordionSection>

          <AccordionSection icon={Palette} title="2. Тип свечения">
            <div className="space-y-1">
              <Label>Тип букв</Label>
              <select value={letterType} onChange={(e) => setLetterType(e.target.value as typeof letterType)} className="h-10 w-full rounded-lg border border-border bg-white px-2 text-sm">
                {(Object.keys(TYPE_LABELS) as (keyof typeof TYPE_LABELS)[]).map((k) => (
                  <option key={k} value={k}>{TYPE_LABELS[k]}</option>
                ))}
              </select>
            </div>
            <label className={`flex items-center gap-2 text-sm ${letterType === 'front' ? 'opacity-40' : 'text-navy-700'}`}>
              <input type="checkbox" checked={goldSilver} disabled={letterType === 'front'} onChange={(e) => setGoldSilver(e.target.checked)} />
              Золото / серебро (недоступно при лицевом свечении)
            </label>
          </AccordionSection>

          <AccordionSection icon={Wrench} title="3. Крепление и монтаж">
            <div className="space-y-1">
              <Label>Каркас</Label>
              <select value={frameType} onChange={(e) => setFrameType(e.target.value as typeof frameType)} className="h-10 w-full rounded-lg border border-border bg-white px-2 text-sm">
                <option value="20x20">20×20 мм</option>
                <option value="40x20">40×20 мм</option>
                <option value="none">Без каркаса</option>
              </select>
            </div>
            <InstallOrDeliverySelector value={fulfilment} onChange={setFulfilment} settings={settings} disableLightComplexity={frameType === 'none'} />
          </AccordionSection>
        </>
      }
      right={
        <>
          <LettersFramePreview text={mainText} totalWidthM={totalWidthM} letterHeightMm={letterHeightMm} fontFamily={DEFAULT_FONT_FAMILY} hasFrame={frameType !== 'none'} />
          <StatsRow items={[
            { icon: Ruler, label: 'Высота букв', value: `${letterHeightMm} мм` },
            { icon: Ruler, label: 'Ширина', value: `${totalWidthM} м` },
            { icon: Ruler, label: 'Площадь', value: `${area.toFixed(2)} м²` },
          ]} />
          <PriceBreakdown lines={priceLines} total={calculated} />
        </>
      }
      footer={
        <CalculatorFooter
          calculated={calculated}
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
  );
}
