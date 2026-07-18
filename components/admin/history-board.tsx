'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatDate, formatTenge } from '@/lib/utils';
import type { ERPRequest } from '@/lib/types';

export function HistoryBoard() {
  const [requests, setRequests] = useState<ERPRequest[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  async function loadRequests(search: string) {
    setLoading(true);
    let req = supabase.from('requests').select('*').eq('status', 'done').order('finished_at', { ascending: false });
    if (search.trim()) {
      req = req.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    }
    const { data } = await req;
    setRequests((data as ERPRequest[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    const timeout = setTimeout(() => loadRequests(query), 300);
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
        {!loading && requests.length === 0 && <p className="text-muted-foreground">Ничего не найдено</p>}
        {requests.map((request) => (
          <Card key={request.id} className="overflow-hidden">
            <div className="relative aspect-video w-full bg-navy-800">
              {request.finished_photo_url && (
                <Image src={request.finished_photo_url} alt={request.name} fill className="object-cover" />
              )}
            </div>
            <CardContent className="space-y-1 pt-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-navy-900">{request.name}</h3>
                {request.total_cost > 0 && <span className="text-sm font-semibold text-navy-900">{formatTenge(request.total_cost)}</span>}
              </div>
              <p className="text-sm text-muted-foreground">{request.phone}</p>
              <div className="flex justify-between pt-1 text-xs text-muted-foreground">
                {request.started_production_at && <span>Запуск: {formatDate(request.started_production_at)}</span>}
                {request.install_date && <span>Монтаж: {formatDate(request.install_date)}</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
