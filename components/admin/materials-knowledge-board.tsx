'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Material, ProductType, ProductTypeMaterial } from '@/lib/types';

export function MaterialsKnowledgeBoard() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [norms, setNorms] = useState<ProductTypeMaterial[]>([]);
  const [activeType, setActiveType] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newMaterialId, setNewMaterialId] = useState('');

  const supabase = createClient();

  async function loadAll() {
    setLoading(true);
    const [{ data: mats }, { data: types }, { data: normRows }] = await Promise.all([
      supabase.from('materials').select('*').eq('active', true).order('sort_order'),
      supabase.from('product_types').select('*').order('sort_order'),
      supabase.from('product_type_materials').select('*'),
    ]);
    setMaterials((mats as Material[]) ?? []);
    setProductTypes((types as ProductType[]) ?? []);
    setNorms((normRows as ProductTypeMaterial[]) ?? []);
    if (types && types.length > 0 && !activeType) setActiveType(types[0].id);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateMaterialPrice(id: string, price: number) {
    setMaterials((prev) => prev.map((m) => (m.id === id ? { ...m, default_price: price } : m)));
  }

  async function saveMaterials() {
    setSaving(true);
    try {
      await Promise.all(materials.map((m) => supabase.from('materials').update({ default_price: m.default_price }).eq('id', m.id)));
    } finally {
      setSaving(false);
    }
  }

  async function updateNormQty(id: string, qty: number) {
    setNorms((prev) => prev.map((n) => (n.id === id ? { ...n, quantity_per_unit: qty } : n)));
    await supabase.from('product_type_materials').update({ quantity_per_unit: qty }).eq('id', id);
  }

  async function addNorm() {
    if (!newMaterialId || !activeType) return;
    await supabase.from('product_type_materials').insert({ product_type_id: activeType, material_id: newMaterialId, quantity_per_unit: 0 });
    setNewMaterialId('');
    loadAll();
  }

  async function removeNorm(id: string) {
    await supabase.from('product_type_materials').delete().eq('id', id);
    loadAll();
  }

  if (loading) return <p className="text-muted-foreground">Загрузка…</p>;

  const activeProductType = productTypes.find((p) => p.id === activeType);
  const activeNorms = norms.filter((n) => n.product_type_id === activeType);
  const usedMaterialIds = new Set(activeNorms.map((n) => n.material_id));
  const availableMaterials = materials.filter((m) => !usedMaterialIds.has(m.id));

  return (
    <div className="space-y-8">
      <Card className="max-w-2xl">
        <CardContent className="space-y-3 pt-5">
          <h2 className="font-semibold text-navy-900">Цены материалов (за единицу)</h2>
          {materials.map((m) => (
            <div key={m.id} className="flex items-center gap-3">
              <span className="flex-1 text-sm text-navy-700">{m.name}</span>
              <Input type="number" className="w-28" value={m.default_price} onChange={(e) => updateMaterialPrice(m.id, Number(e.target.value))} />
              <span className="w-10 text-xs text-muted-foreground">₸/{m.unit}</span>
            </div>
          ))}
          <Button size="sm" onClick={saveMaterials} disabled={saving}>{saving ? 'Сохраняем…' : 'Сохранить цены'}</Button>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 font-semibold text-navy-900">Нормативы расхода по типу изделия</h2>
        <div className="mb-4 flex flex-wrap gap-2">
          {productTypes.map((pt) => (
            <button
              key={pt.id}
              onClick={() => setActiveType(pt.id)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                activeType === pt.id ? 'bg-blue-gradient text-white' : 'bg-mist-100 text-navy-700 hover:bg-mist-200'
              }`}
            >
              {pt.name}
            </button>
          ))}
        </div>

        <Card className="max-w-xl">
          <CardContent className="space-y-3 pt-5">
            <p className="text-xs text-muted-foreground">
              Расход на 1 {activeProductType?.unit === 'm2' ? 'м²' : 'шт'}. При добавлении работы в заказе система сама умножит на площадь/количество и посчитает себестоимость.
            </p>
            {activeNorms.map((n) => {
              const material = materials.find((m) => m.id === n.material_id);
              return (
                <div key={n.id} className="flex items-center gap-3">
                  <span className="flex-1 text-sm text-navy-700">{material?.name ?? '—'}</span>
                  <Input type="number" step={0.01} className="w-28" value={n.quantity_per_unit} onChange={(e) => updateNormQty(n.id, Number(e.target.value))} />
                  <span className="w-14 text-xs text-muted-foreground">{material?.unit}</span>
                  <button onClick={() => removeNorm(n.id)}><Trash2 className="h-4 w-4 text-red-500" /></button>
                </div>
              );
            })}
            {activeNorms.length === 0 && <p className="text-sm text-muted-foreground">Нормативы ещё не заданы</p>}
            <div className="flex gap-2 pt-2">
              <select value={newMaterialId} onChange={(e) => setNewMaterialId(e.target.value)} className="h-10 flex-1 rounded-xl border border-border bg-white px-3 text-sm">
                <option value="">Добавить материал…</option>
                {availableMaterials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <Button size="sm" onClick={addNorm}><Plus className="mr-1 h-4 w-4" /> Добавить</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
