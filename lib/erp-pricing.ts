import type { InstallCity, InstallComplexity, ProductType, ProductTypeNorm } from './types';

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
