import { findFittingTier, type BackingFit } from './backing-pricing';

// ============================================================
// KUBIK.std — «Световые буквы на каркасе»
// Вся расчётная логика в одном месте, без UI, чтобы формулы
// было легко проверить и поправить отдельно от интерфейса.
// Все цены и коэффициенты вынесены в LightLettersPricingConfig —
// редактируются в /admin/settings без правки кода (хранятся в
// production_settings.light_letters_pricing).
// ============================================================

export type Diapason = '50-250' | '251-750' | '751-1200';
export type LetterType = 'full_combo' | 'full_single' | 'front' | 'side' | 'back' | 'back_and_front';
export type LedType = 'modules' | 'tape' | 'none';
export type PsuType = 'ip43' | 'ip67' | 'none';
export type FrameType = 'none' | 'with_frame';
export type LedTemp = 'cold' | 'neutral' | 'warm';
export type InstallCity = 'taraz' | 'shymkent' | 'almaty';
export type DeliveryOption = 'pickup' | 'taraz' | 'shymkent' | 'almaty' | 'cdek';
export type Complexity = 'light' | 'medium' | 'medium_large' | 'hard';

export const LETTER_TYPE_LABELS: Record<LetterType, string> = {
  full_combo: 'Полное (комбо цветов)',
  full_single: 'Полное (один цвет)',
  front: 'Лицевое',
  side: 'Боковое',
  back: 'Заднее',
  back_and_front: 'Заднее и лицевое',
};

// Миниатюры примеров типа свечения — в обычном модуле (не 'use client'),
// чтобы серверные страницы (например, /kp) тоже могли их импортировать.
export const TYPE_THUMBS: Record<LetterType, string> = {
  full_combo: '/calc/tip/polnoe_combo.png',
  full_single: '/calc/tip/polnoe.png',
  front: '/calc/tip/licevoe.png',
  side: '/calc/tip/bokovoe.png',
  back: '/calc/tip/zadnee.png',
  back_and_front: '/calc/tip/zadnee_i_licevoe.png',
};

// ---- 1. Диапазон высоты буквы --------------------------------------------
export function getDiapason(heightMm: number): Diapason {
  if (heightMm <= 250) return '50-250';
  if (heightMm <= 750) return '251-750';
  return '751-1200';
}

// ============================================================
// Конфигурация цен — редактируется в /admin/settings
// ============================================================

export interface LightLettersPricingConfig {
  // 2. Базовая стоимость изготовления (₸/мм высоты) по диапазону
  ratePerMm: Record<Diapason, number>;
  // 3. Процент глубины букв — три опорные точки (мм → доля от 100%).
  // За пределами известных точек экстраполируется тем же наклоном.
  depthAnchors: [number, number][];
  // 4. Множитель по типу свечения, зависит от диапазона (null = недоступно)
  typeMultipliers: Record<LetterType, Record<Diapason, number | null>>;
  goldSilverMultiplier: number;
  // 5. Подсветка
  ledPerLetter: Record<Diapason, { modules: number; tapeM: number }>;
  ledModuleUnitPrice: number;
  ledTapeUnitPricePerM: number;
  // Блоки питания: 1 блок на N модулей/метров ленты, + запас (доля от ёмкости)
  psuModuleCapacity: number;
  psuTapeCapacityM: number;
  psuGraceFraction: number;
  psuUnitPrice: { ip43: number; ip67: number };
  // 6. Каркас: ступенчатая цена — каждые N метров расхода = цена
  frameStepMeters: number;
  frameStepPrice: number;
  // 7. Монтаж / доставка
  complexityPrice: Record<Complexity, number>;
  cityFixedPrice: Partial<Record<InstallCity, number>>;
  deliveryPrice: Record<Exclude<DeliveryOption, 'cdek'>, number>;
  // «Изготовление» — наценка сверх себестоимости материалов
  productionPct: number;
  // Срочно: (Изготовление + Монтаж) × множитель
  urgentMultiplier: number;
  // Подложка (композит) — цена одного листа 120×240см, используется
  // калькулятором «Световые буквы на подложке» (lib/backing-pricing.ts)
  compositeSheetPrice: number;
}

