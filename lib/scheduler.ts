import { createClient } from '@/lib/supabase/client';
import type { ProductType } from './types';

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

export interface ScheduleItem {
  productType: ProductType;
  manufactureHours: number;
}

/**
 * Подбирает ближайшую свободную дату для изготовления.
 *
 * Логика (упрощённая, соответствует п.4 и п.6 ТЗ):
 * 1. Берём самую долгую по нормативу позицию среди добавленных работ —
 *    именно её категория задаёт допустимые дни недели (график цеха).
 * 2. Идём по дням вперёд от завтрашнего дня, пропуская воскресенье
 *    (оно используется только как резерв и не подставляется автоматически).
 * 3. Для каждого дня считаем уже занятые часы (сумма manufacture_hours
 *    всех позиций заявок, чья install_date выпадает на этот день).
 * 4. Как только находится день с достаточным резервом мощности —
 *    берём его и прибавляем ещё один день (п.6: "по самой долгой плюс день").
 */
export async function suggestInstallDate(items: ScheduleItem[]): Promise<string | null> {
  if (items.length === 0) return null;

  const supabase = createClient();

  const { data: settingsRow } = await supabase
    .from('production_settings')
    .select('daily_capacity_hours')
    .single();
  const dailyCapacity = settingsRow?.daily_capacity_hours ?? 12;

  // Позиция с максимальным нормативом определяет допустимые дни и итоговый сдвиг.
  const longest = items.reduce((a, b) => (b.manufactureHours > a.manufactureHours ? b : a));
  const allowedDays = longest.productType.schedule_days;

  // Текущая загрузка: суммируем manufacture_hours позиций у заявок в производстве.
  const { data: loadRows } = await supabase
    .from('order_items')
    .select('manufacture_hours, request:requests!inner(install_date, status)')
    .eq('requests.status', 'in_production');

  const loadByDate = new Map<string, number>();
  for (const row of (loadRows as any[]) ?? []) {
    const date = row.request?.install_date;
    if (!date) continue;
    loadByDate.set(date, (loadByDate.get(date) ?? 0) + (row.manufacture_hours ?? 0));
  }

  const neededHours = items.reduce((sum, i) => sum + i.manufactureHours, 0);

  const cursor = new Date();
  cursor.setDate(cursor.getDate() + 1);

  for (let i = 0; i < 60; i++) {
    const dayKey = DAY_KEYS[cursor.getDay()];
    const iso = cursor.toISOString().slice(0, 10);

    const isSunday = dayKey === 'sun';
    const matchesSchedule = allowedDays.includes(dayKey);

    if (!isSunday && matchesSchedule) {
      const busy = loadByDate.get(iso) ?? 0;
      if (busy + neededHours <= dailyCapacity) {
        const result = new Date(cursor);
        result.setDate(result.getDate() + 1); // "+ день" по правилу компании
        return result.toISOString().slice(0, 10);
      }
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return null; // не нашли окно в ближайшие 60 дней — потребуется ручной выбор
}
