'use client';

import { useEffect, useMemo, useState } from 'react';
import { Ruler, Palette, Lightbulb, Truck, Bookmark, Layers, Lightbulb as HintIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Image from 'next/image';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { formatTenge } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import {
  calculate, isTypeAvailable, getDiapason, LETTER_TYPE_LABELS, TYPE_THUMBS, DEFAULT_PRICING_CONFIG,
  type CalculatorInput, type LetterType, type LedType, type LedTemp, type PsuType,
  type InstallCity, type Complexity, type DeliveryOption, type LightLettersPricingConfig, type LightLettersDraft,
} from '@/lib/light-letters-pricing';
import { findBackingHints } from '@/lib/backing-pricing';
import { StepperInput } from '@/components/calculators/ui/stepper-input';
import { CharCounterInput } from '@/components/calculators/ui/char-counter-input';
import { PriceBreakdown, type PriceLine } from '@/components/calculators/ui/price-breakdown';
import { CalculatorShell } from '@/components/calculators/ui/calculator-shell';
import { LightLettersPreview } from '@/components/calculators/light-letters-preview';
import { BackingSheetVisualization } from '@/components/calculators/backing-sheet-visualization';

const LETTER_TYPES: LetterType[] = ['full_combo', 'full_single', 'front', 'side', 'back', 'back_and_front'];

export function LightLettersOnBackingCalculator({
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
  const [ledType, setLedType] = useState<LedType>('none');
  const [ledTemp, setLedTemp] = useState<LedTemp>('neutral');
  const [psuType, setPsuType] = useState<PsuType>('none');
  const [backingWidthCm, setBackingWidthCm] = useState(120);
  const [backingHeightCm, setBackingHeightCm] = useState(80);
  const [installMode, setInstallMode] = useState<'install' | 'delivery' | 'none'>('none');
  const [installCity, setInstallCity] = useState<InstallCity>('taraz');
  const [complexity, setComplexity] = useState<Complexity>('medium');
  const [deliveryOption, setDeliveryOption] = useState<DeliveryOption>('pickup');
  const [urgent, setUrgent] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const [pricingConfig, setPricingConfig] = useState<LightLettersPricingConfig>(DEFAULT_PRICING_CONFIG);

  useEffect(() => {
    const match = document.cookie.match(/kubik_calc_backing=([^;]+)/);
    if (match) setHasSavedDraft(true);
  }, []);

  // Цены редактируются в /admin/settings — подтягиваем их один раз при
  // открытии; пока грузится, считаем по дефолтным цифрам.
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('production_settings')
      .select('light_letters_pricing')
      .single()
      .then(({ data }) => {
        if (data?.light_letters_pricing) setPricingConfig(data.light_letters_pricing as LightLettersPricingConfig);
      });
  }, []);

  function handleRestore() {
    const match = document.cookie.match(/kubik_calc_backing=([^;]+)/);
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
      setLedTemp(saved.ledTemp ?? 'neutral');
      setPsuType(saved.psuType);
      setBackingWidthCm(saved.backingWidthCm ?? 120);
      setBackingHeightCm(saved.backingHeightCm ?? 80);
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
    letterType, goldSilver, ledType, ledTemp, psuType, frameType: 'none',
    installMode, installCity, complexity, deliveryOption, urgent,
    backingWidthCm, backingHeightCm,
  };

  const result = useMemo(() => calculate(input, pricingConfig), [
    mainText, mainHeightMm, depthMm, additionalText, additionalHeightMm,
    letterType, goldSilver, ledType, ledTemp, psuType,
    installMode, installCity, complexity, deliveryOption, urgent,
    backingWidthCm, backingHeightCm, pricingConfig,
  ]);

  const backingHints = useMemo(
    () => (result.backingFit ? findBackingHints(backingWidthCm, backingHeightCm, pricingConfig.compositeSheetPrice, result.backingFit) : []),
    [backingWidthCm, backingHeightCm, pricingConfig.compositeSheetPrice, result.backingFit]
  );

  const priceLines: PriceLine[] = [
    { label: 'Материал', amount: result.material, bold: true },
    { label: 'Изготовление букв', amount: result.letterManufacture, indent: true },
    { label: 'Дизайн букв', amount: result.letterDesign, indent: true },
    { label: 'Освещение', amount: result.lighting, indent: true },
    { label: 'Подложка', amount: result.backing, indent: true },
    { label: 'Изготовление', amount: result.production, bold: true },
    { label: installMode === 'delivery' ? 'Доставка' : 'Монтаж/Доставка', amount: result.installDelivery, bold: true },
  ];
  if (result.urgentSurcharge > 0) priceLines.push({ label: 'Доплата за срочность', amount: result.urgentSurcharge, bold: true });

  function handleSave() {
    document.cookie = `kubik_calc_backing=${encodeURIComponent(JSON.stringify(input))}; max-age=2592000; path=/`;
    setSaved(true);
    setHasSavedDraft(false);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleAdd() {
    onAdd?.({ kind: 'light_letters_on_backing', input, result });
  }

  const kpUrl = `/kp?d=${encodeURIComponent(JSON.stringify(input))}`;

  const mobilePriceLines: PriceLine[] = [
    { label: 'Материал', amount: result.material },
    { label: 'Изготовление', amount: result.production },
    { label: installMode === 'delivery' ? 'Доставка' : 'Монтаж/Доставка', amount: result.installDelivery },
  ];
  if (result.urgentSurcharge > 0) mobilePriceLines.push({ label: 'Доплата за срочность', amount: result.urgentSurcharge });

  const formSections = (
    <>
      {hasSavedDraft && (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">
          <span>У вас есть сохранённый расчёт</span>
          <button onClick={handleRestore} className="font-semibold underline">Восстановить</button>
        </div>
      )}

      <Section icon={Ruler} title="Основные параметры">
        <CharCounterInput label="Текст на вывеске" value={mainText} onChange={setMainText} maxLength={20} placeholder="Введите название вашей вывески" />
        <div className="grid grid-cols-2 gap-3">
          <StepperInput label="Высота букв" unit="мм" value={mainHeightMm} onChange={setMainHeightMm} step={10} min={50} max={1200} />
          <StepperInput label="Глубина букв" unit="мм" value={depthMm} onChange={setDepthMm} step={5} min={20} max={100} />
        </div>
        <CharCounterInput label="Дополнительный текст (не обязательно)" hint="Например: кофе с собой" value={additionalText} onChange={setAdditionalText} maxLength={30} />
        {additionalText.trim() && (
          <StepperInput label="Высота букв доп. текста" unit="мм" value={additionalHeightMm} onChange={setAdditionalHeightMm} step={10} min={50} max={1200} />
        )}
      </Section>

      <Section icon={Palette} title="Внешний вид">
        <div className="space-y-1.5">
          <Label>Тип свечения</Label>
          <div className="grid grid-cols-3 gap-1.5 md:grid-cols-6 md:gap-2">
            {LETTER_TYPES.map((t) => {
              const available = isTypeAvailable(t, diapasons as any, pricingConfig);
              const active = letterType === t;
              return (
                <button
                  key={t}
                  type="button"
                  disabled={!available}
                  onClick={() => setLetterType(t)}
                  className={`flex flex-col items-center gap-1 rounded-xl border-2 p-1.5 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    active ? 'border-blue-500 bg-blue-50' : 'border-mist-200 hover:border-mist-300'
                  }`}
                >
                  <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-mist-100 md:h-16 md:w-16">
                    <Image src={TYPE_THUMBS[t]} alt={LETTER_TYPE_LABELS[t]} fill className="object-cover" />
                  </span>
                  <span className={`text-[10px] font-medium leading-tight ${active ? 'text-blue-700' : 'text-navy-700'}`}>
                    {LETTER_TYPE_LABELS[t]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <label className={`flex items-center gap-2 text-sm ${letterType === 'front' ? 'opacity-40' : 'text-navy-700'}`}>
          <input type="checkbox" checked={goldSilver} disabled={letterType === 'front'} onChange={(e) => setGoldSilver(e.target.checked)} />
          Золото / серебро (лицевое свечение станет недоступно)
        </label>
      </Section>

      <Section icon={Lightbulb} title="Подсветка">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Тип освещения</Label>
            <select value={ledType} onChange={(e) => setLedType(e.target.value as LedType)} className="h-10 w-full rounded-lg border border-border bg-white px-2 text-sm">
              <option value="none">Без освещения</option>
              <option value="modules">Модули</option>
              <option value="tape">Лента</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label>Блок питания</Label>
            <select value={psuType} onChange={(e) => setPsuType(e.target.value as PsuType)} className="h-10 w-full rounded-lg border border-border bg-white px-2 text-sm">
              <option value="none">Без блока питания</option>
              <option value="ip43">Открытый IP43</option>
              <option value="ip67">Закрытый IP67</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label>Температура</Label>
            <select
              value={ledTemp}
              onChange={(e) => setLedTemp(e.target.value as LedTemp)}
              disabled={ledType === 'none'}
              className="h-10 w-full rounded-lg border border-border bg-white px-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
            >
              <option value="cold">Холодный</option>
              <option value="neutral">Нейтральный</option>
              <option value="warm">Тёплый</option>
            </select>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Температура на стоимость не влияет — параметр для изготовления.</p>
      </Section>

      <Section icon={Layers} title="Подложка (композит)">
        <div className="grid grid-cols-2 gap-3">
          <StepperInput label="Ширина подложки" unit="см" value={backingWidthCm} onChange={setBackingWidthCm} step={10} min={30} max={720} />
          <StepperInput label="Высота подложки" unit="см" value={backingHeightCm} onChange={setBackingHeightCm} step={10} min={30} max={240} />
        </div>

        {result.backingFit ? (
          <>
            <BackingSheetVisualization fit={result.backingFit} />
            {backingHints.length > 0 && (
              <div className="space-y-1.5">
                {backingHints.map((h) => (
                  <div key={h.kind} className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    <HintIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{h.text}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="rounded-lg bg-mist-50 px-3 py-2 text-xs text-muted-foreground">
            Нестандартный размер (превышает 720×240 см) — считается индивидуально, свяжитесь с менеджером.
          </p>
        )}
      </Section>

      <Section icon={Truck} title="Монтаж/Доставка">
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
                <option value="light" disabled>Лёгкий (недоступно без каркаса)</option>
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
      </Section>
    </>
  );

  const gabaritStats = [
    { label: 'Высота', value: `${result.gabarits.heightMm} мм` },
    { label: 'Ширина', value: `${result.gabarits.widthMm} мм` },
    { label: 'Подложка', value: `${backingWidthCm}×${backingHeightCm} см` },
    { label: 'Площадь', value: `${result.gabarits.volumeM3} м³` },
  ];

  return (
    <>
    {/* ==================== МОБИЛЬНАЯ РАСКЛАДКА ==================== */}
    <div className="block space-y-4 pb-24 md:hidden">
      {formSections}

      <div className="grid grid-cols-4 gap-1.5">
        {gabaritStats.map((s) => (
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

    {/* ==================== ДЕСКТОПНАЯ РАСКЛАДКА ==================== */}
    <div className="hidden md:block">
    <CalculatorShell
      left={formSections}
      right={
        <>
          <LightLettersPreview mainText={mainText} additionalText={additionalText} goldSilver={goldSilver} hasFrame={false} />

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {gabaritStats.map((s) => (
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

function Section({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-navy-900">
        <Icon className="h-4 w-4 text-blue-600" /> {title}
      </h3>
      {children}
    </div>
  );
}