export const DEFAULT_PRICING_CONFIG: LightLettersPricingConfig = {
  ratePerMm: { '50-250': 17, '251-750': 27, '751-1200': 22 },
  depthAnchors: [
    [40, 0.845],
    [50, 1.0],
    [60, 1.16],
  ],
  typeMultipliers: {
    full_combo: { '50-250': 1.25, '251-750': 1.4, '751-1200': null },
    full_single: { '50-250': 1, '251-750': 1, '751-1200': 2 },
    front: { '50-250': 1.15, '251-750': 1, '751-1200': 1 },
    side: { '50-250': 1.2, '251-750': 1, '751-1200': 2 },
    back: { '50-250': 1.5, '251-750': 1.6, '751-1200': 1.4 },
    back_and_front: { '50-250': 1.8, '251-750': 2, '751-1200': 2 },
  },
  goldSilverMultiplier: 1.5,
  ledPerLetter: {
    '50-250': { modules: 5, tapeM: 1 },
    '251-750': { modules: 20, tapeM: 3 },
    '751-1200': { modules: 60, tapeM: 5 },
  },
  ledModuleUnitPrice: 80,
  ledTapeUnitPricePerM: 1000,
  psuModuleCapacity: 200,
  psuTapeCapacityM: 30,
  psuGraceFraction: 0.2,
  psuUnitPrice: { ip43: 8000, ip67: 16000 },
  frameStepMeters: 6,
  frameStepPrice: 8000,
  complexityPrice: { light: 10000, medium: 25000, medium_large: 40000, hard: 60000 },
  cityFixedPrice: { shymkent: 60000, almaty: 120000 },
  deliveryPrice: { pickup: 0, taraz: 5000, shymkent: 15000, almaty: 20000 },
  productionPct: 0.2,
  urgentMultiplier: 1.5,
  compositeSheetPrice: 18000,
};

export function getDepthPct(depthMm: number, config: LightLettersPricingConfig = DEFAULT_PRICING_CONFIG): number {
  const d = Math.min(Math.max(depthMm, 20), 100);
  const anchors = config.depthAnchors;
  const [a1, a2] = anchors;
  const [b1, b2] = [anchors[1], anchors[2]];

  if (d <= a1[0]) {
    const slope = (a2[1] - a1[1]) / (a2[0] - a1[0]);
    return a1[1] + slope * (d - a1[0]);
  }
  if (d <= b2[0]) {
    const slope = (b2[1] - b1[1]) / (b2[0] - b1[0]);
    return b1[1] + slope * (d - b1[0]);
  }
  const slope = (b2[1] - b1[1]) / (b2[0] - b1[0]);
  return b2[1] + slope * (d - b2[0]);
}

export function isTypeAvailable(type: LetterType, diapasons: Diapason[], config: LightLettersPricingConfig = DEFAULT_PRICING_CONFIG): boolean {
  return diapasons.every((d) => config.typeMultipliers[type][d] !== null);
}

// ---- Строка текста (основной или дополнительный) -------------------------
export interface TextRow {
  text: string;
  heightMm: number;
}

export interface RowResult {
  diapason: Diapason;
  letterCount: number;
  baseCost: number; // "изготовление букв" по этой строке
  metalMeters: number; // расход металла по этой строке
}

function countLetters(text: string): number {
  return text.replace(/\s/g, '').length || 0;
}

function calcRow(row: TextRow, depthMm: number, config: LightLettersPricingConfig): RowResult {
  const letterCount = countLetters(row.text);
  const diapason = getDiapason(row.heightMm);
  const baseCost = row.heightMm * config.ratePerMm[diapason] * letterCount * getDepthPct(depthMm, config);
  const metalMeters = (letterCount * row.heightMm * 2 + row.heightMm * 4) / 1000;

  return { diapason, letterCount, baseCost, metalMeters };
}

