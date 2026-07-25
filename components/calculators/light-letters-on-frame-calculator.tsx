'use client';

import { useEffect, useMemo, useState } from 'react';
import { Ruler, Palette, Lightbulb, Wrench, Truck, Bookmark } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Image from 'next/image';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { formatTenge } from '@/lib/utils';
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
import { LightLettersPreview, TYPE_THUMBS } from '@/components/calculators/light-letters-preview';

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
  const [saved, setSaved] = useState(false);
  const [hasSavedDraft, setHasSavedDraft] = useState(false);

  // При открытии — проверяем, есть ли ранее сохранённый расчёт в куках.
  useEffect(() => {
    const match = document.cookie.match(/kubik_calc_letters=([^;]+)/);
    if (match) setHasSavedDraft(true);
  }, []);

  function handleRestore() {
    const match = document.cookie.match(/kubik_calc_letters=([^;]+)/);
    if (!match) return;
    try {
      const saved = JSON.parse(decodeURIComponent(match[1])) as CalculatorInput;
      setMainText(saved.mainText);
      setMainHeightMm(saved.mainHeightMm);
      setDepthMm(saved.depthMm);
      setAdditionalText(saved.additionalText);
      setAdditionalHeightMm(saved.additionalHeightMm);
      setLetterType(saved.letterType);
      setGoldSilver(saved.goldSilver);
      setLedType(saved.ledType);
      setPsuType(saved.psuType);
      setFrameType(saved.frameType);
      setInstallMode(saved.installMode);
      setInstallCity(saved.installCity);
      setComplexity(saved.complexity);
      setDeliveryOption(saved.deliveryOption);
      setUrgent(saved.urgent);
      setHasSavedDraft(false);
    } catch {
      // повреждённые куки — просто игнорируем
    }
  }

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
    setHasSavedDraft(false);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleAdd() {
    onAdd?.({ input, result });
  }

  const kpUrl = `/kp?d=${encodeURIComponent(JSON.stringify(input))}`;

  const mobilePriceLines: PriceLine[] = [
    { label: 'Материал', amount: result.material },
    { label: 'Изготовление', amount: result.production },
    { label: installMode === 'delivery' ? 'Доставка' : 'Монтаж/Доставка', amount: result.installDelivery },
  ];
  if (result.urgentSurcharge > 0) mobilePriceLines.push({ label: 'Доплата за срочность', amount: result.urgentSurcharge });

  return (
    <>
    {/* ==================== МОБИЛЬНАЯ РАСКЛАДКА ====================
        Отдельная, более плотная структура — без карточек/рамок вокруг
        секций, без аккордеона (всё сразу открыто), без блока "Пример",
        превью типа свечения поднято под выбор типа, габариты в одну
        строку, смета без разбивки по статьям материала. */}
    <div className="block space-y-5 pb-24 md:hidden">
      {hasSavedDraft && (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">
          <span>У вас есть сохранённый расчёт</span>
          <button onClick={handleRestore} className="font-semibold underline">Восстановить</button>
        </div>
      )}
      <MobileSection icon={Ruler} title="Основные параметры">
        <CharCounterInput label="Текст на вывеске" value={mainText} onChange={setMainText} maxLength={20} placeholder="Введите название вашей вывески" />
        <div className="grid grid-cols-2 gap-3">
          <StepperInput label="Высота букв" unit="мм" value={mainHeightMm} onChange={setMainHeightMm} step={10} min={50} max={1200} />
          <StepperInput label="Глубина букв" unit="мм" value={depthMm} onChange={setDepthMm} step={5} min={20} max={100} />
        </div>
        <CharCounterInput label="Дополнительный текст (не обязательно)" hint="Например: кофе с собой" value={additionalText} onChange={setAdditionalText} maxLength={30} />
        {additionalText.trim() && (
          <StepperInput label="Высота букв доп. текста" unit="мм" value={additionalHeightMm} onChange={setAdditionalHeightMm} step={10} min={50} max={1200} />
        )}
      </MobileSection>

      <MobileSection icon={Palette} title="Внешний вид и цвета">
        <div className="space-y-1">
          <Label>Тип свечения</Label>
          <select value={letterType} onChange={(e) => setLetterType(e.target.value as LetterType)} className="h-10 w-full rounded-lg border border-border bg-white px-2 text-sm">
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
        <div className="flex items-center gap-2 rounded-lg bg-mist-50 p-2">
          <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-mist-100">
            <Image src={TYPE_THUMBS[letterType]} alt="" fill className="object-cover" />
          </span>
          <p className="text-xs text-muted-foreground">Пример выбранного типа свечения</p>
        </div>
      </MobileSection>

      <MobileSection icon={Lightbulb} title="Подсветка">
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
      </MobileSection>

      <MobileSection icon={Wrench} title="Каркас">
        <div className="space-y-1">
          <Label>Металл</Label>
          <select value={frameType} onChange={(e) => setFrameType(e.target.value as FrameType)} className="h-10 w-full rounded-lg border border-border bg-white px-2 text-sm">
            <option value="20x20">20×20</option>
            <option value="40x20">40×20</option>
            <option value="none">Без каркаса</option>
          </select>
        </div>
      </MobileSection>

      <MobileSection icon={Truck} title="Монтаж/Доставка">
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
              <option value="shymkent">Шымкент — 60 000 ₸</option>
              <option value="almaty">Алматы — 120 000 ₸</option>
            </select>
            {installCity === 'taraz' && (
              <select value={complexity} onChange={(e) => setComplexity(e.target.value as Complexity)} className="h-10 rounded-lg border border-border bg-white px-2 text-sm">
                <option value="light" disabled={frameType === 'none'}>Лёгкий{frameType === 'none' ? ' (недоступно)' : ''}</option>
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
                Рассчитать доставку СДЭК →
              </a>
            )}
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-navy-700">
          <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
          Срочно (изготовление и монтаж/доставка ×1.5)
        </label>
        <p className="text-xs text-muted-foreground">Сложность монтажа предварительная — точную определит монтажник на замере.</p>
      </MobileSection>

      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: 'Высота', value: `${result.gabarits.heightMm} мм` },
          { label: 'Ширина', value: `${result.gabarits.widthMm} мм` },
          { label: 'Глубина', value: `${result.gabarits.depthMm} мм` },
          { label: 'Площадь', value: `${result.gabarits.volumeM3} м³` },
        ].map((s) => (
          <div key={s.label} className="rounded-lg bg-mist-50 px-1.5 py-2 text-center">
            <p className="text-[9px] uppercase leading-tight tracking-wide text-muted-foreground">{s.label}</p>
            <p className="text-xs font-medium leading-tight text-navy-900">{s.value}</p>
          </div>
        ))}
      </div>

      <PriceBreakdown lines={mobilePriceLines} total={result.total} />

      <div className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 border-t border-border bg-white px-3 py-3">
        <div>
          <p className="text-[10px] text-muted-foreground">Стоимость вывески</p>
          <p className="text-lg font-bold text-navy-900">{formatTenge(result.total)}</p>
        </div>
        {mode === 'item' ? (
          <div className="flex gap-2">
            {onCancel && <Button variant="outline" size="sm" onClick={onCancel}>Отмена</Button>}
            <Button size="sm" onClick={handleAdd}>Добавить</Button>
          </div>
        ) : (
          <a href={kpUrl} target="_blank" className="rounded-full bg-blue-gradient px-5 py-2.5 text-sm font-medium text-white">Коммерческое предложение</a>
        )}
      </div>
    </div>

    {/* ==================== ДЕСКТОПНАЯ РАСКЛАДКА (без изменений) ==================== */}
    <div className="hidden md:block">
    <CalculatorShell
      left={
        <>
          {hasSavedDraft && (
            <div className="flex items-center justify-between gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">
              <span>У вас есть сохранённый расчёт</span>
              <button onClick={handleRestore} className="font-semibold underline">Восстановить</button>
            </div>
          )}
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
              <Button asChild>
                <a href={kpUrl} target="_blank">Коммерческое предложение</a>
              </Button>
            )}
          </div>
        </div>
      }
    />
    </div>
    </>
  );
}

// Заголовок секции для мобильной раскладки — виден (иконка + название),
// но без рамки, фона и возможности свернуть — все поля сразу под ним.
function MobileSection({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-navy-900">
        <Icon className="h-4 w-4 text-blue-600" /> {title}
      </h3>
      {children}
    </div>
  );
}
