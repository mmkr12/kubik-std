'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatTenge } from '@/lib/utils';
import type { CompanyFunds, ERPRequest, FundTransaction, PayrollAccrual, RequestMaterial } from '@/lib/types';

const FUND_LABELS: Record<string, string> = { payroll: 'Зарплата', mandatory: 'Обязательные расходы', development: 'Развитие' };

export function FinancesBoard() {
  const [funds, setFunds] = useState<CompanyFunds | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [transactions, setTransactions] = useState<FundTransaction[]>([]);
  const [requests, setRequests] = useState<ERPRequest[]>([]);
  const [accruals, setAccruals] = useState<PayrollAccrual[]>([]);
  const [materials, setMaterials] = useState<RequestMaterial[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  async function loadAll() {
    setLoading(true);
    const [{ data: f }, { data: tx }, { data: reqs }, { data: acc }, { data: mats }] = await Promise.all([
      supabase.from('company_funds').select('*').single(),
      supabase.from('fund_transactions').select('*'),
      supabase.from('requests').select('*').in('status', ['in_production', 'done']).order('created_at', { ascending: false }),
      supabase.from('payroll_accruals').select('*'),
      supabase.from('request_materials').select('*'),
    ]);
    setFunds(f as CompanyFunds);
    setTransactions((tx as FundTransaction[]) ?? []);
    setRequests((reqs as ERPRequest[]) ?? []);
    setAccruals((acc as PayrollAccrual[]) ?? []);
    setMaterials((mats as RequestMaterial[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSaveFunds() {
    if (!funds) return;
    setSaving(true);
    try {
      await supabase.from('company_funds').update({
        payroll_fund_pct: funds.payroll_fund_pct,
        mandatory_expenses_fund_pct: funds.mandatory_expenses_fund_pct,
        development_fund_pct: funds.development_fund_pct,
      }).eq('id', 1);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !funds) return <p className="text-muted-foreground">Загрузка…</p>;

  const fundBalances = { payroll: 0, mandatory: 0, development: 0 } as Record<string, number>;
  transactions.forEach((t) => { fundBalances[t.fund_key] = (fundBalances[t.fund_key] ?? 0) + t.amount; });

  const accrualsByRequest = new Map<string, number>();
  accruals.forEach((a) => { if (a.request_id) accrualsByRequest.set(a.request_id, (accrualsByRequest.get(a.request_id) ?? 0) + a.amount); });

  const materialsByRequest = new Map<string, number>();
  materials.forEach((m) => materialsByRequest.set(m.request_id, (materialsByRequest.get(m.request_id) ?? 0) + m.total_cost));

  const fundsByRequest = new Map<string, number>();
  transactions.forEach((t) => { if (t.request_id) fundsByRequest.set(t.request_id, (fundsByRequest.get(t.request_id) ?? 0) + t.amount); });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card><CardContent className="pt-5"><p className="text-sm text-muted-foreground">Фонд зарплаты</p><p className="mt-1 text-xl font-bold text-navy-900">{formatTenge(fundBalances.payroll)}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-sm text-muted-foreground">Обязательные расходы</p><p className="mt-1 text-xl font-bold text-navy-900">{formatTenge(fundBalances.mandatory)}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-sm text-muted-foreground">Развитие</p><p className="mt-1 text-xl font-bold text-navy-900">{formatTenge(fundBalances.development)}</p></CardContent></Card>
      </div>

      <Card className="max-w-md">
        <CardContent className="space-y-3 pt-5">
          <h2 className="font-semibold text-navy-900">Проценты распределения (от каждой оплаты)</h2>
          <div className="flex items-center gap-3">
            <span className="flex-1 text-sm text-navy-700">Фонд зарплаты, %</span>
            <Input type="number" className="w-24" value={funds.payroll_fund_pct} onChange={(e) => setFunds({ ...funds, payroll_fund_pct: Number(e.target.value) })} />
          </div>
          <div className="flex items-center gap-3">
            <span className="flex-1 text-sm text-navy-700">Обязательные расходы, %</span>
            <Input type="number" className="w-24" value={funds.mandatory_expenses_fund_pct} onChange={(e) => setFunds({ ...funds, mandatory_expenses_fund_pct: Number(e.target.value) })} />
          </div>
          <div className="flex items-center gap-3">
            <span className="flex-1 text-sm text-navy-700">Развитие, %</span>
            <Input type="number" className="w-24" value={funds.development_fund_pct} onChange={(e) => setFunds({ ...funds, development_fund_pct: Number(e.target.value) })} />
          </div>
          <Button size="sm" onClick={handleSaveFunds} disabled={saving}>{saving ? 'Сохраняем…' : saved ? 'Сохранено ✓' : 'Сохранить'}</Button>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 font-semibold text-navy-900">Прибыль по заказам</h2>
        <div className="space-y-2">
          {requests.map((r) => {
            const payroll = accrualsByRequest.get(r.id) ?? 0;
            const mat = materialsByRequest.get(r.id) ?? 0;
            const fundsAlloc = fundsByRequest.get(r.id) ?? 0;
            const netProfit = r.total_cost - mat - payroll;
            const ownerProfit = netProfit - fundsAlloc;
            return (
              <Card key={r.id}>
                <CardContent className="grid grid-cols-2 gap-2 pt-4 text-sm sm:grid-cols-6">
                  <div className="col-span-2 sm:col-span-1"><p className="text-xs text-muted-foreground">{r.name}</p><p className="font-medium text-navy-900">{formatTenge(r.total_cost)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Материалы</p><p>{formatTenge(mat)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Зарплаты</p><p>{formatTenge(payroll)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Фонды</p><p>{formatTenge(fundsAlloc)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Чистая прибыль</p><p>{formatTenge(netProfit)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Прибыль владельца</p><p className="font-semibold text-emerald-600">{formatTenge(ownerProfit)}</p></div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