function calcBlocks(qty: number, capacity: number, graceFraction: number): number {
  if (qty <= 0) return 0;
  const grace = capacity * graceFraction;
  return Math.floor((qty - grace) / capacity) + 1;
}

function calcFrameStepCost(meters: number, config: LightLettersPricingConfig): number {
  if (meters <= 0) return 0;
  return Math.ceil(meters / config.frameStepMeters) * config.frameStepPrice;
}

// ============================================================
// Главная функция расчёта
// ============================================================

export interface CalculatorInput {
  mainText: string;
  mainHeightMm: number;
  depthMm: number;
  additionalText: string;
  additionalHeightMm: number;
  letterType: LetterType;
  goldSilver: boolean;
  ledType: LedType;
  ledTemp: LedTemp;
  psuType: PsuType;
  frameType: FrameType;
  installMode: 'install' | 'delivery' | 'none';
  installCity: InstallCity;
  complexity: Complexity;
  deliveryOption: DeliveryOption;
  urgent: boolean;
  // Подложка (калькулятор "Световые буквы на подложке") — если оба поля
  // заданы, calculate() сам подберёт размер по сетке (lib/backing-pricing.ts)
  // и добавит стоимость листа в material.
  backingWidthCm?: number;
  backingHeightCm?: number;
}

export interface CalculatorResult {
  gabarits: { heightMm: number; widthMm: number; depthMm: number; volumeM3: number };
  letterManufacture: number; // "Изготовление букв"
  letterDesign: number; // "Дизайн букв" (разница от множителя типа + золото/серебро)
  lighting: number; // "Освещение"
  frame: number; // "Изготовление каркаса"
  backing: number; // "Подложка"
  backingFit: BackingFit | null; // подробности подбора листа — для визуализации/подсказок
  material: number; // сумма строк выше
  production: number; // "Изготовление" — наценка сверх себестоимости (config.productionPct)
  installDelivery: number; // "Монтаж / Доставка"
  urgentSurcharge: number; // доплата за срочность (уже включена в install+production при подсчёте total, но показываем отдельно)
  total: number;
  rows: { main: RowResult; additional: RowResult | null };
}

// kind различает, каким калькулятором собран черновик — используется
// при добавлении позиции в заказ (order-workspace.tsx), чтобы правильно
// подписать tech_spec.type.
export interface LightLettersDraft {
  kind: 'light_letters_on_frame' | 'light_letters_on_backing';
  input: CalculatorInput;
  result: CalculatorResult;
}

