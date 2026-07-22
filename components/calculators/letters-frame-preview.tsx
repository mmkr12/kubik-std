'use client';

export function LettersFramePreview({
  text,
  totalWidthM,
  letterHeightMm,
  fontFamily,
  hasFrame,
}: {
  text: string;
  totalWidthM: number;
  letterHeightMm: number;
  fontFamily: string;
  hasFrame: boolean;
}) {
  const maxBoxW = 320;
  const widthM = Math.max(totalWidthM, 0.3);
  const heightM = Math.max((letterHeightMm / 1000) * 1.8, 0.15); // с запасом сверху/снизу под каркас
  const scale = maxBoxW / widthM;
  const boxW = widthM * scale;
  const boxH = heightM * scale;
  const barThickness = Math.max(boxH * 0.06, 3);
  const letterPx = (letterHeightMm / 1000) * scale;

  return (
    <div className="space-y-2 rounded-xl border border-border bg-white p-4">
      <p className="text-xs font-medium text-navy-700">Каркас с текстом (превью)</p>
      <svg viewBox={`0 0 ${boxW} ${boxH}`} width={boxW} height={boxH} className="mx-auto block">
        <rect x={0} y={0} width={boxW} height={boxH} fill="#F7F9FC" />
        {hasFrame && (
          <>
            <rect x={0} y={0} width={boxW} height={barThickness} fill="#16234A" />
            <rect x={0} y={boxH - barThickness} width={boxW} height={barThickness} fill="#16234A" />
          </>
        )}
        <text
          x={boxW / 2}
          y={boxH / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily={fontFamily}
          fontWeight={800}
          fontSize={Math.max(letterPx, 8)}
          fill="#2457E5"
        >
          {text || 'Ваш текст'}
        </text>
      </svg>
      <p className="text-center text-xs text-muted-foreground">
        Схематично: высота букв и ширина каркаса — в масштабе. Финальный макет готовит дизайнер.
      </p>
    </div>
  );
}
