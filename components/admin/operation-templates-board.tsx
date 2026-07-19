'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { OperationTemplate, ProductType, Role } from '@/lib/types';

export function OperationTemplatesBoard() {
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [templates, setTemplates] = useState<OperationTemplate[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [activeType, setActiveType] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  async function loadAll() {
    setLoading(true);
    const [{ data: types }, { data: tmpl }, { data: rl }] = await Promise.all([
      supabase.from('product_types').select('*').order('sort_order'),
      supabase.from('operation_templates').select('*').order('sort_order'),
      supabase.from('roles').select('*').eq('active', true).order('name'),
    ]);
    setProductTypes((types as ProductType[]) ?? []);
    setTemplates((tmpl as OperationTemplate[]) ?? []);
    setRoles((rl as Role[]) ?? []);
    if (types && types.length > 0 && !activeType) setActiveType(types[0].id);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleTemplates = templates.filter((t) => t.product_type_id === activeType);

  function updateLocal(id: string, patch: Partial<OperationTemplate>) {
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  async function saveTemplate(t: OperationTemplate) {
    await supabase
      .from('operation_templates')
      .update({
        name: t.name,
        role_id: t.role_id,
        cost: t.cost,
        norm_hours: t.norm_hours,
        required: t.required,
        allows_parallel: t.allows_parallel,
        depends_on_keys: t.depends_on_keys,
        sort_order: t.sort_order,
      })
      .eq('id', t.id);
  }

  async function addOperation() {
    if (!activeType) return;
    const key = `op_${Date.now()}`;
    await supabase.from('operation_templates').insert({
      product_type_id: activeType,
      key,
      name: 'Новая операция',
      sort_order: visibleTemplates.length + 1,
    });
    loadAll();
  }

  async function removeOperation(id: string) {
    await supabase.from('operation_templates').delete().eq('id', id);
    loadAll();
  }

  if (loading) return <p className="text-muted-foreground">Загрузка…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
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

      <div className="max-w-3xl space-y-3">
        {visibleTemplates.length === 0 && <p className="text-sm text-muted-foreground">Для этого типа изделия пока нет операций.</p>}
        {visibleTemplates.map((t) => (
          <Card key={t.id}>
            <CardContent className="space-y-3 pt-5">
              <div className="flex items-center gap-2">
                <Input value={t.name} onChange={(e) => updateLocal(t.id, { name: e.target.value })} onBlur={() => saveTemplate(t)} className="flex-1" />
                <Button variant="ghost" size="icon" onClick={() => removeOperation(t.id)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <select
                  value={t.role_id ?? ''}
                  onChange={(e) => { updateLocal(t.id, { role_id: e.target.value || null }); }}
                  onBlurCapture={() => saveTemplate(t)}
                  className="h-10 rounded-lg border border-border bg-white px-2 text-sm"
                >
                  <option value="">Роль…</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                <Input type="number" value={t.norm_hours} onChange={(e) => updateLocal(t.id, { norm_hours: Number(e.target.value) })} onBlur={() => saveTemplate(t)} placeholder="Часы" />
                <Input type="number" value={t.cost} onChange={(e) => updateLocal(t.id, { cost: Number(e.target.value) })} onBlur={() => saveTemplate(t)} placeholder="Стоимость, ₸" />
                <Input
                  value={t.depends_on_keys.join(',')}
                  onChange={(e) => updateLocal(t.id, { depends_on_keys: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                  onBlur={() => saveTemplate(t)}
                  placeholder="Ключи-зависимости"
                />
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={t.allows_parallel} onChange={(e) => { updateLocal(t.id, { allows_parallel: e.target.checked }); saveTemplate({ ...t, allows_parallel: e.target.checked }); }} />
                  Может выполняться параллельно
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={t.required} onChange={(e) => { updateLocal(t.id, { required: e.target.checked }); saveTemplate({ ...t, required: e.target.checked }); }} />
                  Обязательна
                </label>
                <span className="ml-auto text-navy-500">ключ: {t.key}</span>
              </div>
            </CardContent>
          </Card>
        ))}
        <Button variant="outline" onClick={addOperation}><Plus className="mr-1 h-4 w-4" /> Добавить операцию</Button>
      </div>
    </div>
  );
}
