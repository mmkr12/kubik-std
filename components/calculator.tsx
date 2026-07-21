'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ProductCalculator } from '@/components/product-calculator';
import type { ProductType, ProductCategory } from '@/lib/types';
import type { ProductionSettingsRow } from '@/lib/erp-pricing';

export function Calculator() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [settings, setSettings] = useState<ProductionSettingsRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const [{ data: cats }, { data: types }, { data: settingsData }] = await Promise.all([
        supabase.from('product_categories').select('*').eq('active', true).order('sort_order'),
        supabase.from('product_types').select('*').eq('active', true).order('sort_order'),
        supabase.from('production_settings').select('*').single(),
      ]);
      setCategories((cats as ProductCategory[]) ?? []);
      setProductTypes((types as ProductType[]) ?? []);
      setSettings((settingsData as ProductionSettingsRow) ?? null);
      setLoading(false);
    })();
  }, []);

  return (
    <div id="calculator" className="rounded-2xl border border-border bg-white p-6 card-shadow md:p-8">
      <h3 className="mb-1 text-xl font-semibold text-navy-900">Рассчитайте стоимость вашей вывески</h3>
      <p className="mb-6 text-sm text-muted-foreground">Получите расчёт и коммерческое предложение за 1 минуту</p>

      {loading || !settings || categories.length === 0 ? (
        <p className="text-muted-foreground">Загрузка калькулятора…</p>
      ) : (
        <ProductCalculator mode="public" categories={categories} productTypes={productTypes} settings={settings} />
      )}
    </div>
  );
}
