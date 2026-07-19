'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Check, ImagePlus, Pencil } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { uploadImage } from '@/lib/storage';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { RequestDetailDialog } from '@/components/admin/request-detail-dialog';
import { formatTenge, formatDate } from '@/lib/utils';
import type { ERPRequest } from '@/lib/types';

function startOfWeek(dateStr: string) {
  const d = new Date(dateStr);
  const day = d.getDay() === 0 ? 7 : d.getDay(); // считаем неделю пн–вс
  d.setDate(d.getDate() - (day - 1));
  return d.toISOString().slice(0, 10);
}

function weekLabel(weekStartISO: string, index: number) {
  if (index === 0) return 'Текущая неделя';
  if (index === 1) return 'Следующая неделя';
  const d = new Date(weekStartISO);
  return `Неделя с ${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`;
}

export function ProductionCalendar() {
  const [requests, setRequests] = useState<ERPRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRequest, setActiveRequest] = useState<ERPRequest | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  async function loadRequests() {
    setLoading(true);
    const { data } = await supabase
      .from('requests')
      .select('*')
      .eq('status', 'in_production')
      .order('install_date', { ascending: true });
    setRequests((data as ERPRequest[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFinish() {
    if (!activeRequest || !photoFile) return;
    setSaving(true);
    try {
      const finished_photo_url = await uploadImage('finished-photos', photoFile);
      await supabase
        .from('requests')
        .update({ status: 'done', finished_photo_url, finished_at: new Date().toISOString() })
        .eq('id', activeRequest.id);
      setActiveRequest(null);
      setPhotoFile(null);
      loadRequests();
    } finally {
      setSaving(false);
    }
  }

  const weeks = useMemo(() => {
    const withDate = requests.filter((r) => r.install_date);
    const noDate = requests.filter((r) => !r.install_date);
    const groups = new Map<string, ERPRequest[]>();
    for (const r of withDate) {
      const week = startOfWeek(r.install_date!);
      if (!groups.has(week)) groups.set(week, []);
      groups.get(week)!.push(r);
    }
    const sortedWeeks = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    return { sortedWeeks, noDate };
  }, [requests]);

  if (loading) return <p className="text-muted-foreground">Загрузка…</p>;
  if (requests.length === 0) return <p className="text-muted-foreground">Нет заказов в производстве</p>;

  return (
    <div className="space-y-8">
      {weeks.noDate.length > 0 && (
        <WeekRow title="Без даты монтажа" items={weeks.noDate} onOpenFinish={setActiveRequest} onChanged={loadRequests} />
      )}
      {weeks.sortedWeeks.map(([weekStart, items], index) => (
        <WeekRow key={weekStart} title={weekLabel(weekStart, index)} items={items} onOpenFinish={setActiveRequest} onChanged={loadRequests} />
      ))}

      <Dialog open={!!activeRequest} onOpenChange={(open) => !open && setActiveRequest(null)}>
        <DialogContent>
          <DialogTitle>Загрузите фото готовой работы</DialogTitle>
          <label className="mt-4 flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-center text-sm text-muted-foreground hover:bg-mist-50">
            <ImagePlus className="h-6 w-6" />
            {photoFile ? photoFile.name : 'Перетащите изображение сюда или нажмите для выбора'}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} />
          </label>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setActiveRequest(null)}>Отмена</Button>
            <Button onClick={handleFinish} disabled={!photoFile || saving}>
              {saving ? 'Сохраняем…' : 'Сохранить'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WeekRow({
  title,
  items,
  onOpenFinish,
  onChanged,
}: {
  title: string;
  items: ERPRequest[];
  onOpenFinish: (r: ERPRequest) => void;
  onChanged: () => void;
}) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {items.map((request) => (
          <Card key={request.id} className="w-64 shrink-0 overflow-hidden">
            <div className="relative aspect-video w-full bg-navy-800">
              {request.sketch_url && (
                <Image src={request.sketch_url} alt={request.name} fill className="object-cover" />
              )}
            </div>
            <CardContent className="space-y-1.5 pt-4">
              <h3 className="font-semibold text-navy-900">{request.name}</h3>
              <p className="text-sm text-muted-foreground">{request.phone}</p>
              {request.address && <p className="truncate text-sm text-muted-foreground">{request.address}</p>}
              <div className="flex items-center justify-between pt-1 text-sm">
                {request.total_cost > 0 && <span className="font-semibold text-navy-900">{formatTenge(request.total_cost)}</span>}
                {request.install_date && <span className="text-muted-foreground">{formatDate(request.install_date)}</span>}
              </div>
              <div className="flex gap-2 pt-3">
                <RequestDetailDialog
                  request={request}
                  onChanged={onChanged}
                  trigger={
                    <Button variant="secondary" size="sm" className="w-full">
                      <Pencil className="mr-1 h-3.5 w-3.5" /> Изменить
                    </Button>
                  }
                />
                <Button size="sm" className="w-full" onClick={() => onOpenFinish(request)}>
                  <Check className="mr-1 h-4 w-4" /> ГОТОВО
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
