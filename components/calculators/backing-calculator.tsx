'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { formatTenge } from '@/lib/utils';
import { calcSheetMaterialPrice, resolveNorm, averageHours, type ProductionSettingsRow } from '@/lib/erp-pricing';
import { TypeExamplesGallery } from '@/components/type-examples-gallery';
import { InstallOrDeliverySelector, DEFAULT_FULFILMENT, calcFulfilmentCost, type FulfilmentState } from '@/components/calculators/install-delivery-selector';
import { LedPsuSelector, DEFAULT_LED_PSU, type LedPsuState } from '@/components/calculators/led-psu-selector';
import type { CalculatorDraft } from '@/components/product-calculator';
import type { ProductType, SheetMaterialPrice, Font } from '@/lib/types';

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
  const [additionalText, setAdditionalText] = useState('');
  const [fontKey, setFontKey] = useState('');
  const [fulfilment, setFulfilment] = useState<FulfilmentState>(DEFAULT_FULFILMENT);
  const [ledPsu, setLedPsu] = useState<LedPsuState>(DEFAULT_LED_PSU);
  const [sheetTiers, setSheetTiers] = useState<SheetMaterialPrice[]>([]);
  const [fonts, setFonts] = useState<Font[]>([]);
  const [priceOverride, setPriceOverride] = useState('');
  const [adjustmentComment, setAdjustmentComment] = useState('');

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const [{ data: tiers }, { data: fontsData }] = await Promise.all([
        supabase.from('sheet_material_prices').select('*'),
        supabase.from('fonts').select('*').eq('active', true).order('sort_order'),
      ]);
      setSheetTiers((tiers as SheetMaterialPrice[]) ?? []);
      setFonts((fontsData as Font[]) ?? []);
      if (fontsData && fontsData.length > 0) setFontKey(fontsData[0].key);
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

  function handleAdd() {
    if (!sheetResult) return;
    const norm = resolveNorm(productType, area);
    const manufactureHours = averageHours(norm, 'manufacture');
    const finalCost = priceOverride !== '' ? Number(priceOverride) : calculated;

    onAdd?.({
      productType,
      params: {
        widthM, heightM, material, shape, letterHeightMm, additionalText, fontKey,
        ledType: ledPsu.ledType, psuType: ledPsu.psuType, fulfilment,
      },
      manufactureHours,
      installComplexity: fulfilment.mode === 'install' ? fulfilment.installComplexity : null,
      installCity: fulfilment.mode === 'install' ? fulfilment.installCity : 'taraz',
      sundayClientRequested: false,
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
  const selectedFont = fonts.find((f) => f.key === fontKey);

  return (
    <div className="space-y-4">
      <TypeExamplesGallery productTypeId={productType.id} productTypeKey={productType.key} />

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

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Ширина подложки, м</Label>
          <Input type="number" step={0.1} value={widthM} onChange={(e) => setWidthM(Number(e.target.value))} />
        </div>
        <div className="space-y-1">
          <Label>Высота подложки, м</Label>
          <Input type="number" step={0.1} value={heightM} onChange={(e) => setHeightM(Number(e.target.value))} />
        </div>
      </div>

      {sheetResult && (
        <p className="text-xs text-muted-foreground">
          Раскладка: {sheetResult.tierLabel} · себестоимость материала {formatTenge(sheetResult.baseCost)}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Высота букв, мм</Label>
          <Input type="number" value={letterHeightMm} onChange={(e) => setLetterHeightMm(Number(e.target.value))} />
        </div>
        <div className="space-y-1">
          <Label>Шрифт</Label>
          <select value={fontKey} onChange={(e) => setFontKey(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-white px-2 text-sm">
            {fonts.map((f) => <option key={f.key} value={f.key}>{f.name}</option>)}
          </select>
        </div>
      </div>
      <div className="space-y-1">
        <Label>Дополнительный текст (необязательно)</Label>
        <Input value={additionalText} onChange={(e) => setAdditionalText(e.target.value)} style={selectedFont ? { fontFamily: selectedFont.css_family } : undefined} />
      </div>

      <LedPsuSelector value={ledPsu} onChange={setLedPsu} settings={settings} />
      <InstallOrDeliverySelector value={fulfilment} onChange={setFulfilment} settings={settings} />

      <div className="flex flex-col gap-2 rounded-lg bg-white px-4 py-3 text-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-muted-foreground">Изделие: {formatTenge(itemCost)} · {fulfilment.mode === 'delivery' ? 'Доставка' : 'Монтаж'}: {fulfilmentCost > 0 ? formatTenge(fulfilmentCost) : '—'}</span>
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
          <Button className="flex-1" onClick={handleAdd} disabled={!sheetResult}>Добавить в заявку</Button>
        </div>
      ) : (
        <a href={kpUrl} target="_blank" className="block w-full rounded-full bg-blue-gradient py-2.5 text-center text-sm font-medium text-white hover:brightness-110">
          Открыть коммерческое предложение →
        </a>
      )}
    </div>
  );
}
