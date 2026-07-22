'use client';

import { useEffect, useMemo, useState } from 'react';
import { Layers, Lightbulb, Wrench, Ruler } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Label } from '@/components/ui/label';
import { calcSheetMaterialPrice, resolveNorm, averageHours, type ProductionSettingsRow } from '@/lib/erp-pricing';
import { TypeExamplesGallery } from '@/components/type-examples-gallery';
import { InstallOrDeliverySelector, DEFAULT_FULFILMENT, calcFulfilmentCost, type FulfilmentState } from '@/components/calculators/install-delivery-selector';
import { LedPsuSelector, DEFAULT_LED_PSU, type LedPsuState } from '@/components/calculators/led-psu-selector';
import { SheetPreview } from '@/components/sheet-preview';
import { CalculatorShell } from '@/components/calculators/ui/calculator-shell';
import { CalculatorFooter } from '@/components/calculators/ui/calculator-footer';
import { AccordionSection } from '@/components/calculators/ui/accordion-section';
import { StepperInput } from '@/components/calculators/ui/stepper-input';
import { CharCounterInput } from '@/components/calculators/ui/char-counter-input';
import { PriceBreakdown, type PriceLine } from '@/components/calculators/ui/price-breakdown';
import { StatsRow } from '@/components/calculators/ui/stats-row';
import type { CalculatorDraft } from '@/components/product-calculator';
import type { ProductType, SheetMaterialPrice } from '@/lib/types';

