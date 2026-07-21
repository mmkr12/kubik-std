'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ProductCalculator } from '@/components/product-calculator';
import type { ProductType, ProductCategory } from '@/lib/types';
import type { ProductionSettingsRow } from '@/lib/erp-pricing';

export function AdminCalculator() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [settings, setSettings] = useState<ProductionSettingsRow | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    (async () => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || !settings) return <p className="text-muted-foreground">Загрузка…</p>;

  return (
    <div className="max-w-xl">
      <p className="mb-4 text-sm text-muted-foreground">
        Тот же калькулятор, что на сайте и внутри заявки — можно быстро прикинуть стоимость без создания заявки.
      </p>
      <ProductCalculator mode="public" categories={categories} productTypes={productTypes} settings={settings} />
    </div>
  );
}
