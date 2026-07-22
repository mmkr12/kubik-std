'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatTenge } from '@/lib/utils';

export function CalculatorFooter({
  calculated,
  mode,
  priceOverride,
  onPriceOverrideChange,
  adjustmentComment,
  onAdjustmentCommentChange,
  onAdd,
  onCancel,
  kpUrl,
  canAdd = true,
}: {
  calculated: number;
  mode: 'public' | 'item';
  priceOverride: string;
  onPriceOverrideChange: (v: string) => void;
  adjustmentComment: string;
  onAdjustmentCommentChange: (v: string) => void;
  onAdd: () => void;
  onCancel?: () => void;
  kpUrl: string;
  canAdd?: boolean;
}) {
  const finalTotal = priceOverride !== '' ? Number(priceOverride) : calculated;

  return (
    <div className="space-y-3">
      {mode === 'item' && (
        <details className="text-xs">
          <summary className="cursor-pointer text-blue-600 hover:underline">Скорректировать цену вручную</summary>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Итоговая цена</Label>
              <Input type="number" placeholder={String(calculated)} value={priceOverride} onChange={(e) => onPriceOverrideChange(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Причина скидки/наценки</Label>
              <Input value={adjustmentComment} onChange={(e) => onAdjustmentCommentChange(e.target.value)} />
            </div>
          </div>
        </details>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Итого к оплате</p>
          <p className="text-2xl font-bold text-navy-900">{formatTenge(finalTotal)}</p>
        </div>
        {mode === 'item' ? (
          <div className="flex gap-2">
            {onCancel && <Button variant="outline" onClick={onCancel}>Отмена</Button>}
            <Button onClick={onAdd} disabled={!canAdd}>Добавить в заявку</Button>
          </div>
        ) : (
          <a href={kpUrl} target="_blank" className="rounded-full bg-blue-gradient px-6 py-2.5 text-sm font-medium text-white hover:brightness-110">
            Открыть коммерческое предложение →
          </a>
        )}
      </div>
    </div>
  );
}
