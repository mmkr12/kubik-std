'use client';

import { calcSheetLayout, getSheetHints } from '@/lib/erp-pricing';
import { formatTenge } from '@/lib/utils';
import type { ProductType } from '@/lib/types';
import { Lightbulb } from 'lucide-react';

export function SheetPreview({
  productType,
  widthM,
  heightM,
  text,
}: {
  productType: ProductType;
  widthM: number;
  heightM: number;
  text?: string;
}) {
  const layout = calcSheetLayout(productType, widthM, heightM);
  if (!layout || !productType.sheet_width_m || !productType.sheet_height_m) return null;

  const hints = getSheetHints(productType, widthM, heightM);

  const maxBox = 240;
  const sheetW = productType.sheet_width_m;
  const sheetH = productType.sheet_height_m;
  const scale = Math.min(maxBox / sheetW, maxBox / sheetH);
  const sheetPxW = sheetW * scale;
  const sheetPxH = sheetH * scale;
  const signPxW = Math.min(widthM, sheetW) * scale;
  const signPxH = Math.min(heightM, sheetH) * scale;

  return (
    <div className="space-y-3 rounded-xl border border-border bg-white p-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Лист {sheetW} × {sheetH} м</span>
        {layout.fitsInSheet ? (
          <span className="font-medium text-navy-900">{layout.tier?.label} — {formatTenge(layout.cost)}</span>
        ) : (
          <span className="font-medium text-navy-900">{layout.sheetsNeeded} листа — {formatTenge(layout.cost)}</span>
        )}
      </div>

      <svg viewBox={`0 0 ${sheetPxW} ${sheetPxH}`} width={sheetPxW} height={sheetPxH} className="mx-auto block">
        <rect x={0} y={0} width={sheetPxW} height={sheetPxH} fill="#F7F9FC" stroke="#E3E8F1" strokeWidth={2} />
        <rect x={0} y={0} width={signPxW} height={signPxH} fill="#EAF0FF" stroke="#2457E5" strokeWidth={1.5} />
        {text && (
          <text
            x={signPxW / 2}
            y={signPxH / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily="Arial, sans-serif"
            fontWeight={800}
            fontSize={Math.max(signPxH * 0.5, 8)}
            textLength={Math.max(signPxW * 0.92, 10)}
            lengthAdjust="spacingAndGlyphs"
            fill="#2457E5"
          >
            {text}
          </text>
        )}
      </svg>

      <p className="text-center text-xs text-muted-foreground">
        Синим — площадь вывески на листе. Раскладка приблизительная (по площади), точный раскрой готовит дизайнер.
      </p>

      {hints.length > 0 && (
        <div className="space-y-1.5 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
          {hints.map((h, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {h}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
