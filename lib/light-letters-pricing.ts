// ============================================================
// KUBIK.std — «Световые буквы на каркасе»
// Вся расчётная логика в одном месте, без UI, чтобы формулы
// было легко проверить и поправить отдельно от интерфейса.
// ============================================================

export type Diapason = '50-250' | '251-750' | '751-1200';
export type LetterType = 'full_combo' | 'full_single' | 'front' | 'side' | 'back' | 'back_and_front';
export type LedType = 'modules' | 'tape';
export type PsuType = 'ip43' | 'ip67' | 'none';
export type FrameType = '20x20' | '40x20' | 'none';
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

// ---- 1. Диапазон высоты буквы --------------------------------------------
export function getDiapason(heightMm: number): Diapason {
  if (heightMm <= 250) return '50-250';
  if (heightMm <= 750) return '251-750';
  return '751-1200';
}

// ---- 2. Базовая стоимость изготовления (₸/мм высоты) по диапазону -------
const RATE_PER_MM: Record<Diapason, number> = {
  '50-250': 17,
  '251-750': 27,
  '751-1200': 22,
};

// ---- 3. Процент глубины букв — три опорные точки + интерполяция ---------
// 40мм=84.5%, 50мм=100%, 60мм=116%. За пределами — тем же наклоном,
// что и у ближайшего известного отрезка (как ты и разрешил — "определи сам").
const DEPTH_ANCHORS: [number, number][] = [
  [40, 0.845],
  [50, 1.0],
  [60, 1.16],
];