export function BackingCalculator({
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
  const [material, setMaterial] = useState<'composite' | 'pvc'>('composite');
  const [shape, setShape] = useState<'rect' | 'figured'>('rect');
  const [widthM, setWidthM] = useState(1.2);
  const [heightM, setHeightM] = useState(0.6);
  const [letterHeightMm, setLetterHeightMm] = useState(300);
  const [mainText, setMainText] = useState('KUBIK');
  const [additionalText, setAdditionalText] = useState('');
  const [fulfilment, setFulfilment] = useState<FulfilmentState>(DEFAULT_FULFILMENT);
  const [ledPsu, setLedPsu] = useState<LedPsuState>(DEFAULT_LED_PSU);
  const [sheetTiers, setSheetTiers] = useState<SheetMaterialPrice[]>([]);
  const [priceOverride, setPriceOverride] = useState('');
  const [adjustmentComment, setAdjustmentComment] = useState('');

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.from('sheet_material_prices').select('*');
      setSheetTiers((data as SheetMaterialPrice[]) ?? []);
    })();
  }, []);

  const sheetResult = useMemo(() => {
    if (sheetTiers.length === 0) return null;
    return calcSheetMaterialPrice(material, widthM, heightM, sheetTiers);
  }, [material, widthM, heightM, sheetTiers]);

  const area = widthM * heightM;
  const ledRate = ledPsu.ledType === 'modules' ? settings.light_signage_pricing.led.modules_price_per_m2 : settings.light_signage_pricing.led.tape_price_per_m2;
  const ledFundPct = ledPsu.ledType === 'modules' ? settings.light_signage_pricing.led.modules_fund_pct : settings.light_signage_pricing.led.tape_fund_pct;
  const ledCost = area * ledRate;
  const ledFund = ledCost * (ledFundPct / 100);
  const psuCost = ledPsu.psuType === 'ip54' ? settings.light_signage_pricing.psu.ip54_price : settings.light_signage_pricing.psu.ip67_price;

  const materialClientPrice = sheetResult ? sheetResult.clientPrice * (shape === 'figured' ? settings.light_signage_pricing.backing.figured_shape_multiplier : 1) : 0;
  const itemCost = Math.round(materialClientPrice + ledCost + psuCost);
  const fulfilmentCost = calcFulfilmentCost(fulfilment, settings);
  const calculated = itemCost + fulfilmentCost;

  const materialsAmount = Math.round((sheetResult?.baseCost ?? 0) + ledFund + psuCost);
  const priceLines: PriceLine[] = [
    { key: 'materials', label: 'Материалы', amount: materialsAmount },
    { key: 'production', label: 'Производство', amount: itemCost - materialsAmount },
    { key: 'install', label: 'Монтаж', amount: fulfilment.mode === 'install' ? fulfilmentCost : 0 },
    { key: 'delivery', label: 'Доставка', amount: fulfilment.mode === 'delivery' ? fulfilmentCost : 0 },
  ];

  function handleAdd() {
    if (!sheetResult) return;
    const norm = resolveNorm(productType, area);
    const manufactureHours = averageHours(norm, 'manufacture');
    const finalCost = priceOverride !== '' ? Number(priceOverride) : calculated;

    onAdd?.({
      productType,
      params: { widthM, heightM, material, shape, letterHeightMm, mainText, additionalText, ledType: ledPsu.ledType, psuType: ledPsu.psuType, fulfilment },
      manufactureHours,
      installComplexity: fulfilment.mode === 'install' ? fulfilment.installComplexity : null,
      installCity: fulfilment.mode === 'install' ? fulfilment.installCity : 'taraz',
      sundayClientRequested: fulfilment.sundayRequested,
      itemCost,
      installCost: fulfilmentCost,
      finalCost,
      adjustmentComment: finalCost !== calculated ? (adjustmentComment || null) : null,
      materialFundBreakdown: [
        { materialName: material === 'composite' ? 'Композит (расход по сетке)' : 'ПВХ (расход по сетке)', amount: sheetResult.baseCost },
        { materialName: ledPsu.ledType === 'modules' ? 'Светодиодные модули' : 'Светодиодная лента', amount: ledFund },
        { materialName: ledPsu.psuType === 'ip54' ? 'Блок питания IP54' : 'Блок питания IP67', amount: psuCost },
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
            <CharCounterInput label="Текст на вывеске" value={mainText} onChange={setMainText} maxLength={20} placeholder="Название компании" />
            <div className="grid grid-cols-2 gap-3">
              <StepperInput label="Ширина подложки" unit="м" value={widthM} onChange={setWidthM} step={0.1} min={0.2} />
              <StepperInput label="Высота подложки" unit="м" value={heightM} onChange={setHeightM} step={0.1} min={0.2} />
            </div>
            <StepperInput label="Высота букв" unit="мм" value={letterHeightMm} onChange={setLetterHeightMm} step={10} min={50} />
            <CharCounterInput label="Дополнительный текст (необязательно)" value={additionalText} onChange={setAdditionalText} maxLength={30} />
          </AccordionSection>

          <AccordionSection icon={Layers} title="2. Материалы и форма">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Тип подложки</Label>
                <select value={material} onChange={(e) => setMaterial(e.target.value as 'composite' | 'pvc')} className="h-10 w-full rounded-lg border border-border bg-white px-2 text-sm">
                  <option value="composite">Алюкобонд</option>
                  <option value="pvc">ПВХ</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>Форма подложки</Label>
                <select value={shape} onChange={(e) => setShape(e.target.value as 'rect' | 'figured')} className="h-10 w-full rounded-lg border border-border bg-white px-2 text-sm">
                  <option value="rect">Прямоугольная</option>
                  <option value="figured">Фигурная (по контуру)</option>
                </select>
              </div>
            </div>
            {sheetResult && <p className="text-xs text-muted-foreground">Раскладка: {sheetResult.tierLabel}</p>}
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
          <SheetPreview productType={productType} widthM={widthM} heightM={heightM} text={mainText} />
          <StatsRow items={[
            { icon: Ruler, label: 'Высота букв', value: `${letterHeightMm} мм` },
            { icon: Ruler, label: 'Подложка', value: `${widthM}×${heightM} м` },
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
          canAdd={!!sheetResult}
        />
      }
    />
  );
}
