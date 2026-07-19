'use client';

import { useEffect, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/utils';
import type { CorporateEvent, MondayChecklistItem } from '@/lib/types';

function startOfWeek(d = new Date()) {
  const day = d.getDay() === 0 ? 7 : d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day - 1));
  return monday.toISOString().slice(0, 10);
}
function endOfWeek(weekStartISO: string) {
  const d = new Date(weekStartISO);
  d.setDate(d.getDate() + 6);
  return d.toISOString().slice(0, 10);
}

export function RegulationsBoard() {
  const [checklistItems, setChecklistItems] = useState<MondayChecklistItem[]>([]);
  const [runId, setRunId] = useState<string | null>(null);
  const [doneItemIds, setDoneItemIds] = useState<Set<string>>(new Set());
  const [weekStatus, setWeekStatus] = useState<{ total: number; done: number } | null>(null);
  const [events, setEvents] = useState<CorporateEvent[]>([]);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [loading, setLoading] = useState(true);

  const supabase = createClient();
  const weekStart = startOfWeek();
  const weekEnd = endOfWeek(weekStart);

  async function loadAll() {
    setLoading(true);
    const { data: items } = await supabase.from('monday_checklist_items').select('*').eq('active', true).order('sort_order');
    setChecklistItems((items as MondayChecklistItem[]) ?? []);

    let { data: run } = await supabase.from('monday_checklist_runs').select('*').eq('week_start', weekStart).maybeSingle();
    if (!run) {
      const { data: created } = await supabase.from('monday_checklist_runs').insert({ week_start: weekStart }).select('*').single();
      run = created;
    }
    setRunId(run?.id ?? null);

    if (run) {
      const { data: runItems } = await supabase.from('monday_checklist_run_items').select('*').eq('run_id', run.id).eq('done', true);
      setDoneItemIds(new Set((runItems ?? []).map((i: any) => i.item_id)));
    }

    const { data: weekRequests } = await supabase
      .from('requests')
      .select('status')
      .gte('install_date', weekStart)
      .lte('install_date', weekEnd);
    const total = weekRequests?.length ?? 0;
    const done = weekRequests?.filter((r) => r.status === 'done').length ?? 0;
    setWeekStatus({ total, done });

    const { data: eventsData } = await supabase.from('corporate_events').select('*').gte('event_date', weekStart).order('event_date');
    setEvents((eventsData as CorporateEvent[]) ?? []);

    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleItem(itemId: string) {
    if (!runId) return;
    const isDone = doneItemIds.has(itemId);
    const { data: existing } = await supabase.from('monday_checklist_run_items').select('id').eq('run_id', runId).eq('item_id', itemId).maybeSingle();
    if (existing) {
      await supabase.from('monday_checklist_run_items').update({ done: !isDone, done_at: !isDone ? new Date().toISOString() : null }).eq('id', existing.id);
    } else {
      await supabase.from('monday_checklist_run_items').insert({ run_id: runId, item_id: itemId, done: true, done_at: new Date().toISOString() });
    }
    loadAll();
  }

  async function handleAddEvent() {
    if (!eventTitle || !eventDate) return;
    await supabase.from('corporate_events').insert({ title: eventTitle, event_date: eventDate });
    setEventTitle('');
    setEventDate('');
    setShowAddEvent(false);
    loadAll();
  }

  if (loading) return <p className="text-muted-foreground">Загрузка…</p>;

  const weekComplete = weekStatus && weekStatus.total > 0 && weekStatus.done === weekStatus.total;

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardContent className="pt-5">
          <h2 className="mb-1 font-semibold text-navy-900">Статус недели</h2>
          <p className="text-sm text-muted-foreground">
            Заявок с монтажом на этой неделе: {weekStatus?.total ?? 0}, выполнено: {weekStatus?.done ?? 0}
          </p>
          <div className={`mt-3 rounded-lg px-3 py-2 text-sm font-medium ${weekComplete ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
            {weekComplete
              ? 'План недели выполнен — воскресенье свободно'
              : 'План недели ещё не закрыт — воскресенье остаётся резервным рабочим днём'}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 pt-5">
          <h2 className="mb-2 font-semibold text-navy-900">Чек-лист понедельника</h2>
          {checklistItems.map((item) => {
            const done = doneItemIds.has(item.id);
            return (
              <button
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                  done ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-border hover:bg-mist-50'
                }`}
              >
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${done ? 'border-emerald-500 bg-emerald-500' : 'border-border'}`}>
                  {done && <Check className="h-3.5 w-3.5 text-white" />}
                </span>
                {item.title}
              </button>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-navy-900">Корпоративные события</h2>
            <Button variant="outline" size="sm" onClick={() => setShowAddEvent(!showAddEvent)}>
              <Plus className="mr-1 h-4 w-4" /> Добавить
            </Button>
          </div>
          {showAddEvent && (
            <div className="flex gap-2">
              <Input value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} placeholder="Название" className="flex-1" />
              <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="w-40" />
              <Button size="sm" onClick={handleAddEvent}>Ок</Button>
            </div>
          )}
          {events.length === 0 && <p className="text-sm text-muted-foreground">Пока не запланировано</p>}
          {events.map((ev) => (
            <div key={ev.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
              <span className="text-navy-800">{ev.title}</span>
              <span className="text-muted-foreground">{formatDate(ev.event_date)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
