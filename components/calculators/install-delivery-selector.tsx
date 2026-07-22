'use client';

import { Label } from '@/components/ui/label';
import { calcInstallCost, calcDeliveryCost } from '@/lib/erp-pricing';
import { formatTenge } from '@/lib/utils';
import type { InstallCity, InstallComplexity, LightSignagePricing } from '@/lib/types';
import type { ProductionSettingsRow } from '@/lib/erp-pricing';

export type FulfilmentMode = 'none' | 'install' | 'delivery';

export interface FulfilmentState {
  mode: FulfilmentMode;
  installCity: InstallCity;
  installComplexity: InstallComplexity;
  deliveryCity: 'taraz' | 'shymkent' | 'almaty' | 'other';
}

export const DEFAULT_FULFILMENT: FulfilmentState = {
  mode: 'none',
  installCity: 'taraz',
  installComplexity: 'light',
  deliveryCity: 'taraz',
};

export function calcFulfilmentCost(state: FulfilmentState, settings: ProductionSettingsRow): number {
  if (state.mode === 'install') {
    return calcInstallCost({
      installMode: 'complexity',
      city: state.installCity,
      complexity: state.installComplexity,
      sundayRequested: false,
      settings,
    });
  }
  if (state.mode === 'delivery') {
    return calcDeliveryCost(state.deliveryCity, settings.light_signage_pricing);
  }
  return 0;
}

export function InstallOrDeliverySelector({
  value,
  onChange,
  settings,
}: {
  value: FulfilmentState;
  onChange: (v: FulfilmentState) => void;
  settings: ProductionSettingsRow;
}) {
  return (
    <div className="space-y-3 rounded-lg bg-white p-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange({ ...value, mode: value.mode === 'install' ? 'none' : 'install' })}
          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${value.mode === 'install' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-border text-navy-700'}`}
        >
          Нужен монтаж
        </button>
        <button
          type="button"
          disabled={value.mode === 'install'}
          onClick={() => onChange({ ...value, mode: value.mode === 'delivery' ? 'none' : 'delivery' })}
          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 ${value.mode === 'delivery' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-border text-navy-700'}`}
        >
          Нужна доставка
        </button>
      </div>

      {value.mode === 'install' && (
        <div className="grid grid-cols-2 gap-2">
          <select value={value.installCity} onChange={(e) => onChange({ ...value, installCity: e.target.value as InstallCity })} className="h-10 rounded-lg border border-border bg-white px-2 text-sm">
            <option value="taraz">Тараз</option>
            <option value="shymkent">Шымкент</option>
            <option value="almaty">Алматы</option>
          </select>
          {value.installCity === 'taraz' && (
            <select value={value.installComplexity} onChange={(e) => onChange({ ...value, installComplexity: e.target.value as InstallComplexity })} className="h-10 rounded-lg border border-border bg-white px-2 text-sm">
              <option value="light">Лёгкий монтаж</option>
              <option value="medium">Средний</option>
              <option value="medium_large">Средний, &gt;6м</option>
              <option value="hard">Сложный</option>
            </select>
          )}
        </div>
      )}

      {value.mode === 'delivery' && (
        <select value={value.deliveryCity} onChange={(e) => onChange({ ...value, deliveryCity: e.target.value as FulfilmentState['deliveryCity'] })} className="h-10 w-full rounded-lg border border-border bg-white px-2 text-sm">
          <option value="taraz">Тараз — {formatTenge(settings.light_signage_pricing.delivery.taraz)}</option>
          <option value="shymkent">Шымкент — {formatTenge(settings.light_signage_pricing.delivery.shymkent)}</option>
          <option value="almaty">Алматы — {formatTenge(settings.light_signage_pricing.delivery.almaty)}</option>
          <option value="other">Другой город СНГ — расчёт индивидуально (ориентир {formatTenge(settings.light_signage_pricing.delivery.other_individual_estimate)})</option>
        </select>
      )}
    </div>
  );
}
