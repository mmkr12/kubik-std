'use client';

import { useEffect, useMemo, useState } from 'react';
import { Ruler, Palette, Lightbulb, Wrench, Truck, Bookmark } from 'lucide-react';
import Image from 'next/image';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { formatTenge, formatDate } from '@/lib/utils';
import {
  calculate, isTypeAvailable, getDiapason, LETTER_TYPE_LABELS,
  type CalculatorInput, type LetterType, type LedType, type PsuType, type FrameType,
  type InstallCity, type Complexity, type DeliveryOption,
} from '@/lib/light-letters-pricing';
import { AccordionSection } from '@/components/calculators/ui/accordion-section';
import { StepperInput } from '@/components/calculators/ui/stepper-input';
import { CharCounterInput } from '@/components/calculators/ui/char-counter-input';
import { PriceBreakdown, type PriceLine } from '@/components/calculators/ui/price-breakdown';
import { CalculatorShell } from '@/components/calculators/ui/calculator-shell';
import { LightLettersPreview } from '@/components/calculators/light-letters-preview';

const LETTER_TYPES: LetterType[] = ['full_combo', 'full_single', 'front', 'side', 'back', 'back_and_front'];

export interface LightLettersDraft {
  input: CalculatorInput;
  result: ReturnType<typeof calculate>;
}

