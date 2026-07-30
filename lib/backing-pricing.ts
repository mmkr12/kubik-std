// ============================================================
// KUBIK.std — расход композита для «Световых букв на подложке»
// Лист композита: 120×240см (ориентация не важна — 120×240 и 240×120
// считаются одним и тем же листом). Расход считается по размерной
// сетке (фиксированный список готовых размеров), а не по кв.м: заказ
// клиента округляется вверх до ближайшего подходящего размера сетки.
// ============================================================

export const SHEET_SHORT_CM = 120;
export const SHEET_LONG_CM = 240;
const SHEET_AREA = SHEET_SHORT_CM * SHEET_LONG_CM;

export interface BackingGridTier {
  widthCm: number;
  heightCm: number;
}

// Ровно те размеры, что реально продаются — округление идёт только до
// одного из этих десяти, не до произвольной точки на сетке.
export const BACKING_GRID: BackingGridTier[] = [
  { widthCm: 120, heightCm: 80 },
  { widthCm: 120, heightCm: 120 },
  { widthCm: 160, heightCm: 60 },
  { widthCm: 160, heightCm: 120 },
  { widthCm: 240, heightCm: 60 },
  { widthCm: 240, heightCm: 120 },
  { widthCm: 480, heightCm: 60 },
  { widthCm: 480, heightCm: 120 },
  { widthCm: 720, heightCm: 120 },
  { widthCm: 720, heightCm: 240 },
];

export interface BackingFit {
  tier: BackingGridTier;
  sheetsAcross: number; // сколько листов в ряд по ширине (720 = 3 листа по 240см)
  sheetsDown: number; // сколько листов друг на друге по высоте (240 = 2 листа по 120см)
  sheetsTotal: number;
  isWholeSheets: boolean; // true — оплата целыми листами (720х120 = 3 листа и т.п.)
  fractionOfSheet: number; // при isWholeSheets=false — доля одного листа (0..1)
  cost: number;
}

/** Сколько физических листов 120×240 нужно на панель шириной/высотой tier (без сетки, просто геометрия). */
function tileSheets(widthCm: number, heightCm: number) {
  const sheetsAcross = Math.ceil(widthCm / SHEET_LONG_CM);
  const sheetsDown = Math.ceil(heightCm / SHEET_SHORT_CM);
  return { sheetsAcross, sheetsDown, sheetsTotal: sheetsAcross * sheetsDown };
}

export function calcBackingCost(tier: BackingGridTier, sheetPrice: number): BackingFit {
  const { sheetsAcross, sheetsDown, sheetsTotal } = tileSheets(tier.widthCm, tier.heightCm);
  if (sheetsTotal <= 1) {
    const fractionOfSheet = (tier.widthCm * tier.heightCm) / SHEET_AREA;
    return { tier, sheetsAcross, sheetsDown, sheetsTotal: 1, isWholeSheets: false, fractionOfSheet, cost: Math.round(fractionOfSheet * sheetPrice / 100) * 100 };
  }
  return { tier, sheetsAcross, sheetsDown, sheetsTotal, isWholeSheets: true, fractionOfSheet: 1, cost: sheetsTotal * sheetPrice };
}

/** Ближайший (самый дешёвый) размер сетки, который вмещает заказанные widthCm×heightCm. */
export function findFittingTier(widthCm: number, heightCm: number, sheetPrice: number): BackingFit | null {
  const candidates = BACKING_GRID
    .filter((t) => t.widthCm >= widthCm && t.heightCm >= heightCm)
    .map((t) => calcBackingCost(t, sheetPrice));
  if (candidates.length === 0) return null;
  return candidates.reduce((cheapest, c) => (c.cost < cheapest.cost ? c : cheapest));
}

export interface BackingHint {
  kind: 'narrower' | 'wider';
  widthCm: number;
  text: string;
}

/**
 * Подсказки по ширине:
 * - "narrower" — есть более дешёвый размер сетки, если чуть уменьшить
 *   заявленную ширину (высота при этом всё ещё помещается).
 * - "wider" — подобранный размер сетки и так шире, чем заказано, значит
 *   можно расширить вывеску до этой ширины без доплаты.
 */
export function findBackingHints(widthCm: number, heightCm: number, sheetPrice: number, fit: BackingFit): BackingHint[] {
  const hints: BackingHint[] = [];

  if (fit.tier.widthCm > widthCm) {
    hints.push({
      kind: 'wider',
      widthCm: fit.tier.widthCm,
      text: `При такой высоте вы уже платите за ширину до ${fit.tier.widthCm} см — можно увеличить вывеску до этой ширины без изменения цены.`,
    });
  }

  const cheaperNarrower = BACKING_GRID
    .filter((t) => t.widthCm < widthCm && t.heightCm >= heightCm)
    .map((t) => calcBackingCost(t, sheetPrice))
    .filter((c) => c.cost < fit.cost)
    .sort((a, b) => b.tier.widthCm - a.tier.widthCm)[0];

  if (cheaperNarrower) {
    hints.push({
      kind: 'narrower',
      widthCm: cheaperNarrower.tier.widthCm,
      text: `Если уменьшить ширину до ${cheaperNarrower.tier.widthCm} см — расход материала снизится с ${formatFraction(fit)} до ${formatFraction(cheaperNarrower)}.`,
    });
  }

  return hints;
}

function formatFraction(fit: BackingFit): string {
  if (fit.isWholeSheets) return `${fit.sheetsTotal} ${plural(fit.sheetsTotal)}`;
  const pct = Math.round(fit.fractionOfSheet * 100);
  return `~${pct}% листа`;
}

function plural(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return 'листа';
  return 'листов';
}
