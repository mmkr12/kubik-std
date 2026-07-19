'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Role } from '@/lib/types';

const METHOD_LABELS: Record<Role['payroll_method'], string> = {
  fixed: 'Фикс. сумма за операцию, ₸',
  percent: '% от стоимости заказа',
  hourly: 'Ставка в час, ₸',
};

export function RolesBoard() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  async function loadRoles() {
    setLoading(true);
    const { data } = await supabase.from('roles').select('*').order('name');
    setRoles((data as Role[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateRole(id: string, patch: Partial<Role>) {
    setRoles((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await Promise.all(
        roles.map((r) =>
          supabase
            .from('roles')
            .update({ payroll_method: r.payroll_method, payroll_rate: r.payroll_rate, description: r.description, responsibilities: r.responsibilities })
            .eq('id', r.id)
        )
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-muted-foreground">Загрузка…</p>;

  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-sm text-muted-foreground">
        Ставки — ориентировочные, вы уже назвали их, но структура ещё дорабатывается, поэтому цифры можно менять здесь в любой момент.
      </p>
      {roles.map((role) => (
        <Card key={role.id}>
          <CardContent className="space-y-3 pt-5">
            <h3 className="font-semibold text-navy-900">{role.name}</h3>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={role.payroll_method}
                onChange={(e) => updateRole(role.id, { payroll_method: e.target.value as Role['payroll_method'] })}
                className="h-11 rounded-xl border border-border bg-white px-3 text-sm"
              >
                <option value="fixed">Фикс. сумма за операцию</option>
                <option value="percent">% от стоимости заказа</option>
                <option value="hourly">Ставка в час</option>
              </select>
              <Input
                type="number"
                value={role.payroll_rate}
                onChange={(e) => updateRole(role.id, { payroll_rate: Number(e.target.value) })}
                placeholder={METHOD_LABELS[role.payroll_method]}
              />
            </div>
          </CardContent>
        </Card>
      ))}
      <Button onClick={handleSave} disabled={saving}>{saving ? 'Сохраняем…' : 'Сохранить'}</Button>
    </div>
  );
}