export function getDepthPct(depthMm: number): number {
  const d = Math.min(Math.max(depthMm, 20), 100);
  const [a1, a2] = DEPTH_ANCHORS;
  const [b1, b2] = [DEPTH_ANCHORS[1], DEPTH_ANCHORS[2]];

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

// ---- 4. Множитель по типу свечения, зависит от диапазона ----------------
// null = "не доступно" в этом диапазоне.
const TYPE_MULTIPLIERS: Record<LetterType, Record<Diapason, number | null>> = {
  full_combo: { '50-250': 1.25, '251-750': 1.4, '751-1200': null },
  full_single: { '50-250': 1, '251-750': 1, '751-1200': 2 },
  front: { '50-250': 1.15, '251-750': 1, '751-1200': 1 },
  side: { '50-250': 1.2, '251-750': 1, '751-1200': 2 },
  back: { '50-250': 1.5, '251-750': 1.6, '751-1200': 1.4 },
  back_and_front: { '50-250': 1.8, '251-750': 2, '751-1200': 2 },
};
const GOLD_SILVER_MULTIPLIER = 1.5;

export function isTypeAvailable(type: LetterType, diapasons: Diapason[]): boolean {
  return diapasons.every((d) => TYPE_MULTIPLIERS[type][d] !== null);
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

function calcRow(row: TextRow, depthMm: number): RowResult {
  const letterCount = countLetters(row.text);
  const diapason = getDiapason(row.heightMm);
  const baseCost = row.heightMm * RATE_PER_MM[diapason] * letterCount * getDepthPct(depthMm);
  const metalMeters = (letterCount * row.heightMm * 2 + row.heightMm * 4) / 1000;

  return { diapason, letterCount, baseCost, metalMeters };
}

// ---- 5. Блоки питания: 1 блок на 200 модулей / 30м ленты, +20% запас ------
// Порог для (n+1)-го блока = n × ёмкость + 20% от одной ёмкости.
function calcBlocks(qty: number, capacity: number): number {
  if (qty <= 0) return 0;
  const grace = capacity * 0.2;
  return Math.floor((qty - grace) / capacity) + 1;
}

// ---- 6. Каркас: цена за метр по толщине ------------------------------------
const FRAME_PRICE_PER_M: Record<Exclude<FrameType, 'none'>, number> = {
  '20x20': 3000,
  '40x20': 3500,
};

// ---- 7. Монтаж / доставка ---------------------------------------------------
const COMPLEXITY_PRICE: Record<Complexity, number> = {
  light: 10000,
  medium: 25000,
  medium_large: 40000,
  hard: 60000,
};
const CITY_FIXED_PRICE: Partial<Record<InstallCity, number>> = {
  shymkent: 60000,
  almaty: 120000,
};
const DELIVERY_PRICE: Record<Exclude<DeliveryOption, 'cdek'>, number> = {
  pickup: 0,
  taraz: 5000,
  shymkent: 15000,
  almaty: 20000,
};

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
  psuType: PsuType;
  frameType: FrameType;
  installMode: 'install' | 'delivery' | 'none';
  installCity: InstallCity;
  complexity: Complexity;
  deliveryOption: DeliveryOption;
  urgent: boolean;
}

export interface CalculatorResult {
  gabarits: { heightMm: number; widthMm: number; depthMm: number; volumeM3: number };
  letterManufacture: number; // "Изготовление букв"
  letterDesign: number; // "Дизайн букв" (разница от множителя типа + золото/серебро)
  lighting: number; // "Освещение"
  frame: number; // "Изготовление каркаса"
  material: number; // сумма 4 строк выше
  production: number; // "Изготовление" = 60% от material
  installDelivery: number; // "Монтаж / Доставка"
  urgentSurcharge: number; // доплата за срочность (уже включена в install+production при подсчёте total, но показываем отдельно)
  total: number;
  rows: { main: RowResult; additional: RowResult | null };
}

export function calculate(input: CalculatorInput): CalculatorResult {
  const mainRow = calcRow({ text: input.mainText, heightMm: input.mainHeightMm }, input.depthMm);
  const hasAdditional = input.additionalText.trim().length > 0;
  const addRow = hasAdditional ? calcRow({ text: input.additionalText, heightMm: input.additionalHeightMm }, input.depthMm) : null;

  const rows = [mainRow, ...(addRow ? [addRow] : [])];

  // Изготовление букв
  const letterManufacture = Math.round(rows.reduce((s, r) => s + r.baseCost, 0) / 100) * 100;

  // Дизайн букв — разница от множителя типа свечения + золото/серебро.
  // Золото/серебро — доп. множитель "в дополнение к любому типу".
  let letterDesign = 0;
  for (const r of rows) {
    const typeMult = TYPE_MULTIPLIERS[input.letterType][r.diapason] ?? 1;
    const finalCost = input.goldSilver ? r.baseCost * typeMult * GOLD_SILVER_MULTIPLIER : r.baseCost * typeMult;
    letterDesign += finalCost - r.baseCost;
  }
  letterDesign = Math.round(letterDesign / 100) * 100;

  // Освещение
  const LED_PER_LETTER: Record<Diapason, { modules: number; tapeM: number }> = {
    '50-250': { modules: 5, tapeM: 1 },
    '251-750': { modules: 20, tapeM: 3 },
    '751-1200': { modules: 60, tapeM: 5 },
  };
  let ledQty = 0; // модулей или метров ленты, суммарно
  for (const r of rows) {
    const per = LED_PER_LETTER[r.diapason];
    ledQty += input.ledType === 'modules' ? r.letterCount * per.modules : r.letterCount * per.tapeM;
  }
  const ledUnitPrice = input.ledType === 'modules' ? 80 : 1000;
  const ledCost = ledQty * ledUnitPrice;
  const blocks = input.psuType === 'none' ? 0 : calcBlocks(ledQty, input.ledType === 'modules' ? 200 : 30);
  const psuUnitPrice = input.psuType === 'ip67' ? 16000 : input.psuType === 'ip43' ? 8000 : 0;
  const lighting = Math.round((ledCost + blocks * psuUnitPrice) / 100) * 100;

  // Каркас
  const metalMeters = rows.reduce((s, r) => s + r.metalMeters, 0);
  const frame = input.frameType === 'none' ? 0 : Math.round(metalMeters * FRAME_PRICE_PER_M[input.frameType] / 100) * 100;

  const material = letterManufacture + letterDesign + lighting + frame;
  const production = Math.round(material * 0.6 / 100) * 100;

  // Монтаж / доставка
  let installDelivery = 0;
  if (input.installMode === 'install') {
    installDelivery = CITY_FIXED_PRICE[input.installCity] ?? COMPLEXITY_PRICE[input.complexity];
  } else if (input.installMode === 'delivery') {
    installDelivery = input.deliveryOption === 'cdek' ? 0 : DELIVERY_PRICE[input.deliveryOption as Exclude<DeliveryOption, 'cdek'>];
  }

  // Срочно: (Изготовление + Монтаж) × 1.5 — считаем от уже округлённых
  // строк сметы, чтобы смета и итог сходились без расхождений в копейках.
  const urgentMultiplier = input.urgent ? 1.5 : 1;
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
    material,
    production: productionFinal,
    installDelivery: installDeliveryFinal,
    urgentSurcharge,
    total,
    rows: { main: mainRow, additional: addRow },
  };
}
