'use client';

import { formatTenge } from '@/lib/utils';
import type { ProductionSettingsRow } from '@/lib/erp-pricing';

export interface LedPsuState {
  ledType: 'modules' | 'tape';
  psuType: 'ip54' | 'ip67';
}

export const DEFAULT_LED_PSU: LedPsuState = { ledType: 'modules', psuType: 'ip54' };

export function LedPsuSelector({
  value,
  onChange,
  settings,
}: {
  value: LedPsuState;
  onChange: (v: LedPsuState) => void;
  settings: ProductionSettingsRow;
}) {
  const { led, psu } = settings.light_signage_pricing;
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1">
        <label className="text-xs font-medium text-navy-700">Светодиоды</label>
        <select value={value.ledType} onChange={(e) => onChange({ ...value, ledType: e.target.value as LedPsuState['ledType'] })} className="h-10 w-full rounded-lg border border-border bg-white px-2 text-sm">
          <option value="modules">Модули — {formatTenge(led.modules_price_per_m2)}/м²</option>
          <option value="tape">Лента — {formatTenge(led.tape_price_per_m2)}/м²</option>
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-navy-700">Блок питания</label>
        <select value={value.psuType} onChange={(e) => onChange({ ...value, psuType: e.target.value as LedPsuState['psuType'] })} className="h-10 w-full rounded-lg border border-border bg-white px-2 text-sm">
          <option value="ip54">IP54 — {formatTenge(psu.ip54_price)}</option>
          <option value="ip67">IP67 (закрытый) — {formatTenge(psu.ip67_price)}</option>
        </select>
      </div>
    </div>
  );
}
