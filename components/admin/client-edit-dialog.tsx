'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ClientTotals } from '@/lib/types';

export function ClientEditDialog({
  client,
  trigger,
  onChanged,
}: {
  client: ClientTotals;
  trigger: React.ReactNode;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(client.name ?? '');
  const [phone, setPhone] = useState(client.phone);
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  async function handleSave() {
    if (!phone.trim()) return;
    setSaving(true);
    try {
      await supabase.from('clients').update({ name: name || null, phone: phone.trim() }).eq('id', client.id);
      setOpen(false);
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <DialogContent>
        <DialogTitle>Редактировать клиента</DialogTitle>
        <div className="mt-4 space-y-3">
          <div className="space-y-2">
            <Label>Имя</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Айгерим" />
          </div>
          <div className="space-y-2">
            <Label>Телефон</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 777 123 45 67" />
          </div>
          <p className="text-xs text-muted-foreground">
            Изменение телефона не переименует ранее созданные заявки этого клиента — там сохраняются данные на момент оформления.
          </p>
        </div>
        <Button className="mt-5 w-full" onClick={handleSave} disabled={saving}>
          {saving ? 'Сохраняем…' : 'Сохранить'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
