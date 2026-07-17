'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Check, ImagePlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { uploadImage } from '@/lib/storage';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { formatTenge, formatDate } from '@/lib/utils';
import type { Order } from '@/lib/types';

export function ProductionBoard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  async function loadOrders() {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'production')
      .order('install_date', { ascending: true });
    setOrders((data as Order[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFinish() {
    if (!activeOrder || !photoFile) return;
    setSaving(true);
    try {
      const finished_photo_url = await uploadImage('finished-photos', photoFile);
      await supabase
        .from('orders')
        .update({ status: 'done', finished_photo_url, finished_at: new Date().toISOString() })
        .eq('id', activeOrder.id);
      setActiveOrder(null);
      setPhotoFile(null);
      loadOrders();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {loading && <p className="text-muted-foreground">Загрузка…</p>}
      {!loading && orders.length === 0 && <p className="text-muted-foreground">Нет заказов в производстве</p>}
      {orders.map((order) => (
        <Card key={order.id} className="overflow-hidden">
          <div className="relative aspect-video w-full bg-navy-800">
            {order.sketch_url && (
              <Image src={order.sketch_url} alt={order.company_name} fill className="object-cover" />
            )}
          </div>
          <CardContent className="space-y-1.5 pt-4">
            <h3 className="font-semibold text-navy-900">{order.company_name}</h3>
            <p className="text-sm text-muted-foreground">{order.phone}</p>
            {order.address && <p className="text-sm text-muted-foreground">{order.address}</p>}
            {order.comment && <p className="text-sm text-navy-700">{order.comment}</p>}
            <div className="flex items-center justify-between pt-1 text-sm">
              {order.cost && <span className="font-semibold text-navy-900">{formatTenge(order.cost)}</span>}
              {order.install_date && <span className="text-muted-foreground">{formatDate(order.install_date)}</span>}
            </div>
            <Button className="mt-3 w-full" onClick={() => setActiveOrder(order)}>
              <Check className="mr-1 h-4 w-4" /> ГОТОВО
            </Button>
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!activeOrder} onOpenChange={(open) => !open && setActiveOrder(null)}>
        <DialogContent>
          <DialogTitle>Загрузите фото готовой работы</DialogTitle>
          <label className="mt-4 flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-center text-sm text-muted-foreground hover:bg-mist-50">
            <ImagePlus className="h-6 w-6" />
            {photoFile ? photoFile.name : 'Перетащите изображение сюда или нажмите для выбора'}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} />
          </label>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setActiveOrder(null)}>Отмена</Button>
            <Button onClick={handleFinish} disabled={!photoFile || saving}>
              {saving ? 'Сохраняем…' : 'Сохранить'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
