'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, CalendarClock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatTenge, formatDate } from '@/lib/utils';
import { suggestInstallDate } from '@/lib/scheduler';
import { ProductCalculator, type CalculatorDraft } from '@/components/product-calculator';
import type { ERPRequest, OrderItem, ProductType } from '@/lib/types';
import type { ProductionSettingsRow } from '@/lib/erp-pricing';

export function RequestDetailDialog({
  request,
  trigger,
  onChanged,
}: {
  request: ERPRequest;
  trigger: React.ReactNode;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [settings, setSettings] = useState<ProductionSettingsRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  // Редактируемые поля заявки — доступны на любой стадии, включая
  // уже отправленные в производство заказы.
  const [name, setName] = useState(request.name);
  const [phone, setPhone] = useState(request.phone);
  const [address, setAddress] = useState(request.address ?? '');
  const [comment, setComment] = useState(request.comment ?? '');
  const [installDate, setInstallDate] = useState(request.install_date ?? '');

  const supabase = createClient();
  const isPreProduction = request.status === 'measurement' || request.status === 'draft';

  async function loadAll() {
    const [{ data: itemsData }, { data: typesData }, { data: settingsData }] = await Promise.all([
      supabase.from('order_items').select('*').eq('request_id', request.id).order('created_at'),
      supabase.from('product_types').select('*').eq('active', true).order('sort_order'),
      supabase.from('production_settings').select('*').single(),
    ]);
    setItems((itemsData as OrderItem[]) ?? []);
    setProductTypes((typesData as ProductType[]) ?? []);
    setSettings((settingsData as ProductionSettingsRow) ?? null);
  }

  useEffect(() => {
    if (open) {
      loadAll();
      setName(request.name);
      setPhone(request.phone);
      setAddress(request.address ?? '');
      setComment(request.comment ?? '');
      setInstallDate(request.install_date ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleAddItem(draft: CalculatorDraft) {
    await supabase.from('order_items').insert({
      request_id: request.id,
      product_type_id: draft.productType.id,
      params: draft.params,
      manufacture_hours: draft.manufactureHours,
      install_complexity: draft.installComplexity,
      install_city: draft.installCity,
      sunday_client_requested: draft.sundayClientRequested,
      item_cost: draft.itemCost,
      install_cost: draft.installCost,
    });
    setShowForm(false);
    loadAll();
    onChanged();
  }

  async function handleRemoveItem(id: string) {
    await supabase.from('order_items').delete().eq('id', id);
    loadAll();
    onChanged();
  }

  async function handleSuggestDate() {
    if (items.length === 0) return;
    setSuggesting(true);
    try {
      const withTypes = items.map((it) => ({
        productType: productTypes.find((p) => p.id === it.product_type_id)!,
        manufactureHours: it.manufacture_hours ?? 0,
      })).filter((i) => i.productType);
      const date = await suggestInstallDate(withTypes);
      if (date) {
        setInstallDate(date);
        await supabase.from('requests').update({ recommended_install_date: date }).eq('id', request.id);
      }
    } finally {
      setSuggesting(false);
    }
  }

  async function handleSendToProduction() {
    if (items.length === 0 || !installDate) return;
    setSaving(true);
    try {
      await supabase
        .from('requests')
        .update({
          status: 'in_production',
          needs_measurement: false,
          name, phone, address: address || null, comment: comment || null,
          install_date: installDate,
          manual_override: installDate !== request.recommended_install_date,
          started_production_at: new Date().toISOString(),
        })
        .eq('id', request.id);
      setOpen(false);
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveChanges() {
    setSaving(true);
    try {
      await supabase
        .from('requests')
        .update({
          name, phone, address: address || null, comment: comment || null,
          install_date: installDate || null,
        })
        .eq('id', request.id);
      setOpen(false);
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  const totalCost = items.reduce((sum, i) => sum + i.item_cost + i.install_cost, 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <DialogContent className="max-w-xl">
        <DialogTitle>{isPreProduction ? 'Оформление заявки' : 'Редактирование заказа'}</DialogTitle>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Имя клиента</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Телефон</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Адрес</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Комментарий</Label>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} />
          </div>
        </div>

        <div className="mt-5 space-y-2">
          {items.length === 0 && <p className="text-sm text-muted-foreground">Пока нет ни одной позиции работ.</p>}
          {items.map((item) => {
            const type = productTypes.find((p) => p.id === item.product_type_id);
            return (
              <div key={item.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <div>
                  <div className="font-medium text-navy-900">{type?.name ?? 'Изделие'}</div>
                  <div className="text-xs text-muted-foreground">~{item.manufacture_hours} ч изготовление</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-navy-900">{formatTenge(item.item_cost + item.install_cost)}</span>
                  <button onClick={() => handleRemoveItem(item.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {showForm && settings ? (
          <div className="mt-4">
            <ProductCalculator mode="item" productTypes={productTypes} settings={settings} onAdd={handleAddItem} onCancel={() => setShowForm(false)} />
          </div>
        ) : (
          <Button variant="outline" className="mt-4 w-full" onClick={() => setShowForm(true)}>
            <Plus className="mr-1 h-4 w-4" /> Добавить работу
          </Button>
        )}

        <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-sm">
          <span className="text-muted-foreground">Итого по заявке</span>
          <span className="text-lg font-bold text-navy-900">{formatTenge(totalCost)}</span>
        </div>

        <div className="mt-4 space-y-2">
          <Label>Дата монтажа</Label>
          <div className="flex gap-2">
            <Input type="date" value={installDate} onChange={(e) => setInstallDate(e.target.value)} className="flex-1" />
            <Button variant="secondary" onClick={handleSuggestDate} disabled={items.length === 0 || suggesting}>
              <CalendarClock className="mr-1 h-4 w-4" /> {suggesting ? 'Считаем…' : 'Подобрать'}
            </Button>
          </div>
          {request.recommended_install_date && (
            <p className="text-xs text-muted-foreground">Рекомендовано системой: {formatDate(request.recommended_install_date)}</p>
          )}
        </div>

        {isPreProduction ? (
          <Button className="mt-5 w-full" onClick={handleSendToProduction} disabled={items.length === 0 || !installDate || saving}>
            {saving ? 'Сохраняем…' : 'Отправить в производство'}
          </Button>
        ) : (
          <Button className="mt-5 w-full" onClick={handleSaveChanges} disabled={saving}>
            {saving ? 'Сохраняем…' : 'Сохранить изменения'}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