export function LightLettersOnFrameCalculator({
  mode,
  onAdd,
  onCancel,
}: {
  mode: 'public' | 'item';
  onAdd?: (draft: LightLettersDraft) => void;
  onCancel?: () => void;
}) {
  const [mainText, setMainText] = useState('');
  const [mainHeightMm, setMainHeightMm] = useState(200);
  const [depthMm, setDepthMm] = useState(50);
  const [additionalText, setAdditionalText] = useState('');
  const [additionalHeightMm, setAdditionalHeightMm] = useState(100);
  const [letterType, setLetterType] = useState<LetterType>('full_single');
  const [goldSilver, setGoldSilver] = useState(false);
  const [ledType, setLedType] = useState<LedType>('modules');
  const [psuType, setPsuType] = useState<PsuType>('ip43');
  const [frameType, setFrameType] = useState<FrameType>('20x20');
  const [installMode, setInstallMode] = useState<'install' | 'delivery' | 'none'>('none');
  const [installCity, setInstallCity] = useState<InstallCity>('taraz');
  const [complexity, setComplexity] = useState<Complexity>('medium');
  const [deliveryOption, setDeliveryOption] = useState<DeliveryOption>('pickup');
  const [urgent, setUrgent] = useState(false);
  const [showPrepay, setShowPrepay] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [saved, setSaved] = useState(false);

  // "Без каркаса" — лёгкий монтаж недоступен.
  useEffect(() => {
    if (frameType === 'none' && complexity === 'light') setComplexity('medium');
  }, [frameType, complexity]);

  // Золото/серебро — лицевое свечение недоступно.
  useEffect(() => {
    if (goldSilver && letterType === 'front') setLetterType('full_single');
  }, [goldSilver, letterType]);

  const diapasons = useMemo(() => {
    const list = [getDiapason(mainHeightMm)];
    if (additionalText.trim()) list.push(getDiapason(additionalHeightMm));
    return list;
  }, [mainHeightMm, additionalHeightMm, additionalText]);

  const input: CalculatorInput = {
    mainText, mainHeightMm, depthMm, additionalText, additionalHeightMm,
    letterType, goldSilver, ledType, psuType, frameType,
    installMode, installCity, complexity, deliveryOption, urgent,
  };

  const result = useMemo(() => calculate(input), [
    mainText, mainHeightMm, depthMm, additionalText, additionalHeightMm,
    letterType, goldSilver, ledType, psuType, frameType,
    installMode, installCity, complexity, deliveryOption, urgent,
  ]);

  const priceLines: PriceLine[] = [
    { label: 'Материал', amount: result.material, bold: true },
    { label: 'Изготовление букв', amount: result.letterManufacture, indent: true },
    { label: 'Дизайн букв', amount: result.letterDesign, indent: true },
    { label: 'Освещение', amount: result.lighting, indent: true },
    { label: 'Изготовление каркаса', amount: result.frame, indent: true },
    { label: 'Изготовление', amount: result.production, bold: true },
    { label: installMode === 'delivery' ? 'Доставка' : 'Монтаж/Доставка', amount: result.installDelivery, bold: true },
  ];
  if (result.urgentSurcharge > 0) priceLines.push({ label: 'Доплата за срочность', amount: result.urgentSurcharge, bold: true });

  function handleSave() {
    document.cookie = `kubik_calc_letters=${encodeURIComponent(JSON.stringify(input))}; max-age=2592000; path=/`;
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleAdd() {
    onAdd?.({ input, result });
  }

  const estimatedDate = new Date();
  estimatedDate.setDate(estimatedDate.getDate() + 10);

  return (
    <>
    <CalculatorShell
      left={
        <>
          <AccordionSection icon={Ruler} title="Основные параметры" defaultOpen>
            <CharCounterInput label="Текст на вывеске" value={mainText} onChange={setMainText} maxLength={20} placeholder="Введите название вашей вывески" />
            <div className="grid grid-cols-2 gap-3">
              <StepperInput label="Высота букв" unit="мм" value={mainHeightMm} onChange={setMainHeightMm} step={10} min={50} max={1200} />
              <StepperInput label="Глубина букв" unit="мм" value={depthMm} onChange={setDepthMm} step={5} min={20} max={100} />
            </div>
            <CharCounterInput label="Дополнительный текст (не обязательно)" hint="Например: кофе с собой" value={additionalText} onChange={setAdditionalText} maxLength={30} />
            {additionalText.trim() && (
              <StepperInput label="Высота букв доп. текста" unit="мм" value={additionalHeightMm} onChange={setAdditionalHeightMm} step={10} min={50} max={1200} />
            )}
          </AccordionSection>

          <AccordionSection icon={Palette} title="Внешний вид и цвета">
            <div className="space-y-1">
              <Label>Тип свечения</Label>
              <select
                value={letterType}
                onChange={(e) => setLetterType(e.target.value as LetterType)}
                className="h-10 w-full rounded-lg border border-border bg-white px-2 text-sm"
              >
                {LETTER_TYPES.map((t) => {
                  const available = isTypeAvailable(t, diapasons as any);
                  return (
                    <option key={t} value={t} disabled={!available}>
                      {LETTER_TYPE_LABELS[t]}{!available ? ' (недоступно для этой высоты)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
            <label className={`flex items-center gap-2 text-sm ${letterType === 'front' ? 'opacity-40' : 'text-navy-700'}`}>
              <input type="checkbox" checked={goldSilver} disabled={letterType === 'front'} onChange={(e) => setGoldSilver(e.target.checked)} />
              Золото / серебро (лицевое свечение станет недоступно)
            </label>
          </AccordionSection>

          <AccordionSection icon={Lightbulb} title="Подсветка">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Тип освещения</Label>
                <select value={ledType} onChange={(e) => setLedType(e.target.value as LedType)} className="h-10 w-full rounded-lg border border-border bg-white px-2 text-sm">
                  <option value="modules">Модули</option>
                  <option value="tape">Лента</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>Блок питания</Label>
                <select value={psuType} onChange={(e) => setPsuType(e.target.value as PsuType)} className="h-10 w-full rounded-lg border border-border bg-white px-2 text-sm">
                  <option value="ip43">Открытый IP43</option>
                  <option value="ip67">Закрытый IP67</option>
                  <option value="none">Без блока питания</option>
                </select>
              </div>
            </div>
            <div className="relative h-20 w-full overflow-hidden rounded-lg bg-mist-100">
              <Image src="/calc/podsvetka/podsvetka.png" alt="Подсветка" fill className="object-cover" />
            </div>
          </AccordionSection>

          <AccordionSection icon={Wrench} title="Каркас">
            <div className="space-y-1">
              <Label>Металл</Label>
              <select value={frameType} onChange={(e) => setFrameType(e.target.value as FrameType)} className="h-10 w-full rounded-lg border border-border bg-white px-2 text-sm">
                <option value="20x20">20×20</option>
                <option value="40x20">40×20</option>
                <option value="none">Без каркаса</option>
              </select>
            </div>
          </AccordionSection>

          <AccordionSection icon={Truck} title="Монтаж/Доставка">
            <div className="flex gap-2">
              <button type="button" onClick={() => setInstallMode(installMode === 'install' ? 'none' : 'install')} className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${installMode === 'install' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-border text-navy-700'}`}>
                Монтаж
              </button>
              <button type="button" onClick={() => setInstallMode(installMode === 'delivery' ? 'none' : 'delivery')} className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${installMode === 'delivery' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-border text-navy-700'}`}>
                Доставка
              </button>
            </div>

            {installMode === 'install' && (
              <div className="grid grid-cols-2 gap-2">
                <select value={installCity} onChange={(e) => setInstallCity(e.target.value as InstallCity)} className="h-10 rounded-lg border border-border bg-white px-2 text-sm">
                  <option value="taraz">Тараз</option>
                  <option value="shymkent">Шымкент — 60 000 ₸ (всё включено)</option>
                  <option value="almaty">Алматы — 120 000 ₸ (всё включено)</option>
                </select>
                {installCity === 'taraz' && (
                  <select value={complexity} onChange={(e) => setComplexity(e.target.value as Complexity)} className="h-10 rounded-lg border border-border bg-white px-2 text-sm">
                    <option value="light" disabled={frameType === 'none'}>Лёгкий{frameType === 'none' ? ' (недоступно без каркаса)' : ''}</option>
                    <option value="medium">Средний</option>
                    <option value="medium_large">Средний (габарит)</option>
                    <option value="hard">Сложный</option>
                  </select>
                )}
              </div>
            )}

            {installMode === 'delivery' && (
              <div className="space-y-2">
                <select value={deliveryOption} onChange={(e) => setDeliveryOption(e.target.value as DeliveryOption)} className="h-10 w-full rounded-lg border border-border bg-white px-2 text-sm">
                  <option value="pickup">Самовывоз</option>
                  <option value="taraz">Тараз</option>
                  <option value="shymkent">Шымкент</option>
                  <option value="almaty">Алматы</option>
                  <option value="cdek">СДЭК</option>
                </select>
                {deliveryOption === 'cdek' && (
                  <a href="https://www.cdek.kz/ru/calculator" target="_blank" className="block text-xs text-blue-600 hover:underline">
                    Рассчитать доставку СДЭК по габаритам вывески →
                  </a>
                )}
              </div>
            )}

            <label className="flex items-center gap-2 text-sm text-navy-700">
              <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
              Срочно (изготовление и монтаж/доставка ×1.5)
            </label>
            <p className="text-xs text-muted-foreground">Сложность монтажа предварительная — точную определит монтажник на замере.</p>
          </AccordionSection>
        </>
      }
      right={
        <>
          <LightLettersPreview mainText={mainText} additionalText={additionalText} letterType={letterType} goldSilver={goldSilver} hasFrame={frameType !== 'none'} />

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: 'Высота', value: `${result.gabarits.heightMm} мм` },
              { label: 'Ширина', value: `${result.gabarits.widthMm} мм` },
              { label: 'Глубина', value: `${result.gabarits.depthMm} мм` },
              { label: 'Площадь', value: `${result.gabarits.volumeM3} м³` },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-border bg-white px-3 py-2 text-center">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
                <p className="text-sm font-medium text-navy-900">{s.value}</p>
              </div>
            ))}
          </div>

          <PriceBreakdown lines={priceLines} total={result.total} />
        </>
      }
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Стоимость вывески</p>
            <p className="text-2xl font-bold text-navy-900">{formatTenge(result.total)}</p>
          </div>
          <div className="flex gap-2">
            {mode === 'item' && onCancel && <Button variant="outline" onClick={onCancel}>Отмена</Button>}
            <Button variant="outline" onClick={handleSave}>
              <Bookmark className="mr-1 h-4 w-4" /> {saved ? 'Сохранено ✓' : 'Сохранить расчёт'}
            </Button>
            {mode === 'item' ? (
              <Button onClick={handleAdd}>Добавить в заявку</Button>
            ) : (
              <Button onClick={() => setShowPrepay(true)}>Внести предоплату</Button>
            )}
          </div>
        </div>
      }
    />
      <Dialog open={showPrepay} onOpenChange={setShowPrepay}>
        <DialogContent>
          <DialogTitle>Внести предоплату</DialogTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Ориентировочная дата готовности: {formatDate(estimatedDate.toISOString())}
          </p>
          <div className="mt-4 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">
            Внесите предоплату от 10 000 ₸ до полной стоимости в течение 20 минут — и получите бонус/скидку.
          </div>
          <div className="mt-4 space-y-2">
            <Label>Сумма предоплаты, ₸</Label>
            <Input type="number" min={10000} max={result.total} value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder={`от 10 000 до ${result.total}`} />
          </div>
          <div className="mt-4 flex justify-center">
            <Image src="/brand/kaspi-qr.png" alt="Kaspi QR" width={160} height={160} />
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">Kaspi Pay · +7 707 775 00 11</p>
        </DialogContent>
      </Dialog>
    </>
  );
}
