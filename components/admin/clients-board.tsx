'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Wallet, Pencil, AlertCircle, ShieldAlert, MessageSquare, X, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClientEditDialog } from '@/components/admin/client-edit-dialog';
import { formatTenge, formatDate } from '@/lib/utils';
import type { ClientTotals, ClientComment, ERPRequest } from '@/lib/types';

const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;
const WARRANTY_MS = 365 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function ClientsBoard() {
  const [clients, setClients] = useState<(ClientTotals & { reminder_dismissed_until: string | null })[]>([]);
  const [doneRequests, setDoneRequests] = useState<ERPRequest[]>([]);
  const [comments, setComments] = useState<Record<string, ClientComment[]>>({});
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');

  const supabase = createClient();
  const isMonday = new Date().getDay() === 1;

  async function loadAll(search: string) {
    setLoading(true);
    let req = supabase.from('client_totals').select('*').order('total_revenue', { ascending: false });
    if (search.trim()) req = req.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    const [{ data: cl }, { data: clientRows }, { data: reqs }, { data: com }] = await Promise.all([
      req,
      supabase.from('clients').select('id, reminder_dismissed_until'),
      supabase.from('requests').select('*').eq('status', 'done'),
      supabase.from('client_comments').select('*').order('created_at', { ascending: false }),
    ]);
    const dismissMap = new Map((clientRows ?? []).map((c: any) => [c.id, c.reminder_dismissed_until]));
    setClients(((cl as ClientTotals[]) ?? []).map((c) => ({ ...c, reminder_dismissed_until: dismissMap.get(c.id) ?? null })));
    setDoneRequests((reqs as ERPRequest[]) ?? []);
    const grouped: Record<string, ClientComment[]> = {};
    (com as ClientComment[] ?? []).forEach((c) => { grouped[c.client_id] = [...(grouped[c.client_id] ?? []), c]; });
    setComments(grouped);
    setLoading(false);
  }

  useEffect(() => {
    const t = setTimeout(() => loadAll(query), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const requestsByClient = useMemo(() => {
    const map = new Map<string, ERPRequest[]>();
    doneRequests.forEach((r) => { if (r.client_id) map.set(r.client_id, [...(map.get(r.client_id) ?? []), r]); });
    return map;
  }, [doneRequests]);

  function getInactivity(client: (typeof clients)[number]) {
    const reqs = requestsByClient.get(client.id) ?? [];
    if (reqs.length === 0) return null;
    const lastDone = reqs.reduce((max, r) => (r.finished_at && r.finished_at > max ? r.finished_at : max), reqs[0].finished_at ?? '');
    if (!lastDone) return null;
    const dismissedUntil = client.reminder_dismissed_until ? new Date(client.reminder_dismissed_until) : null;
    if (dismissedUntil && dismissedUntil > new Date()) return null;
    if (Date.now() - new Date(lastDone).getTime() > THREE_MONTHS_MS) return lastDone;
    return null;
  }

  function getWarranty(client: (typeof clients)[number]) {
    const reqs = (requestsByClient.get(client.id) ?? []).filter((r) => !r.warranty_notice_dismissed && r.install_date);
    return reqs.find((r) => {
      const end = new Date(r.install_date!).getTime() + WARRANTY_MS;
      return end - Date.now() <= SEVEN_DAYS_MS && end - Date.now() > -WARRANTY_MS;
    });
  }

  async function dismissInactivity(clientId: string) {
    const until = new Date();
    until.setMonth(until.getMonth() + 3);
    await supabase.from('clients').update({ reminder_dismissed_until: until.toISOString().slice(0, 10) }).eq('id', clientId);
    loadAll(query);
  }

  async function dismissWarranty(requestId: string) {
    await supabase.from('requests').update({ warranty_notice_dismissed: true }).eq('id', requestId);
    loadAll(query);
  }

  async function addComment(clientId: string) {
    if (!newComment.trim()) return;
    await supabase.from('client_comments').insert({ client_id: clientId, text: newComment });
    setNewComment('');
    loadAll(query);
  }

  async function deleteComment(id: string) {
    await supabase.from('client_comments').delete().eq('id', id);
    loadAll(query);
  }

  const sorted = useMemo(() => {
    return [...clients].sort((a, b) => {
      const scoreA = (getInactivity(a) ? 2 : 0) + (getWarranty(a) ? 2 : 0) + (isMonday && (comments[a.id]?.length ?? 0) > 0 ? 1 : 0);
      const scoreB = (getInactivity(b) ? 2 : 0) + (getWarranty(b) ? 2 : 0) + (isMonday && (comments[b.id]?.length ?? 0) > 0 ? 1 : 0);
      if (scoreA !== scoreB) return scoreB - scoreA;
      return b.total_revenue - a.total_revenue;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients, comments]);

  return (
    <div className="space-y-6">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Поиск по имени или телефону" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading && <p className="text-muted-foreground">Загрузка…</p>}
        {!loading && sorted.length === 0 && <p className="text-muted-foreground">Клиентов пока нет</p>}
        {sorted.map((client) => {
          const inactivity = getInactivity(client);
          const warranty = getWarranty(client);
          const clientComments = comments[client.id] ?? [];
          return (
            <Card key={client.id} className={inactivity || warranty ? 'border-amber-300' : undefined}>
              <CardContent className="space-y-2 pt-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-navy-900">{client.name || 'Без имени'}</h3>
                  <ClientEditDialog client={client} onChanged={() => loadAll(query)} trigger={<Button variant="ghost" size="icon" className="h-7 w-7"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></Button>} />
                </div>
                <p className="text-sm text-muted-foreground">{client.phone}</p>

                <div className="flex items-center justify-between rounded-lg bg-mist-50 px-3 py-2">
                  <span className="flex items-center gap-1 text-sm text-muted-foreground"><Wallet className="h-3.5 w-3.5" /> Всего принесено</span>
                  <span className="font-semibold text-navy-900">{formatTenge(client.total_revenue)}</span>
                </div>

                {inactivity && (
                  <div className="space-y-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    <div className="flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5" /> Не оформлял заказ более 3 месяцев</div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => dismissInactivity(client.id)}>Не сработало</Button>
                    </div>
                  </div>
                )}
                {warranty && (
                  <div className="space-y-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">
                    <div className="flex items-center gap-1.5"><ShieldAlert className="h-3.5 w-3.5" /> Гарантия истекает {formatDate(new Date(new Date(warranty.install_date!).getTime() + WARRANTY_MS).toISOString())}</div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => dismissWarranty(warranty.id)}>Не требуется</Button>
                    </div>
                  </div>
                )}

                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{client.requests_count} заявок</span>
                  {client.last_request_at && <span>Последняя: {formatDate(client.last_request_at)}</span>}
                </div>

                <button onClick={() => setOpenComments(openComments === client.id ? null : client.id)} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                  <MessageSquare className="h-3.5 w-3.5" /> Комментарии ({clientComments.length})
                </button>
                {openComments === client.id && (
                  <div className="space-y-1.5 rounded-lg bg-mist-50 p-2">
                    {clientComments.map((c) => (
                      <div key={c.id} className="flex items-start justify-between gap-2 text-xs">
                        <span className="text-navy-700">{c.text}</span>
                        <button onClick={() => deleteComment(c.id)}><X className="h-3.5 w-3.5 text-red-500" /></button>
                      </div>
                    ))}
                    <div className="flex gap-1.5 pt-1">
                      <Input className="h-8 text-xs" placeholder="Новый комментарий" value={openComments === client.id ? newComment : ''} onChange={(e) => setNewComment(e.target.value)} />
                      <Button size="sm" className="h-8" onClick={() => addComment(client.id)}><Plus className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