export function calculate(input: CalculatorInput, config: LightLettersPricingConfig = DEFAULT_PRICING_CONFIG): CalculatorResult {
  const backingFit =
    input.backingWidthCm && input.backingHeightCm
      ? findFittingTier(input.backingWidthCm, input.backingHeightCm, config.compositeSheetPrice)
      : null;
  const backingCost = backingFit?.cost ?? 0;
  const mainRow = calcRow({ text: input.mainText, heightMm: input.mainHeightMm }, input.depthMm, config);
  const hasAdditional = input.additionalText.trim().length > 0;
  const addRow = hasAdditional ? calcRow({ text: input.additionalText, heightMm: input.additionalHeightMm }, input.depthMm, config) : null;

  const rows = [mainRow, ...(addRow ? [addRow] : [])];

  // Изготовление букв
  const letterManufacture = Math.round(rows.reduce((s, r) => s + r.baseCost, 0) / 100) * 100;

  // Дизайн букв — разница от множителя типа свечения + золото/серебро.
  // Золото/серебро — доп. множитель "в дополнение к любому типу".
  let letterDesign = 0;
  for (const r of rows) {
    const typeMult = config.typeMultipliers[input.letterType][r.diapason] ?? 1;
    const finalCost = input.goldSilver ? r.baseCost * typeMult * config.goldSilverMultiplier : r.baseCost * typeMult;
    letterDesign += finalCost - r.baseCost;
  }
  letterDesign = Math.round(letterDesign / 100) * 100;

  // Освещение — если тип освещения "без освещения", подсветка не считается вовсе.
  let lighting = 0;
  if (input.ledType !== 'none') {
    let ledQty = 0; // модулей или метров ленты, суммарно
    for (const r of rows) {
      const per = config.ledPerLetter[r.diapason];
      ledQty += input.ledType === 'modules' ? r.letterCount * per.modules : r.letterCount * per.tapeM;
    }
    const ledUnitPrice = input.ledType === 'modules' ? config.ledModuleUnitPrice : config.ledTapeUnitPricePerM;
    const ledCost = ledQty * ledUnitPrice;
    const capacity = input.ledType === 'modules' ? config.psuModuleCapacity : config.psuTapeCapacityM;
    const blocks = input.psuType === 'none' ? 0 : calcBlocks(ledQty, capacity, config.psuGraceFraction);
    const psuUnitPrice = input.psuType === 'ip67' ? config.psuUnitPrice.ip67 : input.psuType === 'ip43' ? config.psuUnitPrice.ip43 : 0;
    lighting = Math.round((ledCost + blocks * psuUnitPrice) / 100) * 100;
  }

  // Каркас — ступенчатая цена (каждые frameStepMeters расхода металла = frameStepPrice)
  const metalMeters = rows.reduce((s, r) => s + r.metalMeters, 0);
  const frame = input.frameType === 'none' ? 0 : calcFrameStepCost(metalMeters, config);

  const material = letterManufacture + letterDesign + lighting + frame + backingCost;
  const production = Math.round((material * config.productionPct) / 100) * 100;

  // Монтаж / доставка
  let installDelivery = 0;
  if (input.installMode === 'install') {
    installDelivery = config.cityFixedPrice[input.installCity] ?? config.complexityPrice[input.complexity];
  } else if (input.installMode === 'delivery') {
    installDelivery = input.deliveryOption === 'cdek' ? 0 : config.deliveryPrice[input.deliveryOption as Exclude<DeliveryOption, 'cdek'>];
  }

  // Срочно: (Изготовление + Монтаж) × urgentMultiplier — считаем от уже
  // округлённых строк сметы, чтобы смета и итог сходились без расхождений в копейках.
  const urgentMultiplier = input.urgent ? config.urgentMultiplier : 1;
  const productionFinal = Math.round((production * urgentMultiplier) / 100) * 100;
  const installDeliveryFinal = Math.round((installDelivery * urgentMultiplier) / 100) * 100;
  const urgentSurcharge = (productionFinal - production) + (installDeliveryFinal - installDelivery);

  const total = material + productionFinal + installDeliveryFinal;

  // Габариты
  const heightMm = input.mainHeightMm + (hasAdditional ? input.additionalHeightMm : 0) + 150;
  const mainWidthMm = input.mainHeightMm * mainRow.letterCount;
  const addWidthMm = addRow ? input.additionalHeightMm * addRow.letterCount : 0;
  const widthMm = Math.max(mainWidthMm, addWidthMm);
  const depthMm = input.frameType === 'none' ? input.depthMm + 5 : input.depthMm + 25;
  const volumeM3 = Math.round((heightMm / 1000) * (widthMm / 1000) * (depthMm / 1000) * 1000) / 1000;

  return {
    gabarits: { heightMm, widthMm, depthMm, volumeM3 },
    letterManufacture,
    letterDesign,
    lighting,
    frame,
    backing: backingCost,
    backingFit,
    material,
    production: productionFinal,
    installDelivery: installDeliveryFinal,
    urgentSurcharge,
    total,
    rows: { main: mainRow, additional: addRow },
  };
}
