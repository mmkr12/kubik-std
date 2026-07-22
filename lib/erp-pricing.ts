import type { InstallCity, InstallComplexity, ProductType, ProductTypeNorm, SheetTier } from './types';

export interface ProductionSettingsRow {
  daily_capacity_hours: number;
  sunday_multiplier: number;
  weekday_surcharge_small: number;
  install_pricing: {
    taraz: {
      light: { min: number; max: number };
      medium: { min: number; max: number };
      medium_large: number;
      hard: number;
    };
    shymkent: number;
    almaty: number;
  };
}

export function resolveNorm(productType: ProductType, areaM2: number): ProductTypeNorm | null {
  if (!productType.norms.length) return null;
  // Нормативы отсортированы по возрастанию max_area_m2; null = "и больше".
  const sorted = [...productType.norms].sort((a, b) => {
    if (a.max_area_m2 === null) return 1;
    if (b.max_area_m2 === null) return -1;
    return a.max_area_m2 - b.max_area_m2;
  });
  return sorted.find((n) => n.max_area_m2 === null || areaM2 <= n.max_area_m2) ?? sorted[sorted.length - 1];
}

export function averageHours(norm: ProductTypeNorm | null, kind: 'manufacture' | 'install') {
  if (!norm) return 0;
  const min = kind === 'manufacture' ? norm.manufacture_hours_min : norm.install_hours_min;
  const max = kind === 'manufacture' ? norm.manufacture_hours_max : norm.install_hours_max;
  if (min == null || max == null) return 0;
  return (min + max) / 2;
}

export function calcItemCost(productType: ProductType, params: { widthM?: number; heightM?: number; count?: number }) {
  if (productType.unit === 'm2') {
    const area = Math.max(params.widthM ?? 1, 0.1) * Math.max(params.heightM ?? 1, 0.1);
    return { area, cost: Math.round(productType.price_per_unit * area) };
  }
  const count = Math.max(params.count ?? 1, 1);
  return { area: 0, cost: Math.round(productType.price_per_unit * count) };
}

export interface SheetLayoutResult {
  area: number;
  sheetArea: number;
  fitsInSheet: boolean;
  sheetsNeeded: number;
  tier: SheetTier | null; // выбранная доля листа (если поместилось в одну)
  cost: number;
}

// Себестоимость по листам: ищем самую дешёвую долю листа, в площадь
// которой укладывается вывеска. Если она больше целого листа —
// считаем количество целых листов. Упрощённо (по площади, без учёта
// ориентации реза) — этого достаточно для оценки на этапе расчёта.
export function calcSheetLayout(productType: ProductType, widthM: number, heightM: number): SheetLayoutResult | null {
  if (!productType.sheet_width_m || !productType.sheet_height_m || productType.sheet_tiers.length === 0) return null;

  const area = Math.max(widthM, 0.1) * Math.max(heightM, 0.1);
  const sheetArea = productType.sheet_width_m * productType.sheet_height_m;
  const maxSheetEdge = Math.max(productType.sheet_width_m, productType.sheet_height_m);
  const fitsEdge = Math.max(widthM, heightM) <= maxSheetEdge;

  const sortedTiers = [...productType.sheet_tiers].sort((a, b) => a.fraction - b.fraction);
  const fullTier = sortedTiers[sortedTiers.length - 1];

  if (!fitsEdge || area > sheetArea) {
    const sheetsNeeded = Math.ceil(area / sheetArea);
    return { area, sheetArea, fitsInSheet: false, sheetsNeeded, tier: null, cost: sheetsNeeded * fullTier.price };
  }

  const tier = sortedTiers.find((t) => area <= t.fraction * sheetArea) ?? fullTier;
  return { area, sheetArea, fitsInSheet: true, sheetsNeeded: 1, tier, cost: tier.price };
}

// Подсказки: "уменьшите до X — сэкономите" / "можно увеличить почти без
// изменения цены". Считаем от той же таблицы долей листа.
export function getSheetHints(productType: ProductType, widthM: number, heightM: number): string[] {
  const layout = calcSheetLayout(productType, widthM, heightM);
  if (!layout || !layout.tier) return [];

  const hints: string[] = [];
  const sortedTiers = [...productType.sheet_tiers].sort((a, b) => a.fraction - b.fraction);
  const currentIndex = sortedTiers.findIndex((t) => t.label === layout.tier!.label);
  const cheaperTier = sortedTiers[currentIndex - 1];
  const moreExpensiveTier = sortedTiers[currentIndex + 1];

  if (cheaperTier) {
    const maxAreaForCheaper = cheaperTier.fraction * layout.sheetArea;
    const overshoot = layout.area - maxAreaForCheaper;
    const overshootRatio = overshoot / maxAreaForCheaper;
    if (overshootRatio > 0 && overshootRatio <= 0.15) {
      const savings = layout.tier.price - cheaperTier.price;
      hints.push(`Уменьшите примерно на ${Math.round(overshootRatio * 100)}% по площади — уложитесь в «${cheaperTier.label}» и сэкономите ${formatTengeShort(savings)}`);
    }
  }

  if (moreExpensiveTier) {
    const maxAreaForCurrent = layout.tier.fraction * layout.sheetArea;
    const headroomRatio = (maxAreaForCurrent - layout.area) / maxAreaForCurrent;
    if (headroomRatio >= 0.15) {
      hints.push(`До границы «${layout.tier.label}» есть запас — вывеску можно сделать заметно больше без изменения цены`);
    }
  }

  return hints;
}

function formatTengeShort(n: number) {
  return `${Math.round(n).toLocaleString('ru-RU')} ₸`;
}

export function calcInstallCost(opts: {
  installMode: ProductType['install_mode'];
  city: InstallCity;
  complexity: InstallComplexity | null;
  sundayRequested: boolean;
  settings: ProductionSettingsRow;
}): number {
  const { installMode, city, complexity, sundayRequested, settings } = opts;

  if (installMode === 'included' || installMode === 'manual') return 0;

  let base = 0;
  if (city === 'shymkent') base = settings.install_pricing.shymkent;
  else if (city === 'almaty') base = settings.install_pricing.almaty;
  else {
    const pricing = settings.install_pricing.taraz;
    if (complexity === 'light') base = (pricing.light.min + pricing.light.max) / 2;
    else if (complexity === 'medium') base = (pricing.medium.min + pricing.medium.max) / 2;
    else if (complexity === 'medium_large') base = pricing.medium_large;
    else if (complexity === 'hard') base = pricing.hard;
  }

  // Двойной тариф — только если воскресенье выбрано по требованию клиента,
  // а не по инициативе компании (иначе x2 не применяется).
  if (sundayRequested) base *= settings.sunday_multiplier;

  return Math.round(base);
}

// Доплата за внеплановое выполнение мелкого заказа (пн–чт вместо пт/сб).
export function calcWeekdaySurcharge(opts: {
  productType: ProductType;
  installDateISO: string | null;
  settings: ProductionSettingsRow;
}): { applied: boolean; amount: number } {
  const { productType, installDateISO, settings } = opts;
  if (productType.install_mode !== 'included' || !installDateISO) return { applied: false, amount: 0 };

  const day = new Date(installDateISO).getDay(); // 0=вс,1=пн...6=сб
  const isFridayOrSaturday = day === 5 || day === 6;
  const isPreferredDay = productType.schedule_days.includes(
    (['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const)[day]
  );

  if (isFridayOrSaturday || isPreferredDay) return { applied: false, amount: 0 };

  return { applied: true, amount: settings.weekday_surcharge_small };
}
