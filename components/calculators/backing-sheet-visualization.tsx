'use client';

import { SHEET_LONG_CM, SHEET_SHORT_CM, type BackingFit } from '@/lib/backing-pricing';

// Лист всегда рисуем канонически как 240 (ширина) × 120 (высота) —
// с любой стороны это один и тот же физический лист 120×240,
// подсвечиваем в этой системе координат долю, которая реально уходит
// на панель нужного размера.
export function BackingSheetVisualization({ fit }: { fit: BackingFit }) {
  const sheetWidthPx = 200;
  const sheetHeightPx = (sheetWidthPx * SHEET_SHORT_CM) / SHEET_LONG_CM;

  if (!fit.isWholeSheets) {
    // Один лист — подсвечиваем угол пропорционально ширине/высоте панели
    // относительно канонических сторон листа (240×120).
    const widthFrac = Math.min(fit.tier.widthCm / SHEET_LONG_CM, 1);
    const heightFrac = Math.min(fit.tier.heightCm / SHEET_SHORT_CM, 1);
    return (
      <div className="flex flex-col items-center gap-2">
        <SheetBox widthPx={sheetWidthPx} heightPx={sheetHeightPx} highlightWidthFrac={widthFrac} highlightHeightFrac={heightFrac} />
        <p className="text-xs text-muted-foreground">
          Лист 120×240 см — используется {fit.tier.widthCm}×{fit.tier.heightCm} см (~{Math.round(fit.fractionOfSheet * 100)}%)
        </p>
      </div>
    );
  }

  // Несколько листов — раскладка sheetsAcross × sheetsDown, у каждого
  // листа подсвечена его часть (может быть 100%, если панель точно
  // кратна размеру листа).
  const perSheetWidthFrac = Math.min(fit.tier.widthCm / fit.sheetsAcross / SHEET_LONG_CM, 1);
  const perSheetHeightFrac = Math.min(fit.tier.heightCm / fit.sheetsDown / SHEET_SHORT_CM, 1);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        <div
          className="grid gap-1.5"
          style={{ gridTemplateColumns: `repeat(${fit.sheetsAcross}, ${sheetWidthPx}px)` }}
        >
          {Array.from({ length: fit.sheetsTotal }).map((_, i) => (
            <SheetBox key={i} widthPx={sheetWidthPx} heightPx={sheetHeightPx} highlightWidthFrac={perSheetWidthFrac} highlightHeightFrac={perSheetHeightFrac} />
          ))}
        </div>
      </div>
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <span className="font-semibold text-navy-900">× {fit.sheetsTotal}</span> листов 120×240 см —
        размер панели {fit.tier.widthCm}×{fit.tier.heightCm} см
      </p>
    </div>
  );
}

function SheetBox({
  widthPx, heightPx, highlightWidthFrac, highlightHeightFrac,
}: {
  widthPx: number; heightPx: number; highlightWidthFrac: number; highlightHeightFrac: number;
}) {
  return (
    <div
      className="relative shrink-0 rounded-md border-2 border-mist-300 bg-mist-50"
      style={{ width: widthPx, height: heightPx }}
    >
      <div
        className="absolute bottom-0 left-0 rounded-sm bg-blue-500/70"
        style={{ width: `${highlightWidthFrac * 100}%`, height: `${highlightHeightFrac * 100}%` }}
      />
    </div>
  );
}
