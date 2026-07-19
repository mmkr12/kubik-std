'use client';

import { useEffect, useState } from 'react';
import { Printer, Plus, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Material, ProcurementChecklist, ProcurementChecklistItem } from '@/lib/types';

function startOfWeek(d = new Date()) {
  const day = d.getDay() === 0 ? 7 : d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day - 1));
  return monday.toISOString().slice(0, 10);
}

export function ProcurementBoard() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [checklist, setChecklist] = useState<ProcurementChecklist | null>(null);
  const [items, setItems] = useState<ProcurementChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();
  const weekStart = startOfWeek();

  async function loadAll() {
    setLoading(true);
    const { data: mats } = await supabase.from('materials').select('*').eq('active', true).order('sort_order');
    setMaterials((mats as Material[]) ?? []);

    let { data: existing } = await supabase.from('procurement_checklists').select('*').eq('week_start', weekStart).maybeSingle();
    if (!existing) {
      const { data: created } = await supabase.from('procurement_checklists').insert({ week_start: weekStart }).select('*').single();
      existing = created;
    }
    setChecklist(existing as ProcurementChecklist);

    if (existing) {
      const { data: checklistItems } = await supabase
        .from('procurement_checklist_items')
        .select('*, material:materials(*)')
        .eq('checklist_id', existing.id);
      setItems((checklistItems as ProcurementChecklistItem[]) ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setQuantity(materialId: string, quantity: number) {
    if (!checklist) return;
    const existing = items.find((i) => i.material_id === materialId);
    if (existing) {
      if (quantity <= 0) {
        await supabase.from('procurement_checklist_items').delete().eq('id', existing.id);
      } else {
        await supabase.from('procurement_checklist_items').update({ quantity_needed: quantity }).eq('id', existing.id);
      }
    } else if (quantity > 0) {
      await supabase.from('procurement_checklist_items').insert({ checklist_id: checklist.id, material_id: materialId, quantity_needed: quantity });
    }
    loadAll();
  }

  function handlePrint() {
    window.print();
  }

  if (loading || !checklist) return <p className="text-muted-foreground">Загрузка…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Ревизия на неделю с {weekStart}</p>
        <Button variant="outline" onClick={handlePrint}><Printer className="mr-1 h-4 w-4" /> Печать списка</Button>
      </div>

      <div className="print-sheet">
        <h2 className="mb-4 hidden text-lg font-semibold print:block">Список закупки — неделя с {weekStart}</h2>
        <Card>
          <CardContent className="pt-5">
            <div className="grid grid-cols-1 divide-y divide-border">
              {materials.map((m) => {
                const item = items.find((i) => i.material_id === m.id);
                return (
                  <div key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="text-sm text-navy-800">{m.name}</span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        className="w-24 print:border-none"
                        defaultValue={item?.quantity_needed ?? ''}
                        placeholder="0"
                        onBlur={(e) => setQuantity(m.id, Number(e.target.value))}
                      />
                      <span className="w-8 text-xs text-muted-foreground">{m.unit}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-sheet, .print-sheet * { visibility: visible; }
          .print-sheet { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}
