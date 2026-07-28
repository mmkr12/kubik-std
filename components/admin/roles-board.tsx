'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { STAGE_DEFS } from '@/lib/dispatcher';
import type { Role, StagePayRate } from '@/lib/types';

const METHOD_LABELS: Record<Role['payroll_method'], string> = {
  fixed: 'Фикс. сумма за операцию, ₸',
  percent: '% от стоимости заказа',
  hourly: 'Ставка в час, ₸',
};

export function RolesBoard() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [stageRates, setStageRates] = useState<StagePayRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingStages, setSavingStages] = useState(false);
  const [stagesSaved, setStagesSaved] = useState(false);

  const supabase = createClient();

  async function loadRoles() {
    setLoading(true);
    const [{ data: rolesData }, { data: ratesData }] = await Promise.all([
      supabase.from('roles').select('*').order('name'),
      supabase.from('stage_pay_rates').select('*'),
    ]);
    setRoles((rolesData as Role[]) ?? []);
    setStageRates((ratesData as StagePayRate[]) ?? []);
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

  function updateStageRate(stageKey: string, amount: number) {
    setStageRates((prev) => prev.map((r) => (r.stage_key === stageKey ? { ...r, amount } : r)));
  }

  async function handleSaveStageRates() {
    setSavingStages(true);
    try {
      await Promise.all(
        stageRates.map((r) => supabase.from('stage_pay_rates').update({ amount: r.amount }).eq('stage_key', r.stage_key))
      );
      setStagesSaved(true);
      setTimeout(() => setStagesSaved(false), 2000);
    } finally {
      setSavingStages(false);
    }
  }

  if (loading) return <p className="text-muted-foreground">Загрузка…</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardContent className="space-y-3 pt-5">
          <h2 className="font-semibold text-navy-900">Зарплата за этапы производства (диспетчер)</h2>
          <p className="text-sm text-muted-foreground">
            Фиксированная сумма начисляется сотруднику автоматически при завершении операции этого
            этапа — не зависит от того, кто именно её выполнил.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {STAGE_DEFS.map((stage) => {
              const rate = stageRates.find((r) => r.stage_key === stage.key);
              return (
                <div key={stage.key} className="space-y-1">
                  <Label className="text-xs">{stage.name}</Label>
                  <Input
                    type="number"
                    value={rate?.amount ?? 0}
                    onChange={(e) => updateStageRate(stage.key, Number(e.target.value))}
                  />
                </div>
              );
            })}
          </div>
          <Button size="sm" onClick={handleSaveStageRates} disabled={savingStages}>
            {savingStages ? 'Сохраняем…' : stagesSaved ? 'Сохранено ✓' : 'Сохранить'}
          </Button>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Роли ниже — старая структура (не используется диспетчером напрямую, но сохранена на будущее).
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
