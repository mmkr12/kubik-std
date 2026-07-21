'use client';

import { useEffect, useState } from 'react';
import { Ruler, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreateRequestDialog } from '@/components/admin/create-request-dialog';
import { RequestDetailDialog } from '@/components/admin/request-detail-dialog';
import { formatDate } from '@/lib/utils';
import type { ERPRequest } from '@/lib/types';

export function RequestsBoard() {
  const [requests, setRequests] = useState<ERPRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [openRequest, setOpenRequest] = useState<ERPRequest | null>(null);

  const supabase = createClient();

  async function loadRequests() {
    setLoading(true);
    const { data } = await supabase
      .from('requests')
      .select('*')
      .eq('status', 'measurement')
      .order('created_at', { ascending: false });
    setRequests((data as ERPRequest[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLose(id: string) {
    await supabase.from('requests').update({ status: 'lost' }).eq('id', id);
    loadRequests();
  }

  // Когда создаётся полноценный заказ ("Замер не требуется"), он сразу
  // становится производственным и не появится в этом списке — открываем
  // его детальную карточку сразу же, чтобы продолжить добавлять работы.
  async function handleCreated(newId?: string) {
    loadRequests();
    if (newId) {
      const { data } = await supabase.from('requests').select('*').eq('id', newId).single();
      if (data) {
        setOpenRequest(data as ERPRequest);
        setOpenId(newId);
      }
    }
  }

  return (
    <div className="space-y-6">
      <CreateRequestDialog onCreated={handleCreated} />

      {openRequest && (
        <RequestDetailDialog
          request={openRequest}
          open={!!openId}
          onOpenChange={(o) => !o && setOpenId(null)}
          onChanged={loadRequests}
        />
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading && <p className="text-muted-foreground">Загрузка…</p>}
        {!loading && requests.length === 0 && (
          <p className="text-muted-foreground">Нет заявок на замер — нажмите «Создать заявку»</p>
        )}
        {requests.map((r) => (
          <Card key={r.id}>
            <CardContent className="space-y-2 pt-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-navy-900">{r.name}</h3>
                <Badge>
                  <Ruler className="mr-1 inline h-3 w-3" /> Замер
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{r.phone}</p>
              {r.address && <p className="text-sm text-muted-foreground">{r.address}</p>}
              {r.comment && <p className="text-sm text-navy-700">{r.comment}</p>}
              {r.desired_measurement_date && (
                <p className="text-xs text-muted-foreground">Желаемая дата: {formatDate(r.desired_measurement_date)}</p>
              )}
              <div className="flex gap-2 pt-3">
                <RequestDetailDialog
                  request={r}
                  onChanged={loadRequests}
                  trigger={<Button size="sm" className="w-full">Открыть заявку</Button>}
                />
                <Button variant="destructive" size="sm" onClick={() => handleLose(r.id)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
