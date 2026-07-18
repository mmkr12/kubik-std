'use client';

import { useState } from 'react';
import { Ruler, FileText, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { findOrCreateClient } from '@/lib/clients';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Branch = 'choice' | 'measurement' | 'full';

const EMPTY_MEASUREMENT = { name: '', phone: '', address: '' };
const EMPTY_FULL = { name: '', phone: '', address: '', comment: '', install_date: '' };

export function CreateRequestDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [branch, setBranch] = useState<Branch>('choice');
  const [measurementForm, setMeasurementForm] = useState(EMPTY_MEASUREMENT);
  const [fullForm, setFullForm] = useState(EMPTY_FULL);
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  function reset() {
    setBranch('choice');
    setMeasurementForm(EMPTY_MEASUREMENT);
    setFullForm(EMPTY_FULL);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  async function handleSubmitMeasurement() {
    if (!measurementForm.name || !measurementForm.phone) return;
    setSaving(true);
    try {
      const client = await findOrCreateClient(measurementForm.phone, measurementForm.name);
      await supabase.from('requests').insert({
        client_id: client.id,
        status: 'measurement',
        needs_measurement: true,
        name: measurementForm.name,
        phone: measurementForm.phone,
        address: measurementForm.address || null,
      });
      onCreated();
      handleOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmitFull() {
    if (!fullForm.name || !fullForm.phone) return;
    setSaving(true);
    try {
      const client = await findOrCreateClient(fullForm.phone, fullForm.name);
      await supabase.from('requests').insert({
        client_id: client.id,
        status: 'draft',
        needs_measurement: false,
        name: fullForm.name,
        phone: fullForm.phone,
        address: fullForm.address || null,
        comment: fullForm.comment || null,
        // Дата монтажа пока вводится вручную — автоподбор по загрузке
        // производства появится на следующем этапе (планировщик).
        install_date: fullForm.install_date || null,
        manual_override: !!fullForm.install_date,
      });
      onCreated();
      handleOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button onClick={() => setOpen(true)}>Создать заявку</Button>
      <DialogContent className="max-w-lg">
        {branch === 'choice' && (
          <>
            <DialogTitle>Новая заявка</DialogTitle>
            <p className="mb-5 mt-1 text-sm text-muted-foreground">Нужен ли замер на объекте?</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                onClick={() => setBranch('measurement')}
                className="flex flex-col items-start gap-2 rounded-xl border border-border p-4 text-left transition-colors hover:border-blue-500 hover:bg-mist-50"
              >
                <Ruler className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-navy-900">Требуется замер</span>
                <span className="text-xs text-muted-foreground">Только имя, телефон, адрес</span>
              </button>
              <button
                onClick={() => setBranch('full')}
                className="flex flex-col items-start gap-2 rounded-xl border border-border p-4 text-left transition-colors hover:border-blue-500 hover:bg-mist-50"
              >
                <FileText className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-navy-900">Замер не требуется</span>
                <span className="text-xs text-muted-foreground">Полная заявка сразу</span>
              </button>
            </div>
          </>
        )}

        {branch === 'measurement' && (
          <>
            <button onClick={() => setBranch('choice')} className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-navy-900">
              <ArrowLeft className="h-3.5 w-3.5" /> Назад
            </button>
            <DialogTitle>Требуется замер</DialogTitle>
            <div className="mt-4 space-y-3">
              <div className="space-y-2">
                <Label>Имя клиента</Label>
                <Input value={measurementForm.name} onChange={(e) => setMeasurementForm({ ...measurementForm, name: e.target.value })} placeholder="Айгерим" />
              </div>
              <div className="space-y-2">
                <Label>Телефон</Label>
                <Input value={measurementForm.phone} onChange={(e) => setMeasurementForm({ ...measurementForm, phone: e.target.value })} placeholder="+7 777 123 45 67" />
              </div>
              <div className="space-y-2">
                <Label>Адрес</Label>
                <Input value={measurementForm.address} onChange={(e) => setMeasurementForm({ ...measurementForm, address: e.target.value })} placeholder="ул. Абая 123" />
              </div>
            </div>
            <Button className="mt-5 w-full" onClick={handleSubmitMeasurement} disabled={saving}>
              {saving ? 'Сохраняем…' : 'Создать заявку на замер'}
            </Button>
          </>
        )}

        {branch === 'full' && (
          <>
            <button onClick={() => setBranch('choice')} className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-navy-900">
              <ArrowLeft className="h-3.5 w-3.5" /> Назад
            </button>
            <DialogTitle>Замер не требуется</DialogTitle>
            <div className="mt-4 space-y-3">
              <div className="space-y-2">
                <Label>Имя клиента</Label>
                <Input value={fullForm.name} onChange={(e) => setFullForm({ ...fullForm, name: e.target.value })} placeholder="Айгерим" />
              </div>
              <div className="space-y-2">
                <Label>Телефон</Label>
                <Input value={fullForm.phone} onChange={(e) => setFullForm({ ...fullForm, phone: e.target.value })} placeholder="+7 777 123 45 67" />
              </div>
              <div className="space-y-2">
                <Label>Адрес</Label>
                <Input value={fullForm.address} onChange={(e) => setFullForm({ ...fullForm, address: e.target.value })} placeholder="ул. Абая 123" />
              </div>
              <div className="space-y-2">
                <Label>Комментарий (описание работ)</Label>
                <Textarea value={fullForm.comment} onChange={(e) => setFullForm({ ...fullForm, comment: e.target.value })} placeholder="Нужна вывеска на фасад..." />
              </div>
              <div className="space-y-2">
                <Label>Дата монтажа</Label>
                <Input type="date" value={fullForm.install_date} onChange={(e) => setFullForm({ ...fullForm, install_date: e.target.value })} />
                <p className="text-xs text-muted-foreground">
                  Пока вводится вручную. Автоматический подбор даты по загрузке производства появится на следующем шаге.
                </p>
              </div>
            </div>
            <Button className="mt-5 w-full" onClick={handleSubmitFull} disabled={saving}>
              {saving ? 'Сохраняем…' : 'Создать заявку'}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
