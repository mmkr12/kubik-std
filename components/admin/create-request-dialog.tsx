'use client';

import { useState } from 'react';
import { Ruler, FileText, ArrowLeft, ImagePlus, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { findOrCreateClient } from '@/lib/clients';
import { uploadImage } from '@/lib/storage';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { OrderWorkspace } from '@/components/admin/order-workspace';

type Branch = 'choice' | 'measurement' | 'full' | 'items';

const EMPTY_MEASUREMENT = { name: '', phone: '', address: '', comment: '', desired_date: '' };
const EMPTY_FULL = { name: '', phone: '', address: '', comment: '', install_date: '' };

export function CreateRequestDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [branch, setBranch] = useState<Branch>('choice');
  const [measurementForm, setMeasurementForm] = useState(EMPTY_MEASUREMENT);
  const [fullForm, setFullForm] = useState(EMPTY_FULL);
  const [sketchFile, setSketchFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);

  const supabase = createClient();

  function reset() {
    setBranch('choice');
    setMeasurementForm(EMPTY_MEASUREMENT);
    setFullForm(EMPTY_FULL);
    setSketchFile(null);
    setCreatedRequestId(null);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      onCreated();
      reset();
    }
  }

  async function handleSubmitMeasurement() {
    if (!measurementForm.name || !measurementForm.phone) return;
    setSaving(true);
    try {
      let sketch_url: string | null = null;
      if (sketchFile) {
        try { sketch_url = await uploadImage('sketches', sketchFile); } catch { /* продолжаем без эскиза */ }
      }
      const client = await findOrCreateClient(measurementForm.phone, measurementForm.name);
      await supabase.from('requests').insert({
        client_id: client.id,
        status: 'measurement',
        needs_measurement: true,
        name: measurementForm.name,
        phone: measurementForm.phone,
        address: measurementForm.address || null,
        comment: measurementForm.comment || null,
        desired_measurement_date: measurementForm.desired_date || null,
        sketch_url,
      });
      handleOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmitFull() {
    if (!fullForm.name || !fullForm.phone) return;
    setSaving(true);
    try {
      let sketch_url: string | null = null;
      if (sketchFile) {
        try { sketch_url = await uploadImage('sketches', sketchFile); } catch { /* продолжаем без эскиза */ }
      }
      const client = await findOrCreateClient(fullForm.phone, fullForm.name);
      const { data: created } = await supabase
        .from('requests')
        .insert({
          client_id: client.id,
          status: 'in_production',
          needs_measurement: false,
          name: fullForm.name,
          phone: fullForm.phone,
          address: fullForm.address || null,
          comment: fullForm.comment || null,
          sketch_url,
          install_date: fullForm.install_date || null,
          manual_override: !!fullForm.install_date,
          started_production_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      // Никакого второго окна — продолжаем в этом же диалоге, сразу
      // с калькулятором и всеми блоками заказа.
      if (created) {
        setCreatedRequestId(created.id);
        setBranch('items');
        onCreated();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button onClick={() => setOpen(true)}>Создать заявку</Button>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
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
                <span className="text-xs text-muted-foreground">Контакты, адрес, желаемая дата замера</span>
              </button>
              <button
                onClick={() => setBranch('full')}
                className="flex flex-col items-start gap-2 rounded-xl border border-border p-4 text-left transition-colors hover:border-blue-500 hover:bg-mist-50"
              >
                <FileText className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-navy-900">Замер не требуется</span>
                <span className="text-xs text-muted-foreground">Сразу калькулятор и заказ, за один раз</span>
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
                <Label>Клиент</Label>
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
              <div className="space-y-2">
                <Label>Комментарий</Label>
                <Textarea value={measurementForm.comment} onChange={(e) => setMeasurementForm({ ...measurementForm, comment: e.target.value })} placeholder="Что нужно, пожелания клиента…" />
              </div>
              <div className="space-y-2">
                <Label>Фото объекта (необязательно)</Label>
                <label className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border px-4 text-sm text-muted-foreground hover:bg-mist-50">
                  <ImagePlus className="h-4 w-4" />
                  {sketchFile ? sketchFile.name : 'Загрузить изображение'}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setSketchFile(e.target.files?.[0] ?? null)} />
                </label>
              </div>
              <div className="space-y-2">
                <Label>Желаемая дата замера</Label>
                <Input type="date" value={measurementForm.desired_date} onChange={(e) => setMeasurementForm({ ...measurementForm, desired_date: e.target.value })} />
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
                <Label>Клиент</Label>
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
                <Label>Эскиз (необязательно)</Label>
                <label className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border px-4 text-sm text-muted-foreground hover:bg-mist-50">
                  <ImagePlus className="h-4 w-4" />
                  {sketchFile ? sketchFile.name : 'Загрузить изображение'}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setSketchFile(e.target.files?.[0] ?? null)} />
                </label>
              </div>
              <div className="space-y-2">
                <Label>Дата монтажа (можно оставить пустой и подобрать позже)</Label>
                <Input type="date" value={fullForm.install_date} onChange={(e) => setFullForm({ ...fullForm, install_date: e.target.value })} />
              </div>
            </div>
            <Button className="mt-5 w-full" onClick={handleSubmitFull} disabled={saving}>
              {saving ? 'Создаём…' : 'Продолжить — добавить работы и калькулятор'}
            </Button>
          </>
        )}

        {branch === 'items' && createdRequestId && (
          <>
            <DialogTitle>Заказ создан — добавьте работы</DialogTitle>
            <div className="mt-4">
              <OrderWorkspace requestId={createdRequestId} onChanged={() => {}} />
            </div>
            <Button className="mt-5 w-full" onClick={() => handleOpenChange(false)}>
              <Check className="mr-1 h-4 w-4" /> Готово
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
