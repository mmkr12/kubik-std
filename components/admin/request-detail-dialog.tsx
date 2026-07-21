'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, CalendarClock, Pencil, History, Wallet, Package, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { formatTenge, formatDate } from '@/lib/utils';
import { suggestInstallDate } from '@/lib/scheduler';
import { ProductCalculator, type CalculatorDraft } from '@/components/product-calculator';
import type { ERPRequest, OrderItem, ProductType, Payment, RequestMaterial, Material, ProductTypeField, EventLogRow } from '@/lib/types';
import type { ProductionSettingsRow } from '@/lib/erp-pricing';

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

  const [items, setItems] = useState<OrderItem[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [settings, setSettings] = useState<ProductionSettingsRow | null>(null);
  const [fields, setFields] = useState<ProductTypeField[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [materialsCatalog, setMaterialsCatalog] = useState<Material[]>([]);
  const [requestMaterials, setRequestMaterials] = useState<RequestMaterial[]>([]);
  const [history, setHistory] = useState<EventLogRow[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  const [name, setName] = useState(request.name);
  const [phone, setPhone] = useState(request.phone);
  const [address, setAddress] = useState(request.address ?? '');
  const [comment, setComment] = useState(request.comment ?? '');
  const [installDate, setInstallDate] = useState(request.install_date ?? '');
  const [status, setStatus] = useState(request.status);

  const supabase = createClient();
  const isMeasurement = status === 'measurement';

  async function loadAll() {
    const [{ data: itemsData }, { data: typesData }, { data: settingsData }, { data: fieldsData }, { data: paymentsData }, { data: matCatalog }, { data: reqMats }] = await Promise.all([
      supabase.from('order_items').select('*').eq('request_id', request.id).order('created_at'),
      supabase.from('product_types').select('*').eq('active', true).order('sort_order'),
      supabase.from('production_settings').select('*').single(),
      supabase.from('product_type_fields').select('*').order('sort_order'),
      supabase.from('payments').select('*').eq('request_id', request.id).order('paid_at', { ascending: false }),
      supabase.from('materials').select('*').eq('active', true).order('sort_order'),
      supabase.from('request_materials').select('*, material:materials(*)').eq('request_id', request.id),
    ]);
    setItems((itemsData as OrderItem[]) ?? []);
    setProductTypes((typesData as ProductType[]) ?? []);
    setSettings((settingsData as ProductionSettingsRow) ?? null);
    setFields((fieldsData as ProductTypeField[]) ?? []);
    setPayments((paymentsData as Payment[]) ?? []);
    setMaterialsCatalog((matCatalog as Material[]) ?? []);
    setRequestMaterials((reqMats as RequestMaterial[]) ?? []);
  }

  useEffect(() => {
    if (open) {
      loadAll();
      setName(request.name);
      setPhone(request.phone);
      setAddress(request.address ?? '');
      setComment(request.comment ?? '');
      setInstallDate(request.install_date ?? '');
      setStatus(request.status);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
      final_cost: draft.itemCost + draft.installCost,
      install_cost: draft.installCost,
    });
    const { data: templates } = await supabase.from('operation_templates').select('*').eq('product_type_id', draft.productType.id).order('sort_order');
    const { data: newItem } = await supabase.from('order_items').select('id').eq('request_id', request.id).order('created_at', { ascending: false }).limit(1).single();
    if (templates && templates.length > 0 && newItem) {
      await supabase.from('order_operations').insert(
        templates.map((t: any) => ({
          order_item_id: newItem.id,
          operation_template_id: t.id,
          key: t.key,
          name: t.name,
          role_id: t.role_id,
          assigned_employee_id: t.default_employee_id,
          cost: t.cost,
          norm_hours: t.norm_hours,
          required: t.required,
          allows_parallel: t.allows_parallel,
          depends_on_keys: t.depends_on_keys,
          status: t.depends_on_keys?.length ? 'locked' : 'available',
        }))
      );
    }
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

  async function handleSaveChanges() {
    setSaving(true);
    try {
      await supabase.from('requests').update({ name, phone, address: address || null, comment: comment || null, install_date: installDate || null }).eq('id', request.id);
      setOpen(false);
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function handleAddPayment(amount: number, note: string) {
    if (!amount) return;
    await supabase.from('payments').insert({ request_id: request.id, amount, note: note || null });
    loadAll();
    onChanged();
  }

  async function handleAddMaterial(materialId: string, quantity: number, unitCost: number) {
    if (!materialId || !quantity) return;
    await supabase.from('request_materials').insert({ request_id: request.id, material_id: materialId, quantity, unit_cost: unitCost });
    loadAll();
  }

  async function handleRemoveMaterial(id: string) {
    await supabase.from('request_materials').delete().eq('id', id);
    loadAll();
  }

  const totalCost = items.reduce((sum, i) => sum + (i.final_cost ?? i.item_cost + i.install_cost), 0);
  const materialsCost = requestMaterials.reduce((s, m) => s + m.total_cost, 0);

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
          {request.desired_measurement_date && isMeasurement && (
            <p className="text-xs text-muted-foreground sm:col-span-2">Желаемая дата замера: {formatDate(request.desired_measurement_date)}</p>
          )}
        </div>

        {isMeasurement ? (
          <Button className="mt-5 w-full" onClick={handleConvertToOrder} disabled={saving}>
            {saving ? 'Оформляем…' : 'Замер выполнен — оформить заказ'}
          </Button>
        ) : (
          <>
            <div className="mt-5 space-y-2">
              {items.length === 0 && <p className="text-sm text-muted-foreground">Пока нет ни одной позиции работ.</p>}
              {items.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  productType={productTypes.find((p) => p.id === item.product_type_id)}
                  fields={fields.filter((f) => f.product_type_id === item.product_type_id)}
                  onRemove={() => handleRemoveItem(item.id)}
                  onChanged={loadAll}
                />
              ))}
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
              <span className="text-muted-foreground">Итого по заказу</span>
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
            </div>

            <PaymentsSection payments={payments} totalCost={totalCost} paidAmount={request.paid_amount} fullyPaid={request.fully_paid} onAdd={handleAddPayment} />
            <MaterialsSection catalog={materialsCatalog} items={requestMaterials} totalCost={materialsCost} onAdd={handleAddMaterial} onRemove={handleRemoveMaterial} />

            <Button className="mt-5 w-full" onClick={handleSaveChanges} disabled={saving}>
              {saving ? 'Сохраняем…' : 'Сохранить изменения'}
            </Button>
          </>
        )}

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

function ItemRow({
  item,
  productType,
  fields,
  onRemove,
  onChanged,
}: {
  item: OrderItem;
  productType?: ProductType;
  fields: ProductTypeField[];
  onRemove: () => void;
  onChanged: () => void;
}) {
  const [editingPrice, setEditingPrice] = useState(false);
  const [editingSpec, setEditingSpec] = useState(false);
  const [finalCost, setFinalCost] = useState(item.final_cost ?? item.item_cost + item.install_cost);
  const [adjComment, setAdjComment] = useState(item.adjustment_comment ?? '');
  const [spec, setSpec] = useState<Record<string, any>>(item.tech_spec ?? {});
  const supabase = createClient();

  const baseCost = item.item_cost + item.install_cost;

  async function savePrice() {
    const diff = finalCost - baseCost;
    await supabase
      .from('order_items')
      .update({
        final_cost: finalCost,
        adjustment_amount: Math.abs(diff),
        adjustment_type: diff === 0 ? null : diff > 0 ? 'markup' : 'discount',
        adjustment_comment: adjComment || null,
      })
      .eq('id', item.id);
    setEditingPrice(false);
    onChanged();
  }

  async function saveSpec() {
    await supabase.from('order_items').update({ tech_spec: spec }).eq('id', item.id);
    setEditingSpec(false);
    onChanged();
  }

  return (
    <div className="rounded-lg border border-border px-3 py-2.5 text-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-navy-900">{productType?.name ?? 'Изделие'}</div>
          <div className="text-xs text-muted-foreground">~{item.manufacture_hours} ч изготовление</div>
        </div>
        <div className="flex items-center gap-2">
          {item.adjustment_type && (
            <Badge variant={item.adjustment_type === 'discount' ? 'danger' : 'success'}>
              {item.adjustment_type === 'discount' ? '−' : '+'}{formatTenge(item.adjustment_amount)}
            </Badge>
          )}
          <span className="font-semibold text-navy-900">{formatTenge(item.final_cost ?? baseCost)}</span>
          <button onClick={() => setEditingPrice(!editingPrice)}><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
          <button onClick={onRemove}><Trash2 className="h-4 w-4 text-red-500" /></button>
        </div>
      </div>

      {editingPrice && (
        <div className="mt-2 space-y-2 rounded-lg bg-mist-50 p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Расчётная: {formatTenge(baseCost)}</span>
          </div>
          <Input type="number" value={finalCost} onChange={(e) => setFinalCost(Number(e.target.value))} placeholder="Итоговая стоимость" />
          <Input value={adjComment} onChange={(e) => setAdjComment(e.target.value)} placeholder="Причина изменения (необязательно)" />
          <Button size="sm" onClick={savePrice}>Сохранить цену</Button>
        </div>
      )}

      {fields.length > 0 && (
        <button onClick={() => setEditingSpec(!editingSpec)} className="mt-2 text-xs text-blue-600 hover:underline">
          {editingSpec ? 'Скрыть тех.карточку' : 'Тех.карточка изделия'}
        </button>
      )}
      {editingSpec && (
        <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg bg-mist-50 p-3">
          {fields.map((f) => (
            <div key={f.key} className="space-y-1">
              <Label className="text-xs">{f.label}</Label>
              {f.field_type === 'boolean' ? (
                <select value={spec[f.key] ? 'yes' : 'no'} onChange={(e) => setSpec({ ...spec, [f.key]: e.target.value === 'yes' })} className="h-9 w-full rounded-lg border border-border bg-white px-2 text-xs">
                  <option value="no">Нет</option>
                  <option value="yes">Да</option>
                </select>
              ) : f.field_type === 'select' ? (
                <select value={spec[f.key] ?? ''} onChange={(e) => setSpec({ ...spec, [f.key]: e.target.value })} className="h-9 w-full rounded-lg border border-border bg-white px-2 text-xs">
                  <option value="">—</option>
                  {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <Input className="h-9 text-xs" type={f.field_type === 'number' ? 'number' : 'text'} value={spec[f.key] ?? ''} onChange={(e) => setSpec({ ...spec, [f.key]: e.target.value })} />
              )}
            </div>
          ))}
          <Button size="sm" className="col-span-2" onClick={saveSpec}>Сохранить тех.карточку</Button>
        </div>
      )}
    </div>
  );
}

function PaymentsSection({
  payments, totalCost, paidAmount, fullyPaid, onAdd,
}: {
  payments: Payment[]; totalCost: number; paidAmount: number; fullyPaid: boolean;
  onAdd: (amount: number, note: string) => void;
}) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  return (
    <div className="mt-5 space-y-2 border-t border-border pt-4">
      <div className="flex items-center gap-2">
        <Wallet className="h-4 w-4 text-blue-600" />
        <h3 className="font-semibold text-navy-900">Оплата</h3>
        {fullyPaid && <Badge variant="success">Оплачено полностью</Badge>}
      </div>
      <p className="text-sm text-muted-foreground">Получено {formatTenge(paidAmount)} из {formatTenge(totalCost)}</p>
      {payments.map((p) => (
        <div key={p.id} className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatDate(p.paid_at)} {p.note && `— ${p.note}`}</span>
          <span className="font-medium text-navy-800">{formatTenge(p.amount)}</span>
        </div>
      ))}
      <div className="flex gap-2 pt-1">
        <Input type="number" placeholder="Сумма" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-32" />
        <Input placeholder="Аванс / доплата…" value={note} onChange={(e) => setNote(e.target.value)} className="flex-1" />
        <Button size="sm" onClick={() => { onAdd(Number(amount), note); setAmount(''); setNote(''); }}>Добавить</Button>
      </div>
    </div>
  );
}

function MaterialsSection({
  catalog, items, totalCost, onAdd, onRemove,
}: {
  catalog: Material[]; items: RequestMaterial[]; totalCost: number;
  onAdd: (materialId: string, quantity: number, unitCost: number) => void;
  onRemove: (id: string) => void;
}) {
  const [materialId, setMaterialId] = useState('');
  const [qty, setQty] = useState('');
  const [unitCost, setUnitCost] = useState('');

  return (
    <div className="mt-5 space-y-2 border-t border-border pt-4">
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 text-blue-600" />
        <h3 className="font-semibold text-navy-900">Материалы</h3>
      </div>
      <p className="text-sm text-muted-foreground">Себестоимость материалов: {formatTenge(totalCost)}</p>
      {items.map((m) => (
        <div key={m.id} className="flex items-center justify-between text-xs">
          <span className="text-navy-800">{m.material?.name} × {m.quantity} {m.material?.unit}</span>
          <div className="flex items-center gap-2">
            <span className="font-medium text-navy-800">{formatTenge(m.total_cost)}</span>
            <button onClick={() => onRemove(m.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></button>
          </div>
        </div>
      ))}
      <div className="flex gap-2 pt-1">
        <select value={materialId} onChange={(e) => setMaterialId(e.target.value)} className="h-9 flex-1 rounded-lg border border-border bg-white px-2 text-xs">
          <option value="">Материал…</option>
          {catalog.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <Input placeholder="Кол-во" type="number" value={qty} onChange={(e) => setQty(e.target.value)} className="h-9 w-20 text-xs" />
        <Input placeholder="Цена/ед" type="number" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} className="h-9 w-24 text-xs" />
        <Button size="sm" onClick={() => { onAdd(materialId, Number(qty), Number(unitCost)); setMaterialId(''); setQty(''); setUnitCost(''); }}>+</Button>
      </div>
    </div>
  );
}
