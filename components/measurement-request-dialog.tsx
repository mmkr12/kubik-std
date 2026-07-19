'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check } from 'lucide-react';

export function MeasurementRequestDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const supabase = createClient();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setName('');
      setPhone('');
      setAddress('');
      setDone(false);
    }
  }

  async function handleSubmit() {
    if (!name || !phone) return;
    setSaving(true);
    try {
      const clientId = crypto.randomUUID();
      await supabase.from('clients').insert({ id: clientId, phone, name });
      await supabase.from('requests').insert({
        client_id: clientId,
        status: 'measurement',
        needs_measurement: true,
        name,
        phone,
        address: address || null,
      });
      setDone(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <DialogContent>
        {done ? (
          <div className="py-4 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
              <Check className="h-6 w-6 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-navy-900">Заявка отправлена</h3>
            <p className="mt-1 text-sm text-muted-foreground">Мы свяжемся с вами и согласуем удобное время для замера.</p>
          </div>
        ) : (
          <>
            <DialogTitle>Заявка на замер</DialogTitle>
            <p className="mt-1 text-sm text-muted-foreground">Оставьте контакты — мы приедем и снимем размеры на месте.</p>
            <div className="mt-4 space-y-3">
              <div className="space-y-2">
                <Label>Имя</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Айгерим" />
              </div>
              <div className="space-y-2">
                <Label>Телефон</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 777 123 45 67" />
              </div>
              <div className="space-y-2">
                <Label>Адрес</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="ул. Абая 123" />
              </div>
            </div>
            <Button className="mt-5 w-full" onClick={handleSubmit} disabled={!name || !phone || saving}>
              {saving ? 'Отправляем…' : 'Отправить заявку'}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
