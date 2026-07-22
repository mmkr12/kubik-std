'use client';

import { useState } from 'react';
import { Shapes, Lightbulb, Wrench, Ruler } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { calcLightboxCost, resolveNorm, averageHours, type ProductionSettingsRow } from '@/lib/erp-pricing';
import { TypeExamplesGallery } from '@/components/type-examples-gallery';
import { InstallOrDeliverySelector, DEFAULT_FULFILMENT, calcFulfilmentCost, type FulfilmentState } from '@/components/calculators/install-delivery-selector';
import { LedPsuSelector, DEFAULT_LED_PSU, type LedPsuState } from '@/components/calculators/led-psu-selector';
import { CalculatorShell } from '@/components/calculators/ui/calculator-shell';
import { CalculatorFooter } from '@/components/calculators/ui/calculator-footer';
import { AccordionSection } from '@/components/calculators/ui/accordion-section';
import { StepperInput } from '@/components/calculators/ui/stepper-input';
import { PriceBreakdown, type PriceLine } from '@/components/calculators/ui/price-breakdown';
import { StatsRow } from '@/components/calculators/ui/stats-row';
import type { CalculatorDraft } from '@/components/product-calculator';
import type { ProductType } from '@/lib/types';

export function LightboxCalculator({
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
  const [shape, setShape] = useState<'simple' | 'complex'>('simple');
  const [applicationMethod, setApplicationMethod] = useState<'uv_print' | 'oracal_cut' | 'acrylic_cut'>('uv_print');
  const [widthM, setWidthM] = useState(1);
  const [heightM, setHeightM] = useState(0.6);
  const [ledPsu, setLedPsu] = useState<LedPsuState>(DEFAULT_LED_PSU);
  const [fulfilment, setFulfilment] = useState<FulfilmentState>(DEFAULT_FULFILMENT);
  const [priceOverride, setPriceOverride] = useState('');
  const [adjustmentComment, setAdjustmentComment] = useState('');

  const result = calcLightboxCost({
    shape, applicationMethod, widthM, heightM,
    ledType: ledPsu.ledType, psuType: ledPsu.psuType,
    pricing: settings.light_signage_pricing,
  });
  const fulfilmentCost = calcFulfilmentCost(fulfilment, settings);
  const calculated = Math.round(result.total) + fulfilmentCost;
  const area = widthM * heightM;

  const materialsAmount = Math.round(result.ledFund + result.psuCost);
  const priceLines: PriceLine[] = [
    { key: 'materials', label: 'Материалы', amount: materialsAmount },
    { key: 'production', label: 'Производство', amount: Math.round(result.total) - materialsAmount },
    { key: 'install', label: 'Монтаж', amount: fulfilment.mode === 'install' ? fulfilmentCost : 0 },
    { key: 'delivery', label: 'Доставка', amount: fulfilment.mode === 'delivery' ? fulfilmentCost : 0 },
  ];

  function handleAdd() {
    const norm = resolveNorm(productType, area);
    const manufactureHours = averageHours(norm, 'manufacture');
    const finalCost = priceOverride !== '' ? Number(priceOverride) : calculated;

    onAdd?.({
      productType,
      params: { shape, applicationMethod, widthM, heightM, ledType: ledPsu.ledType, psuType: ledPsu.psuType, fulfilment },
      manufactureHours,
      installComplexity: fulfilment.mode === 'install' ? fulfilment.installComplexity : null,
      installCity: fulfilment.mode === 'install' ? fulfilment.installCity : 'taraz',
      sundayClientRequested: fulfilment.sundayRequested,
      itemCost: Math.round(result.total),
      installCost: fulfilmentCost,
      finalCost,
      adjustmentComment: finalCost !== calculated ? (adjustmentComment || null) : null,
      materialFundBreakdown: [
        { materialName: ledPsu.ledType === 'modules' ? 'Светодиодные модули' : 'Светодиодная лента', amount: result.ledFund },
        { materialName: ledPsu.psuType === 'ip54' ? 'Блок питания IP54' : 'Блок питания IP67', amount: result.psuCost },
      ],
    });
  }

  const kpUrl = `/api/kp?productKey=${encodeURIComponent(productType.key)}&widthM=${widthM}&heightM=${heightM}`;

  return (
    <CalculatorShell
      left={
        <>
          <TypeExamplesGallery productTypeId={productType.id} productTypeKey={productType.key} />

          <AccordionSection icon={Ruler} title="1. Основные параметры" defaultOpen>
            <div className="grid grid-cols-2 gap-3">
              <StepperInput label="Ширина" unit="м" value={widthM} onChange={setWidthM} step={0.1} min={0.2} />
              <StepperInput label="Высота" unit="м" value={heightM} onChange={setHeightM} step={0.1} min={0.2} />
            </div>
          </AccordionSection>

          <AccordionSection icon={Shapes} title="2. Форма и нанесение">
            <div className="space-y-1">
              <Label>Форма</Label>
              <select value={shape} onChange={(e) => setShape(e.target.value as 'simple' | 'complex')} className="h-10 w-full rounded-lg border border-border bg-white px-2 text-sm">
                <option value="simple">Простая (квадрат/круг/прямоугольник/овал)</option>
                <option value="complex">Сложная (контурная резка по логотипу)</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Нанесение изображения</Label>
              <select value={applicationMethod} onChange={(e) => setApplicationMethod(e.target.value as typeof applicationMethod)} className="h-10 w-full rounded-lg border border-border bg-white px-2 text-sm">
                <option value="uv_print">УФ-печать</option>
                <option value="oracal_cut">Резка Oracal</option>
                <option value="acrylic_cut">Резка акрил</option>
              </select>
            </div>
          </AccordionSection>

          <AccordionSection icon={Lightbulb} title="3. Подсветка">
            <LedPsuSelector value={ledPsu} onChange={setLedPsu} settings={settings} />
          </AccordionSection>

          <AccordionSection icon={Wrench} title="4. Крепление и монтаж">
            <InstallOrDeliverySelector value={fulfilment} onChange={setFulfilment} settings={settings} />
          </AccordionSection>
        </>
      }
      right={
        <>
          <StatsRow items={[
            { icon: Ruler, label: 'Ширина', value: `${widthM} м` },
            { icon: Ruler, label: 'Высота', value: `${heightM} м` },
            { icon: Ruler, label: 'Площадь', value: `${area.toFixed(2)} м²` },
            { icon: Shapes, label: 'Форма', value: shape === 'simple' ? 'Простая' : 'Сложная' },
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
