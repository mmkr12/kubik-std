'use client';

import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatDate } from '@/lib/utils';
import { OrderWorkspace } from '@/components/admin/order-workspace';
import type { ERPRequest, EventLogRow } from '@/lib/types';

export function RequestDetailDialog({
  request,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  onChanged,
}: {
  request: ERPRequest;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onChanged: () => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = setControlledOpen ?? setInternalOpen;

  const [name, setName] = useState(request.name);
  const [phone, setPhone] = useState(request.phone);
  const [address, setAddress] = useState(request.address ?? '');
  const [comment, setComment] = useState(request.comment ?? '');
  const [status, setStatus] = useState(request.status);
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<EventLogRow[]>([]);

  const supabase = createClient();
  const isMeasurement = status === 'measurement';

  // Диалог "живёт" сам по себе, не завися от того, остаётся ли эта
  // заявка в списке родителя (иначе при смене статуса карточка исчезает
  // из фильтруемого списка и уносит с собой открытое окно).
  useEffect(() => {
    if (open) {
      setName(request.name);
      setPhone(request.phone);
      setAddress(request.address ?? '');
      setComment(request.comment ?? '');
      setStatus(request.status);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, request.id]);

  async function loadHistory() {
    const { data } = await supabase.rpc('get_request_history', { req_id: request.id });
    setHistory((data as EventLogRow[]) ?? []);
    setShowHistory(true);
  }

  async function handleConvertToOrder() {
    setSaving(true);
    try {
      await supabase.from('requests').update({ status: 'in_production', started_production_at: new Date().toISOString() }).eq('id', request.id);
      setStatus('in_production');
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveContact() {
    setSaving(true);
    try {
      await supabase.from('requests').update({ name, phone, address: address || null, comment: comment || null }).eq('id', request.id);
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <span onClick={() => setOpen(true)}>{trigger}</span>}
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <div className="flex items-center justify-between">
          <DialogTitle>{isMeasurement ? 'Заявка на замер' : 'Заказ'}</DialogTitle>
          <button onClick={loadHistory} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-navy-900">
            <History className="h-3.5 w-3.5" /> История
          </button>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Клиент</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={handleSaveContact} />
          </div>
          <div className="space-y-1.5">
            <Label>Телефон</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} onBlur={handleSaveContact} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Адрес</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} onBlur={handleSaveContact} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Комментарий</Label>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} onBlur={handleSaveContact} rows={2} />
          </div>
          {request.desired_measurement_date && isMeasurement && (
            <p className="text-xs text-muted-foreground sm:col-span-2">Желаемая дата замера: {formatDate(request.desired_measurement_date)}</p>
          )}
        </div>

        {isMeasurement && (
          <Button className="mt-5 w-full" onClick={handleConvertToOrder} disabled={saving}>
            {saving ? 'Оформляем…' : 'Замер выполнен — оформить заказ'}
          </Button>
        )}

        <div className="mt-5">
          <OrderWorkspace requestId={request.id} onChanged={onChanged} />
        </div>

        <Dialog open={showHistory} onOpenChange={setShowHistory}>
          <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
            <DialogTitle>История заказа</DialogTitle>
            <div className="mt-4 space-y-2">
              {history.length === 0 && <p className="text-sm text-muted-foreground">Пока пусто</p>}
              {history.map((h) => (
                <div key={h.id} className="rounded-lg border border-border px-3 py-2 text-xs">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>{new Date(h.created_at).toLocaleString('ru-RU')}</span>
                    <span>{h.actor_role ?? 'система'}</span>
                  </div>
                  <div className="mt-1 text-navy-800">
                    {h.action === 'insert' && 'Создано'}
                    {h.action === 'delete' && 'Удалено'}
                    {h.action === 'update' && 'Изменено: ' + Object.keys(h.new_value ?? {}).join(', ')}
                    {' — '}
                    {h.entity_type}
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
