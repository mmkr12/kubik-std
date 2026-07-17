'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/utils';
import type { Order } from '@/lib/types';

export function HistoryBoard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  async function loadOrders(search: string) {
    setLoading(true);
    let req = supabase.from('orders').select('*').eq('status', 'done').order('finished_at', { ascending: false });
    if (search.trim()) {
      req = req.or(`company_name.ilike.%${search}%,phone.ilike.%${search}%`);
    }
    const { data } = await req;
    setOrders((data as Order[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    const timeout = setTimeout(() => loadOrders(query), 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="space-y-6">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Поиск по названию или телефону"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading && <p className="text-muted-foreground">Загрузка…</p>}
        {!loading && orders.length === 0 && <p className="text-muted-foreground">Ничего не найдено</p>}
        {orders.map((order) => (
          <Card key={order.id} className="overflow-hidden">
            <div className="relative aspect-video w-full bg-navy-800">
              {order.finished_photo_url && (
                <Image src={order.finished_photo_url} alt={order.company_name} fill className="object-cover" />
              )}
            </div>
            <CardContent className="space-y-1 pt-4">
              <h3 className="font-semibold text-navy-900">{order.company_name}</h3>
              <p className="text-sm text-muted-foreground">{order.phone}</p>
              <div className="flex justify-between pt-1 text-xs text-muted-foreground">
                {order.started_production_at && <span>Запуск: {formatDate(order.started_production_at)}</span>}
                {order.install_date && <span>Монтаж: {formatDate(order.install_date)}</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
