'use client';

import { useEffect, useState } from 'react';
import { Plus, Check, X, ImagePlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { uploadImage } from '@/lib/storage';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatTenge, formatDate } from '@/lib/utils';
import type { Order } from '@/lib/types';

const EMPTY_FORM = {
  company_name: '',
  phone: '',
  address: '',
  comment: '',
  cost: '',
  install_date: '',
};

export function ZameryBoard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [sketchFile, setSketchFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  async function loadOrders() {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'measurement')
      .order('created_at', { ascending: false });
    setOrders((data as Order[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAdd() {
    if (!form.company_name || !form.phone) return;
    setSaving(true);

    let sketch_url: string | null = null;
    if (sketchFile) {
      try {
        sketch_url = await uploadImage('sketches', sketchFile);
      } catch {
        // продолжаем без эскиза, если загрузка не удалась
      }
    }

    await supabase.from('orders').insert({
      company_name: form.company_name,
      phone: form.phone,
      address: form.address || null,
      comment: form.comment || null,
      cost: form.cost ? Number(form.cost) : null,
      install_date: form.install_date || null,
      sketch_url,
      status: 'measurement',
    });

    setForm(EMPTY_FORM);
    setSketchFile(null);
    setSaving(false);
    loadOrders();
  }

  async function handleApprove(id: string) {
    await supabase.from('orders').update({ status: 'production', started_production_at: new Date().toISOString() }).eq('id', id);
    loadOrders();
  }

  async function handleLose(id: string) {
    await supabase.from('orders').update({ status: 'lost' }).eq('id', id);
    loadOrders();
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardContent className="pt-5">
          <div className="mb-4 flex items-center gap-2 text-navy-900">
            <Plus className="h-4 w-4" />
            <h2 className="font-semibold">Добавить заявку</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Название компании</Label>
              <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} placeholder="COSMOS CAKE" />
            </div>
            <div className="space-y-2">
              <Label>Телефон</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+7 777 123 45 67" />
            </div>
            <div className="space-y-2">
              <Label>Адрес</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="ул. Абая 123" />
            </div>
            <div className="space-y-2">
              <Label>Дата монтажа</Label>
              <Input type="date" value={form.install_date} onChange={(e) => setForm({ ...form, install_date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Стоимость</Label>
              <Input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} placeholder="350000" />
            </div>
            <div className="space-y-2">
              <Label>Эскиз / макет</Label>
              <label className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border px-4 text-sm text-muted-foreground hover:bg-mist-50">
                <ImagePlus className="h-4 w-4" />
                {sketchFile ? sketchFile.name : 'Загрузить изображение'}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setSketchFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Комментарий</Label>
              <Textarea value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} placeholder="Нужна вывеска на фасад, данные..." />
            </div>
          </div>
          <Button className="mt-5" onClick={handleAdd} disabled={saving}>
            {saving ? 'Сохраняем…' : 'Добавить заявку'}
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading && <p className="text-muted-foreground">Загрузка…</p>}
        {!loading && orders.length === 0 && (
          <p className="text-muted-foreground">Нет новых заявок на замер</p>
        )}
        {orders.map((order) => (
          <Card key={order.id}>
            <CardContent className="space-y-2 pt-5">
              <h3 className="font-semibold text-navy-900">{order.company_name}</h3>
              <p className="text-sm text-muted-foreground">{order.phone}</p>
              {order.address && <p className="text-sm text-muted-foreground">{order.address}</p>}
              {order.comment && <p className="text-sm text-navy-700">{order.comment}</p>}
              <div className="flex items-center justify-between pt-1 text-sm">
                {order.cost && <span className="font-semibold text-navy-900">{formatTenge(order.cost)}</span>}
                {order.install_date && <span className="text-muted-foreground">{formatDate(order.install_date)}</span>}
              </div>
              <div className="flex gap-2 pt-3">
                <Button variant="success" size="sm" className="flex-1" onClick={() => handleApprove(order.id)}>
                  <Check className="mr-1 h-4 w-4" /> Согласовали
                </Button>
                <Button variant="destructive" size="sm" className="flex-1" onClick={() => handleLose(order.id)}>
                  <X className="mr-1 h-4 w-4" /> Потеряли
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
