'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { formatTenge } from '@/lib/utils';
import { calcLightboxCost, resolveNorm, averageHours, type ProductionSettingsRow } from '@/lib/erp-pricing';
import { TypeExamplesGallery } from '@/components/type-examples-gallery';
import { InstallOrDeliverySelector, DEFAULT_FULFILMENT, calcFulfilmentCost, type FulfilmentState } from '@/components/calculators/install-delivery-selector';
import { LedPsuSelector, DEFAULT_LED_PSU, type LedPsuState } from '@/components/calculators/led-psu-selector';
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

  function handleAdd() {
    const area = widthM * heightM;
    const norm = resolveNorm(productType, area);
    const manufactureHours = averageHours(norm, 'manufacture');
    const finalCost = priceOverride !== '' ? Number(priceOverride) : calculated;

    onAdd?.({
      productType,
      params: { shape, applicationMethod, widthM, heightM, ledType: ledPsu.ledType, psuType: ledPsu.psuType, fulfilment },
      manufactureHours,
      installComplexity: fulfilment.mode === 'install' ? fulfilment.installComplexity : null,
      installCity: fulfilment.mode === 'install' ? fulfilment.installCity : 'taraz',
      sundayClientRequested: false,
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
    <div className="space-y-4">
      <TypeExamplesGallery productTypeId={productType.id} productTypeKey={productType.key} />

      <div className="grid grid-cols-2 gap-3">
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
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Ширина, м</Label>
          <Input type="number" step={0.1} value={widthM} onChange={(e) => setWidthM(Number(e.target.value))} />
        </div>
        <div className="space-y-1">
          <Label>Высота, м</Label>
          <Input type="number" step={0.1} value={heightM} onChange={(e) => setHeightM(Number(e.target.value))} />
        </div>
      </div>

      <LedPsuSelector value={ledPsu} onChange={setLedPsu} settings={settings} />
      <InstallOrDeliverySelector value={fulfilment} onChange={setFulfilment} settings={settings} />

      <div className="flex flex-col gap-2 rounded-lg bg-white px-4 py-3 text-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-muted-foreground">
            Сборка: {formatTenge(result.assembly)} · Печать/резка: {formatTenge(result.applicationCost)} · LED+БП: {formatTenge(result.ledCost + result.psuCost)}
          </span>
          <span className="text-lg font-bold text-navy-900">Расчётная: {formatTenge(calculated)}</span>
        </div>
        {mode === 'item' && (
          <div className="grid grid-cols-1 gap-2 border-t border-border pt-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Итоговая цена</Label>
              <Input type="number" placeholder={String(calculated)} value={priceOverride} onChange={(e) => setPriceOverride(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Причина скидки/наценки</Label>
              <Input value={adjustmentComment} onChange={(e) => setAdjustmentComment(e.target.value)} />
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
  );
}
