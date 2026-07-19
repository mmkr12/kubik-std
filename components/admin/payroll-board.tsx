'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatTenge, formatDate } from '@/lib/utils';
import type { Employee, PayrollAccrual } from '@/lib/types';

export function PayrollBoard() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [accruals, setAccruals] = useState<PayrollAccrual[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);

  const supabase = createClient();

  async function loadAll() {
    setLoading(true);
    const [{ data: emp }, { data: acc }] = await Promise.all([
      supabase.from('employees').select('*').eq('status', 'working').order('full_name'),
      supabase.from('payroll_accruals').select('*').eq('status', 'pending'),
    ]);
    setEmployees((emp as Employee[]) ?? []);
    setAccruals((acc as PayrollAccrual[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handlePay(employeeId: string) {
    const pending = accruals.filter((a) => a.employee_id === employeeId);
    if (pending.length === 0) return;
    setPaying(employeeId);
    try {
      const total = pending.reduce((s, a) => s + a.amount, 0);
      const periodMonth = new Date();
      periodMonth.setDate(1);

      const { data: payout } = await supabase
        .from('payroll_payouts')
        .insert({
          employee_id: employeeId,
          period_month: periodMonth.toISOString().slice(0, 10),
          total_amount: total,
          paid_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (payout) {
        await supabase
          .from('payroll_accruals')
          .update({ status: 'paid', paid_at: new Date().toISOString(), payout_id: payout.id })
          .in('id', pending.map((p) => p.id));
      }
      loadAll();
    } finally {
      setPaying(null);
    }
  }

  if (loading) return <p className="text-muted-foreground">Загрузка…</p>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Выплата — 25 числа за все успешно завершённые операции предыдущего месяца. После выплаты начисления уходят в историю сотрудника, фонд обнуляется.
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {employees.map((emp) => {
          const pending = accruals.filter((a) => a.employee_id === emp.id);
          const total = pending.reduce((s, a) => s + a.amount, 0);
          return (
            <Card key={emp.id}>
              <CardContent className="space-y-3 pt-5">
                <h3 className="font-semibold text-navy-900">{emp.full_name}</h3>
                <div className="flex items-center justify-between rounded-lg bg-mist-50 px-3 py-2">
                  <span className="text-sm text-muted-foreground">К выплате</span>
                  <span className="font-semibold text-navy-900">{formatTenge(total)}</span>
                </div>
                <p className="text-xs text-muted-foreground">{pending.length} начислений в очереди</p>
                <Button className="w-full" size="sm" disabled={total === 0 || paying === emp.id} onClick={() => handlePay(emp.id)}>
                  {paying === emp.id ? 'Выплачиваем…' : 'Отметить выплаченным'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
