'use client';

import { useEffect, useState } from 'react';
import { Play, Check, Lock, ImagePlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { uploadImage } from '@/lib/storage';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { formatTenge, formatDate } from '@/lib/utils';
import type { Employee, OrderOperation, PayrollAccrual } from '@/lib/types';

export default function StaffHomePage() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [operations, setOperations] = useState<(OrderOperation & { request_name?: string })[]>([]);
  const [accruals, setAccruals] = useState<PayrollAccrual[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<OrderOperation | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [completionComment, setCompletionComment] = useState('');
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  async function loadAll() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: emp } = await supabase.from('employees').select('*').eq('auth_user_id', user.id).maybeSingle();
    setEmployee(emp as Employee);
    if (!emp) { setLoading(false); return; }

    const [{ data: ops }, { data: acc }] = await Promise.all([
      supabase
        .from('order_operations')
        .select('*, order_item:order_items(request:requests(name))')
        .eq('assigned_employee_id', emp.id)
        .in('status', ['available', 'in_progress', 'locked'])
        .order('created_at'),
      supabase.from('payroll_accruals').select('*').eq('employee_id', emp.id).order('accrued_at', { ascending: false }).limit(20),
    ]);
    setOperations(((ops as any[]) ?? []).map((o) => ({ ...o, request_name: o.order_item?.request?.name })));
    setAccruals((acc as PayrollAccrual[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startOperation(id: string) {
    await supabase.from('order_operations').update({ status: 'in_progress', started_at: new Date().toISOString() }).eq('id', id);
    loadAll();
  }

  function openCompleteDialog(op: OrderOperation) {
    setCompleting(op);
    setPhotoFiles([]);
    setCompletionComment('');
  }

  async function submitCompletion() {
    if (!completing) return;
    setSaving(true);
    try {
      const urls: string[] = [];
      for (const file of photoFiles) {
        try {
          const url = await uploadImage('finished-photos', file);
          urls.push(url);
        } catch {
          // пропускаем неудачную загрузку, остальное сохраняем
        }
      }
      await supabase
        .from('order_operations')
        .update({
          status: 'done',
          completed_at: new Date().toISOString(),
          completion_photos: urls,
          completion_comment: completionComment || null,
        })
        .eq('id', completing.id);
      setCompleting(null);
      loadAll();
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-muted-foreground">Загрузка…</p>;

  if (!employee) {
    return (
      <p className="text-muted-foreground">
        Ваш логин не привязан ни к одному сотруднику. Обратитесь к руководителю, чтобы вас добавили в разделе «Сотрудники».
      </p>
    );
  }

  const pendingTotal = accruals.filter((a) => a.status === 'pending').reduce((s, a) => s + a.amount, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Привет, {employee.full_name}</h1>
        <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 card-shadow">
          <span className="text-sm text-muted-foreground">Начислено, ожидает выплаты 25 числа</span>
          <span className="font-semibold text-navy-900">{formatTenge(pendingTotal)}</span>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-navy-900">Мои операции</h2>
        {operations.length === 0 && <p className="text-sm text-muted-foreground">Пока нет назначенных операций.</p>}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {operations.map((op) => (
            <Card key={op.id}>
              <CardContent className="space-y-2 pt-5">
                <h3 className="font-semibold text-navy-900">{op.name}</h3>
                {op.request_name && <p className="text-sm text-muted-foreground">Заказ: {op.request_name}</p>}
                <p className="text-sm text-muted-foreground">~{op.norm_hours} ч · {formatTenge(op.cost)}</p>
                {op.status === 'locked' && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Lock className="h-3.5 w-3.5" /> Ждёт завершения предыдущих операций
                  </div>
                )}
                {op.status === 'available' && (
                  <Button size="sm" className="w-full" onClick={() => startOperation(op.id)}>
                    <Play className="mr-1 h-3.5 w-3.5" /> Начать
                  </Button>
                )}
                {op.status === 'in_progress' && (
                  <Button size="sm" variant="success" className="w-full" onClick={() => openCompleteDialog(op)}>
                    <Check className="mr-1 h-3.5 w-3.5" /> Завершить
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-navy-900">Последние начисления</h2>
        <div className="space-y-2">
          {accruals.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border border-border bg-white px-4 py-2.5 text-sm">
              <span className="text-muted-foreground">{formatDate(a.accrued_at)}</span>
              <span className="font-medium text-navy-900">{formatTenge(a.amount)}</span>
              <span className={a.status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}>
                {a.status === 'paid' ? 'Выплачено' : 'Ожидает'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={!!completing} onOpenChange={(o) => !o && setCompleting(null)}>
        <DialogContent>
          <DialogTitle>Завершить операцию</DialogTitle>
          <p className="mt-1 text-sm text-muted-foreground">{completing?.name}</p>
          <label className="mt-4 flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-center text-sm text-muted-foreground hover:bg-mist-50">
            <ImagePlus className="h-6 w-6" />
            {photoFiles.length > 0 ? `${photoFiles.length} фото выбрано` : 'Загрузите фото выполненной работы'}
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => setPhotoFiles(Array.from(e.target.files ?? []))} />
          </label>
          <Textarea className="mt-3" placeholder="Комментарий (необязательно)" value={completionComment} onChange={(e) => setCompletionComment(e.target.value)} />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCompleting(null)}>Отмена</Button>
            <Button onClick={submitCompletion} disabled={saving}>{saving ? 'Сохраняем…' : 'Готово'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
