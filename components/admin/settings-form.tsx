'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DEFAULT_SETTINGS } from '@/lib/pricing';
import { Plus, Trash2 } from 'lucide-react';

export function SettingsForm() {
  const [prices, setPrices] = useState<Record<string, number>>(DEFAULT_SETTINGS.sign_type_prices);
  const [coefficients, setCoefficients] = useState<Record<string, number>>(DEFAULT_SETTINGS.coefficients);
  const [gifts, setGifts] = useState<string[]>(DEFAULT_SETTINGS.gifts);
  const [kpText, setKpText] = useState(DEFAULT_SETTINGS.kp_text);
  const [validHours, setValidHours] = useState(DEFAULT_SETTINGS.offer_valid_hours);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('calculator_settings').select('*').single();
      if (data) {
        setPrices(data.sign_type_prices ?? DEFAULT_SETTINGS.sign_type_prices);
        setCoefficients(data.coefficients ?? DEFAULT_SETTINGS.coefficients);
        setGifts(data.gifts ?? DEFAULT_SETTINGS.gifts);
        setKpText(data.kp_text ?? DEFAULT_SETTINGS.kp_text);
        setValidHours(data.offer_valid_hours ?? DEFAULT_SETTINGS.offer_valid_hours);
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    setSaving(true);
    await supabase.from('calculator_settings').upsert({
      id: 1,
      sign_type_prices: prices,
      coefficients,
      gifts,
      kp_text: kpText,
      offer_valid_hours: validHours,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) return <p className="text-muted-foreground">Загрузка…</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardContent className="space-y-4 pt-5">
          <h2 className="font-semibold text-navy-900">Цены калькулятора</h2>
          {Object.entries(prices).map(([type, price]) => (
            <div key={type} className="flex items-center gap-3">
              <span className="flex-1 text-sm text-navy-700">{type}</span>
              <span className="text-sm text-muted-foreground">от</span>
              <Input
                type="number"
                className="w-32"
                value={price}
                onChange={(e) => setPrices({ ...prices, [type]: Number(e.target.value) })}
              />
              <span className="text-sm text-muted-foreground">за 1 м</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-5">
          <h2 className="font-semibold text-navy-900">Коэффициенты</h2>
          {Object.entries(coefficients).map(([key, value]) => (
            <div key={key} className="flex items-center gap-3">
              <span className="flex-1 text-sm text-navy-700">{key}</span>
              <Input
                type="number"
                step={0.01}
                className="w-32"
                value={value}
                onChange={(e) => setCoefficients({ ...coefficients, [key]: Number(e.target.value) })}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-5">
          <h2 className="font-semibold text-navy-900">Подарки</h2>
          {gifts.map((gift, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={gift}
                onChange={(e) => {
                  const next = [...gifts];
                  next[i] = e.target.value;
                  setGifts(next);
                }}
              />
              <Button variant="ghost" size="icon" onClick={() => setGifts(gifts.filter((_, idx) => idx !== i))}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setGifts([...gifts, ''])}>
            <Plus className="mr-1 h-4 w-4" /> Добавить подарок
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-5">
          <h2 className="font-semibold text-navy-900">Коммерческое предложение</h2>
          <div className="space-y-2">
            <Label>Текст предложения</Label>
            <Textarea value={kpText} onChange={(e) => setKpText(e.target.value)} rows={4} />
          </div>
          <div className="space-y-2">
            <Label>Срок действия предложения (часов)</Label>
            <Input type="number" className="w-32" value={validHours} onChange={(e) => setValidHours(Number(e.target.value))} />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Сохраняем…' : saved ? 'Сохранено ✓' : 'Сохранить изменения'}
      </Button>
    </div>
  );
}
