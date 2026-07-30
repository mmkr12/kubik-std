'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, CalendarClock, Pencil, Wallet, Package } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatTenge, formatDate } from '@/lib/utils';
import { MainCalculator } from '@/components/main-calculator';
import type { LightLettersDraft } from '@/components/calculators/light-letters-on-frame-calculator';
import type { ERPRequest, OrderItem, Payment, RequestMaterial, Material } from '@/lib/types';
import { computeQueuePlacement, type DispatchableRequest } from '@/lib/dispatcher';
import { reportSupabaseError } from '@/lib/report-error';

// Общий «конструктор заказа» — используется и при первом создании заявки
// («Замер не требуется»), и при редактировании уже существующего заказа.
export function OrderWorkspace({ requestId, onChanged }: { requestId: string; onChanged: () => void }) {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [materialsCatalog, setMaterialsCatalog] = useState<Material[]>([]);
  const [requestMaterials, setRequestMaterials] = useState<RequestMaterial[]>([]);
  const [request, setRequest] = useState<ERPRequest | null>(null);
  const [installDate, setInstallDate] = useState('');
  const [suggesting, setSuggesting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const supabase = createClient();

  async function loadAll() {
    const [{ data: reqData }, { data: itemsData }, { data: paymentsData }, { data: matCatalog }, { data: reqMats }] = await Promise.all([
      supabase.from('requests').select('*').eq('id', requestId).single(),
      supabase.from('order_items').select('*').eq('request_id', requestId).order('created_at'),
      supabase.from('payments').select('*').eq('request_id', requestId).order('paid_at', { ascending: false }),
      supabase.from('materials').select('*').eq('active', true).order('sort_order'),
      supabase.from('request_materials').select('*, material:materials(*)').eq('request_id', requestId),
    ]);
    setRequest(reqData as ERPRequest);
    setItems((itemsData as OrderItem[]) ?? []);
    setPayments((paymentsData as Payment[]) ?? []);
    setMaterialsCatalog((matCatalog as Material[]) ?? []);
    setRequestMaterials((reqMats as RequestMaterial[]) ?? []);
    if (reqData) setInstallDate((reqData as ERPRequest).install_date ?? '');
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  async function handleAddItem(draft: LightLettersDraft) {
    const { error } = await supabase.from('order_items').insert({
      request_id: requestId,
      product_type_id: null,
      params: draft.input,
      manufacture_hours: null,
      item_cost: draft.result.material + draft.result.production,
      final_cost: draft.result.total,
      install_cost: draft.result.installDelivery,
      install_city: draft.input.installMode === 'install' ? draft.input.installCity : 'taraz',
      install_complexity: draft.input.installMode === 'install' ? draft.input.complexity : null,
      tech_spec: { type: draft.kind, ...draft.result },
    });
    if (reportSupabaseError('Не удалось добавить позицию', error)) return;
    setShowForm(false);
    loadAll();
    onChanged();
  }

  async function handleRemoveItem(id: string) {
    const { error } = await supabase.from('order_items').delete().eq('id', id);
    if (reportSupabaseError('Не удалось удалить позицию', error)) return;
    loadAll();
    onChanged();
  }

  // Подбирает дату монтажа через тот же алгоритм очереди, что и диспетчер
  // (lib/dispatcher.ts) — считает эту заявку "новой" в очереди остальных
  // активных заявок и берёт вычисленный для неё день.
  async function handleSuggestDate() {
    if (!request) return;
    setSuggesting(true);
    try {
      const { data: allReqs, error } = await supabase
        .from('requests')
        .select('id, created_at, status, manual_override, install_date, production_day')
        .eq('status', 'in_production');
      if (reportSupabaseError('Не удалось загрузить очередь', error)) return;
      const others = ((allReqs as DispatchableRequest[]) ?? []).filter((r) => r.id !== requestId);
      const thisAsFresh: DispatchableRequest = {
        id: requestId,
        created_at: request.created_at,
        status: 'in_production',
        manual_override: false,
        install_date: null,
        production_day: null,
      };
      const placements = computeQueuePlacement([...others, thisAsFresh], new Date());
      const mine = placements.find((p) => p.requestId === requestId);
      if (!mine) return;
      const { error: updError } = await supabase
        .from('requests')
        .update({ install_date: mine.installDay, recommended_install_date: mine.installDay, production_day: mine.productionDay })
        .eq('id', requestId);
      if (reportSupabaseError('Не удалось сохранить дату', updError)) return;
      setInstallDate(mine.installDay);
      onChanged();
    } finally {
      setSuggesting(false);
    }
  }

  async function handleInstallDateBlur() {
    const { error } = await supabase.from('requests').update({ install_date: installDate || null }).eq('id', requestId);
    if (reportSupabaseError('Не удалось сохранить дату', error)) return;
    onChanged();
  }

  async function handleAddPayment(amount: number, note: string) {
    if (!amount) return;
    const { error } = await supabase.from('payments').insert({ request_id: requestId, amount, note: note || null });
    if (reportSupabaseError('Не удалось сохранить платёж', error)) return;
    loadAll();
    onChanged();
  }

  async function handleAddMaterial(materialId: string, quantity: number, unitCost: number) {
    if (!materialId || !quantity) return;
    const { error } = await supabase.from('request_materials').insert({ request_id: requestId, material_id: materialId, quantity, unit_cost: unitCost });
    if (reportSupabaseError('Не удалось добавить материал', error)) return;
    loadAll();
  }

  async function handleRemoveMaterial(id: string) {
    const { error } = await supabase.from('request_materials').delete().eq('id', id);
    if (reportSupabaseError('Не удалось удалить материал', error)) return;
    loadAll();
  }

  if (!request) return <p className="text-sm text-muted-foreground">Загрузка…</p>;

  const totalCost = items.reduce((sum, i) => sum + (i.final_cost ?? i.item_cost + i.install_cost), 0);
  const materialsCost = requestMaterials.reduce((s, m) => s + m.total_cost, 0);

  return (
    <div>
      <div className="space-y-2">
        {items.length === 0 && <p className="text-sm text-muted-foreground">Пока нет ни одной позиции работ.</p>}
        {items.map((item) => (
          <ItemRow key={item.id} item={item} onRemove={() => handleRemoveItem(item.id)} onChanged={loadAll} />
        ))}
      </div>

      {showForm ? (
        <div className="mt-4">
          <MainCalculator mode="item" onAdd={handleAddItem} onCancel={() => setShowForm(false)} />
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
          <Input type="date" value={installDate} onChange={(e) => setInstallDate(e.target.value)} onBlur={handleInstallDateBlur} className="flex-1" />
          <Button variant="secondary" onClick={handleSuggestDate} disabled={items.length === 0 || suggesting}>
            <CalendarClock className="mr-1 h-4 w-4" /> {suggesting ? 'Считаем…' : 'Подобрать'}
          </Button>
        </div>
      </div>

      <PaymentsSection payments={payments} totalCost={totalCost} paidAmount={request.paid_amount} fullyPaid={request.fully_paid} onAdd={handleAddPayment} />
      <MaterialsSection catalog={materialsCatalog} items={requestMaterials} totalCost={materialsCost} onAdd={handleAddMaterial} onRemove={handleRemoveMaterial} />
    </div>
  );
}

function ItemRow({ item, onRemove, onChanged }: { item: OrderItem; onRemove: () => void; onChanged: () => void }) {
  const [editingPrice, setEditingPrice] = useState(false);
  const [finalCost, setFinalCost] = useState(item.final_cost ?? item.item_cost + item.install_cost);
  const [adjComment, setAdjComment] = useState(item.adjustment_comment ?? '');
  const supabase = createClient();
  const baseCost = item.item_cost + item.install_cost;

  async function savePrice() {
    const diff = finalCost - baseCost;
    const { error } = await supabase.from('order_items').update({
      final_cost: finalCost,
      adjustment_amount: Math.abs(diff),
      adjustment_type: diff === 0 ? null : diff > 0 ? 'markup' : 'discount',
      adjustment_comment: adjComment || null,
    }).eq('id', item.id);
    if (reportSupabaseError('Не удалось сохранить цену', error)) return;
    setEditingPrice(false);
    onChanged();
  }

  return (
    <div className="rounded-lg border border-border px-3 py-2.5 text-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-navy-900">Позиция заказа</div>
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
          <div className="text-xs text-muted-foreground">Расчётная: {formatTenge(baseCost)}</div>
          <Input type="number" value={finalCost} onChange={(e) => setFinalCost(Number(e.target.value))} placeholder="Итоговая стоимость" />
          <Input value={adjComment} onChange={(e) => setAdjComment(e.target.value)} placeholder="Причина изменения (необязательно)" />
          <Button size="sm" onClick={savePrice}>Сохранить цену</Button>
        </div>
      )}
    </div>
  );
}

const PAYMENT_LABELS = ['Аванс', 'Доплата', 'Полная оплата', 'Другое'];

function PaymentsSection({
  payments, totalCost, paidAmount, fullyPaid, onAdd,
}: {
  payments: Payment[]; totalCost: number; paidAmount: number; fullyPaid: boolean;
  onAdd: (amount: number, note: string) => void;
}) {
  const [amount, setAmount] = useState('');
  const [label, setLabel] = useState(PAYMENT_LABELS[0]);
  const [customNote, setCustomNote] = useState('');

  function submit() {
    const note = label === 'Другое' ? customNote : label;
    onAdd(Number(amount), note);
    setAmount('');
    setCustomNote('');
  }

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
      <p className="pt-1 text-xs text-muted-foreground">Внести новый платёж — сумма и тип (аванс/доплата/полная оплата):</p>
      <div className="flex flex-wrap gap-2">
        <Input type="number" placeholder="Сумма, ₸" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-32" />
        <select value={label} onChange={(e) => setLabel(e.target.value)} className="h-10 rounded-xl border border-border bg-white px-3 text-sm">
          {PAYMENT_LABELS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        {label === 'Другое' && (
          <Input placeholder="Уточните…" value={customNote} onChange={(e) => setCustomNote(e.target.value)} className="flex-1" />
        )}
        <Button size="sm" onClick={submit}>Добавить платёж</Button>
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
        <h3 className="font-semibold text-navy-900">Материалы (для себестоимости)</h3>
      </div>
      <p className="text-sm text-muted-foreground">Итого потрачено на материалы: {formatTenge(totalCost)}</p>
      {items.map((m) => (
        <div key={m.id} className="flex items-center justify-between text-xs">
          <span className="text-navy-800">{m.material?.name} × {m.quantity} {m.material?.unit}</span>
          <div className="flex items-center gap-2">
            <span className="font-medium text-navy-800">{formatTenge(m.total_cost)}</span>
            <button onClick={() => onRemove(m.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></button>
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-2 pt-1">
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
