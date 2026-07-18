'use client';

import { useEffect, useState } from 'react';
import { Search, Wallet } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { formatTenge, formatDate } from '@/lib/utils';
import type { ClientTotals } from '@/lib/types';

export function ClientsBoard() {
  const [clients, setClients] = useState<ClientTotals[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  async function loadClients(search: string) {
    setLoading(true);
    let req = supabase.from('client_totals').select('*').order('total_revenue', { ascending: false });
    if (search.trim()) {
      req = req.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    }
    const { data } = await req;
    setClients((data as ClientTotals[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    const timeout = setTimeout(() => loadClients(query), 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="space-y-6">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Поиск по имени или телефону" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading && <p className="text-muted-foreground">Загрузка…</p>}
        {!loading && clients.length === 0 && <p className="text-muted-foreground">Клиентов пока нет</p>}
        {clients.map((client) => (
          <Card key={client.id}>
            <CardContent className="space-y-2 pt-5">
              <h3 className="font-semibold text-navy-900">{client.name || 'Без имени'}</h3>
              <p className="text-sm text-muted-foreground">{client.phone}</p>
              <div className="flex items-center justify-between rounded-lg bg-mist-50 px-3 py-2">
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Wallet className="h-3.5 w-3.5" /> Всего принесено
                </span>
                <span className="font-semibold text-navy-900">{formatTenge(client.total_revenue)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{client.requests_count} заявок</span>
                {client.last_request_at && <span>Последняя: {formatDate(client.last_request_at)}</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
