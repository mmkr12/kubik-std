'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { formatTenge } from '@/lib/utils';
import { calcLightLettersCost, resolveNorm, averageHours, type ProductionSettingsRow } from '@/lib/erp-pricing';
import { TypeExamplesGallery } from '@/components/type-examples-gallery';
import { InstallOrDeliverySelector, DEFAULT_FULFILMENT, calcFulfilmentCost, type FulfilmentState } from '@/components/calculators/install-delivery-selector';
import { LettersFramePreview } from '@/components/calculators/letters-frame-preview';
import type { CalculatorDraft } from '@/components/product-calculator';
import type { ProductType, Font, LightSignagePricing } from '@/lib/types';

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
  const [fontKey, setFontKey] = useState('');
  const [frameType, setFrameType] = useState<'20x20' | '40x20' | 'none'>('20x20');
  const [totalWidthM, setTotalWidthM] = useState(2);
  const [fulfilment, setFulfilment] = useState<FulfilmentState>(DEFAULT_FULFILMENT);
  const [fonts, setFonts] = useState<Font[]>([]);
  const [priceOverride, setPriceOverride] = useState('');
  const [adjustmentComment, setAdjustmentComment] = useState('');

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.from('fonts').select('*').eq('active', true).order('sort_order');
      setFonts((data as Font[]) ?? []);
      if (data && data.length > 0) setFontKey(data[0].key);
    })();
  }, []);

  // "Без каркаса" — автоматически сложный монтаж, как ты просил.
  useEffect(() => {
    if (frameType === 'none' && fulfilment.mode === 'install') {
      setFulfilment((f) => ({ ...f, installComplexity: 'hard' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameType, fulfilment.mode]);

  const letters = calcLightLettersCost({ letterHeightMm, letterType, goldSilver, frameType, totalWidthM, pricing: settings.light_signage_pricing });
  const fulfilmentCost = calcFulfilmentCost(fulfilment, settings);
  const calculated = Math.round(letters.total) + fulfilmentCost;

  function handleAdd() {
    const area = totalWidthM * (letterHeightMm / 1000);
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
      params: { letterType, goldSilver, letterHeightMm, additionalText, fontKey, frameType, totalWidthM, fulfilment },
      manufactureHours,
      installComplexity: fulfilment.mode === 'install' ? fulfilment.installComplexity : null,
      installCity: fulfilment.mode === 'install' ? fulfilment.installCity : 'taraz',
      sundayClientRequested: false,
      itemCost: Math.round(letters.total),
      installCost: fulfilmentCost,
      finalCost,
      adjustmentComment: finalCost !== calculated ? (adjustmentComment || null) : null,
      materialFundBreakdown,
    });
  }

  const kpUrl = `/api/kp?productKey=${encodeURIComponent(productType.key)}&widthM=${totalWidthM}&heightM=${letterHeightMm / 1000}`;
  const selectedFont = fonts.find((f) => f.key === fontKey);

  return (
    <div className="space-y-4">
      <TypeExamplesGallery productTypeId={productType.id} productTypeKey={productType.key} />

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

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Высота букв, мм</Label>
          <Input type="number" value={letterHeightMm} onChange={(e) => setLetterHeightMm(Number(e.target.value))} />
        </div>
        <div className="space-y-1">
          <Label>Общая ширина вывески, м</Label>
          <Input type="number" step={0.1} value={totalWidthM} onChange={(e) => setTotalWidthM(Number(e.target.value))} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Каркас</Label>
          <select value={frameType} onChange={(e) => setFrameType(e.target.value as typeof frameType)} className="h-10 w-full rounded-lg border border-border bg-white px-2 text-sm">
            <option value="20x20">20×20 мм</option>
            <option value="40x20">40×20 мм</option>
            <option value="none">Без каркаса</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label>Шрифт</Label>
          <select value={fontKey} onChange={(e) => setFontKey(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-white px-2 text-sm">
            {fonts.map((f) => <option key={f.key} value={f.key}>{f.name}</option>)}
          </select>
        </div>
      </div>
      <div className="space-y-1">
        <Label>Текст на вывеске</Label>
        <Input value={additionalText} onChange={(e) => setAdditionalText(e.target.value)} placeholder="Kubik" />
      </div>

      <LettersFramePreview
        text={additionalText}
        totalWidthM={totalWidthM}
        letterHeightMm={letterHeightMm}
        fontFamily={selectedFont?.css_family ?? 'Arial, sans-serif'}
        hasFrame={frameType !== 'none'}
      />

      <InstallOrDeliverySelector value={fulfilment} onChange={setFulfilment} settings={settings} />

      <div className="flex flex-col gap-2 rounded-lg bg-white px-4 py-3 text-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-muted-foreground">
            Буквы: {formatTenge(letters.letterCost)}{letters.goldCost > 0 && ` · Золото/серебро: ${formatTenge(letters.goldCost)}`}{letters.frameCost > 0 && ` · Каркас: ${formatTenge(letters.frameCost)}`}
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
